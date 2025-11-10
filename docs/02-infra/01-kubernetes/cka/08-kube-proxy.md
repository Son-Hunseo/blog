---
title: Kube-proxy
description: kube-proxy는 Kubernetes에서 Service 트래픽을 실제 Pod로 전달하는 핵심 컴포넌트로, 클러스터 내 Pod 간 통신을 가능하게 합니다. 이 글에서는 Pod Networking 구조, Service와 kube-proxy의 역할, 그리고 설치 및 실행 방법을 CKA 학습 기준으로 정리했습니다.
keywords:
  - kube-proxy
  - kubernetes service
  - pod networking
  - clusterip
  - kubernetes pod communication
---
---
## Pod 간 통신

- Kubernetes에서 모든 Pod는 다른 모든 Pod에 도달할 수 있다.
- 이는 클러스터에 배포된 Pod Networking Solution에 의해 가능하다.
    - Pod Network는 내부 가상 네트워크로, 모든 노드에 퍼져있어 모든 Pod를 연결한다.

### 예시

노드 A에 웹 애플리케이션 Pod, 노드 B에 데이터베이스 Pod가 실행 중일 경우:
- 웹 애플리케이션 Pod는 DB Pod의 IP를 통해 직접 접근 가능하다.
- 하지만 Pod의 IP는 변동될 수 있어, **Service**를 통해 접근하는 것이 안정적이다.

---
## Service와 Kube-Proxy의 역할

**Service**
- Service는 Pod와 달리 네트워크 인터페이스나 리슨 프로세스가 없는, Kubernetes 메모리에 존재하는 가상의 개념이다.
- Service는 고정된 ClusterIP를 제공해 Pod들의 IP 변경에도 안정적으로 접근 가능하게 한다.

**Kube-Proxy**
- Kube-Proxy는 각 노드에서 실행되는 프로세스이다.
- <span style={{color: 'red'}}>새로운 Service가 생성되면 이를 감지하고, 각 노드에 해당 Service로 트래픽을 전달할 규칙을 자동으로 생성한다.</span>
- 규칙 생성 방식 중 하나가 iptables 규칙이다.
	- 예: Service IP가 `10.96.0.12`, Pod IP가 `10.32.0.15`일 때  
		→ “목적지가 `10.96.0.12`라면 `10.32.0.15`로 포워딩” 규칙을 iptables에 추가.
- 따라서 Kube-Proxy는 Pod가 아닌 Service에 대한 실제 네트워크 트래픽 처리자 역할을 한다.

---
## 설치 및 실행 방식

### Kubeadm Setup

```bash
kubectl get pods -n kube-system
```

- kubeadm 설치
- kubeadm으로 클러스터를 구성하면, kube-proxy는 kube-system 네임스페이스의 DaemonSet으로 배포된다.
- 위 명령어는 확인 명령어

### Manual Setup

```bash
wget https://storage.googleapis.com/kubernetes-release/release/v1.13.0/bin/linux/amd64/kube-proxy
```

- 수동 설치
- kube-proxy 바이너리를 다운로드
- 압축 해제 후 서비스로 실행

---
## 레퍼런스

- [kube-proxy command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/)
- [Kubernetes Components Overview](https://kubernetes.io/docs/concepts/overview/components/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)