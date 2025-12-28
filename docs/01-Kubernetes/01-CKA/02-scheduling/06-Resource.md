---
title: Resource Requst & Limits
description: Kubernetes 리소스 관리의 핵심 개념을 정리한 가이드입니다. CPU·메모리 단위, Resource Requests·Limits의 동작 원리, LimitRange 및 ResourceQuota 설정 방법, 그리고 실무에서 활용할 수 있는 최적의 리소스 사용 전략까지 상세히 설명합니다. CKA 준비 및 Kubernetes 운영 환경에서 Pod 스케줄링과 자원 관리의 이해도를 높이고 싶은 개발자에게 도움이 됩니다.
keywords:
  - Kubernetes Resource Management
  - K8s Resource Request
  - K8s Resource Limit
  - Kubernetes LimitRange
  - Kubernetes ResourceQuota
  - Kubernetes Best Practices
---
---
## Resource

- `Pod`는 `Node`의 리소스를 소비한다. (CPU/Memory/Disk)
- `kube-scheduler`는 `Pod`의 리소스 요청과 `Node`의 가용 자원을 비교해 배치함.
- 어떠한 `Node`에도 필요한 자원이 없으면 `Pod`는 `Pending` 상태 유지
	- `kubectl describe pod`에서 `insufficient CPU` 같은 메시지가 보임
- CPU 단위
	- `1` = 1 vCPU, 1 Core
	- `1 = 1000m`
	- 최소 단위 = `1m` (0.001 vCPU)
- Memory 단위
	- `Mi` = Mebibyte (1024 기반)
	- `M` = Megabyte (1000 기반)
	- `Gi` / `G` 도 동일 방식

---
## Resource Request
### 개념

- `Container`/`Pod`가 최소한으로 필요하다고 요구하는 자원량
- `kube-scheduler`는 `requests`를 기준으로만 `Node`에 `Pod`를 배치함 (즉, 스케줄링의 기준이자, 보장되는 최소 자원)

### Yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: simple-webapp-color
  labels:
    name: simple-webapp-color
spec:
  containers:
  - name: simple-webapp-color
    image: simple-webapp-color
    ports:
      - containerPort: 8080
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
```

- `spec`
	- `containers`
		- `resource`
			- `requests`: 여기에 `memory`와 `cpu`작성

---
## Resource Limits
### 개념

- `Container`/`Pod`가 최대로 사용할 수 있는 자원량
- CPU가 지정된 `limits`의 `cpu` 사용량을 넘길 경우
	- 스로틀링 발생. 즉, `limits` 이상 사용할 수 없음
	- 하드웨어 스로틀링처럼 전압이 낮춰지는 것은 아니고, 할당된 CPU time quota를 소진하면, 그 기간이 끝날 때까지 CPU를 받지 못하고 대기 -> 느려지고 성능저하 발생
- Memory가 지정된 `limits`의 `memory` 사용량을 넘길 경우
	- Kubernetes는 메모리를 스로틀링할 수 없음
	- 지속적으로 `limits` 초과시 OOMKill(Out of Memory) 발생 -> `Pod` 재시작 됨

:::tip
`memory`의 `limits` 때문에 OOM이 발생한다면, `memory`의 `limits`를 걸지 않으면 되는거 아닌가?
-> 꼭 그런 것은 아니다. `memory`의 `limits`는 일종의 안전장치 역할을 한다. 이러한 `limits`를 걸면서 `Pod` 하나를 재시작함으로써 전체 `Node`의 메모리가 부족해 `Node` 전체가 다운되는 상황을 막는 것이다.
:::

### Yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: simple-webapp-color
  labels:
    name: simple-webapp-color
spec:
  containers:
  - name: simple-webapp-color
    image: simple-webapp-color
    ports:
      - containerPort: 8080
    resources:
      limits:
        cpu: "2"
        memory: "4Gi"
```

- `spec`
	- `containers`
		- `resource`
			- `limits`: `requests`와 동일한 위치에 작성하면 된다. (`requests`와 같이 사용 가능)

---
## LimitRange
### 개념

- `Namespace` 내의 `Pod`들의 `requests`/`limits`를 지정하지 않아도 설정한 `LimitRange` 값을 자동으로 적용하게하는 기능
- `Namespace` 단위로 적용하는 기능이다.
- `Namespace`에 실행되고 있던 기존 `Pod`에는 영향이 없고, 새로 생성되는 `Pod`부터 적용된다.

