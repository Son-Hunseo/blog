---
title: Manual Scheduling
description: Kubernetes에서 nodeName 필드와 Binding 객체를 활용해 Pod를 특정 노드에 수동으로 스케줄링하는 방법을 자세히 설명합니다. kube-scheduler의 기본 동작 원리와 Scheduler가 없는 경우 Pod 상태가 Pending으로 남는 이유까지 함께 다룹니다.
keywords:
  - Kubernetes Scheduling
  - nodeName
  - Pod Binding API
  - kube-scheduler 동작 원리
  - Pod Pending
---
---
## Scheduling 동작 방식

```yaml
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

- 위 yaml 파일에서 낯선 필드를 볼 수 있다. 바로 `nodeName`이다.
- `nodeName`은 일반적으로 manifest 파일을 생성할 때 이 필드를 지정하지 않아도 된다.
- 왜냐하면, `kube-scheduler`가 모든 `Pod`를 순회하면서 `nodeName` 필드가 없는 `Pod`를 스케줄링 알고리즘에 따라 배치하기 때문이다.
- 이 과정에서 `kube-scheduler`는 `nodeName` 필드에 적절한 `Node`를 추가하고 `Pod`를 해당 `Node`에 예약한다.

---
## 만약 Scheduler가 없다면?

- 만약 `Scheduler`가 없는 상황인데, `nodeName`도 지정하지 않았다면 어떤 일이 벌어질까?
- 해당 `Pod`는 계속 `STATUS`가 `Pending` 상태에 놓인다.
- 이때 수동으로 `Pod`를 Scheduling하는 방법은 2가지가 있다.

### nodeName

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

- 첫번째 방법은 `nodeName` 필드에 `Node` 이름을 추가하는 것이다. 이렇게 하면 `Pod`는 해당 `Node`에 배치된다. 
	- 그러나, `nodeName` 필드는 `Pod`가 생성되는 시점에만 적용이 가능하며, 이미 생성된 `Pod`에는 `nodeName` 필드를 수정할 수 없다.

### Binding

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
- `target`
	- `apiVersion`: `v1`
	- `king`: `Node`
	- `name`: `Binding` 객체가 생성되었으면 하는 `Node` 이름, 즉 Scheduling할 `Node ` 이름

```bash
kubectl create -f Pod-bind-definition.yaml
```

```bash
crul --header "Content-Type:application/json" --request POST --data '{"apiVerson":"v1", "kind": "Binding", ...}' http://$SERVER/api/v1/namespaces/default/pods/$PODNAME/binding/
```

- 두번째 방법은 `Binding` 객체를 만들고 `Pods Binding API`에 Post 요청을 보내는 것이다.
	- 이는 `Scheduler`가 `Binding` 객체에 수행하는 작업을 모방한다.
	- 작성한 `Binding` yaml을 정확히 JSON 포맷으로 바꾸어서 요청을 보내야 한다.

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/using-api/api-concepts/](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodename](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodename)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)