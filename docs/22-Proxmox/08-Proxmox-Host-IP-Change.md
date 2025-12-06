---
title: Proxmox 호스트 IP가 변경되었을 때 네트워크 설정 변경
description: Proxmox 호스트 IP가 변경되었을 때 네트워크 설정 변경
keywords:
  - Proxmox
  - Proxmox Host IP 변경
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