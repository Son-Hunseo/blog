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

---
## ETCD란?

- 분산형 신뢰성 있는 키-값 저장소
- 단순하고, 보안성이 있으며, 빠른 성능 제공
- <span style={{color: 'red'}}>Kubernetes 클러스터의 모든 상태와 리소스를 저장</span>
- 예: Nodes, Pods, Configs, Secrets, Accounts, Roles, Bindings 등    
- kubectl get 명령어로 조회하는 정보는 모두 etcd 서버에서 가져옴

---
## ETCD 설치 및 시작 (별도 설치, not kubeadm)

```bash
curl -LO https://github.com/etcd-io/etcd/releases/download/v3.5.6/etcd-v3.5.6-linux-amd64.tar.gz

# 압축 해제
tar xzvf etcd-v3.5.6-linux-amd64.tar.gz

sudo mv etcd-v3.5.6-linux-amd64/etcd /usr/local/bin/
sudo mv etcd-v3.5.6-linux-amd64/etcdctl /usr/local/bin/
sudo chmod +x /usr/local/bin/etcd /usr/local/bin/etcdctl
```

- GitHub Releases에서 OS에 맞는 바이너리 다운로드
	- https://www.downloadkubernetes.com/ 참조
- `/usr/local/bin/` 으로 이동시켜 PATH에 등록한다.
- 이에 시스템 전역 실행 파일로 사용가능한 것이다.
- 기본 포트: 2379

---
## etcdctl

- `etcd` 기본 제공 클라이언트
	- 별도로 설치할 경우 `etcdctl`이 기본적으로 설치되지만, `kubeadm`을 통해 쿠버네티스 클러스터를 구성하여 자동으로 함께 설치되었을 경우 `etcdctl`을 별도로 설치해야한다.
	- 별도 설치 명령어: `sudo apt install etcd-client`
- 주요 명령어
    - 데이터 저장: `etcdctl put key1 value1`
    - 데이터 조회: `etcdctl get key1`
    - 명령어 목록 확인: `etcdctl`

```bash
    kubectl exec etcd-master -n kube-system -- sh -c \
    "ETCDCTL_API=3 etcdctl --cert=/etc/kubernetes/pki/etcd/server.crt \
    --key=/etc/kubernetes/pki/etcd/server.key \
    --cacert=/etc/kubernetes/pki/etcd/ca.crt get / --prefix --keys-only"
    ```

- Kubernetes 데이터 확인 명령어이다.
- 위 명령어 결과를 보면 Kubernetes의 데이터는 `etcd` 내부 `/registry` 경로에 저장됨을 알 수 있다.
	- ex: `/registry/roles/kube-system/kube-proxy`

---
## Kubernetes 환경에서의 ETCD 배포

### Kubeadm Setup

**설치**

- `kubeadm`으로 클러스터 설치 시 `etcd`는 자동으로 설치된다. (`Pod` 형태로)


**설정 조회**

```bash
sudo nano /etc/kubernetes/manifests/etcd.yaml
```

- 위 경로에 yaml 형태로 설정이 저장되어있다.
- 설정 변경도 위 yaml 파일을 변경하면 자동으로 된다.
	- Static Pod 이기 때문인데, 이는 나중에 자세히 다루도록 한다.

### Manual Setup (Kubernetes The Hard Way)

**설치**

- 위에 작성된 별도 설치과정을 진행한다.
- 여기까지 진행하면, `etcd` 쿠버네티스 클러스터의 컴포넌트로 사용하는 것이 아니라 순수한 key-value 저장소이다.

```bash
nano /etc/systemd/system/etcd.service
```

```ini
[Unit]
Description=etcd
Documentation=https://etcd.io/docs/
After=network.target

[Service]
User=etcd
Type=notify
ExecStart=/usr/local/bin/etcd \
  --name controller-1 \
  --data-dir=/var/lib/etcd \
  --initial-advertise-peer-urls=https://<CONTROLLER_1_IP>:2380 \
  --listen-peer-urls=https://<CONTROLLER_1_IP>:2380 \
  --listen-client-urls=https://<CONTROLLER_1_IP>:2379,https://127.0.0.1:2379 \
  --advertise-client-urls=https://<CONTROLLER_1_IP>:2379 \
  --initial-cluster controller-1=https://<IP1>:2380,controller-2=https://<IP2>:2380,controller-3=https://<IP3>:2380 \
  --initial-cluster-state=new \
  --initial-cluster-token=etcd-cluster-0 \
  --cert-file=/etc/etcd/etcd-server.crt \
  --key-file=/etc/etcd/etcd-server.key \
  --trusted-ca-file=/etc/etcd/ca.crt \
  --client-cert-auth \
  --peer-cert-file=/etc/etcd/etcd-server.crt \
  --peer-key-file=/etc/etcd/etcd-server.key \
  --peer-trusted-ca-file=/etc/etcd/ca.crt \
  --peer-client-cert-auth
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target

```

```bash
sudo systemctl daemon-reload
sudo systemctl start etcd
sudo systemctl enable etcd
```

- 위 과정을 추가로 진행하면 `etcd`가 쿠버네티스 컴포넌트로 사용될 준비가 된 것이다. (인증서가 필요한데 이건 추후 진행한다고 가정하자)


**설정 조회**

```bash
cat /etc/systemd/system/etcd.service
```

- `systemd`에 설치했기 때문에 위 경로에서 설정을 조회하고 수정할 수 있다.
- 해당 파일을 수정한 뒤 아래 명령어 수행해야 적용된다.
	- `sudo systemctl daemon-reload`
	- `sudo systemctl restart etcd`

---
## ETCD in HA Environment

- 고가용성 환경에서는 여러 Master 노드마다 `etcd` 인스턴스를 분산 배치
- `etcd` 인스턴스 간 통신 설정 필요
- Manual Setup - `systemd`의 `etcd.service` 설정에서 `--initial-cluster` 옵션으로 인스턴스 지정
- kubeadm - `/etc/kubernetes/manifest/` 에 있는 `etcd` yaml  파일에서 `--initial-cluster`  옵션으로 인스턴스 지정
- 데이터 정합성을 위해 quorum 기반 합의 필요

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://etcd.io/docs/](https://etcd.io/docs/)
- [https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/)
- [https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#stacked-control-plane-and-etcd-nodes](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#stacked-control-plane-and-etcd-nodes)
- [https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#external-etcd-nodes](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/#external-etcd-nodes)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)