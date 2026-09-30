---
title: Tomcat 설치 방법 및 운영환경에서의 주요 설정
description: Tomcat 설치부터 인스턴스 구성, 운영 튜닝, 세션 클러스터링, JDBC, 로그 관리 및 보안 설정까지 운영 환경 구성을 위한 전반적인 설정 방법을 정리합니다.
date: 2026-09-28
sidebar_class_name: hidden-sidebar-item
image: /img/posts/03-tomcat-conf/tomcat.png
---
---
## 기준

---
### Version 별 지원 Java 및 스펙

| 구분          | 지원 Java    | Servlet / EE 스펙                             | 비고                               |
| ----------- | ---------- | ------------------------------------------- | -------------------------------- |
| Tomcat 8.5  | Java 7 이상  | Servlet 3.1<br/>Java EE 7 (`javax.*`)       | 2024-03-31 EOL                   |
| Tomcat 9.0  | Java 8 이상  | Servlet 4.0<br/>Java EE 8 (`javax.*`)       | 2027-03-31 EOS                   |
| Tomcat 10.1 | Java 11 이상 | Servlet 6.0<br/>Jakarta EE 10 (`jakarta.*`) | 패키지 전환 필요 (`javax` -> `jakarta`) |
| Tomcat 11.0 | Java 17 이상 | Servlet 6.1<br/>Jakarta EE 11 (`jakarta.*`) | 최신 버전                            |

**이 글 기준**

> Tomcat : `11.0.26`
> OpenJDK : `17.0.20`

---
### 경로 기준

| 구분         | 경로   | 비고                                            |
| ---------- | ---- | --------------------------------------------- |
| Engine 파티션 | /svc | -                                             |
| Log 파티션    | /log | -                                             |
| App 파티션    | /app | 애플리케이션 배포 경로는 따로 구성하는 경우도 있고, 구성하지 않는 경우도 있다. |

| 구분              | 명명규칙                                         | 예시                                  |
| --------------- | -------------------------------------------- | ----------------------------------- |
| Service HOME    | `/svc`                                       | `/svc`                              |
| WAS HOME        | `{Service HOME}/{3rd Party 기능구분}`            | `/svc/was`                          |
| CATALINA_HOME   | `{WAS HOME}/tomcat`                          | `/svc/was/tomcat`                   |
| CATALINA_BASE   | `{CATALINA_HOME}/{Instance name}`            | `/svc/was/tomcat/test11`            |
| 명령어 HOME        | `{CATALINA_HOME}/bin`                        | `/svc/was/tomcat/bin`               |
| JAVA_HOME       | `/usr/java/{JDK}`                            | `/usr/java/jdk8`                    |
| LOG HOME        | `/log/was/tomcat/{Instance name}/logs`       | `/log/was/tomcat/test11/logs`       |
| GC LOG HOME     | `/log/was/tomcat/{Instance name}/gclogs`     | `/log/was/tomcat/test11/gclogs`     |
| ACCESS LOG HOME | `/log/was/tomcat/{Instance name}/accesslogs` | `/log/was/tomcat/test11/accesslogs` |
| APP HOME        | `/app/was/{Instance name}`                   | `/app/was/test11`                   |

- 보통, `CATALINA_HOME`은 버전 업그레이드 시 심볼릭 링크만 교체할 수 있도록 실제 디렉토리에 심볼릭 링크로 구성한다.
- 하나의 `CATALINA_HOME`(엔진)을 여러 인스턴스가 공유하고, 인스턴스별 설정(conf), 로그, 임시파일은 `CATALINA_BASE`로 분리한다.
- 로그 경로는 `/log` 파티션에 실제 디렉토리를 만들고 `CATALINA_BASE` 하위에 심볼릭 링크를 건다.

---
## Tomcat 설치

>  Tomcat : https://tomcat.apache.org/download-11.cgi
>  Tomcat Version 별 지원 Java 버전 및 최신 릴리즈 : https://tomcat.apache.org/whichversion.html
>  Open JDK : https://www.oracle.com/kr/java/technologies/downloads/archive/

---
### 기본 설정

**JAVA_HOME 경로 구성**

```bash
tar -xvf jdk-17.0.20_linux-x64_bin.tar.gz
mkdir -p /usr/java
mv jdk-17.0.20 /usr/java/
```

- 소스 압축 해제 후 `JAVA_HOME`으로 구성할 디렉토리로 옮긴다.


**CATALINA_HOME 경로 구성**

```bash
tar -xvf apache-tomcat-11.0.26.tar.gz
mkdir -p /svc/was
mv apache-tomcat-11.0.26 /svc/was/
cd /svc/was
ln -s /svc/was/apache-tomcat-11.0.26 tomcat
```

- 소스 압축 해제 후 엔진 파티션으로 옮긴다.
- 이후 `CATALINA_HOME`으로 사용할 이름으로 심볼릭 링크를 건다.


**불필요한 파일 삭제**

```bash
cd /svc/was/tomcat
rm -rf BUILDING.txt CONTRIBUTING.md LICENSE NOTICE README.md RELEASE-NOTES RUNNING.txt
```

- 소스 코드에서 리드미와 같이 기동에 필요없는 파일들을 삭제한다.


**기본 배포 웹앱 삭제**

```bash
rm -rf webapps/docs webapps/examples webapps/manager webapps/host-manager
```

- tomcat에서 기본으로 만들어져있는 웹앱을 삭제한다.


**소유권 설정**

```bash
useradd -r -s /sbin/nologin tomcat
chown -R tomcat:tomcat /svc/was
```

---
### 인스턴스(CATALINA_BASE) 생성

**인스턴스 디렉토리 생성 및 필요한 폴더 복사**

```bash
cd /svc/was/tomcat
mkdir test11
cp -a conf temp work test11/
```


**로그 디렉토리 생성**

```bash
# 로그 파티션에 로그 디렉토리 생성 후 심볼릭 링크로 연결
mkdir -p /log/was/tomcat/test11/logs
mkdir -p /log/was/tomcat/test11/gclogs
mkdir -p /log/was/tomcat/test11/accesslogs

cd /svc/was/tomcat/test11

ln -s /log/was/tomcat/test11/logs logs
ln -s /log/was/tomcat/test11/gclogs gclogs
ln -s /log/was/tomcat/test11/accesslogs accesslogs
```


**앱 배포 디렉토리 생성**

```bash
mkdir -p /app/was/test11
```

---
### Tomcat 튜닝 (`server.xml`)

```bash
vi /svc/was/tomcat/test11/conf/server.xml
```

---
#### Thread (Executor)

**주석 해제 및 `maxThreads`, `minSpareThreads` 변경**

(AS-IS)

```xml
<!--
<Executor name="tomcatThreadPool" namePrefix="catalina-exec-" maxThreads="150" minSpareThreads="4"/>
-->
```

(TO-BE)

```xml
<Executor name="tomcatThreadPool" namePrefix="catalina-exec-" maxThreads="2000" minSpareThreads="2000"/>
```

- minSpareThreads 를 maxThreads 와 동일하게 두면 기동 시 2000개의 스레드를 미리 생성한다.
	- 이렇게 설정하는 이유는, 갑작스럽게 대량의 요청이 들어오는 환경에서 스레드를 동적으로 생성하는 비용을 없애겠다는 의도이다.
- 스레드 1개당 기본 1MB 의 스택 메모리를 사용하므로 메모리 여유를 확인하고 산정해야한다.

---
#### HTTP Port

(AS-IS)

```xml
<Connector port="8080" protocol="HTTP/1.1"
           connectionTimeout="20000"
           redirectPort="8443" />
```

(TO-BE)

```xml
<Connector executor="tomcatThreadPool" port="8080" protocol="HTTP/1.1"
           maxKeepAliveRequests="2000"
           connectionTimeout="20000"
           enableLookups="false"
           acceptCount="2000"
           maxPostSize="-1"
           server="Test"
           redirectPort="8443" URIEncoding="UTF-8" />
```

- `executor="tomcatThreadPool"` : Connector 자체 Thread Pool 대신 앞서 설정한 공용 Executor를 사용하는 설정 (Thread 수를 중앙에서 관리하기 위함)
- `maxKeepAliveRequests="2000"` : 하나의 HTTP Keep-Alive 연결에서 최대 2,000개 요청까지 재사용. 연결 생성/종료 비용 감소
- `connectionTimeout="20000"` : 연결 후 요청을 기다리는 시간을 20초로 제한. 기존값 유지
- `enableLookups="false"` : 클라이언트 IP에 대한 DNS 역조회 비활성화. 불필요한 DNS 조회 비용 방지
- `acceptCount="2000"` : 처리 가능한 스레드가 모두 사용 중일 때 **대기시킬 연결 수를 확보**
- `maxPostSize="-1"` : POST 요청 크기에 대한 Tomcat Connector 제한 해제
- `server="Test"` : HTTP 응답의 Server 헤더를 지정하여 기본 Tomcat 정보 노출 억제
- `redirectPort="8443"` : 보안 전송이 필요한 요청의 HTTPS Redirect 포트. 기존값 유지
- `URIEncoding="UTF-8"` : URL의 query string 등을 UTF-8로 디코딩. 한글 등 비ASCII 문자 처리

