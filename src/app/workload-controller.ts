import _ from 'the-lodash';
import { ILogger } from "the-logger";
import { Context } from '../context';
import { Workload } from './workload';
import { KubernetesObject } from 'k8s-super-client';
import { Deployment, DeploymentSpec } from 'kubernetes-types/apps/v1';
import { ObjectMeta } from 'kubernetes-types/meta/v1';
import { KubeviousWorkloadScheduleSpec } from '../types/workload';
import { StateSynchronizer } from './state-synchronizer';
import { HashUtils } from '../utils/hash-utils';
import { KUBEVIOUS_ANNOTATION_CONFIG_HASH, KUBEVIOUS_ANNOTATION_SCHEDULE } from '../utils/k8s';
import { Profile } from './profile';
import { KubeviousProfileSpec } from '../types/profile';
import { PodSpec } from 'kubernetes-types/core/v1';

export class WorkloadController
{
    private _context: Context;
    private _logger : ILogger;
    private _workload: Workload;

    private _desiredManifests: KubernetesObject[] = [];

    private _schedules : ScheduleInfo[] = [];
    private _usedProfiles : Record<string, Profile> = {};
    private _missingProfiles : Record<string, boolean> = {}

    constructor(context: Context, workload: Workload)
    {
        this._context = context;
        this._logger = context.logger.sublogger("WorkloadController");
        this._workload = workload;
    }

    async apply()
    {
        this._renderManifests();

        this._attachProfiles();

        if (_.keys(this._missingProfiles).length > 0)
        {
            this._logger.error("[apply] Missing profiles for %s. Deployment skipped.", this._workload.key, _.keys(this._missingProfiles));
            return;
        }

        await this._applyChanges();

        if (!this._workload.config)
        {
            if(!this._context.changeScheduler.isScheduled(this._workload))
            {
                this._context.workloadRegistry.remove(this._workload);
            }
        }
    }

    _renderManifests()
    {
        this._desiredManifests = [];
        if (!this._workload.config) {
            return;
        }

        for(const schedule of this._workload.schedules)
        {
            this._renderSchedule(schedule);
        }

        this._calculateReplicas();

        for(const scheduleInfo of this._schedules)
        {
            this._addDesiredManifest(scheduleInfo.deployment as KubernetesObject);
        }
    }

    private _attachProfiles()
    {
        this._workload.attachProfiles(_.values(this._usedProfiles));
    }

    private _calculateReplicas()
    {
        if (!this._workload.config) {
            return;
        }

        const totalReplicas = this._workload.config.spec?.replicas ?? 1;
        let remainingReplicas = totalReplicas;

        for(const scheduleInfo of this._schedules)
        {
            if (_.isNotNullOrUndefined(scheduleInfo.replicas))
            {
                let replicas : number | null = null;
                if (_.isNumber(scheduleInfo.replicas)) 
                {
                    replicas = scheduleInfo.replicas!;
                }
                else if (_.isString(scheduleInfo.replicas))
                {
                    const percentage = parseFloat(scheduleInfo.replicas.replace("%", "")) / 100;
                    replicas = Math.round(totalReplicas * percentage);
                }

                if (_.isNotNullOrUndefined(replicas))
                {
                    this._logger.info("[_calculateReplicas] %s -> %s", scheduleInfo.schedule.name, replicas);
                    replicas = Math.min(remainingReplicas, replicas!);
                    remainingReplicas -= replicas;
                    scheduleInfo.replicasDecided = true;
                    scheduleInfo.deployment.spec!.replicas = replicas;
                }
            }
        }

        const remainingSchedules = this._schedules.filter(x => !x.replicasDecided);
        if (remainingSchedules.length > 0)
        {
            const replicas = Math.floor(remainingReplicas / remainingSchedules.length);
            for(const scheduleInfo of remainingSchedules)
            {
                remainingReplicas -= replicas;
                scheduleInfo.deployment.spec!.replicas = replicas;
            }

            for(const scheduleInfo of remainingSchedules)
            {
                if (remainingReplicas === 0) {
                    break;
                }
                remainingReplicas -= 1;
                scheduleInfo.deployment.spec!.replicas! += 1;
            }
        }
    }

