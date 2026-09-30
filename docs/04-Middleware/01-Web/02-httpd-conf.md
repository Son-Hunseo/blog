---
title: Apache Http Server 설치 방법 및 운영환경에서의 주요 설정
description: Apache HTTP Server의 소스 빌드부터 운영 환경 설정, MPM 튜닝, SSL/TLS, Tomcat 연동, Reverse Proxy, 보안 설정 및 운영 점검까지 정리한 Apache 구축·운영 가이드
date: 2026-09-21
sidebar_class_name: hidden-sidebar-item
image: /img/posts/04-Middleware/01-Web/02-httpd-conf/apache.png
---
---
## 기준

---
### Version

> Apache HTTP Server : `2.4.68` (2026-06-08 RELEASE)
> APR                            : `1.7.6`
> APR-Util                     : `1.6.5`
> Tomcat Connectors  : `1.2.50`

---
### 구성 기준

**파일 시스템**

| 구분          | 경로   |
| ----------- | ---- |
| Service 파티션 | /svc |
| Log 파티션     | /log |


**디렉토리 구성**

| 구분             | 명명규칙                               | 예시                         |
| -------------- | ---------------------------------- | -------------------------- |
| Service HOME   | `/svc`                             | `/svc`                     |
| WebServer HOME | `${Service HOME}/{3rd Party 기능구분}` | `/svc/web`                 |
| Apache HOME    | `{WebServer HOME}/apache`          | `/svc/web/apache`          |
| 명령어 HOME       | `{Apache HOME}/bin`                | `/svc/web/apache/bin`      |
| 설정 HOME        | `{Apache HOME}/conf`               | `/svc/web/apache/conf`     |
| 인증서 HOME       | `{Apache HOME}/conf/ssl`           | `/svc/web/apache/conf/ssl` |
| LOG HOME       | `{Apache HOME}/logs`               | `/svc/web/apache/logs`     |

---
## Apache 설치

> Apache Http Server 소스 다운로드 : https://httpd.apache.org/download.cgi
> APR & APR-Util 소스 다운로드 : https://apr.apache.org/
> Tomcat Connectors 소스 다운로드 : https://tomcat.apache.org/download-connectors.cgi
> 컴파일 및 설치 방법 공식 문서 : https://httpd.apache.org/docs/current/en/install.html

---
### 소스 빌드를 하는 이유

그냥 `dnf install -y httpd` 하면 편하지 않나? 라고 생각할 수 있다.

맞다. 압도적으로 편하다.

그렇지만, 다음과 같은 이유들로 인해 소스 빌드를 한다.

**설치 경로를 회사 표준으로 맞추기 위해**
- 예: `/svc/web/apache`, `/app/apache`, `/engn001/apache`처럼 OS 기본 경로(`/etc/httpd`, `/usr/sbin/httpd`)가 아닌 사내 표준 디렉토리 구조 사용.

**필요한 모듈만 정확히 포함하기 위해**
- 예를 들어 `mod_ssl`, `mod_http2`, `mod_proxy`, `mod_jk` 등을 회사 표준에 맞춰 활성화하거나, 불필요한 모듈을 제외할 수 있음.

**APR, APR-util, OpenSSL, PCRE2 같은 의존성 버전을 통제하기 위해**
- WAS, 보안 솔루션, 사내 모듈과의 호환성을 맞춰야 할 때.

---
### 패키지 의존성

1. APR / APR-Util
	- 운영체제별 차이(파일, 소켓, 스레드, 메모리 등)를 감싸 주는 이식성 라이브러리로, httpd가 여러 OS에서 같은 코드로 동작하게 하는 기반
2. PCRE2
	- `RewriteRule`, `LocationMatch` 같은 지시어의 정규표현식을 처리하는 라이브러리
3. ANSI-C 컴파일러 + 빌드 도구 (컴파일러는 `gcc` 권장)
4. (mod_ssl 빌드 시) `openssl-devel`
	- HTTPS(TLS) 암호화 기능을 컴파일하는 데 필요한 OpenSSL 헤더와 라이브러리
	- HTTPS/TLS를 쓰는 환경에서 필요하므로 사실상 필수
5. (APR-Util을 srclib에 번들 빌드 시) `expat-devel`
	- 아래 빌드 절차에서 APR / APR-Util을 Apache 소스 내부로 이동시켜 빌드하기 때문
	- APR-Util이 XML을 파싱할 때 쓰는 Expat 라이브러리
6. (mod_deflate 빌드 시) `zlib-devel`
	- 응답을 gzip으로 압축해 전송하는 기능에 쓰이는 압축 라이브러리
	- 다른 압축 방식을 사용할 경우 사용하지 않지만, 매우 높은 확률로 사용
7. (mod_jk 빌드 시) `perl-devel`
	- mod_jk는 Perl 스크립트인 `apxs`로 빌드하므로 Perl 인터프리터가 필요
	- 이 옵션은 mod_jk 빌드시만 사용하므로, 어느정도 Opitonal 하다고 볼 수 있다.


**설치 명령어 (RedHat 계열 기준)**

```bash
# 설치 유무 확인 명령어
rpm -qa | grep gcc-c++
rpm -qa | grep make
rpm -qa | grep pcre2-devel
rpm -qa | grep openssl-devel
rpm -qa | grep expat-devel
rpm -qa | grep zlib-devel
rpm -qa | grep perl-devel

# 레포지토리(Local or Remote)가 존재할 경우
dnf install -y gcc-c++
dnf install -y make
dnf install -y pcre2-devel
dnf install -y openssl-devel
dnf install -y expat-devel
dnf install -y zlib-devel
dnf install -y perl-devel

# 반입해서 설치하는 경우
dnf install ./반입폴더/*.rpm
```

---
### 빌드

> 사람마다 '빌드'라고 하는 사람도 있고, '컴파일'이라고 하는 사람도 있는데 정확히 구분하면 아래와 같다.
> 
> 1. 빌드 환경 설정 (`./configure`) - APR 위치, 각종 모듈 사용 여부, 설치 경로 등을 결정하고 `Makefile` 생성
> 2. `make` 빌드
>     - `gcc`로 컴파일 
> 	    - c 코드 --컴파일--> 어셈블리 코드 --어셈블--> 오브젝트 파일(`.o`)
> 	    - ex: `http.c` -> `httpd.o` 등
>     - 각 `.o` 파일을 링크
> 	    - 오브젝트 파일(`.o`) --링크--> 실행파일(`httpd`)
> 
> 결국 빌드 과정 안에 컴파일 과정이 있는 것이다.

```bash
tar -xvf httpd-2.4.68.tar.gz
tar -xvf apr-1.7.6.tar.gz
tar -xvf apr-util-1.6.5.tar.gz
tar -xvf tomcat-connectors-1.2.50-src.tar.gz
```

- 반입한 파일 압축 해제

```bash
mv apr-1.7.6 /root/httpd-2.4.68/srclib/apr
mv apr-util-1.6.5 /root/httpd-2.4.68/srclib/apr-util
```

- apr, apr-util 을 Apache 소스 내부로 이동

```bash
cd /root/httpd-2.4.68
./configure --prefix=/svc/web/apache --enable-mods-shared=all --enable-ssl --with-included-apr --with-included-apr-util --with-mpm=event
```

- 설정 값을 지정하여 `Makefile` 생성
- 형식
	- `./configure --prefix=[Apache 설치할 경로] --enable-mods-shared=all --enable-ssl --with-included-apr --with-included-apr-util --with-mpm=[prefork | worker | event]`

```bash
make
make install
```

- 빌드

```bash
cd /root/tomcat-connectors-1.2.50-src/native
./configure --with-apxs=/svc/web/apache/bin/apxs
make
make install
```

- Tomcat-connector의 `Makefile` 생성 후 빌드

```bash
cd /svc/web/apache
rm -rf man manual
```

- 불필요한 디렉토리(메뉴얼 문서) 삭제

```bash
mkdir -p /log/web/apache/logs
rm -rf /svc/web/apache/logs
ln -s /log/web/apache/logs /svc/web/apache/logs
```

- Log 파티션 분리를 하는 경우, 심볼릭 링크로 분리

---
### 컴파일 옵션

