---
title: Docker Network
description: Docker의 3가지 주요 네트워크 모드(None, Host, Bridge)의 차이점과 작동 원리를 상세히 설명합니다. 특히 docker0 인터페이스, 가상 케이블(veth pair), 네트워크 네임스페이스 및 iptables 포트 매핑 등 Docker 브리지 네트워크의 내부 구조를 Deep Dive하여 정리했습니다.
keywords:
  - Docker Network
  - Docker Bridge Network
  - Network Namespace
  - Docker Network Mode
---
---
## Docker 네트워크 모드
### None Network

```bash
docker run --network none nginx
```

- 컨테이너가 어떠한 네트워크에도 연결되지 않는 네트워크 모드이다.
- 컨테이너 내부에서 외부와 통신할 수 없으며, 외부에서도 컨테이너에 접근할 수 없는 상태이다.

### Host Network

```bash
docker run --network host nginx
```

- 컨테이너가 호스트의 네트워크 스택을 그대로 공유하는 네트워크 모드이다.
- 컨테이너가 80번 포트를 쓰면, 호스트의 80번 포트에서 그대로 서비스 된다. (별도의 포트 매핑 불필요)
- 이 네트워크 모드를 사용하는 컨테이너가 사용하는 포트는 다른 프로세스(호스트 프로세스, 다른 컨테이너 프로세스 등)는 실행될 수 없다.

### Bridge Network (기본값)

```bash
docker run --network bridge nginx
# 또는 기본 모드 이므로
docker run nginx
```

- 호스트 내부에 가상 브리지를 생성하여 컨테이너들을 연결한다.
- 기본적으로 `172.17.0.0/16` 대역을 사용하며, 각 컨테이너는 이 대역에서 IP를 할당 받는다.
- 동일 브리지 네트워크 내의 컨테이너는 서로 통신이 가능하다.

---
## Bridge 네트워크 Deep Dive

:::info
네트워크 네임스페이스에 대한 사전 지식이 없다면 [네트워크 네임스페이스](../15-Network/03-Namespace.md) 글 참조
:::

### Docker0 네트워크 인터페이스

- Docker 설치시 호스트에 `docker0`라는 네트워크 인터페이스가 생성된다. (`ip link` 해보면 볼 수 있음)
- 이것은 네트워크 브리지 역할을 하며, 기본 IP로 172.17.0.1을 가진다. (따로 설정을 하지 않는다면 모든 브리지 모드 컨테이너는 이 브리지를 사용하며, 따로 사용자 정의 브리지도 설정하면 사용 가능하다)
- 내부적으로 Docker 설치시 `ip link add docker0 type bridge` 이런식으로 설치된다.

### Network Namespace와 연결 과정

- 브리지 모드인 컨테이너가 생성될 때 Docker는 아래와 같은 과정을 수행하며 네트워크를 연결한다.

1. 컨테이너를 위한 격리된 네트워크 네임스페이스를 생성한다.
2. Virtual Cable을 생성한다.
3. Virtual Cable의 한쪽 끝은 `docker0` 브리지에 연결하고, 나머지 한쪽 끝(`eth0`로 명명된다)은 컨테이너의 네임스페이스에 연결한다.
4. 컨테이너의 네임스페이스에 연결된 쪽(인터페이스)에 IP를 할당한다.

- 실제로 `ip netns list`를 하면 컨테이너들을 위한 네트워크 네임스페이스를 볼 수 있다.
- 그리고 `docker inspect <container_id>`를 입력하면 해당 컨테이너의 네트워크 세팅에서 연결된 네임스페이스의 이름을 확인할 수 있다.(`SandboxID`, `SandboxKey`)

### 포트 매핑

- 브리지 네트워크의 컨테이너는 사설 IP를 가지므로 외부에서 직접 접근할 수 없다. 
- 이를 해결하기 위해 포트 매핑을 사용한다.

```bash
docker run -p 8080:80 nginx
```

- 호스트의 8080포트를 컨테이너의 80포트로 매핑한다.
- 이 또한, 내부적으로 PREROUTING 체인에 DNAT 규칙을 추가하여 구현한 것이다.
- cf) 반대로 외부 인터넷으로 나가는 요청 또한 내부적으로 `iptables` 기능을 사용하여 NAT 규칙을 생서한 것이다.

