---
title: Proxmox VM에 GPU Passthrough를 적용해보자.
description: Proxmox에서 NVIDIA GPU Passthrough를 설정하는 완벽 가이드. BIOS 설정부터 vfio.conf 구성, VM에 GPU 장치 연결, Ubuntu에서 드라이버 설치까지 단계별로 설명합니다. RTX 4080 등 최신 GPU 환경에서도 안정적으로 AI 추론, 그래픽 작업, 게이밍용 VM을 구성할 수 있습니다.
keywords:
  - Proxmox
  - proxmox gpu passthrough
  - proxmox nvidia passthrough
  - proxmox gpu 할당
  - gpu passthrough
---
---
## 왜?

GPU Passthrough란 VM에 직접 GPU장비를 할당하는 기술이다. 이를 활용하여 VM을 사용할 때, GPU를 VM에 직접 할당시켜서 AI추론 등에 활용하고 싶었다. 

cf) GPU Passthrough를 할당한 Window VM으로 게임도 원활하게 가능하지만, 온라인 게임에서는 뱅가드와 같은 안티치트 프로그램이 커널 단계에서 작동하기 때문에 온라인 게임을 주로 하는 나에게는 해당 사항이 없었다.

---
## 사전 준비
### 바이오스

- 바이오스에서 `SVM`과 `IOMMU`를 켜주어야한다.
- 보통 기본적으로 켜져있지만, 켜져있지 않은 경우 바이오스에 접속해서 켜주도록 한다.

### GPU 장치 ID, PCI ID 확인

**NVIDIA GPU 기준**

```bash
lspci -nn | grep -i nvidia

# 출력예시
2b:00.0 VGA compatible controller [0300]: NVIDIA Corporation AD103 [GeForce RTX 4080] [10de:2704] (rev a1)
2b:00.1 Audio device [0403]: NVIDIA Corporation Device [10de:22bb] (rev a1)
```

- 위 명령어를 입력하면 아래와 같은 출력이 나올 것이다.
- 여기서 GPU 장치 ID / 오디오 장치 ID를 기록해두자. 
	- 출력 예시로 보면, GPU 장치 ID: `10de:2704` / 오디오 장치 ID: `10de:22bb`
- 추가적으로 PCI ID도 기록해주자.
	- 출력 예시로 보면, GPU 장치 PCI ID: `2b:00.0` / 오디오 장치 PCI ID: `2b:00.1`

---
## Proxmox
### 콘솔

**Proxmox에서 IOMMU 활성화**

```bash
nano /etc/default/grub
```

```
# Intel CPU
GRUB_CMDLINE_LINUX_DEFAULT="quiet intel_iommu=on iommu=pt"

# AMD CPU
GRUB_CMDLINE_LINUX_DEFAULT="quiet amd_iommu=on iommu=pt"
```

- `/etc/default/grub` 파일에서 `GRUB_CMDLINE_LINUX_DEFAULT` 항목을 찾아 CPU 제조사에 맞게 변경해주자.

```bash
update-grub
reboot
```

- 설정을 적용하고 재부팅

**GPU 장치 등록**

```
echo "options vfio-pci ids=GPU장치ID,오디오장치ID" > /etc/modprobe.d/vfio.conf
```

- 앞서 확인했던 GPU장치ID, 오디오장치ID를 등록시켜준다.

```bash
update-initramfs -u -k all
reboot
```

- initramfs 업데이트 후 재부팅

### Window 추가 설정

VM이 리눅스 기반 OS인 경우 위 과정까지 하고 아래 'VM에 GPU 연결'로 넘어가면 되고, Window의 경우 아래 과정을 추가로 진행한다.

**호스트 서버에서 GPU 드라이버 로드 차단**

```bash
nano /etc/modprobe.d/pve-blacklist.conf
```

- proxmox `pve-blacklist.conf` 파일 수정

```bash
blacklist nouveau
blacklist nvidia
```

- 위 2줄 추가

```bash
reboot
```

- 재부팅

**VM 설정 수정**

```bash
nano /etc/pve/qemu-server/VM의ID.conf
```

- VM 설정 파일 수정

```bash
args: -cpu 'host,kvm=off,hv_vendor_id=proxmox'
boot: order=scsi0;ide2;net0;ide0
cores: 8
cpu: host,hidden=1,flags=+pcid
hostpci0: 0000:2b:00,pcie=1
ide0: local:iso/virtio-win-0.1.285.iso,media=cdrom,size=771138K
ide2: local:iso/Win10_22H2_Korean_x64v1.iso,media=cdrom,size=5683458K
machine: q35
memory: 24576
name: window-vdi
net0: virtio=BC:24:11:42:06:61,bridge=vmbr0,firewall=1
numa: 0
ostype: win10
scsi0: local-lvm:vm-104-disk-0,iothread=1,size=256G
scsihw: virtio-scsi-single
smbios1: uuid=e9d71170-fa59-4b21-91ae-d0dcd4e33112
sockets: 1
vga: std
vmgenid: 9676e07b-7c44-4610-91af-dca4f2240eec
```

