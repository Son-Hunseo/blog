---
title: Kubelet
sidebar_position: 7
description: kubelet은 Kubernetes 노드에서 실행되는 핵심 에이전트로, Pod 생성과 컨테이너 실행을 실제로 담당합니다. 이 글에서는 kubelet의 역할, 동작 방식, 설치 및 실행 옵션 확인 방법을 CKA 학습 기준으로 체계적으로 정리했습니다.
keywords:
  - kubelet
  - kubernetes node agent
  - pod lifecycle
  - container runtime
  - kubeadm kubelet 설치
---
---
## 개요

- kubelet은 각 노드에서 실행되는 에이전트로, 노드와 쿠버네티스 클러스터 간의 단일 접점 역할을 한다.
- 스케줄러가 어떤 노드에 pod를 배치할지 결정하면, 실제로 pod를 생성하고 실행하는 것은 kubelet의 역할이다.
- kubelet은 container runtime(containerd, CRI-O 등)과 연동해 컨테이너를 생성하고 관리한다.

## 주요 역할

1. kube-apiserver를 통해 전달받은 pod 스펙(Manifest)을 기반으로 pod를 생성한다.
2. 컨테이너 런타임에 애플리케이션 컨테이너 실행을 요청한다.
3. 실행 중인 pod와 컨테이너의 상태를 지속적으로 모니터링한다.
4. 상태 정보를 주기적으로 kube-apiserver에 보고한다.
5. pod가 종료되거나 재시작이 필요한 경우 해당 작업을 수행한다.

## 설치

- kubeadm을 사용하더라도 kubelet은 자동으로 배포되지 않는다.
- 따라서 각 노드에 직접 설치해야 한다.
- 설치 방법 (예시: v1.13.0 버전)
```bash
wget https://storage.googleapis.com/kubernetes-release/release/v1.13.0/bin/linux/amd64/kubelet
```
- 압축 해제 후 systemd 서비스로 실행한다.

## 실행 옵션 확인

- 워커 노드에서 kubelet 프로세스를 확인해 현재 사용 중인 옵션을 볼 수 있다.
```bash
ps -aux | grep kubelet
```

## 레퍼런스

- [https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/kubelet-integration/](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/kubelet-integration/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)