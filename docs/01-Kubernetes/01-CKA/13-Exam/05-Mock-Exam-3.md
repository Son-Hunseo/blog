---
title: Mock Exam 3 오답 정리
description: Udemy Mumshad 강의의 Mock Exam 3 문제 오답 정리
---
## 1 (O)

You are an administrator preparing your environment to deploy a Kubernetes cluster using kubeadm. Adjust the following network parameters on the system to the following values, and make sure your changes persist reboots:

net.ipv4.ip_forward = 1  
net.bridge.bridge-nf-call-iptables = 1


**My Answer**

- kubeadm 설치 과정 중 containerd 설치 과정에 이 네트워크 옵션 변경 가이드가 있었던 것으로 기억나서 거기로 감
- 거기서 Enable IPv4 packet forwarding 섹션을 봄
- 거기서 나와있는 `/etc/sysctl.d/k8s.conf` 파일을 살펴 봣음
- 이미 설정은 되어있었음
- 이걸 `sudo sysctl --system` 명령어를 사용해서 적용했음

---
## 2 (X)

Create a new service account with the name `pvviewer`. Grant this Service account access to `list` all PersistentVolumes in the cluster by creating an appropriate cluster role called `pvviewer-role` and ClusterRoleBinding called `pvviewer-role-binding`.  
Next, create a pod called `pvviewer` with the image: `redis` and serviceAccount: `pvviewer` in the default namespace.

**My Answer**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pvviewer
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pvviewer-role
rules:
- apiGroups: [""]
  resources: ["persistentvolume"]
  verbs: ["list"]
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: pvviewer-role-binding
subjects:
- kind: ServiceAccount
  name: pvviewer
  namespace: default
roleRef:
  kind: ClusterRole
  name: pvviewer-role
  apiGroup: rbac.authorization.k8s.io
```

- `ServiceAccount`를 바인딩할때는 `apiGroup` 대신 `namespace`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pvviewer
spec:
  serviceAccountName: pvviewer
  containers:
  - name: redis
    image: redis
```


**Right Answer**

- 틀렸던 이유
	- `Role`에서 리소스를 지정할 때는 복수형으로 사용해야한다. (`persistentvolume` -> `persistentvolumes`)
	- apply할 때 에러가 안나서 괜찮은 줄 알았는데, 틀린 것이다.

---
## 3 (O)


Create a StorageClass named `rancher-sc` with the following specifications:

The provisioner should be `rancher.io/local-path`.  
The volume binding mode should be `WaitForFirstConsumer`.  
Volume expansion should be enabled.


**My Answer**

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rancher-sc
provisioner: rancher.io/local-path
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

---
## 4 (O)

Create a ConfigMap named `app-config` in the namespace `cm-namespace` with the following key-value pairs:

```
ENV=production
LOG_LEVEL=info
```

Then, modify the existing Deployment named `cm-webapp` in the same namespace to use the `app-config` ConfigMap by setting the environment variables `ENV` and `LOG_LEVEL` in the container from the ConfigMap.


**My Answer**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: cm-namespace
data:
  ENV: production
  LOG_LEVEL: info
```

```yaml
...
template:
    metadata:
      labels:
        app: cm-webapp
    spec:
      containers:
      - image: nginx
        imagePullPolicy: Always
        name: nginx
        env:
          - name: ENV
            valueFrom:
              configMapKeyRef:
                name: app-config
                key: ENV
          - name: LOG_LEVEL
            valueFrom:
              configMapKeyRef:
                name: app-config
                key: LOG_LEVEL
...
```


---
## 5 (O)

Create a PriorityClass named `low-priority` with a value of 50000. A pod named `lp-pod` exists in the namespace `low-priority`. Modify the pod to use the priority class you created. Recreate the pod if necessary.

**My Answer**

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 50000
```

```yaml
...
spec:
...
  priorityClassName: low-priority
...
```

---
## 6 (O)

We have deployed a new pod called `np-test-1` and a service called `np-test-service`. Incoming connections to this service are not working. Troubleshoot and fix it.  
Create NetworkPolicy, by the name `ingress-to-nptest` that allows incoming connections to the service over port `80`.

Important: Don't delete any current objects deployed.


**My Answer**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ingress-to-nptest
  namespace: default
spec:
  podSelector:
    matchLabels:
      run: np-test-1
  policyTypes:
  - Ingress
  ingress:
  - ports:
    - protocol: TCP
      port: 80