---
#### AJP Port

**Tomcat 8.5.51 / 9.0.31 이상**

(AS-IS)

```xml
<!--
<Connector protocol="AJP/1.3"
           address="::1"
           port="8009"
           redirectPort="8443" />
-->
```

(TO-BE)

```xml
<Connector executor="tomcatThreadPool" port="8009" protocol="AJP/1.3"
           address="192.168.56.105"
           secretRequired="true"
           secret="test_test11"
           maxPostSize="-1"
           connectionTimeout="20000"
           enableLookups="false"
           acceptCount="2000"
           redirectPort="8443" URIEncoding="UTF-8" />
```

- `address="192.168.56.105"` : Tomcat 8.5.51 / 9.0.31 이상에서는 AJP Connector의 기본 바인딩 주소가 loopback으로 제한되므로, Apache와 Tomcat이 분리된 서버에 구성된 경우 AJP 통신이 가능한 Tomcat 서버의 연동용 IP를 명시한다.
- `secretRequired="true"` : AJP 연동 시 시크릿을 사용하는 설정
- `secret="test_test11"` : Apache에서 `workers.properties`에서 설정한 시크릿 값과 같아야 한다.


**Tomcat Tomcat 8.5.50 / 9.0.30 이하**

```xml
<Connector executor="tomcatThreadPool" port="8009" protocol="AJP/1.3" 
           maxPostSize="-1"
           requiredSecret="test_test11"
           connectionTimeout="20000"
           enableLookups="false"
           acceptCount="2000"
           redirectPort="8443" URIEncoding="UTF-8" />
```

---
#### jvmRoute

> 기동 스크립트에 에 jvmRoute 설정이 있다면 추가하지 않아도 된다

(AS-IS)

```xml
<Engine name="Catalina" defaultHost="localhost">
```

(TO-BE)

```xml
<Engine name="Catalina" defaultHost="localhost" jvmRoute="test11">
```

- `jvmRoute`는 Apache의 worker 이름(mod_jk) 혹은 route 값(mod_proxy)와 일치해야 한다.

---
#### appBase / docBase

| 설정        | 위치          | 의미                      |
| --------- | ----------- | ----------------------- |
| `appBase` | `<Host>`    | **여러 웹앱을 배치하는 기본 디렉터리** |
| `docBase` | `<Context>` | **특정 웹앱 하나의 경로**        |

```xml
<Host name="localhost" appBase="/app/was/test11"
      unpackWARs="true" autoDeploy="false">

<Context path="/" docBase="test11Webapp" reloadable="false" />
```

- 위처럼 설정하면 결국 `/` 로 오는 요청은 `/app/was/test11/test11Webapp`에 있는 애플리케이션으로 보내진다. (원래는 `appBase` 하위의 `ROOT` 폴더 안에 있는 앱이 `/`로 오는 요청을 받는다)
	- 보통은 `appBase`만 사용하고, `docBase`는 특정 애플리케이션의 위치를 별도로 지정해야하는 경우에 사용한다
- 운영 환경에서는 `autoDeploy="false"` 를 권장한다. (의도치 않은 재배포 방지)
- `reloadable="true"` 는 클래스 변경을 감시하므로 운영 환경에서는 false 로 둔다.

---
#### AccessLog

```xml
<Valve className="org.apache.catalina.valves.AccessLogValve"
       directory="/svc/was/tomcat/test11/accesslogs"
       prefix="test11_access." suffix=".log"
       pattern="%a %l %u %t &quot;%r&quot; %s %b %D"
       fileDateFormat="yyyy-MM-dd"/>
```

- 로그가 저장될 위치와 이름 패턴 등을 지정하는 설정이다.

---
#### server.xml 옵션들

| Options | Description |
| --- | --- |
| **Thread Options** | |
| `maxThreads` | 요청을 동시에 처리할 수 있는 최대 스레드 수 |
| `minSpareThreads` | 최소한으로 유지할 유휴 스레드 수<br/>Tomcat이 실행되면 설정한 수만큼 미리 스레드를 생성해둔다 |
| **HTTP Port Options** | |
| `port` | Connector가 수신 대기할 포트 번호 |
| `protocol="HTTP/1.1"` | 사용할 프로토콜을 정의 |
| `maxPostSize` | HTTP POST 요청 본문의 최대 크기(byte)<br/>기본값 2097152 (2MB) |
| `maxKeepAliveRequests` | 한 Connection에서 재사용 가능한 최대 요청 수<br/>`-1`은 무제한을 의미 |
| `connectionTimeout` | 클라이언트가 연결한 상태에서 요청을 보내지 않으면 설정한 시간 이후 연결을 끊음(ms) |
| `enableLookups` | 클라이언트 IP를 DNS 조회하여 호스트 이름으로 변환할지 여부 |
| `acceptCount` | `maxThreads`를 초과하여 요청이 들어왔을 때 대기할 수 있는 최대 수<br/>즉, OS의 수신 큐에 쌓일 수 있는 요청 수 |
| `URIEncoding` | URL 내에 포함된 문자열의 인코딩 방식을 지정<br/>Tomcat 8 이상 기본값 UTF-8 |
| `server` | 응답 헤더의 `Server` 값을 지정<br/>버전 정보 노출을 차단하기 위해 임의의 값으로 설정 |
| **AJP Port Options** | |
| `port` | AJP 프로토콜을 수신할 포트 |
| `protocol="AJP/1.3"` | AJP 프로토콜 버전을 지정<br/>Tomcat에서는 기본적으로 AJP/1.3을 사용 |
| `address` | Connector가 수신할 IP 주소 |
| `secretRequired` | AJP 연결 시 보안 비밀키를 필수로 요구할지 여부<br/>Tomcat 8.5.51 / 9.0.31 이상 기본값 `true` |
| `secret` | `secretRequired="true"`일 때 프록시 서버가 Tomcat에 접근할 때 사용해야 하는 비밀 문자열<br/>mod_jk의 `worker.xxx.secret`과 동일한 값으로 설정 필요 |
| `requiredSecret` | Tomcat 8.5.50 / 9.0.30 이하에서 사용하던 속성명 (2.4.2절 참조) |
| `redirectPort` | SSL이 필요한 요청이 들어올 때 리다이렉트할 포트 |
| **Host / Context Options** | |
| `appBase` | 웹 애플리케이션이 배포되는 기준 디렉터리 |
| `unpackWARs` | WAR 파일을 디렉터리로 압축 해제할지 여부 |
| `autoDeploy` | `appBase`를 주기적으로 감시하여 자동 배포할지 여부<br/>운영 환경은 `false` 권장 |
| `docBase` | 특정 웹 애플리케이션의 실제 경로 |
| `reloadable` | 클래스 변경 시 자동 재로딩 여부<br/>성능 부하가 크므로 운영 환경은 `false` 권장 |
| **AccessLog / ErrorReport Valve** | |
| `pattern` | `%a` 클라이언트 IP, `%t` 요청 시각, `%r` 요청 라인, `%s` 응답 코드, `%b` 응답 바이트, `%D` 처리 시간(ms) |
| `fileDateFormat` | 로그 파일명에 붙는 날짜 형식<br/>일자별 회전에 사용 |
| `showReport` / `showServerInfo` | 에러 페이지에 스택 트레이스와 Tomcat 버전을 표시할지 여부<br/>둘 다 `false`로 설정 |

---
### Tomcat 세션 클러스터링

---
#### 구성 방식

Tomcat의 세션 클러스터링에서 세션 복제 방식은 크게 `DeltaManager`와 `BackupManager`로 구분된다.

|구분|DeltaManager|BackupManager|
|---|---|---|
|세션 복제 방식|`N:N`|`1:1`|
|복제 대상|클러스터에 참여한 모든 노드|하나의 백업 노드|
|특징|모든 노드가 세션 정보를 공유|Primary 노드와 Backup 노드가 세션 정보를 보유|

보통의 구성에서는 전체 노드에 세션을 복제하더라도 세션 전파에 따른 부하가 크지 않으며(노드가 수십~수백개로 많다면 얘기가 달라짐), `BackupManager`를 사용할 경우 세션을 보유하지 않은 다른 노드로 요청이 전달되었을 때 세션 클러스터링의 이점을 충분히 활용하기 어렵다.