- **`cpu: host,hidden=1,flags=+pcid`** - OS에 VM 환경이라는 것을 숨김
- **`hostpci0: 0000:2b:00,pcie=1`** - GPU와 오디오를 함께 패스스루
- **`machine: q35`** - 추가 (최신 머신 타입)
- **`ostype: win10`** - `l26`(Linux)에서 `win10`으로 변경
- vm 재시작

---
### VM에 GPU 연결

![gpu-passthrough1](assets/gpu-passthrough1.png)

- Proxmox 콘솔에 들어간 후 GPU를 장착할 VM 선택
- Hardware - Add - PCI Device
	- Raw device 선택
	- 앞서 기록해 두었던 GPU PCI ID, 오디오 PCI ID를 추가한다.
- 재부팅

---
## GPU 드라이버 설치

VM에서 GPU를 인식하기 위해 GPU 드라이버를 설치해야한다. 

### Linux (Ubuntu/Debian)

```bash
sudo add-apt-repository ppa:graphics-drivers/ppa -y
sudo apt update
```

- 최신 드라이버를 받기 위한 공식 레포지토리를 추가한다.

```bash
ubuntu-drivers devices

# 출력 예시
== /sys/devices/... ==
model    : NVIDIA GeForce RTX 4080
driver   : nvidia-driver-550 - distro non-free recommended
driver   : nvidia-driver-535 - distro non-free
```

- 설치 가능한 드라이버를 확인한다.

```bash
sudo apt install nvidia-driver-550
```

- 위 출력이 나왔을 때 `recommended`가 붙어있는 드라이버를 설치한다. (필수는 아니지만 가장 안정적인 버전)

```
reboot
```

- 재부팅을 한다.

```bash
nvidia-smi

# 출력예시
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 550.78       Driver Version: 550.78       CUDA Version: 12.4     |
| GPU Name  : NVIDIA GeForce RTX 4080                                       |
| Fan Temp Perf Pwr:Usage/Cap Memory-Usage ...
+-----------------------------------------------------------------------------+
```

- `nvidia-smi`를 입력했을 때 출력이 뜨면 성공

### Window

**설치**

- https://www.nvidia.com/ko-kr/drivers/ 여기서 다운로드 후 설치
- 재부팅

**참고**

- 혹시나 어떤 문제가 생겨서 지우고 다시 설치해야할 경우 DDU(https://www.wagnardsoft.com/display-driver-uninstaller-ddu) 로 지우고 다시 설치

---
## 참고

:::warning
예외적인 경우이긴 하나, 나의 경우에는 proxmox와 다른 ssd에 윈도우를 설치하고 멀티부팅으로 사용했었다. 이 때 proxmox의 Window VM 에 GPU Passthrough를 적용하니, VM이 아닌 호스트 윈도우가 부팅이 되지 않았다. 왜냐하면 Window VM에 GPU Passthrough를 하는 과정에서 GPU를 시스템에서 격리하기 때문이다.

이러한 상황에서는 Window VM에 GPU Passthrough를 사용하지 않는 것이 맞다. 혹시나 이런 상황이 생긴다면 아래 과정을 거쳐 호스트 Window OS를 복구하자.
:::

1. Window VM 삭제
2. GPU Passthrough를 하기위한 설정 모두 롤백
3. Window 부팅하면서 F8 입력 (고급 부팅 옵션 진입)
4. 문제 해결 - 고급 옵션 - 시작 설정 - 다시 시작 (재부팅 됨)
5. Window로 재부팅 이후 부팅 모드 선택에서 F5 입력 (네트워크 사용 안전모드)
6. 안전모드 진입 후 DDU로 그래픽 드라이버 삭제 후 그래픽 드라이버 다시 설치
7. 재부팅
8. 안될경우 여러번 재부팅
9. 해결

:::info
그러면, 왜 Linux VM의 Passthrough는 다른 호스트 Window에 영향을 주지 않는걸까?

Window VM에 GPU Passthrough시에는 `blacklist` 설정이 필요하지만 Linux에는 필요없기 때문이다. (격리되지 않는다) 
:::

| 구분         | blacklist 필요 여부 | 이유                                                           |
| ---------- | --------------- | ------------------------------------------------------------ |
| Ubuntu VM  | 필요 없음           | VFIO에 의해 GPU가 완전 분리되어 Ubuntu 내부 커널이 영향을 받지 않음                |
| Windows VM | 필요함             | Proxmox가 GPU를 초기화하면 NVIDIA 드라이버가 “가상 GPU 감지(Code 43)”로 오류 발생 |

---
## 레퍼런스

- https://phum.co.kr/tech-74/