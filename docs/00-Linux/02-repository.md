---
title: 레포지토리 설정
description: Linux Repository의 개념과 배포판 계열별 차이를 살펴보고, RHEL 계열에서 패키지 저장소를 정의하는 .repo 파일의 구조와 ISO 기반 로컬 Repository 구성 방법, 주요 dnf/rpm 명령어를 정리합니다.
date: 2026-10-02
sidebar_class_name: hidden-sidebar-item
image: /img/default/linux/linux.png
---
---
## Repository란?

Repository란 **패키지와 그 패키지들의 메타데이터를 모아둔 저장소**이다.

Linux에서는 소프트웨어를 패키지 단위로 설치하고, 이 설치 과정은 패키지 매니저가 담당한다.

패키지 매니저는 Repository의 메타데이터를 읽어 필요한 패키지와 의존성을 찾고, 해당 패키지를 내려받아 설치한다.

즉, nginx 패키지 설치 명령어를 입력했을 때 **nginx 패키지를 어디서 가져올지 알려주는 것이 Repository 설정**이다.

패키지의 형식과 패키지 매니저, 그리고 Repository를 설정하는 위치는 배포판 계열에 따라 다르다.

|계열|패키지 형식|패키지 매니저|Repository 설정 위치|
|---|---|---|---|
|RHEL (RHEL, Rocky, CentOS 등)|`.rpm`|`dnf`, `yum`|`/etc/yum.repos.d/*.repo`|
|Debian (Debian, Ubuntu 등)|`.deb`|`apt`|`/etc/apt/sources.list`, `/etc/apt/sources.list.d/`|
|Alpine|`.apk`|`apk`|`/etc/apk/repositories`|

여기서 중요한 점은 다음과 같다.

> **형식과 명령어는 다르지만, '패키지 + 메타데이터를 모아둔 저장소를 패키지 매니저가 참조한다'는 구조는 동일하다.**

이 글에서는 RHEL 계열을 기준으로 Repository 설정을 설명한다.

---
## RHEL 계열의 Repository 설정

RHEL 계열에서는 Repository 설정을 `/etc/yum.repos.d/` 디렉토리 아래의 `.repo` 파일로 관리한다.

패키지 형식은 RPM이며, 패키지 매니저로는 `dnf`를 사용한다.

> `yum`과 `dnf`는 RHEL 8부터 사실상 같은 명령어이다. (`yum`이 `dnf`의 심볼릭 링크)

---
### .repo 파일의 구조

`.repo` 파일은 `/etc/yum.repos.d/` 에 존재하며, 여기에 있는 `.repo`로 끝나는 파일을 `dnf`가 전부 읽는다.

아래는 `.repo` 파일의 예시이다.

```ini
[baseos]
name=Rocky Linux $releasever - BaseOS
baseurl=http://repo.example.com/rocky/$releasever/BaseOS/$basearch/os/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-Rocky-9
```

| 항목         | 의미                                       |
| ---------- | ---------------------------------------- |
| `[baseos]` | Repository ID. 시스템 내에서 고유해야 한다           |
| `name`     | 사람이 읽기 위한 설명                             |
| `baseurl`  | 패키지가 실제로 위치한 경로 (`http://`, `file://` 등) |
| `enabled`  | 이 Repository를 사용할지 여부 (`1` 사용 / `0` 미사용) |
| `gpgcheck` | 패키지 서명 검증 여부 (`1` 검증 / `0` 미검증)          |
| `gpgkey`   | 서명 검증에 사용할 공개키 경로                        |

> [!info] **`baseurl`은 `repodata/` 디렉토리가 있는 경로를 가리켜야 한다.**
> - `dnf`는 패키지 파일을 직접 뒤지는 것이 아니라 `repodata/` 안의 메타데이터를 읽고 패키지를 찾기 때문이다.
> - 결국, `dnf install nginx`라는 명령어를 입력하면, 활성화된 모든 레포지토리의 메타데이터에서 `nginx`를 찾고 설치하는 것이다. (중복으로 존재할 경우 `priority`가 높은 레포를 우선하고, 레포를 지정할 수도 있다)

---
### 기본 Repository

RHEL 8부터는 OS가 제공하는 패키지가 **BaseOS**와 **AppStream** 두 개의 Repository로 나뉘어 있다.