이에 보통 `DeltaManager` 방식으로 구성한다.

Tomcat 클러스터의 노드를 탐색하고 구성하는 방식은 `Multicast`와 `Unicast` 방식으로 구분할 수있다.

| 구분 | Multicast | Unicast |
| --- | --- | --- |
| 노드 탐색 | Multicast를 이용하여 노드를 자동 탐색 | 대상 노드의 주소를 명시적으로 지정 |
| 네트워크 요구사항 | Multicast 통신이 가능한 네트워크 필요 | 노드 간 TCP 통신 필요 |
| 노드 추가 | 동일 Multicast 그룹에 참여하여 비교적 간단하게 추가 | 새로운 노드 정보를 설정에 반영 필요 |
| 운영 환경 고려사항 | UDP 또는 Multicast가 제한된 환경에서는 사용이 어려울 수 있음 | Multicast 지원 여부와 관계없이 구성 가능 |

일반적인 운영 환경에서는 UDP가 차단되어 있거나 Multicast를 지원하지 않는 경우가 많으므로, 일반적으로 네트워크 환경에 대한 의존성을 줄이기 위해 `Unicast TCP` 방식으로 구성한다.

---
#### 설정 (server.xml)

> 세션 클러스터링은 `server.xml` 의 `<Engine>` 또는 `<Host>` 하위에 `<Cluster>` 를 정의한다.
> 
> 어플리케이션 `web.xml` 에 `<distributable/>` 이 선언되어 있어야 세션이 복제된다.
> 
> Cluster를 설정하는 다른 인스턴스는 해당 port인 4000,4100을 반대로 설정해준다.


**Tomcat 8.0 이상**

```xml
<Cluster className="org.apache.catalina.ha.tcp.SimpleTcpCluster"
         channelStartOptions="3"
         channelSendOptions="6">

  <Manager className="org.apache.catalina.ha.session.DeltaManager"
           expireSessionsOnShutdown="false"
           notifyListenersOnReplication="true"/>

  <Channel className="org.apache.catalina.tribes.group.GroupChannel">

    <Receiver className="org.apache.catalina.tribes.transport.nio.NioReceiver"
              address="192.168.56.106"
              port="4000"
              autoBind="0"
              selectorTimeout="5000"
              maxThreads="6"/>

    <Sender className="org.apache.catalina.tribes.transport.ReplicationTransmitter">
      <Transport className="org.apache.catalina.tribes.transport.nio.PooledParallelSender"/>
    </Sender>

    <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpPingInterceptor"
                 staticOnly="true"/>

    <Interceptor className="org.apache.catalina.tribes.group.interceptors.TcpFailureDetector"/>

    <Interceptor className="org.apache.catalina.tribes.group.interceptors.StaticMembershipInterceptor">
      <Member className="org.apache.catalina.tribes.membership.StaticMember"
              port="4100"
              host="192.168.56.105"
              uniqueId="{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16}"/>
    </Interceptor>

    <Interceptor className="org.apache.catalina.tribes.group.interceptors.MessageDispatchInterceptor"/>

  </Channel>

  <Valve className="org.apache.catalina.ha.tcp.ReplicationValve"
         filter=""/>

  <Valve className="org.apache.catalina.ha.session.JvmRouteBinderValve"/>

  <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>

</Cluster>
```


**Tomcat 7.x**

> 자료 참고 : https://tomcat.apache.org/migration-8.html
> 
> Servlet 3.1에 `HttpServletRequest.changeSessionId()`가 추가되면서 `JvmRouteSessionIDBinderListener`가 불필요해졌고 Tomcat 8에서 제거됨.
> 
> 그래서 Tomcat 8.0 이상에서는 `JvmRouteSessionIDBinderListener` 를 사용하지 않았지만, 7.x 버전에서는 필요하다.
> 
> 나머지 구성은 위와 동일하며 ClusterListener 가 하나 더 필요하다.

```xml
  <ClusterListener className="org.apache.catalina.ha.session.JvmRouteSessionIDBinderListener"/>
  <ClusterListener className="org.apache.catalina.ha.session.ClusterSessionListener"/>
```

---
#### 세션 클러스터링 옵션들

| 구분 | 옵션 | Description |
| --- | --- | --- |
| Cluster / Manager Options | `channelSendOptions` | 세션 복제 메시지 전송 방식<br/>8 = 비동기(ASYNC), 6 = 동기(SYNC) + ACK<br/>비동기는 빠르지만 복제 지연 중 장애 시 세션 유실 가능 |
| Cluster / Manager Options | `DeltaManager` | 변경된 세션 속성만 모든 노드에 복제 |
| Cluster / Manager Options | `BackupManager` | 세션을 특정 백업 노드에만 복제 |
| Cluster / Manager Options | `expireSessionsOnShutdown` | 인스턴스 종료 시 세션을 만료시킬지 여부<br/>`false`로 두어야 세션이 살아남는다 |
| Receiver Tag Options | `address` | 서버 자기 자신의 실제 IP 설정 |
| Receiver Tag Options | `port` | 세션 복제 메시지를 수신할 포트 |
| Receiver Tag Options | `autoBind` | `port`가 사용 중일 때 시도할 추가 포트 개수<br/>`0`이면 지정한 포트만 사용 |
| Receiver Tag Options | `selectorTimeout` | NIO(Non-blocking I/O) 기반 통신에서 Selector가 이벤트를 기다리는 시간(ms)<br/>NIO : 여러 채널(소켓 등)을 하나의 스레드에서 동시에 처리하는 Java 기능<br/>Selector : 여러 채널을 등록해두고 이벤트 발생 여부를 확인하는 객체<br/>설정한 시간이 지나면 타임아웃 후 다음 루프를 돌며 이벤트를 감시 |
| Receiver Tag Options | `maxThreads` | 수신된 세션 복제 요청/메시지를 처리하는 작업용 스레드 풀의 최대 개수<br/>default: 6 |
| Interceptor Options | `TcpFailureDetector` | TCP 연결로 멤버 장애를 확인<br/>멀티캐스트 오탐을 보정한다 |
| Interceptor Options | `TcpPingInterceptor` | 주기적으로 ping을 보내 유휴 연결이 방화벽에 의해 끊기는 것을 방지<br/>`staticOnly="true"`는 정적 멤버에만 적용 |
| Interceptor Options | `MessageDispatchInterceptor` | 복제 메시지를 비동기로 전송<br/>`channelSendOptions="8"` 사용 시 필요 |
| Interceptor Options | `StaticMembershipInterceptor` | 멀티캐스트 없이 고정된 멤버 목록으로 클러스터를 구성<br/>`Member` 요소는 반드시 이 Interceptor의 자식으로 넣어야 한다 |
| Member Tag Options | `host` | 클러스터 내 다른 Tomcat 서버의 IP |
| Member Tag Options | `port` | 해당 Tomcat 서버의 Receiver 수신 포트 |
| Member Tag Options | `uniqueId` | 클러스터 내 고유 식별자(16바이트)<br/>노드마다 반드시 달라야 한다 |
| Application 요구사항 | `<distributable/>` | 애플리케이션 `web.xml`에 선언되어야 세션 복제가 동작<br/>미선언 시 클러스터가 구성되어도 세션이 복제되지 않는다 |
| Application 요구사항 | `Serializable` | 세션에 저장하는 모든 객체는 `java.io.Serializable`을 구현해야 한다 |

---
### Tomcat 기동/중지 스크립트

> 바이너리 폴더 안의 `startup.sh`와 `shutdown.sh`를 복사한 뒤 인스턴스명을 붙여 스크립트를 생성한다.

```bash
cd /svc/was/tomcat/bin

cp startup.sh starttest11.sh
cp shutdown.sh stoptest11.sh
```

---
#### 기동 스크립트

```bash
vi starttest11.sh
```

**JDK 8 이하**
- 기존 스크립트 상단에 아래 내용을 추가한다.
- JDK 7 이하일 경우 `MaxMetaspaceSize` 는 `MaxPermSize` 로 변경 필요

