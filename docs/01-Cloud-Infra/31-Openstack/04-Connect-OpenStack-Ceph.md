---
image: /img/default/cloud/openstack.webp
title: "[OpenStack 아키텍처 실습3] OpenStack-Ceph 연동"
description: OpenStack과 Ceph 클러스터를 연동하여 Cinder(볼륨), Glance(이미지), Nova(인스턴스)의 스토리지 백엔드를 Ceph RBD로 전환하고, 실제 인스턴스 생성을 통해 동작을 검증하는 최종 연동 가이드입니다.
date: 2026-04-24
sidebar_class_name: hidden-sidebar-item
---

---
## 개요

앞서 구축한 Ceph 클러스터를 OpenStack과 연동하여 블록 스토리 (Cinder), 이미지 저장소(Glance), 인스턴스 디스크(Nova)에서 Ceph를 백엔드로 사용할 수 있도록 구성한다.

---
## Ceph 설정
### Pool 생성

```bash
# Ceph 노드(ceph1)에서 실행

# Glance 이미지 저장용
sudo ceph osd pool create images 32
sudo rbd pool init images

# Cinder 볼륨용
sudo ceph osd pool create volumes 32
sudo rbd pool init volumes

# Cinder 백업용 (enable_cinder_backup 안 쓰면 생략 가능)
sudo ceph osd pool create backups 32
sudo rbd pool init backups

# Nova ephemeral disk용 (root disk를 ceph에 둘 때)
sudo ceph osd pool create vms 32
sudo rbd pool init vms
```

- Pool은 Ceph에서 데이터를 저장하는 논리적 공간이다. (OpenStack에서는 서비스별로 Pool을 나눠 사용한다)
- OpenStack 각 서비스에서 사용할 스토리지 풀을 생성한다.

> [!tip] Nova Emphemeral Disk는 뭐지?
> OpenStack에서 VM의 루트 디스크를 생성하는 법은 2가지이다.
> 1. Nova에서 직접 VM 전용 루트 디스크 생성 (Emphemeral Disk) (인스턴스 생성 시 '새 볼륨 생성'을 끄면 됨)
> 2. Cinder에서 볼륨을 만들고 해당 볼륨을 VM의 루트 디스크로 연결
> 
> - 이론적으로는 보통 Stateless한 것들(Stateless한 웹서버, k8s 워커노드, Test용 VM) 등을 Emphemeral Disk로 만드는 것이 좋다고 알려져있다.
> - 하지만, 보통 현업에서는 대부분 그냥 Cinder에서 볼륨 만들고 루트 디스크로 연결하는 방법만 사용하는 곳이 많다. (실제 성능 테스트 해보면 비슷해서)

### Replica 설정

```bash
# OSD 2개라서 replica 수 조정 (안 하면 PG가 undersized 상태로 멈춤)
for pool in images volumes backups vms; do
  sudo ceph osd pool set $pool size 2
  sudo ceph osd pool set $pool min_size 1
done
```

- OSD 수가 적은 환경에서는 replica 수를 조정하지 않으면 PG가 `undersized` 상태로 유지된다.
- 현재 노드가 2개라서 위 설정을 해서 replica 수를 조정한다.
- 노드가 3개 이상이라면 위 작업을 안해도 된다.

### Client 생성

```bash
# Glance용 client
sudo ceph auth get-or-create client.glance \
  mon 'profile rbd' \
  osd 'profile rbd pool=images' \
  mgr 'profile rbd pool=images'

# Cinder + Nova 공용 client
# (Nova가 Cinder 볼륨을 attach 하려면 volumes pool 권한이 같이 필요해서 합쳐서 줌)
sudo ceph auth get-or-create client.cinder \
  mon 'profile rbd' \
  osd 'profile rbd pool=volumes, profile rbd pool=vms, profile rbd pool=images, profile rbd-read-only pool=images' \
  mgr 'profile rbd pool=volumes, profile rbd pool=vms'

# Cinder backup용 (선택)
sudo ceph auth get-or-create client.cinder-backup \
  mon 'profile rbd' \
  osd 'profile rbd pool=backups' \
  mgr 'profile rbd pool=backups'
```

