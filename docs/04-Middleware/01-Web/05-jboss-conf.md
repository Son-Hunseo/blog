---
title: JBoss 설치 방법 및 운영환경에서의 주요 설정
description: JBoss EAP 7.4 Standalone 설치부터 인스턴스 구성, Datasource, 세션 클러스터링, 웹 서버 연동까지 정리한 운영 가이드
date: 2026-10-14
sidebar_class_name: hidden-sidebar-item
image: /img/posts/04-Middleware/01-Web/05-jboss-conf/jboss.png
tags:
  - "유형/블로그"
  - "주제/java"
  - "주제/database"
  - "주제/network"
  - "주제/security"
---
---
## 기준

---
### Version 별 지원 Java 및 스펙

| 구분            | 지원 JDK           | EE 스펙                       | 비고                                           |
| ------------- | ---------------- | --------------------------- | -------------------------------------------- |
| JBoss EAP 6.4 | JDK 6 / 7 / 8    | Java EE 6 (`javax.*`)       | 2019-06-30 EOL                               |
| JBoss EAP 7.4 | JDK 8 / 11 / 17  | Jakarta EE 8 (`javax.*`)    | 2025-06-30 EOL, ELS 2027-10-31까지             |
| JBoss EAP 8.0 | JDK 11 / 17 / 21 | Jakarta EE 10 (`jakarta.*`) | 패키지 전환 필요 (`javax` -> `jakarta`), Elytron 전용 |
| JBoss EAP 8.1 | JDK 17 / 21      | Jakarta EE 10 (`jakarta.*`) | 최신 버전, EAP 8 Full Support 2028-02-05까지       |
| WildFly 40    | JDK 17 / 21      | Jakarta EE 11 (`jakarta.*`) | 커뮤니티 버전 (상용 지원 없음)                           |

**이 글 기준**

> JBoss EAP : `7.4.0`
> OracleJDK : `8u401`

---
### 경로 기준

| 구분         | 경로   | 비고                                            |
| ---------- | ---- | --------------------------------------------- |
| Engine 파티션 | /svc | -                                             |
| Log 파티션    | /log | -                                             |
| App 파티션    | /app | 애플리케이션 배포 경로는 따로 구성하는 경우도 있고, 구성하지 않는 경우도 있다. |

| 구분             | 명명규칙                                        | 예시                                |
| -------------- | ------------------------------------------- | --------------------------------- |
| Service HOME   | `/svc`                                      | `/svc`                            |
| WAS HOME       | `{Service HOME}/{3rd Party 기능구분}`           | `/svc/was`                        |
| JBOSS_HOME     | `{WAS HOME}/jboss`                          | `/svc/was/jboss`                  |
| DOMAIN_BASE    | `{WAS HOME}/domains/{Instance name}`        | `/svc/was/domains/test11`         |
| 명령어 HOME       | `{JBOSS_HOME}/bin`                          | `/svc/was/jboss/bin`              |
| JAVA_HOME      | `/usr/java/{JDK}`                           | `/usr/java/jdk8`                  |
| LOG HOME       | `/log/was/jboss/{Instance name}/logs`       | `/log/was/jboss/test11/logs`      |
| NOHUP LOG HOME | `{LOG HOME}/nohup`                          | `/log/was/jboss/test11/logs/nohup`    |
| GC LOG HOME    | `{LOG HOME}/gclog`                          | `/log/was/jboss/test11/logs/gclog`    |
| HEAP DUMP HOME | `{LOG HOME}/heapdump`                       | `/log/was/jboss/test11/logs/heapdump` |
| APP HOME       | `/app/was/{Instance name}`                  | `/app/was/test11`                 |

- 하나의 `JBOSS_HOME`(엔진)을 여러 인스턴스가 공유하고, 인스턴스별 설정(configuration), 로그, 임시파일, 배포 디렉토리는 `DOMAIN_BASE`(`jboss.server.base.dir`)로 분리한다.
- 로그 경로는 `/log` 파티션에 실제 디렉토리를 만들고 `DOMAIN_BASE` 하위에 심볼릭 링크를 건다.

---
## JBoss 설치

> JBoss EAP (RedHat 계정 필요) : https://developers.redhat.com/products/eap/download
> JBoss EAP 지원 JDK / OS / DB : https://access.redhat.com/articles/6961381
> OracleJDK : https://www.oracle.com/kr/java/technologies/downloads/archive/

---
### 기본 설정

**JAVA_HOME 경로 구성**

```bash
tar -xvf jdk-8u401-linux-x64.tar.gz
mkdir -p /usr/java
mv jdk1.8.0_401 /usr/java/
```

- 소스 압축 해제 후 `JAVA_HOME`으로 구성할 디렉토리로 옮긴다.


**JBOSS_HOME 경로 구성**

```bash
mkdir -p /svc/was
unzip jboss-eap-7.4.0.zip
mv jboss-eap-7.4.0 /svc/was/jboss
cd /svc/was
```

- 소스 압축 해제 후 엔진 파티션으로 옮긴다.


**실행 권한 적용** (zip 해제 시 실행 권한이 유실되는 경우가 있기 때문)

```bash
chmod 750 /svc/was/jboss/bin/*.sh
```


**소유 권한 설정**

```bash
useradd -r -s /sbin/nologin jboss
chown -R jboss:jboss /svc/was/jboss
```

---
### 인스턴스(DOMAIN_BASE) 생성

JBoss는 2가지 모드가 있다.

1. **Standalone 모드**: 인스턴스마다 독립된 JVM과 설정 파일(`standalone.xml`)을 가지고 개별로 관리하는 방식.

2. **Domain 모드**: Domain Controller가 여러 서버의 설정과 배포를 Server Group 단위로 중앙에서 관리하는 방식.

**Standalone을 주로 쓰는 이유**: 구조가 단순해 장애 범위가 인스턴스 단위로 격리되고, 스크립트 기반 운영과 컨테이너 환경에 잘 맞기 때문.

이에 이 글에서도 Standalone 기준으로 설명한다.

> cf) 이 글에서 `domains` 디렉토리는 domain 모드라는 것이 아니라 디렉토리 이름이며, 이 글에서 설명하는 JBoss 설정은 Standalone 모드 기준 이다.


**인스턴스 디렉토리 생성 및 필요한 폴더 복사**

```bash
mkdir -p /svc/was/domains/test11

cp -r /svc/was/jboss/standalone/configuration /svc/was/domains/test11/
```


**로그 디렉토리 생성 및 심볼릭 링크**

```bash
mkdir -p /log/was/jboss/test11/logs
mkdir -p /log/was/jboss/test11/logs/gclog
mkdir -p /log/was/jboss/test11/logs/heapdump
mkdir -p /log/was/jboss/test11/logs/nohup
ln -s /log/was/jboss/test11/logs /svc/was/domains/test11/logs
```


**앱 배포 디렉토리 생성**

```bash
mkdir -p /app/was/test11
```


**소유권 및 권한 변경**

```bash
chown -R jboss:jboss /log/was/jboss/test11/logs
chmod 750 /log/was/jboss/test11/logs

chown -R jboss:jboss /app/was/test11
chmod 750 /app/was/test11
```


---
### 커스텀 스크립트

| 스크립트          | 역할                                                                                     |
| ------------- | -------------------------------------------------------------------------------------- |
| `env.sh`      | 인스턴스별 경로, 포트, JVM 옵션 등 환경변수를 정의한다. 다른 운영 스크립트에서 공통으로 참조한다.                             |
| `start.sh`    | `env.sh`를 불러온 뒤 중복 기동 여부를 확인하고, `standalone.sh`를 nohup으로 기동한다.                         |
| `stop.sh`     | `jboss-cli.sh`로 관리 포트에 접속해 `shutdown` 명령으로 정상 종료한다.                                    |
| `kill.sh`     | 정상 종료가 되지 않을 때 `kill -9`로 프로세스를 강제 종료한다.                                               |
| `cli.sh`      | `env.sh`의 `CONTROLLER_IP`, `CONTROLLER_PORT`로 해당 인스턴스 관리 포트에 접속하는 `jboss-cli.sh` 래퍼이다. |
| `add-user.sh` | 관리 콘솔 / CLI 접속용 관리자 계정을 생성한다. 인스턴스별 계정은 `-sc` 옵션으로 인스턴스의 `configuration` 경로를 지정한다.     |

- 모두 JBoss 기본 제공 파일이 아니며, 운영 편의를 위해 구축 시 관례적으로 작성하는 스크립트이다.
- `DOMAIN_BASE/{Instance name}/` 하위에 두며, 실행 시 `. ./env.sh`로 환경변수를 불러온다.
- 인스턴스 구분은 기동 옵션 `-DSERVER={Instance name}`으로 하며, `stop.sh`, `kill.sh`는 이 값으로 대상 프로세스를 찾는다.
- `kill.sh`는 비정상 상황에서만 사용하며, 일반 종료는 `stop.sh`를 사용한다.

---
#### `env.sh` (JBoss EAP 7.x / JDK 8 기준)

```bash
vi /svc/was/domains/test11/env.sh
```