```sh
SERVER_NAME=test11
JAVA_HOME=/usr/java/jdk1.8.0_401
CATALINA_HOME=/svc/was/tomcat
CATALINA_BASE=/svc/was/tomcat/$SERVER_NAME
GCDIR=$CATALINA_BASE/gclogs
GCLOG=$GCDIR/$SERVER_NAME-gc.log
DATE=`date +%Y%m%d%H%M`

JAVA_OPTS="-D$SERVER_NAME"
JAVA_OPTS="$JAVA_OPTS -Xms2048m -Xmx2048m -XX:MaxMetaspaceSize=512m"
JAVA_OPTS="$JAVA_OPTS -verbose:gc -Xloggc:$GCLOG"
JAVA_OPTS="$JAVA_OPTS -XX:+PrintGCDetails"
JAVA_OPTS="$JAVA_OPTS -XX:+PrintGCTimeStamps"
JAVA_OPTS="$JAVA_OPTS -XX:+PrintGCDateStamps"
JAVA_OPTS="$JAVA_OPTS -XX:+PrintHeapAtGC"
JAVA_OPTS="$JAVA_OPTS -XX:+HeapDumpOnOutOfMemoryError"
JAVA_OPTS="$JAVA_OPTS -XX:HeapDumpPath=$CATALINA_HOME/$SERVER_NAME-Heapdump.$DATE"
JAVA_OPTS="$JAVA_OPTS -DjvmRoute=$SERVER_NAME"
JAVA_OPTS="$JAVA_OPTS -Djava.security.egd=file:/dev/./urandom"
export CATALINA_HOME CATALINA_BASE  SERVER_NAME GCDIR GCLOG JAVA_HOME JAVA_OPTS
```

- 식별용
	- `-D$SERVER_NAME`: 값 없이 `-Dtest11`이라는 시스템 프로퍼티를 넣는다. 기능적 의미는 없고, `ps -ef | grep test11`로 프로세스를 구분하기 위해 넣는 관례다.
- 메모리
	- `-Xms2048m -Xmx2048m`: 힙의 최소값과 최대값을 2GB로 동일하게 잡는다. 운영 중 힙 크기를 늘리거나 줄이는 오버헤드가 생기지 않는다.
	- `-XX:MaxMetaspaceSize=512m`: 클래스 메타데이터 영역의 상한이다. 설정하지 않으면 무제한이어서 클래스로더 누수가 있을 때 네이티브 메모리를 계속 점유한다.
- GC 로그
	- `-verbose:gc`: GC 발생 시 기본 정보를 출력한다.
	- `-Xloggc:$GCLOG`: GC 로그를 콘솔(catalina.out) 대신 지정한 파일에 기록한다.
	- `-XX:+PrintGCDetails`: 세대별 사용량, 소요 시간 등 상세 정보를 출력한다.
	- `-XX:+PrintGCTimeStamps`: JVM 기동 후 경과 시간(초)을 붙인다.
	- `-XX:+PrintGCDateStamps`: 실제 날짜와 시각을 붙인다.
	- `-XX:+PrintHeapAtGC`: GC 전후 힙 전체 상태를 덤프한다.
- 장애 분석
	- `-XX:+HeapDumpOnOutOfMemoryError`: OOM 발생 시 힙덤프(.hprof)를 자동 생성한다.
	- `-XX:HeapDumpPath=...Heapdump.$DATE`: 덤프 저장 경로다.
- 클러스터/세션
	- `-DjvmRoute=$SERVER_NAME`: 세션 ID 뒤에 `.test11`을 붙여 Apache mod_jk/mod_proxy에서 sticky session을 구현하는 데 쓴다. 옵션만으로는 효과가 없고, `server.xml`의 `<Engine ... jvmRoute="${jvmRoute}">`에서 이 값을 참조해야 적용된다. 워커 이름과도 일치시켜야 한다.
- 기타
	- `-Djava.security.egd=file:/dev/./urandom`: `SecureRandom`이 블로킹되는 `/dev/random` 대신 `/dev/urandom`을 쓰게 한다. 예전 JDK에서 세션 ID 생성 때문에 기동이 수십 초씩 멈추던 문제를 피하기 위한 설정이다. `/./`는 JDK 구버전 버그를 우회하는 트릭이다.


**JDK 9 이상**
- 기존 스크립트 상단에 아래 내용을 추가한다.
- `-Xloggc`, `-XX:+PrintGC*` 계열 옵션은 JDK 9 부터 Deprecated 되었고 JDK 11 이상에서는 제거되어 그대로 사용하면 기동에 실패한다. 반드시 `-Xlog:gc*` 로 교체한다.

```sh
SERVER_NAME=test11
JAVA_HOME=/usr/java/jdk-17.0.20
CATALINA_HOME=/svc/was/tomcat
CATALINA_BASE=/svc/was/tomcat/$SERVER_NAME
GCDIR=$CATALINA_BASE/gclogs
GCLOG=$GCDIR/$SERVER_NAME-gc_%t.log
DATE=`date +%Y%m%d%H%M`

JAVA_OPTS="-D$SERVER_NAME"
JAVA_OPTS="$JAVA_OPTS -Xms2048m -Xmx2048m -XX:MaxMetaspaceSize=512m"
JAVA_OPTS="$JAVA_OPTS -Xlog:gc*=info,gc+heap=debug:file=${GCLOG}:time"
JAVA_OPTS="$JAVA_OPTS -XX:+HeapDumpOnOutOfMemoryError"
JAVA_OPTS="$JAVA_OPTS -XX:HeapDumpPath=$CATALINA_HOME/$SERVER_NAME-Heapdump.$DATE"
JAVA_OPTS="$JAVA_OPTS -DjvmRoute=$SERVER_NAME"
JAVA_OPTS="$JAVA_OPTS -Djava.security.egd=file:/dev/./urandom"
export CATALINA_HOME CATALINA_BASE  SERVER_NAME GCDIR GCLOG JAVA_HOME JAVA_OPTS
```

- 환경 변수
	- `SERVER_NAME`, `JAVA_HOME`, `CATALINA_HOME`, `CATALINA_BASE`, `GCDIR`, `DATE`: 이전과 동일하다.
	- `GCLOG=$GCDIR/$SERVER_NAME-gc_%t.log`: 이전 `GCLOG`와 같은 역할이지만 파일명에 `%t`가 추가되었다.
		- `%t`는 쉘이 아니라 JVM(Unified Logging)이 치환하는 변수로, JVM 기동 시각이 들어간다. 예: `test11-gc_2026-09-29_10-32-10.log`
		- 재기동할 때마다 새 파일이 생성되므로 이전 `-Xloggc`처럼 기존 로그를 덮어쓰지 않는다.
		- 같은 방식으로 `%p`(PID)도 사용할 수 있다.
- 식별용
	- `-D$SERVER_NAME`: 이전과 동일하다.
- 메모리
	- `-Xms2048m -Xmx2048m`, `-XX:MaxMetaspaceSize=512m`: 이전과 동일하다.
- GC 로그
	- `-Xlog:gc*=info,gc+heap=debug:file=${GCLOG}:time`: 이전 GC 로그 옵션 6개(`-verbose:gc`, `-Xloggc`, `PrintGCDetails`, `PrintGCTimeStamps`, `PrintGCDateStamps`, `PrintHeapAtGC`)를 하나로 대체하는 Unified Logging 옵션이다. 구조는 `[태그=레벨]:[출력 대상]:[데코레이터]:[출력 옵션]`이다.
		- `gc*=info`: gc로 시작하는 모든 태그를 info 레벨로 출력한다. 이전의 `-verbose:gc` + `PrintGCDetails`에 해당한다.
		- `gc+heap=debug`: 힙 영역별 상세 상태를 출력한다. 이전의 `PrintHeapAtGC`에 해당한다.
		- `file=${GCLOG}`: 지정한 파일에 기록한다. 이전의 `-Xloggc`에 해당한다.
		- `time`: 각 줄에 날짜와 시각을 붙인다. 이전의 `PrintGCDateStamps`에 해당한다. `PrintGCTimeStamps`(경과 시간)에 해당하는 `uptime`은 빠져 있으므로 필요하면 `time,uptime`으로 추가한다.
		- 출력 옵션을 생략했으므로 기본값 `filecount=5,filesize=20M`로 로테이션된다. 이전 `-Xloggc`에는 없던 기능이다.
		- `$GCDIR`이 없으면 로그 파일을 열지 못해 JVM이 기동되지 않으므로 `mkdir -p $GCDIR`를 미리 해두는 것이 안전하다.
		- `%t` 때문에 재기동마다 로그 세트가 새로 생기고 이전 것은 지워지지 않으므로 주기적인 정리가 필요하다.
- 장애 분석
	- `-XX:+HeapDumpOnOutOfMemoryError`, `-XX:HeapDumpPath=...Heapdump.$DATE`: 이전과 동일하다. 주의점(`$DATE`가 기동 시각이라는 점, `CATALINA_HOME`에 생성된다는 점)도 그대로다.
- 클러스터/세션
	- `-DjvmRoute=$SERVER_NAME`: 이전과 동일하다.
- 기타
	- `-Djava.security.egd=file:/dev/./urandom`: 이전과 동일하다.