- Client는 Ceph에 접근하기 위한 계정이다.
- OpenStack의 각 서비스(Glance, Cinder 등)는 이 Client를 통해 Ceph에 접근한다.
- OpenStack 서비스별 접근 권한을 가진 Ceph client를 생성한다.

### Keyring

```bash
sudo ceph auth get client.glance
sudo ceph auth get client.cinder
sudo ceph auth get client.cinder-backup
```

- Keyring은 Client의 인증 정보(키)가 담긴 파일이다.
- OpenStack 서비스가 Ceph에 접근할 때 이 keyring을 사용해 인증한다.
- 생성된 keyring을 확인한다.

---
## OpenStack Controller 설정
### Ceph 설정 파일 복사

```bash
# Controller 노드(openstack-cont)에서 실행
sudo mkdir -p /etc/kolla/config/glance
sudo mkdir -p /etc/kolla/config/cinder/cinder-volume
sudo mkdir -p /etc/kolla/config/cinder/cinder-backup
sudo mkdir -p /etc/kolla/config/nova
```

- 디렉토리 생성

```bash
# Controller에서 Ceph1으로부터 가져오기
scp root@192.168.20.3:/etc/ceph/ceph.conf /tmp/ceph.conf

# 내용 확인 - mon_host에 192.168.20.x가 있어야 함
cat /tmp/ceph.conf
```

- `ceph.conf`와 `keyring`을 Controller 노드로 전달한다.
	- `ceph.conf` → Ceph 클러스터 위치 정보 (MON 주소 등)
	- `keyring` → 인증 정보

### 서비스별 keyring 배치

```bash
# Controller에서

# === Glance ===
sudo cp /tmp/ceph.conf /etc/kolla/config/glance/ceph.conf

ssh root@192.168.20.3 "ceph auth get client.glance" | \
  sudo tee /etc/kolla/config/glance/ceph.client.glance.keyring

# === Cinder volume ===
sudo cp /tmp/ceph.conf /etc/kolla/config/cinder/ceph.conf

ssh root@192.168.20.3 "ceph auth get client.cinder" | \
  sudo tee /etc/kolla/config/cinder/cinder-volume/ceph.client.cinder.keyring

# === Cinder backup ===
ssh root@192.168.20.3 "ceph auth get client.cinder" | \
  sudo tee /etc/kolla/config/cinder/cinder-backup/ceph.client.cinder.keyring

ssh root@192.168.20.3 "ceph auth get client.cinder-backup" | \
  sudo tee /etc/kolla/config/cinder/cinder-backup/ceph.client.cinder-backup.keyring

# === Nova (cinder 키만 있으면 됨, nova 자체 키는 안 만듦) ===
sudo cp /tmp/ceph.conf /etc/kolla/config/nova/ceph.conf

ssh root@192.168.20.3 "ceph auth get client.cinder" | \
  sudo tee /etc/kolla/config/nova/ceph.client.cinder.keyring
```

- 각 서비스(glance, cinder, nova)에 맞는 위치에 keyring을 배치한다.
- 즉, 위의 설정 파일 복사와 keyring 배치는 OpenStack 컨테이너가 Ceph에 접속하기 위해 필요한 접속 정보 + 인증 정보를 전달하는 과정이다.

```bash
# Controller에서

# Glance
sudo sed -i 's/^[ \t]\+//' /etc/kolla/config/glance/ceph.conf

# Cinder (volume, backup 둘 다)
sudo sed -i 's/^[ \t]\+//' /etc/kolla/config/cinder/ceph.conf
# cinder-volume, cinder-backup 디렉토리에 ceph.conf가 있다면 거기도

# Nova
sudo sed -i 's/^[ \t]\+//' /etc/kolla/config/nova/ceph.conf
```

- tab 공백 문제로 인한 오류를 방지한다.

### globals.yml

```bash
sudo nano /etc/kolla/globals.yml
```