```shell
#!/bin/sh
#JBoss env setting

DATE=`date +%Y%m%d%H%M%S`

##### JBoss Directory Setup #####
export JBOSS_HOME=/svc/was/jboss
export SERVER_NAME=test11
export DOMAIN_BASE=/svc/was/domains/$SERVER_NAME
export JBOSS_LOG_DIR=$DOMAIN_BASE/logs
export JAVA_HOME=/usr/java/jdk1.8.0_401
export GCLOG=$JBOSS_LOG_DIR/gclog/$SERVER_NAME-gc.log.$DATE

##### Configuration File #####
export CONFIG_FILE=standalone-ha.xml          # 단독 구성 시 standalone.xml

export NODE_NAME=$SERVER_NAME
export PORT_OFFSET=0                          # 기본 포트에 offset 만큼 + 됨
export JBOSS_USER=jboss                       # jboss 기동 user

##### Bind Address #####
export BIND_ADDR=192.168.56.106                # http, ajp 사용 ip addr
export MGMT_ADDR=127.0.0.1                     # 관리자 모드 ip addr
#export PRIVATE_ADDR=192.168.56.106            # 세션 클러스터링 사용 시 주석 해제

#export MULTICAST_ADDR=230.1.2.1              # udp cluster ip addr
#export JMS_MULTICAST_ADDR=231.7.2.1          # messaging 기능 이용 시 사용 addr
#export MODCLUSTER_MULTICAST_ADDR=224.0.1.105 # modcluster 사용 ip addr

export CONTROLLER_IP=$MGMT_ADDR               # jboss-cli.sh 에서 사용하는 controller addr
let CONTROLLER_PORT=9990+$PORT_OFFSET
export CONTROLLER_PORT

##### JBoss System module and User module directory #####
export JBOSS_MODULEPATH=$JBOSS_HOME/modules.ext:$JBOSS_HOME/modules

# JVM Options : Server
export JAVA_OPTS="-server $JAVA_OPTS"

# JVM Options : Memory
# JDK 7 이하일 경우 MaxMetaspaceSize -> MaxPermSize 로 변경 필요
export JAVA_OPTS="$JAVA_OPTS -Xms2048m -Xmx2048m -XX:MaxMetaspaceSize=512m"

# JVM Options : GC (JDK 8 기준)
export JAVA_OPTS="$JAVA_OPTS -XX:+UseParallelGC"
export JAVA_OPTS="$JAVA_OPTS -XX:+UseParallelOldGC"
export JAVA_OPTS="$JAVA_OPTS -XX:+DisableExplicitGC"
export JAVA_OPTS="$JAVA_OPTS -verbose:gc -Xloggc:$GCLOG"
export JAVA_OPTS="$JAVA_OPTS -XX:+PrintGCDetails"
export JAVA_OPTS="$JAVA_OPTS -XX:+PrintGCTimeStamps"
export JAVA_OPTS="$JAVA_OPTS -XX:+PrintGCDateStamps"
export JAVA_OPTS="$JAVA_OPTS -XX:+PrintHeapAtGC"

# JVM Options : Heap Dump
export JAVA_OPTS="$JAVA_OPTS -XX:+HeapDumpOnOutOfMemoryError"
export JAVA_OPTS="$JAVA_OPTS -XX:HeapDumpPath=$JBOSS_LOG_DIR/heapdump/$SERVER_NAME-Heapdump.$DATE"

# JVM Options 
export JAVA_OPTS="$JAVA_OPTS -DjvmRoute=$SERVER_NAME"
export JAVA_OPTS="$JAVA_OPTS -Djava.security.egd=file:/dev/./urandom"
export JAVA_OPTS="$JAVA_OPTS -Djava.net.preferIPv4Stack=true"
export JAVA_OPTS="$JAVA_OPTS -Djava.awt.headless=true"
export JAVA_OPTS="$JAVA_OPTS -Dsun.rmi.dgc.client.gcInterval=3600000"
export JAVA_OPTS="$JAVA_OPTS -Dsun.rmi.dgc.server.gcInterval=3600000"
export JAVA_OPTS=" $JAVA_OPTS -Djboss.modules.system.pkgs=org.jboss.byteman,com.javaservice"
export JAVA_OPTS="$JAVA_OPTS -Dorg.jboss.resolver.warning=true"
export JAVA_OPTS="$JAVA_OPTS -Djboss.modules.system.pkgs=org.jboss.byteman"

# JBoss 인스턴스 지정 Options
export JAVA_OPTS="$JAVA_OPTS -Djboss.server.base.dir=$DOMAIN_BASE"
export JAVA_OPTS="$JAVA_OPTS -Djboss.server.log.dir=$JBOSS_LOG_DIR"
export JAVA_OPTS="$JAVA_OPTS -Djboss.socket.binding.port-offset=$PORT_OFFSET"
export JAVA_OPTS="$JAVA_OPTS -Djboss.node.name=$NODE_NAME"
export JAVA_OPTS="$JAVA_OPTS -Djboss.bind.address=$BIND_ADDR"
export JAVA_OPTS="$JAVA_OPTS -Djboss.bind.address.management=$MGMT_ADDR"
#export JAVA_OPTS="$JAVA_OPTS -Djboss.bind.address.private=$PRIVATE_ADDR"    # 세션 클러스터링 사용 시 주석 해제
#export JAVA_OPTS="$JAVA_OPTS -Djboss.default.multicast.address=$MULTICAST_ADDR"
#export JAVA_OPTS="$JAVA_OPTS -Djboss.messaging.group.address=$JMS_MULTICAST_ADDR"

echo "================================================"
echo "JBOSS_HOME=$JBOSS_HOME"
echo "DOMAIN_BASE=$DOMAIN_BASE"
echo "SERVER_NAME=$SERVER_NAME"
echo "CONFIG_FILE=$CONFIG_FILE"
echo "BIND_ADDR=$BIND_ADDR"
echo "PORT_OFFSET=$PORT_OFFSET"
echo "CONTROLLER=$CONTROLLER_IP:$CONTROLLER_PORT"
echo "JBOSS_LOG_DIR=$JBOSS_LOG_DIR"
echo "================================================"
```

- 단독 구성인 경우 `CONFIG_FILE`에 `standalone.xml`을 지정한다.
- 하나의 호스트에 여러 인스턴스가 실행 될 경우 포트가 충돌하지 않게, `PORT_OFFSET` 값을 다르게 지정한다.

---
#### `env.sh` GC 옵션 (JDK 11 /17 사용 시)

> EAP 7.4는 JDK 11/17 도 지원한다. JDK 11 이상을 사용하는 경우 아래 옵션으로 교체한다.
> 
> `-Xloggc`, `-XX:+PrintGC*` 계열 옵션은 JDK 9 부터 Deprecated 되었고 JDK 11 이상에서는 제거되어 그대로 사용하면 `Unrecognized VM option` 으로 기동에 실패한다. 반드시 `-Xlog:gc*` 로 교체한다.
> 
> JDK 9 이상은 기본 GC 가 G1GC 이다.

```shell
export JAVA_HOME=/usr/java/jdk-17

# JVM Options : GC (JDK 11/17 기준)
export JAVA_OPTS="$JAVA_OPTS -XX:+UseG1GC"
export JAVA_OPTS="$JAVA_OPTS -XX:MaxGCPauseMillis=200"
export JAVA_OPTS="$JAVA_OPTS -XX:+DisableExplicitGC"
export JAVA_OPTS="$JAVA_OPTS -Xlog:gc*=info,gc+heap=debug:file=$GCLOG:time,uptime,level,tags"

# JDK 11 이상에서 EAP 7.x 기동 시 아래 옵션이 추가로 필요할 수 있다.
# (JPMS 모듈 캡슐화로 인한 IllegalAccessError 방지. EAP 7.4 의 standalone.conf 에 기본 포함되어 있음)

# export JAVA_OPTS="$JAVA_OPTS --add-exports=java.base/sun.nio.ch=ALL-UNNAMED"
# export JAVA_OPTS="$JAVA_OPTS --add-opens=java.base/java.lang=ALL-UNNAMED"

### java.util.zip JVM Crash Issue (JDK 8 이하)
# 서비스 중인 상태에서 jar 파일이 변경되면 mmap 구현 버그로 JVM crash 가 발생할 수 있다.

#export JAVA_OPTS="$JAVA_OPTS -Dsun.zip.disableMemoryMapping=true"
```

---
#### `env.sh` 옵션 설명

| JBoss Directory Options | Description |
| --- | --- |
| `JBOSS_HOME` | 엔진(바이너리) 설치 경로<br/>여러 인스턴스가 공유 |
| `SERVER_NAME` | 인스턴스 명 설정 |
| `DOMAIN_BASE` | 인스턴스 전용 경로(설정/배포/임시 파일)<br/>`-Djboss.server.base.dir`로 전달 |
| `JBOSS_LOG_DIR` | 인스턴스 로그 디렉토리<br/>`-Djboss.server.log.dir`로 전달 |
| `JAVA_HOME` | Java 설치 경로 설정 |
| `CONFIG_FILE` | 기동 시 사용할 설정 파일<br/>`standalone.xml` : 단독 구성<br/>`standalone-ha.xml` : 세션 클러스터링 구성<br/>`standalone-full.xml` : 메시징(JMS) 포함<br/>`standalone-full-ha.xml` : 메시징 + 클러스터링 |
| `JBOSS_MODULEPATH` | JBoss 모듈 검색 경로<br/>`modules.ext`를 앞에 두어 사용자 모듈을 엔진과 분리 |

