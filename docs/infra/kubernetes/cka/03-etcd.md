---
title: ETCD
description: ETCD는 Kubernetes의 핵심 구성 요소로, 클러스터의 모든 상태 데이터를 저장하는 고가용성 분산 키-값 저장소입니다. 이 글에서는 ETCD의 개념부터 standalone 설치, etcdctl 사용법, kubeadm 환경 배포, HA 구성을 포함한 실무 설정 방법까지 정리했습니다.
keywords:
  - etcd
  - kubernetes etcd
  - Kubernetes
  - etcdctl 사용법
  - etcd 설치
  - kubernetes key-value store
---
---
## Key-Value Store란?

- 전통적인 데이터베이스(SQL, RDB)는 행과 열의 테이블 구조
- 키-값 저장소는 Key와 Value 쌍으로 데이터를 저장
- 단순한 구조로 빠른 조회와 저장 가능

## ETCD란?

- 분산형 신뢰성 있는 키-값 저장소
- 단순하고, 보안성이 있으며, 빠른 성능 제공
- Kubernetes 클러스터의 모든 상태와 리소스를 저장
- 예: Nodes, Pods, Configs, Secrets, Accounts, Roles, Bindings 등    
- kubectl get 명령어로 조회하는 정보는 모두 etcd 서버에서 가져옴

## ETCD 설치 및 시작 (Standalone)

- GitHub Releases에서 OS에 맞는 바이너리 다운로드
    ```bash
    curl -LO https://github.com/etcd-io/etcd/releases/download/v3.5.6/etcd-v3.5.6-linux-amd64.tar.gz
    ```

- 압축 해제 후 실행
    ```bash
    tar xvzf etcd-v3.5.6-linux-amd64.tar.gz
    ./etcd
    ```

- 기본 포트: 2379

## etcdctl 클라이언트

- etcd 기본 제공 클라이언트
- 주요 명령어
    - 데이터 저장: `./etcdctl put key1 value1`
    - 데이터 조회: `./etcdctl get key1`
    - 명령어 목록 확인: `./etcdctl`
- Kubernetes 데이터 확인
    ```bash
    kubectl exec etcd-master -n kube-system -- sh -c \
    "ETCDCTL_API=3 etcdctl --cert=/etc/kubernetes/pki/etcd/server.crt \
    --key=/etc/kubernetes/pki/etcd/server.key \
    --cacert=/etc/kubernetes/pki/etcd/ca.crt get / --prefix --keys-only"
    ```
- 데이터는 `registry` 디렉토리 아래에 저장
- 주요 구조: minions, nodes, pods, replicasets, deployments, roles, secrets 등

## Kubernetes 환경에서의 ETCD 배포

### Manual Setup

- 클러스터를 직접 구축하는 경우 → etcd 바이너리 다운로드 및 설치
- Master 노드에 서비스로 직접 구성
    ```bash
    wget -q --https-only \
    "https://github.com/etcd-io/etcd/releases/download/v3.3.11/etcd-v3.3.11-linux-amd64.tar.gz"
    ```

### Kubeadm Setup

- kubeadm으로 클러스터 구축 시(kubeadm 설치시) → etcd 서버가 kube-system 네임스페이스의 Pod로 자동 배포
    ```bash
    kubectl get pods -n kube-system
    ```

## ETCD in HA Environment

- 고가용성 환경에서는 여러 Master 노드마다 etcd 인스턴스를 분산 배치
- etcd 인스턴스 간 통신 설정 필요
- etcd.service 설정에서 `--initial-cluster` 옵션으로 인스턴스 지정
- 데이터 정합성을 위해 quorum 기반 합의 필요

## 레퍼런스

- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://etcd.io/docs/](https://etcd.io/docs/)
- [https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/)
- [https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#stacked-control-plane-and-etcd-nodes](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#stacked-control-plane-and-etcd-nodes)
- [https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#external-etcd-nodes](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#external-etcd-nodes)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)