| Compile Options                     | Description                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `prefix`                            | 설치 경로를 지정<br />Apache 바이너리, 설정 파일, 로그 파일 등이 해당 경로 아래에 설치                                             |
| `enable-mods-shared=all`            | 모든 모듈을 공유 라이브러리(Shared Module) 형태로 빌드<br />필요할 때 `LoadModule` 지시어를 사용하여 활성화할 수 있도록 설정                |
| `enable-ssl`                        | HTTPS(SSL/TLS) 지원 활성화<br />`mod_ssl` 모듈을 포함하여 SSL을 사용할 수 있도록 설정                                      |
| `enable-http2`                      | HTTP/2 지원(`mod_http2`) 활성화<br />`libnghttp2-devel` 패키지 필요                                            |
| `with-included-apr`                 | APR(Apache Portable Runtime) 라이브러리를 Apache 소스에 포함된 버전으로 빌드<br />시스템에 설치된 APR을 사용하지 않고 패키지 내부의 APR 사용 |
| `with-included-apr-util`            | APR-Util 라이브러리도 Apache 소스에 포함된 버전으로 빌드                                                               |
| `with-mpm=event`                    | Multi-Processing Module(MPM) 방식을 지정<br />`prefork` / `worker` / `event` 중 선택                         |
| `with-pcre`                         | PCRE2의 `pcre2-config` 스크립트 경로를 지정<br />디렉터리가 아니라 `pcre2-config` 파일의 전체 경로를 지정                        |
| `with-apxs`<br />(Tomcat Connector) | `mod_jk` 컴파일 시 Apache의 `apxs` 경로를 지정<br />해당 `apxs`를 통해 `mod_jk.so`가 Apache의 `modules` 디렉터리에 설치      |

---
### MPM 종류

| 종류          | Description                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Prefork** | 요청 처리 구조: **프로세스 기반**<br />하나의 Child Process가 하나의 Thread를 가지며, 한 번에 하나의 연결을 처리<br />응답 Process를 미리 생성해 두고 Client 요청에 응답<br />프로세스 수가 증가하므로 상대적으로 많은 메모리 사용<br />PHP 등 Non-Thread-Safe 모듈 사용 시 선택                   |
| **Worker**  | 요청 처리 구조: **멀티 프로세스 + 멀티 스레드**<br />각 Child Process가 여러 개의 Thread를 사용<br />각 Thread가 한 번에 하나의 연결을 담당<br />Prefork 대비 메모리 사용량이 적음<br />Multi-CPU 환경 및 통신량이 많은 서버에 적합                                                |
| **Event**   | Apache HTTP Server 2.4 계열에서 일반적으로 권장되는 MPM<br />Worker와 동일하게 멀티 프로세스 + 멀티 스레드 구조 사용<br />Keep-Alive 연결 처리 방식 개선<br />Listener Thread가 Keep-Alive 상태의 연결을 관리하여 Worker Thread가 불필요하게 점유되는 것을 줄임<br />대량 동시 연결 처리에 유리 |

---
## Apache 설정

---
### httpd.conf

---
#### 일반적인 설정

```bash
vi /svc/web/apache/conf/httpd.conf
```

```conf
Listen 80
```

- 어떤 IP와 포트에서 연결을 받을지 지정하는 설정
- 위처럼 그냥 80으로 설정하면, 모든 네트워크 인터페이스에서 TCP 80으로 수신한다.
- 만약 특정 IP에서만 서비스하려면 IP와 포트를 함께 지정한다. (ex : `Listen 192.168.0.30:80`)

```conf
LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
LoadModule ssl_module modules/mod_ssl.so
```

- 위 옵션은 SSL 사용 시 활성화시켜야 하는 모듈이다.
- 사용해야할 경우 주석을 해제한다.

```conf
User apache
Group apache
```

- 자식 프로세스의 기동 계정 설정이다.
- 부모 프로세스의 경우 `su - apache 실행명령어` 혹은 Systemd로 등록할 경우 Systemd의 설정 파일에 계정을 지정할 수 있다.
- 다만, 이 경우 일반 사용자는 기본적으로 `80`, `443` 같은 1024 미만 포트에 바인딩할 수 없기 때문에, 위 처럼 80포트로 설정할 경우 부모 프로세스는 root로 기동한다.

```conf
#ServerAdmin you@example.com
```

- 관리자 연락처 메타데이터 설정이다.
- 보통 쓸 일이 없으므로 주석처리한다.

```conf
ServerName 127.0.0.1
```

- Apache가 자기 자신을 어떤 호스트명과 포트로 식별할지 지정하는 설정이다.
- 예를 들어 : `ServerName www.example.com` 이렇게 설정할 수 있다.
- vhost를 사용하는 경우 `127.0.0.1`로 지정해둔다. (어짜피 덮어씌워짐)
	- 없어도 되는 설정인데 이렇게 지정하는 이유는 이 설정이 없을 경우 기동마다 `AH00558: Could not reliably determine the server's fully qualified domain name` 경고가 뜬다. 이에 경고를 억제하기 위함이다.
	- vhost : 하나의 Apache 서버에서 여러 웹사이트나 서비스를 서로 다른 설정으로 운영하는 기능

```conf
DocumentRoot "/svc/web/apache/htdocs"
<Directory "/svc/web/apache/htdocs">
    Options None
    AllowOverride None
    Require all granted
</Directory>
```

- `htdocs`는 Apache의 정적 웹 파일을 두는 기본 디렉토리이다. (DocumentRoot)
	- `http://서버주소/index.html`로 접근할 경우 `/svc/web/apache/htdocs/index.html`을 내려준다.
- `Options None` : 디렉터리 인덱싱, CGI 실행, SSI, 심볼릭 링크 추적 같은 부가기능을 기본 차단
	- 단순 정적 파일 제공 용도라면 킬 이유가 없음
- `AllowOverride None` : `.htaccess`로 하위 디렉터리에서 임의로 Apache 설정을 바꾸지 못하게 함
	- 운영 설정을 `httpd.conf`에서 통제하기 쉽게 하기 위함
- `Require all granted` : 웹 루트 자체는 외부 요청이 들어와야 하므로 HTTP 접근은 허용
- 결론적으로 이 설정의 이유는 "htdocs는 웹에 공개하되, 불필요한 Apache 기능은 최대한 막아두기 위해서" 이다.

```conf
ErrorLog "|/svc/web/apache/bin/rotatelogs logs/error_log.%Y%m%d 86400 +540"
..

<IfModule log_config_module>
	CustomLog "|/svc/web/apache/bin/rotatelogs logs/access_log.%Y%m%d 86400 +540" combined
</IfModule>
```

- `/svc/web/apache/bin/rotatelogs`는 Apache HTTP Server에 기본 포함되는 로그 유틸리티 바이너리이다.
- Apache의 에러 로그와 커스텀 로그를 `rotatelogs`가 받아서 파일로 저장한다.
- `.%Y%m%d` 저장되는 파일 형식은 년월일이다.
- `86400`은 로그 회전 주기로 하루를 의미하며(초단위), `+540`은 한국 시간으로 설정하기 위해서 GMT +9시간(분단위)로 설정한 것이다.
- 결과적으로 Apache의 에러 로그와 커스텀 로그는 하루에 한번씩 회전하며, 한국 시간 기준으로 저장된다.

```conf
Include conf/extra/httpd-modjk.conf
Include conf/extra/httpd-mpm.conf
Include conf/extra/httpd-vhosts.conf
Include conf/extra/httpd-default.conf
Include conf/extra/httpd-ssl.conf
```

- 사용할 모듈들의 설정을 `httpd.conf`에 포함시키는 설정이다.
- `httpd-modjk.conf` : mod_jk 연동 시 추가
- `httpd-mpm.conf`, `httpd-mpm.conf`, `httpd-vhosts.conf`, `httpd-default.conf` 주석해제
- `httpd-ssl.conf` : SSL 사용 시 주석해제

---
#### Options 지시자

| Options              | Description                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| All                  | MultiViews 를 제외한 모든 옵션을 허용<br />Options 값이 공백일 때도 All 과 같음                                           |
| ExecCGI              | mod_cgi 를 사용하여 CGI 스크립트 실행 허용                                                                        |
| FollowSymLinks       | 심볼릭 링크를 허용                                                                                           |
| SymLinksIfOwnerMatch | 심볼릭 링크의 소유자가 원본 파일의 소유자와 같을 때만 허용                                                                    |
| Includes             | SSI 사용을 허용<br />mod_include 모듈이 필요하며 기본적으로 로드되어 있음                                                   |
| IncludesNOEXEC       | SSI 사용은 허용되지만 #exec 와 CGI 를 대상으로 한 #include 는 허용되지 않는다<br />SSI 를 사용하면서 시스템에 위험한 실행 태그는 허용하지 않는다는 설정 |
| Indexes              | index.html 이 없을 경우 디렉토리 목록 표시 허용<br />디렉토리 구조가 노출되므로 운영 환경에서는 반드시 제거                                 |
| MultiViews           | 웹 브라우저의 요청에 따라 적절한 페이지로 보여줌<br />브라우저 종류나 문서 종류에 따라 가장 적합한 페이지를 보여줄 수 있도록 하는 설정                      |
| None                 | 모든 옵션을 허용하지 않는다<br /> 보통 이를 표준으로(보안 점검 지적사항 예방)                                                      |

---
#### Log Format Combined

