import _ from 'the-lodash';
import { ILogger } from 'the-logger';
import { Promise } from 'the-promise';

import { Backend } from '@kubevious/helper-backend'

import { WebServer } from './server';

import { KubernetesClient } from 'k8s-super-client';

import VERSION from './version'

export type ClusterConnectorCb = () => Promise<KubernetesClient>;

export class Context
{
    private _backend : Backend;
    private _logger: ILogger;

    private _server: WebServer;

    private _k8sClient? : KubernetesClient;

    constructor(backend : Backend, clusterConnector : ClusterConnectorCb)
    {
        this._backend = backend;
        this._logger = backend.logger.sublogger('Context');

        this._logger.info("Version: %s", VERSION);

        this._server = new WebServer(this);
      
        backend.registerErrorHandler((reason) => {
            this.logger.error("Critical error happened. Exiting.", reason);
            backend.close();
        });

        backend.stage("connect-to-k8s", () => {
            return clusterConnector()
                .then(client => {
                    this._k8sClient = client;
                });
        });

        backend.stage("setup-server", () => this._server.run());
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

}
