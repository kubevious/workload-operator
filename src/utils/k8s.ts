import { KubernetesObject } from "k8s-super-client";

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