| Log Format            | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `%h`                  | 클라이언트 IP 주소<br/>ex) 192.168.1.1                                              |
| `%l`                  | RFC1413 ID (거의 항상 - 로 기록됨)<br/>ex) -                                         |
| `%u`                  | 사용자 이름(HTTP 인증 시 사용됨, 없으면 -)<br/>ex) -                                       |
| `%t`                  | 요청 시간(로그 기록 시간)<br/>ex) [02/Apr/2026:12:34:56 +0900]                         |
| `"%r"`                | 클라이언트의 요청 라인(메서드, 경로, 프로토콜)<br/>ex) "GET /index.html HTTP/1.1"               |
| `%>s`                 | 응답 HTTP 상태 코드<br/>ex) 200, 404, 500 …                                        |
| `%b`                  | 응답 바이트 크기(헤더 제외, 0일 경우 -)<br/>ex) 1024 or -                                  |
| `"%{Referer}i"`       | Referer(사용자가 이전에 방문한 페이지 URL)<br/>ex) https://www.test.com/home/test or -    |
| `"%{User-Agent}i"`    | User-Agent(브라우저 및 OS 정보)<br/>ex) "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" |
| `%D`                  | 요청 처리 시간(마이크로초)<br/>지연 구간 분석 시 유용하므로 추가를 권장                                  |
| `%{X-Forwarded-For}i` | L4/프록시를 거친 경우의 원본 클라이언트 IP<br/>앞단에 L4 또는 프록시가 있으면 추가                         |

---
### httpd-default.conf

---
#### 일반적인 설정

```bash
cd /svc/web/apache/conf/extra/htpd-default.conf
```

```conf
Timeout 120
```

- 기본값은 60초이다.
- 대용량 파일 업로드/다운로드나 모바일처럼 느린 클라이언트 환경에서는 전송 버퍼 대기 중에 연결이 끊길 수 있어서 여유를 두었다.
- 반대로 너무 길게 잡으면 느리거나 악의적인 연결이 스레드를 오래 점유하므로 120초에서 끊는다.
- 주의: mod_jk 백엔드(Tomcat)의 응답 대기 시간은 이 값이 아니라 `workers.properties`의 `socket_timeout`, `reply_timeout`이 결정한다. WAS 응답이 느려서 끊기는 문제를 이 값으로 해결하려고 하면 안 된다.

```conf
KeepAlive On
```

- 웹 페이지 하나에는 HTML 외에도 CSS, JS, 이미지 등 수십 개의 요청이 뒤따른다.
- 요청마다 TCP 연결을 새로 맺으면 핸드셰이크 비용이 반복되고, HTTPS라면 TLS 핸드셰이크까지 더해진다. 그래서 연결 재사용은 사실상 필수이다.
- 이에 연결을 재사용하는, Keep-Alive를 사용한다.
- 이에, `KeepAlive On` : On이 기본 설정이다. 이를 유지한다.

```conf
MaxKeepAliveRequests 2000
```

- 기본값 100은 정적 리소스가 많은 페이지나, 앞단 L4/프록시가 연결을 재사용하는 구조에서는 연결이 너무 자주 끊긴다.
- event MPM은 유휴 Keep-Alive 연결을 Listener Thread가 관리하므로, 값을 크게 잡아도 Worker Thread 부담이 적다.
- 0(무제한)은 쓰지 않는다. 한 연결이 계속 유지되면 L4 부하 분산이 특정 서버로 치우칠 수 있으므로 상한은 둔다.

```conf
KeepAliveTimeout 20
```

- 기본값은 5초이다. 사용자가 페이지를 보고 다음 클릭을 할 때까지 연결을 유지하도록 늘렸다.
- **event MPM을 전제로 한 값이다.** prefork/worker에서는 대기 중인 연결이 워커를 그대로 점유하므로 20초는 과하다.
- 앞단에 L4가 있다면 **L4의 세션(Idle) 타임아웃보다 짧게** 잡는다. 그래야 Apache가 먼저 연결을 정리하고, L4가 세션을 먼저 지워서 생기는 연결 리셋을 막을 수 있다.

```conf
ServerTokens Prod
ServerSignature Off
```

- 버전 정보가 노출되면 해당 버전의 알려진 CVE로 공격 대상을 특정하기 쉬워진다.
- 보안 취약점 점검에서 거의 항상 지적되는 항목이라 표준으로 넣는다.
- `Prod`로도 `Server: Apache` 문자열 자체는 남는다. 이것까지 없애려면 mod_security 같은 별도 모듈이 필요하다.

---
#### 설정 옵션들

| Options              | Description                                                                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timeout              | 다양한 상황에서 Apache가 I/O를 기다리는 시간을 정의(초)<br /><br />1) 클라이언트에서 데이터를 읽을 때 읽기 버퍼가 비어 있는 경우 TCP 패킷이 도착할 때까지 기다리는 시간<br /><br />2) 클라이언트에 데이터를 쓸 때 전송 버퍼가 가득 찬 경우 패킷 확인을 기다리는 시간<br /><br />3) CGI 스크립트의 개별 출력 블록을 기다리는 시간<br /><br />4) mod_ext_filter 필터링 프로세스의 출력을 기다리는 시간 |
| KeepAlive            | Keep-Alive 기능을 활성화<br /><br />하나의 TCP 연결에서 여러 개의 HTTP 요청을 처리할 수 있도록 함                                                                                                                                                                                                 |
| MaxKeepAliveRequests | 하나의 Keep-Alive 연결에서 최대 처리할 요청 개수를 설정<br /><br />설정한 요청 수만큼 처리한 후 연결을 닫음<br /><br />0은 무제한(권장하지 않음)                                                                                                                                                                    |
| KeepAliveTimeout     | Keep-Alive 연결이 유지될 최대 시간(초)<br /><br />클라이언트가 새 요청을 보내지 않으면 지정된 시간이 지난 후 연결을 닫음<br /><br />너무 길면 유휴 연결이 워커를 점유함(event MPM은 영향이 적음)                                                                                                                                    |
| ServerTokens         | 서버가 `Server` 응답 헤더에 어떤 정보를 포함할지 설정<br /><br />Full : `Apache/2.4.68 (Unix) OpenSSL/3.0.7`<br />OS : `Apache/2.4.68 (Unix)`<br />Minimal : `Apache/2.4.68`<br />Minor : `Apache/2.4`<br />Major : `Apache/2`<br />Prod : `Apache`                                      |
| ServerSignature      | 에러 페이지 하단에 서버 버전/호스트명 서명을 출력할지 여부<br /><br />Off로 설정하여 정보 노출 차단                                                                                                                                                                                                       |
| TraceEnable          | HTTP TRACE 메소드 허용 여부<br /><br />Cross-Site Tracing(XST) 공격에 악용될 수 있으므로 Off로 설정                                                                                                                                                                                        |
| RequestReadTimeout   | 요청 헤더/본문 수신에 대한 타임아웃과 최소 전송 속도를 지정<br /><br />`header=20-40` : 헤더 수신 시 최소 20초를 허용하고 데이터 수신이 계속되면 최대 40초까지 연장<br /><br />`MinRate=500` : 초당 500바이트 미만으로 전송되면 연결을 끊음<br /><br />Slowloris 계열 공격 방어에 필요                                                                  |

---
### httpd-mpm.conf

---
#### 일반적인 설정

```bash
vi /svc/web/apache/conf/extra/httpd-mpm.conf
```

```conf
<IfModule mpm_event_module>
    ServerLimit             128
    ThreadsPerChild          25
    StartServers             20
    MinSpareThreads          75
    MaxSpareThreads         500
    MaxRequestWorkers      2000
    MaxConnectionsPerChild 10000
</IfModule>
```

> mpm Event 기준
> 
> 아래의 값 산정은 `MaxRequestWorkers`를 2000으로 정하고, 나머지 값은 이 값에 맞추기 위해 역산한 값이다.

`ServerLimit 128`
- 계산상 80이면 충분하지만 128로 여유를 두었다.
- `ServerLimit`은 graceful 재시작으로는 반영되지 않고 **완전 재기동이 필요하다.** 반면 `MaxRequestWorkers`는 graceful로도 변경할 수 있다.
- 따라서 상한을 미리 넉넉히 잡아두면, 트래픽이 늘었을 때 서비스 중단 없이 `MaxRequestWorkers`를 최대 3200(128 × 25)까지 올릴 수 있다.

`ThreadsPerChild 25` 
- 기본값을 유지했다. 프로세스 하나가 비정상 종료되어도 영향받는 요청이 25개로 제한된다(장애 반경 최소화).
- 값을 키우면 프로세스 수가 줄어 메모리는 절약되지만, 한 번의 크래시로 잃는 요청이 늘어난다.
- mod_jk 커넥션 풀은 **프로세스 단위**로 생성되고, 기본 풀 크기는 `ThreadsPerChild`와 같다. 결국 Tomcat 쪽으로 열릴 수 있는 AJP 연결은 최대 `MaxRequestWorkers`(2000)이므로, Tomcat AJP Connector의 `maxThreads`도 이 값을 고려해서 잡아야 한다.