---
#### 중지 스크립트

```bash
vi stoptest11.sh
```

- 기존 스크립트 상단에 아래 내용을 추가한다.

```sh
SERVER_NAME=test11
JAVA_HOME=/usr/java/jdk-17.0.20
CATALINA_HOME=/svc/was/tomcat
CATALINA_BASE=/svc/was/tomcat/$SERVER_NAME
export CATALINA_HOME CATALINA_BASE SERVER_NAME JAVA_HOME
```

---
#### 기동/중지 스크립트 옵션

| Start, Stop Script Options | Description |
| --- | --- |
| `SERVER_NAME` | 인스턴스명 설정 |
| `JAVA_HOME` | Java 설치 경로 설정 |
| `CATALINA_HOME` | 공통 Tomcat 설치 경로 설정 (엔진) |
| `CATALINA_BASE` | 인스턴스 전용 경로 설정 (`conf`, `logs`, `temp`, `work`) |
| `GCDIR`, `GCLOG` | GC 로그 디렉토리 및 파일명 정의 |
| `DATE` | 날짜 및 시간 추가용 변수 설정 |
| `-Xms2048m` / `-Xmx2048m` | 최소 / 최대 힙 메모리 크기 설정<br/>운영 환경에서는 두 값을 동일하게 설정하여 힙 리사이징 비용을 제거 |
| `-XX:MaxMetaspaceSize` | 메타스페이스(클래스 메타데이터 저장 공간) 크기 설정<br/>JDK 7 이하는 `-XX:MaxPermSize` |
| `-XX:+PrintGCDetails` | 어떤 GC가 실행되었는지 기록 (JDK 8) |
| `-XX:+PrintGCTimeStamps` | GC에 걸린 시간 기록 (JDK 8) |
| `-XX:+PrintGCDateStamps` | GC 발생 시각을 로그에 기록 (JDK 8) |
| `-XX:+PrintHeapAtGC` | GC 발생 전/후 힙 메모리 상태 출력 (JDK 8) |
| `-Xlog:gc*` | JDK 9 이상 GC 통합 로깅 옵션<br/>JDK 8의 `-Xloggc` / `-XX:+PrintGC*`를 대체 |
| `-XX:+HeapDumpOnOutOfMemoryError` | OOM(OutOfMemoryError) 발생 시 힙 덤프 생성 |
| `-XX:HeapDumpPath` | 힙 덤프 생성 시 덤프 파일 저장 경로 설정<br/>힙 크기만큼 디스크를 사용할 수 있으므로 여유 공간 확인 필요 |
| `-DjvmRoute` | 클러스터링에서 Sticky Session을 위한 설정<br/>`server.xml`의 `<Engine>`에서 해당 시스템 프로퍼티를 참조하도록 구성해야 적용 |
| `-Djava.security.egd=file:/dev/./urandom` | 기동 시 엔트로피 부족으로 대기 상태에 빠지는 현상을 방지<br/>JDK 8u162 이상에서는 일반적으로 불필요 |

---
#### catalina.sh

> `catalina.sh`는 export된 변수(`JAVA_OPTS`, `CATALINA_BASE` 등)를 읽어 최종 `java` 명령을 조립하고 톰캣을 기동하거나 종료하는 메인 제어 스크립트이다. `startup.sh`/`shutdown.sh`나 직접 만든 start/stop 스크립트도 결국 내부에서 이 스크립트를 `start`/`stop` 인자로 호출한다.

```bash
vi /svc/was/tomcat/bin/catalina.sh
```

```bash
# Set UMASK unless it has been overridden
if [ -z "$UMASK" ]; then
    UMASK="0027"
fi
umask $UMASK
umask 0026
```

- Tomcat이 생성하는 로그, work/temp 디렉토리, 업로드 파일 등의 기본 권한을 제한하기 위한 설정이다.
- 기본값 0027은 디렉토리 750, 파일 640 권한으로 생성되며, other 계정의 접근을 차단한다.
- `umask 0026`은 위의 `umask $UMASK`를 덮어쓰므로 실제로는 디렉토리 751, 파일 640이 적용된다.
- 0026은 디렉토리에 other 실행(x) 권한만 추가하는 값이다. 목록 조회는 막으면서 웹서버 계정이나 로그 수집 에이전트 등 다른 계정이 경로를 통과할 수 있도록 하기 위함이다.
- 파일에는 other 권한이 부여되지 않으므로 소스, 설정, 로그 파일의 외부 노출을 방지할 수 있다.

(AS - IS)

```bash
if [ -z "$CATALINA_OUT" ] ; then
  CATALINA_OUT="$CATALINA_BASE"/logs/catalina.out
fi
```

(TO - BE)

```sh
# out 로그를 인스턴스명으로 생성되게 설정
if [ -z "$CATALINA_OUT" ] ; then
  CATALINA_OUT="$CATALINA_BASE"/logs/$SERVER_NAME.out
fi
```

- Tomcat의 표준출력(stdout)과 표준에러(stderr)가 기록되는 파일명을 인스턴스명으로 변경하기 위한 설정이다.
- 기본값인 `catalina.out`은 모든 인스턴스가 같은 파일명을 사용하므로, 한 서버에 여러 인스턴스를 운영하면 로그 구분이 어렵다.
- 인스턴스명으로 파일을 생성하면 장애 발생 시 해당 인스턴스의 로그를 빠르게 식별할 수 있다.
- `$SERVER_NAME`은 Tomcat 기본 변수가 아니므로 setenv.sh 등에서 반드시 정의해야 한다. 정의하지 않으면 `logs/.out` 파일이 생성된다.

Tomcat 8 버전 미만 및 Native library 사용 시 설정

```sh
LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CATALINA_HOME/nativelib/lib
export LD_LIBRARY_PATH
```

- Tomcat Native 라이브러리(libtcnative)의 경로를 JVM에 알려주기 위한 설정이다.
- Tomcat Native는 APR 커넥터와 OpenSSL 기반 SSL 처리에 사용되며, 순수 Java 커넥터보다 I/O 및 SSL 처리 성능이 우수하다.
- 경로가 설정되지 않으면 라이브러리를 찾지 못해 기동 로그에 경고가 출력되고, Tomcat은 기본 Java 커넥터로 동작한다.
- 정상 적용 여부는 기동 로그의 `Loaded Apache Tomcat Native library` 메시지로 확인할 수 있다.

---
### LogRotate

> Apache에서는 로그 회전 프로그램인 `rotatelogs`가 포함되어있었다. 하지만 Tomcat의 경우 그렇지 않으므로, OS의 `logrotate` 기능을 사용해야한다. (일반적으로 이렇고, Apache가 좀 특수한 경우)

---
#### 설정

```bash
vi /etc/logrotate.d/tomcat_test11
```

```ini
/log/was/tomcat/test11/logs/*.out {
copytruncate
daily
rotate 365
missingok
notifempty
dateext
}
```

- Tomcat의 `.out` 로그는 자체 로테이션 기능이 없어 계속 커지므로, logrotate로 주기적으로 분리하기 위한 설정이다.
- 로그 파일이 무한히 커지면 디스크 풀로 인한 서비스 장애가 발생할 수 있고, 장애 분석 시 원하는 시점의 로그를 찾기 어렵다.
- `copytruncate`: 원본을 복사한 뒤 원본 내용을 비우는 방식이다. Tomcat이 파일을 계속 열고 있으므로, 재기동 없이 로테이션하기 위해 사용한다.
- `daily`: 매일 로테이션한다.
- `rotate 365`: 로테이션된 파일을 365개(약 1년)까지 보관하고, 초과분은 삭제한다. 로그 보관 기간 정책을 준수하기 위함이다.
- `missingok`: 대상 로그 파일이 없어도 오류 없이 넘어간다.
- `notifempty`: 로그 파일이 비어 있으면 로테이션하지 않아 불필요한 빈 파일 생성을 방지한다.
- `dateext`: 로테이션 파일명에 숫자(.1, .2) 대신 날짜(-YYYYMMDD)를 붙여 특정 날짜의 로그를 쉽게 찾을 수 있게 한다.

```bash
vi /etc/logrotate.d/tomcat_test11_gclog
```

```ini
/log/was/tomcat/test11/gclogs/*.log {
copytruncate
daily
rotate 365
missingok
notifempty
dateext
}
```

- JVM이 기록하는 GC 로그를 일 단위로 분리·보관하기 위한 설정이다.
- GC 로그는 메모리 사용 추이, Full GC 발생 빈도, STW(Stop-The-World) 시간 분석에 사용되므로 장애 원인 분석과 튜닝을 위해 보관이 필요하다.
- GC 로그 역시 JVM이 파일을 계속 열고 있으므로 `copytruncate`로 재기동 없이 로테이션한다.
- 나머지 옵션은 `.out` 로그 설정과 동일하게 일 단위 로테이션, 1년 보관, 날짜 확장자를 적용한다.

