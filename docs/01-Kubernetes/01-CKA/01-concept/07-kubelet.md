---
title: Kubelet
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

- `kubelet`은 각 노드에서 실행되는 에이전트로, 노드와 쿠버네티스 클러스터 간의 단일 접점 역할을 한다.
- 스케줄러가 어떤 노드에 `Pod`를 배치할지 결정하면, 실제로 `Pod`를 생성하고 실행하는 것은 `kubelet`의 역할이다.
	- 조금 더 정확하게 말하면 `kubelet`은 container runtime(`containerd`, `CRI-O` 등)과 연동해 컨테이너를 생성하고 관리한다.

---
## 주요 역할

1. `kube-apiserver`를 통해 전달받은 `Pod` 객체(데이터)를 기반으로 `Pod`를 생성한다.
2. 컨테이너 런타임에 애플리케이션 컨테이너 실행을 요청한다.
3. 실행 중인 `Pod`와 컨테이너의 상태를 지속적으로 모니터링한다.
4. 상태 정보를 주기적으로` kube-apiserver`에 보고한다.
5. `Pod`가 종료되거나 재시작이 필요한 경우 해당 작업을 수행한다.

---
## 설치
### Package Manager Setup

**설치**

```bash
sudo apt-get install -y kubeadm=<version>
```

- 러프하게 말하면 위처럼 설치하지만, 보통 `kubeadm`을 설치할 때 한번에 설치한다.
- https://kubernetes.io/ko/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#kubeadm-kubelet-%EB%B0%8F-kubectl-%EC%84%A4%EC%B9%98 참고


**설정 조회**

```bash
sudo nano /var/lib/kubelet/config.yaml
```

- 위 경로에 yaml 형태로 설정이 저장되어있다.
- 이때까지 다뤘던 컴포넌트와 다르게 `Pod` 형태가 아니라 `systemd`에서 실행되므로 위 설정을 바꾼 뒤 적용하려면 아래 명령어를 입력해야한다.
	- `sudo systemctl daemon-reload`
	- `sudo systemctl restart kubelet`

### Manual Setup (Kubernetes The Hard Way)

**설치**

```bash
wget https://dl.k8s.io/v1.31.14/bin/linux/amd64/kubelet

sudo mv kubelet /usr/local/bin/ 
sudo chmod +x /usr/local/bin/kubelet

sudo nano /etc/systemd/system/kubelet.service
```

- kubeadm을 사용하더라도 kubelet은 자동으로 배포되지 않는다.
- 따라서 각 노드에 직접 설치해야 한다.

```ini
[Unit]
Description=Kubernetes Kubelet
Documentation=https://kubernetes.io/docs/
After=containerd.service
Requires=containerd.service

[Service]
ExecStart=/usr/local/bin/kubelet \
  --config=/var/lib/kubelet/kubelet-config.yaml \
  --kubeconfig=/etc/kubernetes/kubelet.kubeconfig \
  --container-runtime-endpoint=unix:///run/containerd/containerd.sock \
  --image-pull-progress-deadline=2m \
  --node-ip=<NODE_IP> \
  --register-node=true \
  --v=2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start kubelet
sudo systemctl enable kubelet
```

- 위 명령어는 `kubelet`를 바이너리를 직접 다운로드하여 설치하는 명령어이다.
	- https://www.downloadkubernetes.com/ 참조
- `/usr/local/bin/` 으로 이동시켜 PATH에 등록한다.
- 이에 시스템 전역 실행 파일로 사용가능한 것이다.

**설정 조회**

```bash
cat /etc/systemd/system/kubelet.service
```

- `systemd`에 설치했기 때문에 위 경로에서 설정을 조회하고 수정할 수 있다.
- 해당 파일을 수정한 뒤 아래 명령어 수행해야 적용된다.
	- `sudo systemctl daemon-reload`
	- `sudo systemctl restart kubelet`

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/kubelet-integration/](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/kubelet-integration/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)