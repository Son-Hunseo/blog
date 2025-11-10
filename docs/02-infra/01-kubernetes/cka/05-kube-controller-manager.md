---
title: Kube Controller Manager
description: kube-controller-manager는 Kubernetes의 다양한 컨트롤러들을 관리하며, 클러스터를 항상 원하는 상태로 유지하도록 자동 조정합니다. 이 글에서는 Node Controller, Replication Controller 등 주요 컨트롤러들의 역할과 동작 방식, 설치 방법을 CKA 기준으로 정리했습니다.
keywords:
  - kube-controller-manager
  - kubernetes controller
  - node controller
  - replication controller
  - kubernetes desired state
---
---
## 개요

- Kube Controller Manager는 Kubernetes의 다양한 컨트롤러들을 관리하는 컴포넌트이다.
- 컨트롤러란 시스템 내 <span style={{color: 'red'}}>컴포넌트들의 상태를 지속적으로 모니터링하고, 클러스터를 원하는 상태(Desired State)로 맞추는 역할</span>을 하는 프로세스이다.
- **여러 컨트롤러들은 각각 독립적인 기능을 수행하지만, 하나의 프로세스로 패키징되어 kube-controller-manager 안에서 실행**된다.

---
## 주요 컨트롤러
### (1) Node Controller

- <span style={{color: 'red'}}>각 노드 상태를 주기적으로 확인하고, 장애 시 적절한 조치를 취한다.</span>
- 동작 방식
    - kube-apiserver를 통해 5초마다 각 노드에 헬스체크 요청을 보냄 (Node Monitor Period)
    - 응답이 없으면 최대 40초간 대기 (Node Monitor Grace Period)
    - 여전히 응답이 없으면 해당 노드를 NotReady (unreachable) 상태로 표시 (STATUS : NotReady)
    - 이후 5분간 대기 (Pod Eviction Timeout)
    - 그래도 응답이 없으면 해당 노드에서 실행 중이던 pod들을 제거(evict)
    - 만약 해당 pod가 ReplicaSet 소속이라면, 다른 정상 노드에서 새로 생성하여 애플리케이션 가용성을 보장

### (2) Replication Controller

- 특정 개수의 pod가 항상 실행 중임을 보장한다.
- pod가 죽으면 새 pod를 생성하여 복구한다.
- 내부적으로는 kube-apiserver를 통해 각 노드와 상호작용한다.
- **현재는 ReplicaSet 및 Deployment가 표준으로 사용되며, ReplicationController는 deprecated 상태이다.**

### (3) 기타 컨트롤러들

- Job, CronJob, PersistentVolume(PV), Endpoint 등 다양한 리소스를 담당하는 컨트롤러들이 존재한다.
- 이러한 컨트롤러들은 kube-controller-manager 내에서 하나의 단일 프로세스로 함께 실행된다.

---
## 설치 및 실행

### Kubeadm Setup

```bash
kubectl get pods -n kube-system cat /etc/kubernetes/manifests/kube-controller-manager.yaml
```

- kubeadm 사용 시(kubeadm 설치시 kube controller manager 자동으로 설치된다): kube-system 네임스페이스의 Pod로 실행됨
- kubeadm 설치 명령어: `sudo apt-get install -y kubeadm=1.31.6-1.1` (이외 많은 설정들이 있어서 자세한건 쿠버네티스 설치 글을 참조)

### Manual Setup

```bash
wget https://storage.googleapis.com/kubernetes-release/release/v1.13.0/bin/linux/amd64/kube-controller-manager cat /etc/systemd/system/kube-controller-manager.service ps -aux | grep kube-controller-manager
```

- 수동 설치 시: 바이너리를 직접 다운로드 후 systemd 서비스로 실행

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)