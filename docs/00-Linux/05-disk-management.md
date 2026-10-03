---
title: 디스크 관리
description: Linux의 장치 이름 규칙부터 LVM(PV, VG, LV) 기반 파티션 분리, mount, 그리고 fstab을 통한 영구 마운트까지 디스크 관리 흐름을 정리합니다.
date: 2026-10-02
sidebar_class_name: hidden-sidebar-item
image: /img/default/linux/linux.png
---
---
## 파티션 분리

---
### 장치 이름

---
#### 리눅스 장치의 기본 이름

Linux에서는 디스크와 같은 장치도 `/dev/` 아래의 파일로 표현된다.

| 이름                | 의미                                        |
| ----------------- | ----------------------------------------- |
| `sda`, `sdb`, ... | 디스크. `sd`가 디스크, `a`가 첫번째를 의미한다            |
| `sda1`, `sda2`, ... | `sda` 디스크 안의 첫번째, 두번째 파티션               |
| `sr0`, `sr1`, ... | CD/DVD 광학 드라이브                            |
| `vda`, `vdb`, ... | 가상화 환경의 virtio 디스크                        |
| `nvme0n1`         | NVMe 디스크 (파티션은 `nvme0n1p1`, `nvme0n1p2`, ...) |

```
sda               ← 첫번째 디스크
├─ sda1           ← 첫번째 파티션
├─ sda2           ← 두번째 파티션
└─ sda3
sdb               ← 두번째 디스크
sr0               ← CD/DVD
```

현재 시스템의 장치 구성은 `lsblk`로 확인할 수 있다.

---
### LVM

---
#### LVM이란?

LVM(Logical Volume Manager)은 **물리적인 디스크를 논리적인 볼륨으로 추상화하여 유연하게 관리하기 위한 기능**이다.

파티션을 직접 사용하면 한 번 정한 크기를 바꾸기 어렵다.

LVM을 사용하면 여러 디스크를 하나의 공간처럼 묶고, 그 안에서 필요한 만큼 잘라 쓰고, 이후에 크기를 늘릴 수 있다.

---
#### LVM의 구성요소

```
/dev/sdb1    /dev/sdc1          ← PV (Physical Volume)
    │            │
    └─────┬──────┘
          ▼
       vg_data                  ← VG (Volume Group)
          │
    ┌─────┴──────┐
    ▼            ▼
 lv_app       lv_log            ← LV (Logical Volume)
    │            │
    ▼            ▼
  /app         /log             ← 파일시스템 + 마운트
```

| 구성요소 | 의미                                  |
| ---- | ----------------------------------- |
| PV   | LVM에서 사용할 수 있도록 초기화한 디스크 또는 파티션     |
| VG   | 하나 이상의 PV를 묶은 저장 공간 풀               |
| LV   | VG에서 필요한 만큼 잘라낸 논리적인 볼륨. 실제로 마운트하는 대상 |

---
#### 파티션 분리 과정

`/dev/sdb` 디스크를 추가하고 `/data`로 분리하여 사용한다고 하자.

**1. 디스크 확인**

```bash
lsblk
```

**2. PV 생성**

```bash
pvcreate /dev/sdb
```

**3. VG 생성**

```bash
vgcreate vg_data /dev/sdb
```

**4. LV 생성**

```bash
lvcreate -n lv_data -L 50G vg_data
```

- `-n` : LV 이름
- `-L` : 크기 지정 (`50G`)
- 남은 공간을 전부 사용하려면 `-L` 대신 `-l 100%FREE`를 사용한다.

**5. 파일시스템 생성**

|계열|대표 배포판|기본 파일 시스템|
|---|---|---|
|데비안 계열|Debian, Ubuntu|ext4|
|레드햇 계열|RHEL, Rocky, CentOS, Fedora|XFS|

```bash
mkfs.xfs /dev/vg_data/lv_data
```

**6. 마운트**

```bash
mkdir -p /data
mount /dev/vg_data/lv_data /data
```

**7. 확인**

```bash
pvs
vgs
lvs
df -hT /data
```

> 전체 과정을 요약하면 다음과 같다.
> 
> **디스크 추가 → PV 생성 → VG 생성 → LV 생성 → 파일시스템 생성 → 마운트 → fstab 등록**

> [!info] 디스크 전체 vs 파티션
> - `pvcreate /dev/sdb`처럼 디스크 전체를 PV로 만들 수도 있고, `fdisk`로 `/dev/sdb1` 파티션을 만든 뒤 이를 PV로 만들 수도 있다.
> - 파티션을 만들어 사용하는 경우 파티션 타입은 `Linux LVM`으로 지정한다.