```

---
## 7 (O)

We have deployed a new pod called `np-test-1` and a service called `np-test-service`. Incoming connections to this service are not working. Troubleshoot and fix it.  
Create NetworkPolicy, by the name `ingress-to-nptest` that allows incoming connections to the service over port `80`.

Important: Don't delete any current objects deployed.


**My Answer**

```bash
kubectl taint nodes node01 env_type=production:NoSchedule
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dev-redis
spec:
  containers:
  - name: redis
    image: redis:alpine
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: prod-redis
spec:
  containers:
  - name: redis
    image: redis:alpine
  tolerations:
  - key: "env_type"
    value: "production"
    operator: "Equal"
    effect: "NoSchedule"
```

---
## 8 (O)

A PersistentVolumeClaim named `app-pvc` exists in the namespace `storage-ns`, but it is not getting bound to the available PersistentVolume named `app-pv`.
Inspect both the PVC and PV and identify why the PVC is not being bound and fix the issue so that the PVC successfully binds to the PV. Do not modify the PV resource.


**My Answer**

- `pvc`와 `pv` 스펙이 맞지 않는것이 의심되었다.
- `pvc` - `1Gi`, `ReadWriteMany`
- `pv` - `1Gi`, `ReadWriteOnce`
- 이에, `pvc`를 `ReadWriteOnce`로 바꾸어주었다.

---
## 9 (O)

A kubeconfig file called `super.kubeconfig` has been created under `/root/CKA`. There is something wrong with the configuration. Troubleshoot and fix it.


**My Answer**

- api-server 포트가 잘못되있길래 고쳤다.


---
## 10 (X)

We have created a new deployment called `nginx-deploy`. Scale the deployment to 3 replicas. Has the number of replicas increased? Troubleshoot and fix the issue.


**My Answer**

```bash
kubectl scale --replicas=3 deployment/nginx-deploy
```


**Right Answer**

- scale out 하고 트러블슈팅을 해야하는데, 문제를 똑바로 안읽어서 scale out만 하고 트러블 슈팅을 안했다.
	- 근데 밑에 문제가 내가 생각 못했을 것 같아서 어짜피 틀렸을 것 같다.
- `Deployment`, `ReplicaSet`을 모두 `describe` 해봐도 별 문제가 없는 것 같다.
- 이상한 점은, `replicas`를 3개로 늘렸는데, 이에 대한 시도를 하다가 실패한 것이 아니라 시도 자체를 한 `Event`가 없는 것이다.
- 이럴 경우 `Control Plane`에 문제가 생겼음을 의심할 수 있다.
- 이에 `kubectl get all -n kube-system`을 해본다.
- 컨트롤러가 문제가 있음을 확인한다.
- 이에 마스터 노드의 `Static Pod` 들이 있는 `/etc/kubernetes/manifests/` 에 가서 컨트롤러의 yaml을 확인한다.
- 오타가 있음을 발견하고 고친다.


---
## 11 (X)

Create a Horizontal Pod Autoscaler (HPA) `api-hpa` for the deployment named `api-deployment` located in the `api` namespace.  
The HPA should scale the deployment based on a custom metric named `requests_per_second`, targeting an average value of 1000 requests per second across all pods.  
Set the minimum number of replicas to 1 and the maximum to 20.

Note: Deployment named `api-deployment` is available in api namespace. Ignore errors due to the metric `requests_per_second` not being tracked in `metrics-server`


**My Answer**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deployment
  minReplicas: 1
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: requests_per_second
      target:
        type: Utilization
        averageUtilization: 1000
```


**Right Answer**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deployment
  minReplicas: 1
  maxReplicas: 20
  metrics:
    - type: Pods
      pods:
        metric:
          name: requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