설정 문법 확인 명령어

```bash
logrotate -d /etc/logrotate.d/tomcat_test11
```

강제기동 명령어

```bash
logrotate -f /etc/logrotate.d/tomcat_test11
```

---
#### LogRotate 옵션

| Log Rotate Options | Description |
| --- | --- |
| `copytruncate` | 로그 파일을 복사한 뒤 원본 파일을 비우는 방식<br/>Tomcat 프로세스가 파일 핸들을 계속 잡고 있는 경우 프로세스 재기동 없이 로그 로테이션 가능 |
| `daily` | 로그 파일 로테이션 주기 설정<br/>`daily`: 매일<br/>`weekly`: 매주<br/>`monthly`: 매달 |
| `rotate 365` | 로그 파일 보관 개수 설정<br/>설정한 개수를 초과하면 오래된 로그부터 삭제 |
| `missingok` | 로그 파일이 존재하지 않더라도 오류를 발생시키지 않음 |
| `notifempty` | 로그 파일이 비어 있으면 로테이션하지 않음 |
| `dateext` | 로테이션된 로그 파일 이름에 날짜를 추가 |

---
### JDBC Connection

> DB에 맞는 driver를 다운로드 받은 후 `$CATALINA_HOME/lib`에 업로드가 필요하다.
> 
> `server.xml`의 `<GlobalNamingResources>` 안에 `<Resource>`를 정의하고 `conf/context.xml` 에서 `<ResourceLink>`로 참조하는 것을 표준으로 한다.
> 
> 만약, `context.xml`에 `<Resource>`를 직접 정의하면 웹 애플리케이션마다 커넥션 풀이 따로 생성된다. (예: `initialSize = 20`, webapps 하위 애플리케이션 5개 -> 커넥션 100개 생성)
> 
> mysql-jdbc 다운로드 및 Java 버전 지원 매트릭스 : https://learn.microsoft.com/ko-kr/sql/connect/jdbc/microsoft-jdbc-driver-for-sql-server-support-matrix?view=sql-server-ver17

---
#### 전역 JNDI Resource 정의 (server.xml)

> JNDI(Java Naming and Directory Interface)는 Java 애플리케이션에서 외부 자원(데이터베이스, 메시징 시스템, EJB) 등에 접근하기 위한 표준 API
> 
> JNDI 는 자원의 주소록 같은 역할을 하며, Tomcat 등 컨테이너가 제공하는 자원을 설정된 이름으로 접근하게 도와준다.

```bash
vi /svc/was/tomcat/test11/conf/server.xml
```

```xml
<GlobalNamingResources>
  <!-- MariaDB -->
  <Resource name="jdbc/ExamDB"
            auth="Container"
            type="javax.sql.DataSource"
            testWhileIdle="true"
            testOnBorrow="true"
            testOnReturn="false"
            validationQuery="SELECT 1"
            timeBetweenEvictionRunsMillis="30000"
            minEvictableIdleTimeMillis="50000"
            softMinEvictableIdleTimeMillis="50000"
            maxTotal="100"
            maxIdle="100"
            minIdle="20"
            maxWaitMillis="10000"
            initialSize="20"
            username="test"
            password="test123"
            driverClassName="org.mariadb.jdbc.Driver"
            url="jdbc:mariadb://192.168.56.105:3306/testdb"/>

  <!-- MySQL -->
  <!-- MySQL 8 이상은 com.mysql.cj.jdbc.Driver 를 사용해야 한다. -->
  <Resource name="jdbc/ExamDB"
            auth="Container"
            type="javax.sql.DataSource"
            testWhileIdle="true"
            testOnBorrow="true"
            testOnReturn="false"
            validationQuery="SELECT 1"
            timeBetweenEvictionRunsMillis="30000"
            minEvictableIdleTimeMillis="50000"
            softMinEvictableIdleTimeMillis="50000"
            maxTotal="100"
            maxIdle="100"
            minIdle="20"
            maxWaitMillis="10000"
            initialSize="20"
            username="계정명"
            password="비밀번호"
            driverClassName="com.mysql.cj.jdbc.Driver"
            url="jdbc:mysql://192.168.56.105:3306/testdb?serverTimezone=Asia/Seoul"/>

  <!-- Oracle -->
  <!-- Oracle 은 validationQuery 로 SELECT 1 을 사용할 수 없다. (SELECT 1 FROM DUAL) -->
  <!-- oracle.jdbc.driver.OracleDriver 는 Deprecated 이므로 oracle.jdbc.OracleDriver 를 사용한다. -->
  <Resource name="jdbc/ExamDB"
            auth="Container"
            type="javax.sql.DataSource"
            testWhileIdle="true"
            testOnBorrow="true"
            testOnReturn="false"
            validationQuery="SELECT 1 FROM DUAL"
            timeBetweenEvictionRunsMillis="30000"
            minEvictableIdleTimeMillis="50000"
            softMinEvictableIdleTimeMillis="50000"
            maxTotal="100"
            maxIdle="100"
            minIdle="20"
            maxWaitMillis="10000"
            initialSize="20"
            username="계정명"
            password="비밀번호"
            driverClassName="oracle.jdbc.OracleDriver"
            url="jdbc:oracle:thin:@//192.168.56.105:1521/EXAM"/>

  <!-- MSSQL -->
  <Resource name="jdbc/SQLDB"
            auth="Container"
            type="javax.sql.DataSource"
            testWhileIdle="true"
            testOnBorrow="true"
            testOnReturn="false"
            validationQuery="SELECT 1"
            removeAbandonedOnMaintenance="true"
            removeAbandonedOnBorrow="true"
            removeAbandonedTimeout="60"
            logAbandoned="true"
            timeBetweenEvictionRunsMillis="30000"
            minEvictableIdleTimeMillis="50000"
            softMinEvictableIdleTimeMillis="50000"
            maxTotal="100"
            maxIdle="100"
            minIdle="20"
            maxWaitMillis="10000"
            initialSize="20"
            username="SA"
            password="test1!"
            driverClassName="com.microsoft.sqlserver.jdbc.SQLServerDriver"
            url="jdbc:sqlserver://192.168.56.105:1433;databaseName=testmssqltestdb;encrypt=true;trustServerCertificate=true;"/>
</GlobalNamingResources>
```

**공통 설정**
- `<GlobalNamingResources>`: DataSource를 서버 전역 JNDI 리소스로 등록하기 위한 설정이다. 여러 애플리케이션이 같은 커넥션 풀을 공유할 수 있고, DB 접속 정보를 애플리케이션 소스와 분리해 WAS에서 관리할 수 있다.
- 전역 리소스는 애플리케이션에서 바로 보이지 않으므로, `context.xml`에 `<ResourceLink>`를 추가해 연결해야 한다.
- `name`: 애플리케이션이 `java:comp/env/jdbc/ExamDB` 형태로 조회하는 JNDI 이름이다.
- `auth="Container"`: DB 인증을 애플리케이션이 아닌 Tomcat(컨테이너)이 처리하도록 한다.
- `type="javax.sql.DataSource"`: 커넥션 풀(DBCP2) 기반의 DataSource 객체로 생성한다.

**커넥션 유효성 검사**
- 방화벽 세션 타임아웃이나 DB의 `wait_timeout` 때문에 풀에 있는 커넥션이 끊어질 수 있다. 끊어진 커넥션을 애플리케이션에 전달하지 않도록 검증하기 위한 설정이다.
- `validationQuery`: 커넥션이 살아 있는지 확인하는 쿼리로, 가장 가벼운 쿼리를 사용한다.
- `testOnBorrow="true"`: 풀에서 커넥션을 꺼낼 때 검증하여, 애플리케이션이 죽은 커넥션을 받는 것을 방지한다.
- `testOnReturn="false"`: 반납 시에는 검증하지 않는다. 대여 시 이미 검증하므로 불필요한 쿼리 부하를 줄이기 위함이다.
- `testWhileIdle="true"`: 유휴 커넥션도 백그라운드에서 주기적으로 검증하여, 사용되지 않는 동안 끊어진 커넥션을 미리 제거한다.

