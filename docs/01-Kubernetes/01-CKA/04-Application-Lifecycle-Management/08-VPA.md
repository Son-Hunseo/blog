---
title: VPA (Vertical Pod Autoscaler)
description: Kubernetes VPA(Vertical Pod Autoscaler)의 개념, 구성 요소, 동작 과정 및 설치 방법을 완벽하게 정리했습니다. HPA(Horizontal Pod Autoscaler)와의 비교 분석, Pod 리소스 최적화, In-Place Resizing(v1.33 베타) 등의 최신 정보를 통해 쿠버네티스 리소스 관리 효율성을 극대화하는 방법을 알아보세요.
keywords:
  - Kubernetes
  - Kubernetes VPA
  - In-Place Pod Resizing
---
---
## 개념
### 특징

- `Pod`의 개수를 늘리는 `HPA`와 달리 `VPA` 는 각 `Pod`에 적절한 자원(CPU, Memory)를 자동으로 조절하는 기능이다.
- 즉, `Pod`의 성능 최적화가 목적이다.
- `HPA`와 달리 `VPA`는 기본적으로 내장되어있지 않아 따로 설치해야한다.
- `Metric Server` 필수
- `Pod`의 스펙을 수정하기 때문에, `Pod`를 evict하고 재시작하는 과정에서 애플리케이션이 일시적으로 작동하지 않는 기간이 발생할 수 있다.
	- `replica`가 여러개인 `Deployment`를 `VPA`가 조정할 때는 다운타임을 최소화 하기 위해 `Pod` 한개씩 Scale-up 한다.
	- 또한, `VPA Updater` 단에서 `replica`가 1개인 상황과 같이 다운타임이 발생할 위험이 있는 경우에는 `Pod` evict를 차단한다.
	- 하지만, 구조적으로 eviction을 강제하는 설정을 하거나, 사용자 혹은 컨트롤러가 `Pod`를 재시작할 타이밍에 우연히 `VPA`가 동시에 작동하는 등의 예외적인 상황이 존재하므로 '구조적으로는' 다운타임이 발생할 '여지'가 있다고 보는 것이 맞다.

### 구성 요소

| 구성 요소                      | 역할                                     |
| -------------------------- | -------------------------------------- |
| `VPA Recommender`          | 메트릭 기반으로 적정 CPU·메모리 추천값 계산             |
| `VPA Updater`              | 리소스가 비효율적이면 `Pod` evict(재시작 유도를 위한 축출) |
| `VPA Admission Controller` | 새로 생성되는 `Pod`의 스펙을 추천값으로 수정(mutating)  |

### 동작 과정

1. `VPA Recommender` 가 `Pod`의 사용량 분석(`Metric Server`를 통해) 후 '추천 리소스' 계산
2. `Pod`가 이러한 '추천 리소스'와 맞지 않게 비효율적으로 동작한다면, `VPA Updater`가 해당 `Pod`를 evict 한다.
3. `VPA Admission Controller`가 재생성되는 `Pod`를 mutate하여 '추천 리소스'를 적용한다.

### VPA Policy Mode

| Mode         | 동작                                                   |
| ------------ | ---------------------------------------------------- |
| **Off**      | 추천만 제공, Pod는 수정하지 않음                                 |
| **Initial**  | 새 Pod가 생성될 때만 추천값 적용                                 |
| **Recreate** | Pod 리소스가 비효율적이면 evict → 재생성하여 적용                     |
| **Auto**     | 미래의 in-place resizing을 위한 모드 (현재는 Recreate와 동일하게 작동) |

---
## 설치

```bash
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vertical-pod-autoscaler.yaml
```

- 공식 릴리스 설치

```bash
kubectl get pods -n kube-system | grep vpa
```

- `vpa-admission-controller`, `vpa-recommender`, `vpa-updater` `Pod`가 실행된 것을 볼 수 있다.

---
## 명령어
### 생성 (yaml)

- `VPA`는 기본 지원이 아니기 때문에, Imperative한 방법으로 생성할 수 없다.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind:       Deployment
    name:       myapp-deployment
  updatePolicy:
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
      - containerName: myapp-container
        minAllowed:
          cpu: "200m"
          memory: "256Mi"
        maxAllowed:
          cpu: "2"
          memory: "2Gi"
        controlledResources:
          - "cpu"
          - "memory"
```

- `apiVersion`: `autoscaling.k8s.io/v1`
- `kind`: `VerticalPodAutoscaler`
- `spec`
	- `targetRef`: `VPA` 대상 선정
	- `updatePolicy`
		- `updateMode`: `Off`/`Initial`/`Recreate`/`Auto` 중 선택
	- `resourcePolicy`: 여기에 디테일한 설정 적용

### 추천값 확인

```bash
kubectl describe vpa <vpa-name>
```

---
## HPA vs VPA

| **구분**     | `HPA`                                   | `VPA`                                                                      |
| ---------- | --------------------------------------- | -------------------------------------------------------------------------- |
| Scaling 방법 | Pod 수 증가/감소                             | Pod 1개의 리소스 증가/감소                                                          |
| Pod 재시작 여부 | 없음 (기존 Pod 유지)                          | 있음 (리소스 조정을 위해 대부분 재시작 필요)                                                 |
| Downtime   | 없음                                      | 재시작으로 인한 다운타임 존재                                                           |
| 트래픽 급증 대응  | 압도적으로 유리 (Pod 개수를 바로 늘릴 수 있음)           | 불리 (재시작이 필요해 즉각적인 대응 어려움)                                                  |
| 주요 사용 사례   | 웹 서버, API, Stateless 서비스 - 빠른 확장 필요할 경우 | Database, AI/ML, Batch 등 CPU·메모리 사용량 편차가 큰 앱 (예: 초기 Startup 시 CPU 폭발 후 감소) |

---
## cf) In-Place Pod Resizing
### 개념

- `Pod`를 Resizing 하기 위해서는 `Pod`를 삭제하고 새로운 `Pod`를 생성해야하는게 기본적이었다. 이에, 이로 인한 다운타임이 발생한다.
- 이를 개선하기위해 `Pod`를 삭제하고 생성하지 않고도 Resizing하는 기능이 `In-Place Pod Resizing` 기능이다. (아직 완벽하지 않음)
- v1.27에서 alpha 기능 도입
- v1.32에서도 아직 default 옵션은 아닌상태
- +추가) v1.33에서 beta로 승격 (이제 기본 플래그 활성화 필요 없음)

### 적용

**기능 플래그 활성화** (+ v1.33 부터는 필요 없음)

```bash
FEATURE_GATES=InPlacePodVerticalScaling=true
```

**yaml**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resizable-pod
spec:
  containers:
  - name: my-app
    image: my-registry/my-app:latest
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
    resizePolicy:
    - resourceName: cpu
      restartPolicy: "NotRequired"      
    - resourceName: memory
      restartPolicy: "RestartContainer" 
```

- 위 설정은 cpu 리사이징에는 `Pod` 재시작이 필요없으며 memory 리사이징의 경우에는 필요하다는 설정이다. (이 정책이 통상적으로 사용된다)
- `Deployment`의 `Pod` 정의에도 적용 가능하며, `VPA`에도 적용할 수 있다. (설정 할 때 따로 자세히 찾아보기)

- `spec`
	- `resizePolicy`
		- `resourceName`
		- `restartPolicy`

---
## 레퍼런스

- https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- https://kubernetes.io/blog/2025/05/16/kubernetes-v1-33-in-place-pod-resize-beta/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)