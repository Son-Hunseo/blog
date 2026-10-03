---
title: Systemd와 systemctl
description: Systemd의 Unit 개념과 Unit 파일의 구조, Service Type의 차이, 그리고 systemctl과 journalctl의 주요 명령어를 정리합니다.
date: 2026-10-02
sidebar_class_name: hidden-sidebar-item
image: /img/default/linux/linux.png
---
---
## Systemd란?

Systemd는 **Linux의 부팅 과정과 서비스(데몬)의 생명주기를 관리하는 시스템 및 서비스 매니저**이다.

부팅 시 가장 먼저 실행되는 PID 1 프로세스이며, 이후 Unit으로 등록한 모든 서비스는 Systemd에 의해 실행된다. (쉘에서 사용자가 직접 실행한 프로세스는 해당되지 않는다)

Systemd는 관리 대상을 **Unit**이라는 단위로 다룬다.

| Unit 종류    | 대상                    |
| ---------- | --------------------- |
| `.service` | 서비스(데몬)               |
| `.target`  | 여러 Unit을 묶은 그룹        |
| `.mount`   | 마운트 포인트               |
| `.timer`   | 예약 실행 (cron과 비슷한 역할)  |
| `.socket`  | 소켓 기반 활성화             |

---
## Unit

---
### Unit 파일의 위치

| 경로                         | 용도                       |
| -------------------------- | ------------------------ |
| `/usr/lib/systemd/system/` | 패키지가 설치하는 기본 Unit 파일     |
| `/etc/systemd/system/`     | 관리자가 직접 작성하거나 재정의하는 Unit |

같은 이름의 Unit이 양쪽에 모두 있다면 `/etc/systemd/system/`이 우선한다.

따라서 직접 서비스를 등록할 때는 `/etc/systemd/system/` 아래에 작성한다.

---
### Unit 파일의 구조

```ini
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/opt/myapp
Environment=JAVA_HOME=/usr/lib/jvm/java-17
ExecStart=/opt/myapp/bin/start.sh
ExecStop=/opt/myapp/bin/stop.sh
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Unit 파일은 크게 3개의 섹션으로 구성된다.

`[Unit]`은 **Unit 자체에 대한 설명과 다른 Unit과의 관계**를 정의한다.
- `Description` : Unit에 대한 설명
- `After` : 지정한 Unit이 시작된 이후에 시작한다. (순서만 정의)
- `Requires` / `Wants` : 지정한 Unit을 함께 시작한다. (의존성 정의, `Requires`는 강한 의존 / `Wants`는 약한 의존)

`[Service]`는 **서비스를 어떻게 실행하고 종료할지**를 정의한다.
- `Type` : 프로세스 실행 방식
- `User` / `Group` : 프로세스를 실행할 계정
- `ExecStart` / `ExecStop` : 시작/종료 시 실행할 명령어 (절대경로로 작성)
- `Restart` : 프로세스가 종료됐을 때의 재시작 정책
- `Environment` / `EnvironmentFile` : 환경변수 지정
- `LimitNOFILE` : 프로세스가 열 수 있는 파일 수 제한

 `[Install]`은 **`systemctl enable` 했을 때 어떻게 등록될지**를 정의한다.
- `WantedBy=multi-user.target` : 일반적인 부팅(멀티유저 모드) 시 자동으로 시작되도록 한다.

---
### Service Type

헷갈리기 쉬운 부분이 `Type`이다.

| Type      | 동작                                         | 대표적인 사용처               |
| --------- | ------------------------------------------ | ---------------------- |
| `simple`  | `ExecStart`로 실행한 프로세스가 곧 메인 프로세스 (기본값)    | 포그라운드로 실행되는 프로세스       |
| `forking` | `ExecStart`가 자식 프로세스를 띄우고 자신은 종료          | 백그라운드로 전환되는 데몬 스크립트    |
| `oneshot` | 한 번 실행하고 종료되는 작업                           | 초기화 스크립트               |
| `notify`  | 프로세스가 준비 완료를 Systemd에 직접 알림                | Systemd 연동을 지원하는 데몬    |

스크립트가 내부적으로 프로세스를 백그라운드로 띄우고 끝나는 구조인데 `Type=simple`로 두면, Systemd는 스크립트가 끝난 시점에 서비스가 종료됐다고 판단한다.

이 경우 `Type=forking`으로 지정하고, 가능하면 `PIDFile`도 함께 지정해야 한다.

> 이에, Apache나 Tomcat과 같은 미들웨어를 소스로 설치 후, `../bin/httpd` 로 실행/종료를 할 경우에는 `Type=simple`, `../bin/apachectl`로  실행/종료를 할 때는 `Type=forking`으로 두어야 한다.

---
## systemctl 명령어

| 명령어                                  | 설명                          |
| ------------------------------------ | --------------------------- |
| `systemctl start <서비스>`              | 서비스 시작                      |
| `systemctl stop <서비스>`               | 서비스 중지                      |
| `systemctl restart <서비스>`            | 서비스 재시작                     |
| `systemctl reload <서비스>`             | 프로세스를 유지한 채 설정만 다시 읽음       |
| `systemctl status <서비스>`             | 서비스 상태 및 최근 로그 확인           |
| `systemctl enable <서비스>`             | 부팅 시 자동 시작 등록               |
| `systemctl disable <서비스>`            | 부팅 시 자동 시작 해제               |
| `systemctl enable --now <서비스>`       | 자동 시작 등록 + 즉시 시작            |
| `systemctl is-active <서비스>`          | 현재 실행 중인지 확인                |
| `systemctl is-enabled <서비스>`         | 자동 시작이 등록되어 있는지 확인          |
| `systemctl daemon-reload`            | Unit 파일 변경사항을 Systemd에 반영   |
| `systemctl cat <서비스>`                | 실제 적용된 Unit 파일 내용 확인        |
| `systemctl list-units --type=service` | 현재 로드된 서비스 목록 확인            |

> **`start`와 `enable`은 서로 다른 개념이다.**
> 
> **start = 지금 실행 / enable = 부팅 시 자동 실행**

`start`만 하면 재부팅 후에 서비스가 올라오지 않고, `enable`만 하면 지금 당장은 실행되지 않는다.

또한, Unit 파일을 새로 만들거나 수정했다면 반드시 `systemctl daemon-reload`를 실행해야 변경사항이 반영된다.

---
## journalctl

Systemd가 관리하는 서비스의 로그는 `journalctl`로 확인한다.

| 명령어                                      | 설명                    |
| ---------------------------------------- | --------------------- |
| `journalctl -u <서비스>`                    | 특정 서비스의 로그 확인         |
| `journalctl -u <서비스> -f`                 | 로그를 실시간으로 확인          |
| `journalctl -u <서비스> --since "10 min ago"` | 최근 10분간의 로그 확인        |
| `journalctl -xe`                         | 최근 로그를 상세 설명과 함께 확인   |

서비스가 `failed` 상태라면 `systemctl status` → `journalctl -u` 순서로 원인을 확인하면 된다.

---
