---
title: "[OpenStack 아키텍처 실습1] 전체 설계 및 OpenStack 설치(Kolla-Ansible)"
description: 설명
date: 2026-04-22
sidebar_class_name: hidden-sidebar-item
---

---
## 왜?

> 가용 가능한 환경에서 최대한 데이터센터와 비슷한 구조를 만들어보자.

OpenStack을 공부하기 위해서 환경을 구성해보고 싶었다. MicroStack과 같은 간단한 대안도 있긴하지만, 구조가 많이 단순화 되어있어 실제 환경과 다른 점이 많을 것이라고 생각했다.

가상 이상적인 환경은 여러 Bare Metal 서버와 네트워크 장비로 구성하는 것이지만, 개인 환경에서는 한계가 있었다. 이러한 제약 속에서 실제 데이터센터와 유사한 구조를 최대한 재현하기 위해 Proxmox 기반 가상화 환경을 활용하였다. 

Proxmox 기반에서 단순히 VM을 여러 개 띄우는 것을 넘어, VLAN 및 브리지 네트워크를 활용하여 외부망, 관리망, 스토리지망 등을 분리하였다. 실제 데이터센터에서도 용도에 따른 엄격한 망분리를 하여 인프라를 관리한다. 이를 최대한 유사하게 재현했다.

결과적으로 단순한 설치 실습을 넘어 다음과 같은 목적을 달성하고자 하였다.
- 프라이빗 클라우드 인프라의 구성요소(OpenStack, Ceph)의 역할 이해
- 노드 간 통신 구조 및 네트워크 분리 방식에 대한 실질적인 경험
- 실제 운영 환경과 유사한 아키텍처에 대한 설계 및 구축 경험 확보

---
## 설계
### 가용 자원

![[assets/kolla1.png]]

현재 가용자원은 위처럼 서버 2대이고, Proxmox 클러스터로 묶여있다.

실제 데이터센터에서는 네트워크 목적에 따라 NIC를 분리하여 트래픽을 격리하지만, 본 실습 환경에서는 각 노드에 물리 NIC가 2개만 구성되어 있어, 관리망, 내부 통신망, 스토리지망 등 여러 네트워크를 물리적으로 완전히 분리하기에는 한계가 있었다.

이를 해결하기 위해 하나의 물리 인터페이스에서 여러 네트워크를 동시에 격리해서 처리할 수 있는 802.1Q 기반 VLAN 태깅을 적용하기로 계획을 세웠다. (이에 이를 지원하는 네트워크 스위치 장비를 하나 샀다)

결국 VLAN을 활용함으로써 단일 물리 네트워크 위에서도 관리망, 내부 통신망, 스토리지망을 논리적으로 분리할 수 있었으며, 실제 구조를 최대한 유사하게 따라할 수 있었다.

이를 위해 802.1Q VLAN을 지원하는 스위치를 구성하고, Proxmox 가상 브리지에 VLAN aware 설정을 적용하여 각 VM이 서로 다른 네트워크에 속하도록 설계하였다.

### 네트워크 설계

![[assets/kolla2.png]]

자원 제약 환경에서 트래픽 특성과 성능 요구사항을 고려하여, 네트워크를 두 개의 물리 경로로 분리하여 구성하였다.

1. 공용 외부 경로 (nic1, 스위치 경유) - External / Management / Ceph Public 망
	- OpenStack External, OpenStack Management, Ceph public 망으로 구성
	- 외부 통신 및 제어성 트래픽 위주로, 상대적으로 대역폭 요구가 낮음
2. 고속 전용 경로 (nic2 끼리 직결) - Storage / Ceph Cluster 망
	- Stroage 망과 Ceph Cluster 망으로 구성
	- OSD replication 및 VM block I/O와 같이 고대역폭, 저지연이 요구되는 트래픽이 주로 발생
	- 외부 트래픽과 분리하여 성능 저하를 방지하는 것이 목적
	- 스위치에 연결하여 태그로 분리하지 않고 직결한 가장 큰 이유는 스위치 장비가 저렴한 장비라 대역폭이 1G밖에 안되서 고대역폭, 저지연이 요구되는 트래픽에 적절하지 않다고 생각했기 때문 (물리 노드가 추가될 경우 고대역폭 스위치를 추가하는게 이상적)

