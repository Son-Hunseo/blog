---
title: Node Affinity
description: "Kubernetes Node Affinity 완전 정복: nodeSelector와의 차이, In·NotIn·Exists 등 주요 operator, required/preferred 타입별 동작, 실행 중(label 변경 시) 동작까지 상세하게 설명합니다. OR 조건 매칭 방식과 고급 스케줄링 개념을 YAML 예제와 함께 쉽게 이해할 수 있습니다."
keywords:
  - Kubernetes
  - node affinity
  - node selector
  - Kubernetes Scheduling
  - 쿠버네티스 스케줄링
---
---
## Node Affinity
### 개념

- `nodeAffinity`는 `Pod`가 특정 `Node`에 배치되도록 강제하거나 유도하는 기능이다.
- 위 설명만 들었을 때는 `nodeSelector`랑 다를게 뭐지? 라는 생각이 들 것이다.
- 예를들어 `size: Large`라는 `label`이 붙은 `Node`가 1개, `size: Medium`라는 `label`이 붙은 `Node`가 1개 `size: Small`이라는 `label`이 붙은 `Node`가 2개라고 하자.
- 이때, 나는 `size: Large` 혹은 `size: Medium`인 노드에 특정 `Pod`를 배치하고싶다.
- 이 경우 `nodeSelector`로는 불가능하다. 왜냐하면 `nodeSelector`는 AND 연산만 가능하기 때문이다.
- 이렇게 조금 더 복잡한 조건을 매칭시켜야하는 경우 사용할 수 있는 기능이 `nodeAffinity`이다.

### 대표적인 operator

| Operator       | 설명                      |
| -------------- | ----------------------- |
| `In`           | value 목록 중 하나와 일치       |
| `NotIn`        | value 목록과 일치하지 않는 노드 선택 |
| `Exists`       | key만 존재하면 매칭            |
| `DoesNotExist` | key 자체가 없으면 매칭          |

### Node Affinity의 Type

**현재 사용할 수 있는 Type**

- `requiredDuringSchedulingIgnoredDuringExecution`
	- 스케줄링 시: 반드시 조건을 만족하는 `Node`에만 배치
		- 만족하는 `Node`가 없으면 `Pod`는 `Pending`상태가 된다.
	- 실행 중: `label`이 변경되어도 `Pod`는 그대로 유지
		- `Node`의 `label`이 변경되어도 `Pod`는 그대로 유지된다.
- `preferredDuringSchedulingIgnoredDuringExecution`
	- 스케줄링 시: 조건을 만족하는 `Node`에 우선 배치
		- 만족하는 `Node`가 없으면 아무 `Node`에나 배치
	- 실행 중: `label`이 변경되어도 `Pod`는 그대로 유지
		- `Node`의 `label`이 변경되어도 `Pod`는 그대로 유지된다.

**앞으로 추가될 예정 (아직 지원 X)**

- `requiredDuringSchedulingRequiredDuringExecution`
	- 스케줄링 시: 반드시 조건을 만족하는 `Node`에만 배치
		- 만족하는 `Node`가 없으면 `Pod`는 `Pending`상태가 된다.
	- 실행 중: `label`이 변경되면 `Pod`가 재배치된다.
- `preferredDuringSchedulingRequiredDuringExecution`
	- 스케줄링 시: 조건을 만족하는 `Node`에 우선 배치
		- 만족하는 `Node`가 없으면 아무 `Node`에나 배치
	- 실행 중: `label`이 변경되면 `Pod`가 재배치된다.

### YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
spec:
  containers:
  - name: data-processor
    image: data-processor
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: size
            operator: In
            values: 
            - Large
            - Medium
```

- 예시1: `size=Large` 혹은 `size=Medium` key-value를 `label`로 가진 `Node`에 배치될 수 있다.
- `spec`
	- `affinity`
		- `nodeAffinity`
			- `requiredDuringSchedulingIgnoredDuringExecution`: Node Affinity의 타입
				- `nodeSelectorTerms`
					- `matchExpressions`: 여기에 조건 작성

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
spec:
  containers:
  - name: data-processor
    image: data-processor
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: size
            operator: NotIn
            values: 
            - Small
```

- 예시2: `size=Small`이라는 key-value를 `label`로 가진 `Node`만 아니면 어느 `Node`에도 배치될 수 있다.


```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
spec:
  containers:
  - name: data-processor
    image: data-processor
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: size
            operator: Exists
```

- 예시3: `size`라는 key를 가진 모든 `Node`에 배치될 수 있다.

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/](https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/)
- [https://kubernetes.io/blog/2017/03/advanced-scheduling-in-kubernetes/](https://kubernetes.io/blog/2017/03/advanced-scheduling-in-kubernetes/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
