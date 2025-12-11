---
title: Docker 보안 (Namespace, User Security, Linux Capabilities)
description: Docker 컨테이너의 핵심 보안 원리인 Linux Namespace를 사용한 격리, 비-Root 사용자로 컨테이너를 실행하는 방법, 그리고 Linux Capabilities를 통해 컨테이너 Root 권한을 제한하는 메커니즘을 상세히 설명합니다. Docker 환경의 안정성과 보안을 강화하는 방법을 알아보세요.
keywords:
  - Docker 보안
  - Docker Security
  - Docker
  - namespace
  - User Security
  - Linux Capabilities
---
---
## Docker 보안

- Docker는 격리, 사용자, 권한 측면의 보안 시스템을 가지고 있다.
- 아래의 내용들이 Docker 보안의 전부라는 뜻은 아니고, 대표적인 개념들을 작성한 것이다.

---
## 격리 - Namespace
### 개념

- 컨테이너는 VM과 달리 호스트의 커널을 공유한다.
- 같은 커널이지만 호스트와 컨테이너는 Linux `Namespace` 기술을 통해 서로 격리된다.

### 예시

**컨테이너 내부 시점**
- 컨테이너 안에서는 자신이 시스템의 유일한 공간처럼 보인다.
- 예를 들어, `sleep 3600` 명령어를 실행하면 컨테이너 내부에서는 이 프로세스의 PID(프로세스 ID)가 1로 보인다.

**호스트 시스템 시점**
- 호스트에서 실행 중인 모든 프로세스 목록을 보면, 컨테이너의 프로세스도 일반 프로세스처럼 보인다.
- 하지만 호스트에서는 해당 작업의 PID는 1이 아닌 다른 번호(예: 4567)를 가진다.

### 의미

- 즉, 컨테이너 내부에서는 호스트 시스템 및 다른 컨테이너에서 실행중인 모든 프로세스의 존재를 볼 수 없으며 이 때문에 조작도 불가능하다.
- 이는 컨테이너 간, 컨테이너와 호스트 간의 프로세스 충돌 및 간섭을 방지하여 보안성과 안정석을 높인다.

---
## 사용자 - User Security
### 개념

- 호스트에는 'Root User'와 '일반 User'가 있다.
- 기본적으로 Docker 컨테이너는 내부 프로세스를 '호스트의 Root User' 권한으로 실행한다.
- 이는 보안적으로 위험할 수 있다.
- 예
	- 컨테이너 내부의 보안 취약점이나 특정 설정 오류가 있다면 공격자는 컨테이너를 탈출하여 호스트 시스템에 접근할 수 있다.

### 컨테이너 사용자 변경 방법

**방법1: 실행 시점 변경**

```bash
docker run --user=1000 ubuntu sleep 3600
```

- 사용자 ID 1000으로 우분투 컨테이너 실행

**방법2: 이미지 빌드 시점 변경**

```dockerfile
FROM ubuntu
...
USER 1000
```

- 이후 실행되는 명령어는 사용자 ID 1000으로 실행됨

---
## 권한 - Linux Capabilities
### 개념

- 컨테이너 내부의 Root 사용자는 호스트의 Root 사용자와 동일할까? -> 아니다.
- 호스트의 Root 사용자는 시스템 재부팅, 시간 변경 등의 모든 권한을 갖지만, Docker는 Linux Capabilities를 사용하여 컨테이너의 Root 사용자의 권한을 제한한다.
	- Docker는 기본적으로 호스트에 큰 영향을 줄 수 있는 강력한 권한(예: 시스템 재부팅)을 차단한 상태로 컨테이너를 실행한다.
	- 필요에 따라 이 권한을 더하거나 뺄 수 있다.

### 권한 제어 방법

| **옵션**             | **설명**                                       | **예시**                              |
| ------------------ | -------------------------------------------- | ----------------------------------- |
| **`--cap-add`**    | 특정 권한을 추가할 때 사용한다.                           | `docker run --cap-add KILL ubuntu`  |
| **`--cap-drop`**   | 기본적으로 부여된 권한조차 제거할 때 사용한다.                   | `docker run --cap-drop KILL ubuntu` |
| **`--privileged`** | 모든 제한을 해제하고 호스트의 Root와 동일한 모든 권한을 부여한다. (위험) | `docker run --privileged ubuntu`    |

- Linux Capabilities 예시
	- `CHOWN`: 파일 소유권 변경
	- `KILL`: 프로세스 종료
	- `NET_BIND_SERVICE`: 1024번 이하의 네트워크 포트 바인딩
	- `SYS_BOOT`: 시스템 재부팅 (Docker 기본값에서는 차단됨)

---
## 레퍼런스

- https://docs.docker.com/engine/security/

