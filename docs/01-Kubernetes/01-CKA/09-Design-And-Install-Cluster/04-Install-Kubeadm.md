---
title: Kubeadm으로 쿠버네티스 설치
description: Ubuntu 환경에서 kubeadm을 이용한 쿠버네티스 클러스터 구축 가이드. containerd 설치, 마스터/워커 노드 설정, Calico 네트워크 플러그인 구성까지 단계별로 안내합니다.
keywords:
  - 쿠버네티스 클러스터 구축
  - kubeadm 설치
  - containerd 설정
---
---
## 사전 설정
### 포트 설정

:::info
**공식문서**
- https://kubernetes.io/docs/reference/networking/ports-and-protocols/
:::

- 마스터 노드
	- 6443: API 서버(kube-apiserver)가 연결을 수락하는 포트
	- 2379, 2380: etcd 서버 통신용 포트
	- 10259: kube-scheduler가 사용하는 포트
	- 10257: kube-controller-manager가 사용하는 포트

- 워커 노드
	- 10250: kubelet이 사용하는 포트
	- 30000-32767: NodePort 서비스에 사용되는 포트 범위
	- cf) calico vxlan 모드인 경우(vpn으로 피어링 되었거나 하는 상황) udp/4789도 인바운드 규칙에 추가

:::tip
위 포트를 클라우드 보안 그룹, os 방화벽(ex: ufw) 등 에서 허용해주어야 한다.
:::

### IPv4 포워딩