각 경로는 VLAN을 통해 추가적으로 논리 분리하여 트래픽 간섭을 최소화하였다. 
이를 통해 제한된 물리 자원 환경에서도 성능 요구사항과 네트워크 격리를 동시에 만족하도록 설계하였다.

| VLAN ID | 대역 (Subnet)     | 설명                                            |
| ------- | --------------- | --------------------------------------------- |
| 1       | 192.168.0.0/24  | 기본 LAN - 공유기(192,168.0.1)을 게이트웨이로하여 인터넷 통신 가능 |
| 10      | 192.168.10.0/24 | OpenStack 관리망                                 |
| 20      | 192.168.20.0/24 | (필요 시 정의)                                     |
| 30      | 192.168.30.0/24 | (필요 시 정의)                                     |

- IP 대역 설정의 기준은 특별한 기준이 있다기 보다는 구별하기 쉽게 VLAN 태그와 맞췄다.

---
## 스위치 VLAN 설정

![[assets/kolla3.png]]

현재 스위치의 Port 2, 3에 각각 서버 A, B가 연결되어 있다. 두 서버 사이에 VLAN 1과 VLAN10의 2가지트래픽이 흘러야 하므로 위와 같이 설정한다.

**VLAN 1 (기본 LAN)**
- 모든 포트는 untagged 멤버로 유지한다.
- 즉, 별도의 태그가 없는 모든 트래픽은 자동으로 VLAN 1로 처리된다.
- 주요 용도:
    - 공유기에서 들어오는 외부 트래픽
    - OpenStack external / floating IP
    - Proxmox 호스트 관리 네트워크 (SSH 등)

**VLAN 10 (OpenStack management)**
- Member Ports: 2, 3
- Tagged Ports: 2, 3
	- 서버 A와 서버 B 사이에 VLAN 태그10을 붙인 상태로 그대로 전달되어야하기 때문이다.
- Untagged Ports: 없음

**동작 흐름**
- 공유기에서 Port 1로 들어오는 untagged 프레임 → untagged니까 당연히 VLAN 1로 분류
- 서버에서 Port 2, 3으로 untagged 프레임이 들어오면 → untagged니까 당연히 VLAN 1로 분류
- 서버에서 tagged 10 프레임이 들어오면 → 2번 3번 포트가 VLAN10의 멤버이자 tagged port 이므로 VLAN 10을 붙인채로 통신

> nic2 끼리 직결된 네트워크는 직결이기 때문에 위와같은 설정이 필요없다.

---
## Proxmox 네트워크 기본 개념
### 물리 NIC (Network Interface Card)

![[assets/kolla4.png]]

![[assets/kolla5.png]]

- 물리 NIC는 말 그대로 물리 서버에 실제로 꽂혀있는 랜카드다.
- 현재 서버 A의 물리 NIC는 `enp1s0`, `enp3s0` 이렇게 2개이고, 서버 B의 물리 NIC는 `eno1`, `enp4s0`이다.
- 즉, 이 인터페이스들은 실제 스위치나 공유가와 연결되는 '물리 포트'다.

### 가상 브릿지 (Linux Bridge)

![[assets/kolla6.png]]

- Proxmox 에서는 VM이 물리 NIC에 직접 붙지 않는다. 대신 가상 브릿지를 통해 네트워크에 연결된다.
- 가상 브릿지는 쉽게 말해서 "가상 스위치"라고 보면 된다.
- 쉽게 말해 VM에 네트워크를 연결하기 위해서는 '물리 NIC - 가상 브릿지 - VM' 이렇게 연결되어야한다.
- 위 사진을 보면 가상 브리지 `vmbr0`가 물리 NIC `enp1s0`에 연결된 것을 볼 수 있다. (1:1 관계)

