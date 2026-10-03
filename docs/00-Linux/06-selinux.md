---
title: SELinux
description: SELinux의 개념과 동작 모드(Enforcing, Permissive, Disabled), Context와 Boolean의 의미, 그리고 SELinux로 인해 서비스가 차단됐을 때 원인을 확인하고 해결하는 방법을 정리합니다.
date: 2026-10-02
sidebar_class_name: hidden-sidebar-item
image: /img/default/linux/linux.png
---
---
## SELinux란?

SELinux(Security-Enhanced Linux)는 **프로세스가 어떤 파일, 포트, 자원에 접근할 수 있는지를 정책으로 강제하는 Linux 커널의 보안 기능**이다.

Linux의 기본 권한 체계는 `chmod`, `chown`으로 다루는 소유자/그룹/권한 기반이다. 이를 DAC(Discretionary Access Control)라고 한다.

SELinux는 여기에 더해 MAC(Mandatory Access Control)을 제공한다.

| 구분  | 기준                       | 특징                               |
| --- | ------------------------ | -------------------------------- |
| DAC | 소유자 / 그룹 / 권한(`rwx`)     | 파일 소유자가 권한을 마음대로 바꿀 수 있다         |
| MAC | 시스템에 정의된 정책(Policy)      | root라도 정책에서 허용하지 않은 접근은 차단된다     |

여기서 중요한 점은 다음과 같다.

> **SELinux는 DAC를 대체하는 것이 아니라, DAC를 통과한 요청을 한 번 더 검사한다.**

따라서 파일 권한이 `777`이더라도 SELinux 정책에서 허용하지 않으면 접근이 차단된다.

'권한은 다 맞는데 Permission denied가 난다'면 SELinux를 의심해볼 수 있는 이유이다.

---
## 동작 모드

---
### 모드의 종류

SELinux에는 3가지 모드가 있다.

| 모드           | 정책 검사 | 차단  | 로그  | 설명                        |
| ------------ | ----- | --- | --- | ------------------------- |
| `Enforcing`  | O     | O   | O   | 정책을 위반한 접근을 차단한다 (기본값)    |
| `Permissive` | O     | X   | O   | 차단하지 않고 로그만 남긴다           |
| `Disabled`   | X     | X   | X   | SELinux를 사용하지 않는다         |

`Permissive`는 차단은 하지 않지만 위반 내역은 로그로 남기기 때문에, **문제의 원인이 SELinux인지 확인하는 용도**로 많이 사용한다.

---
### 모드 확인

**현재 적용 중인 모드만 확인**

```bash
getenforce
```

```bash
Enforcing
```


**SELinux 상태 조금 더 상세히 확인**

```bash
sestatus
```

```
SELinux status:                 enabled
Loaded policy name:             targeted
Current mode:                   enforcing
Mode from config file:          enforcing
```

- `Current mode` : 현재 적용 중인 모드
- `Mode from config file` : 설정 파일에 정의된 모드 (재부팅 후 적용될 모드)

이 둘이 다르다면, 현재 모드는 임시로 변경된 것이고 재부팅하면 설정 파일의 값으로 돌아간다.

---
### 모드 변경

**임시 변경**

```bash
setenforce 0
setenforce 1
```

- `0`은 Permissive, `1`은 Enforcing이다.
- 즉시 적용되지만 **재부팅하면 사라진다.**
- `setenforce`로는 `Disabled`로 바꾸거나, `Disabled` 상태에서 다시 켤 수 없다.


**영구 변경**

설정 파일은 `/etc/selinux/config`이다.

```bash
vi /etc/selinux/config
```

```
SELINUX=enforcing
SELINUXTYPE=targeted
```

`SELINUX=` 값을 `enforcing`, `permissive`, `disabled` 중 하나로 변경하고 재부팅하면 적용된다.

`sed`로는 다음과 같이 변경할 수 있다.

```bash
sed -i 's/^SELINUX=.*/SELINUX=permissive/' /etc/selinux/config
```

> 전체 과정을 요약하면 다음과 같다.
> 
> **`setenforce` = 지금 즉시 적용, 재부팅 시 초기화 / `/etc/selinux/config` = 재부팅 이후에 적용**

