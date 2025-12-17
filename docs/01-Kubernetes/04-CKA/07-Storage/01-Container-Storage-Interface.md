---
title: Container Storage Interface
description: 컨테이너 스토리지 인터페이스(CSI)의 개념, 특징, 작동 원리를 상세히 알아봅니다. CSI는 CRI/CNI와 같이 다양한 스토리지 솔루션을 Kubernetes, Mesos, Nomad 등의 컨테이너 오케스트레이션 플랫폼에 연동하기 위한 표준 인터페이스이며, RPC를 통해 볼륨 관리 작업을 수행합니다.
keywords:
  - CSI
  - Container Storage Interface
  - RPC
  - Remote Procedure Call
---
---
:::info
도커 스토리지, 도커 볼륨에 대한 사전 지식이 필요하다.
없다면 [도커 스토리지](../../../05-Docker/02-Docker-Storage.md), [도커 볼륨](../../../05-Docker/03-Docker-Volume.md) 글 참조
:::

## CSI (Container Storage Interface)
### 개념

- CRI(Container Runtime Interface), CNI(Container Network Interface) 이 다양한 컨테이너 런타임, 다양한 네트워크 솔루션을 지원하기 위해서 도입되었듯이, CSI(Container Storage Interface)는 다양한 스토리지 솔루션을 연동하기 위해 만들어진 인터페이스이다.
- 스토리지 벤더는 CSI 표준에 맞는 드라이버만 구현하면 Kubernetes와 연동 가능하다.

### 예시

- Portworx
- Amazon EBS
- Azure Disk
- Dell EMC (Isilon, PowerMax, Unity, Xtremio)
- NetApp
- Nutanix
- HPE
- Hitachi
- Pure Storage 등

### 특징

- Kubernetes 전용 표준이 아니고, 범용 컨테이너 오케스트레이션 표준이다.
- 이에 Cloud Foundry, Mesos, Nomad 등의 다른 컨테이너 오케스트레이션 플랫폼에서도 사용 가능하다.

---
## RPC (Remote Procedure Call)
### 개념

- RPC (Remote Procedure Call)는 컨테이너 오케스트레이터가 볼륨 생성/삭제/연결 등의 스토리지 작업을 원격 스토리지 드라이버에게 요청하고 그 결과를 받는 표준화된 통신 방법이다. 
- CSI는 RPC 집합을 정의하며, 스토리지 드라이버는 이를 반드시 구현해야한다.
- 이에 Kubernetes와 같은 컨테이너 오케스트레이터는 스토리지 드라이버의 내부 구현을 몰라도 표준 RPC 호출만 수행하면 된다.

### 예시

- CreateVolume
	- `Pod`가 생성되는 과정에 볼륨이 필요할 때
	- Kubernetes -> CSI 드라이버 호출
	- 스토리지 드라이버는 실제 스토리지에 볼륨을 생성
- DeleteVolume
	- 볼륨이 더이상 필요 없을 때
	- Kubernetes -> CSI 드라이버 호출
	- 스토리지 드라이버는 실제 스토리지에서 볼륨 삭제

---
## 레퍼런스

- [https://github.com/container-storage-interface/spec](https://github.com/container-storage-interface/spec)
- [https://kubernetes-csi.github.io/docs/](https://kubernetes-csi.github.io/docs/)
- [http://mesos.apache.org/documentation/latest/csi/](http://mesos.apache.org/documentation/latest/csi/)
- [https://www.nomadproject.io/docs/internals/plugins/csi#volume-lifecycle](https://www.nomadproject.io/docs/internals/plugins/csi#volume-lifecycle)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)