| Bind Address Options                  | Description                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BIND_ADDR`                           | HTTP / AJP 등 서비스 포트가 바인딩될 IP (`-b` = `jboss.bind.address`)<br/>`0.0.0.0` 설정은 보안상 지양                                                                                                  |
| `PRIVATE_ADDR`                        | JGroups 클러스터 통신 바인딩 IP (`-bprivate` = `jboss.bind.address.private`)<br/>EAP 7.x 이상 HA 프로파일에만 해당, 미지정 시 `127.0.0.1`이라 클러스터 구성 불가<br/>노드 간 통신 가능한 내부망 IP로 지정 (EAP 6.x는 `BIND_ADDR` 사용) |
| `MGMT_ADDR`                           | 관리 인터페이스 바인딩 IP (`-bmanagement` = `jboss.bind.address.management`)<br/>외부 노출 방지를 위해 `127.0.0.1` 권장                                                                                   |
| `PORT_OFFSET`                         | 동일 서버에 여러 인스턴스를 기동할 때 포트 중복을 피하기 위한 offset (`jboss.socket.binding.port-offset`)<br/>기본 포트 + offset으로 계산됨 (ex. offset 100 → HTTP 8180, 관리 10090)                                      |
| `CONTROLLER_IP`<br/>`CONTROLLER_PORT` | `jboss-cli.sh` 접속 대상<br/>관리 포트는 9990 + `PORT_OFFSET` (EAP 6.x는 native 관리 포트 9999 + `PORT_OFFSET`)                                                                                    |
| `MULTICAST_ADDR`                      | UDP 클러스터링 사용 시 멀티캐스트 주소 (`-u` = `jboss.default.multicast.address`)<br/>클러스터 그룹별로 다른 주소를 사용해야 함                                                                                       |

| JVM Options                                      | Description                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `-Xms2048m` / `-Xmx2048m`                        | 최소 / 최대 힙 메모리 크기 설정<br/>운영 환경에서는 두 값을 동일하게 설정하여 힙 리사이징 비용을 제거                       |
| `-XX:MaxMetaspaceSize`                           | 메타스페이스(클래스 메타 데이터 저장 공간) 최대 크기 설정<br/>미설정 시 native 메모리를 무제한 사용할 수 있음                |
| `-XX:+UseParallelGC`<br/>`-XX:+UseParallelOldGC` | JDK 8 기준 GC 설정<br/>JDK 9 이상은 기본 GC가 G1GC이므로 `-XX:+UseG1GC`를 사용                      |
| `-XX:+DisableExplicitGC`                         | 애플리케이션 코드의 `System.gc()` 호출을 무시<br/>예기치 않은 Full GC 방지                               |
| `-Xloggc:$GCLOG`                                 | GC 로그 파일 경로 지정 (JDK 8)<br/>JDK 11 이상에서는 제거된 옵션이므로 `-Xlog:gc*`로 교체 (2.3.6 절)         |
| `-XX:+PrintGCDetails`                            | 어떤 GC가 실행되었는지 기록                                                                    |
| `-XX:+PrintGCTimeStamps`                         | GC에 걸린 시간 기록                                                                        |
| `-XX:+PrintGCDateStamps`                         | GC 발생 시각을 로그에 기록                                                                    |
| `-XX:+PrintHeapAtGC`                             | GC 발생 전/후 힙 메모리 상태 출력                                                               |
| `-XX:+HeapDumpOnOutOfMemoryError`                | OOM(OutOfMemoryError) 발생 시 힙 덤프 생성                                                  |
| `-XX:HeapDumpPath`                               | 힙덤프 생성 시 덤프파일 저장 경로 설정<br/>힙 크기만큼 디스크를 사용하므로 여유 공간 확인 필요                            |
| `-DjvmRoute`                                     | 클러스터링에서 Sticky Session을 위한 필수 설정<br/>앞단 Apache(mod_jk/mod_cluster) worker 명과 일치해야 함 |
| `-Djava.security.egd=file:/dev/./urandom`        | 기동 시 엔트로피 부족으로 대기 상태에 빠지는 현상을 방지                                                    |
| `-Djava.net.preferIPv4Stack`                     | IPv4 스택 우선 사용<br/>JGroups 클러스터링 시 IPv6로 바인딩되는 문제 방지                                 |
| `-Djava.awt.headless=true`                       | GUI 없는 서버 환경에서 AWT 관련 오류 방지                                                         |

| JBoss Instance Options               | Description                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `-Djboss.server.base.dir`            | 인스턴스의 기준 디렉토리 지정 (configuration, deployments, data, tmp)                              |
| `-Djboss.server.log.dir`             | 인스턴스의 로그 디렉토리 지정<br/>미지정 시 `${jboss.server.base.dir}/log`                             |
| `-Djboss.socket.binding.port-offset` | 모든 소켓 바인딩 포트에 더해질 offset                                                              |
| `-Djboss.node.name`                  | 클러스터 내 노드 식별자<br/>클러스터 내에서 중복되면 안 됨                                                   |
| `-Djboss.bind.address`               | 서비스 포트 바인딩 주소 (= `-b`)                                                                |
| `-Djboss.bind.address.private`       | JGroups 클러스터 통신 바인딩 주소 (= `-bprivate`)<br/>EAP 7.x 이상 HA 프로파일에만 해당, 미지정 시 `127.0.0.1` |
| `-Djboss.bind.address.management`    | 관리 포트 바인딩 주소 (= `-bmanagement`)                                                       |
| `-Djboss.default.multicast.address`  | UDP 클러스터링 멀티캐스트 주소 (= `-u`)<br/>클러스터 그룹별로 다른 주소 사용                                    |

---
#### `start.sh` / `stop.sh` / `kill.sh`

**`start.sh`**

```bash
vi /svc/was/domains/test11/start.sh
```

```shell
#!/bin/sh

DATE=`date +%Y%m%d%H%M%S`

. ./env.sh

PID=`ps -ef | grep java | grep -v grep | grep "\-DSERVER=$SERVER_NAME " | awk '{print $2}'`

if [ ! -z "$PID" ]
then
    echo "JBoss SERVER - $SERVER_NAME is already RUNNING... (PID: $PID)"
    exit 1;
fi

UNAME=`id -u -n`
if [ "$UNAME" != "$JBOSS_USER" ]
then
    echo "Use $JBOSS_USER account to start JBoss SERVER - $SERVER_NAME..."
    exit 1;
fi

for DIR in nohup gclog heapdump
do
    if [ ! -d "$JBOSS_LOG_DIR/$DIR" ]; then
        mkdir -p $JBOSS_LOG_DIR/$DIR
    fi
done

if [ -f "$JBOSS_LOG_DIR/nohup/$SERVER_NAME.out" ]; then
    mv $JBOSS_LOG_DIR/nohup/$SERVER_NAME.out $JBOSS_LOG_DIR/nohup/$SERVER_NAME.out.$DATE
fi

nohup $JBOSS_HOME/bin/standalone.sh -DSERVER=$SERVER_NAME -c $CONFIG_FILE \
      >> $JBOSS_LOG_DIR/nohup/$SERVER_NAME.out 2>&1 &

if [ "$1" = "notail" ]
then
    echo "Starting... $SERVER_NAME"
    exit 0;
fi

tail -f $JBOSS_LOG_DIR/server.log
```


**`stop.sh`**

```bash
vi /svc/was/domains/test11/stop.sh
```

```shell
#!/bin/sh

. ./env.sh

UNAME=`id -u -n`
if [ "$UNAME" != "$JBOSS_USER" ]
then
    echo "Use $JBOSS_USER account to stop JBoss SERVER - $SERVER_NAME..."
    exit 1;
fi

JPID=`ps -ef | grep java | grep -v grep | grep "\-DSERVER=$SERVER_NAME " | awk '{print $2}'`

if [ -z "$JPID" ]; then
    echo "====================================="
    echo "$SERVER_NAME is not running"
    echo "====================================="
else
    $JBOSS_HOME/bin/jboss-cli.sh --controller=$CONTROLLER_IP:$CONTROLLER_PORT \
        --connect --commands=shutdown $@

    echo "====================================="
    echo "$SERVER_NAME is shutdown by $UNAME"
    echo "====================================="
fi
```


**`kill.sh`** (`stop.sh` 가 실패한 경우에만 사용)

```bash
vi /svc/was/domains/test11/kill.sh
```

```shell
#!/bin/sh

. ./env.sh

UNAME=`id -u -n`
if [ "$UNAME" != "$JBOSS_USER" ]
then
    echo "Use $JBOSS_USER account to stop JBoss SERVER - $SERVER_NAME..."
    exit 1;
fi

JPID=`ps -ef | grep java | grep -v grep | grep "\-DSERVER=$SERVER_NAME " | awk '{print $2}'`

if [ -z "$JPID" ]; then
    echo "$SERVER_NAME is not running"
else
    kill -9 $JPID
    echo "$SERVER_NAME is killed by $UNAME"
fi
```

---
#### `cli.sh` / `add-user.sh`

**`cli.sh`**

```bash
vi /svc/was/domains/test11/cli.sh
```

```shell
#!/bin/sh

. ./env.sh

export JAVA_OPTS=" -Djava.awt.headless=false $JAVA_OPTS"

$JBOSS_HOME/bin/jboss-cli.sh --controller=$CONTROLLER_IP:$CONTROLLER_PORT --connect $@
```


**`add-user.sh`**

```bash
vi /svc/was/domains/test11/add-user.sh
```

```shell
#!/bin/sh

. ./env.sh

$JBOSS_HOME/bin/add-user.sh \
    --user-properties $DOMAIN_BASE/configuration/mgmt-users.properties \
    --group-properties $DOMAIN_BASE/configuration/mgmt-groups.properties
