import _ from 'the-lodash';
import { ILogger } from "the-logger";
import { Context } from "../context";
import { DeltaAction, KubernetesClient, KubernetesObject } from "k8s-super-client";
import { MyPromise } from "the-promise";
import { KUBEVIOUS_ANNOTATION_CONFIG_HASH, parseApiVersion } from '../utils/k8s';

export class StateSynchronizer
{
    private _context : Context;
    private _logger : ILogger;
    private _k8sClient : KubernetesClient;

    private _actualObjects : Record<string, KubernetesObject> = {};
    private _desiredObjects : Record<string, KubernetesObject> = {};

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("StateSynchronizer");
        const k8sClient = this._context.k8sClient;
        if (!k8sClient) {
            throw new Error("K8s Client Missing");
        }
        this._k8sClient = k8sClient;
    }

    addActual(objects: KubernetesObject[])
    {
        this._addToDict(this._actualObjects, objects);
    }

    addDesired(objects: KubernetesObject[])
    {
        this._addToDict(this._desiredObjects, objects);
    }

    async apply()
    {
        this._logger.info("[apply] begin");
        this._logger.info("[apply] actual count: %s", _.keys(this._actualObjects).length);
        this._logger.info("[apply] desired count: %s", _.keys(this._desiredObjects).length);

        const deltas = this._produceDelta();
        this._logger.info("[apply] deltas count: %s", deltas.length);

        await MyPromise.serial(deltas, x => this._applyDelta(x));
    }

    private async _applyDelta(delta: DeltaObject)
    {
        this._logger.info("[apply] >>> %s :: %s", delta.action, delta.key);

        const apiInfo = parseApiVersion(delta.apiVersion);
        const resourceClient = this._k8sClient.client(delta.kind, apiInfo.apiName, apiInfo.version);
        if (!resourceClient) {
            this._logger.error("[apply] Missing API Client for %s :: %s", delta.apiVersion, delta.kind);
            return;
        }

        switch(delta.action)
        {
            case DeltaAction.Added:
                {
                    const manifest = delta.newObject!;
                    return resourceClient.create(manifest.metadata.namespace!, manifest);
                }
                break;
            case DeltaAction.Modified:
                {
                    const manifest = delta.newObject!;
                    return resourceClient.update(manifest.metadata.namespace!, manifest.metadata.name, manifest);
                }
                break;
            case DeltaAction.Deleted:
                {
                    const manifest = delta.oldObject!;
                    return resourceClient.delete(manifest.metadata.namespace!, manifest.metadata.name);
                }
                break;                 
        }
    }

    private _produceDelta() : DeltaObject[]
    {
        const deltas : DeltaObject[] = [];

        for(const key of _.keys(this._desiredObjects))
        {
            const desiredObj = this._desiredObjects[key];
            const actualObj = this._actualObjects[key];
            if (actualObj)
            {
                if (this._isDifferent(actualObj, desiredObj))
                {
                    deltas.push({
                        key: key,
                        apiVersion: desiredObj.apiVersion,
                        kind: desiredObj.kind,
                        action: DeltaAction.Modified,
                        oldObject: actualObj,
                        newObject: desiredObj
                    });
                }
            }
            else
            {
                deltas.push({
                    key: key,
                    apiVersion: desiredObj.apiVersion,
                    kind: desiredObj.kind,
                    action: DeltaAction.Added,
                    newObject: desiredObj
                })
            }
        }

        for(const key of _.keys(this._actualObjects))
        {
            if (!this._desiredObjects[key])
            {
                const actualObj = this._actualObjects[key];
                deltas.push({
                    key: key,
                    apiVersion: actualObj.apiVersion,
                    kind: actualObj.kind,
                    action: DeltaAction.Deleted,
                    oldObject: actualObj
                })
            }
        }

        return deltas;
    }

    private _isDifferent(actualObj: KubernetesObject, desiredObj: KubernetesObject)
    {
        const hash = desiredObj.metadata.annotations![KUBEVIOUS_ANNOTATION_CONFIG_HASH];
        const actualHash = (actualObj.metadata.annotations ?? {})[KUBEVIOUS_ANNOTATION_CONFIG_HASH];
        if (!actualHash) {
            return true;
        }
        return hash !== actualHash
    }

    private _addToDict(dict: Record<string, KubernetesObject>, objects: KubernetesObject[])
    {
        for(const obj of objects)
        {
            dict[makeKey(obj)] = obj;
        }
    }
 
   
}

interface DeltaObject
{
    key: string,
    apiVersion: string,
    kind: string,
    action: DeltaAction,
    oldObject?: KubernetesObject,
    newObject?: KubernetesObject,
}


function makeKey(obj: KubernetesObject)
{
    let parts = [
        obj.apiVersion,
        obj.kind,
        obj.metadata.namespace,
        obj.metadata.name
    ];
    parts = parts.filter(x => x);
    return parts.join("_");
}
