---
title: 수동 스케줄링
description: Kubernetes에서 nodeName 필드와 Binding 객체를 활용해 Pod를 특정 노드에 수동으로 스케줄링하는 방법을 자세히 설명합니다. kube-scheduler의 기본 동작 원리와 Scheduler가 없는 경우 Pod 상태가 Pending으로 남는 이유까지 함께 다룹니다.
keywords:
  - Kubernetes Scheduling
  - nodeName
  - Pod Binding API
  - kube-scheduler 동작 원리
  - Pod Pending
---
---
## 만약 Scheduler가 없다면?

- 만약 `Scheduler`가 없다면 어떤 일이 벌어질까?
- 해당 `Pod`는 계속 `STATUS`가 `Pending` 상태에 놓인다.
- 이때 수동으로 `Pod`를 Scheduling하는 방법은 2가지가 있다.

### nodeName

- 첫번째 방법은 `nodeName` 필드에 `Node` 이름을 추가하는 것이다. 이렇게 하면 `Pod`는 해당 `Node`에 배치된다. 
	- 그러나, `nodeName` 필드는 `Pod`가 생성되는 시점에만 적용이 가능하며, 이미 생성된 `Pod`에는 `nodeName` 필드를 수정할 수 없다.

```yaml
# nginx-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    name: nginx
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 8080
  nodeName: node02
```

```bash
kubectl create -f nginx-pod.yaml
```

### Binding

- 두번째 방법은 `Binding` 객체를 만드는 것이다.

```yaml
Pod-bind-definition.yaml
apiVersion: v1
kind: Binding
metadata:
  name: nginx
target:
  apiVersion: v1
  kind: Node
  name: node02
```

- `apiVersion`: `v1`
- `metadata`
	- `name`: 신기하게도 이 필드가 배치할 `Pod`의 이름과 매칭된다.
- `target`
	- `apiVersion`: `v1`
	- `king`: `Node`
	- `name`: `Binding` 객체가 생성되었으면 하는 `Node` 이름, 즉 Scheduling할 `Node` 이름

```bash
kubectl create -f Pod-bind-definition.yaml
```

:::tip
`Binding` 객체는 해당 `Pod`를 특정 노드에 배치해라는 요청을 객체화 시킨 것에 가깝다.
이에 해당 리소스를 만들더라도 이는 '요청'에 가깝고 이에 유지되는 리소스가 아니다. (즉, `kubectl get bindings` 는 없는 명령어이다)
:::


---
## 레퍼런스

- [https://kubernetes.io/docs/reference/using-api/api-concepts/](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodename](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodename)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)