`MinSpareThreads 75`
- 유휴 스레드를 최소 3개 프로세스분(75 = 3 × 25)은 확보해서 순간적인 트래픽 증가에 대비한다.

`StartServers 20`, `MaxSpareThreads 500`
- 기동 시 20 × 25 = 500개의 스레드를 미리 띄운다. 재기동 후 L4에 투입되자마자 몰리는 트래픽을 fork 지연 없이 받기 위해서이다.
- `MaxSpareThreads`를 500으로 맞춘 이유: 유휴 스레드가 이 값을 넘으면 Apache가 프로세스를 정리한다. `StartServers × ThreadsPerChild`가 이 값보다 크면 기동하자마자 프로세스를 죽이는 비효율이 생긴다.
- 트래픽이 빠진 뒤에도 20개 프로세스 수준을 유지하게 되므로, fork/kill 반복도 줄어든다.

`MaxConnectionsPerChild 10000` 
- 기본값은 0(무제한)이다. mod_jk 같은 서드파티 모듈에서 메모리 누수가 생겨도 프로세스를 주기적으로 교체해 누적되지 않게 한다.
- 이 값은 요청 수가 아니라 **연결 수** 기준이다. Keep-Alive 연결 하나에서 요청 2000개를 처리해도 1로 센다.

---
#### 설정 옵션들

**httpd-mpm.conf Options (event / worker)**

| Option                   | Description                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ServerLimit              | 기동할 수 있는 Child Process의 최대 개수(상한값)<br /><br />컴파일 시의 `DEFAULT_SERVER_LIMIT` 값을 넘겨 설정하려면 소스 수정이 필요함<br /><br />이 값을 변경하면 Apache를 restart해야 반영됨     |
| StartServers             | Apache 기동 시 최초로 생성할 Child Process 개수                                                                                                              |
| ThreadsPerChild          | Child Process 하나가 생성하는 Thread 개수<br /><br />실제 동시 처리 가능 수 = 프로세스 수 × `ThreadsPerChild`                                                            |
| MinSpareThreads          | 전체 유휴(대기) Thread의 최소 개수<br /><br />이보다 적어지면 Apache가 Child Process를 추가로 생성함                                                                        |
| MaxSpareThreads          | 전체 유휴(대기) Thread의 최대 개수<br /><br />이보다 많아지면 Apache가 Child Process를 종료함                                                                            |
| MaxRequestWorkers        | 동시에 처리할 수 있는 최대 요청(Thread) 수<br /><br />Apache 2.4 이전 버전의 `MaxClients`와 동일한 지시자<br /><br />`ServerLimit × ThreadsPerChild`를 초과할 수 없음              |
| MaxConnectionsPerChild   | Child Process 하나가 처리할 최대 연결 수<br /><br />초과하면 프로세스를 종료하고 새로 생성함(메모리 누수 방지)<br /><br />`0`은 무제한을 의미하며, 운영 환경에서는 `10000` 등으로 지정                     |
| ThreadLimit              | `ThreadsPerChild`로 설정할 수 있는 상한값(기본값 `64`)                                                                                                         |
| AsyncRequestWorkerFactor | event MPM 전용<br /><br />Keep-Alive 등 비동기 상태의 연결을 워커 대비 몇 배까지 허용할지 결정<br /><br />최대 동시 연결 수 ≈ `(AsyncRequestWorkerFactor + 1) × MaxRequestWorkers` |

**httpd-mpm.conf Options (prefork)**

| Option | Description |
| --- | --- |
| StartServers | 기동 시 생성할 Child Process 개수 |
| MinSpareServers<br />MaxSpareServers | 유휴 Child Process의 최소/최대 개수 |
| MaxRequestWorkers | 동시에 처리 가능한 최대 요청 수<br /><br />prefork는 프로세스 1개가 요청 1개를 처리하므로 `ServerLimit` 값과 동일하게 맞춤 |

---
### httpd-ssl.conf

---
#### 일반적인 설정

```bash
vi /svc/web/apache/conf/extra/httpd-ssl.conf
```

```conf
Listen 443
```

- 일반적인 HTTPS well-known 포트인 443으로 설정

```conf
SSLProtocol -all +TLSv1.2 +TLSv1.3
```

- TLS 1.0/1.1은 RFC 8996(2021)으로 공식 폐기되었고, 보안 점검에서도 취약 프로토콜로 지적된다.
- `-all`로 전부 끈 뒤 필요한 것만 켠다. 이렇게 하면 OpenSSL이나 Apache 버전에 따라 기본값이 달라져도 결과가 바뀌지 않는다.
- VirtualHost 밖(전역)에 두어 모든 vhost에 같은 표준이 적용되게 한다.

```conf
SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305
SSLHonorCipherOrder off
```

- 기본값(`HIGH:MEDIUM:!MD5:!RC4:!3DES`)은 제외할 것만 나열하는 방식이다. 그래서 Forward Secrecy가 없는 암호와 CBC 암호가 남는다.
- 표준은 반대로 허용할 것만 나열하는 방식을 택한다. Forward Secrecy(ECDHE/DHE)와 AEAD(GCM, CHACHA20)만 남긴다.
- 이렇게 하면 허용 목록이 OpenSSL 버전에 따라 바뀌지 않는다.
- 트레이드오프: TLS 1.2를 지원하지만 GCM 암호가 없는 구형 클라이언트(오래된 Java, 일부 레거시 장비)는 접속하지 못한다. 이런 클라이언트가 있는 환경에서만 기본값 사용을 검토한다.

```conf
SSLProxyProtocol    -all +TLSv1.2 +TLSv1.3
SSLProxyCipherSuite (SSLCipherSuite와 동일)
```

- `SSLProxy*`는 Apache가 **HTTPS 백엔드로 프록시할 때만**(mod_proxy + `SSLProxyEngine on`) 쓰인다.
- mod_jk(AJP) 연동에서는 적용되는 곳이 없다.
- 나중에 mod_proxy로 전환해도 약한 설정이 따라가지 않도록 표준에는 남겨둔다. 대신 기존 cipher 문자열은 위와 같이 교체한다.

```conf
SSLPassPhraseDialog builtin
```

- `builtin`은 "인증서 암호가 있을 경우" 기동할 때 터미널에서 키 암호를 직접 입력받는 방식이다(기본값).
- **Systemd로 등록하면 입력할 터미널이 없어서 기동이 실패하거나 멈춘다.** 운영 방식에 따라 둘 중 하나를 고른다.
    - 개인키 암호를 제거하고, 파일 권한으로 보호한다(아래 권한 설정 참고).
    - `SSLPassPhraseDialog exec:/경로/스크립트`로 암호를 출력하는 스크립트를 지정한다. 이 경우 암호가 파일로 존재하게 되므로, 스크립트 권한도 같이 관리해야 한다.
- 사내 보안 정책에서 개인키 암호화를 요구하는지 먼저 확인하고 정한다.

```conf
<VirtualHost *:443>
    DocumentRoot "/svc/web/apache/htdocs"
    ServerName www.example.com

    ErrorLog  "|/svc/web/apache/bin/rotatelogs logs/ssl_error_log.%Y%m%d 86400 +540"
    CustomLog "|/svc/web/apache/bin/rotatelogs logs/ssl_access_log.%Y%m%d 86400 +540" combined

    SSLEngine on

	SSLCertificateFile    "/svc/web/apache/ssl/server.crt"
    SSLCertificateKeyFile "/svc/web/apache/ssl/server.key"

	# 인증서에 Chain File (CA 인증서)이 있을 경우 주석 해제 후 설정
    #SSLCertificateChainFile "/svc/web/apache/ssl/server-ca.crt"

    # mod_jk 연동 시
    JkMount /* test
</VirtualHost>
```

- `ServerName` : 여기에 작성하는 도메인으로 오는 요청을 처리한다.
	- 해당하는 요청이 없으면 가장 위에 정의된 VirtualHost가 해당 요청을 처리한다.
	- 이에, 만약 443포트의 vhost가 하나뿐이라면 이를 정확히 명시하지 않아도 동작은 하지만, 인증서의 CN/SAN과 다르다면 기동시 마다 경고가 발생한다.
- 로그 설정의 경우 `httpd.conf`에서 언급했던 것과 같은 설정이다.
- `SSLEngine on` : 이 VirtualHost에서 SSL/TLS 기능을 활성화하는 설정.
- `SSLCertificateFile` / `SSLCertificateKeyFile` / `SSLCertificateChainFile` : 인증서 및 키 파일 경로
- `JkMount /* test` : 모든 요청을 Tomcat으로 넘기는 설정. `test`는 `workers.properties`에 정의할 mod_jk worker 이름