따라서 재부팅 없이 바로 적용하면서 이후에도 유지하려면 둘 다 수행해야 한다.

> [!info] Disabled로 변경할 때
> - `Disabled` 상태에서는 새로 만들어지는 파일에 SELinux Context가 붙지 않는다.
> - 이후 다시 `Enforcing`으로 되돌리면 전체 파일시스템의 Context를 다시 붙이는 Relabel 작업이 필요하고, 부팅 시간이 길어진다.
> - 이에, 꼭 꺼야 하는 것이 아니라면 `Disabled`보다 `Permissive`로 두는 것이 되돌리기 쉽다.
> - RHEL 9부터는 설정 파일의 `SELINUX=disabled`만으로는 완전히 비활성화되지 않으며, 완전히 끄려면 커널 파라미터 `selinux=0`을 사용하도록 안내하고 있다.

---
## Context

---
### Context란?

Context는 **SELinux가 접근 허용 여부를 판단하기 위해 프로세스와 파일에 붙여두는 라벨**이다.

파일의 Context는 `ls -Z`, 프로세스의 Context는 `ps -eZ`로 확인할 수 있다.

```bash
ls -Z /var/www/html
ps -eZ | grep httpd
```

```
unconfined_u:object_r:httpd_sys_content_t:s0 index.html
system_u:system_r:httpd_t:s0        1234 ?  00:00:01 httpd
```

Context는 `:`로 구분된 4개의 필드로 구성된다.

```
system_u : object_r : httpd_sys_content_t : s0
   │          │              │              │
  User       Role           Type          Level
```

기본 정책인 `targeted`에서 실제로 중요한 것은 세번째 필드인 **Type**이다.

러프하게 보면 다음과 같다.

> **`httpd_t` 타입의 프로세스는 `httpd_sys_content_t` 타입의 파일을 읽을 수 있다.**

즉, SELinux 정책은 '어떤 Type의 프로세스가 어떤 Type의 대상에 접근할 수 있는가'에 대한 규칙의 모음이라고 보면 된다.

---
### Context가 문제가 되는 경우

대표적인 경우가 파일을 다른 위치에서 만든 뒤 `mv`로 옮긴 경우이다.

`cp`는 대상 디렉토리의 Context를 따라가지만, `mv`는 원래 파일의 Context를 그대로 유지한다.

예를 들어 홈 디렉토리에서 만든 `index.html`을 `/var/www/html`로 `mv`하면, 파일의 Type이 `user_home_t`로 남아있어 `httpd`가 읽지 못한다.

이 경우 `restorecon`으로 해당 경로의 기본 Context를 다시 적용한다.

```bash
restorecon -Rv /var/www/html
```

- `-R` : 하위 경로까지 재귀적으로 적용
- `-v` : 변경된 내역 출력

---
### 기본 경로가 아닌 곳을 사용하는 경우

`/data/web`처럼 기본 경로가 아닌 디렉토리를 서비스에서 사용한다면, 해당 경로에 어떤 Context를 붙일지를 정책에 등록해야 한다.

```bash
semanage fcontext -a -t httpd_sys_content_t "/data/web(/.*)?"
restorecon -Rv /data/web
```

- `semanage fcontext -a` : 경로에 대한 Context 규칙을 정책에 추가한다.
- `restorecon` : 등록된 규칙에 따라 실제 파일에 Context를 적용한다.

`chcon`으로 Context를 직접 바꿀 수도 있지만, 이는 정책에 등록되는 것이 아니기 때문에 `restorecon`이나 Relabel 시 원래대로 돌아간다.

| 명령어                    | 동작                      | 영구 여부              |
| ---------------------- | ----------------------- | ------------------ |
| `chcon`                | 파일의 Context를 직접 변경      | Relabel 시 원래대로 돌아감 |
| `semanage fcontext`    | 경로의 Context 규칙을 정책에 등록  | 영구                 |
| `restorecon`           | 정책에 등록된 Context를 파일에 적용 | -                  |

> `semanage` 명령어가 없다면 `policycoreutils-python-utils` 패키지를 설치해야 한다.

