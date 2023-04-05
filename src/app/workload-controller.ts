import _ from 'the-lodash';
import { ILogger } from "the-logger";
import { Context } from '../context';
import { Workload } from './workload';
import { KubernetesObject, ResourceAccessor } from 'k8s-super-client/dist';
import { Deployment, DeploymentSpec } from 'kubernetes-types/apps/v1';
import { ObjectMeta } from 'kubernetes-types/meta/v1';
import { KubeviousWorkloadScheduleSpec } from '../types/workload';
import { StateSynchronizer } from './state-synchronizer';
import { HashUtils } from '../utils/hash-utils';
import { CONFIG_HASH_ANNOTATION } from '../utils/k8s';

export class WorkloadController
{
    private _context: Context;
    private _logger : ILogger;
    private _workload: Workload;
    private _deploymentClient : ResourceAccessor;

    private _desiredManifests: KubernetesObject[] = [];

    private _totalReplicas = 0;
    private _schedules : ScheduleInfo[] = [];

    constructor(context: Context, workload: Workload)
    {
        this._context = context;
        this._logger = context.logger.sublogger("WorkloadController");
        this._workload = workload;
        if (!context.k8sClient) {
            throw new Error("K8s Client Missing")
        }
        this._deploymentClient = context.k8sClient.Deployment!;
    }

    async apply()
    {
        await this._renderManifests();
        await this._applyChanges();
    }

    async _renderManifests()
    {
        this._desiredManifests = [];
        if (!this._workload.config) {
            return;
        }

        for(const schedule of this._workload.schedules)
        {
            const deployment = this._renderSchedule(schedule);
            this._schedules.push({
                schedule,
                deployment,
                replicasDecided: false
            });
        }

        this._calculateReplicas();

        for(const scheduleInfo of this._schedules)
        {
            this._addDesiredManifest(scheduleInfo.deployment as KubernetesObject);
        }
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
            if (_.isNumber(scheduleInfo.schedule.replicas))
            {
                this._logger.info("[_calculateReplicas] %s -> %s", scheduleInfo.schedule.name, scheduleInfo.schedule.replicas);
                const replicas = Math.min(remainingReplicas, scheduleInfo.schedule.replicas);
                remainingReplicas -= replicas;
                scheduleInfo.replicasDecided = true;
                scheduleInfo.deployment.spec!.replicas = replicas;
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
        manifest.metadata.annotations[CONFIG_HASH_ANNOTATION] = hash;

        this._logger.info('[_addDesiredManifest] %s', manifest.metadata.name);

        this._desiredManifests.push(manifest);
    }

    private _renderSchedule(schedule: KubeviousWorkloadScheduleSpec)
    {
        const metadata = this._newMetadata();
        metadata.name = [this._workload.name, schedule.name].filter(x => x.length > 0).join('-');

        const spec : DeploymentSpec = _.cloneDeep(this._workload.defaultDeploymentSpec!);

        const d : Deployment = {
            apiVersion: "apps/v1",
            kind: "Deployment",
            metadata: metadata,
            spec: spec
        }

        return d;
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
}