import _ from 'the-lodash';
import { ILogger } from "the-logger";
import { KubeviousWorkload, KubeviousWorkloadScheduleSpec, KubeviousWorkloadSpec } from "../types/workload";
import { OwnerReference } from 'kubernetes-types/meta/v1';
import { Deployment, DeploymentSpec } from "kubernetes-types/apps/v1";
import { Context } from '../context';
import { Profile } from './profile';

export class Workload
{
    private _context: Context;
    private _logger : ILogger;
    private _key: string;
    private _namespace: string;
    private _name: string;
    private _config: KubeviousWorkload | null = null;
    private _schedules: KubeviousWorkloadScheduleSpec[] = [];
    private _defaultDeploymentSpec: DeploymentSpec | null = null;
    private _ownerReferences: OwnerReference[] = [];

    private _profiles: Profile[] = [];

    private _deployments: Record<string, Deployment> = {};

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

    get ownerReferences() {
        return this._ownerReferences;
    }

    get schedules() {
        return this._schedules;
    }

    get defaultDeploymentSpec() {
        return this._defaultDeploymentSpec;
    }

    get deployments() {
        return _.values(this._deployments);
    }

    setupConfig(config: KubeviousWorkload | null)
    {
        this._config = config;
        this._defaultDeploymentSpec = null;
        this._ownerReferences = [];
        this._schedules = [];

        if (config)
        {
            const spec: KubeviousWorkloadSpec = config.spec ?? {
                selector: {},
                template: {},
            };

            this._schedules = spec.schedule ?? [];
            if (this._schedules.length === 0)
            {
                this._schedules.push({
                    name: ''
                });
            }

            if (spec.schedule) {
                delete spec.schedule;
            }
            this._defaultDeploymentSpec = spec;

            this._ownerReferences.push({
                apiVersion: config.apiVersion,
                kind: config.kind,
                name: config.metadata!.name!,
                uid: config.metadata!.uid!,
                controller: true,
                blockOwnerDeletion: true
            });
        }

        this.invalidate();
    }

    remove()
    {
        this.setupConfig(null);
    }

    invalidate()
    {
        this._context.changeScheduler.schedule(this);
    }

    addDeployment(deployment: Deployment)
    {
        const name = deployment.metadata!.name!;
        this._logger.info("[addDeployment] %s", name);
        this._deployments[name] = deployment;
        this.invalidate();
    }

    removeDeployment(deployment: Deployment)
    {
        const name = deployment.metadata!.name!;
        this._logger.info("[removeDeployment] %s", name);
        delete this._deployments[name!];
        this.invalidate();
    }

    attachProfiles(profiles: Profile[])
    {
        for(const profile of profiles)
        {
            profile.detachWorkload(this);
        }

        this._profiles = [];
        
        for(const profile of profiles)
        {
            this._profiles.push(profile);
            profile.attachWorkload(this);
        }
    }

}