```yml
# =============================================
# 서비스 활성화 (cinder를 yes로)
# =============================================
enable_cinder: "yes"
enable_cinder_backup: "yes"          # 백업 안 쓸 거면 "no"
enable_cinder_backend_lvm: "no"      # LVM 백엔드 비활성화 (중요)

# =============================================
# Ceph 외부 클러스터 연동
# =============================================
# Glance
glance_backend_ceph: "yes"
glance_backend_file: "no"

# Cinder
cinder_backend_ceph: "yes"

# Nova ephemeral disk를 Ceph에 (선택이지만 강력 추천)
nova_backend_ceph: "yes"

# Ceph 사용자 이름
ceph_glance_user: "glance"
ceph_cinder_user: "cinder"
ceph_cinder_backup_user: "cinder-backup"
ceph_nova_user: "cinder"             # nova도 cinder 사용자 사용

# Pool 이름 (위에서 만든 것과 일치해야 함)
ceph_glance_pool_name: "images"
ceph_cinder_pool_name: "volumes"
ceph_cinder_backup_pool_name: "backups"
ceph_nova_pool_name: "vms"
```

- OpenStack 서비스가 로컬 디스크 대신 Ceph를 스토리지 백엔드로 사용하도록 설정한다.
- LVM 백엔드는 반드시 비활성화한다.

---
## 재배포
### 임시 네트워크 설정

- 재배포 시 외부 이미지 다운로드 및 시간 동기화를 위해 임시로 인터넷 연결을 구성한다.

```bash
# Proxmox 호스트에서 IP forwarding 활성화 (이미 했다면 skip)
echo 1 > /proc/sys/net/ipv4/ip_forward

# Proxmox 호스트에서 NAT 설정 (외부로 나갈 수 있게)
iptables -t nat -A POSTROUTING -s 192.168.10.0/24 -o vmbr0 -j MASQUERADE
```

- Proxmox 호스트를 통해 외부로 나갈 수 있도록 NAT 구성

```bash
# 양쪽 OpenStack 노드에서 default gateway 추가
sudo ip route add default via 192.168.10.254
# 위 IP는 가이드에서 만든 Linux VLAN의 IP
```

- default gateway 추가

```bash
ping 8.8.8.8 # 테스트
```

- 위 작업하면 라우팅되서 인터넷 연결 가능해짐

```bash
# 양쪽 OpenStack 노드에서
# 임시로 직접 DNS 설정 
sudo bash -c 'cat > /etc/resolv.conf << EOF
nameserver 8.8.8.8
nameserver 1.1.1.1
EOF'

# DNS 동작 확인
nslookup ntp.ubuntu.com
# 정상이면 IP가 나와야 함
```

- 이름 해석이 가능하도록 DNS 설정

### 재배포 실행 (OpenStack Control Node)

```bash
source ~/kolla-venv/bin/activate

# prechecks 한 번 더
kolla-ansible prechecks -i ~/multinode

# reconfigure로 변경된 설정 적용
kolla-ansible reconfigure -i ~/multinode
```

- 변경된 설정을 반영하여 재배포 수행

```bash
export OS_CLIENT_CONFIG_FILE=/etc/kolla/clouds.yaml
export OS_CLOUD=kolla-admin

# Cinder 서비스 상태
openstack volume service list
# cinder-volume 상태가 up이어야 함, Host 컬럼에 @rbd-1 같은 백엔드 이름이 보이면 성공

# Glance 백엔드 확인
openstack image store list  # rbd가 보여야 함
```

- `cinder-volume` 상태 확인
- `rbd` 백엔드 확인

### 네트워크 원복

```bash
# 양쪽 노드(Controller, Compute)에서 각각

# 현재 default gateway 확인
ip route | grep default

# 제거 - 이거 근데 horizon 접속 하려면 놔두자
sudo ip route del default via 192.168.10.254

# 확인 - 192.168.10.254 default 라인이 없어야 함
ip route
```

- cf) 위 설정은 Horizon 접근이 필요하다면 삭제하지 않고 유지

