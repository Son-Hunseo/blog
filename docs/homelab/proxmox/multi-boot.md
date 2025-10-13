---
title: Proxmox 멀티 부팅 세팅
sidebar_position: 2
description: Proxmox와 Windows를 한 PC에서 쉽게 전환할 수 있는 듀얼 부팅 환경 설정 방법을 정리했습니다. BIOS에서 부팅 순서를 매번 변경하지 않고 GRUB 메뉴를 통해 부팅 선택지를 추가하는 과정과, 부트 파티션 식별 및 설정 파일 수정법을 단계별로 설명합니다.
keywords:
  - Proxmox
  - 윈도우 듀얼 부팅
  - Proxmox 부팅설정
  - GRUB 설정
  - 홈서버 구축
  - 멀티부팅
  - Linux Windows dual boot
  - proxmox 윈도우 전환
  - 서버 세팅
  - proxmox 설치
  - 홈랩
---
---
## 왜?

현재 미니 pc 서버들을 홈서버로 사용하고 있는데, 간혹 gpu를 사용해야하거나 고성능 작업을 요구하는 경우 아쉬움이 많았다. 그래서 게임용으로 사용하고 있는 데스크탑에 추가 ssd를 장착해서 proxmox를 설치했다. 하지만, 컴퓨터를 킬 때마다 바이오스에 들어가서 부팅 순서를 바꿔주는 작업은 귀찮아서 멀티 부팅 환경을 세팅하기로 했다.

---
## 멀티 부팅 세팅
### 사전 준비

```bash
lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINT
```

- Proxmox 콘솔에서 위 명령어를 입력한다.

```bash
NAME              SIZE FSTYPE LABEL      MOUNTPOINT
nvme0n1          465.8G
├─nvme0n1p1       100M vfat
├─nvme0n1p2     465.2G ntfs
├─nvme0n1p3        16M
└─nvme0n1p4       538M ntfs
nvme1n1          464.9G
├─nvme1n1p1       1007K
├─nvme1n1p2       512M vfat              /boot/efi
└─nvme1n1p3     464.4G LVM2_member
  ├─pve-swap       8G swap               [SWAP]
  ├─pve-root      96G ext4               /
  ├─pve-data_tmeta 3.4G
  ├─pve-data_tdata 337.9G
  └─pve-data     337.9G
```

- 위 출력 예시에서 보면 `nvme1n1`에는 `pve`가 있는 것을 보아 proxmox를 설치한 ssd이므로 `nvme0n1`이 window가 설치된 ssd임을 알 수 있다.
- FSTYPE가 `vfat`으로 되어있는 파티션이 부팅 파티션이다. 따라서 `nvme0n1p1`이 윈도우 부팅 파티션임을 알 수 있다.

### 설정 파일 수정

```bash
nano /ect/grub.d/40_custom
```

- Proxmox 콘솔에서 위 명령어를 입력해서 설정 파일을 수정한다.

```config
menuentry "부팅 선택지 이름" {
    insmod part_gpt
    insmod chain
    insmod ntfs
    set root='(hd0,gpt1)'
    chainloader /EFI/Microsoft/Boot/bootmgfw.efi
}
```

- 설정 파일 맨 아래에 위와 같이 입력한다.
- `(hd0,gpt1)`은 `nvme0n1p1`을 나타낸다.
	- 위에서 확인한 정보를 여기에 반영하면 된다.
	- `nvme0n1p1`
		- `nvme0n1` -> `hd0` : 첫번째 네임스페이스의 '0번째' ssd
		- `p1` -> `gpt1` : 첫 번째 파티션
- 저장

```bash
update-grub
```

- 위에서 수정한 설정 파일을 적용하는 명령어

```bash
reboot
```

- 재시작하면 부팅 선택지에 우리가 설정한 선택지가 뜬다.