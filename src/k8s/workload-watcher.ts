import _ from 'the-lodash';
import { DeltaAction, KubernetesObject, ResourceAccessor } from "k8s-super-client";
import { ILogger } from "the-logger";
import { Context } from "../context";
import { KubeviousWorkload } from '../types/workload';
import { BaseWatcher } from './base-watcher';

export class WorkloadWatcher extends BaseWatcher
{
    private _context : Context;

    constructor(context : Context)
    {
        super(context.logger.sublogger("WorkloadWatcher"))
        this._context = context;
    }

    init()
    {
        super._initialize(this._handle.bind(this),
                          this._context.k8sClient?.client('Workload', 'kubevious.io'));
    }

    private _handle(action: DeltaAction, data: KubernetesObject)
    {
        const workload = this._context.workloadRegistry.fetch(data.metadata.namespace!,
                                                              data.metadata.name);

        if (action === DeltaAction.Deleted)
        {
            workload.remove();
        }
        else
        {
            workload.setupConfig(_.cloneDeep(data) as KubeviousWorkload);
        }
    }

}