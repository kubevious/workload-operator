import { ObjectMeta } from 'kubernetes-types/meta/v1';
import { DeploymentSpec } from 'kubernetes-types/apps/v1';
import { KubeviousProfileSpec } from './profile';

export interface KubeviousWorkloadScheduleSpec extends KubeviousProfileSpec
{
    name: string,
    profiles?: string[],
}

export interface KubeviousWorkloadSpec extends DeploymentSpec
{
    schedule?: KubeviousWorkloadScheduleSpec[],
}

export interface KubeviousWorkload
{
    apiVersion: string,
    kind: string,
    metadata?: ObjectMeta,
    spec?: KubeviousWorkloadSpec,
    // status?: DeploymentStatus;
}