### Yaml

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: cpu-resource-constraint
spec:
  limits:
  - type: Container
    default:      # limit 기본값
      cpu: 500m
    defaultRequest:  # request 기본값
      cpu: 500m
    max:
      cpu: 1
    min:
      cpu: 100m
```

- `apiVersion`: `v1`
- `kind`: `LimitRange`
- `metadata`
- `spec`
	- `limits`
		- `type`: `Container`, `Pod`, `PVC`(스토리지 크기 제한) 가능
		- `default`: 아무것도 지정하지 않았을 때 걸리는 기본 `limits` 값
		- `defaultRequests`: 아무것도 지정하지 않았을 때 걸리는 기본 `requests` 값
			- `cpu`/`memory` 지정 가능
		- `max`: 해당 네임스페이스 내부에서 지정할수 있는 최대 자원량
		- `min`: 해당 네임스페이스 내부에서 지정할 수 있는 최소 자원량
			- 예를들어, `max`, `min` 범위를 벗어나는 `Pod`의 `requests`나 `limit` 값을 설정할 경우 Kubernetes API 서버에서 생성을 거부한다.
			- `cpu`/`memory` 지정 가능

---
## ResourceQuota
### 개념

- `Namespace`에서 배포되는 모든 자원 합계의 상한을 두는 기능
- `Namespace` 단위로 적용하는 기능이다.

### Yaml

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "4Gi"
    limits.cpu: "10"
    limits.memory: "10Gi"
```

- `apiVersion`: `v1`
- `kind`: `ResourceQuota`
- `metadata`
- `spec`
	- `hard`
		- `requests.cpu`
		- `requests.memory`
		- `limits.cpu`
		- `limits.memory`
			- 예를들어, 위 조건을 넘어서는 `Pod` 생성 요청이 올 경우 Kubernetes API 서버에서 거부된다.

---
## 사용 전략

1. `requests` X / `limits` X
	- 가장 좋지 않은 전략이다. 
	- 특정 `Pod`가 리소스를 무한대로 가져가 다른 `Pod`가 뜨지 못하는 상황이 될 수 있다.
2. `requests` X / `limits` O
	- Kubernetes는 자동으로 `requests` = `limit`로 간주한다.
	- 보장되는 자원은 명확하지만, 스케줄링 유연성이 떨어진다.
		- 예를들어 `Node`가 4 core 라고 가정하자. 이때, Pod A를 2 core로 `limits` 설정 시, 실제로 Pod A가 1 core만 사용하더라도, 2 core(4-2)를 만족시키는 `Pod`만 스케줄링 가능하며, 3 core를 사용하는 `Pod`는 배치가 불가능하다.
		- 단, 스케줄링이 불가능 한 것이지, 다른 `Pod`가 해당 남는 3 core를 사용할 수는 있다.
		- 다시 말하자면, `requests`는 스케줄링을 돕기위한 장치, `limits`는 실제 사용 가능한 리소스 제한이다.
3. `requests` O / `limits` O
	- 최소 자원 측면에서 동일한 자원을 사용핮는 것이 보장되지만, `limits`까지 밖에 자원을 사용하지 못한다. 즉, 유연한 리소스 공유 측면에서 아쉬운 점이 있다.
		- 예를들어 `Node`가 4 core라고 가정하자. 이때, Pod A와 Pod B를 `requests`: 1 core, `limits`: 2 core 로 설정 시, Pod A가 실제로 1 core만 사용하더라도, Pod B가 2 core `limits`가 있기 대문에 2 core까지만 사용 가능하며, 이 때 남는 1 core(3 - 2)를 사용할 수 없다.
4. `requests` O / `limits` X (추천!)
	- 각 `Pod`는 `requests`만큼은 보장 받고, 남는 CPU는 다른 `Pod`가 자유롭게 사용 가능하다.
	- 단, `memory`의 경우 `Pod`단에서 `limits`가 없으면, `Node` 전체의 메모리가 부족할 때 위험해질 수 있기 때문에(`Node` OOM 다운) `memory`의 `limits`는 상황에 따라 고려해야한다.

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
