import _ from 'the-lodash';
import { ILogger } from 'the-logger';
import { KubernetesClient } from 'k8s-super-client';
import { Backend } from '@kubevious/helper-backend'

import { WebServer } from './server';
import { WorkloadRegistry } from './app/workload-registry';
import { ProfileRegistry } from './app/profile-registry';
import { DeploymentWatcher } from './k8s/deployment-watcher';
import { WorkloadWatcher } from './k8s/workload-watcher';
import { ProfileWatcher } from './k8s/profile-watcher';

import VERSION from './version'
import { ChangeScheduler } from './app/change-scheduler';

export type ClusterConnectorCb = () => Promise<KubernetesClient>;

export class Context
{
    private _backend : Backend;
    private _logger: ILogger;

    private _server: WebServer;

    private _k8sClient? : KubernetesClient;

    private _workloadRegistry : WorkloadRegistry;
    private _profileRegistry : ProfileRegistry;

    private _changeScheduler : ChangeScheduler;
    private _workloadWatcher : WorkloadWatcher;
    private _deploymentWatcher : DeploymentWatcher;
    private _profileWatcher : ProfileWatcher;

    constructor(backend : Backend, clusterConnector : ClusterConnectorCb)
    {
        this._backend = backend;
        this._logger = backend.logger.sublogger('Context');

        this._logger.info("Version: %s", VERSION);

        this._server = new WebServer(this);

        this._profileRegistry = new ProfileRegistry(this);
        this._workloadRegistry = new WorkloadRegistry(this);

        this._changeScheduler = new ChangeScheduler(this);
        this._workloadWatcher = new WorkloadWatcher(this);
        this._deploymentWatcher = new DeploymentWatcher(this);
        this._profileWatcher = new ProfileWatcher(this);
      
        backend.registerErrorHandler((reason) => {
            this.logger.error("Critical error happened. Exiting.", reason);
            console.log(reason);
            backend.close();
        });

        backend.stage("connect-to-k8s", () => {
            this._logger.info("Connecting to K8s cluster...")
            return clusterConnector()
                .then(client => {
                    this._logger.info("Connected to K8s cluster...")
                    this._k8sClient = client;
                });
        });

        backend.stage("setup-server", () => this._server.run());

        backend.stage("init-profile-watcher", () => this._profileWatcher.init());
        backend.stage("init-workload-watcher", () => this._workloadWatcher.init());
        backend.stage("init-deployment-watcher", () => this._deploymentWatcher.init());
    }

    get backend() {
        return this._backend;
    }

    get logger() {
        return this._logger;
    }

    get tracker() {
        return this.backend.tracker;
    }

    get executionLimiter() {
        return this._server.executionLimiter;
    }

    get k8sClient() {
        return this._k8sClient;
    }

    get workloadRegistry() {
        return this._workloadRegistry;
    }

    get profileRegistry() {
        return this._profileRegistry;
    }

    get changeScheduler() {
        return this._changeScheduler;
    }
}
