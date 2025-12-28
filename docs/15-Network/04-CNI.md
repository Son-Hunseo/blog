---
title: CNI (Container Network Interface)
description: 컨테이너 네트워크 표준인 CNI(Container Network Interface)의 개념, 탄생 배경 및 스펙을 정리합니다. Docker, Kubernetes 환경에서 네트워크 플러그인이 작동하는 원리와 주요 종류(Calico, Cilium 등)를 확인하세요.
keywords:
  - CNI
  - Container Network Interface
---
---
## CNI
### 개념

- 컨테이너 런타임 환경에서 네트워킹 문제를 해결하기 위해 개발된 '플러그인 표준 규격'

### 배경

- `Docker`, `rkt(Rocket)`, `containerd`, `CRI-O` 등 다양한 컨테이너 런타임들이 존재한다. (사실 여기서 `Docker`는 CNI를 지원하지 않으므로 제외해아한다)
	- `Docker`의 독자적 노선 이유는 다음 글 참조 - [Docker vs Containerd](../01-Kubernetes/01-CKA/01-concept/02-docker-containerd.md)
- 이들은 모두 네트워크 네임스페이스 생성, 브리지 연결, IP 할당, NAT 설정 등 유사한 네트워킹 문제를 해결해야한다.
	- 예: [도커 브리지 네트워크 모드 구현 원리](../03-Docker/04-Docker-Network.md#bridge-네트워크-deep-dive) 글 참조 
	- `Docker`는 CNI를 지원하지 않지만, 이 글을 참조하면 컨테이너 런타임에서 어떤 부분을 구현해야하는지 이해할 수 있다.
- 하지만 각자 독자적인 방식으로 이를 구현하다 보니 호환성이 떨어지는 문제가 발생했다.
- 이에 이러한 컨테이너 솔루션의 네트워킹 부분을 별도의 플러그인으로 분리하고, 이를 호출하는 방식을 표준화(인터페이스화)하여 어떤 컨테이너 런타임이든 동일한 방식으로 네트워킹을 처리할 수 있게 만든 것이 CNI의 배경이다.

---
## CNI 스펙

:::info
명확한 정보는 공식 문서(https://www.cni.dev/docs/spec/) 참조
:::

### 컨테이너 런타임의 역할

- 각 컨테이너를 위한 네트워크 네임스페이스를 생성할 수 있어야 한다.
- 컨테이너가 연결될 네트워크를 식별할 수 있어야 한다.
- 컨테이너 생성 시 `ADD` 명령으로, 삭제시 `DEL` 명령으로 CNI 플러그인을 호출할 수 있어야 한다.
- JSON 형식의 설정 파일을 통해 플러그인에 필요한 정보를 제공할 수 있어야 한다.

### CNI 플러그인의 역할

- `ADD`, `DEL`, `CHECK`, `VERSION` 명령어를 지원해야한다.
- 컨테이너 ID, 네트워크 네임스페이스 등의 파리미터를 받을 수 있어야 한다.
- `Pod`에 IP 주소를 할당하고 통신에 필요한 라우팅을 설정할 수 있어야 한다.
- 작업 결과를 정해진 포맷에 맞게 반환해야한다.

---
## 종류

- 기본 제공 플러그인:
	- `Bridge`, `VLAN`, `IPVLAN`, `MACVLAN`, Windows용 플러그인 등
- IPAM (IP Address Management) 플러그인
	- `host-local`, `DHCP`
- 서드파티 플러그인
	- `Flannel`, `Calico`, `Cilium` 등

---
## 레퍼런스

- https://www.cni.dev/docs/spec/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)