---
title: 다중 스케줄러
description: Kubernetes 환경에서 기본 스케줄러로 해결할 수 없는 고급 스케줄링 요구를 충족하기 위한 Custom Scheduler 개념과 사용 사례를 상세히 설명합니다. GPU 실시간 부하 기반 스케줄링, 외부 시스템 상태를 고려한 스케줄링, 시간 기반 비용 최적화 스케줄링 등 실제 활용 예시를 포함하며, 바이너리 실행 방식과 Deployment 기반 배포 방식(권장 방식)의 차이를 명확히 정리합니다. 또한 ServiceAccount·RBAC·ConfigMap·Leader Election 구성 이유와, schedulerName을 통한 Pod 지정 방식까지 실무 중심으로 안내합니다.
keywords:
  - Kubernetes Custom Scheduler
  - Kubernetes Muliple Scheduler
  - 쿠버네티스 커스텀 스케줄러
---
---
## Multiple Schedulers
### 개념

- 기본적으로 Kubernetes는 `kube-scheduler`(디폴트 스케줄러)하나로 모든 `Pod`를 Scheduling한다.
- 하지만 특정 애플리케이션에 대해 기본 Scheduler로는 부족한 특별한 규칙이 필요할 수 있다.
- 이때 개발자가 직접 Scheduling 로직을 만든 후 Kubernetes에 추가 Scheduler로 배포할 수 있다.
	- `Go` 언어로 스케줄링 로직을 개발하고 빌드(바이너리든, 컨테이너든)하면 된다.
- 하나의 클러스터에 여러 개의 스케줄러가 동시에 존재할 수 있다. 즉, `Multiple Schedulers`가 가능하다.

### 사용 예시

**GPU 노드의 실시간 상태 기반 스케줄링**
- 특정 `Pod`는 GPU 사용률이 30% 이하인 노드만 사용해야 하는 경우
- 특정 `Pod`는 특정 모델(V100/A100)보다 현재 temperature가 낮은 GPU가 더 우선인 경우
- 기본 Kubernetes 스케줄러는 GPU 실시간 load/temperature/메모리 사용량 같은 동적 정보는 알 수 없다.
- 커스텀 스케줄러는 DCGM Exporter, Prometheus 등 외부 모니터링 지표를 조회해 최적 GPU 노드를 선택할 수 있다.

**Node 리소스 + 외부 시스템 상태를 조합해야 하는 경우**
- `Pod`를 배치할 때 노드 CPU/메모리 뿐만 아니라 `Redis`/`Kafka` 등 외부 시스템 부하도 함께 고려해야할 경우
- 기본 Kubernetets 스케줄러는 외부 시스템에 대해 모른다. 이에 커스텀 스케줄러가 외부 시스템과 상호작용 이후 상황을 판단하여 배치할 수 있다.

**시간 기반 스케줄링**
- 비용이 비싼 노드는 업무 시간대(09~18시)에만 사용하고, 야간에는 저렴한 노드(ex: spot 인스턴스)만 사용하는 규칙 
- 정기 점검 시간대에 특정 유형의 노드에는 workload를 배치하지 않는 정책
- 기본 스케줄러는 시간/비용 정책을 다루지 않는다.  
    커스텀 스케줄러에서는 현재 시간, 비용 테이블, 점검 스케줄 등을 기준으로 배치 정책을 구현할 수 있다.

---
## 배포 방식
### 바이너리 실행 (예전 방식, 추천 X)

- [Kube-Scheduler Manual Setup](../01-concept/06-kube-scheduler.md#manual-setup-kubernetes-the-hard-way) - 이 방법처럼 나 혹은 다른 사람이 만든 Cusom Scheduler를 `systemd`의 서비스로 사용할 수 있게 설정하면 된다.
- 하지만, 이 방법은 추천되지 않는다.

### Deployment로 배포 (추천)

- https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/ 참조
- 위 docs에 나온 것처럼 많은 구성을 해야하는 이유는 다음과 같다.
	- 커스텀 스케줄러가 API 서버에 접근하기 위해 `ServiceAccount` + `ClusterRoleBinding`이 필요하다.
	- 이름, `Leader Election` 등의 설정을 위해 `ConfigMap`이 필요하다.
	- `Deployment`로 실행하면 rolling update, self-healing, replica 수 조절을 통한 HA 구성이 쉬워 운영이 편리하다.

---
## Pod에서 Custom Scheduler 지정하기

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - image: nginx
  schedulerName: my-custom-scheduler
```

- `spec`
	- `schedulerName`: `Multiple Schedulers` 중 여기에 해당 `Pod`를 배치하는데 사용할 스케줄러를 설정한다. 해당 필드가 비어있다면 기본 스케줄러가 사용된다.

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/](https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)