- 아래 과정은 IPv4를 포워딩하여 iptables가 연결된 트래픽을 볼 수 있게 하는 과정이다.
	- 이유는 다음 글 참조 -> [IP Forwarding](../../../15-Network/01-Switching-Routing-Gateway.md#linux를-router로-사용하기-ip-forwarding)

```bash
sudo -i
```

- 루트 권한 획득

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```
 
 - `tee` 명령어를 활용하면 출력을 두 곳으로 보낼 수 있는데, 한 곳은 `tee` 다음에 명시되어 있는 파일로 출력되고 다른 한 곳은 표준 출력 (stdout)입니다. 즉 `tee` 명령어를 활용하면 화면에 출력됨과 동시에 파일에 저장된다.
- `overlay`는 리눅스 커널의 네트워크 드라이버를 가리킨다. `overlay`는 서로 다른 호스트에 존재하는 파드 간의 네트워크 연결을 가능하게 하는 기술이다. 즉 `overlay`를 활용하면 여러 개의 독립적인 네트워크 레이어를 겹쳐서 하나로 연결된 네트워크를 생성합니다. 즉, `overlay`를 활용해서 서로 다른 호스트에 존재하는 파드가 동일한 네트워크에 존재하는 것 처럼 통신할 수 있게 한다. 따라서 `overlay`를 입력하면 시스템 부팅 시 `overlay` 네트워크 드라이버를 로드하도록 설정한다.
- `br_netfilter`는 네트워크 패킷 처리 관련 모듈로써 `iptables/netfilter` 규칙이 적용되게 한다 즉, 컨테이너와 호스트 간의 인터페이스 등에서 발생하는 트래픽에 대해 규칙을 적용해 트래픽을 관리한다는 의미이다.
- `EOF`는 문서의 마지막을 의미

```bash
sudo modprobe overlay
sudo modprobe br_netfilter
```

- `modeprobe` 는 리눅스 커널 모듈 관리 도구이다. 이를 이용하여 특정 모듈을 로드하거나 제거할 수 있다.

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
```

- 필요한 `sysctl` 매개변수를 설정하면, 재부팅 후에도 값이 유지된다.
- 브릿지 네트워크 인터페이스에 대한 ipv4 트래픽이 iptables 규칙에 의해 처리되도록 만든다.
- ipv6에 대해 iptables를 처리한다.
- 커널이 처리하는 패킷에 대히 외부로 ipv4 포워딩이 가능하게 만든다.
- `EOF`는 문서의 마지막을 의미

```bash
sudo sysctl --system
```

- 재부팅하지 않고 `sysctl` 매개변수 적용

### 컨테이너 런타임(containerd) 설치 및 설정

```bash
sudo apt update && sudo apt upgrade -y
```

- apt 패키지 목록을 업데이트 한다.

```bash
sudo apt install -y ca-certificates curl gnupg lsb-release
```

- 필요한 패키지를 설치한다.

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

- `Docker` 공식 GPG 키를 등록한다.
- `containerd`는 `Docker`에서 관리하는 리포지토리에서 배포되기 때문이다.

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

- `Docker` 리포지토리를 등록한다.

```bash
sudo apt update
sudo apt install -y containerd.io
```

- `containerd`를 설치한다.
- 여기까지가 `containerd` 설치

```bash
sudo mkdir -p /etc/containerd
```

- containerd를 쿠버네티스에서 컨테이너 런타임으로 사용할 수 있도록 설정을 해주어야 한다.
- 설정값을 저장할 디렉토리 생성

```bash
containerd config default | sudo tee /etc/containerd/config.toml > /dev/null
```

- `containerd config default` 를 통해 출력된 기본 설정값들을 `tee` 명령어를 통해 `config.toml` 파일로 저장합니다.

```bash
sudo vi /etc/containerd/config.toml
```

- 앞서 저장된 설정 파일의 내용 수정

```toml
... 중략
[plugins."io.containerd/grpc.v1.cri".containerd.runtimes.runc.options]
SystemdCgroup = true
```

- `SystemdCgroup` 값을 `true` 로 바꾸어 준다.

```bash
sudo systemctl restart containerd
sudo systemctl enable containerd
```

- `containerd` 재시작

```bash
sudo systemctl status containerd
```

- `containerd` 설정 변경 확인 (아래처럼 `CGroup`이 나오면 된다)

```bash
...
     CGroup: /system.slice/containerd.service
             └─389582 /usr/bin/containerd
...
```

### swap 메모리 비활성화

- 쿠버네티스에서 스왑메모리는 지원하지 않는다. 이에 비롯한 여러 문제가 발생할 수 있기 때문에 스왑메모리를 비활성화 한다.

```bash
free -h
```

- 스왑메모리 활성화 확인
- 스왑 부분에 0B로 되어있으면 비활성화 되어있는 것이므로 아래 과정 스킵

```bash
sudo -i
```

- 관리자 권한 획득

```bash
swapoff --all
```

- 스왑메모리 비활성화

```bash
vi /etc/fstab
```

- `/etc/fstab` 편집 -> `/swap.img` 앞에 `#` 붙여서 `#/swap.img` 이렇게 주석처리
- 재부팅 시에도 스왑메모리 비활성화 상태를 유지하기 위함

```bash
shutdown -r now
```

- 시스템 재부팅

---
## `kubeadm`으로 쿠버네티스 설치 (마스터, 워커 공통)

```bash
sudo apt-get update
```

- apt 패키지 목록을 업데이트 한다.

```bash
sudo apt-get install -y apt-transport-https ca-certificates curl
```

- 쿠버네티스 설치에 필요한 패키지를 설치한다.

```bash
sudo mkdir -p /etc/apt/keyrings
```

- signing 키 다운로드를 위해 필요한 디렉토리를 생성

```bash
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
```

- 쿠버네티스 apt 리포지토리를 추가

```bash
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
```

- 구글 클라우드의 공개 signing 키를 다운로드

```bash
sudo apt-get update
```

- apt 패키지 목록을 업데이트, 이제 쿠버네티스를 설치준비 완료

```bash
sudo apt-get install -y kubelet=1.31.6-1.1 kubeadm=1.31.6-1.1 kubectl=1.31.6-1.1
```

- `kubelet`, `kubeadm`, `kubectl` 을 설치한다.

```bash
sudo apt-mark hold kubelet kubeadm kubectl
```

- 자동업데이트 되지 않게 버전을 고정

```bash
sudo -i
```

```bash
kubelet --version
```

```bash
kubeadm version
```

```bash
kubectl version --output=yaml
```

- 설치한 `kubelet`, `kubeadm`, `kubectl` 이 올바르게 설치되었는지 확인한다.

---
## 마스터 노드 설정

### 인증서 등록

```bash
kubeadm certs check-expiration
```

- 쿠버네티스 인증서 상태 확인
- `!MISSING!...` 으로 인증이 안되어있는 것을 확인할 수 있다.

```bash
kubeadm config images list
```

- `kubeadm` 이 사용할 수 있는 이미지 리스트를 출력

```bash
sudo -i
```

```bash
kubeadm config images pull
```

- 쿠버네티스 설치에 필요한 config 이미지를 다운로드 

```bash
kubeadm init --apiserver-advertise-address=<내private아이피> --pod-network-cidr=192.168.0.0/16
```

- `kubeadm init`을 사용해 초기화한다. `--apiserver-advertise-address` 옵션을 통해 쿠버네티스 마스터 노드의 IP 주소를 입력한다. 그리고 `--pod-network-cidr` 을 통해 네트워크 대역을 설정한다. (`calico`의 경우 `192.168.0.0/16` / `flannel`의 경우 `10.244.0.0./16`를 주로 사용한다)
	- 나는 `calico`이지만, 해당 대역이 내 사설망 대역과 겹쳐서 `10.244.0.0/16` 대역을 사용했다. 이 경우 `calico` 설치 시 `custom-resources.yaml` 파일을 꼭 수정해주어야한다.
	- 주의) 서비스의 기본 대역은 `10.96.0.0/12`이다. `Pod` 대역이 이 대역과 겹치지 않게 설정해야한다. -> [관련 글](../08-Network/04-Service-Networking.md#proxy-mode)
- 마지막에 나오는 join 구문은 워커 노드와 마스터 노드를 연결하라 때 사용할 구문이니 따로 저장한다. (다시 보고싶다면, `kubeadm token create --print-join-command`)
- 이후 다시 `kubeadm certs check-expiration` 해보면 인증 되어있는 것을 볼 수 있다.

### 기타 설정

```bash
exit
```

- root 사용자에서 기본 사용자로 돌아옴

```bash
mkdir -p $HOME/.kube
```

```bash
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
```

```bash
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

- 설정 디렉토리 소유자와 그룹을 변경해 현재 사용자가 사용할 수 있도록 변경한다.
- 이렇게하면 기본 사용자도 쿠버네티스를 사용할 수 있다.

### CNI(calico) 설치 및 설정

:::tip
https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
위 공식 문서에서 온프레미스, EKS 등의 다양한 환경에서의 calico 설치 방법을 안내하고 있다.
:::

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.29.2/manifests/tigera-operator.yaml
```

-  calico 설치를 위해 해당 URL에 존재하는 yaml 파일을 실행한다.

```bash
curl https://raw.githubusercontent.com/projectcalico/calico/v3.29.2/manifests/custom-resources.yaml -O
```

- calico 설치를 위한 커스텀 리소스를 설치한다. -> yaml 파일이 다운로드 된다.
- 기본 pod CIDR 말고 다른 대역을 선택했을 경우 `custom-resources.yaml`을  해당 대역으로 수정해준다.

```bash
kubectl create -f custom-resources.yaml
```

- 해당 yaml 파일을 활용해 calico를 설치한다.

```bash
watch kubectl get pods -n calico-system
```

- 해당 명령어를 입력해 calico에 대한 파드들이 실행 중인지 확인한다. (약 2분 소요)

### 노드 상태

```bash
kubectl get node -o wide
```

- 위 명령어로 쿠버네티스 클러스터 노드를 확인한다.
- `STATUS`가 `Ready`가 된 것을 확인한다.

:::tip
cf) 마스터 노드에도 pod를 스케줄링하는 방법

