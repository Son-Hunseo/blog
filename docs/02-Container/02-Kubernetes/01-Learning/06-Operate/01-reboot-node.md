---
image: /img/default/cloud/k8s.png
sidebar_class_name: hidden-sidebar-item
date: 2025-12-19
title: 노드 다운(재부팅) 시 고려해야할 점 (Drain, Uncordon)
description: Kubernetes 노드를 안전하게 재부팅하고 OS 업데이트 및 패치를 적용하는 방법을 알아보세요. kubectl drain과 uncordon 명령어를 사용하여 서비스 다운타임과 데이터 손실 위험을 최소화하는 단계별 운영 전략 및 노드 다운 시 Pod의 동작(Eviction Timeout)을 상세히 설명합니다.
---

---
## 개요

- Kubernetes 클러스터에서 노드의 OS 업데이트, 패치 적용, 장애 복구 등의 원인으로 재부팅해야하는 상황이 있다.
- 이때, 어떠한 상황이 있으며 어떻게 운영해야하는지를 다룬다.

---
## 노드가 다운될 시 어떤 일이 발생?

---
### Pod

- 노드가 다운되면 해당 노드에서 실행 중이던 `Pod`는 접근 불가 상태가 된다.
- `ReplicaSet`에 관리되며 다른 노드에도 해당 `Pod`가 존재한다면 서비스에 계속 접근할 수 있다.
- 단일 `Pod`만 존재한다면, 서비스 중단이 발생한다.

---
### Node (Pod Eviction Timeout)

- 노드가 5분 이상 응답하지 않으면(이 시간의 경우 설정할 수 있지만, 기본은 5분) Kubernetes는 해당 노드의 `Pod`를 죽은 상태로 판단한다.
- 이 경우 `ReplicaSet`으로 묶인 `Pod`는 자동으로 다른 노드에서 새로 생성된다.
- 노드가 5분 이후에 다시 살아나더라도 `Pod` 없이 빈 상태로 복구된다.

---
### 위험성

- 노드가 5분안에 복구된다고 하더라도 해당 노드의 헬스체크가 되는 5분 동안은 서비스가 멈출 위험이 있다. (`replica` 수가 1개인 `replicaSet`을 생각해보자)
- 갑자기 `Pod`가 종료된다면 데이터가 손실될 수 있다. (진행 중인 작업 정리할 시간 없음)

---
## 안전하게 노드를 종료하는 방법

---
### cordon

```bash
kubectl cordon <node-name>
```

- 노드에서 현재 실행되고 있는 `Pod`는 그대로 두고, 새로운 `Pod`만 스케줄되지 않게 하고싶을 경우 사용한다.
- 사실 `drain`을 하면, 내부적으로 사전에 `cordon`이 자동으로 적용된다.

---
### drain

```bash
kubectl drain <node-name>
```

- 해당 노드의 상태를 unschedulable하게 만든다. (왜냐하면, `drain`을 하는 순간 내부적으로 자동으로 `cordon`을 먼저 적용하기 때문이다)
- 또한, 해당 노드의 `Pod`들을 Graceful Eviction하고, 다른 노드에서 재생성되게 한다.
	- Graceful Eviction은 `Pod`에 종료 신호를 보내고 진행 중이던 작업을 정리할 시간을 준다.
	- 또한, 트래픽 관점에서도 다른 `Pod`로 안전하게 전환 후 종료한다.
	- 즉, 서비스 다운타임을 최소화하며, 데이터 손실 위험도 줄인다.
- `drain` 작업이 끝난 뒤 해당 노드에 OS 업데이트, 패치 등의 작업을하고 재부팅하면 된다.
- `ReplicaSet`이 아닌 단일 `Pod`가 노드에 존재할 경우 `drain`시 그냥 사라지기 때문에 `drain` 이 중단된다. (문제가 생길 수 있기 때문)
- 이에 `kubectl drain <node-name> --force` 로 강제로 삭제할 수 있다.
- `cordon`은 자동으로 되지만, `uncordon`은 자동으로 실행되지 않으므로, 재부팅 후 해당 노드에 다시 스케줄링 하고싶다면, `uncordon`을 수동으로 해주어야 한다.

**옵션**
- **DaemonSet이 관리하는 파드**가 있으면 → `--ignore-daemonsets` 필요 (안 그러면 drain이 실패함, DaemonSet 파드는 애초에 축출 대상이 아니라서)
- **emptyDir 볼륨을 쓰는 파드**가 있으면 → `--delete-emptydir-data` 필요 (데이터 유실 경고 때문에 기본적으로 막힘)
- **PDB(PodDisruptionBudget)**로 보호된 파드가 있고 여유가 없으면 → drain이 타임아웃되거나 계속 대기함 (`--timeout` 조정 또는 PDB 상황 확인 필요)
- **컨트롤러 없이 떠 있는 단독 파드**(bare pod)가 있으면 → `--force` 필요 (안 그러면 삭제 거부됨, 재생성 안 되는 파드라서)

---
### uncordon

```bash
kubectl uncordon <node-name>
```

- `drain` 했던 노드를 다시 스케줄링 가능한 상태로 변경한다.
- 그렇다고, 다른 노드로 이동한 `Pod`가 자동으로 원래 노드로 되돌아오는 것은 아니다.
- 새로운 `Pod`가 시작되거나, 기존 `Pod`가 재시작될 때 스케줄링 될 수 있다는 것이다.

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