---
#### 설정 옵션들

| SSL 기본 Options | Description |
| --- | --- |
| SSLProtocol | 사용할 TLS 프로토콜 버전을 지정<br /><br />예: `-all +TLSv1.2 +TLSv1.3`<br /><br />TLS 1.3은 Apache 2.4.37 이상 + OpenSSL 1.1.1 이상에서 사용 가능 |
| SSLCipherSuite | TLS 1.2 이하에서 사용할 암호화 스위트 목록<br /><br />TLS 1.3의 cipher는 이 지시자로 제어되지 않음<br /><br />TLS 1.3은 별도 설정 방식 사용 |
| SSLHonorCipherOrder | 클라이언트가 아닌 서버가 제시한 cipher 우선순위를 따르도록 설정 |
| SSLSessionTickets | 세션 티켓 사용 여부<br /><br />키 로테이션이 되지 않으면 Forward Secrecy가 약화될 수 있으므로 `off` 권장 |
| SSLPassPhraseDialog | 개인키에 암호가 걸려 있을 때 암호를 입력받는 방식<br /><br />`builtin` : 기동 시 콘솔에서 입력<br />`exec:경로` : 스크립트의 출력을 암호로 사용 |
| SSLCertificateFile | 서버 인증서(공개키) 파일 경로 |
| SSLCertificateKeyFile | 서버 개인키 파일 경로<br /><br />일반적으로 권한 `600`, root 소유 권장 |
| SSLCertificateChainFile | 중간(체인) 인증서 파일 경로<br /><br />Apache 2.4.8 이상은 `SSLCertificateFile`에 체인을 함께 포함하여 사용 가능 |
| Strict-Transport-Security | HSTS 헤더<br /><br />브라우저가 이후 요청을 HTTPS로만 보내도록 강제<br /><br />HTTP로만 서비스되는 경로가 있으면 접속에 영향을 줄 수 있으므로 사전 확인 필요 |

| Cipher suite 키워드 | Description |
| --- | --- |
| ECDHE | 타원곡선 기반 임시 키 교환 방식<br /><br />Forward Secrecy를 제공하므로 사용 권장 |
| AESGCM / CHACHA20 | AEAD 방식의 현대적 암호화 알고리즘<br /><br />암호화와 무결성 검증을 함께 제공 |
| HIGH | 강력한 암호화 스위트 그룹<br /><br />일반적으로 높은 보안 수준의 AES, Camellia 등의 cipher 포함 |
| MEDIUM | 중간 강도의 암호화 스위트 그룹<br /><br />현대적인 보안 정책에서는 일반적으로 사용을 권장하지 않음 |
| LOW / EXPORT | 낮은 보안 강도의 암호화 스위트<br /><br />일반적으로 제외 권장<br /><br />예: `!LOW`, `!EXPORT` |
| !aNULL | 인증(Authentication)을 수행하지 않는 익명 cipher suite를 제외<br /><br />중간자 공격 위험 때문에 일반적으로 제외 |
| !MD5 / !RC4 / !3DES | 취약하거나 오래된 해시/암호 알고리즘을 사용하는 cipher suite 제외<br /><br />RC4 : 통계적 취약점<br />3DES : Sweet32(CVE-2016-2183) 취약점 |

---
### httpd-vhosts.conf

---
#### 일반적인 설정

```bash
vi /svc/web/apache/conf/extra/httpd-vhosts.conf
```

```conf
<VirtualHost *:80>
    DocumentRoot "/svc/web/apache/htdocs"
    ServerName 127.0.0.1

    ErrorLog  "|/svc/web/apache/bin/rotatelogs logs/vhosts_error_log.%Y%m%d 86400 +540"
    CustomLog "|/svc/web/apache/bin/rotatelogs logs/vhosts_access_log.%Y%m%d 86400 +540" combined

    # 전체 요청을 test worker로 전달
    JkMount /* test

    # 정적 자원은 Apache가 직접 처리
    JkUnMount /static/* test
</VirtualHost>
```

- `JkUnMount /static/* test` : 정적 자원은 Apache 가 직접 처리하기 위해 mod_jk를 특정 경로만 Unmount하는 설정이다. 
	- 예를 들어, www.example.com/static/app.js 에 요청이 온다면, 현재 `DocumentRoot`가 `/svc/web/apache/htdocs` 이므로, `/svc/web/apache/htdocs/static/app.js`를 찾아서 내려준다.
- 다른 설정들은 `httpd-ssl.conf`와 같은 의미이다.

---
### httpd-modjk.conf

---
#### 일반적인 설정

```bash
vi /svc/web/apache/conf/extra/httpd-modjk.conf
```

```conf
LoadModule jk_module modules/mod_jk.so
<IfModule mod_jk.c>
    JkWorkersFile conf/extra/workers.properties
    JkLogFile "|/svc/web/apache/bin/rotatelogs logs/mod_jk.log.%Y%m%d 86400 +540"
    JkLogLevel info
    JkLogStampFormat "[%a %b %d %H:%M:%S %Y]"
    JkOptions +ForwardKeySize +ForwardURICompatUnparsed -ForwardDirectories
    JkRequestLogFormat "%w %R %V %T %v %U %s %H %m %p %q"
    JkShmFile logs/jk.shm
</IfModule>
```

- `LoadModule jk_module modules/mod_jk.so`  : mod_jk 모듈을 로드한다.
- `JkWorkersFile conf/extra/workers.properties` : Apache가 연결할 WAS(Tomcat) 정보를 정의한 파일의 위치를 지정.
- `JkLogLevel info` : mod_jk가 기록할 로그 상세 수준을 지정
- `JkOptions +ForwardKeySize +ForwardURICompatUnparsed -ForwardDirectories` : Apache가 Tomcat으로 요청 정보를 어떤 방식으로 전달할지 결정하는 옵션 (`+`는 기능 활성화, `-`는 비활성화 의미)
	- `+ForwardKeySize` : SSL 관련 요청에서 SSL 세션 키 크기 등의 정보를 WAS로 전달하도록 설정
		- Apache에서 HTTPS를 종료하고 WAS으로 AJP 전달하는 구성에서, 관련 정보를 WAS 측에서 사용할 수 있게 해줌 (키 자체가 아닌, 키에 대한 메타데이터)
	- `+ForwardURICompatUnparsed` : WAS에 전달하는 URI를 Apache가 완전히 재가공한 UIR가 아니라 원본 요청 URI에 가까운 형태로 전달하도록 하는 호환 모드
		- `GET /search?q=hell%20world` 와 같은 URL encoding이나 특수문자가 포함된 URI 처리에서 Apache와 WAS 간 해석 차이를 줄이기 위해 사용하는 옵션
	- `-ForwardDirectiories` : 디렉토리에 대한 요청을 WAS로 전달하기 전에 Apache가 디렉토리 여부를 확인해서 별도로 처리하는 기능을 비활성화. 즉, Apache의 로컬 파일시스템 디렉토리 구조에 의존해서 요청 전달 여부를 판단하는 것을 줄이는 설정.
		- Apache는 정적 자원만 직접 처리하고 애플리케이션 요청은 WAS에 맡기는 구조에서 이런 설정을 볼 수 있다.

---
#### 설정 옵션들

| httpd-modjk.conf Options | Description |
| --- | --- |
| JkWorkersFile | Tomcat 등과 연결할 Worker 정보를 정의한 설정 파일 경로 설정 |
| JkLogFile | mod_jk 로그 파일에 대한 경로 설정 |
| JkLogLevel | mod_jk 로그의 상세 레벨 설정<br/>(trace/debug/info/warn/error) |
| JkLogStampFormat | 로그에 찍히는 타임스탬프 형식 지정 |
| JkOptions | Apache에서 mod_jk로 전달되는 요청 처리 방식 지정 |
| JkRequestLogFormat | 요청 로그의 형식 설정 |
| JkShmFile | mod_jk가 내부적으로 상태를 공유하기 위한 공유 메모리 파일 위치 설정<br/>로드밸런싱 상태가 이 파일로 공유되므로 인스턴스마다 경로가 겹치면 안 됨 |

---
#### 설정 값

| JkLogStampFormat | Description |
| --- | --- |
| %a | 요일 |
| %b | 월 |
| %d | 일 |
| %H:%M:%S | 시:분:초 |
| %Y | 연도 |

| JkOptions | Description |
| --- | --- |
| +ForwardKeySize | SSL 키 크기 정보를 Tomcat에 전달 |
| +ForwardURICompatUnparsed | 요청 URI를 원본 그대로 전달 |
| -ForwardDirectories | 디렉토리 요청을 자동 포워딩하지 않도록 설정 |

