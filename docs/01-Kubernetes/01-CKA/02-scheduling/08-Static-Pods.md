---
title: Static Pods
description: Static Pod는 Kubernetes Control Plane 없이 Kubelet이 독립적으로 생성/관리하며, Control Plane 구성에 주로 사용됩니다. 동작 방식, Mirror Pod의 역할, 그리고 노드별 데몬 배포를 위한 DaemonSet과의 차이점을 자세히 알아보고, kubectl 조작 시 유의사항을 확인하세요.
keywords:
  - Kubernetes Static Pod
  - kubelet
  - Mirror Pod
  - Control Plane 구성 원리
  - Static Pod YAML
---
---
## Static Pod
### 개념

- <span style={{color: 'red'}}>kube-apiserver, kube-scheduler, etcd 없이도 kubelet이 독립적으로 생성/관리 하는 Pod</span>
- 즉, Kubernetes Control Plane의 지시 없이도 동작한다.
- 오직 `Pod`만 가능하다.
	- `Deployment`, `ReplicaSet`, `Service` 등은 Controller가 필요하므로 Static으로 생성이 불가능하다.
- 장점
	- `Static Pod`로 관리하는 `Pod`들은 죽을 경우, 컨트롤플레인과 상관없이 자동으로 재시작된다. (`kubelet`이 상태를 지속적으로 확인하고 문제가 생기면 자동으로 재시작한다)
	- 컨테이너화된 환경을 사용하므로 격리, 이식성, 버전 관리 측면에서 일반 OS 서비스(예: `systemd`)보다 유리하다.

### Use-case: Control Plane

- `kube-apiserver`, `etcd`, `controller-manater` 등은 `Static Pod`로 실행되어 Control Plane을 구축한다.
	- 확인 방법
		- `kubectl get pod -n kube-system`
- 실제로 Control Plane(Master Node)의 `/etc/kubernetes/manifests`를 들어가보면, `etcd.yaml`, `kube-apiserver.yaml`, `kube-controller-manager.yaml`, `kube-scheduler.yaml`이 존재하는 것을 볼 수 있다.

### 동작 방식

**`Kubelet`**

- `Pod` yaml을 실행하고자하는 `Node`의 특정 디렉토리(`/etc/kubernetes/manifests`)에 두면 `kubelet`이 자동으로 감지하여 실행한다.
- 이 디렉토리를 `Static Pod Manifest Directory`라고 한다.

**생성 과정**

1. `Static Pod Manifest Directory`에 Yaml 파일을 넣는다.
2. `Kubelet`이 주기적으로 해당 폴더를 스캔한다.
3. `Kubelet`이 `Pod`를 생성한다.

- `Pod`가 죽으면 `Kubelet`이 자동으로 `Pod`를 재시작한다.
- Yaml 파일 수정 -> `Pod` 재생성
- Yaml 파일 삭제 -> `Pod`삭제

---
## Static Pod 조작
### 스캔 폴더 변경

**방법 1**: `Kubelet` 실행 옵션에서 지정

```bash
sudo nano /etc/systemd/system/kubelet.service
```

```bash
...
--pod-manifest-path=/my-manifest-dir
...
```

**방법 2**: `Kubelet` 설정 파일에서 지정

```bash
sudo nano /var/lib/kubelet/config.yaml
```

```yaml
staticPodPath: /my-manifest-dir
```

### Static Pod 조회

```bash
docker ps

nerdctl ps
```

- `Kubelet`이 직접 `containerd`로 `Pod`를 실행하므로 실행되고 있는 `Node`에서 바로 확인 가능하다. (`docker ps` or `nerdctl ps` 둘 중 하나 설치된 것으로 사용)
- `Control Plane`이 없는 환경에서는 `kubectl`로 조회 불가능하다.

---
## Kubernetes 클러스터 입장

- `Static Pod`도 `kubectl get pods`에서 보인다.
	- `Kubelet`이 `Mirror Pod`라는 오브젝트를 `kube-apiserver`로 전송하고, 이를 `etcd`에 기록한다. 이 때문에 조회되는 것이다.
	- 그렇게 때문에 읽기 전용이며,`kubectl`로 수정/삭제가 불가능하다.
	- 수정/삭제하려면 `Static Pod Manifest Directory`에서 조작해야한다.
	- cf) `Mirror Pod`는 `Pod` 이름 뒤에 자동으로 노드 이름이 붙는다.
		- ex: `etcd-node01`

---
## Static Pod vs DaemonSet

| 기능            | Static Pod       | DaemonSet                                        |
| ------------- | ---------------- | ------------------------------------------------ |
| 관리 주체         | **Kubelet**      | **DaemonSet Controller**                         |
| API Server 필요 | 불필요              | 필요                                               |
| Scheduler 영향  | 무시               | (1.12 이전)Pod는 스케쥴러를 거치지 않음 / (1.12 이후)스케줄러를 거친다. |
| 생성 방식         | manifest 디렉토리    | YAML → API Server 적용                             |
| Mirror Pod 존재 | 생성됨              | 없음                                               |
| 사용 목적 예시      | Control Plane 구성 | 로그/모니터링/에이전트 등 데몬 배포                             |

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/](https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)