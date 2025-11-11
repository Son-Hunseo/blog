---
title: Replication Controller & ReplicaSet
description: Replication Controller와 ReplicaSet의 차이점과 역할을 이해하고, YAML 예시를 통해 Pod의 고가용성(High Availability), 로드 밸런싱, 스케일링, 그리고 Deployment와의 관계까지 단계별로 배워보세요.
keywords:
  - Kubernetes ReplicaSet, Replication Controller 차이
  - 쿠버네티스 고가용성
  - replication controller
  - ReplicaSet
---
---
## Replication Controller가 필요한 이유
### High Availability (고가용성)

![replicaset1](./assets/replicaset1.png)

- `Pod`가 하나이더라도, `Replication Controller`는 기존 `Pod`에 장애가 생기면, 자동으로 새로운 `Pod`를 생성해서 고가용성을 유지한다. 즉, `Replication Controller`는 정해진 갯수의 `Pod`가 항상 실행되도록 보장한다.

### Load Balancing & Scaling

![replicaset2](./assets/replicaset2.png)

- 처음에 단일 `Pod`라고 가정하자.
- 트래픽이 증가하면 추가 `Pod`를 배포하여 Load Balacing을 한다.
- 트래픽이 더 증가하고 첫번째 `Node`의 자원이 부족해지면 새로운 `Node`에 추가 `Pod`를 배포한다.
- 위의 예시처럼 `Replication controller`는 여러 `Node`에 걸쳐서 존재하며, 서로 다른 `Node`에서 여러 `Pod`에 걸쳐 Load Balancing을 하고 애플리케이션을 확장하는데 도움을 준다.

---
## ReplicaSet vs Replication Controller

- `Replication Controller`는 현재 운영환경에서 거의 사용되지 않는 레거시 기술이며, `ReplicaSet`으로 대체되었다.
- 왜냐하면, `Replication Controller`는 '지정된 수의 `Pod`를 유지하는 역할'은 수행할 수 있지만, 이전 버전으로의 Rollback, 새로운 버전으로의 Rolling 등의 배포 전략 기능이 없기 때문이다.
- 이에 기존의 `Replication Controller`의 기능을 `ReplicaSet`으로 대체하고, `ReplicaSet`을 자동으로 생성하고 관리하는 `Deployment`를 도입해 해당 기능들을 지원하게 되었다.
	- 새로운 버전 배포 -> `Deployment`가 새로운 `ReplicaSet`을 생성하고 Rolling 업데이트로 `Pod` 순차적 교체
	- 이전 버전 롤백 -> 이전 `ReplicaSet`의 `Pod` 수를 0으로 하고 오브젝트 자체를 유지하면서, 롤백을 해야할 경우 이전 `ReplicaSet`의 `Pod` 수를 늘리면서 복구한다.
- 즉, `Deployment`는 `ReplicaSet`을 관리하느 컨트롤러이고, `ReplicaSet`은 `Pod`를 관리하는 컨트롤러이다.


---
## YAML
### Replication Controller

```yaml
# rc_definition.yaml
apiVersion: v1
kind: ReplicationController
metadata:
  name: myapp-rc
  labels:
	app: myapp
	type: front-end
spec:
 template:
	metadata:
	  name: myapp-pod
	  labels:
		app: myapp
		type: front-end
	spec:
	 containers:
	 - name: nginx-container
	   image: nginx
replicas: 3
```

- `apiVersion`, `kind`, `metadata`는 `Pod`와 크게 다른 점 없음 
	- `apiVersion`의 경우 `Replication Controller`는 `v1` 이다.
	- `kind`는 `ReplicationController`
- `spec`
	- `template`(Dictionary): `Replication Controller`에서 사용할 `Pod`의 정보를 작성한다.
		- `Pod`의 Yaml 작성에서 `apiVersion`과 `kind`를 제외한 다른 모든 것을 그대로 작성하면 된다.
