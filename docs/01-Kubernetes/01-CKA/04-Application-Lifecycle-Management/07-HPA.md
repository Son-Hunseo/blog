---
title: HPA (Horizontal Pod Autoscaler)
description: Kubernetes 클러스터에서 수동 스케일링의 비효율성을 해소하는 **HPA(Horizontal Pod Autoscaler)**의 핵심 개념과 동작 원리를 쉽고 명확하게 설명합니다. CPU, 메모리 또는 커스텀 메트릭을 기반으로 Deployment, StatefulSet 등의 Pod 개수를 자동으로 증설(Scale-out) 및 축소(Scale-in)하는 방법을 알아봅니다. Metric Server를 사용한 동작 방식과 Imperative(명령형) 및 Declarative(선언적) YAML을 이용한 HPA 설정 및 관리를 위한 실용적인 가이드를 제공합니다. 자동화된 자원 관리를 통해 클러스터 운영 효율성을 극대화하세요.
keywords:
  - Kubernetes
  - Kubernetes HPA
  - Metrics Server
---
---
## 개념
### 수동 스케일링의 문제점 (Horizontal)

- 클러스터 운영자가 직접 `kubectl top pod`로 자원 사용량을 모니터링 해야한다.
- 모니터링 하다가 특정 수치에 도달하면 직접 `kubectl scale` 명령으로 `replica` 수를 조절해야한다.
- 항상 모니터링해야 하며, 트래픽 급증 시 빠르게 대응하기 어렵다.

### HPA

- CPU, 메모리, 혹은 커스텀 메트릭(예: 작업 큐 길이)을 지속적으로 모니터링 한다.
- 설정해 둔 기준치를 초과하면 자동으로 `Pod` 개수를 증가시킨다. (Scale-out)
- 사용량이 낮아지면 자동으로 `Pod` 개수를 감소시킨다. (Scale-in)
- 가능한 대상: `Deployment` / `StatefulSet` / `ReplicaSet`

### 동작 방식

- 메트릭 수집
	- <span style={{color: 'red'}}>Metric Server 필수</span>
	- 혹은, `DataDog`나 `Dynatrace`와 같은 외부 메트릭을 통합하여 동작하게도 가능하다.
- `Pod`의 리소스 `request`/`limit` 기반으로 사용률을 계산하여 동작
	- 예: CPU limit = 500m일 때, 사용률 50%가 임계치라면 250m 사용시 스케일러가 동작한다.

---
## 생성 방법
### Imperative(명령형) 방법

```bash
kubectl autoscale deployment myapp --cpu-percent=50 --min=1 --max=10
```

- cpu 메트릭 임계치가 50% 이며, 최소 `Pod` 수는 1개 최대 `Pod` 수는 10개인 `HPA` 설정 생성

### Declarative(선언적) 방법 - yaml

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```

- `apiVersion`: `autoscaling/v2`
- `kind`: `HorizontalPodAutoscaler`
- `spec`
	- `scaleTargetRef`: scale 할 대상 선택
	- `minReplicas`: 최소 `Pod` 수
	- `maxReplicas`: 최대 `Pod` 수
	- `metrics`: 메트릭 설정

### 조회/삭제

```bash
kubectl get hpa
kubectl delete hpa myapp-hpa
```

---
## 레퍼런스

- https://kubernetes.io/ko/docs/tasks/run-application/horizontal-pod-autoscale/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
