import { ObjectMeta } from 'kubernetes-types/meta/v1';
import { DeploymentSpec } from 'kubernetes-types/apps/v1';
import { Affinity } from 'kubernetes-types/core/v1';

export enum KubeviousScheduleInfra
{
    k8s,
    serverless
}

export interface KubeviousWorkloadScheduleSpec
{
    name: string,
    infra?: KubeviousScheduleInfra,
    replicas?: number,
    profiles?: string[],
    nodeSelector?: {
        [name: string]: string;
    },
    affinity?: Affinity,
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