---
title: Docker Volume
description: Docker 컨테이너의 데이터 영속성을 확보하는 핵심 기술인 Docker Volume과 Bind Mount의 원리 및 사용법을 자세히 알아봅니다. Volume 생성, 마운트, 구 방식 -v와 권장 방식 --mount의 차이점, 그리고 외부 스토리지를 연동하는 Volume Driver Plugin의 역할까지 다룹니다.
keywords:
  - Docker
  - 도커
  - Docker Volume
  - 도커 볼륨
  - Docker Volume Driver
  - Volume Driver Plugin
---
---
## Docker Volume
### 왜 Volume?

- Container Layer에서 파일을 수정, 생성 한다고 해도 컨테이너가 삭제되면 해당 파일들도 모두 함께 삭제되는 문제가 있다.
- 이를 해결해기 위해 Volume을 사용한다.

---
## 생성 & 마운트

![dockerstorage4](./assets/dockerstorage4.png)

### Volume Mount

```bash
docker volume create data_volume
```

- 호스트의 `/var/lib/docker/volumes/data_volume/` 생성

```bash
docker run -v data_volume:/var/lib/mysql mysql
```

- 컨테이너 내부의 `/var/lib/mysql`에 있는 파일들이 `data_volume`에 마운트된다.
- 컨테이너 삭제 후에도 이 데이터는 유지된다.
- `data_volume` 대신에 없는 볼륨 이름을 넣어도(예:`test`) 해당 볼륨이 생성되며 자동으로 마운트된다.

### Bind Mount

```bash
docker run -v /data/mysql:/var/lib/mysql mysql
```

- `/var/lib/docker/volumes`가 아닌 호스트에 존재하는 다른 디렉토리를 사용하고 싶을 때는 위와 같이 사용하며, 이를 Bind Mount라고 한다.

| 구분    | Volume Mount              | Bind Mount |
| ----- | ------------------------- | ---------- |
| 위치    | `/var/lib/docker/volumes` | 호스트 어디든    |
| 관리 주체 | Docker                    | 사용자        |
| 주 용도  | 일반적인 데이터 영속성              | 기존 데이터 재사용 |

---
## `-v` vs `--mount`

```bash
docker run -v source:target
```

- 구 방식
- 간단

```bash
docker run \
--mount type=bind,source=/data/mysql,target=/var/lib/mysql \
mysql
```

- 신 방식
- 권장
- `type`, `source`, `target` 명확히 구분

---
## Docker Volume Driver
### 역할

- 데이터 영속성(Persistence) 담당
- 컨테이너 외부에 데이터 저장

### Docker Volume Driver Plugin

- 기본으로 제공되는 Volume Driver는 Docker 호스트의 로컬에 저장하는 기능만 존재한다.
- 이 경우 여러 단점이 있다.
	- 서버 장애 시 데이터 손실
	- 컨테이너/호스트 이동 어려움 (해당 컨테이너를 다른 호스트에서 실행시키기 번거로움)
	- 클라우드 환경에서 확장성 부족
- 이에 외부 스토리지와 연동하는 Volume Driver Plugin이 필요

### 대표적인 Volume Driver Plugins

- Azure File Storage
- Google Compute Persistent Disk
- Amazon EBS
- Openstack Cinder
- VMware vSphere Storage
- Convoy

---
## 레퍼런스

- [https://docs.docker.com/engine/reference/commandline/volume_create/](https://docs.docker.com/engine/reference/commandline/volume_create/)
- [https://docs.docker.com/engine/reference/commandline/volume_ls/](https://docs.docker.com/engine/reference/commandline/volume_ls/)
- [https://docs.docker.com/engine/extend/legacy_plugins/](https://docs.docker.com/engine/extend/legacy_plugins/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)