```


**소유권 및 권한 변경**

```bash
chown -R jboss:jboss /svc/was/domains/test11
chmod 750 /svc/was/domains/test11/*.sh
```

---
### Log Rotate

> JBoss 의 server.log 는 logging 서브시스템의 periodic-rotating-file-handler 로 일자별 rotate 되지만, nohup(out) 로그와 gc 로그는 OS 단에서 logrotate 설정이 필요하다.

```bash
vi /etc/logrotate.d/jboss_test11
```

```conf
/svc/was/domains/test11/logs/nohup/*.out {
copytruncate
daily
rotate 365
missingok
notifempty
dateext
}

/svc/was/domains/test11/logs/gclog/*.log {
copytruncate
daily
rotate 365
missingok
notifempty
dateext
}
```

| Log Rotate Options | Description |
| --- | --- |
| `copytruncate` | 로그 파일을 복사한 뒤, 원본 파일 비우기 처리<br/>JBoss 프로세스가 파일 핸들을 계속 잡고 있으므로 필수 |
| `daily` | 로그 파일 날짜별 변환 주기<br/>`daily` : 매일<br/>`weekly` : 매주<br/>`monthly` : 매달 |
| `rotate 365` | 로그 파일 저장 개수 설정<br/>설정한 개수가 넘어가면 오래된 순서부터 삭제 |
| `missingok` | 로그 파일이 없더라도 오류를 발생시키지 않음 |
| `notifempty` | 로그 파일이 비어 있으면 새로운 로그 파일을 생성하지 않음 |
| `dateext` | rotate 된 로그 파일 이름에 날짜를 붙임 |

---
### JBoss 튜닝

> XML 의 xmlns 스키마 버전(`urn:jboss:domain:*:N.N`)은 JBoss 버전마다 다르다. 설치된 `standalone-ha.xml` 에 기재된 값을 그대로 유지하고 하위 요소만 수정한다.

> `standalone.xml`은 단일 인스턴스 운영을 위한 기본 구성이다. `standalone-ha.xml`은 여기에 JGroups 기반 클러스터링 서브시스템이 추가된 구성으로, 인스턴스 간 세션 복제와 캐시 공유를 지원한다.
> 
> **`standalone-ha.xml`은 `standalone.xml`의 모든 설정 구성을 포함한다.**

> 수정 대상은 기동 시 `-c` 옵션(`CONFIG_FILE`)으로 지정한 파일 하나이며, `JBOSS_HOME/standalone/configuration`이 아닌 `DOMAIN_BASE/{Instance name}/configuration` 하위의 파일을 수정한다. 기동 중에는 JBoss가 설정 변경 시 파일을 덮어쓰므로 직접 편집하지 않고 `cli.sh`(`jboss-cli.sh`)로 변경한다.

> 이 글에서는 다중 인스턴스를 가정하고, `standalone-ha.xml`을 수정한다.

---
#### Thread Pool

> JBoss EAP 7.x / 8.x, WildFly 는 `io` 서브시스템의 `worker` 가 스레드를 관리한다.
> `task-max-threads` : 최대 worker task thread 수 (기본값 : cpu core x 16)
> `io-threads` : 해당 worker 의 io thread 수 (기본값 : cpu core x 2)
> `stack-size` : worker thread 의 스택 크기 (0 = JVM 기본값)

```bash
vi /svc/was/domains/test11/configuration/standalone-ha.xml
```

```xml
...
<subsystem xmlns="urn:jboss:domain:io:3.0">
    <worker name="default">
    <worker name="http-worker" task-max-threads="2000"/>
    <buffer-pool name="default"/>
</subsystem>
...
```

- undertow 서브시스템에서 위 worker 를 참조한다.

```xml
<subsystem xmlns="urn:jboss:domain:undertow:7.0" default-server="default-server" default-virtual-host="default-host" default-servlet-container="default" default-security-domain="other">
    <buffer-cache name="default"/>
    <server name="default-server">
	    <ajp-listener name="ajp" socket-binding="ajp" worker="http-worker"/>
        <http-listener name="default" socket-binding="http" redirect-socket="https" enable-http2="true" worker="http-worker"/>
        <https-listener name="https" socket-binding="https" security-realm="ApplicationRealm" enable-http2="true"/>
        <host name="default-host" alias="localhost">
            <http-invoker security-realm="ApplicationRealm"/>
        </host>
    </server>        
...
```

| io subsystem Options | Description |
| --- | --- |
| `io-threads` | 해당 worker의 IO(non-blocking) 스레드 수<br/>기본값 : CPU core x 2<br/>커넥션 수락 및 소켓 read/write 담당 |
| `task-max-threads` | 요청을 실제로 처리하는 worker task 스레드의 최대 수<br/>기본값 : CPU core x 16<br/>Tomcat의 `maxThreads`와 대응되는 개념 |
| `task-core-threads` | 기동 시 유지할 core 스레드 수 |
| `task-keepalive` | 유휴 스레드가 회수되기까지의 시간(ms) |

| undertow Options | Description |
| --- | --- |
| `max-post-size` | HTTP POST 요청 본문의 최대 크기(byte)<br/>0은 무제한을 의미<br/>기본값 : 10485760 (10MB) |
| `max-parameters` | 요청당 허용되는 최대 파라미터 개수<br/>Hash collision DoS 방어 목적 |
| `no-request-timeout` | 연결 후 요청을 보내지 않는 커넥션을 끊는 시간(ms)<br/>Tomcat의 `connectionTimeout`과 유사 |
| `disallowed-methods` | 차단할 HTTP 메소드<br/>보안 점검 항목(TRACE, OPTIONS 차단) |
| `enable-http2` | HTTP/2 프로토콜 지원 활성화 |
| `statistics-enabled` | 서브시스템 통계 수집 여부<br/>운영 중 성능 분석 시 활성화하되, 상시 활성화는 오버헤드 발생 |
| `session-cookie`<br/>`http-only` / `secure` | JSESSIONID 쿠키에 HttpOnly / Secure 속성 부여<br/>`secure="true"`는 HTTPS 구간에서만 사용 |
| `access-log pattern` | `%h` 클라이언트 IP, `%t` 요청 시각, `%r` 요청 라인, `%s` 응답 코드,<br/>`%b` 응답 바이트, `%D` 처리 시간(ms) |

---
#### JBoss Module 추가 (JDBC Driver)

| DB      | 모듈 경로                                                         |
| ------- | ------------------------------------------------------------- |
| Oracle  | `/svc/was/jboss/modules/system/layers/base/com/oracle/main`   |
| MySQL   | `/svc/was/jboss/modules/system/layers/base/com/mysql/main`    |
| MariaDB | `/svc/was/jboss/modules/system/layers/base/org/mariadb/main`  |
| CUBRID  | `/svc/was/jboss/modules/system/layers/base/com/cubrid/main`   |

**방법 1 - 기존 module 디렉토리 하위에 추가**

```bash
mkdir -p /svc/was/jboss/modules/system/layers/base/com/mysql/main
cp mysql-connector-j-8.0.33.jar  /svc/was/jboss/modules/system/layers/base/com/mysql/main/
vi /svc/was/jboss/modules/system/layers/base/com/mysql/main/module.xml
```

```xml
<module xmlns="urn:jboss:module:1.9" name="com.mysql">
  <resources>
    <resource-root path="mysql-connector-j-8.0.33.jar"/>
  </resources>
  <dependencies>
    <module name="javax.api"/>
    <module name="javax.transaction.api"/>
  </dependencies>
</module>
```


**방법 2 - modules.ext 로 엔진과 분리 (엔진 업그레이드 시 재사용)**

- `env.sh`에 아래 내용이 포함되어 있어야 한다.

```shell
export JBOSS_MODULEPATH=$JBOSS_HOME/modules.ext:$JBOSS_HOME/modules
export JAVA_OPTS="$JAVA_OPTS -Djboss.modules.dir=$JBOSS_MODULEPATH"
```

```bash
mkdir -p /svc/was/jboss/modules.ext/com/mysql/main
cp mysql-connector-j-8.0.33.jar /svc/was/jboss/modules.ext/com/mysql/main/
vi /svc/was/jboss/modules.ext/com/mysql/main/module.xml
```

```xml
<module xmlns="urn:jboss:module:1.9" name="com.mysql">
  <resources>
    <resource-root path="mysql-connector-j-8.0.33.jar"/>
  </resources>
  <dependencies>
    <module name="javax.api"/>
    <module name="javax.transaction.api"/>
  </dependencies>
</module>
```


**드라이버 등록**

`standalone-ha.xml`

```xml
<drivers>
    <driver name="mysql" module="com.mysql">
        <driver-class>com.mysql.cj.jdbc.Driver</driver-class>
        <xa-datasource-class>com.mysql.cj.jdbc.MysqlXADataSource</xa-datasource-class>
    </driver>
</drivers>
```

| DB         | 모듈 / 드라이버 정보                                                                                                                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Oracle     | 디렉토리 : `.../com/oracle/main` (`name="com.oracle"`)<br/>jar : `ojdbc8.jar` (또는 `ojdbc11.jar`)<br/>driver-class : `oracle.jdbc.OracleDriver`<br/>xa-class : `oracle.jdbc.xa.client.OracleXADataSource`                                                                                                                                               |
| MySQL      | 디렉토리 : `.../com/mysql/main` (`name="com.mysql"`)<br/>jar : `mysql-connector-j-8.0.33.jar`<br/>driver-class : `com.mysql.cj.jdbc.Driver`<br/>xa-class : `com.mysql.cj.jdbc.MysqlXADataSource`                                                                                                                                                       |
| MariaDB    | 디렉토리 : `.../org/mariadb/main` (`name="org.mariadb"`)<br/>jar : `mariadb-java-client-3.3.3.jar`<br/>driver-class : `org.mariadb.jdbc.Driver`                                                                                                                                                                                                        |
| MSSQL      | 디렉토리 : `.../com/microsoft/sqlserver/jdbc/main` (`name="com.microsoft.sqlserver.jdbc"`)<br/>jar : `mssql-jdbc-12.6.1.jre11.jar`<br/>driver-class : `com.microsoft.sqlserver.jdbc.SQLServerDriver`<br/>xa-class : `com.microsoft.sqlserver.jdbc.SQLServerXADataSource`<br/>`module.xml`에 `<module name="javax.servlet.api" optional="true"/>` 의존성 추가 |
| PostgreSQL | 디렉토리 : `.../org/postgresql/main` (`name="org.postgresql"`)<br/>jar : `postgresql-42.7.3.jar`<br/>driver-class : `org.postgresql.Driver`                                                                                                                                                                                                            |

---
#### Datasource 설정

`standalone-ha.xml`

```xml
...
<subsystem xmlns="urn:jboss:domain:datasources:6.0">
    <datasources>
        <datasource jndi-name="java:jboss/datasources/ExamDS"
                    pool-name="ExamDS" enabled="true" use-java-context="true"
                    use-ccm="true" statistics-enabled="true">
            <connection-url>jdbc:mysql://192.168.56.106:3306/testdb</connection-url>
            <driver>mysql</driver>
            <pool>
                <min-pool-size>20</min-pool-size>
                <initial-pool-size>20</initial-pool-size>
                <max-pool-size>100</max-pool-size>
                <prefill>true</prefill>
                <flush-strategy>IdleConnections</flush-strategy>
            </pool>
            <security>
                <user-name>admin</user-name>
                <password>admin123</password>
            </security>
            <validation>
                <valid-connection-checker class-name="org.jboss.jca.adapters.jdbc.extensions.mysql.MySQLValidConnectionChecker"/>
                <exception-sorter class-name="org.jboss.jca.adapters.jdbc.extensions.mysql.MySQLExceptionSorter"/>
                <validate-on-match>true</validate-on-match>
                <background-validation>false</background-validation>
            </validation>
            <timeout>
                <blocking-timeout-millis>10000</blocking-timeout-millis>
                <idle-timeout-minutes>5</idle-timeout-minutes>
                <query-timeout>60</query-timeout>
            </timeout>
            <statement>
                <prepared-statement-cache-size>32</prepared-statement-cache-size>
                <share-prepared-statements>true</share-prepared-statements>
            </statement>
        </datasource>
    </datasources>
</subsystem>
...
```

**데이터 소스 옵션**

| 기본 설정                | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `jndi-name`          | JNDI 리소스 이름<br/>`java:jboss/datasources/` 하위에 등록하는 것이 표준      |
| `pool-name`          | 커넥션 풀 이름<br/>관리 콘솔 및 통계 조회 시 사용                               |
| `connection-url`     | DB 접속 URL (IP, Port, DB명 지정)                                  |
| `driver`             | 2.4.3 에서 등록한 driver name과 일치해야 함                              |
| `use-java-context`   | `java:` 네임스페이스 바인딩 여부 (표준 `true`)                             |
| `use-ccm`            | Cached Connection Manager 사용<br/>미반납 커넥션 추적/자동 회수 (권장 `true`) |
| `statistics-enabled` | 풀 통계 수집 여부<br/>운영 진단에 유용, 상시 활성 시 약간의 부하                      |
| `enabled`            | datasource 활성화 여부                                             |

| 커넥션 풀 크기 | Description |
| --- | --- |
| `min-pool-size` | 풀에 항상 유지할 최소 커넥션 수 |
| `initial-pool-size` | 풀 생성 시 최초로 만들 커넥션 수<br/>초기 커넥션 생성 시간 단축에 유리 |
| `max-pool-size` | 풀이 가질 수 있는 최대 커넥션 수<br/>DB `max_connections` 및 인스턴스 수를 고려해 산정 |
| `prefill` | 기동 시점에 `min-pool-size`만큼 커넥션을 미리 생성 |
| `flush-strategy` | 커넥션 오류 발생 시 풀을 비우는 전략<br/>`IdleConnections` : 유휴 커넥션만 정리(권장) |

| 커넥션 검증                         | Description                                                            |
| ------------------------------ | ---------------------------------------------------------------------- |
| `valid-connection-checker`     | 커넥션 유효성을 검사하는 DB 전용 클래스<br/>SELECT 쿼리 대신 드라이버 레벨에서 검사 (권장)             |
| `exception-sorter`             | SQLException을 치명/비치명으로 분류하는 DB 전용 클래스<br/>치명 오류 커넥션만 풀에서 제거            |
| `stale-connection-checker`     | 오래된(stale) 커넥션을 판별하는 클래스 (Oracle 등)                                    |
| `check-valid-connection-sql`   | 유효성 검사 쿼리 (checker 미사용 시 대안)<br/>Oracle : `SELECT 1 FROM DUAL`         |
| `background-validation`        | 백그라운드 스레드가 주기적으로 커넥션 유효성 검사<br/>`validate-on-match` 대비 부하가 적어 운영 환경 권장 |
| `background-validation-millis` | 백그라운드 검증 주기(ms)<br/>DB 및 방화벽의 idle timeout 보다 짧게 설정                    |
| `validate-on-match`            | 커넥션을 가져올 때마다 유효성 검사<br/>정확하지만 부하가 커 checker 사용 시 `false` 권장            |

| Timeout | Description |
| --- | --- |
| `blocking-timeout-millis` | 커넥션이 부족할 때 최대 대기 시간(ms), 초과 시 예외 |
| `idle-timeout-minutes` | 유휴 커넥션 제거 시간(분)<br/>방화벽/DB의 idle 세션 종료보다 짧게 → stale connection 방지 |
| `query-timeout` | 쿼리 최대 수행 시간(초) |

| Statement | Description |
| --- | --- |
| `prepared-statement-cache-size` | 커넥션당 PreparedStatement 캐시 개수 (0 = 캐시 안 함) |
| `share-prepared-statements` | 동일 트랜잭션 내 PreparedStatement 재사용 |

| XA | Description |
| --- | --- |
| `is-same-rm-override` | 동일 리소스 매니저 여부를 강제 지정 (XA 최적화) |
| `xa-datasource-property` | XA 드라이버 속성<br/>`ServerName` / `DatabaseName` / `PortNumber` 등 |

| 보안 | Description |
| --- | --- |
| `credential-reference` | Elytron credential-store에 저장된 암호를 참조<br/>XML 내 평문 비밀번호 노출 방지 |


**`<validation>`**

| 검증 방식               | 설정 / 설명                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (A) checker 방식 (권장) | `valid-connection-checker` + `exception-sorter`<br/>`validate-on-match=true`, `background-validation=false`<br/>DB 전용 클래스로 장애 감지가 정확                                                                                                    |
| (B) SQL 방식          | `<check-valid-connection-sql>SELECT 1</check-valid-connection-sql>`<br/>(Oracle은 `SELECT 1 FROM DUAL`)<br/>`validate-on-match=false`, `background-validation=true`<br/>`background-validation-millis=30000` (DB/방화벽 idle timeout 보다 짧게) |


**DB별 `<connection-url>` / `<connection-checker>`**

| DB | connection-url / connection-checker |
| --- | --- |
| MySQL | url : `jdbc:mysql://192.168.56.106:3306/testdb`<br/>checker : `...extensions.mysql.MySQLValidConnectionChecker`<br/>sorter : `...extensions.mysql.MySQLExceptionSorter` |
| MariaDB | url : `jdbc:mariadb://192.168.56.106:3306/testdb`<br/>`driver=mariadb`, checker는 mysql 계열 사용 |
| Oracle | url : `jdbc:oracle:thin:@//192.168.56.106:1521/EXAM`<br/>checker : `...extensions.oracle.OracleValidConnectionChecker`<br/>stale : `...extensions.oracle.OracleStaleConnectionChecker`<br/>sorter : `...extensions.oracle.OracleExceptionSorter` |
| MSSQL | url : `jdbc:sqlserver://192.168.56.106:1433;databaseName=testdb;encrypt=true;trustServerCertificate=true`<br/>checker : `...extensions.mssql.MSSQLValidConnectionChecker` |
| PostgreSQL | url : `jdbc:postgresql://192.168.56.106:5432/testdb`<br/>checker : `...extensions.postgres.PostgreSQLValidConnectionChecker` |
| Oracle RAC | `jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS_LIST=(LOAD_BALANCE=off)(FAILOVER=on)`<br/>`(ADDRESS=(PROTOCOL=TCP)(HOST=xxx.xxx.xxx.xxx)(PORT=1521))`<br/>`(ADDRESS=(PROTOCOL=TCP)(HOST=yyy.yyy.yyy.yyy)(PORT=1521)))`<br/>`(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=ORCL)`<br/>`(FAILOVER_MODE=(TYPE=SELECT)(METHOD=BASIC))))` |


**비밀번호 암호화** - Elytron credential-store

1. `datasource`에서 참조하는 경우
	- 기존 Datasource 설정에서 `security` 블록만 아래처럼 변경

```xml
<security>
    <user-name>admin</user-name>
    <credential-reference store="csstore" alias="dbpw"/>
</security>
```

2. 애플리케이션(`web.xml`)에서 참조하는 경우

```xml
<resource-ref>
    <res-ref-name>jdbc/ExamDS</res-ref-name>
    <res-type>javax.sql.DataSource</res-type>
    <res-auth>Container</res-auth>
</resource-ref>
```


**연결 테스트**
- `cli.sh` 실행 후 아래 명령어 입력 (`cli.sh`는 `start.sh`로 인스턴스 실행 중에 가능)

```bash
/subsystem=datasources/data-source=ExamDS:test-connection-in-pool
```

---
#### XA Datasource 설정

> 하나의 트랜잭션이 여러 리소스(DB 2개, 또는 DB + JMS 등)에 걸칠 때, 전부 커밋되거나 전부 롤백되도록 보장하는 DataSource이다.

`standalone-ha.xml`

```xml
<xa-datasource jndi-name="java:jboss/datasources/ExamXADS" pool-name="ExamXADS">
    <driver>mssql</driver>
    <xa-datasource-property name="ServerName">192.168.56.106</xa-datasource-property>
    <xa-datasource-property name="DatabaseName">testdb</xa-datasource-property>
    <xa-datasource-property name="PortNumber">1433</xa-datasource-property>
    <security>
        <user-name>test</user-name>
        <password>test123</password>
    </security>
    <xa-pool>
        <min-pool-size>10</min-pool-size>
        <max-pool-size>20</max-pool-size>
        <is-same-rm-override>true</is-same-rm-override>
        <prefill>true</prefill>
    </xa-pool>
    <validation>
        <valid-connection-checker class-name="org.jboss.jca.adapters.jdbc.extensions.mssql.MSSQLValidConnectionChecker"/>
    </validation>
</xa-datasource>
```

---
#### 외부 디렉토리 Deploy 설정

- `fs-archive`  : 아카이브(war/ear/jar) 파일 하나를 지정
- `fs-exploded` : 압축이 해제된 디렉토리를 지정

**war 파일(아카이브)을 배포하는 방법**

`standalone-ha.xml`

```xml
<deployments>
    <deployment name="test.war" runtime-name="test.war">
        <fs-archive path="/app/was/test11/test.war"/>
    </deployment>
</deployments>
```


**압축 해제된 디렉토리 전체를 배포하는 방법**

`standalone-ha.xml`

```xml
<deployments>
    <deployment name="test.war" runtime-name="test.war">
        <fs-exploded path="/app/was/test11/test"/>
    </deployment>
</deployments>
`````

---
#### cf) JBoss의 인터페이스

**JBoss의 기본 인터페이스 3가지**

|인터페이스|역할|기본 바인딩 주소|
|---|---|---|
|`management`|관리 콘솔, CLI 통신|127.0.0.1|
|`public`|HTTP, HTTPS, AJP 등 서비스 통신|127.0.0.1|
|`private`|JGroups 클러스터 내부 통신|127.0.0.1|


**JBoss EAP 버전별 인터페이스 비교**

| 구분               | JBoss EAP 6.x                | JBoss EAP 7.x        | JBoss EAP 8.x        |
| ---------------- | ---------------------------- | -------------------- | -------------------- |
| `management`     | 관리 통신                        | 관리 통신                | 관리 통신                |
| `public`         | 서비스 및 JGroups 통신             | 서비스 통신               | 서비스 통신               |
| `private`        | 기본 미정의                       | JGroups 통신 (HA 프로파일) | JGroups 통신 (HA 프로파일) |
| `unsecure`       | IIOP 통신 (full 프로파일)          | IIOP 통신 (full 프로파일)  | IIOP 통신 (full 프로파일)  |
| JGroups 기본 인터페이스 | `public` (default-interface) | `private`            | `private`            |

> 이에, 6.x 버전에서는 Session Clustering 을 사용하더라도, `env.sh`에 `private` 인터페이스 관련 설정 2줄 주석해제를 안해도 된다.

---
### Session Clustering

JBoss 에서는 `jgroups` 와 `infinispan` 모듈을 사용하여 session clustering 설정이 가능하다. `jgroups` 모듈로 클러스터 멤버를 구성하고, `infinispan` 모듈로 캐싱 컨테이너를 생성하여 해당 캐싱 컨테이너에 세션을 캐싱한다.

세션 클러스터링을 사용하려면 `standalone-ha.xml` 또는 `standalone-full-ha.xml`로 기동해야 하며, 어플리케이션(`web.xml`)에 `<distributable/>` 태그가 선언되어 있어야 한다.

| JGroups Options           | Description                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `channel cluster`         | 클러스터 그룹 이름<br/>같은 이름을 가진 노드끼리 하나의 클러스터를 구성<br/>동일 네트워크에 여러 클러스터가 있으면 반드시 다르게 설정        |
| `stack`                   | 사용할 프로토콜 스택 (udp / tcp)<br/>폐쇄망은 tcp 를 표준으로 함                                          |
| `TCPPING initial_hosts`   | 기동 시 클러스터 가입을 위해 접속을 시도할 멤버 목록<br/>`IP[포트]` 형식이며 모든 노드에 동일하게 기재<br/>자기 자신도 포함하는 것이 일반적 |
| `TCPPING port_range`      | `initial_hosts` 의 포트를 기준으로 +N 범위까지 탐색<br/>0 이면 지정한 포트만 조회                              |
| `TCPGOSSIP initial_hosts` | GossipRouter 의 주소 목록<br/>멤버 IP 를 사전에 알 수 없는 환경에서 사용                                    |
| `MPING`                   | 멀티캐스트 기반 discovery<br/>멀티캐스트가 허용된 환경에서만 동작                                             |
| `MERGE3`                  | 네트워크 분리(split-brain) 후 클러스터를 다시 병합                                                     |
| `FD_SOCK` / `FD_ALL`      | 멤버 장애 감지(Failure Detection)<br/>JGroups 버전에 따라 `FD_SOCK2` / `FD_ALL3` 로 명칭 변경          |

---
#### `env.sh`

아래 두 설정을 주석해제한다. 

`jgroups` 모듈은 EAP 7.x 버전부터 기본적으로 `private` 인터페이스를 사용하는데, 이를 기본값인 `127.0.0.1` 로 놔두게되면 다른 노드의 인스턴스끼리는 서로를 찾을 수 없어 세션 클러스터링이 작동하지 않는다.

```shell
export PRIVATE_ADDR=192.168.56.106
export JAVA_OPTS="$JAVA_OPTS -Djboss.bind.address.private=$PRIVATE_ADDR"
```

---
#### TCP Session Cluster (TCPPING)

> 대부분의 많은 환경에서는 멀티캐스트가 차단되어있다. 이경우 TCP 유니캐스트를 사용한다.

```bash
vi /svc/was/domains/configuration/standalone-ha.xml
```


**채널의 stack을 udp -> tcp 로 변경**

```xml
(AS-IS)
<channels default="ee">
    <channel name="ee" stack="udp" cluster="ejb"/>
</channels>

(TO-BE)
<channels default="ee">
    <channel name="ee" stack="tcp" cluster="ejb"/>
</channels>
```


**tcp stack의 discovery 프로토콜을 MPING(멀티캐스트) -> TCPPING(유니캐스트)으로 교체**

```xml
(AS - IS)
<stack name="tcp">
    <transport type="TCP" socket-binding="jgroups-tcp"/>
    <socket-protocol type="MPING" socket-binding="jgroups-mping"/>
    <protocol type="MERGE3"/>
    <protocol type="FD_SOCK"/>
    <protocol type="FD_ALL"/>
    <protocol type="VERIFY_SUSPECT"/>
    <protocol type="pbcast.NAKACK2"/>
    <protocol type="UNICAST3"/>
    <protocol type="pbcast.STABLE"/>
    <protocol type="pbcast.GMS"/>
    <protocol type="MFC"/>
    <protocol type="FRAG3"/>
</stack>

(TO - BE)
<stack name="tcp">
    <transport type="TCP" socket-binding="jgroups-tcp"/>
    <protocol type="TCPPING">
        <!-- 기동 시 클러스터 그룹에 가입하기 위한 서버 주소 목록 -->
        <!-- 아래 설정은 같은 호스트에 offset 0과 100일 경우를 가정한 설정 -->
      <property name="initial_hosts">192.168.56.106[7600],192.168.56.106[7700]</property>
      <property name="port_range">0</property>
    </protocol>
    <protocol type="MERGE3"/>
    <protocol type="FD_SOCK"/>
    <protocol type="FD_ALL"/>
    <protocol type="VERIFY_SUSPECT"/>
    <protocol type="pbcast.NAKACK2"/>
    <protocol type="UNICAST3"/>
    <protocol type="pbcast.STABLE"/>
    <protocol type="pbcast.GMS"/>
    <protocol type="MFC"/>
    <protocol type="FRAG3"/>
</stack>
```

---
#### UDP Session Cluster (Multicast)

**`env.sh`**

- 아래 두 설정을 주석 해제하고 원하는 그룹별 멀티캐스트 IP를 각각 설정한다.
- 클러스터 그룹이 여러 개인 경우 그룹마다 다른 멀티캐스트 주소를 사용해야 한다.
- 스위치/방화벽에서 IGMP 및 멀티캐스트가 허용되어 있어야 한다.

```shell
export MULTICAST_ADDR=230.1.2.1
export JAVA_OPTS="$JAVA_OPTS -Djboss.default.multicast.address=$MULTICAST_ADDR"
```

---
#### TCPGOSSIP (GossipRouter) 구성

- 클라우드 환경과 같이 scale up/out 이 발생하여 멤버 IP 를 사전에 알 수 없는 환경에 적합한 구성이다.
- GossipRouter 프로세스가 멤버 목록을 중계하므로, GossipRouter 는 이중화하여 SPOF 를 제거한다.
- GossipRouter는 멀티캐스트가 막힌 환경에서 JGroups 노드들이 서로를 찾을 수 있도록 멤버 목록을 중계하는, EAP와 별도로 기동하는 독립 JVM 프로세스이다. (JBoss 와 별개 프로세스)
- cf) 쉽게 말하면, redis와 같이 세션 클러스터링을 위한 별도의 프로세스인데 거의 쓰지 않는 구성이다. (이걸 사용하느니 redis를 사용용)


**GossipRouter 디렉토리 생성**

```bash
mkdir -p /svc/was/domains/test/tcpgossip
cd /svc/was/domains/test/tcpgossip
```


**log4j jar 다운로드**

- log4j 를 다운 받아서 만든 폴더 안에 넣어야한다. (이 글에서는 `2.24.3` 버전 기준으로 진행)
	- log4j-api : https://repo1.maven.org/maven2/org/apache/logging/log4j/log4j-api/
	- log4j-core : https://repo1.maven.org/maven2/org/apache/logging/log4j/log4j-core/
- 위 두 파일을 `/svc/was/domains/test/tcpgossip` 에 넣는다.


**log4j2.xml 파일 생성**

```bash
vi /svc/was/domains/test/tcpgossip/log4j2.xml
```

- 이 설정은 일 단위로 로그 파일을 롤링하고 30일이 지난 파일은 삭제한다.
- 노드 등록이나 해제를 자세히 보고 싶으면 `org.jgroups` 레벨을 `DEBUG`로 올리면 된다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Configuration status="WARN">
    <Properties>
        <Property name="LOG_DIR">/svc/was/domains/test/tcpgossip/logs</Property>
        <Property name="PATTERN">%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%t] %c{1} - %msg%n</Property>
    </Properties>

    <Appenders>
        <RollingFile name="FILE"
                     fileName="${LOG_DIR}/gossiprouter.log"
                     filePattern="${LOG_DIR}/gossiprouter.log.%d{yyyy-MM-dd}">
            <PatternLayout pattern="${PATTERN}"/>
            <Policies>
                <TimeBasedTriggeringPolicy/>
            </Policies>
            <DefaultRolloverStrategy>
                <Delete basePath="${LOG_DIR}" maxDepth="1">
                    <IfFileName glob="gossiprouter.log.*"/>
                    <IfLastModified age="30d"/>
                </Delete>
            </DefaultRolloverStrategy>
        </RollingFile>
    </Appenders>

    <Loggers>
        <Logger name="org.jgroups" level="INFO"/>
        <Root level="WARN">
            <AppenderRef ref="FILE"/>
        </Root>
    </Loggers>
</Configuration>
```


**GossipRouter 용 `env.sh` 생성**

```bash
vi /svc/was/domains/test/tcpgossip/env.sh
```

```shell
#!/bin/sh
# JBoss tcpgossip router setting

##### JBoss Directory Setup #####
export JBOSS_HOME=/svc/was/jboss
export LOG4J_BASE=/svc/was/domains/test/tcpgossip
export JAVA_HOME=/usr/java/jdk1.8.0_401

##### log4j Configuration File #####
export CONFIG_FILE=log4j2.xml

##### Jar file (설치된 버전에 맞게 경로 확인) #####
export JGROUP=`ls $JBOSS_HOME/modules/system/layers/base/org/jgroups/main/jgroups-*.jar`
export LOG4J_API=$LOG4J_BASE/log4j-api-2.24.3.jar
export LOG4J_CORE=$LOG4J_BASE/log4j-core-2.24.3.jar

##### user setting #####
export JBOSS_USER=jboss

##### Bind Address #####
export BIND_ADDR=192.168.56.106
export BIND_PORT=12001
```


**GossipRouter 용 `start.sh` 생성**

```bash
vi /svc/was/domains/test/tcpgossip/start.sh
```

```shell
#!/bin/sh

. ./env.sh

nohup $JAVA_HOME/bin/java -Dlog4j.configurationFile=$CONFIG_FILE \
      -cp $JGROUP:$LOG4J_API:$LOG4J_CORE org.jgroups.stack.GossipRouter \
      -bindaddress $BIND_ADDR -port $BIND_PORT >> gossip.out 2>&1 &
```


**서버 인스턴스의 `standalone-ha.xml` 설정**

- 아래 설정은 GossipRouter를 이중화 했다고 가정했기 때문에 `initial_hosts`에 2개가 들어가는 것이다.

```xml
<channels default="ee">
    <channel name="ee" stack="tcp" cluster="ejb"/>
</channels>

<stack name="tcp">
    <transport type="TCP" socket-binding="jgroups-tcp"/>
    <protocol type="TCPGOSSIP">
        <property name="initial_hosts">192.168.56.106[12001],192.168.56.108[12001]</property>
    </protocol>
    <protocol type="MERGE3"/>
    ... (이하 기본 프로토콜 유지) ...
</stack>
```


**소유권 및 권한 설정**

```bash
chown -R jboss:jboss /svc/was/domains/test/tcpgossip
chmod 750 /svc/was/domains/test/tcpgossip/*.sh
```

---
#### Infinispan Cache Mode 설정

- 원하는 cache-container의 default-cache 값을 변경하면 된다.
- cache mode에 대해서는 아래 문서를 참조
	- https://infinispan.org/docs/stable/titles/configuring/configuring.html
- cf) EAP 8.x / WildFly 에서는 cache-container 속성이 module -> modules 로 변경되고, marshaller="PROTOSTREAM" 이 기본값이 된다.

`standalone-ha.xml`

```xml
<subsystem xmlns="urn:jboss:domain:infinispan:13.0">
    <cache-container name="web" default-cache="dist"
                     module="org.wildfly.clustering.web.infinispan">
        <transport lock-timeout="60000"/>
        <distributed-cache name="dist" owners="2">
            <locking isolation="REPEATABLE_READ"/>
            <transaction mode="BATCH"/>
        </distributed-cache>
        <replicated-cache name="repl">
            <locking isolation="REPEATABLE_READ"/>
            <transaction mode="BATCH"/>
        </replicated-cache>
    </cache-container>
</subsystem>
```

| Infinispan Options          | Description                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `cache-container name="web"`| 웹 세션을 저장하는 캐시 컨테이너                                                        |
| `default-cache`             | 기본으로 사용할 캐시 이름<br/>`dist` / `repl` 중 선택                                    |
| `distributed-cache`         | 세션을 `owners` 수만큼의 노드에만 복제<br/>노드 수가 많을 때 메모리 효율이 높음                      |
| `replicated-cache`          | 모든 노드에 세션을 복제<br/>노드 수가 적을 때(2~3대) 단순하고 빠름                               |
| `owners`                    | `distributed-cache` 에서 세션 사본을 보관할 노드 수<br/>기본값 2 (원본 1 + 사본 1)              |

---
### WEB 서버 연동

---
#### mod_jk (AJP) 연동

기본 `standalone-ha.xml`을 그대로 사용하면 됨.

> cf) JBoss는 기존 Apache·mod_cluster와의 호환성을 위해 AJP Secret을 강제하지 않고 보안 패치와 네트워크 접근 제어로 대응했으나, 최신 버전에서는 Secret 강제 정책을 강화하는 추세임. (이 글에서 다루는 버전은 secret이 강제되지 않지만 최신 버전에서는 강제됨)
> 
> - JBoss EAP 7.4.25 이상
> - JBoss EAP 8.1 Update 8 이상

---
#### mod_cluster 연동

- WAS 가 Apache 로 자신의 상태(부하, 컨텍스트)를 주기적으로 통보하므로 WAS 증설 시 Apache 설정 변경 없이 자동으로 워커가 등록된다.

**JBoss 측 설정 (`standalone-ha.xml`)**

- 프록시(Apache) 목록을 정적으로 지정 (앞단에 Apache 2대 구성 가정)

```xml
<subsystem xmlns="urn:jboss:domain:modcluster:5.0">
    <proxy name="default" advertise="false" listener="ajp"
           proxies="proxy1 proxy2"
           balancer="test-balancer"
           sticky-session="true"
           connector="ajp">
        <dynamic-load-provider>
            <load-metric type="cpu"/>
        </dynamic-load-provider>
    </proxy>
</subsystem>
```

- proxies 에서 참조할 outbound-socket-binding 등록

```xml
<socket-binding-group ...>
    <outbound-socket-binding name="proxy1">
        <remote-destination host="192.168.56.106" port="8090"/>
    </outbound-socket-binding>
    <outbound-socket-binding name="proxy2">
        <remote-destination host="192.168.56.108" port="8090"/>
    </outbound-socket-binding>
</socket-binding-group>
```


**cf) Apache 측 설정 (`httpd-modcluster.conf`)**

```apacheconf
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_ajp_module modules/mod_proxy_ajp.so
LoadModule manager_module modules/mod_manager.so
LoadModule proxy_cluster_module modules/mod_proxy_cluster.so
LoadModule advertise_module modules/mod_advertise.so
LoadModule cluster_slotmem_module modules/mod_cluster_slotmem.so

MemManagerFile /svc/web/apache/logs/mod_cluster

<IfModule manager_module>
    Listen 192.168.56.106:8090
    <VirtualHost 192.168.56.106:8090>
        ServerName 192.168.56.106:8090

        <Directory />
            Require ip 192.168.56
        </Directory>

        ServerAdvertise off
        EnableMCPMReceive

        <Location /mod_cluster_manager>
            SetHandler mod_cluster-manager
            Require ip 192.168.56
        </Location>
    </VirtualHost>
</IfModule>
```

---
### 보안 및 운영 표준

---
#### 관리 인터페이스 및 보안 설정

```bash
# 파일 권한
chmod 750 $JBOSS_HOME/bin/*.sh
chmod 600 $DOMAIN_BASE/configuration/*.properties
chmod 640 $DOMAIN_BASE/configuration/standalone-ha.xml
```

---
### 점검 항목

| 구분         | 점검 항목                                 | 확인 방법                                                                   |
| ---------- | ------------------------------------- | ----------------------------------------------------------------------- |
| 프로세스       | 지정한 계정(sysoper)으로 기동되었는가              | `ps -ef \| grep java`                                                   |
| 포트         | HTTP / AJP / 관리 포트가 의도한 IP 에 바인딩되었는가  | `ss -nlpt \| grep java`                                                 |
| JVM        | 힙/메타스페이스/GC 옵션이 적용되었는가                | `jcmd ${PID} VM.flags`                                                  |
| GC 로그      | GC 로그가 지정 경로에 생성되는가                   | `ls -l $JBOSS_LOG_DIR/gclog`                                            |
| 로그         | server.log / nohup 로그가 LOG 파티션에 생성되는가 | `df -h /log` 및 `ls -l`                                                  |
| Logrotate  | logrotate 설정 문법에 오류가 없는가              | `logrotate -d /etc/logrotate.d/jboss_test11`                            |
| 클러스터       | 클러스터 멤버가 모두 조회되는가                     | server.log 의 "view" 로그 확인                                               |
| 세션         | 한 노드 종료 시 세션이 유지되는가                   | JSESSIONID 확인 후 노드 정지 테스트                                               |
| Datasource | DB 커넥션이 정상 생성되는가                      | `/subsystem=datasources/data-source=${DS_NAME}:test-connection-in-pool` |
| 웹 연동       | Apache 에서 WAS 노드가 정상 등록되었는가           | mod_cluster_manager / jkstatus                                          |

---
### JBoss EAP 6.x / 8.x 차이점

---
#### 버전별 주요 차이점

| 구분          | EAP 6.x (참고)                         | EAP 7.x (본 문서 기준)                                | EAP 8.x (참고)                                      |
| ------------- | -------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Web 컨테이너  | JBoss Web<br/>(Tomcat 기반)            | Undertow                                              | Undertow                                            |
| 서브시스템    | `web`                                  | `undertow` / `io`                                     | `undertow` / `io`                                   |
| Thread Pool   | `threads` 서브시스템<br/>(bounded-queue 등) | `io` 서브시스템<br/>worker                        | `io` 서브시스템<br/>worker                          |
| 보안          | security-domain<br/>(legacy)           | legacy + Elytron<br/>(7.1 부터 병행 지원)             | Elytron 전용<br/>(legacy 제거)                      |
| EE 스펙       | Java EE 6<br/>`javax.*`                | Java EE 7 (7.0~7.1) / Java EE 8 (7.2)<br/>Jakarta EE 8 (7.3~7.4)<br/>`javax.*` | Jakarta EE 10<br/>`jakarta.*`  |
| JDK           | 6 / 7 / 8                              | 8 / 11 / 17<br/>(11 은 7.2+, 17 은 7.4 일부 업데이트 이후) | 8.0 : 11 / 17 / 21 (21 은 Update 4+)<br/>8.1 : 17 / 21 |
| JGroups       | 3.x                                    | 4.x<br/>`FD_SOCK`, `FD_ALL`                           | 5.x<br/>`FD_SOCK2`, `FD_ALL3`                       |
| EE 모듈 이름  | `javax.servlet.api` 등                 | `javax.servlet.api` 등                                | `jakarta.servlet.api` 등                            |
| 지원 상태     | EOL                                    | Full Support 종료 (2025.06)<br/>7.4 ELS 로만 지원 (~2027.10) | Full Support<br/>(8.0 은 Update 12 가 마지막, 8.1 사용) |

---
#### EAP 6.x 참고 사항

- EAP 6.x 는 io 서브시스템이 없고 threads 서브시스템을 사용하며, 아래 6가지 thread pool 방식을 제공한다.

| EAP 6.x Thread Pool 방식              | Description                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `unbounded-queue-thread-pool`         | `max-threads` 까지 thread 생성 후, 초과 요청은 크기 제한 없는 FIFO 큐에서 대기<br/>reject 는 없지만 큐가 무한이므로 요청이 계속 쌓여 OOM 발생 여지가 높음 |
| `bounded-queue-thread-pool`           | `core-threads` → `queue-length` 만큼 큐 대기 → 큐가 차면 `max-threads` 까지 thread 추가<br/>모두 차면 `handoff-executor` 로 넘기거나, 없으면 reject<br/>큐 크기가 제한되어 서버 부하를 통제할 수 있어 일반적으로 이 방식을 사용 |
| `blocking-bounded-queue-thread-pool`  | 동작은 `bounded-queue-thread-pool` 과 같으나, 모두 찼을 때 reject 하지 않고 처리가 가능해질 때까지 요청 제출 측을 block                          |
| `queueless-thread-pool`               | 대기 큐가 없는 단순한 thread pool<br/>`max-threads` 초과 시 `handoff-executor` 로 넘기거나 reject 하며, long-running task 에 적합         |
| `blocking-queueless-thread-pool`      | 대기 큐가 없으며, `max-threads` 초과 시 실행 중인 thread 가 끝날 때까지 요청 제출 측을 block                                                  |
| `scheduled-thread-pool`               | `java.util.concurrent.ScheduledThreadPoolExecutor` 기반<br/>특정 시각 또는 일정 간격으로 수행해야 하는 작업을 처리                               |

**Thread Pool 설정 예시**

```xml
<subsystem xmlns="urn:jboss:domain:threads:1.1"/>

<bounded-queue-thread-pool name="ThreadPool">
    <queue-length count="1024"/>
    <core-threads count="2048"/>
    <max-threads count="2048"/>
    <keepalive-time time="60" unit="seconds"/>
</bounded-queue-thread-pool>
```


**Web 컨테이너 설정 예시**
- Undertow 가 아닌 JBoss Web(Tomcat 기반) 을 사용하므로 Connector / Valve 등 Tomcat 유사 설정을 사용한다.

```xml
<subsystem xmlns="urn:jboss:domain:web:2.2" default-virtual-server="default-host" native="false">
    <connector name="http" protocol="HTTP/1.1" scheme="http" socket-binding="http"/>
    <connector name="ajp" protocol="AJP/1.3" scheme="http" socket-binding="ajp"/>
</subsystem>
```


**추가 참고 사항**
- JGroups 3.x 는 FRAG2 를 사용하며, EAP 7.x 의 FRAG3 와 다르다.
- JDK 7 이하 사용 시 -XX:MaxMetaspaceSize 대신 -XX:MaxPermSize 를 사용한다.
- EAP 6.x 는 EOL 상태이므로 보안 패치가 제공되지 않는다.

---
#### EAP 8.x 참고 사항

**`javax.*` -> `jakarta.*` 패키지 변경**
- EE 스펙 네임스페이스가 변경되어 애플리케이션 소스 마이그레이션이 필수이다.
- Red Hat MTA(Migration Toolkit for Applications) 로 사전 분석한다.
	- https://developers.redhat.com/products/mta/download
- 아래처럼 `module.xml` 의 의존성도 함께 변경된다.

```xml
<dependencies>
    <module name="jakarta.api"/>
    <module name="jakarta.transaction.api"/>
</dependencies>
```


**legacy security 서브시스템(security-domain) 제거**
- 보안 설정은 Elytron 으로만 가능하다. EAP 7.x 에서 legacy security 를 사용 중이라면
- 업그레이드 전에 Elytron 으로 전환해야 한다.


**JGroups 5.x 프로토콜명 변경**
- FD_SOCK  -> FD_SOCK2
- FD_ALL   -> FD_ALL3
- VERIFY_SUSPECT -> VERIFY_SUSPECT2
- 기본 스택은 그대로 두고 discovery 프로토콜(MPING -> TCPPING)만 교체한다.


**Infinispan cache-container 속성 변경**
- module="..."  -> modules="..."
- marshaller="PROTOSTREAM" 이 기본값


**JDK 8 미지원**
- EAP 8.0 은 JDK 11 / 17 / 21, EAP 8.1 은 JDK 17 / 21 만 지원한다.
- GC 옵션은 반드시 `-Xlog:gc*` 계열로 작성한다.


**설치 방식 변경**
- zip 외에 Bootable JAR(애플리케이션 + 런타임을 하나의 실행 가능한 JAR 로 패키징) 방식을 지원한다.

---