- 일반적으로 마스터 노드의 안정성을 위해 마스터노드에 pod를 추가하지는 않는다. 
- 이 때문에 `kubeadm`이 설치시 자동으로 마스터 노드에 `taint`를 설정해둔다.
- 하지만, 테스트/학습 환경이라 마스터 노드에도 pod를 스케줄링해야할 경우 혹은 리소스가 부족할 경우 아래 과정을 따른다. (권장하지 않는다)

```bash
kubectl get node
```

- 먼저 노드 이름을 확인한다.

```bash
kubectl describe node 마스터노드명 | grep Taints
```

- 마스터 노드의 정보가 `node-rol.kubernetes.io/control-plane` 인 것을 알 수 있다.

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane:NoSchedule-
```

-  taint를 제거하는 명령어
:::

---
## 워커 노드 설정
### 클러스터 Join

- `sudo -i` 로 root 권한을 얻는다.
- 기록해둔 join 명령어를 입력한다.

```bash
kubeadm join 172.31.4.220:6443 --token bb4al8.a3nnsnjmac125a5b --discovery-token-ca-cert-hash sha256:2e473402a66be1dba4ebf0ee7bcaeb07145546ddeb20926d363f3f0d339137c0
```

---
## 시험 팁

:::info
시험에서 `kubeadm`을 사용해서 클러스터 구성하는 요구사항이 나왔을 경우?

1. docs에서 Container Runtimes 검색 -> 페이지 접속
	- 여기에 IPv4 포워딩 작업이 나와있다. (아마 컨테이너 런타임은 설치되어 있을거라 이 문서에서는 이것만 하면 될듯?)
	- (컨테이너 런타임이 설치되어있지 않다면)이 문서에서 안내된 대로 컨테이너 런타임 설치 (Cgroup 설정까지)
2. 이후 docs에서 kubeadm 검색 -> 페이지 접속
	- 아마 Installing kubeadm 설치 페이지일텐데 이에 따라 설정
3. 그리고 해당 페이지 다음 다음에 있는 Creating a cluster with kubeadm 문서로 접속
	- 여기서 나머지 과정 진행
:::

---
## 레퍼런스

- https://kubernetes.io/ko/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- https://kubernetes.io/ko/docs/reference/setup-tools/kubeadm/
