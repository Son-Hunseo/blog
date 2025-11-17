---
title: Priority Classes
description: Kubernetes PriorityClass는 워크로드 간 우선순위를 정의하여 중요한 Pod가 항상 스케줄링되도록 보장하는 기능이다. 이 글에서는 PriorityClass의 개념, 숫자 기반 우선순위 구조, Preemption 동작 방식, globalDefault 설정, 그리고 Pod에서 priorityClassName을 사용하는 방법을 상세히 설명한다. CKA 시험 준비 및 Kubernetes 스케줄링 최적화에 도움이 되는 실전 YAML 예제와 함께 PriorityClass의 핵심 개념을 쉽게 이해할 수 있다.
keywords:
  - Kubernetes PriorityClass
  - Kubernetes preemption
  - Kubernetets scheduling
  - PriorityClass
  - 쿠버네티스 우선순위
---
---
## Priority Classes
### 개념

- 워크로드가 모두 같은 우선순위를 갖는 것이 아니다, 예를들어, 1순위는 `kube-apiserver`, `kube-scheduler`, `etcd`, `kubelet` 등의 쿠버네티스 컴포넌트들, 2순위는 데이터 베이스, 3순위는 중요한 애플리케이션, 4순위는 기타 Jobs가 있을 수 있다. 이럴 때 사용하는 것이 `Priority Class`이다.
- 즉, 고우선순위 `Pod`가 항상 스케줄링되는 것을 보장하기 위해 사용하는 기능이다.

### 특징

- `PriorityClass`는 특정 네임스페이스에 종속되는 객체가 아니다.
- `PriorityClass`의 값은 숫자(정수)로 지정된다.
	- 숫자가 클수록 우선순위가 높다.
	- 범위: -21억(-2147483648) ~ 10억
	- Control Plane에 있는 Kubernetes 중요 컴포넌트들은 10억 ~ 21억(+2147483647)의 별도의 높은 우선순위 범위를 사용한다.

---
## Yaml
### PriorityClass

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
preemptionPolicy: PreemptLowerPriority
value: 1000
description: "High priority application"
globalDefault: true
```

- `apiVersion`: `scheduling.k8s.io/v1`
- `kind`: `PriorityClass`
- `metadata`
- `preemptionPolicy`: `PreemptLowerPriority`(기본) / `Never`
	- `PreemptLowerPriority`: 리소스가 부족할 경우, 새로운 우선순위가 높은 `Pod`가 기존의 낮은 우선순위의 `Pod`를 종료(evict) 시키고 자리를 차지한다.
	- `Never`: 우선순위가 높은 `Pod`가 실행되어야하더라도 기존의 `Pod`를 죽이지 않고, 스케줄링 큐에서 기다린다. (단 스케줄링 큐에서는 우선권을 가진다)
- `value`: 여기에 우선순위를 정수로 지정한다.
- `globalDefault`: `true`/`false` 
	- `Pod`에서 `priorityClassName`이 지정되지 않은 모든 `Pod`의 우선순위는 `globalDefault`가 `true`인 `PriorityClass`의 우선순위를 따른다.
	- `globalDefault`가 `true`인 `PriorityClass`는 오직 한개만 존재할 수 있다.
	- `globalDefault`가 `true`인 `PriorityClass`가 존재하지 않으면서, `Pod`의 `priorityClassName`도 지정되지 않는다면, `Pod`의 우선순위 `value`는 0으로 지정된다.

### Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
  labels:
    app: myapp
    type: front-end
spec:
  containers:
  - name: nginx-container
    image: nginx
  priorityClassName: high-priority
```

- `spec`
	- `priorityClassName`: 여기에 지정학고자하는 `PriorityClass`의 `name`을 지정한다.
		- 만약 지정하지 않는다면, `globalDefault`가 `true`인 `PriorityClass`를 따르며, 해당 `PriorityClass`가 존재하지 않는다면, 우선순위의 `value`가 0으로 지정된다.

---
## 레퍼런스

- https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)