---
#### 볼륨 확장

LVM의 대표적인 장점 중 하나이다.

용량이 부족해지면 디스크를 추가하고 기존 VG와 LV를 확장할 수 있다.

```bash
pvcreate /dev/sdc
vgextend vg_data /dev/sdc
lvextend -r -l +100%FREE /dev/vg_data/lv_data
```

`lvextend`는 LV의 크기만 늘리는 명령어이다. 파일시스템까지 늘어나는 것은 아니다.

`-r` 옵션을 주면 파일시스템 확장까지 함께 수행한다. 이 옵션 없이 실행했다면 파일시스템을 직접 확장해야 한다.

| 파일시스템 | 확장 명령어                              |
| ----- | ----------------------------------- |
| XFS   | `xfs_growfs /data`                  |
| ext4  | `resize2fs /dev/vg_data/lv_data`    |

> XFS는 확장만 가능하고 축소는 지원하지 않는다.

---
## mount

---
#### mount란?

`mount`는 **저장 장치(또는 파일시스템)를 디렉토리에 연결하는 명령어**이다.

Linux에서는 디스크를 연결했다고 바로 사용할 수 있는 것이 아니라, 특정 디렉토리(마운트 포인트)에 마운트해야 접근할 수 있다.

```bash
mount /dev/sdb1 /data
mount -o loop rocky.iso /mnt/iso
umount /data
```

| 명령어        | 설명                              |
| ---------- | ------------------------------- |
| `mount`    | 장치를 마운트 포인트에 연결                 |
| `umount`   | 마운트 해제                          |
| `mount -a` | `/etc/fstab`에 정의된 항목을 모두 마운트    |
| `df -hT`   | 마운트된 파일시스템의 용량과 타입 확인           |
| `lsblk`    | 디스크, 파티션, 마운트 포인트를 트리 형태로 확인    |
| `findmnt`  | 현재 마운트 상태 확인                    |

`mount` 명령어로 한 마운트는 **재부팅하면 사라진다.** 영구적으로 유지하려면 뒤에서 다룰 `/etc/fstab`에 등록해야 한다.

---
## fstab

---
### fstab이란?

`/etc/fstab`은 **부팅 시 어떤 장치를 어디에 마운트할지 정의하는 파일**이다.

`mount` 명령어로 한 마운트는 재부팅하면 사라지기 때문에, 영구적으로 유지하려면 fstab에 등록해야 한다.

---
### fstab의 구조

```
/dev/mapper/vg_data-lv_data  /data  xfs  defaults  0  0
UUID=3f1c2a9e-...            /boot  xfs  defaults  0  0
```

한 줄은 6개의 필드로 구성된다.

| 순서  | 필드      | 의미                                        |
| --- | ------- | ----------------------------------------- |
| 1   | 장치      | 마운트할 장치. 장치 경로 또는 `UUID=`로 지정              |
| 2   | 마운트 포인트 | 장치를 연결할 디렉토리                              |
| 3   | 파일시스템   | `xfs`, `ext4`, `swap`, `nfs` 등             |
| 4   | 옵션      | 마운트 옵션. `defaults`, `noatime`, `nofail` 등 |
| 5   | dump    | 백업(dump) 대상 여부. 일반적으로 `0`                 |
| 6   | fsck    | 부팅 시 파일시스템 검사 순서. `0`은 검사하지 않음            |

---
###  장치 경로 vs UUID

`/dev/sdb1` 같은 장치 이름은 디스크 인식 순서에 따라 재부팅 후 바뀔 수 있다.

따라서 일반 파티션은 **UUID로 지정하는 것이 안전하다.** UUID는 `blkid`로 확인할 수 있다.

```bash
blkid /dev/sdb1
```

반면, LVM은 `/dev/mapper/vg_data-lv_data` 또는 `/dev/vg_data/lv_data` 형태의 이름이 고정되기 때문에 장치 경로를 그대로 사용해도 된다.

---
### fstab 수정 시 주의사항

fstab은 잘못 작성하면 **부팅이 되지 않고 Emergency Mode로 진입할 수 있다.**

따라서 수정한 뒤에는 재부팅 전에 반드시 검증해야 한다.

```bash
mount -a
df -hT
```

`mount -a`는 fstab에 정의된 항목을 모두 마운트하는 명령어이다. 에러 없이 끝나고 `df -hT`에서 마운트된 것이 보이면 정상이다.

> [!tip] nofail 옵션
> - 옵션에 `nofail`을 추가하면 해당 장치가 없더라도 부팅이 중단되지 않는다.
> - 부팅에 필수적이지 않은 데이터 디스크나 NFS에 유용하다.

---
