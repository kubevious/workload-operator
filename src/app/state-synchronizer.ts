import { ILogger } from "the-logger";
import { Context } from "../context";
import { Workload } from "./workload";
import { ResourceAccessor } from "k8s-super-client";
import { MyPromise } from "the-promise/dist";
import { Deployment } from "kubernetes-types/apps/v1";

export class StateSynchronizer
{
    private _context : Context;
    private _logger : ILogger;
    private _deploymentClient : ResourceAccessor;

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("StateSynchronizer");
        const k8sClient = this._context.k8sClient;
        if (!k8sClient) {
            throw new Error("K8s Client Missing");
        }
        if (!k8sClient.Deployment) {
            throw new Error("Missing Deployment Client");
        }
        this._deploymentClient = k8sClient.Deployment;
    }

    apply(workload: Workload)
    {
        this._logger.info("[apply] %s...", workload.key);

        Promise.resolve(null)
            .then(() => {
                return MyPromise.serial(workload.renderedDeployments, 
                    x => this._applyDeployment(workload, x));
            })
            .catch(reason => {
                this._logger.error("[apply] Error in %s. Reason: ", workload.key, reason);
            })
    }
 
    async _applyDeployment(workload: Workload, deployment: Deployment)
    {
        this._logger.info("[_applyDeployment] %s...", deployment.metadata!.name!);

        try
        {
            await this._deploymentClient.create(deployment.metadata!.namespace!, deployment);
        }
        catch(reason)
        {
            this._logger.error("[_applyDeployment] Error in %s. Reason: ", deployment.metadata!.name!, reason);
        }
    }
}
