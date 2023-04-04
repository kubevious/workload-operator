import _ from 'the-lodash';
import { DeltaAction, KubernetesObject } from "k8s-super-client";
import { Context } from "../context";
import { BaseWatcher } from './base-watcher';
import { Deployment } from 'kubernetes-types/apps/v1';

export class DeploymentWatcher extends BaseWatcher
{
    private _context : Context;

    constructor(context : Context)
    {
        super(context.logger.sublogger("DeploymentWatcher"))
        this._context = context;
    }

    init()
    {
        super._initialize(this._handle.bind(this),
                          this._context.k8sClient?.Deployment);
    }

    private _handle(action: DeltaAction, data: KubernetesObject)
    {
        const deployment = data as Deployment;
        const metadata = deployment.metadata ?? {};
        const owners = metadata.ownerReferences ?? [];
        if (owners.length != 1) {
            return;
        }
        const owner = owners[0];
        if (!owner.apiVersion.startsWith('kubevious.io/')) {
            return;
        }
        if (owner.kind !== 'Workload') {
            return;
        }

        const namespace = metadata.namespace!;

        const workload = this._context.workloadRegistry.fetch(namespace, owner.name);
        if (action === DeltaAction.Deleted)
        {
            workload.removeDeployment(deployment);
        }
        else
        {
            workload.addDeployment(deployment);
        }
    }

}