| JkRequestLogFormat | Description |
| --- | --- |
| %w | Worker 이름 |
| %R | 세션 라우트(jvmRoute) 이름 |
| %V | 요청된 가상 호스트 이름 |
| %T | 요청 처리 시간(초) |
| %v | 표준(canonical) 가상 호스트 이름 |
| %U | 요청된 URI |
| %s | 응답 상태 코드 |
| %H | 프로토콜(ex. HTTP/1.1) |
| %m | HTTP 메소드 |
| %p | 요청 포트 |
| %q | 쿼리 스트링 |

---
### workers.properties

---
#### 설정 예시

```bash
vi /svc/web/apache/conf/extra/workers.properties
```

```conf
worker.list=test,jkstatus

# 공통 설정을 template으로 정의하고 각 worker 가 상속받는다.
worker.template.type=ajp13
worker.template.lbfactor=1
worker.template.ping_mode=A
worker.template.ping_timeout=2000
worker.template.prepost_timeout=2000
worker.template.socket_timeout=60
worker.template.socket_keepalive=true
worker.template.connection_pool_timeout=20
worker.template.connect_timeout=2000
worker.template.reply_timeout=60000
worker.template.recovery_options=7

worker.test.type=lb
worker.test.balance_workers=test11,test21
worker.test.method=Session
worker.test.sticky_session=true

worker.test11.reference=worker.template
worker.test11.host=192.168.56.105
worker.test11.port=8009
worker.test11.secret=test_test11

worker.test21.reference=worker.template
worker.test21.host=192.168.56.105
worker.test21.port=8109
worker.test21.secret=test_test21

worker.jkstatus.type=status

# worker 이름(test11)은 Tomcat 의 jvmRoute 값과 반드시 일치해야 Sticky Session 이 동작한다.

# jkstatus 접속 시 로드밸런싱 상태를 시각적으로 모니터링할 수 있다.
# httpd-vhosts.conf 에 아래 Location 을 추가한다.
<Location /jkstatus/>
    JkMount jkstatus
    Require ip 192.168.56
</Location>

#   Tomcat 8.5.51 이상은 secret 설정이 필수이며, AJP 커넥터는 내부 IP 에만 바인딩한다.
#   Apache 의 worker.xxx.secret 과 Tomcat server.xml 의 secret 값이 동일해야 한다.
```

- `worker.list=test,jkstatus` : Apache에서 사용할 **최상위 Worker 목록**을 지정
    - `test` : 실제 요청을 Tomcat으로 분산하는 Load Balancer Worker
    - `jkstatus` : mod_jk의 Worker 및 로드밸런싱 상태를 확인하기 위한 Status Worker
    - `test11`, `test21`은 `test` 내부에서 사용되는 Worker이므로 `worker.list`에 직접 등록할 필요 없음
- `worker.template.type=ajp13` : `template` Worker의 통신 방식을 **AJP 1.3**으로 설정
    - `template`은 실제 Tomcat 서버가 아니라 `test11`, `test21`이 공통 설정을 상속받기 위한 용도
    - 이후 `worker.test11.reference=worker.template` 형태로 공통 설정을 상속
- `worker.template.lbfactor=1` : Load Balancer가 요청을 분배할 때 사용하는 **Worker의 가중치** 설정
    - `test11`, `test21` 모두 동일하게 `1`을 상속하므로 동일한 가중치를 가짐
    - 예를 들어 한쪽을 `2`, 다른 쪽을 `1`로 설정하면 요청 분배 시 상대적인 처리 비중에 차이가 발생
- `worker.template.ping_mode=A` : AJP 연결 상태 확인을 위해 **CPing/CPong을 수행하는 시점**을 지정
    - `A`는 `connect`, `prepost`, `interval`에 해당하는 모든 Ping 기능을 활성화하는 설정
    - Tomcat이 실제로 응답 가능한 상태인지 확인하여 죽은 연결을 사용하는 것을 방지
- `worker.template.ping_timeout=2000` : CPing을 전송한 후 **CPong 응답을 기다리는 최대 시간** 설정
    - `2000` → 2초
    - 지정 시간 내 Tomcat의 CPong 응답이 없으면 연결에 문제가 있다고 판단
- `worker.template.prepost_timeout=2000` : 실제 요청을 Tomcat으로 전달하기 전에 수행하는 **사전 연결 확인의 Timeout** 설정
    - `2000` → 2초
    - `ping_mode`에 `P`가 활성화된 경우 요청 전달 전 CPing/CPong으로 연결 상태 확인
- `worker.template.socket_timeout=60` : Apache와 Tomcat 사이의 **AJP Socket 통신 Timeout** 설정
    - `60` → 60초
    - Socket에서 데이터 송수신이 일정 시간 동안 이루어지지 않을 경우 연결 오류로 처리
- `worker.template.socket_keepalive=true` : AJP TCP 연결에 **TCP KeepAlive**를 활성화
    - 장시간 유지되는 연결이 네트워크 장비나 OS 등에 의해 비정상적으로 끊어진 상태인지 확인하는 데 도움
    - OS의 TCP KeepAlive 관련 설정값의 영향을 받음
- `worker.template.connection_pool_timeout=20` : mod_jk의 Connection Pool에서 사용하지 않는 **유휴 AJP Connection을 유지할 시간** 설정
    - `20` → 20초
    - 일정 시간 사용되지 않은 연결을 종료하여 불필요한 Connection이 계속 유지되는 것을 방지
- `worker.template.connect_timeout=2000` : Apache가 Tomcat과 **AJP 연결을 맺을 때 기다리는 최대 시간** 설정
    - `2000` → 2초
    - 2초 동안 Tomcat과 연결되지 않으면 해당 연결 시도를 실패로 처리
- `worker.template.reply_timeout=60000` : 요청을 Tomcat으로 전달한 뒤 **Tomcat의 응답을 기다리는 최대 시간** 설정
    - `60000` → 60초
    - Tomcat이 요청을 처리하는 데 60초를 초과하면 mod_jk에서 Timeout으로 처리
    - 애플리케이션에서 장시간 수행되는 요청이 있다면 해당 값 설정 시 주의 필요
- `worker.template.recovery_options=7` : AJP 요청 처리 중 오류가 발생했을 때 **mod_jk가 요청을 다른 Worker로 재전송할지 여부를 제어**하는 설정
    - 재전송으로 인해 동일한 요청이 중복 처리되는 것을 방지하기 위한 옵션
    - `7`은 여러 recovery 방지 옵션을 조합한 값
    - 특히 `POST`와 같이 서버 상태를 변경하는 요청이 장애 발생 시 다른 Tomcat으로 다시 전송되어 **중복 처리되는 위험을 줄이기 위한 설정**

---
#### 설정 값

