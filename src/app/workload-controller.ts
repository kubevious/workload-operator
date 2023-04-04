import _ from 'the-lodash';
import { ILogger } from "the-logger";
import { Context } from '../context';
import { Workload } from './workload';
import { ResourceAccessor } from 'k8s-super-client/dist';
import { Deployment, DeploymentSpec } from 'kubernetes-types/apps/v1';
import { ObjectMeta } from 'kubernetes-types/meta/v1';
import { KubeviousWorkloadScheduleSpec } from '../types/workload';

export class WorkloadController
{
    private _context: Context;
    private _logger : ILogger;
    private _workload: Workload;
    private _deploymentClient : ResourceAccessor;

    private _renderedDeployments: Deployment[] = [];

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
    }

    async _renderManifests()
    {
        this._renderedDeployments = [];
        if (!this._workload.config) {
            return;
        }

        for(const schedule of this._workload.schedules)
        {
            const manifest = this._renderSchedule(schedule);
            // this._logger.info('Deployment: ', manifest);
            this._renderedDeployments.push(manifest);
        }
    }

    _renderSchedule(schedule: KubeviousWorkloadScheduleSpec)
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

    _newMetadata() : ObjectMeta
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

}


const ANNOTATIONS_TO_DELETE = [
    'kubectl.kubernetes.io/last-applied-configuration'
]