|Repository|역할|대표적인 패키지|
|---|---|---|
|BaseOS|OS가 동작하기 위한 핵심 패키지|`kernel`, `glibc`, `systemd`, `bash`, `dnf` 등|
|AppStream|OS 위에서 사용하는 애플리케이션과 도구|`nginx`, `httpd`, `java`, `python`, `gcc` 등|

첫번째로, BaseOS는 **OS의 기반이 되는 패키지를 제공**한다.
- 커널, 기본 라이브러리, 서비스 매니저, 셸처럼 시스템이 부팅되고 동작하는 데 필요한 패키지가 여기에 속한다.

두번째로, AppStream은 **OS 위에서 사용하는 애플리케이션, 런타임, 개발 도구를 제공**한다.
- 웹 서버, 데이터베이스, 언어 런타임, 컴파일러 등이 여기에 속한다.
- 실무에서 추가로 설치하는 패키지는 대부분 AppStream에 있다.

> [!info] **AppStream의 패키지는 BaseOS의 패키지에 의존한다.**
> - 따라서 둘 중 하나만 등록하면 의존성을 해결하지 못해 설치가 실패하는 경우가 많다. 두 Repository는 항상 함께 등록한다고 보면 된다.

이 외에 자주 보게 되는 Repository는 다음과 같다.

|Repository|설명|
|---|---|
|CRB|개발용 헤더, 라이브러리 등 빌드에 필요한 패키지. 기본적으로 비활성화 (8 버전에서는 PowerTools)|
|extras|배포판에서 추가로 제공하는 패키지 (`epel-release` 등)|
|EPEL|Fedora 프로젝트에서 제공하는 추가 패키지 Repository. 별도로 설치해야 사용할 수 있다|

> OS 설치 ISO(DVD)에는 BaseOS와 AppStream만 들어있다. CRB나 EPEL의 패키지가 필요하다면 별도로 준비해야 한다.

---
### 로컬 Repository 구성

폐쇄망처럼 외부 Repository에 접근할 수 없는 환경에서는 OS 설치 ISO를 Repository로 사용하는 경우가 많다.

먼저 ISO(또는 CD/DVD 장치)를 마운트한다.

```bash
mkdir -p /mnt/cdrom
mount /dev/sr0 /mnt/cdrom
```

이후 기존 `.repo` 파일을 백업 디렉토리로 옮기고, 로컬 경로를 바라보는 `.repo` 파일을 만든다.

```bash
mkdir -p /etc/yum.repos.d/backup
mv /etc/yum.repos.d/*.repo /etc/yum.repos.d/backup/
vi /etc/yum.repos.d/local.repo
```

```ini
[local-baseos]
name=Local BaseOS
baseurl=file:///mnt/cdrom/BaseOS
enabled=1
gpgcheck=0

[local-appstream]
name=Local AppStream
baseurl=file:///mnt/cdrom/AppStream
enabled=1
gpgcheck=0
```

ISO 안에도 `BaseOS`와 `AppStream` 디렉토리가 각각 존재하며, 각 디렉토리 안에 `repodata/`가 있다. 따라서 Repository도 두 개를 정의해야 한다.

---
### 주요 명령어

|명령어|설명|
|---|---|
|`dnf clean all`|캐시된 Repository 메타데이터 삭제|
|`dnf makecache`|Repository 메타데이터를 다시 받아 캐시 생성|
|`dnf repolist`|현재 활성화된 Repository 목록 확인|
|`dnf repolist all`|비활성화된 것까지 포함하여 전체 목록 확인|
|`dnf install <패키지>`|패키지 설치|
|`dnf provides <파일 또는 명령어>`|해당 파일을 제공하는 패키지 확인|
|`rpm -qa \| grep <이름>`|설치된 패키지 검색|
|`rpm -ivh <파일.rpm>`|Repository 없이 RPM 파일을 직접 설치|

`.repo` 파일을 수정한 뒤에는 `dnf clean all` → `dnf repolist` 순서로 확인하는 것이 일반적이다.

> [!tip] 자주 생기는 문제
> - `.repo`를 바꿨는데 예전 결과가 나온다면 캐시 때문이다. 그래서 `dnf clean all`을 먼저 하는 것이다.
> - 활성화된 Repository 중 하나라도 접속이 안 되면 `dnf` 전체가 실패한다. 폐쇄망에서 기존 `.repo`를 `backup/`으로 치우는 이유가 이것이다. (`skip_if_unavailable=1`을 주면 건너뛴다.)

---
