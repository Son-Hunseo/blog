---
title: Namespace
description: Kubernetes의 Namespace 개념부터 필요성, 기본 네임스페이스, 네임스페이스 간 통신 방법, 명령어, YAML 예제, 리소스 제한(ResourceQuota) 설정까지 단계별로 정리한 완벽 가이드입니다.
keywords:
  - Kubernetes
  - namespace
  - 쿠버네티스 네임스페이스
  - resource quota
  - kube-system
---
---
![namespace1](./assets/namespace1.png)
## Namespace란?

- `Namespace`는 리소스를 논리적으로 구분하는 단위이다.
- 예를들어, `Database`라는 `Namespace`에는 데이터베이스에 관련된 `Pod`, `Service`, `Deployment` 등의 리소스를 모아두고, `Monitoring`이라는 `Namespace`에는 모니터링에 관련된 `Pod`, `Service`, `Deployment` 등의 리소스를 모아두고 분리해서 관리할 수 있다. (cf: 논리적으로 구분되는 것이기 때문에 다른 `Namespace`에 있는 리소스라도 서로 통신은 할 수 있다)

---
## Namespace의 필요성

- 목적에 맞는(예: `dev`환경과 `prod` 환경) 환경을 같은 클러스터 내에서 논리적으로 구분해서 관리가 가능하다.
- 각 `Namespace`별 권한 정책(`RBAC`)와 리소스 할당량(`ResourceQuota`)를 설정할 수 있다.
- 관리의 편의성 뿐만 아니라, 실수로 `prod`환경의 자원을 수정하는 일 등을 방지하는 역할을 한다.

---
## 기본 Namespace

1. `default`
	- 따로 `Namespace`를 지정하지 않아도, 작동하는 기본적으로 작업하는 공간이다.
2. `kube-system`
	- 쿠버네티스 내부 컴포넌트용 `Namespace`이다.
	- `CoreDNS`, `ETCD`, `kube-apiserver`, `kube-controller-manager`, `kube-proxy`, `kube-scheduler` 등이 존재한다.
3. `kube-public`
	- 모든 사용자가 접근 가능한 공개 리소스 저장 공간 역할을 하는 `Namespace`이다.

---
## Namespace 내부 통신
### 같은 Namespace 내부

- 같은 `Namespace` 안에서는 단순히 이름으로 접근이 가능하다.
- 예: `web-pod`, `web-service`

### 다른 Namespace에 접근

![namespace2](./assets/namespace2.png)

- 다른 `Namespace`의 자원에 접근하려면 전체 도메인을 사용
- 예: `web-pod.dev.pod.cluster.local`, `web-service.dev.svc.cluster.local`

---
## 명령어

```bash
kubectl create namespace dev
```

- `dev`라는 이름의 `Namespace`를 생성한다.

```bash
kubectl get pods -n dev
```

- `dev`라는 이름의 `Namespace`에 존재하는 `Pod`를 조회한다.

```bash
kubectl get deployment -n dev
```

- `dev`라는 이름의 `Namespace`에 존재하는 `Deployment`를 조회한다.

```bash
kubectl get service -n dev
```

- `dev`라는 이름의 `Namespace`에 존재하는 `Service`를 조회한다.

```bash
kubectl get pods --all-namespaces
```

- 모든 `Namespace`에 존재하는 `Pod`를 조회한다.

```bash
kubectl config set-context --current --namespace=dev
```

- 기본 `Namespace`는 `default`이다.
- 위 명령어를 통해서 기본 `Namespace`를 `dev`로 바꿀 수 있다. 

---
## Yaml
### Namespace 생성

```yaml
# namespace-dev.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
```

```bash
kubectl create -f namespace-dev.yaml
```

- `dev`라는 이름의 `Namespace`를 생성한다.

### 자원 생성

```yaml
# pod-definition.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
     app: myapp
     type: front-end
spec:
  containers:
  - name: nginx-container
    image: nginx
```

```bash
kubectl create -f pod-definition.yaml --namespace=dev
```

- `Pod`를 `dev` 라는 이름의 `Namespace`에 생성한다.

```yaml
# pod-definition.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  namespace: dev
  labels:
     app: myapp
     type: front-end
spec:
  containers:
  - name: nginx-container
    image: nginx
```

```bash
kubectl create -f pod-definition.yaml
```

- `metadata`
	- `namespace`: 여기에 `Namespace` 이름을 지정하여 해당 `Pod`가 항상 `dev`라는 이름의 `Namespace`에 생성되도록 할 수 있다.

### 리소스 제한 (Resource Quota)

```yaml
# compute-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: dev
spec:
  hard:
    pods: "10"
    requests.cpu: "10"
    requests.memory: 10Gi
```

- `apiVersion`: `v1`
- `kind`: `ResourceQuota`
- `metadata`
	- `namespace`: 여기에 리소스를 제한할 `Namespace`의 이름을 지정한다.
- `spec`(Dictionary): 여기에 제한할 리소스의 조건을 작성한다.

``` bash
kubectl create -f compute-quota.yaml
```

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- [https://kubernetes.io/docs/tasks/administer-cluster/namespaces-walkthrough/](https://kubernetes.io/docs/tasks/administer-cluster/namespaces-walkthrough/)
- [https://kubernetes.io/docs/tasks/administer-cluster/namespaces/](https://kubernetes.io/docs/tasks/administer-cluster/namespaces/)
- [https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)
- [https://kubernetes.io/docs/tasks/access-application-cluster/list-all-running-container-images/](https://kubernetes.io/docs/tasks/access-application-cluster/list-all-running-container-images/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)