**유휴 커넥션 정리 (Evictor)**
- `timeBetweenEvictionRunsMillis="30000"`: 30초마다 Evictor 스레드를 실행해 유휴 커넥션을 검사한다. 0 이하이면 Evictor가 동작하지 않아 `testWhileIdle`도 적용되지 않는다.
- `minEvictableIdleTimeMillis="50000"`: 50초 이상 사용되지 않은 커넥션은 `minIdle`과 관계없이 제거 대상이 된다.
- `softMinEvictableIdleTimeMillis="50000"`: 50초 이상 유휴 상태인 커넥션을 제거하되, `minIdle` 개수는 유지한다.
- 유휴 커넥션을 DB나 방화벽 타임아웃보다 먼저 정리해서, 끊어진 커넥션이 풀에 남는 것을 방지하기 위함이다.

**풀 크기**
- `initialSize="20"`: 기동 시 커넥션 20개를 미리 생성한다. 첫 요청부터 커넥션 생성 지연 없이 처리하기 위함이다.
- `minIdle="20"`: 최소 20개의 유휴 커넥션을 유지해 갑작스러운 요청 증가에 대응한다.
- `maxIdle="100"`: 유휴 커넥션을 최대 100개까지 보관한다. `maxTotal`과 같게 두어, 사용량이 많을 때 커넥션이 반복적으로 생성·해제되는 것을 방지한다.
- `maxTotal="100"`: 동시에 사용 가능한 최대 커넥션 수이다. DB의 최대 접속 수(`max_connections` 등)를 초과하지 않도록 인스턴스 수를 고려해 설정해야 한다.
- `maxWaitMillis="10000"`: 풀이 고갈됐을 때 커넥션을 최대 10초까지 기다리고, 초과하면 예외를 발생시킨다. 요청 스레드가 무한 대기하는 것을 방지하기 위함이다.

**접속 정보**
- `username` / `password`: DB 접속 계정이다.
- `driverClassName`: DB 벤더별 JDBC 드라이버 클래스이다. 해당 드라이버 jar는 `$CATALINA_HOME/lib`에 있어야 한다. 전역 리소스는 공통 클래스로더가 로드하기 때문이다.
- `url`: DB 주소, 포트, DB명과 벤더별 접속 옵션을 지정한다.

**MSSQL 추가 설정 (Abandoned 커넥션 회수)**
- 애플리케이션이 커넥션을 반납하지 않는 누수(leak)가 발생하면 풀이 고갈된다. 이를 방지하기 위해 방치된 커넥션을 강제로 회수하는 설정이다.
- `removeAbandonedOnBorrow` / `removeAbandonedOnMaintenance`: 대여 시점과 Evictor 실행 시점에 방치된 커넥션을 검사한다.
- `removeAbandonedTimeout="60"`: 60초 이상 반납되지 않은 커넥션을 방치된 것으로 판단한다.
- `logAbandoned="true"`: 회수된 커넥션을 빌려간 코드의 스택트레이스를 로그에 남겨 누수 지점을 추적할 수 있게 한다.

---
#### 전역 JNDI Resource 연결 (context.xml)

```bash
vi /svc/was/tomcat/test11/conf/context.xml
```

```xml
<Context>
  ..
  <ResourceLink name="jdbc/ExamDB" global="jdbc/ExamDB" type="javax.sql.DataSource" />
</Context>
```

- `$CATALINA_BASE/conf/context.xml`은 모든 웹 애플리케이션에 적용되는 기본 Context 설정 파일이므로, 전역 JNDI Resource를 모든 웹 애플리케이션에서 공통으로 사용하는 경우 `<ResourceLink>`를 해당 파일에 설정한다.
- 특정 웹 애플리케이션에서만 전역 JNDI Resource를 사용하려는 경우에는 해당 애플리케이션의 `META-INF/context.xml`에 `<ResourceLink>`를 설정한다.

---
#### JDBC Connection Options

| 기본 설정 | Description |
| --- | --- |
| `name="jdbc/ExamDB"` | JNDI 리소스 이름 |
| `auth="Container"` | 인증 방식<br/>보통 `Container`로 설정하며 Tomcat이 인증을 담당<br/>`Application`으로 두면 애플리케이션이 직접 리소스를 생성·관리 |
| `type="javax.sql.DataSource"` | 리소스 타입<br/>JDBC 연결을 위한 DataSource 객체임을 의미<br/>Tomcat 10 이상도 이 값은 `javax.sql.DataSource`를 그대로 사용 |
| **커넥션 테스트 및 검증** | **Description** |
| `testWhileIdle="true"` | 커넥션이 유휴 상태일 때 백그라운드 스레드가 주기적으로 유효한지 검사 |
| `testOnBorrow="true"` | 커넥션 풀에서 커넥션을 가져올 때 유효한지 먼저 테스트 |
| `testOnReturn="false"` | 커넥션을 반환할 때 유효성 검사를 하지 않음<br/>일반적으로 성능 이슈로 `false` 권장 |
| `validationQuery` | 커넥션의 유효성을 검사하기 위한 쿼리 (1 row만 반환해야 함)<br/>Oracle은 `SELECT 1 FROM DUAL` 사용 |
| `validationQueryTimeout` | `validationQuery` 수행 시간 timeout<br/>default: `-1` |
| **유휴 커넥션 관리** | **Description** |
| `timeBetweenEvictionRunsMillis` | evictor 스레드가 유휴 커넥션을 검사하는 주기(ms)<br/>default: `-1` (음수이면 실행하지 않음) |
| `minEvictableIdleTimeMillis` | 설정한 시간 이상 유휴 상태인 커넥션을 제거(ms)<br/>default: `1800000` (30분) |
| `softMinEvictableIdleTimeMillis` | `minEvictableIdleTimeMillis`와 동일하지만 `minIdle` 개수만큼은 남겨두고 제거(ms)<br/>default: `-1`<br/>※ `softMini...`가 아니라 `softMin...`임 (오타 주의) |
| `numTestsPerEvictionRun` | evictor가 한 번에 검사할 커넥션 개수<br/>default: `3` |
| **비정상 커넥션 회수** | **Description** |
| `removeAbandonedOnMaintenance` | 백그라운드 스레드 실행 시 오랫동안 반납되지 않은 커넥션을 강제 회수 |
| `removeAbandonedOnBorrow` | 커넥션을 가져올 때 오랫동안 반납되지 않은 커넥션을 강제 회수 |
| `removeAbandonedTimeout` | `removeAbandoned` 옵션의 timeout(초)<br/>이 값을 반드시 함께 지정해야 회수가 동작<br/>정상적인 장시간 쿼리까지 끊을 수 있으므로 값 산정에 주의 |
| `logAbandoned` | 비정상 커넥션 회수 시 로그를 남기는 설정<br/>누수가 발생한 코드 추적에 유용 |
| **커넥션 풀 크기 관련** | **Description** |
| `maxTotal="100"` | 커넥션 풀에서 동시에 가질 수 있는 최대 커넥션 수<br/>이전 버전은 `maxActive`<br/>default: `8` |
| `maxIdle="100"` | 풀에 유지할 수 있는 최대 유휴 커넥션 수<br/>default: `8` |
| `minIdle="20"` | 항상 유지할 최소 유휴 커넥션 수<br/>default: `0` |
| `initialSize="20"` | 풀 생성 시 최초로 만들 커넥션 수<br/>default: `0`<br/>초기 커넥션 생성 시간 단축에 유리 |
| `maxWaitMillis="10000"` | 커넥션이 부족한 경우 최대 기다릴 시간(ms)<br/>초과 시 예외 발생 |
| **DB 접속 정보** | **Description** |
| `username` / `password` | DB 접속 계정 및 비밀번호<br/>XML에 평문으로 남으므로 파일 권한을 `600`으로 제한 |
| `driverClassName` | JDBC 드라이버 클래스 이름 (연동 DB에 따라 다르게 설정)<br/>MySQL 8+ : `com.mysql.cj.jdbc.Driver`<br/>MariaDB : `org.mariadb.jdbc.Driver`<br/>Oracle : `oracle.jdbc.OracleDriver`<br/>MSSQL : `com.microsoft.sqlserver.jdbc.SQLServerDriver`<br/>PostgreSQL : `org.postgresql.Driver` |
| `url` | DB 접속 URL. IP, Port, DB명을 지정<br/>MariaDB 드라이버는 `jdbc:mariadb://` 스킴 사용 |
| **MySQL URL Options** | **Description** |
| `serverTimezone=Asia/Seoul` | DB 서버의 타임존이 KST처럼 모호한 값일 때 발생하는 오류를 방지 |
| `useSSL=false` | SSL 미사용 시 출력되는 경고 로그를 제거<br/>운영 환경에서 암호화가 필요하면 `true`로 두고 truststore 구성 |
| **MSSQL URL Options** | **Description** |
| `encrypt=true` | SQL Server와 JDBC 드라이버 간 데이터 통신을 암호화(SSL/TLS)<br/>MSSQL JDBC 드라이버 10.x부터 기본값이 `true` |
| `trustServerCertificate=true` | 서버가 제공하는 SSL 인증서를 검증하지 않고 신뢰한다는 의미<br/>테스트 환경이나 사설 인증서를 사용할 경우에 한해 사용 |