> [!tip] 왜 가상 브릿지를 쓰는가?
> - 브릿지를 쓰는 이유는 여러 VM이 하나의 NIC를 공유해야하기 때문이다.
> - 물리 NIC는 1 ~ 2개 뿐인데, VM은 여러개 돌려야한다. 이때, 브릿지가 중간에서 분배역할을 해주는 것이다.

---
## 호스트 네트워크 설정 (모든 호스트 공통)
### 가상 브릿지(기본 외부 네트워크)

![[assets/kolla7.png]]

- Proxmox 노드는 설치 시, 첫 번째 물리 NIC를 기반으로 가상 브릿지 `vmbr0`가 기본적으로 생성된다.
- 현재 구성에서는 각 서버의 첫 번째 NIC가 스위치에 연결되어 있고, 스위치가 공유기에 연결되어 있으므로 `vmbr0`를 통해 외부 네트워크 및 인터넷과 통신할 수 있다.
- `vmbr0` 설정을 확인해보면:
	- IP: `192.168.0.4/24`
	- Gateway: `192.168.0.1` (공유기)
- 즉, 해당 IP는 공유기의 DHCP 서버로부터 할당받은 값이며, `vmbr0`는 외부 네트워크와 연결되는 기본 인터페이스 역할을 한다.
- 기본적으로는 VLAN aware 옵션이 비활성화되어 있는데, 우리는 하나의 브릿지에서 VLAN 1(untagged)과 VLAN 10(tagged) 트래픽을 동시에 처리해야 한다.
- 따라서 `VLAN aware` 옵션을 활성화한다. 이를 통해 하나의 브릿지에서 여러 VLAN 태그 트래픽을 동시에 처리할 수 있다.


### 가상 브릿지(노드 간 내부 네트워크)

![[assets/kolla8.png]]

- 두 번째 물리 NIC를 기반으로 노드 간 통신을 위한 가상 브릿지 `vmbr1`를 추가로 구성한다.
- 이 브릿지는 서버 간 내부 통신 전용 네트워크이므로 외부와 연결되지 않으며 단순히 NIC ↔ NIC 간 통신만 수행한다.
- 브릿지에 IP를 할당할 필요가 없고 게이트웨이도 설정하지 않는다.
- 추가적으로, 이후 VLAN 구성을 위해 VLAN aware 옵션을 활성화한다.

> 위 과정을 모든 Proxmox 노드에 동일하게 적용한다. (단, 물리 NIC 이름은 서버마다 다를 수 있다)

---
## VM 네트워크 설정(모든 VM 공통)
### VM 네트워크 설정

이제 VM에 네트워크 인터페이스를 추가하여, 앞서 설계한 네트워크 구조를 VM 내부에서 사용할 수 있도록 구성한다.

![[assets/kolla9.png]]

- Proxmox의 Hardware 탭 → Network Device 추가를 통해 VM에 아래와 같이 네트워크 인터페이스를 구성한다.
	- `vmbr0`, VLAN tag 없음 (VLAN 1) → External 네트워크 (인터넷, Floating IP)
	- `vmbr0`, VLAN tag `10` → Management 네트워크 (OpenStack Control Plane)
	- `vmbr1`, VLAN tag `20` → Storage 네트워크 (Ceph Public)

### External 망

![[assets/kolla10.png]]

```bash
ip addr
```

VM에 접속한 뒤 위 명령어로 인터페이스 상태를 확인해보면 위 사진처럼 External 네트워크에 연결된 `ens18` 인터페이스는 DHCP 서버로부터 자동으로 IP를 할당받은 것을 볼 수 있다. (현재 DHCP서버인 공유기에서는 VLAN tag 가 붙은 프레임을 인식할 수 없기 때문에 VLAN1 즉, untagged 프레임으로 통신할 수 있는 `ens18`인터페이스에만 IP가 할당된 것이다)

