import _ from 'the-lodash';
import { DeltaAction, KubernetesObject, ResourceAccessor } from "k8s-super-client";
import { ILogger } from "the-logger";

export type BaseWatcherHandler = (action: DeltaAction, data: KubernetesObject) => void;

export class BaseWatcher
{
    protected _logger : ILogger;
    private _handler?: BaseWatcherHandler;

    constructor(logger : ILogger)
    {
        this._logger =logger;
    }

    protected _initialize(handler: BaseWatcherHandler, resourceClient?: ResourceAccessor | null)
    {
        this._logger.info("[_initialize]...");

        this._handler = handler;
        if (!resourceClient) {
            this._logger.error("[_initialize] _resourceClient NOT PRESENT");
            throw new Error("_resourceClient NOT PRESENT")
        }

        this._logger.info("[_initialize] watchAll...");
        resourceClient.watchAll(
            null,
            this._handleWatch.bind(this),
            () => {},
            () => {},
            );
    }

    private _handleWatch(action: DeltaAction, data: KubernetesObject)
    {
        this._logger.info("[_handleWatch] %s -> %s :: %s", action, data.metadata.namespace, data.metadata.name);

        this._handler!(action, data);
    }

}