---
image: /img/default/cloud/openstack.webp
title: "[OpenStack 아키텍처 실습2] Ceph 클러스터 구성"
description: Proxmox 가상화 환경에서 Cephadm을 이용해 분산 스토리지 시스템인 Ceph 클러스터를 구축하고, 고성능 데이터 복제를 위한 Public/Cluster 네트워크 분리 및 OSD 구성 과정을 다룹니다.
date: 2026-04-23
sidebar_class_name: hidden-sidebar-item
---

---
## 개요

앞선 글에서 OpenStack 환경을 구성했다. 이번에는 OpenStack에서 사용할 분산 스토리지인 Ceph를 구축한다.

Ceph는 여러 노드의 디스크를 하나의 스토리지처럼 사용할 수 있는 분산 스토리지 시스템이다.

Ceph의 장점은 다음과 같다:
- 노드 장애 시에도 데이터가 복제되어 <span class="t-red">데이터 안정성이 높고</span>
- 스토리지를 노드 단위로 확장할 수 있어 <span class="t-red">확장성이 뛰어나며</span>
- 중앙 스토리지 없이도 구성 가능해 <span class="t-red">유연한 구조를 만들 수 있다</span>

또한 OpenStack에서는 Cinder, Glance, Nova 등 다양한 컴포넌트의 스토리지 백엔드로 활용되며, 실무 환경에서도 두 시스템을 함께 구성하는 경우가 많다.

이번 글에서는 이러한 구조를 기반으로 Ceph 클러스터를 직접 구성해본다.

---
## VM 구성
### VM 생성

![[assets/ceph1.png]]

- OS 디스크 외에 Ceph용 디스크를 별도로 추가한다.
- Ceph 디스크는 <span class="t-red">포맷하거나 파티션을 나누지 않고 그대로 둔다.</span>

구성 예시:
- `scsi0` (32GB)
    - partition1: BIOS grub
    - partition2: `/boot` (2GB)
    - partition3: `/` (나머지)
- `scsi1` (80GB)
    - Ceph용 디스크 (파티션 없음)


### 네트워크 설정

![[assets/ceph2.png]]

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

```yaml
network:
  version: 2
  ethernets:
    ens18:
      dhcp4: true
    ens19:
      addresses:
        - 192.168.20.3/24 # 1과 2는 OpenStack 노드에서 점유중이므로
    ens20:
      addresses:
        - 192.168.30.1/24
```

- `ens19`: Ceph Public 네트워크 (`192.168.20.0/24`)
- `ens20`: Ceph Cluster 네트워크 (`192.168.30.0/24`)

Ceph Public 네트워크는 OpenStack의 스토리지 네트워크와 동일하게 구성했고, Cluster 네트워크는 노드 간 내부 복제 트래픽을 분리하기 위해 별도로 구성했다.

```bash
sudo netplan apply
```

- 적용

---
## 공통 설정
### 기본 설정

```bash
sudo apt update
```

- 패키지 업데이트

```bash
# 호스트명 설정
sudo hostnamectl set-hostname ceph1   # node2, node3도 각각
```

- 호스트 명 설정
- 당연한 얘기지만, 노드마다 다르게 설정해야한다.

### hosts 설정

```bash
# /etc/hosts에 3대 모두 등록 (모든 노드에서 동일하게)
sudo nano /etc/hosts
```

```
192.168.20.3  ceph1
192.168.20.4  ceph2
```

- Ceph Public 네트워크 기준으로 등록한다.

### 시간 동기화 및 런타임

```bash
# 시간 동기화
sudo apt install -y chrony        # Ubuntu
sudo systemctl enable --now chrony

# 컨테이너 런타임 (Ubuntu 기준, Podman 권장)
sudo apt install -y podman
```

- Ceph는 컨테이너 기반으로 동작하므로 Podman을 사용한다.
- OpenStack과 마찬가지로 노드 간 시간이 맞지 않으면 통신에서 문제가 발생할 수 있기 때문에 시간 동기화는 필수적으로 설정해야 한다.

---
## Ceph 클러스터 구성
### Bootstrap (첫 노드)