그러나 External 망에는 IP를 할당하면 안된다.
- OpenStack 배포가 시작되면 `neutron` 서비스가 External 망으로 사용할 인터페이스(`ens18`) 위에 가상 스위치(OVS/OVN Bridge)를 생성한다.
- 이 과정에서 기존에 설정된 IP와 충돌이 발생할 수 있다.

그렇다면, 설치 과정에서 컨테이너 이미지라던가 패키지 설치같은 것을 하려면 인터넷이 연결되어야하는데 어떻게 해야할까? OpenStack을 Deploy하기 전에 인터넷이 필요한 작업들을 마무리해두면 된다.

인터넷이 필요한 작업들은 다음과 같다.
1. `apt update`
2. `Docker` 설치
3. `kolla-ansible` 설치
4. 컨테이너 이미지 pull

위 작업을 완료한 뒤 External 망의 인터페이스(`ens18`)의 IP를 제거하고 OpenStack을 Deploy 하면 된다.

### Management망 Storage망 IP 할당

Management망과 Storage망에 연결된 네트워크 인터페이스에 IP를 할당하기 위해 netplan 설정을 하자. 

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

- `/etc/netplan/` 경로 밑에 있는 yaml 파일을 수정해야한다.
- yaml 파일 이름은 환경마다 다를 수 있다.

```yaml
network:
  version: 2
  ethernets:
    ens18:
      dhcp4: true
    ens19:
      addresses:
        - 192.168.10.1/24
    ens20:
      addresses:
        - 192.168.20.1/24
```

- `ens18`: External 네트워크 (초기에는 DHCP 사용)
- `ens19`: Management 네트워크 (`192.168.10.0/24`)
- `ens20`: Storage 네트워크 (`192.168.20.0/24`)

Management와 Storage 네트워크는 구분을 쉽게 하기 위해 VLAN ID(10, 20)와 동일한 대역을 사용하였다.

```bash
sudo netplan apply
```

- `ip addr`를 통해 각 인터페이스에 IP가 정상적으로 할당되었는지 확인한다.
- 이후 각 노드 간 동일 대역으로 `ping` 테스트를 수행하면 통신이 정상적으로 이루어지는 것을 확인할 수 있다.

> 위 과정을 모든 노드에 동일하게 적용한다.

---
## OpenStack 설치 (모든 노드 VM)
### 호스트 명 설정

```bash
# Controller에서
sudo hostnamectl set-hostname openstack-cont

# Compute에서
sudo hostnamectl set-hostname openstack-comp
```

- 각 노드의 역할에 맞게 호스트명을 설정한다.
- 노드 간 구분을 위해 <span class="t-red">호스트명은 반드시 서로 다르게 설정</span>해야한다.

### /etc/hosts 설정

```bash
sudo nano /etc/hosts
```

```
...
192.168.10.1 openstack-cont
192.168.10.2 openstack-comp
...
```

- Management 네트워크 대역을 기준으로 각 노드의 IP와 호스트명을 `/etc/hosts`에 등록한다.
- 해당 설정은 모든 노드에 동일하게 적용한다.
- 이 설정을 통해 DNS 없이도 노드 간 통신이 가능해진다.

### 기본 패키지 설치 및 시간 동기화

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-dev libffi-dev gcc libssl-dev \
  python3-venv chrony rsyslog curl git

sudo systemctl enable --now chrony
sudo reboot
```

- OpenStack 설치에 필요한 기본 패키지를 설치한다.
- `chrony`를 통해 각 노드의 시간을 동기화한다.
- 노드 간 시간이 맞지 않으면 인증(토큰)이나 서비스 간 통신에서 문제가 발생할 수 있기 때문에 시간 동기화는 필수적으로 설정해야 한다.

---
## OpenStack 설치 (Controller VM만)
### SSH Key 설정

> [!tip] OS를 설치할 때 root 계정을 사용하지 않고 Ubuntu 기본 계정으로 설치한 경우
> - `sudo passwd root`
> - `sudo sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config` 
> - `sudo systemctl restart ssh`
> - 이후 아래의 `ssh-copy-id` 진행

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519

# Controller 자기 자신 + Compute에 키 복사
# (management IP인 ens19 주소로 접속)
ssh-copy-id root@192.168.10.1
ssh-copy-id root@192.168.10.2
```

