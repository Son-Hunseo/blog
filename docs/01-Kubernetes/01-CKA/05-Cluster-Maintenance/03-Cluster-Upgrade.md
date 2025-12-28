---
title: Cluster Upgrade
description: 쿠버네티스(Kubernetes) 클러스터를 안전하게 업그레이드하는 완벽 가이드입니다. **버전 호환성 규칙(Version Skew)**부터 시작해, 지원 정책, 그리고 Control Plane 및 Worker Node의 업그레이드 기본 원칙과 상세한 kubeadm 절차를 알아봅니다. 버전 건너뛰기 없이 순차적으로 업그레이드하고, 마스터 노드와 워커 노드에 대한 apt-get upgrade 및 kubeadm upgrade 명령어를 통해 서비스 중단 없이 시스템을 최신 상태로 유지하는 방법을 확인하세요.
keywords:
  - Kubernetes 업그레이드
  - Version Skew
  - 컨트롤 플레인 업그레이드
  - 워커 노드 업그레이드
---
---
## Kubernetes 버전 호환성

- 모든 쿠버네티스 핵심 컴포넌트가 같은 버전이어야하는 것은 아니다.
- 대전제: `kube-apiserver`의 버전이 가장 높아야한다.
- Version Skew 규칙 (`kube-apiserver`의 버전을 n이라고 가정)
	- `controller-manager`/`kube-scheduler` -> n-1 까지 허용
	- `kubelet`/`kube-proxy` -> n-2 까지 허용
	- `kubectl` -> n+1, n, n-1 허용 (예외)
	- 예: `kube-apiserver`가 1.13 버전이라면, `kubelet` 1.11까지 가능

---
## Kubernetes 버전 지원 정책

- 최근 3개의 minor 버전만 공식 지원한다.
- 예
	- 최신 버전이 1.33이라면, 1.31까지 지원한다.
- <span style={{color: 'red'}}>이에 본인이 관리하는 클러스터의 버전이 지원 종료되기 전에 업그레이드를 해두는 것이 좋다.</span>

---
## 업그레이드 개념
### 기본 원칙

**1. 한 번에 여러 버전을 건너뛰지 않는다**
- 1.31 -> 1.33 직행 (X)
- 1.31 -> 1.32 -> 1.33 (O)

**2. 업그레이드 순서
- Master Node(Control Plane) -> Worker Node

### Control Plane 업그레이드 시 영향

- 업그레이드를 하면서 마스터 노드가 잠시 다운되더라도
	- 워커 노드들에 있는 기존 `Pod`는 계속 동작
	- API 접근(배포/삭제/스케일) 불가
	- `kubectl` 동작 불가
- 그러나 사용자 트래픽은 계속 정상 서비스 된다.

### Worker Node 업그레이드 전략

**일반 환경**
- 노드 하나씩 순차 업그레이드 (`drain`/`uncordon`)
- 워커 노드 갯수만큼 반복

**CSP 서비스 환경(EKS, GKE 등)**
- 새로운 노드 생성(업그레이드 된 버전으로)
- 교체하려는 노드의 workload(`Pod` 등)을 새로운 노드로 옮긺
- 기존 노드 삭제
- 워커 노드 갯수만큼 반복

---
## 업그레이드 절차

:::info
1. CSP (EKS, GKE)와 같은 경우는 대시보드 등에서 클릭 등으로 간단하게 업그레이드 할 수 있다.
2. `kubeadm`을 사용하지 않고 모든 요소를 manual로 설치한 경우 각각을 업그레이드 해주면 된다. (복잡)
3. 여기서는 `kubeadm`으로 설치를 한 클러스터 기준으로 업그레이드 방법을 설명한다.
:::

### Master Node

```bash
apt-get upgrade -y kubeadm=<원하는버전>
```

- 먼저 `kubeadm`을 업그레이드한다.

```bash
kubeadm upgrade plan
```

- 출력 정보
	- 현재 클러스터 버전
	- `kubeadm` 버전
	- 업그레이드 가능한 최신 버전
	- 현재 Control Plane 구성요소 버전
	- 이후 실행해야 할 명령어들

```
kubeadm upgrade apply <원하는버전>
```

- Control Plane을 구성하는 요소들을 업그레이드 하는 명령어 (`kube-apiserver`, `kubescheduler` 등)

```bash
apt-get upgrade -y kubelet=<원하는버전>
```

```bash
kubeadm upgrade node config --kubelet-version <업그레이드한버전>
```

```bash
systemctl restart kubelet
```

- 마스터 노드의 `kubelet` 업그레이드

### Worker Node (워커 노드 마다 반복)

```bash
kubectl drain <node> --ignore-daemonsets
```

- 노드 `drain` - 해당 노드에 있던 워크로드들 다른 노드로 안전하게 이동

```bash
apt-get upgrade -y kubeadm=<원하는버전>
```

- `kubeadm` 업그레이드

```bash
apt-get upgrade -y kubelet=<원하는버전>
```

```bash
kubeadm upgrade node config --kubelet-version <업그레이드한버전>
```

```bash
systemctl restart kubelet
```

- `kubelet` 업그레이드

```bash
kubectl uncordon <node>
```

- 노드 `Uncordon` 하여 스케줄 가능 상태로 변경

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- [https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-upgrade/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)