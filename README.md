# What is Workload Operator

The purpose of WorkloadOperator is to allow running Pods across different nodes and affinity rules requirements using a more managed approach rather than DIY. WorkloadOperator accepts PodSpec and scheduling requirements and deploys Pods following those rules, eliminating the need to configure multiple identical Deployments where only the nodeSelectors and affinity rules differ. One use case could be a requirement to run 20% of pods on reserved instances and the rest using low-cost spot instances.

## Example

```yaml
---
apiVersion: kubevious.io/v1alpha1
kind: Workload
metadata:
  name: nginx
spec:
  replicas: 10
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx
  schedule:
  - name: reserved
    replicas: 20%
    nodeSelector:
      eks.amazonaws.com/capacityType: ON_DEMAND
  - name: spot
    profiles:
      - primary-az
      - spot-node

---
apiVersion: kubevious.io/v1alpha1
kind: WorkloadProfile
metadata:
  name: spot-node
spec:
  nodeSelector:
    eks.amazonaws.com/capacityType: SPOT

---
apiVersion: kubevious.io/v1alpha1
kind: WorkloadProfile
metadata:
  name: primary-az
spec:
  nodeSelector:
    failure-domain.beta.kubernetes.io/zone: us-east-1a
```

## Installation
Works with any Kubernetes distribution. Deploy using Helm v3.2+:

```sh
kubectl create namespace workload-operator

helm repo add kubevious https://helm.kubevious.io

helm upgrade --atomic -i workload-operator kubevious/workload-operator --version 0.0.3 -n workload-operator
```

## How Does It Work?
Underneath, the Workload Operator watches for changes to Workloads and WorkloadProfiles and creates a new Deployment for each schedule.

## Next Steps

- Support HPA
- Time-based schedules. It could be useful to automatically move replicas to different regions based on the time schedule
- Need something else? Submit an issue request!