- `replicas`: 유지할 `Pod`의 갯수

```bash
kubectl create -f rc-defination.yaml
```

- `Replication Controller` 생성

```bash
kubectl get replicationcontroller
```

- default 네임스페이스에 있는 모든 `Replication Controller` 조회

### ReplicaSet

```yaml
# replicaset-definition.yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: myapp-replicaset
  labels:
	app: myapp
	type: front-end
spec:
 template:
	metadata:
	  name: myapp-pod
	  labels:
		app: myapp
		type: front-end
	spec:
	 containers:
	 - name: nginx-container
	   image: nginx
 replicas: 3
 selector:
   matchLabels:
	type: front-end
```

- `apiVersion`, `kind`, `metadata`는 `Pod`와 크게 다른 점 없음 
	- `apiVersion`의 경우 `ReplicaSet` 은 `apps/v1` 이다.
	- `kind`는 `ReplicaSet`
- `spec`
	- `template`(Dictionary): `Replication Controller`에서 사용할 `Pod`의 정보를 작성한다.
		- `Pod`의 Yaml 작성에서 `apiVersion`과 `kind`를 제외한 다른 모든 것을 그대로 작성하면 된다.
- `replicas`: 유지할 `Pod`의 갯수
- `selector`(Dictionary): `ReplicaSet`에 속하는 `Pod`를 식별하는데 사용한다.
	- `matchLabels`: `labels` 필드의 하위 타입들(`type`, `app`, `role` 등의 사용자 지정 필드)을 지정하여 관리할 `Pod`의 집합을 식별한다.
	- `Replication Controller`와의 가장 큰 차이점 중 하나이다. (`selector` 필드의 경우 `ReplicaSet`에서는 필수이지만, `Replcation Controller`에서는 Optional하게 사용한다)


:::info
`template`에서 `Pod`를 정의했는데 `selector`가 왜 필요할까?
-> `ReplicaSet`은 해당 `ReplicaSet`이 생성되기 이전의 `Pod`도 관리하는 경우가 있기 때문이다.

- Use Case) `ReplicaSet`이 생성되기 이전에 `type`이 `front-end`인 단일 `Pod`가 존재했다고 가정해보자. 이때, `replicas`가 3인 `ReplicaSet`을 생성하면서 `type`을 `front-end`로 설정했다면, 기존의 `Pod`를 고려하면서 새로운 `Pod`는 2개만 생성한다.
:::

:::tip
그럼 이미 같은 3개의 `Pod`를 `type`을 같게해서 배포해둔 뒤에, 이를 관리하기 위해 `ReplicaSet`의 `replicas`를 3으로 지정해서 실행한다면, 새로운 `Pod`를 더이상 배포하지 않기 때문에 `ReplicaSet`의 yaml에 `template`를 작성하지 않아도 될까?

-> 아니다 작성해야한다. 왜냐하면, 어떠한 `Pod`가 종료되었을 때, 새로운 `Pod`를 생성하는데 필요하기 때문이다.
:::

```bash
kubectl apply -f replicaset-definition.yaml
```

- `ReplicaSet` 생성

```bash
kubectl get replicaset
```

- default 네임스페이스의 모든 `ReplicaSet` 조회

---
## ReplicaSet 확장
### 방법1: yaml 수정 및 적용

```yaml
...
replicas: 6
```

```bash
kubectl apply -f replicaset-definition.yaml
```

### 방법2: scale 명령어 사용 (yaml 대상)

```bash
kubectl scale --replicas=6 -f replicaset-definition.yaml
```


### 방법3: sclae 명령어 사용 (type, name 대상)

```bash
kubectl scale --replicas=6 replicaset myapp-replicaset
```

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/)
- [https://kubernetes.io/docs/concepts/workloads/controllers/replicationcontroller/](https://kubernetes.io/docs/concepts/workloads/controllers/replicationcontroller/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
