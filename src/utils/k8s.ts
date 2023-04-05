import { KubernetesObject } from "k8s-super-client";

export const CONFIG_HASH_ANNOTATION = 'kubevious.io/last-applied-config-hash'

export function makeKey(data: KubernetesObject)
{
    let parts : (string | null)[] = [
        data.apiVersion,
        data.kind,
        data.metadata?.namespace ?? null,
        data.metadata?.name,
    ];
    parts = parts.filter(x => x);
    return parts.join('_');
}


export interface K8sApiInfo
{
    apiName?: string,
    version: string
}

export function parseApiVersion(apiVersion: string) : K8sApiInfo
{
    const parts = apiVersion.split('/');
    
    if (parts.length > 1) {
        return {
            apiName: parts[0],
            version: parts[1],
        }
    } else {
        return {
            version: parts[0],
        }
    }
}