- Controller 노드에서 Ansible을 통해 다른 노드에 접근하기 위해 SSH Key 기반 인증을 먼저 설정한다.
- Controller 자기 자신과 Compute 노드에 SSH 키를 복사한다.
- Ansible이 자기 자신도 localhost로 접속하기 때문에 자기 자신에게도 복사한다.

```bash
# 접속 확인
ssh root@192.168.10.1 hostname    # → openstack-cont 출력 나오면 정상
ssh root@192.168.10.2 hostname    # → openstack-comp 출력 나오면 정상
```

- 접속 테스트
- 비밀번호 입력 없이 접속되면 정상이다.
- 이후 모든 Ansible 작업은 이 SSH 연결을 기반으로 수행된다.

### Kolla-Ansible 설치

```bash
python3 -m venv ~/kolla-venv
source ~/kolla-venv/bin/activate
pip install -U pip
```

- 먼저 python 가상환경을 구성한다.

```bash
# ansible-core (2024.2 Dalmatian 기준)
pip install 'ansible-core>=2.16,<2.17.99'

# kolla-ansible
pip install git+https://opendev.org/openstack/kolla-ansible@stable/2024.2
```

- 먼저 Ansible과 Kolla-Ansible을 설치한다.
- `ansible-core`: 원격 노드에 명령을 실행하기 위한 자동화 도구
- `kolla-ansible`: OpenStack을 컨테이너 기반으로 배포하기 위한 도구

```bash
# Ansible collection
kolla-ansible install-deps

# Docker Python SDK
pip install docker
```

- 다음으로 Ansible에서 사용하는 의존성을 설치한다.
- OpenStack 배포에 필요한 Ansible Collection 및 추가 모듈을 설치한다.
- 마지막으로 Docker 제어를 위한 Python SDK를 설치한다.
	- Ansible이 Docker 컨테이너를 제어하기 위해 필요한 Python 라이브러리
	- 실제 Docker 엔진은 이후 `bootstrap-servers` 단계에서 자동으로 설치된다.

### 설정 파일 준비

```bash
sudo mkdir -p /etc/kolla
sudo chown $USER:$USER /etc/kolla

cp -r ~/kolla-venv/share/kolla-ansible/etc_examples/kolla/* /etc/kolla/
cp ~/kolla-venv/share/kolla-ansible/ansible/inventory/multinode ~/multinode
```

- 기본 설정 파일과 inventory 템플릿을 복사한다.

### Ansible 설정

```bash
cat > ~/ansible.cfg << 'EOF'
[defaults]
host_key_checking = False
pipelining = True
forks = 100
EOF
```

- SSH 연결 속도 및 병렬 처리 설정을 최적화한다.

### Inventory 설정

```bash
sudo nano ~/multinode
```

```yaml
[control]
openstack-cont ansible_host=192.168.10.1 ansible_user=root

[network]
openstack-cont ansible_host=192.168.10.1 ansible_user=root

[compute]
openstack-comp ansible_host=192.168.10.2 ansible_user=root

[monitoring]
openstack-cont ansible_host=192.168.10.1 ansible_user=root

[storage]
openstack-cont ansible_host=192.168.10.1 ansible_user=root

[deployment]
localhost       ansible_connection=local

# 아래 [XXX:children] 그룹들은 전부 그대로 유지
```

- 각 노드의 역할을 정의하는 파일이다.
- `storage` 그룹은 물리 스토리지 네트워크를 의미하는 것이 아니라, <span class="t-red">cinder-volume 컨테이너를 실행할 노드</span>를 지정하는 용도다.