| workers.properties Options  | Description |
| --- | --- |
| worker.list                 | Apache에서 사용할 Worker 목록 |
| type=ajp13                  | AJP 1.3 프로토콜을 사용하여 Tomcat 등과 통신 |
| lbfactor=1                  | 로드밸런싱 가중치 설정(default: 1)<br/>클수록 더 많은 요청을 해당 Worker에 전달 |
| ping_mode=A                 | 연결이 여전히 작동하는지 확인하는 방식<br/><br/>C(Connect) - 백엔드와 연결을 처음 맺을 때 CPing으로 확인<br/>(사용 타임아웃: connect_timeout, 없으면 ping_timeout)<br/><br/>P(Prepost) - 매 요청을 보내기 직전마다 CPing으로 확인<br/>(사용 타임아웃: prepost_timeout, 없으면 ping_timeout)<br/><br/>I(Idle Interval) - 커넥션이 일정 시간 이상 Idle 상태일 때 주기적으로 CPing 수행<br/>(사용 타임아웃: ping_timeout, 주기 조건은 connection_ping_interval)<br/><br/>A(ALL) - C, P, I를 모두 적용 |
| ping_timeout=2000           | Ping 시 타임아웃 시간(ms)<br/>응답이 없으면 해당 Worker를 죽은 것으로 간주 |
| prepost_timeout=2000        | 요청 전송 직전 상태 확인에 사용하는 타임아웃 시간(ms) |
| socket_timeout=60           | 소켓 읽기 타임아웃(초)<br/>default: 0 - 모든 소켓 작업에서 무한 시간 동안 대기 |
| socket_keepalive=true       | 커넥션에 TCP KeepAlive 설정을 적용해 유휴 연결을 유지<br/>방화벽이 유휴 연결을 끊는 환경에서 필요 |
| connection_pool_timeout=20  | 커넥션 풀에서 사용되지 않은 연결을 유지할 최대 시간(초)<br/>시간이 지나면 연결 종료<br/>default: 0 - 닫기 비활성화(무한 타임아웃)<br/>Tomcat의 connectionTimeout보다 짧게 설정 |
| connect_timeout=2000        | Tomcat에 연결 시도 시 연결이 되지 않으면 대기하는 시간(ms) |
| reply_timeout=60000         | Tomcat 응답 대기 시간(ms)<br/>설정한 시간 동안 응답이 없으면 연결 종료<br/>default: 0 - 무한 대기 |
| recovery_options=7          | 연결된 Worker에서 문제가 감지될 경우 재시도를 어떻게 처리할지 설정<br/><br/>1 - Tomcat이 요청을 받은 후 실패하면 복구하지 않음<br/>2 - Tomcat이 클라이언트에 헤더를 보낸 후 실패하면 복구하지 않음<br/>4 - 클라이언트에 답변을 다시 쓸 때 오류가 감지되면 Tomcat 연결을 닫음<br/>8 - HTTP 메서드 HEAD에 대한 요청을 항상 복구<br/>16 - HTTP 메서드 GET에 대한 요청을 항상 복구<br/><br/>7은 1, 2, 4 세 가지 모두 적용 |
| **LB / Worker 개별 설정**       | **Description** |
| worker.test.type=lb         | Worker의 Type 설정<br/>lb = 로드밸런서 |
| balance_workers             | 로드밸런서가 관리해야 하는 Worker를 쉼표로 구분한 목록 |
| method=Session              | 로드밸런싱 방식 설정<br/>세션 기반 로드밸런싱 방식 사용<br/>세션을 기준으로 부하를 분산<br/>그 외 Request / Traffic / Busy 방식이 있음 |
| sticky_session=true         | 세션 고정 설정<br/>클라이언트의 세션이 유지되는 동안 동일한 Tomcat 인스턴스로 요청을 전달 |
| reference=worker.template   | 해당 Worker가 worker.template을 참조하여 공통 설정을 상속 |
| host / port                 | 해당 Worker가 연결할 Tomcat 서버의 IP 주소와 AJP Connector 포트 |
| secret                      | AJP Connector 연결 시 사용하는 Shared Secret<br/>Tomcat server.xml의 AJP Connector에도 동일한 Secret이 설정되어 있어야 함<br/>Tomcat 8.5.51 이상은 secretRequired 기본값이 true이므로 필수 |
| worker.jkstatus.type=status | mod_jk 상태 페이지용 특수 Worker<br/>jkstatus URL에서 로드밸런싱 상태를 확인하거나 동적으로 제어 가능<br/>관리 기능이 노출되므로 반드시 접근 IP 제한 필요 |

---
## Apache 프록시 (mod_proxy)

---
### `mod_jk` vs `mod_proxy`

|구분|mod_jk|mod_proxy|
|---|---|---|
|역할|리버스 프록시/웹-WAS 연동|범용 프록시|
|주 용도|Apache ↔ Tomcat|다양한 Backend 연동|
|대표 프로토콜|AJP|HTTP, HTTPS, AJP 등|
|설정 예|`JkMount`, `worker.*`|`ProxyPass`, `ProxyPassReverse`|
|로드밸런싱|지원|지원|
|Sticky Session|지원|지원|

> 이 문서에서, `mod_jk`는 Apache 튜닝 섹션에서 다루고, `mod_proxy`를 다른 섹션으로 분리한 이유는 일반적으로 Apache + Tomcat을 구성할 때 `mod_jk`를 사용하기 때문에 이를 일반적인 설정 표준으로 삼기 위함이다.

---
### httpd.conf

```conf
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule proxy_balancer_module modules/mod_proxy_balancer.so
LoadModule slotmem_shm_module modules/mod_slotmem_shm.so
LoadModule lbmethod_byrequests_module modules/mod_lbmethod_byrequests.so
```

- `mod_proxy` 사용을 위한 Module 주석 해제

---
### httpd-vhosts.conf

---
#### 단일 백엔드 형태

```conf
<VirtualHost *:80>
DocumentRoot "/svc/web/apache/htdocs"
    ServerName 127.0.0.1

    ErrorLog  "|/svc/web/apache/bin/rotatelogs logs/vhosts-error_log.%Y%m%d 86400 +540"
    CustomLog "|/svc/web/apache/bin/rotatelogs logs/vhosts-access_log.%Y%m%d 86400 +540" combined

    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass / http://192.168.56.105:9080/
    ProxyPassReverse / http://192.168.56.105:9080/
</VirtualHost>
```

- 기존 `mod_jk` 설정을 할 때와 비슷하지만 `jkMount` 설정이 사라지고 `Proxy~` 설정들이 생겼다.
- `ProxyRequests Off`
    - **Forward Proxy 기능 비활성화**
    - 클라이언트가 Apache를 일반적인 인터넷 프록시 서버처럼 사용하는 것을 막는 설정
    - `ProxyPass`를 이용한 **Reverse Proxy 기능은 그대로 사용 가능**
    - 일반적인 Reverse Proxy 구성에서는 보통 `Off`로 설정
- `ProxyPreserveHost On`
    - 클라이언트가 보낸 원래 `Host` 헤더를 그대로 Backend WAS에 전달
- `ProxyPass / http://192.168.56.105:9080/`
	- Apache로 들어오는 `/` 이하 요청을 Backend WAS로 전달
- `ProxyPassReverse / http://192.168.56.105:9080/`
	- WAS가 응답으로 보내는 Redirect 관련 헤더를 외부 주소에 맞게 변환
	- **응답 헤더에 들어 있는 Backend 주소를 외부 주소로 보정**하는 설정

---
#### 다수의 백엔드로 로드밸런싱

```conf
<VirtualHost *:80>
DocumentRoot "/svc/web/apache/htdocs"
    ServerName 127.0.0.1

    ErrorLog  "|/svc/web/apache/bin/rotatelogs logs/vhosts-error_log.%Y%m%d 86400 +540"
    CustomLog "|/svc/web/apache/bin/rotatelogs logs/vhosts-access_log.%Y%m%d 86400 +540" combined

    <Proxy balancer://Tomcat>
        # API-Tomcat
        BalancerMember http://192.168.56.105:9080 route=test11
        BalancerMember http://192.168.56.105:9180 route=test21
        ProxySet stickysession=JSESSIONID
    </Proxy>

    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass / balancer://Tomcat/
    ProxyPassReverse / balancer://Tomcat/
</VirtualHost>
```

- `<Proxy balancer://Tomcat>` : 로드밸런서 그룹을 정의하는 블록
- `BalancerMember` : 백엔드 서버 하나를 로드밸런서 풀에 추가
	- `route` 값이 Tomcat의 jvmRoute와 일치해야한다.
- `ProxySet stickysession=JSESSIONID` : 스티키 세션 지정 (`JSESSIONID`는 쿠키 이름)

---
#### 설정 옵션들

| Proxy Options | Description                                                                                                                                                     |
| --- | --- |
| `<Proxy balancer://Tomcat>` | 로드밸런서 그룹을 정의하는 블록<br/>여기서 설정한 이름은 ProxyPass에서 사용됨                                                                                                               |
| BalancerMember | 백엔드 서버 하나를 로드밸런서 풀에 추가<br/>`route=`로 Sticky Session 식별자를 지정                                                                                                     |
| ProxySet stickysession | 해당 Balancer의 세션 고정 쿠키명을 지정 (`JSESSIONID`)<br/>첫 요청이 test11로 갔다면 이후 요청도 같은 서버로 고정                                                                                |
| ProxyRequests Off | Apache가 정식(Forward) 프록시 서버로 동작하지 않도록 비활성화<br/>일반적인 리버스 프록시 환경에서는 항상 Off로 설정<br/>On으로 두면 Open Proxy가 되어 외부 공격에 악용될 수 있음                                          |
| ProxyPreserveHost On | Apache가 백엔드로 요청을 전달할 때 원래 클라이언트가 보낸 Host 헤더를 그대로 유지<br/>Tomcat이나 Spring에서 도메인 기반 로직을 올바르게 처리하려면 On으로 설정                                                         |
| ProxyPass | 지정한 URL 경로로 들어오는 요청을 백엔드 또는 Balancer로 전달                                                                                                                        |
| ProxyPassReverse | 백엔드가 리다이렉션(3xx) 응답을 보낼 때 Location 헤더의 백엔드 주소를 프론트(Apache) 주소로 치환<br/>적용 전: `Location: http://192.12.30.110:9080/`<br/>적용 후: `Location: http://www.example.com/` |
| retry / timeout<br/>(BalancerMember 속성) | `retry` : 장애 판정된 멤버를 다시 시도하기까지의 시간(초)<br/>`timeout` : 백엔드 응답 대기 시간(초)                                                                                           |

---
## Apache Rewrite

> `mod_rewrite`는 **클라이언트가 요청한 URL을 조건에 따라 다른 URL로 변경하거나 다른 곳으로 보내는 Apache 모듈**

