---
image: /img/default/homelab/proxmox.png
sidebar_class_name: hidden-sidebar-item
date: 2025-06-19
title: Proxmox 호스트 IP가 변경되었을 때 네트워크 설정 변경
description: 공유기 교체 등으로 Proxmox 호스트의 IP가 변경되었을 때, /etc/network/interfaces와 /etc/hosts 파일을 수정하여 네트워크 설정을 업데이트하는 방법을 단계별로 설명합니다.
---

---
## 왜?

공유기가 바뀌면서, 새로운 DHCP 서버에서 각 서버들이 IP를 할당받게 되었다. 그런데, Proxmox 호스트의 설정이 이전 IP로 되어있어서 이를 바꾸어주어야한다.

---
## Proxmox Host IP 변경

```bash
nano /etc/network/interfaces
```

- 아래처럼 수정한다.

```bash
auto lo
iface lo inet loopback

iface enp1s0 inet manual

auto vmbr0
iface vmbr0 inet static
        address 바뀐IP주소/24
        gateway 게이트웨이IP주소
        bridge-ports enp1s0
        bridge-stp off
        bridge-fd 0

iface enp3s0 inet manual

iface wlo1 inet manual


source /etc/network/interfaces.d/*
```

```bash
nano /etc/hosts
```

- 아래처럼 수정한다.

```bash
127.0.0.1 localhost.localdomain localhost
바뀐IP주소 cloud.sonhs.com cloud

# The following lines are desirable for IPv6 capable hosts

::1     ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
ff02::3 ip6-allhosts
```

```bash
reboot
```

- 재부팅한다.

---
## 클러스터에 속한 노드인 경우

> [!tip] 아래 절차를 진행 중 권한 문제가 나오면, 쿼럼이 없는 경우이므로 `pvecm expected 1` 명령어를 입력한다. (쿼럼 강제로 얻는 명령어)

```bash
nano /etc/pve/corosync.conf
```

```conf
...
nodelist {
  node {
    name: cloud
    nodeid: 1
    quorum_votes: 1
    ring0_addr: 기존IP # 여기 부분 변경IP로 수정
  }
  ...
}
...

totem {
  ...
  config_version: 4 # 여기 부분 반드시 1 올려주어야한다. (ex: 원래 4였다면 5로 수정)
  ...
}

```

- 위 명령어 입력 후 `ring0_addr`의 기존 ip 부분 변경 ip로 수정
- 이후 `config_version`을 1 증가시킨다.

```bash
nano /etc/hosts
```

```conf
...
기존IP mycloud.local mycloud # 여기 기존IP를 변경IP로 수정
...
```

- 기존에 다른 노드들의 DNS를 `hosts`에 등록했었다면, 모든 노드들에서 `/etc/hosts`에서 바뀐 노드의 IP를 변경해주어야 한다.

```bash
systemctl restart corosync
```

- `corosync`를 재시작해준다.