### globals.yml 설정

```bash
sudo nano /etc/kolla/globals.yml
```

```yml
---
# =============================================
# 기본 설정
# =============================================
kolla_base_distro: "ubuntu"

# =============================================
# VIP 설정
# =============================================
kolla_internal_vip_address: "192.168.10.100" # 해당 대역에서 안쓰는 ip로 설정해야함
kolla_external_vip_address: "{{ kolla_internal_vip_address }}"

# =============================================
# 네트워크 인터페이스
# =============================================
network_interface: "ens19"              # Management (고정 IP가 있는 NIC)
neutron_external_interface: "ens18"     # External (deploy 전 IP 제거할 NIC)

# =============================================
# Neutron
# =============================================
enable_neutron_provider_networks: "yes"
neutron_plugin_agent: "ovn"

# =============================================
# 서비스 활성화
# =============================================
enable_haproxy: "yes"
enable_cinder: "no"
enable_horizon: "yes"
enable_heat: "no"

# =============================================
# Nova (가상화)
# =============================================
# nested virt 미지원 시 아래 주석 해제
# nova_compute_virt_type: "qemu"
```

- 위 설정들을 찾으면서 주석 해제 후 수정한다.
- Management / External 인터페이스를 명확히 지정하는 것이 중요하다.
- <span class="t-red">VIP는 해당 대역에서 사용되지 않는 IP로 설정</span>한다.
	- OpenStack VIP는 <span class="t-red">여러 컨트롤러 노드를 하나로 묶어 서비스의 중단이 없도록 해주는 가상의 대표 접속 IP</span>를 의미
	- -> 컨트롤러 노드 하나 죽어도 클러스터가 중단되지 않게 하기 위함
### 패스워드 생성

```bash
kolla-genpwd
```

```bash
grep keystone_admin_password /etc/kolla/passwords.yml
```

- Horizon 로그인에 사용할 관리자 비밀번호를 확인한다.

### 배포 전 준비 작업

```bash
source ~/kolla-venv/bin/activate

# 1) 양쪽 노드에 Docker, 의존성 설치
kolla-ansible bootstrap-servers -i ~/multinode

# 2) 컨테이너 이미지 사전 다운로드
kolla-ansible pull -i ~/multinode
```

- Bootstrap(Docker, 의존성 설치) 및 컨테이너 이미지를 Pull한다.
- Controller에서 실행하면 Compute 노드까지 자동으로 적용된다.

### 추가 패키지 설치 (중요)

```bash
pip install python-openstackclient \
  -c https://releases.openstack.org/constraints/upper/2024.2
```

- OpenStack CLI 사용을 위한 패키지이기 때문에 보통 OpenStack 배포 후 설치하는데, 현재 상황에서는 배포 전에 External 인터페이스(`ens18`)의 IP를 제거하면 인터넷 망을 끊기기 때문에 미리 설치한다.

---
## External 망 IP 제거 (양쪽노드)
### External 망 IP 제거

```bash
# 양쪽 노드 각각에서 실행
sudo ip addr flush dev ens18
sudo ip link set ens18 up

# 확인
ip addr show ens18
```

- `ens18` 인터페이스에서 IP를 제거한다.
- 인터페이스 상태는 `UP`으로 유지한다.
- `inet` 항목이 없어야 정상이다.

> [!warning] 주의사항
> - 반드시 Management 인터페이스(`ens19`)로 SSH 접속한 상태에서 수행해야 한다.
> - `ens18`로 접속한 상태에서 실행하면 연결이 끊어진다.

### Netplan 설정 변경

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

```yaml
network:
  version: 2
  ethernets:
    ens18:
      dhcp4: false
      dhcp6: false
    ...
```

- `ens18`이 다시 DHCP로 IP를 받아오지 않도록 설정한다.

```bash
sudo netplan apply
```

- 적용

---
## OpenStack 배포
### 사전 상태 확인