```

- 강의에서도 안나왔고 내가 풀 수 없는 문제였다.
- 왜냐하면, `spec.metrics.type`와 `spec.metrics.[].target.type`는 올 수 있는 것이 정해져있기 때문이다.

`spec.metrics.type`

| **타입 (Type)**  | **용도**                    | **전형적인 예시**                                 |
| -------------- | ------------------------- | ------------------------------------------- |
| **`Resource`** | **기본 리소스** (CPU, Memory)  | `cpu`, `memory`                             |
| **`Pods`**     | **포드별**로 발생하는 지표의 **평균값** | `requests_per_second`, `packets-per-second` |
| **`Object`**   | 특정 **K8s 오브젝트** 기준 지표     | `Ingress`의 `hits-per-second`                |
| **`External`** | **클러스터 외부** 서비스 지표        | AWS SQS 큐 길기, GCP Pub/Sub 메시지 수             |

`spec.metrics.[].target.type`

| **타겟 타입 (Target Type)** | **계산 방식**             | **주로 사용되는 경우**                                             |
| ----------------------- | --------------------- | ---------------------------------------------------------- |
| **`Utilization`**       | 현재 사용량 / 할당량(Request) | **`Resource`** 타입에서만 사용 (예: CPU 80% 사용 시 증설)               |
| **`Value`**             | 수치 그대로 사용             | **`Object`**, **`External`** 타입 (예: 전체 메시지 큐가 500개일 때)     |
| **`AverageValue`**      | 전체 수치 / 포드 수          | **`Pods`**, `Resource`, `Object` 등 (예: 포드당 평균 1000 RPS 유지) |

- 위에 대한 예시들은 hpa 기본 yaml 파일 처럼 docs에서 HPA 말고 HPA WalkThrough 페이지에 있다.

---
## 12 (X)

Configure the `web-route` to split traffic between `web-service` and `web-service-v2`.The configuration should ensure that 80% of the traffic is routed to `web-service` and 20% is routed to `web-service-v2`.

**Note:** `web-gateway`, `web-service`, and `web-service-v2` have already been created and are available on the cluster.

**My Answer**

- docs에서 gateway 트래픽 나누는 예시 못찾아서 넘어갔다.


**Right Answer**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-route
  namespace: default
spec:
  parentRefs:
    - name: web-gateway
      namespace: default
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: web-service
          port: 80
          weight: 80
        - name: web-service-v2
          port: 80
          weight: 20
```

- gateway 를 docs에서 검색하면 HTTPRoute에서 위와같이 트래픽 나누는 예시가 없다. 이에 관련 링크를 클릭하면 gateway api docs가 나오는데 이 또한 참조할 수 있는 페이지 중 하나이다.
- 여기에서 손쉽게 예시를 찾을 수 있다.
- 하지만 시험 때, Gateway를 건드려야하는지 HTTPRoute를 건드려야하는지 순간 헷갈렸으므로 Gateway 개념을 다시 볼 필요는 있다.


---
## 13 (X)

One application, `webpage-server-01`, is currently deployed on the Kubernetes cluster using Helm. A new version of the application is available in a Helm chart located at `/root/new-version`.  
  
Validate this new Helm chart, then install it as a new release named `webpage-server-02`. After confirming the new release is installed, uninstall the old release `webpage-server-01`.


**My Answer**

- helm 명령어 숙지가 안되서 일단 넘어갔다.
- helm docs가 그리 편하지 않아서 어느정도 명령어를 외워두는 것이 좋을 것 같다.


**Right Answer**

```bash
helm lint /root/new-version
```

- 해당 디렉토리에 위치한 헬름 차트의 유효성 검증하는 명령어이다.
- `lint` 명령어를 몰랐다.

```bash
helm install webpage-server-02 /root/new-version
```

- 새로운 버전 설치
- 중요) 내가 삽질했던 점은 해당 디렉토리 전체가 차트인데 자꾸 `helm install webpage-server-02 values.yaml` 혹은 `helm install webpage-server-02 Chart.yaml` 이런식으로 특정 파일으르 지정하려고 했다는 점이다.
- 해당 디렉토리의 `Chart.yaml`, `values.yaml`, `template/` 모두 합쳐서 하나의 헬름 차트인 것이다.


---
## 14 (X)

While preparing to install a CNI plugin on your Kubernetes cluster, you typically need to confirm the cluster-wide Pod network CIDR. Identify the Pod subnet configured for the cluster (the value specified under `podSubnet` in the kubeadm configuration). Output this CIDR in the format `x.x.x.x/x` to a file located at `/root/pod-cidr.txt`.


**My Answer**

- pod cidr 어디서 찾는지 모르겠어서 못풀었다.


**Right Answer**

```bash
kubectl get node -o jsonpath='{.items[0].spec.podCIDR}' > /root/pod-cidr.txt
```

- 중요) pod CIDR은 노드의 정보에서 찾을 수 있다.
- `kubectl get node -o yaml` 혹은 `kubectl get node -o json`에서 찾고 JSONPATH로 찾아서 저장하면 되는 문제였다.




