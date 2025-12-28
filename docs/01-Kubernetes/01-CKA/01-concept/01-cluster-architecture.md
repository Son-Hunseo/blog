---
title: 쿠버네티스 아키텍처
description: Kubernetes 클러스터의 핵심 아키텍처를 이해하기 쉽게 정리했습니다. Control Plane(마스터 노드)와 Worker Node 구성요소인 etcd, kube-apiserver, kube-scheduler, Controller Manager, kubelet, kube-proxy의 역할을 자세히 설명합니다.
keywords:
  - Kubernetes
  - CKA
  - 쿠버네티스
  - Cluster Architecture
  - Control Plane
  - Worker Node
  - kube-apiserver
  - etcd
  - kube-scheduler
  - Controller Manager
  - kubelet
  - kube-proxy
  - containerd
  - 클러스터 구성요소
  - 쿠버네티스 아키텍처
  - CKA 정리
  - 쿠버네티스 기초
  - 쿠버네티스 공부
---
---
**아키텍처**

![cluster-arch1](assets/cluster-arch1.png)

---

## 마스터 노드 (Control Plane)

### etcd

- 클러스터 상태 저장소 (분산 키-값 DB)
- 예: 어떤 파드가 어느 노드에서 실행 중인지, 서비스 IP 목록, ConfigMap 데이터 등이 etcd에 기록됨

### kube-apiserver

- 클러스터와의 모든 요청을 처리하는 게이트웨이
- 사용자의 명령어에 따라 Controller-Manager, ETCD Cluster, kube-scheduler 를 사용하여 상호작용함
- 예: 사용자가 `kubectl get pods` 명령을 실행하면 API 서버가 etcd에서 파드 정보를 조회해 결과 반환

### kube-scheduler

- 새로운 파드를 어느 노드에 배치할지 결정
- 예: CPU가 충분한 노드를 찾아 “Pod A → Node2”로 스케줄링

### Controller Manager

- 다양한 컨트롤러를 실행하는 프로세스
- 예: 사용자가 ReplicaSet에서 “파드 3개 필요”라고 지정했는데 2개만 살아있으면, ReplicaSet Controller가 파드를 하나 더 생성하도록 API 서버에 요청
  - Node Controller: 노드가 응답 없을 때 파드 재배치
    - 예: Node3가 장애로 다운되면, 그 위에 있던 파드들을 다른 노드에서 다시 실행
  - Replication Controller: 파드 수 보장
    - 예: 웹 서버 파드가 죽으면 자동으로 새 파드를 띄워 항상 3개가 유지되게 함

---

## 워커 노드 (Worker Node)

### kubelet

- 해당 노드의 에이전트
- 예: API 서버가 “여기에 nginx 파드 실행해”라고 명령하면, kubelet이 containerd를 통해 컨테이너 실행 후 상태를 보고

### kube-proxy

- 네트워크 규칙 관리, 서비스 트래픽 분산
- 예: 외부 요청이 `Service (ClusterIP)`로 들어오면 kube-proxy가 iptables 규칙을 이용해 파드 A, 파드 B, 파드 C 중 하나로 분산

---

## 모든 노드 공통

### Container Runtime Engine

- 컨테이너 실행 담당
- 예: containerd가 nginx 컨테이너를 실제로 OS 위에서 실행

---

## 레퍼런스

- [https://kubernetes.io/docs/concepts/overview/kubernetes-api/](https://kubernetes.io/docs/concepts/overview/kubernetes-api/)
- [https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/)
- [https://kubernetes.io/docs/concepts/architecture/](https://kubernetes.io/docs/concepts/architecture/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://kubernetes.io/docs/concepts/services-networking/](https://kubernetes.io/docs/concepts/services-networking/)
- [https://kubernetes.io/docs/concepts/architecture/](https://kubernetes.io/docs/concepts/architecture/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)