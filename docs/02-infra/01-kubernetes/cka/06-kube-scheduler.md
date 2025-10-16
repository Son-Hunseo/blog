---
title: Kube-scheduler
description: kube-scheduler는 Kubernetes에서 Pod를 어떤 노드에 배치할지 결정하는 핵심 컴포넌트입니다. 이 글에서는 스케줄러의 역할, Filter 및 Rank 단계의 동작 원리, 스케줄링 우선순위 요소, 그리고 설치 및 확인 방법을 CKA 학습 기준으로 정리했습니다.
keywords:
  - kube-scheduler
  - kubernetes scheduler
  - pod scheduling
  - node affinity
  - taints and tolerations
---
---
## 개요

- kube-scheduler는 pod를 어느 노드에 배치할지 결정하는 역할을 한다.
- 중요한 점: kube-scheduler는 단지 <span style={{color: 'red'}}>"어디에 둘지 결정"</span>만 하며, 실제로 pod를 생성하여 실행하는 것은 각 노드의 kubelet이 담당한다.

## 스케줄러가 필요한 이유

- 클러스터에는 여러 노드가 있고, 각 노드의 리소스 상태(cpu, memory 등)가 다르다.
- 특정 pod가 필요한 리소스를 만족할 수 있는 노드에 배치하지 않으면 실행이 불가능하다.
- 따라서 스케줄러는 pod의 요구사항과 클러스터 상태를 바탕으로 최적의 노드를 선택한다.

## Pod 배치 과정 (스케줄링 흐름)

예시: cpu 10을 요구하는 pod가 있고, 노드들의 cpu 상태가 각각 4/4/12/16이라고 가정할 때
1. Filter 단계
    - 조건에 맞지 않는 노드들을 걸러낸다.
    - 예시: cpu 4/4인 노드는 pod 요구사항(cpu 10)을 충족하지 못하므로 제외
    
2. Rank 단계
    - 남은 후보 노드(12, 16)에 점수를 매긴다. (Priority Functions)
    - 예시:
        - 노드 12에 배치 시: 남는 cpu = 2
        - 노드 16에 배치 시: 남는 cpu = 6
        - 남는 자원이 더 많은 노드(16)가 더 높은 점수를 받아 선택됨
    
3. 우선순위 결정 요소들
    - Resource Requirements and Limits
    - Taints and Tolerations
    - Node Selectors 및 Affinity
    - 이 외에도 다양한 요소들이 있으며, 알고리즘은 커스텀할 수 있다.

## 설치 및 확인

- 수동 설치
    - Kubernetes release 페이지에서 바이너리를 다운로드해 서비스로 실행
```bash
wget https://storage.googleapis.com/kubernetes-release/release/v1.13.0/bin/linux/amd64/kube-scheduler
```
- kubeadm 설치
    - kube-system 네임스페이스에 pod로 배포됨
	- 확인 명령어
 ```bash
 kubectl get pods -n kube-system cat /etc/kubernetes/manifests/kube-scheduler.yaml
 ```
- 실행 중 옵션 확인
```bash
ps -aux | grep kube-scheduler
```

## 레퍼런스

- [https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/)
- [https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/](https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)