---
### httpd.conf

```confg
LoadModule rewrite_module modules/mod_rewrite.so
```

- 필요한 모듈 주석 해제

---
### httpd-vhosts.conf

```conf
<VirtualHost *:80>
    ServerName 127.0.0.1
    RewriteEngine on
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=308,L]
</VirtualHost>
```

- 위 설정은 http -> https 로 리다이렉트 하는 설정이다. 
	- 위 설정은 예시이며, 보통 HTTPS로 리다이렉트 할 경우 Rewrite 보다는 `Redirect` 설정을 사용한다.
	- Rewrite를 사용하는 경우는 '조건 분기가 필요한 경우'이다. (ex : 특정 조건에만 443으로 리다이렉트 등)

---
## Apache 보안 설정

---
### 보안 헤더 및 정보 노출 차단

---
#### httpd.conf

```conf
LoadModule headers_module modules/mod_headers.so
```

- 필요한 모듈 로드

```conf
TraceEnable Off

<Location />
    <LimitExcept GET POST HEAD>
        Require all denied
    </LimitExcept>
</Location>

Options None
```

- `TraceEnable Off` : HTTP `TRACE` 메서드를 비활성화하는 설정이다.
	- TRACE는 클라이언트가 보낸 요청을 서버가 그대로 돌려주는 디버깅용 메서드인데, 일반적인 웹 서비스에서는 쓸 일이 거의 없고 보안상 꺼두는 경우가 많다.
- `Location` 블럭의 설정은 사용하는 HTTP 메서드를 제외한 나머지 메서드를 모두 거부하는 옵션이다.
- `Options None` : 디렉토리 목록 노출을 차단하는 설정이다.

```bash
rm -rf /svc/web/apache/htdocs/index.html
rm -rf /svc/web/apache/cgi-bin/*
```

- 불필요한 기본 콘텐츠 제거 (이 파일들은 기본으로 생성되어있는 파일들이다. 사용하지 않을 시에 삭제

---
### 파일 권한 및 소유권

**엔진 및 로그 디렉토리 소유권 변경**

```bash
useradd -r -s /sbin/nologin apache
```

```bash
chown -R apache:apache /svc/web/apache
chown -R apache:apache /log/web/apache
```


**설정 파일 권한 변경**

```bash
chmod 750 /svc/web/apache/conf
chmod 750 /svc/web/apache/conf/extra
chmod 600 /svc/web/apache/conf/*.conf
chmod 600 /svc/web/apache/conf/extra/*.conf
```

- 설정 파일 디렉토리 (`conf`, `conf/extra`)
	- 7 : 소유자는 조회, 수정, 내부 접근 권한 모두 가짐
	- 5 : 그룹 사용자는 디렉토리 내부를 조회,  내부 접근 권한을 가짐
	- 0 : 이외 사용자는 어떠한 권한도 없음
- 설정 파일 (`*.conf`)
	- 600 : 소유자만 읽고 수정할 수 있다.


**개인키 및 인증서 비밀번호 스크립트 소유권 변경**

```bash
chown root:root /svc/web/apache/conf/ssl/server.key
chown root:root /svc/web/apache/conf/ssl/ssl_passwd.sh
```

- 개인키와 인증서 비밀번호 스크립트는 root 소유로 두어 서비스 게정이 읽지 못하게 한다.


**인증서 및 개인키 권한 변경**

```bash
chmod 750 /svc/web/apache/ssl
chmod 600 /svc/web/apache/ssl/server.key
chmod 600 /svc/web/apache/ssl/server.crt
```

- 설정 파일과 마찬가지로 디렉토리는 750, 파일은 600 으로 권한 설정을 한다.

---
### 프로세스 기동 유저 설정

|항목|root로 실행|특정 유저로 실행|
|---|---|---|
|마스터|root|그 유저|
|워커|`httpd.conf`의 `User`로 강등된다|그 유저 (`User` 지시어는 무시된다)|
|80/443 바인딩|가능|불가. `setcap` 또는 높은 포트가 필요하다|

---
#### 직접 실행

```bash
sudo /svc/web/apache/bin/apachectl -k start
```

- 443이나 80같은 포트를 apache 유저가 점유할 수 없기 때문에 부모 프로세스를 root로 기동하는 것이다.

```bash
sudo -u apache /svc/web/apache/bin/apachectl -k start
```

- 위와 같은 포트를 사용하지 않을 경우 부모 프로세스도 전용 유저로 실행하는 것이 좋다.

---
#### systemd

```bash
vi /etc/systemd/system/apache.service
```

```ini
[Unit]
Description=Apache HTTP Server
After=syslog.target network.target

[Service]
Type=forking
User=root
Group=root
ExecStart=/svc/web/apache/bin/apachectl start
ExecStop=/svc/web/apache/bin/apachectl stop

[Install]
WantedBy=multi-user.target
```

- 443이나 80같은 포트를 apache 유저가 점유할 수 없기 때문에 부모 프로세스를 root로 기동하는 것이다.

```ini
[Unit]
Description=Apache HTTP Server
After=syslog.target network.target

[Service]
Type=forking
User=apache
Group=apache
ExecStart=/svc/web/apache/bin/apachectl start
ExecStop=/svc/web/apache/bin/apachectl stop

[Install]
WantedBy=multi-user.target
```

- 위와 같은 포트를 사용하지 않을 경우 부모 프로세스도 전용 유저로 실행하는 것이 좋다.

```bash
systemctl daemon-reload

systemctl start apache

systemctl enable apache

systemctl status apache
```

> [!tip] SELinux
> SELinux가 Enforcing 인 상태에서, Apache를 `systemd`를 통해서 실행할 경우 `init_t`(systemd가 동작하는 SELinux 도메인)라는 SELinux 도메인에서 실행되는데, `svc/web/apache/bin/apachectl` 이 `default_t`(SELinux 파일 타입이 별도로 지정되지 않은 경로/파일 타입)로 되어 있어서 SELinux 정책상 실행이 차단된다.
> 
> 이 경우 둘 중 하나를 수행해야한다.
> 1. 이를 해결하는 설정을 수행한다. (각 `bin`, `lib`, `conf`, `logs` 별 세부 타입 설정 필요)
> 2. SELinux를 Permissive로 설정한다.

---
## 그 외 설정

---
### 기타 명령어

```bash
cd /svc/web/apache/bin

# Syntax 체크 (Syntax OK 표시가 뜨면 정상)
./apachectl -t

# SSL 설정까지 포함하여 확인
./apachectl configtest

# 컴파일된 MPM 및 모듈 확인
./httpd -V
./httpd -M

# 기동 / 종료 / 재기동
./apachectl start
./apachectl stop
./apachectl restart

# 프로세스 및 포트 확인
ps -ef | grep httpd
netstat -natp | grep httpd
```

---
### Server-status 설정

> `server-status`(mod_status)는 Apache의 실시간 상태를 나타내주는 기능이다. (`mod_jk`의 jkstatus와는 별개이다)

`httpd.conf`

```conf
# status 모듈 주석 해제
LoadModule status_module modules/mod_status.so

# <Directory /> 블록 아래에 추가
<Location /server-status>
    SetHandler server-status
    Require ip 192.168.56
</Location>

# 확장 상태 정보(요청별 처리 시간 등)를 함께 수집
ExtendedStatus On
```

---
### 설치 후 점검 항목

| 구분             | 점검 항목                       | 확인 방법                                      |
| -------------- | --------------------------- | ------------------------------------------ |
| 설정             | Syntax 오류가 없는가              | `apachectl -t`                             |
| 프로세스           | 자식 프로세스가 서비스 계정으로 동작하는가     | `ps -ef \| grep httpd`                     |
| 포트             | 의도한 IP/포트에 바인딩되었는가          | `netstat -natp \| grep httpd`              |
| MPM            | 선택한 MPM과 워커 값이 적용되었는가       | `httpd -V`, `server-status`                |
| 버전 노출          | Server 헤더에 버전이 노출되지 않는가     | `curl -I http://localhost`                 |
| 디렉토리 목록        | index 파일이 없을 때 목록이 노출되지 않는가 | 브라우저로 디렉토리 접근                              |
| TLS            | TLS 1.0/1.1이 차단되는가          | `openssl s_client -tls1_1 -connect IP:443` |
| 로그             | rotatelogs로 일자별 로그가 생성되는가   | `ls -al logs/`                             |
| 로그 경로          | 로그가 LOG 파티션에 쌓이는가           | `df -h /log`                               |
| WAS 연동         | Tomcat/JBoss 워커가 정상 등록되었는가  | `jkstatus` 또는 `balancer-manager`           |
| Sticky Session | 동일 세션이 같은 WAS로 전달되는가        | `JSESSIONID` 확인                            |

---