```bash
# ens18에 IP 없는지 최종 확인
ip addr show ens18
```

- `inet` 항목이 없어야 한다.

```bash
# VIP가 사용 중이 아닌지 확인
ping -c 2 192.168.1.100
# → Destination Host Unreachable여야 정상
```

- 응답이 없어야 정상이다. (VIP는 사용 중인 IP가 아니어야 함)

### 가상환경 및 권한 설정

```bash
# venv 가상 환경 activate
source ~/kolla-venv/bin/activate
```

- Kolla-Ansible이 설치된 Python 가상환경을 활성화한다.

```bash
sudo visudo -f /etc/sudoers.d/kolla-deploy
```

```bash
<내계정> ALL=(ALL) NOPASSWD: ALL
```

- Ansible 실행 시 비밀번호 입력 없이 sudo를 사용할 수 있도록 설정한다.

### 배포 실행

```bash
# prechecks
kolla-ansible prechecks -i ~/multinode

# deploy (20~40분 소요)
kolla-ansible deploy -i ~/multinode

# post-deploy (clouds.yaml 생성)
sudo mkdir -p /etc/openstack
sudo chown $USER:$USER /etc/openstack
kolla-ansible post-deploy -i ~/multinode
```

- `prechecks`: 설정 및 환경 검증
- `deploy`: OpenStack 전체 서비스 배포
- `post-deploy`: CLI 접속을 위한 설정 파일 생성

### OpenStack CLI 설정 및 확인

```bash
# clouds.yaml 설정
export OS_CLIENT_CONFIG_FILE=/etc/kolla/clouds.yaml
export OS_CLOUD=kolla-admin
```

```bash
# 서비스 확인
openstack service list
openstack compute service list
openstack network agent list
```

- 주요 서비스가 정상적으로 등록되고 실행 중인지 확인한다.

---
## ## 내 PC에서 Horizon 접속하기
### 개요

현재 Horizon은 Management 네트워크(`192.168.10.0/24`)에 존재한다.  
하지만 내 PC는 `192.168.0.0/24` 대역에 있기 때문에 직접 접근할 수 없다.

따라서 <span class="t-red">Proxmox 호스트를 중간 라우터로 사용하여 두 네트워크를 연결</span>해야 한다.

### Proxmox에 VLAN 인터페이스 생성

![[assets/kolla11.png]]

- `vmbr0` 브릿지에서 VLAN 10 트래픽을 처리하기 위해 Linux VLAN 인터페이스 `vmbr0.10`을 생성한다.
- 해당 인터페이스는 `192.168.10.0/24` 네트워크로의 진입 지점 역할을 한다.

### Proxmox에서 IP 포워딩 활성화

```bash
echo 1 > /proc/sys/net/ipv4/ip_forward
# 영구 적용
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
```

- Proxmox 호스트가 단순 서버가 아니라 라우터 역할을 할 수 있도록 설정한다. (IP 포워딩 활성화)

### 내 PC에 Static Route 추가

```bash
# Windows CMD (관리자 권한)
route add 192.168.10.0 mask 255.255.255.0 192.168.0.4

# MacOS
sudo route -n add -net 192.168.10.0/24 192.168.0.4
```

- `192.168.10.0/24` 대역으로 가는 트래픽을 Proxmox 호스트(`192.168.0.4`)로 보내도록 설정한다.

### Controller 노드에 게이트웨이 설정

```bash
sudo ip route add default via 192.168.10.254
```

- Controller 노드가 외부 네트워크로 나갈 때 Proxmox 호스트를 통해 나가도록 설정한다.
- 여기서 `192.168.10.254`는 Proxmox의 VLAN 인터페이스(`vmbr0.10`)에 할당된 IP이다.

### Horizon 접속

![[assets/kolla12.png]]

- 이러면 Horizon 접속이 가능하다.

---
## 이후..

다음 글에서 Ceph를 설치하고, 그 다음 글에서 OpenStack-Ceph 연동을 할 것이다.