    private _addDesiredManifest(manifest: KubernetesObject)
    {
        if (!manifest.metadata.annotations) {
            manifest.metadata.annotations = {};
        }
        const hash = HashUtils.calculateObjectHashStr(manifest);
        manifest.metadata.annotations[KUBEVIOUS_ANNOTATION_CONFIG_HASH] = hash;

        this._logger.info('[_addDesiredManifest] %s', manifest.metadata.name);

        this._desiredManifests.push(manifest);
    }

    private _renderSchedule(schedule: KubeviousWorkloadScheduleSpec)
    {
        const metadata = this._newMetadata();
        metadata.name = [this._workload.name, schedule.name].filter(x => x.length > 0).join('-');
        (metadata.annotations!)[KUBEVIOUS_ANNOTATION_SCHEDULE] = schedule.name;

        const spec : DeploymentSpec = _.cloneDeep(this._workload.defaultDeploymentSpec!);
        const podSpec = spec.template.spec!;

        let desiredReplicas : number | string | null = schedule.replicas ?? null;
        this._applyMetadata(metadata, schedule);
        this._applySpec(podSpec, schedule);

        for(const profileName of (schedule.profiles ?? []))
        {
            const profile = this._context.profileRegistry.fetch(this._workload.namespace, profileName);
            this._usedProfiles[profile.name] = profile;

            const profileSpec = profile.config?.spec;
            if (profileSpec)
            {
                desiredReplicas = profileSpec.replicas ?? desiredReplicas;
                this._applyMetadata(metadata, profileSpec);
                this._applyMetadata(spec.template.metadata!, profileSpec);
                this._applySpec(podSpec, profileSpec);
            }
            else
            {
                this._missingProfiles[profileName] = true;
            }
        }

        const deployment : Deployment = {
            apiVersion: "apps/v1",
            kind: "Deployment",
            metadata: metadata,
            spec: spec
        }

        this._logger.info("[_renderSchedule] WORKLOAD: %s", this._workload.name);
        this._logger.info("[_renderSchedule]   *  schedule: %s", schedule.name);
        this._logger.info("[_renderSchedule]      - desiredReplicas: %s", desiredReplicas);

        this._schedules.push({
            schedule,
            deployment,
            replicas: desiredReplicas,
            replicasDecided: false
        });
    }

    private _applyMetadata(metadata : ObjectMeta, profileSpec: KubeviousProfileSpec)
    {
        const profileMetadata : ObjectMeta = {
            labels: profileSpec.labels,
            annotations: profileSpec.annotations,
        }
        _.defaultsDeep(metadata, profileMetadata);
    }

    private _applySpec(podSpec: PodSpec, profileSpec: KubeviousProfileSpec)
    {
        const profilePodSpec : PodSpec = {
            nodeSelector: profileSpec.nodeSelector,
            affinity: profileSpec.affinity,
            containers: []
        }

        _.defaultsDeep(podSpec, profilePodSpec);
    }

    private _newMetadata() : ObjectMeta
    {
        let metadata : ObjectMeta = {
            namespace: this._workload.namespace,
            annotations: this._workload.config?.metadata?.annotations ?? {},
            labels: this._workload.config?.metadata?.labels ?? {},
            ownerReferences: this._workload.ownerReferences
        };
        metadata = _.cloneDeep(metadata);

        for(const key of ANNOTATIONS_TO_DELETE)
        {
            if (metadata.annotations![key]) {
                delete metadata.annotations![key];
            }
        }
        
        return metadata;
    }

    private async _applyChanges()
    {
        const synchronizer = new StateSynchronizer(this._context);
        synchronizer.addActual(this._workload.deployments as KubernetesObject[]);
        synchronizer.addDesired(this._desiredManifests);

        await synchronizer.apply();
    }

}


const ANNOTATIONS_TO_DELETE = [
    'kubectl.kubernetes.io/last-applied-configuration'
]

interface ScheduleInfo
{
    schedule: KubeviousWorkloadScheduleSpec,
    deployment: Deployment,
    replicasDecided: boolean,
    replicas : number | string | null
}