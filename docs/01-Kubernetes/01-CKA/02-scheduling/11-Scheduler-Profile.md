---
title: Scheduler Profile
description: Kubernetes 1.18+에서 도입된 Scheduler Profile을 통해 Multi Scheduler의 운영 복잡도와 Race Condition 위험을 해결하는 방법을 알아보세요. Pod가 스케줄링되는 Filtering, Scoring, Binding 등 핵심 단계와 각 단계에 적용되는 Plugin 및 Extension Point를 상세히 비교하고, 단일 스케줄러 내에서 다양한 스케줄링 정책을 관리하는 모범 사례를 이해할 수 있습니다.
keywords:
  - Kubernetes Scheduler Profile
  - Kubernetes Scheduling Framework
  - Kubernetes 스케줄링 플러그인
  - Extension Points
  - Filtering
  - Scoring
  - Pod Binding API
---
---
## Scheduler Profile
### Multi Scheduler 방식의 문제점

1. 각각 독립된 프로세스(`Pod`이든, 프로세스이든)와 config 파일이 필요하다. -> 운영의 복잡도가 증가한다.
2. Race Condition 위험 -> 하나의 `Pod` 배치에 여러 스케줄러가 관여하는 경쟁적 상태가 되는 문제가 발생할 수 있다. (일반적으로는 `Pod`가 스케줄러를 지정하기 때문에 잘 발생하지 않지만, 커스텀 스케줄러의 구현 중 여러 변수로 인한 리스크를 말하는 것)

### Scheduler Profile

- 이러한 문제점을 해결하기 위해서 `Scheduler Profile` 방식이 도입되었다. (kubernetes 1.18 ~)
- `Scheduler Profile` 방식은 하나의 스케줄러 안에서 여러 `Profile`을 지정하여, `Pod`들이 필요에따라, `Profile`을 선택하여, 마치 여러 스케줄러를 선택적으로 사용하는 것과 같은 효과를 낸다.
- `Scheduler Profile` 방식은 각 `Profile`에서 어떠한 `Plugin`을 채택/제외할지 선택하는 방법으로 적용된다.
- `Plugin`은 Kubernetes Scheduling 과정의 각 단계에서 적용되며, 사용자 커스텀으로 개발하여 적용할 수 도 있다.
- `Plugin`을 이해하기 위해서는 Kubernetes Scheduling 과정을 이해해야한다.

:::info
결정적으로, Custom Scheduler를 하나 만들기 위해서는 A ~ Z 까지의 로직을 직접 개발하고 빌드하고 실행시켜야한다. 하지만, Scheduler Profile의 경우에는 따로 로직을 작성하지 않고, 이미 개발되어있는 여러 플러그인들을 조합하여 사용(혹은 조금 수정하여 사용)하여 훨씬 편리하게 사용할 수 있다. (그러나, 커스텀 자유도는 낮음)
:::

---
## Kubernetes Scheduling 과정

![scheduler-profile1](assets/scheduler-profile1.jpg)

### Stages

1. `Scheduling Queue` 
	- `Pod`는 우선 queue에 들어가며, 우선순위에 따라 스케줄링된다.
	- 대표적인 플러그인
		- `PrioritySort`: `Pod`의 우선순위 `value`에 따라 정렬한다.
2. `Filtering`
	- `Pod`를 수용할 수 없는 노드를 제외하는 단계이다.
	- 대표적인 플러그인
		- `Node Resources Fit`: CPU/메모리 부족한 노드를 제외
		- `NodeName`: `Pod`에 특정 `nodeName`이 있으면 해당 노드만 허용
		- `NodeUnschedulable`: 노드의 `unschedulable` 플래그가 `true`이면 제외한다.
		- 이외에도 `TaintToleration`, `NodePorts`, `NodeAffinity` 등의 다양한 플러그인 존재
3. `Scoring`
	- 남은 노드 중 가장 적절한 노드를 점수화하여 선택하는 단계이다.
	- 이 단계는 특정 노드를 제외한다거나 배치하는 단계가 아니라, 점수만 매기는 단계이다.
	- 대표적인 플러그인
		- `Node Resources`: `Pod` 배치 후 남는 자원량을 기준으로 점수화
		- `Image Locality`: 이미지가 이미 존재하는 노드에 높은 점수
		- 이외에도 `TaintToleration`, `NodeAffinity` 등 존재
4. `Binding`
	- 실제로`Pod`를 노드에 바인딩한다.
	- 대표적인 플러그인
		- `DefaultBinder`: `Pod`를 앞선 과정에서 정해진 기준들에 따라 노드에 바인딩하는 플러그인

### Extension Points