---
### Nativelib (Deprecated)

> Nativelib(APR)은 **Tomcat이 순수 Java 구현만 사용하지 않고, OS의 네이티브 기능을 JNI로 활용할 수 있도록 해주는 라이브러리**이다. (ex: OpenSSL)
> 
> **Nativelib(APR) 설정은 Tomcat 8 버전 이상에서는 필요 없다.**

```bash
cd /svc/was/tomcat/bin

tar -xvf tomcat-native.tar.gz

cd tomcat-native-$version-src/native

./configure --prefix=$CATALINA_HOME/nativelib --with-apr=/usr/local/apr --with-java-home=$JAVA_HOME

make

make install
```

---
## Tomcat 보안 설정

---
### 보안 조치

---
#### 기본 배포 웹앱 삭제

```bash
cd /svc/was/tomcat/growin11/webapps
rm -rf docs examples manager host-manager
```

- Tomcat manager 등 사용하지 않을 시 불필요한 디렉토리 삭제

---
#### 버전 정보 노출 차단

`server.xml`

```xml
<Connector ... server="Test" />
```

- 응답 헤더에서 Tomcat 정보 대신 지정한 문자열을 반환하기 위한 설정 (이미 앞선 설정에서 적용한 부분)

```xml
<Valve className="org.apache.catalina.valves.ErrorReportValve" showReport="false" showServerInfo="false"/>
```

- Tomcat 기본 에러 페이지의 정보 노출을 줄이는 설정
- `showReport="false"` → 상세 오류 보고서 및 스택 트레이스 노출 억제
- `showServerInfo="false"` → 오류 페이지 하단의 Tomcat 서버 정보 노출 억제

`ServerInfo.properties`

```bash
cd /svc/was/tomcat/lib
mkdir -p /svc/was/tomcat/lib/org/apache/catalina/util
vi /svc/was/tomcat/lib/org/apache/catalina/util/ServerInfo.properties
```

```ini
server.info=
server.number=
server.built=
```

- `$CATALINA_HOME/lib/org/apache/catalina/util/ServerInfo.properties`를 별도로 생성하여, **Tomcat의 `catalina.jar` 내부에 포함된 기본 `ServerInfo.properties`의 서버명·버전·빌드 정보를 오버라이드**하는 설정
- `server.info`, `server.number`, `server.built` 값을 비워 **Tomcat 제품명, 버전 및 빌드 정보 노출을 최소화**하는 목적

---
### AJP 보안

> **Ghostcat (CVE-2020-1938)**
> 
> AJP 커넥터가 외부에 노출되면 인증 없이 웹 어플리케이션의 임의 파일을 읽을 수 있고, 파일 업로드가 가능한 경우 원격 코드 실행으로 이어진다.
> 
> 이에, AJP 커넥터는 반드시 내부 IP 에만 바인딩하고 secret 을 설정한다.
> 
> 만약 AJP를 사용하지 않는다면, 커넥터를 주석 처리한다.

|Tomcat 버전|AJP Secret 설정|비고|
|---|---|---|
|Tomcat 5.5 / 6.0|`request.useSecret="true"`  <br>`request.secret="growintest"`|인증 실패 시 `403`이 아닌 `200`으로 응답하며 페이지 내용이 비어 보일 수 있음|
|Tomcat 7.0.99 이하|`requiredSecret="growintest"`||
|Tomcat 7.0.100 이상|`secretRequired="true"`  <br>`secret="growintest"`||
|Tomcat 8.5.50 이하|`requiredSecret="growintest"`||
|Tomcat 8.5.51 이상|`secretRequired="true"`  <br>`secret="growintest"`||
|Tomcat 9.0.30 이하|`requiredSecret="growintest"`||
|Tomcat 9.0.31 이상|`secretRequired="true"`  <br>`secret="growintest"`||
|Tomcat 10 이상|`secretRequired="true"`  <br>`secret="growintest"`||

---
## 이외 설정

---
### Tomcat 설치된 버전 확인

```bash
cd $CATALINA_HOME/lib

/usr/java/jdk-17.0.20/bin/java -cp catalina.jar org.apache.catalina.util.ServerInfo
```

---
### 직접 기동 명령어

```bash
sudo -u tomcat /svc/was/tomcat/bin/starttest11.sh
```

---
### Systemd 등록

```bash
vi /etc/systemd/system/tomcat_test11.service
```

```ini
[Unit]
Description=tomcat service
After=syslog.target network.target

[Service]
Type=forking
User=tomcat
Group=tomcat
ExecStart=/svc/was/tomcat/bin/starttest11.sh
ExecStop=/svc/was/tomcat/bin/stoptest11.sh
SuccessExitStatus=143

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable tomcat_test11.service
systemctl status tomcat_test11.service
```

---
### Tomcat 10 이상 마이그레이션 (javax -> jakarta)

**애플리케이션**

```
SEVERE [Catalina-utility-2] org.apache.catalina.core.StandardContext.startInternal One or more Filters failed to start.

SEVERE [Catalina-utility-2] org.apache.catalina.core.StandardContext.startInternal Context [/gwj] startup failed due to previous errors
```

- Tomcat 10 이후에 `javax.servlet.*` 기반의 라이브러리를 사용한다면, 위와 같은 에러메시지가 발생한다. (위 에러메시지는 다양한 원인이 있을 수 있지만, 이를 의심해볼 수 있다는 것)
- 이 경우 `jakarta.servlet.*` 를 사용하는 WAR로 전환해야한다.
- Apache Tomcat Migration Tool 로 WAR를 자동 변환할 수 있다.
	- https://tomcat.apache.org/download-migration.cgi
	- `java -jar migration-x.x.x-shaded.jar old.war new.war`


**DB 설정**

> DBCP(데이터베이스 커넥션 풀) 설정 시 url에 timezone 추가가 필요하다.
> 
> `javax.sql` 은 Java SE 의 패키지이므로 jakarta 로 바뀌지 않는다

```xml
<Resource name="jdbc/mariadb"
          auth="Container"
          type="javax.sql.DataSource"
          maxTotal="10"
          initialSize="10"
          minIdle="3"
          validationQuery="SELECT 1"
          testWhileIdle="true"
          testOnBorrow="true"
          timeBetweenEvictionRunsMillis="10000"
          minEvictableIdleTimeMillis="50000"
          softMinEvictableIdleTimeMillis="5000"
          numTestsPerEvictionRun="2"
          username="계정명"
          password="비밀번호"
          driverClassName="com.mysql.cj.jdbc.Driver"
          url="jdbc:mysql://192.168.56.105:3306/study_db?serverTimezone=Asia/Seoul"/>
```

---
### 점검 항목

| 구분 | 점검 항목 | 확인 방법 |
| --- | --- | --- |
| 프로세스 | 지정한 계정으로 기동되었는가 | `ps -ef \| grep java` |
| 포트 | HTTP / AJP 포트가 의도한 IP에 바인딩되었는가 | `netstat -natp \| grep java` |
| 기본 웹앱 | `manager` / `examples`가 삭제되었는가 | `ls $CATALINA_HOME/webapps` |
| 버전 노출 | 응답 헤더와 에러 페이지에 버전이 노출되지 않는가 | `curl -I http://127.0.0.1:8080` |
| JVM | 힙 / 메타스페이스 / GC 옵션이 적용되었는가 | `jcmd ${PID} VM.flags` |
| GC 로그 | GC 로그가 지정 경로에 생성되는가 | `ls -l $CATALINA_BASE/gclogs` |
| 로그 | out / catalina / access 로그가 LOG 파티션에 쌓이는가 | `df -h /log`<br/>`ls -al $CATALINA_BASE/logs` |
| 심볼릭 링크 | `logs`, `gclogs`, `accesslogs`가 각각 다른 경로를 가리키는가 | `ls -al $CATALINA_BASE` |
| Logrotate | logrotate 설정 문법에 오류가 없는가 | `logrotate -d /etc/logrotate.d/tomcat_growin11` |
| 클러스터 | 클러스터 멤버가 모두 조회되는가 | 기동 로그의 `memberAdded` 확인 |
| 세션 | 한 노드 종료 시 세션이 유지되는가 | `JSESSIONID` 확인 후 노드 절체 테스트 |
| Datasource | DB 커넥션이 정상 생성되는가 | 기동 로그 및 애플리케이션 조회<br/>포트 확인 시 DB 포트가 `ESTABLISHED` 상태인지 확인<br/>`netstat -natp \| grep java \| grep EST` |

---
