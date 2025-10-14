---
title: Kube-API Server
sidebar_position: 4
description: kube-apiserver는 Kubernetes 클러스터의 모든 요청을 처리하는 핵심 컴포넌트로, 인증·검증 과정을 거쳐 etcd와 통신하며 클러스터 상태를 관리합니다. 이 글에서는 kube-apiserver의 역할, 동작 방식, 설치 및 확인 방법을 CKA 관점에서 자세히 정리했습니다.
keywords:
  - kube-apiserver
  - kubernetes api server
  - kubernetes control plane
  - kubeadm kube-apiserver
  - kubernetes 요청 흐름
---
---
## 역할

- Kubernetes의 핵심 컴포넌트로 모든 요청은 kube-apiserver를 거쳐 처리된다.
- 주요 기능:
    - 사용자 요청을 인증(authenticate) 및 검증(validate)
    - etcd에 데이터를 조회(retrieve)하거나 업데이트(update)
    - etcd와 직접 통신하는 유일한 컴포넌트
    - 다른 컴포넌트(kube-scheduler, controller-manager, kubelet 등)는 etcd와 직접 통신하지 않고 kube-apiserver를 통해 상태를 갱신한다.

## 동작 예시
### (1) 정보 조회 요청 (예: `kubectl get nodes`)

1. kube-apiserver는 사용자를 인증하고 요청을 검증한다.
2. etcd cluster에 요청된 데이터를 조회한다.
3. etcd에서 가져온 데이터를 사용자에게 응답한다.

- 참고: kubectl 대신 직접 kube-apiserver에 POST API 요청을 보낼 수도 있다.

### (2) Pod 생성 요청

1. 사용자를 인증하고 요청을 검증한다.
2. kube-apiserver가 pod 객체를 생성한다. (아직 노드에 배치되지 않음)
3. etcd에 pod 객체의 정보를 기록한다.
4. 사용자에게 pod가 생성되었음을 알린다.
5. kube-scheduler는 kube-apiserver를 모니터링하다가 새로운 pod가 생긴 것을 확인하고, 적절한 노드를 선택해 kube-apiserver에 알려준다.
6. kube-apiserver는 해당 pod가 어떤 노드에 배치될 것인지 etcd에 다시 기록한다.
7. kube-apiserver는 선택된 노드의 kubelet에 pod 실행 지시를 보낸다.
8. kubelet은 pod를 생성하고 container runtime(예: containerd)에게 실제 컨테이너 실행을 지시한다.
9. 실행이 완료되면 kubelet은 상태를 kube-apiserver에 전달한다.
10. kube-apiserver는 최종 상태를 etcd에 업데이트한다.

### 3. 설치 및 확인 방법

- kubeadm 사용 시(kubeadm 설치시): kube-system 네임스페이스의 Pod로 배포됨
```bash
kubectl get pods -n kube-system cat /etc/kubernetes/manifests/kube-apiserver.yaml
```
    
- 수동 설치 시: 바이너리를 직접 다운로드하여 실행
```bash
cat /etc/systemd/system/kube-apiserver.service ps -aux | grep kube-apiserver
```

## 레퍼런스

- [https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://kubernetes.io/docs/concepts/overview/kubernetes-api/](https://kubernetes.io/docs/concepts/overview/kubernetes-api/)
- [https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster/](https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster/)
- [https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/](https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)