---
title: Node Selectors
description: nodeSelector는 Kubernetes에서 특정 레이블을 가진 노드에 Pod를 배치하도록 강제하는 가장 기본적인 스케줄링 방법이다. 노드에 레이블을 설정하고 Pod에 nodeSelector를 추가함으로써 고사양 워크로드를 원하는 노드에 배치해 스케줄링을 제어할 수 있다. 본 문서는 nodeSelector 개념, 사용 방법, 예시 YAML, 그리고 레이블 설정 명령어까지 상세히 정리한다.
keywords:
  - Kubernetes nodeSelector
  - Kubernetes Scheduling
  - Node label
---
---
## Node Selector
### 개념

- `nodeSelector`는 `Pod`입장에서 어떤 `Label`이 달린 `Node`에 배치될 것인지 결정하는 개념이다.
- 예를들어 사양이 높은 `Node1` 사양이 낮은 `Node2`, `Node3`가 있다. 그리고, 워크로드가 높은 `Pod1`, 워크로드가 낮은 `Pod2`, `Pod3`가 있다고 가정하자.
- 이 때, 워크로드가 높은 `Pod1`이 `Node2` 혹은 `Node3`에 배치될 수도 있다. 이러한 상황은 개선될 필요가 있다.
- 이 때, `Pod1`을 `nodeSelector`를 이용해서 `Node1`에 강제로 배치할 수 있다.

### Node에 Label 붙이기

```bash
kubectl label nodes <node-name> <label-key>=<label-value>
```

- 문법

```bash
kubectl label nodes node-1 size=Large
```

- 예시
- `node-1`에 `size=Large`라는 `label`을 붙인다.

### Pod에 nodeSelector 필드 추가

```yaml
# pod-definition.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
spec:
  containers:
  - name: data-processor
    image: data-processor
  nodeSelector:
    size: Large
```

- `spec`
	- `nodeSelector`(Dictionary)
		- 선택하고자하는 `Node`의 `label`을 입력한다.

```bash
kubectl create -f pod-definition.yaml
```

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)