import _ from 'the-lodash';
import { ILogger } from "the-logger";
import { Context } from '../context';
import { KubeviousProfile } from '../types/profile';
import { Workload } from './workload';

export class Profile
{
    private _context: Context;
    private _logger : ILogger;
    private _key: string;
    private _namespace: string;
    private _name: string;
    private _config: KubeviousProfile | null = null;
    private _workloads: Record<string, Workload> = {};

    constructor(context: Context, logger: ILogger, key: string, ns: string, name: string)
    {
        this._context = context;
        this._logger = logger;
        this._key = key;
        this._namespace = ns;
        this._name = name;

        this._logger.info("[constructor] %s :: %s", this._namespace, this._name);
        this.invalidate();
    }

    get key() {
        return this._key;
    }

    get namespace() {
        return this._namespace;
    }

    get name() {
        return this._name;
    }

    get config() {
        return this._config;
    }

    setupConfig(config: KubeviousProfile | null)
    {
        this._config = config;
        this.invalidate();
    }

    remove()
    {
        this.setupConfig(null);
    }

    invalidate()
    {
        if (this._shouldRemove()) {
            this._context.profileRegistry.remove(this);
            return;
        }

        for(const workload of _.values(this._workloads))
        {
            workload.invalidate();
        }
    }

    attachWorkload(workload: Workload)
    {
        this._workloads[workload.key] = workload;
    }

    detachWorkload(workload: Workload)
    {
        delete this._workloads[workload.key];
    }

    private _shouldRemove()
    {
        if (this._config) {
            return false;
        }
        if (_.values(this._workloads).length > 0) {
            return false;
        }
        return true;
    }
}