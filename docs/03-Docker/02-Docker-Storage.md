---
title: Docker Storage
keywords:
  - Docker
  - 도커
  - Docker Storage
  - Container Layer
  - Image Layer
  - 컨테이너 레이어
  - 이미지 레이어
  - COW
  - Copy-on-Write
  - Docker Storage Driver
  - 도커 스토리지 드라이버
description: Docker의 데이터 저장 구조( /var/lib/docker)와 레이어드 아키텍처(Layered Architecture)의 핵심 개념을 정리합니다. 이미지 레이어와 컨테이너 레이어의 차이점, 복사 시점 쓰기(COW) 방식, 그리고 스토리지 드라이버의 역할을 초보자도 이해하기 쉽게 설명합니다.
---
---
## Docker의 데이터 저장 위치

```
/var/lib/docker
├── containers/
├── image/
├── volumes/
└── 스토리지드라이버이름/
```

- `Docker`를 설치하면 기본적으로 호스트에 `/var/lib/docker`가 생성된다.
- `containers/` - Container 레이어 관련 저장 (즉, 실행 중이거나 종료된 컨테이너 관련 파일 저장)
- `image/` - Image 레이어 정보 저장
- `volumes/` - 볼륨 데이터 저장
- `aufs/overlay2/devicemapper 등` - 스토리지 드라이버별 데이터 저장

:::info
위의 디렉토리에 저장되는 정보들이 왜 구분되어있고 어떠한 것들이 저장되는지 아래에서 다룸
:::

---
## Docker의 Layered Architecture

### 개념

![dockerstorage1](assets/dockerstorage1.png)

- Docker 이미지의 핵심 개념은 '레이어 구조'이다.
- Dockerfile의 각 명령어 한 줄 = 하나의 레이어
- 각 레이어는 이전 레이어 대비 변경된 부분만 저장한다.
- 이에 위 예시를 보면 우분투 레이어는 120MB 패키지 레이어는 약 300MB이지만, 다른 레이어들은 크기가 작다.

### 장점

![dockerstorage2](assets/dockerstorage2.png)

- 위와 같이 비슷한 Dockerfile을 가진 두 애플리케이션이 있다고 가정해보자.
- 레이어 1 ~ 3은 재사용하고 변경된 레이어 4 ~ 5만 새로 생성해서 사용하면 된다.
- 이를 통해서 '빌드 속도 향상', '디스크 공간 절약'이라는 2가지 이점을 얻을 수 있다.
- cf) 이에 어떠한 애플리케이션을 개발하면서 CI/CD 파이프라인을 가동한다고 했을 때, 첫번째 이미지 빌드만 오래걸리고 그 다음부터는 상대적으로 빠르게 빌드되는 것이다.

---
## Container Layer
### 개념 및 차이점

![dockerstorage3](assets/dockerstorage3.png)

- 위에서 이전까지 봤던 Layer 구조는 Image Layers들이다.
- 컨테이너가 실행될 때는 Container Layer도 사용된다.
	- 컨테이너 내에서 실행되는 애플리케이션에서의 로그가 저장될 때는 Container Layer에 저장된다.
	- `docker exec -it`로 컨테이너 내에 접속해서 특정 파일을 수정한다면 이는 Container Layer에 저장된다.

| **특징**       | **이미지 레이어 (Image Layer)**                      | **컨테이너 레이어 (Container Layer)**      |
| ------------ | ---------------------------------------------- | ----------------------------------- |
| **읽기/쓰기 속성** | **읽기 전용 (Read-Only)**                          | **쓰기 가능 (Read-Write)**              |
| **생성 시점**    | `docker build` 시 생성                            | `docker run` 시 생성                   |
| **저장 내용**    | 컨테이너의 기본 환경, 애플리케이션 파일, 라이브러리                  | 로그, 임시 파일, 컨테이너 실행 중 발생하는 사용자 수정 파일 |
| **수정 가능 여부** | 실행 후 **수정 불가**                                 | 실행 중 **수정 가능**                      |
| **불변성**      | 이미지 자체는 항상 **동일하게 유지**됨                        | 컨테이너마다 독립적으로 존재하며 변경됨               |
| **변경 방법**    | 변경하려면 반드시 `docker build`를 통해 **새 이미지**를 만들어야 함 | 컨테이너 생명주기와 동일하며 **임시적**임            |
| **생명 주기**    | 영구적이며 여러 컨테이너가 **공유**하여 사용                     | 컨테이너 **삭제 시 함께 삭제**됨                |

### COW(Copy-on-Write)

- 그런데 생각을 해보면 컨테이너 내부의 애플리케이션이 실행되는데 사용되는 파일들은 '이미지 레이어'에서 빌드 된 것들인데 `docker exec -it`로 접속해서 수정도 가능하다.
- 이미지 레이어는 읽기 전용인데 왜 수정할 수 있는걸까?
- 이는 COW(Copy-on-Write) 때문이다.

**COW 동작방식**
1. 이미지 레이어에 있는 파일 수정 시도
2. Docker가 해당 파일을 Container Layer로 복사
3. 이후 수정은 복사된 파일에서 수행

**특징**
- 원본 '이미지 레이어'는 변경되지 않는다.
- 변경 내용은 '컨테이너 레이어'에만 존재
- 컨테이너를 삭제 시 수정한 파일, 새로 만든 파일 모두 삭제된다.

---
## Docker Storage Driver
### 역할

- 레이어드 아키텍처 구현
- Read-Only / Read-Write 레이어 관리
- COW 처리
- 파일 시스템 관리

### 주요 Docker Storage Driver

- Storage Driver는 OS에 따라 최적의 드라이버가 다르다.
- Docker가 알아서 자동으로 최적의 드라이버를 선택한다.
	- ex: Ubuntu -> overlay2
- 대표적인 Docker Storage Driver
	- AUFS
	- ZFS
	- BTRFS
	- Device Mapper
	- Overlay
	- Overlay2 (가장 많이 사용)

---
## 레퍼런스

- [https://docs.docker.com/storage/](https://docs.docker.com/storage/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)