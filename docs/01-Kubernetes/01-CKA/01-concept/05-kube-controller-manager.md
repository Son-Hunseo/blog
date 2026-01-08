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
- 컨트롤러란 시스템 내 <span style={{color: 'red'}}>컴포넌트들의 상태를 지속적으로 모니터링하고, 클러스터를 요구된 상태로 맞추는 역할</span>을 하는 프로세스이다.
- 여러 컨트롤러들은 각각 독립적인 기능을 수행하지만, 하나의 프로세스로 패키징되어 `kube-controller-manager` 안에서 실행된다.

---
## 주요 컨트롤러
### (1) Node Controller

- <span style={{color: 'red'}}>각 노드 상태를 주기적으로 확인하고, 장애 시 적절한 조치를 취한다.</span>
- 동작 방식
    - `kube-apiserver`를 통해 5초마다 각 노드에 헬스체크 요청을 보냄 (Node Monitor Period)
    - 응답이 없으면 최대 40초간 대기 (Node Monitor Grace Period)
    - 여전히 응답이 없으면 해당 노드를 NotReady (unreachable) 상태로 표시 (`STATUS : NotReady`)
    - 이후 5분간 대기 (Pod Eviction Timeout)
    - 그래도 응답이 없으면 해당 노드에서 실행 중이던 `Pod`들을 제거(evict)
    - 만약 해당 `Pod`가 `ReplicaSet` 소속이라면, 다른 정상 노드에서 새로 생성하여 애플리케이션 가용성을 보장

### (2) Replication Controller (Deprecated)

- 특정 개수의 `Pod`가 항상 실행 중임을 보장한다.
- `Pod`가 죽으면 `Pod`를 생성하여 복구한다.
- 내부적으로는 `kube-apiserver`를 통해 각 노드와 상호작용한다.
- 현재는 ReplicaSet 및 Deployment가 표준으로 사용되며, ReplicationController는 deprecated 상태이다.

### (3) 기타 컨트롤러들

- `Job`, `CronJob`, `PersistentVolume(PV)` 등 다양한 리소스를 담당하는 컨트롤러들이 존재한다.
- 이러한 컨트롤러들은 `kube-controller-manager` 내에서 하나의 단일 프로세스로 함께 실행된다.

---
## 설치 및 실행

### Kubeadm Setup

**설치**

- `kubeadm`으로 클러스터 설치 시 `kube-conroller-manager`는 자동으로 설치된다. (`Pod` 형태로)


**설정 조회**

```bash
sudo nano /etc/kubernetes/manifests/kube-controller-manager.yaml
```

- 위 경로에 yaml 형태로 설정이 저장되어있다.
- 설정 변경도 위 yaml 파일을 변경하면 자동으로 된다.
	- Static Pod 이기 때문인데, 이는 나중에 자세히 다루도록 한다.

### Manual Setup (Kubernetes The Hard Way)

**설치**

```bash
wget https://dl.k8s.io/v1.31.14/bin/linux/amd64/kube-controller-manager

sudo mv kube-controller-manager /usr/local/bin/ 
sudo chmod +x /usr/local/bin/kube-controller-manager

sudo nano /etc/systemd/system/kube-controller-manager.service
```

```ini
[Unit]
Description=Kubernetes Controller Manager
Documentation=https://kubernetes.io/docs/
After=network.target

[Service]
ExecStart=/usr/local/bin/kube-controller-manager \
  --bind-address=127.0.0.1 \
  --cluster-name=kubernetes \
  --cluster-signing-cert-file=/etc/kubernetes/pki/ca.crt \
  --cluster-signing-key-file=/etc/kubernetes/pki/ca.key \
  --kubeconfig=/etc/kubernetes/kube-controller-manager.kubeconfig \
  --leader-elect=true \
  --root-ca-file=/etc/kubernetes/pki/ca.crt \
  --service-account-private-key-file=/etc/kubernetes/pki/service-account.key \
  --service-cluster-ip-range=10.32.0.0/24 \
  --cluster-cidr=10.200.0.0/16 \
  --allocate-node-cidrs=true \
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start kube-controller-manager
sudo systemctl enable kube-controller-manager
```

- 위 명령어는 `kube-controller-manager`를 바이너리를 직접 다운로드하여 설치하는 명령어이다.
	- https://www.downloadkubernetes.com/ 참조
- `/usr/local/bin/` 으로 이동시켜 PATH에 등록한다.
- 이에 시스템 전역 실행 파일로 사용가능한 것이다. (인증서가 필요한데 이건 추후 진행한다고 가정하자)


**설정 조회**

```bash
cat /etc/systemd/system/kube-controller-manager.service
```

- `systemd`에 설치했기 때문에 위 경로에서 설정을 조회하고 수정할 수 있다.
- 해당 파일을 수정한 뒤 아래 명령어 수행해야 적용된다.
	- `sudo systemctl daemon-reload`
	- `sudo systemctl restart kube-controller-manager`

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)