```bash
sudo apt install -y cephadm

sudo cephadm bootstrap --mon-ip 192.168.20.3
```

- 클러스터 초기화 및 첫 MON 노드 생성
- 초기 admin 비밀번호가 출력되므로 반드시 기록한다

### CLI 설치 및 상태 확인

```bash
# ceph CLI 도구 설치
sudo cephadm install ceph-common
```

```bash
# 상태확인 cli
sudo ceph status
```

- 초기 상태는 `HEALTH_WARN`이며, 단일 노드 상태다

### 노드 추가

> [!tip] OS를 설치할 때 root 계정을 사용하지 않고 Ubuntu 기본 계정으로 설치한 경우
> - `sudo passwd root`
> - `sudo sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config` 
> - `sudo systemctl restart ssh`
> - 이후 아래의 `ssh-copy-id` 진행

```bash
# cephadm이 생성한 SSH 공개키를 node2에 복사
ssh-copy-id -f -i /etc/ceph/ceph.pub root@ceph2
```

```bash
# 호스트 추가
sudo ceph orch host add ceph2 192.168.20.4
```

```bash
# 확인
sudo ceph orch host ls
```

- 노드가 정상적으로 추가되었는지 확인한다

### Ceph 네트워크 설정

```bash
sudo ceph config set global public_network 192.168.20.0/24 
sudo ceph config set global cluster_network 192.168.30.0/24 
```

- Ceph 네트워크를 명시적으로 설정한다.
- Ceph Public은 `192.168.20.0/24` 대역
- Ceph Cluster는 `192.168.30.0/24` 대역

```bash
# 적용 확인 
sudo ceph config dump | grep network
```

---
## OSD 구성
### OSD 개념

OSD(Object Stroage Daemon)은 이름만 보면 오브젝트 스토리지인가? 싶지만 아니다.
 
OSD는 Ceph의 저수준 저장 단위로써 디스크 하나당 OSD 하나가 붙어서, <span class="t-red">Ceph 내부적으로 데이터를 'RADOS object'라는 단위로 쪼개서 저장</span>한다.

그리고 그 위에서 접근 방식을 정한다.
- 블록 스토리지(RBD - RADOS Block Device)
- 파일 스토리지(CephFS)
- 오브 젝트스토리지(RADOS Gateway)를

그러니까 아래 작업은 접근 방식과 관계없이 기본적으로 해주어야하는 작업이다.

### 디스크 확인 및 적용

```bash
# 사용 가능한 빈 디스크 확인
sudo ceph orch device ls
```

```bash
# 방법 A: 모든 빈 디스크 자동으로 OSD화
sudo ceph orch apply osd --all-available-devices

# 방법 B: 하나씩 지정
sudo ceph orch daemon add osd ceph1:/dev/vdb
sudo ceph orch daemon add osd ceph2:/dev/vdb
```

### 상태 확인

```bash
sudo ceph status
```

- OSD 추가 후 상태가 `HEALTH_OK`로 변경된다 (노드 수가 3개 미만이면 WARN이 유지될 수 있음)

![[assets/ceph3.png]]

```bash
sudo ceph orch ps
```

- `osd` 데몬이 정상 실행되는지 확인한다 (`ods`라는 이름 붙은 것이 있는지)

---
## 테스트


``` bash
sudo ceph osd pool create test-pool 32

echo "hello ceph" | sudo rados -p test-pool put test-obj -

sudo rados -p test-pool get test-obj -
```

- Ceph 내부 RADOS 계층에 직접 데이터를 저장/조회하는 테스트
- `hello ceph`가 출력되면 정상이다

---
## 대시보드

![[assets/ceph4.png]]

- `https://<첫 노드 IP>:8443` 접속
- 계정:
	- ID: admin
	- PW: bootstrap 시 출력된 비밀번호

![[assets/ceph5.png]]

- 생성한 pool 및 클러스터 상태를 확인할 수 있다

---
## 레퍼런스

- https://www.youtube.com/watch?v=NBeHi6VhTwA&t=3s
- https://docs.ceph.com/en/reef/cephadm/