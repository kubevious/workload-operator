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
            const manifest = this._renderSchedule(schedule);
            this._addDesiredManifest(manifest as KubernetesObject);
            // this._logger.info('Deployment: ', manifest);
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
