import _ from 'the-lodash';

import { Backend } from '@kubevious/helper-backend'
import { connectDefaultRemoteCluster } from 'k8s-super-client';

import { Context } from '../context'

const backend = new Backend("backend");

function connectToK8sCluster()
{
    return connectDefaultRemoteCluster(backend.logger,
        {
            // skipAPIFetch: true
        })
        ;
}

new Context(backend, connectToK8sCluster);

backend.run();
