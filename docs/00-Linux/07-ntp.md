---
title: NTP 설정
description: NTP의 개념과 chrony를 이용한 Client/Server 시간 동기화 설정, 그리고 동기화 상태를 확인하는 방법을 정리합니다.
date: 2026-10-02
sidebar_class_name: hidden-sidebar-item
image: /img/posts/00-Linux/07-ntp/ntp.png
---
---
## NTP란?

NTP(Network Time Protocol)는 **네트워크를 통해 서버의 시간을 동기화하는 프로토콜**이다. (UDP 123 포트 사용)

서버 간 시간이 맞지 않으면 다음과 같은 문제가 생긴다.

- 로그의 시간 순서가 뒤섞여 장애 분석이 어려워진다.
- 인증서, 토큰의 유효기간 검증이 실패할 수 있다.
- 클러스터를 구성하는 분산 시스템이 오동작할 수 있다.

RHEL 8 이상에서는 NTP 구현체로 **chrony**를 사용한다. (데몬 이름은 `chronyd`)

---
## chrony 설정

설정 파일은 `/etc/chrony.conf`이다.

---
### Client 설정

```
server 192.168.0.100 iburst
```

- `server` : 시간을 받아올 NTP 서버를 지정한다.
- `iburst` : 최초 동기화를 빠르게 하기 위한 옵션이다.
- 기본으로 들어있는 `pool ...` 항목은 외부 NTP 서버이므로, 폐쇄망이라면 주석 처리하고 내부 NTP 서버를 지정한다.

---
### Server 설정

내부망에서 다른 서버들에게 시간을 제공하는 NTP 서버 역할을 한다면 아래 설정을 추가한다.

```
allow 192.168.0.0/24
local stratum 10
```

- `allow` : 시간을 제공할 Client 대역을 지정한다.
- `local stratum 10` : 상위 NTP 서버와 동기화되지 않더라도 자신의 시간을 기준으로 Client에게 시간을 제공한다.

설정을 변경한 뒤에는 서비스를 재시작한다.

```bash
systemctl enable --now chronyd
systemctl restart chronyd
```

---
## 동기화 확인

---
### chronyc sources

동기화 대상 서버의 목록과 상태를 확인한다.

```bash
chronyc sources
```

```
MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^* 192.168.0.100                 3   6   377    35   +120us[ +180us] +/-   15ms
```

| 표시   | 의미                       |
| ---- | ------------------------ |
| `^*` | 현재 동기화에 사용 중인 서버         |
| `^+` | 동기화 후보로 사용 가능한 서버        |
| `^?` | 연결이 되지 않거나 아직 판단할 수 없는 서버 |

`^*`가 표시되어 있다면 정상적으로 동기화되고 있는 것이다.

`Reach`가 `0`이라면 NTP 서버와 통신이 되지 않는 것이므로 방화벽(UDP 123)과 서버 측의 `allow` 설정을 확인한다.

> `-v` 옵션을 붙이면 각 컬럼의 의미가 결과 위에 함께 출력된다.

---
### chronyc tracking

현재 시스템 시간이 기준 시간과 얼마나 차이나는지 확인한다.

```bash
chronyc tracking
```

```
Reference ID    : C0A80064 (192.168.0.100)
Stratum         : 4
Ref time (UTC)  : Fri Oct 02 05:40:12 2026
System time     : 0.000012345 seconds fast of NTP time
Last offset     : +0.000008123 seconds
RMS offset      : 0.000015432 seconds
Frequency       : 12.345 ppm slow
Residual freq   : +0.001 ppm
Skew            : 0.045 ppm
Root delay      : 0.001234567 seconds
Root dispersion : 0.000456789 seconds
Update interval : 64.2 seconds
Leap status     : Normal
```

| 항목            | 의미                                         |
| ------------- | ------------------------------------------ |
| `Reference ID` | 현재 동기화 중인 서버                               |
| `Stratum`     | 기준 시계로부터의 단계. 동기화 중인 서버의 Stratum + 1이 된다   |
| `System time` | 시스템 시간과 NTP 시간의 차이                         |
| `Leap status` | 동기화 상태. `Normal`이면 정상, `Not synchronised`면 동기화되지 않은 것 |

---
### timedatectl

현재 시간과 타임존, 동기화 여부를 확인한다.

```bash
timedatectl
```

```
               Local time: Fri 2026-10-02 14:40:12 KST
           Universal time: Fri 2026-10-02 05:40:12 UTC
                 RTC time: Fri 2026-10-02 05:40:12
                Time zone: Asia/Seoul (KST, +0900)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

- `System clock synchronized` : `yes`이면 시간이 동기화된 상태이다.
- `NTP service` : `active`이면 NTP 서비스(chronyd)가 동작 중이다.

> [!info] 시간 동기화 vs 타임존
> - NTP가 맞추는 것은 **UTC 기준의 절대 시간**이다.
> - 타임존은 그 시간을 어떻게 표시할지에 대한 설정이므로, NTP와 별개로 `timedatectl set-timezone`으로 지정해야 한다.

---
### 주요 명령어

| 명령어                                   | 설명                    |
| ------------------------------------- | --------------------- |
| `chronyc sources -v`                  | 동기화 대상 서버와 상태 확인      |
| `chronyc tracking`                    | 현재 시간 오차 등 상세 정보 확인   |
| `chronyc makestep`                    | 시간을 즉시 강제로 맞춤         |
| `timedatectl`                         | 현재 시간, 타임존, 동기화 여부 확인 |
| `timedatectl set-timezone Asia/Seoul` | 타임존 변경                |

---