```bash
# Proxmox 호스트에서

# 현재 NAT 룰 확인
iptables -t nat -L POSTROUTING -n -v | grep MASQUERADE

# 추가했던 룰 그대로 삭제
iptables -t nat -D POSTROUTING -s 192.168.10.0/24 -o vmbr0 -j MASQUERADE

# 확인 - 해당 룰이 없어야 함
iptables -t nat -L POSTROUTING -n -v
```

- 테스트를 위해 추가한 라우팅 및 NAT 설정을 정리한다.

---
## 하이퍼바이저 설정
### virt_type 변경

- 현재는 Proxmox 위의 VM위에 Openstack이 올라가잇어 기본 설정인 KVM을 사용할 수 없다.

```bash
# compute 노드에서
sudo nano /etc/kolla/nova-compute/nova.conf
```

```
[libvirt]
virt_type = qemu
```

```bash
sudo docker restart nova_compute
```

- 현재 구조는 VM 위에 OpenStack이 올라가 있으므로 `kvm` 대신 `qemu`로 변경한다.

---
## 동작 검증
### 이미지 업로드

![[assets/connect1.png]]

- 테스트를 위한 가벼운 OS인 cirros 로 vm을 만들어 테스트를 해보자.
- 주소: https://download.cirros-cloud.net/
- 하나를 골라 다운로드한다.

![[assets/connect2.png]]

- horizon에서 프로젝트 > Compute > 이미지
- 이미지 생성 클릭

![[assets/connect3.png]]

- 이미지 이름 지정
- 아까 다운로드 받은 cirros 이미지 업로드
- 포멧 - QCOW2
- 이미지 공유 - 공유(public)

![[assets/connect4.png]]

- 업로드하고 ceph의 Block > 이미지 들어가보면 images 데이터풀에 업로드 된 것을 볼 수 있다.

### Flavor 생성

![[assets/connect5.png]]

- 관리 > Compute > Flavor
- Flavor 생성 클릭

![[assets/connect6.png]]

- 이름 지정
- vCPU 1개
- RAM 512MB
- Root 디스크 1GB (CirrOS는 워낙 가벼워서 이정도로도 충분)
	- 여기서 지정하는 크기는 '이 이미지로 만들기 위한 인스턴스 디스크의 최소 크기'

### 네트워크 생성

![[assets/connect7.png]]

- 프로젝트 > 네트워크 > 네트워크
- 네트워크 생성 클릭

![[assets/connect8.png]]

![[assets/connect9.png]]

- 네트워크 이름 지정
- 서브넷 이름 지정
- 네트워크 주소 - 10.0.0.0/24 (Floating IP 랑 다른거임 내부 통신 대역)

### 인스턴스(VM) 생성

![[assets/connect10.png]]

- 프로젝트 > Compute > 인스턴스
- 인스턴스 시작 클릭

![[assets/connect11.png]]

- 인스턴스 이름 지정

![[assets/connect12.png]]

- 볼륨 크기 - 5GB 지정
	- Flavor에서 1GB 설정한건 최소 크기이고 이거 5GB 지정하면 덮어씌워짐
- 테스트이므로 인스턴스 삭제시 볼륨 삭제 '예' 선택
- 사용 가능에 있는 cirros 이미지의 화살표를 클릭해서 할당됨으로 옮기기

![[assets/connect13.png]]

- 아까 만든 Flavor 의 화살표를 클릭해서 할당됨으로 옮기기

![[assets/connect14.png]]

- 이건 아마 이미 할당됨 일텐데 혹시 사용 가능에 있다면 화살표 눌러서 아까 만든 네트워크 할당됨으로 옮기기
- 인스턴스 시작 클릭

![[assets/connect15.png]]

- 조금 기다리면 성공적으로 생성된 것을 볼 수 있다.

### 최종 확인

![[assets/connect16.png]]

- ceph의 Block > 이미지 에 들어가보면 아까 images말고도 volumes 데이터풀이 아까 지정한 5GB로 할당된 것을 볼 수 있다.

![[assets/connect17.png]]

- VM 콘솔에도 정상적으로 접속이 되는 것을 볼 수 있다.