Extension Points는 스케줄링의 각 `Stage`마다 플러그인이 어떤 시점에 실행될지를 명확히 지정해둔 인터페이스이다.

- `Scheduling Queue`
    - `queueSort`: 대기 중인 Pod들의 우선순위 기반 정렬 순서를 결정
- `Filtering`
    - `preFilter`: 본격적인 필터링 전에 Pod 정보 전처리 및 스케줄링 불가 조건을 빠르게 검사
    - `filter`: Pod 요구사항을 만족하지 못하는 부적합한 노드를 제외시키는 핵심 단계
    - `postFilter`: 필터링 후 적합한 노드가 없을 때 preemption 등을 통해 상황을 해결하려 시도하는 단계
- `Scoring`
    - `preScore`: 노드 점수 계산 전에 필요한 데이터 준비나 사전 계산을 수행하는 단계
    - `score`: 필터링된 노드들 중 가장 적합한 노드를 찾기 위해 노드별 적합도 점수를 매기는 단계
    - `reserve`: Pod이 선택한 노드의 리소스나 볼륨을 임시 예약하여 다른 Pod이 사용하지 못하게 하는 단계
- `Binding`
    - `permit`: 바인딩 직전에 Pod이 진행하는 것을 최종적으로 허용하거나 지연시킬 수 있는 단계
    - `preBind`: 볼륨 마운트 정보 추가 등 바인딩 직전 노드에 종속적인 최종 준비 작업을 수행하는 단계
    - `bind`: 선택된 노드에 Pod을 실제로 할당하도록 API 서버에 요청을 보내는 단계
    - `postbind`: 바인딩 성공 후 사후 정리 또는 알림 로직을 실행하는 단계

---
## Yaml
### Profile

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
- schedulerName: my-scheduler-1
  plugins:
    score:
      disabled:
        - name: TaintToleration
      enabled:
        - name: MyCustomPluginA
          name: MyCustomPlubinB

- schedulerName: my-scheduler-2
  plugins:
    preScore:
      disabled:
        - name: '*'
    score:
      disabled:
      - name: '*'
        
- schedulerName: my-scheduler-3
```

- `apiVersion`: `kubescheduler.config.k8s.io/v1`
- `kind`: `KubeSchedulerConfiguration`
- `profiles`:
	- `schedulerName`: 정의할 Profile의 이름
	- `plugins`: 활성/비활성 할 플로그인들을 나열하는 위치

### Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - image: nginx
  schedulerName: my-scheduler-1
```

- `spec`
	- `schedulerName`: 여기에 스케줄러 이름 대신 Profile 이름 작성하면 된다.

---
## Multi Scheduler vs Scheduler Profile

| 구분                   | **Multi Scheduler**               | **Scheduler Profile**                                                    |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| **구조**               | 스케줄러 프로세스를 여러 개 실행                | 단일 스케줄러 내부에서 여러 Profile 사용                                               |
| **스케줄링 로직 자유도**      | 매우 높음 — 스케줄링 알고리즘 전체 재작성 가능       | 중간 — Kubernetes Scheduling Framework의 Extension Points 범위 내에서만 커스터마이징 가능 |
| **플러그인 기반 여부**       | 플러그인 기반 아님. 로직 자체를 직접 구현해야 함      | 플러그인 기반. 각 Stage(preFilter, filter, score 등)별로 조합 가능                     |
| **HA 구성**            | 스케줄러별로 따로 구성해야 함                  | 단일 스케줄러만 구성하면 전체 Profile에 자동 적용                                          |
| **모니터링/로그 관리**       | 스케줄러 개수만큼 분산됨                     | 하나의 스케줄러에서 통합 관리                                                         |
| **Kubernetes 권장 여부** | 권장하지 않음 (구버전 방식)                  | 공식 권장 방식 (1.18+ 기본 구조)                                                   |
| **Pod 스케줄링 방식**      | Pod에서 schedulerName을 스케줄러 개수만큼 지정 | Pod에서 schedulerName을 Profile 이름으로 지정                                     |

---
## 레퍼런스

- [https://github.com/kubernetes/community/blob/master/contributors/devel/sig-scheduling/scheduler.md](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-scheduling/scheduler.md)
- [https://kubernetes.io/blog/2017/03/advanced-scheduling-in-kubernetes/](https://kubernetes.io/blog/2017/03/advanced-scheduling-in-kubernetes/)
- [https://jvns.ca/blog/2017/07/27/how-does-the-kubernetes-scheduler-work/](https://jvns.ca/blog/2017/07/27/how-does-the-kubernetes-scheduler-work/)
- [https://stackoverflow.com/questions/28857993/how-does-kubernetes-scheduler-work](https://stackoverflow.com/questions/28857993/how-does-kubernetes-scheduler-work)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)