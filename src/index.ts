import { Backend } from '@kubevious/helper-backend'
import { LogLevel } from 'the-logger';
import { Promise } from 'the-promise';
import { Context } from './context'

import { connectFromPod } from 'k8s-super-client';

const backend = new Backend("backend", {
    logLevels: {
        'DriverMysql': LogLevel.warn
    }
});

function connectToK8sCluster()
{
    return Promise.resolve()
        .then(() => connectFromPod(backend.logger))
}

new Context(backend, connectToK8sCluster);

backend.run();