---
title: 쿠버네티스 마스터 노드 IP 변경 및 인증서 재발급 절차
description: IP 대역이 바뀌었을 때 쿠버네티스 클러스터를 복구하는 방법을 단계별로 정리했습니다. 마스터 노드의 설정 변경, 인증서 재발급, kubelet 및 containerd 재시작, 워커 노드 재연결까지 완벽하게 안내합니다.
keywords:
  - 쿠버네티스 IP 변경
  - kubeadm 인증서 재발급
  - 워커 노드 재연결
---
## 왜?

기존에는 내부 장비들이 KT공유기 대역(172.30.1.x)을 사용하고 있었는데, 공유기를 바꾸면서 대역이 바뀌어 내부의 모든 장비들의 IP를 재설정(192.168.0.x)하였다. 이 과정에서 쿠버네티스 클러스터의 마스터 노드의 IP 설정을 바꾸고 인증서를 재발급 해주어야했다. 

---
## 마스터노드

### 설정 변경

```bash
# 혹시나 생길 문제를 대비해 /etc/kubernetes 백업해두자
cd /etc/kubernetes
sudo find . -type f -exec sed -i 's/기존마스터노드IP/새로운마스터노드IP/g' {} +
```

- `/etc/kubernetes` 내부에 있는 기존 마스터 노드의 IP로 설정되어있던 값들을 모두 새로운 마스터 노드의 IP로 바꾸어준다.

### 인증서 재발급

```bash
cd /etc/kubernetes/pki
sudo rm apiserver.{crt,key}
sudo kubeadm init phase certs apiserver
sudo rm etcd/peer.{crt,key}
sudo kubeadm init phase certs etcd-peer
sudo rm etcd/server.{crt,key}
sudo kubeadm init phase certs etcd-server
```

- 기존 인증서를 삭제하고 재발급한다.
- Service CIDR과 Service dns를 따로 설정했었다면, `sudo kubeadm init phase certs apiserver` 에 `--service-cidr '서비스CIDR' --service-dns-domain=서비스DNS도메인` 추가

### kubelet, containerd 재시작

```bash
sudo systemctl restart kubelet
sudo systemctl restart containerd
```

### 인증 정보 갱신

```bash
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
export KUBECONFIG=$HOME/.kube/config
```

- 컨트롤 플레인으로 접근할 때 인증해야하는 인증 정보가 바뀌었으므로 이를 갱신해준다.

---
## 워커노드
### kubelet, containerd 재시작

```bash
sudo systemctl restart kubelet
sudo systemctl restart containerd
```

- 만약 워커 노드가 `NotReady` 상태일 경우 마스터 노드에서 `kubeadm token create --print-join-command` 해서 출력된 명령어로 새로 join을 해보자.