> 이에, `Apache`, `Tomcat`과 같은 미들웨어를 소스 컴파일 방식 설치 후 Systemd에 등록해서 실행할 경우 모든 설정이 정상인데도 실행이 되지 않는 경우가 있다.
> 
> 이는 SELinux가 활성화된 환경에서 해당 실행 파일 또는 스크립트에 적절한 SELinux Context가 부여되지 않아 `systemd`를 통한 실행이 차단되기 때문이다.

---
## Port와 Boolean

---
### Port

SELinux는 파일뿐만 아니라 **프로세스가 사용할 수 있는 포트**도 제한한다.

예를 들어 `httpd`를 기본 포트가 아닌 `8888`로 띄우면, 설정이 맞더라도 SELinux에 의해 기동에 실패할 수 있다.

```bash
semanage port -l | grep http_port_t
semanage port -a -t http_port_t -p tcp 8888
```

- `semanage port -l` : Type별로 허용된 포트 목록 확인
- `semanage port -a` : 해당 Type에 포트 추가

---
### Boolean

Boolean은 **정책의 특정 기능을 켜고 끌 수 있도록 미리 만들어둔 스위치**이다.

정책 자체를 수정하지 않고도 자주 필요한 동작을 허용할 수 있다.

```bash
getsebool -a | grep httpd
setsebool -P httpd_can_network_connect on
```

- `getsebool -a` : 전체 Boolean 목록과 현재 값 확인
- `setsebool -P` : Boolean 값을 변경한다. `-P`를 붙여야 재부팅 후에도 유지된다.

대표적인 예시로 `httpd_can_network_connect`가 있다. 이 값이 `off`이면 `httpd`가 다른 서버로 네트워크 연결을 할 수 없어, Reverse Proxy로 WAS에 연결할 때 실패한다.

---
## 문제 해결

---
### SELinux가 원인인지 확인하는 방법

가장 간단한 방법은 임시로 `Permissive`로 바꿔보는 것이다.

```bash
setenforce 0
```

이후 동일한 동작이 정상적으로 된다면 SELinux가 원인이다.

원인을 확인했다면 `setenforce 1`로 되돌리고, 아래의 로그를 확인하여 필요한 부분만 허용하는 것이 올바른 방향이다.

---
### 로그 확인

SELinux가 차단한 내역은 `/var/log/audit/audit.log`에 `AVC`라는 타입으로 기록된다.

```bash
ausearch -m avc -ts recent
grep denied /var/log/audit/audit.log
```

```
type=AVC msg=audit(1759370000.123:456): avc:  denied  { read } for  pid=1234 comm="httpd" name="index.html" scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:user_home_t:s0 tclass=file permissive=0
```

| 항목          | 의미                        |
| ----------- | ------------------------- |
| `denied { read }` | 차단된 동작                |
| `comm`      | 차단된 프로세스                  |
| `scontext`  | 접근을 시도한 주체(프로세스)의 Context |
| `tcontext`  | 접근 대상(파일, 포트 등)의 Context  |
| `tclass`    | 대상의 종류 (`file`, `dir`, `tcp_socket` 등) |

위 예시는 `httpd_t` 프로세스가 `user_home_t` 타입의 파일을 읽으려다 차단된 것이다.

즉, 파일의 Context가 잘못된 것이므로 `restorecon`으로 해결할 수 있다.

> `audit2why`를 사용하면 차단된 이유와 해결 방법에 대한 힌트를 얻을 수 있다.
> 
> `ausearch -m avc -ts recent | audit2why`

---
### 정리

| 증상                         | 확인                     | 해결                                    |
| -------------------------- | ---------------------- | ------------------------------------- |
| 권한은 맞는데 파일 접근이 차단됨         | `ls -Z`                | `restorecon` 또는 `semanage fcontext`   |
| 기본 포트가 아닌 포트로 기동 실패        | `semanage port -l`     | `semanage port -a`                    |
| 다른 서버로의 네트워크 연결 등 특정 동작 차단 | `getsebool -a`         | `setsebool -P`                        |
| 원인을 모르겠음                   | `ausearch -m avc`      | `audit2why`로 원인 확인                    |

---
