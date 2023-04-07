import { ObjectMeta } from 'kubernetes-types/meta/v1';
import { Affinity } from 'kubernetes-types/core/v1';

export enum KubeviousScheduleInfra
{
    k8s,
    serverless
}

export interface KubeviousProfileSpec
{
    infra?: KubeviousScheduleInfra,
    replicas?: number | string,
    nodeSelector?: {
        [name: string]: string;
    },
    affinity?: Affinity,
}


export interface KubeviousProfile
{
    apiVersion: string,
    kind: string,
    metadata?: ObjectMeta,
    spec?: KubeviousProfileSpec,
    // status?: DeploymentStatus;
}

