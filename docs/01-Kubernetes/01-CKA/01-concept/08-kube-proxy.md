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

- Kubernetes에서 모든 `Pod`는 다른 모든 `Pod`에 도달할 수 있다.
- 이는 클러스터에 배포된 Pod Networking Solution에 의해 가능하다.
    - Pod Network는 내부 가상 네트워크로, 모든 노드에 퍼져있어 모든 Pod를 연결한다.

### 예시

노드 A에 웹 애플리케이션 Pod, 노드 B에 데이터베이스 Pod가 실행 중일 경우:
- 웹 애플리케이션 Pod는 DB Pod의 IP를 통해 직접 접근 가능하다.
- 하지만 Pod의 IP는 변동될 수 있어, `Service`를 통해 접근하는 것이 안정적이다.

---
## Service와 Kube-Proxy의 역할

**Service**
- `Service`는 `Pod`와 달리 네트워크 인터페이스나 리슨 프로세스가 없는, Kubernetes 메모리에 존재하는 <span style={{color: 'red'}}>가상의 개념</span>이다.
- `Service`는 고정된 `ClusterIP`를 제공해 `Pod`들의 IP 변경에도 안정적으로 접근 가능하게 한다.

**Kube-Proxy**
- `kube-proxy`는 각 노드에서 실행되는 프로세스이다.
- 새로운 `Service`가 생성되면 이를 감지하고, 각 노드에 해당 `Service`로 <span style={{color: 'red'}}>트래픽을 전달할 규칙을 자동으로 생성한다.</span>
- 규칙 생성 방식 중 하나가 iptables 규칙이다.
	- 예: `Service` IP가 `10.96.0.12`, `Pod` IP가 `10.32.0.15`일 때  
		→ “목적지가 `10.96.0.12`라면 `10.32.0.15`로 포워딩” 규칙을 iptables에 추가.
- 따라서 `kube-proxy`는 `Pod`가 아닌 `Service`에 대한 실제 네트워크 트래픽 처리자 역할을 한다.

---
## 설치
### Kubeadm Setup

**설치**

- `kubeadm`으로 클러스터 설치 시 `kube-proxy`는 `DaemonSet(Pod)` 형태로 자동으로 설치된다.


**설정 조회**

```bash
kubectl get configmap kube-proxy -n kube-system -o yaml
```

- `kube-system` 네임스페이스에 `ConfigMap` 객체로 설정이 저장되어 있다.
- 설정을 바꾸고 싶다면 위 `ConfigMap`을 변경하고, `kubectl rollout restart daemonset kube-proxy -n kube-system` 으로 `DaemonSet`을 다시 실행해주어야 한다.


### Manual Setup (Kubernetes The Hard Way)

**설치**

```bash
wget https://dl.k8s.io/v1.31.14/bin/linux/amd64/kube-proxy

sudo mv kube-scheduler /usr/local/bin/ 
sudo chmod +x /usr/local/bin/kube-proxy

sudo nano /etc/systemd/system/kube-proxy.service
```

```ini
[Unit]
Description=Kubernetes Network Proxy
Documentation=https://kubernetes.io/docs/concepts/services-networking/service/
After=network.target

[Service]
ExecStart=/usr/local/bin/kube-proxy \
  --config=/var/lib/kube-proxy/kube-proxy-config.yaml \
  --v=2
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start kube-proxy
sudo systemctl enable kube-proxy
```

- 위 명령어는 `kube-proxy`를 바이너리를 직접 다운로드하여 설치하는 명령어이다.
	- https://www.downloadkubernetes.com/ 참조
- `/usr/local/bin/` 으로 이동시켜 PATH에 등록한다.
- 이에 시스템 전역 실행 파일로 사용가능한 것이다.

**설정 조회**

```bash
cat /etc/systemd/system/kube-proxy.service
```

- `systemd`에 설치했기 때문에 위 경로에서 설정을 조회하고 수정할 수 있다.
- 해당 파일을 수정한 뒤 아래 명령어 수행해야 적용된다.
	- `sudo systemctl daemon-reload`
	- `sudo systemctl restart kube-proxy`


---
## 레퍼런스

- [kube-proxy command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/)
- [Kubernetes Components Overview](https://kubernetes.io/docs/concepts/overview/components/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)