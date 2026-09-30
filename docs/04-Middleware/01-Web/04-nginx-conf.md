---
title: Nginx 설치 방법 및 운영환경에서의 주요 설정
description: Nginx 소스 빌드 설치부터 nginx.conf, SSL/TLS, Reverse Proxy, Logrotate, 모듈 및 보안 설정까지 운영 환경 구성을 정리합니다.
date: 2026-09-29
sidebar_class_name: hidden-sidebar-item
image: /img/posts/04-Middleware/01-Web/04-nginx-conf/nginx.png
---
---
## 기준

---
### Version

> Nginx : `1.30.5`
> 
> Stable 브랜치는 짝수(ex: 1.30.x), Mainline 은 홀수(ex: 1.31.x) 마이너 번호를 사용한다.
> 
> Stable 은 중대한 버그와 보안 패치만 반영되므로 운영 환경에 적합하고, Mainline 은 신규 기능이 반영되므로 신규 기능이 반드시 필요한 경우에만 사용한다.

---
### 구성 기준

**파일 시스템**

|구분|경로|
|---|---|
|Service 파티션|`/svc`|
|Log 파티션|`/log`|

**디렉토리 구성**

|구분|명명규칙|예시|
|---|---|---|
|Service HOME|`/svc`|`/svc`|
|WebServer HOME|`${Service HOME}/{3rd Party 기능구분}`|`/svc/web`|
|Nginx HOME|`${WebServer HOME}/nginx`|`/svc/web/nginx`|
|명령어 HOME|`${Nginx HOME}/sbin`|`/svc/web/nginx/sbin`|
|설정 HOME|`${Nginx HOME}/conf`|`/svc/web/nginx/conf`|
|인증서 HOME|`${Nginx HOME}/conf/ssl`|`/svc/web/nginx/conf/ssl`|
|LOG HOME|`${Nginx HOME}/logs`|`/svc/web/nginx/logs`|

---
## Nginx 설치

> Nginx 소스 다운로드 : https://nginx.org/en/download.html 공식 문서 : https://nginx.org/en/docs/

> [!info] 소스 빌드를 하는 이유 [참고](https://claude.ai/chat/02-httpd-conf.md#%EC%86%8C%EC%8A%A4-%EB%B9%8C%EB%93%9C%EB%A5%BC-%ED%95%98%EB%8A%94-%EC%9D%B4%EC%9C%A0)

---
### 패키지 의존성

1. PCRE2 (또는 PCRE)
    - `location ~`, `rewrite`, `server_name ~` 같은 지시어의 정규표현식을 처리하는 라이브러리
    - Nginx 1.21.5부터 PCRE2를 우선 사용하며, RHEL 9 이상은 `pcre2-devel`만 제공
    - 없으면 `--without-http_rewrite_module` 옵션으로 rewrite 모듈을 빼야 빌드 가능하므로 사실상 필수
2. C 컴파일러 + 빌드 도구 (`gcc`, `make`)
    - `gcc-c++`을 설치하면 의존성으로 `gcc`도 함께 설치되므로 관례적으로 `gcc-c++`로 설치
3. (http_gzip_module 빌드 시) `zlib-devel`
    - 응답을 gzip으로 압축해 전송하는 기능에 쓰이는 압축 라이브러리
    - gzip 모듈은 기본 포함 모듈이라 없으면 configure 단계에서 오류 발생 (`--without-http_gzip_module`로 제외 가능)
    - 다른 압축 방식을 사용할 경우 사용하지 않지만, 매우 높은 확률로 사용
4. (http_ssl_module 빌드 시) `openssl-devel`
    - HTTPS(TLS) 암호화 기능을 컴파일하는 데 필요한 OpenSSL 헤더와 라이브러리
    - 기본 포함 모듈이 아니므로 `--with-http_ssl_module` 옵션을 줄 때 필요
    - 브라우저는 HTTP/2를 TLS 위에서만 사용하므로, HTTP/2(`--with-http_v2_module`)를 쓰는 경우에도 사실상 필요
    - HTTPS/TLS를 쓰는 환경에서 필요하므로 사실상 필수

**설치 명령어 (RedHat 계열 기준)**

```bash
# 설치 유무 확인 명령어
rpm -qa | grep gcc-c++
rpm -qa | grep make
rpm -qa | grep pcre2-devel
rpm -qa | grep openssl-devel
rpm -qa | grep zlib-devel

# 레포지토리(Local or Remote)가 존재할 경우
dnf install -y gcc-c++
dnf install -y make
dnf install -y pcre2-devel
dnf install -y openssl-devel
dnf install -y zlib-devel

# 반입해서 설치하는 경우
dnf install ./반입폴더/*.rpm
```

---
### 빌드

> 사람마다 '빌드'라고 하는 사람도 있고, '컴파일'이라고 하는 사람도 있는데 정확히 구분하면 아래와 같다.
> 
> 1. 빌드 환경 설정 (`./configure`)
>     - 각종 모듈 사용 여부(`--with-http_ssl_module` 등), 설치 경로(`--prefix`), PCRE / OpenSSL / zlib 위치 등을 결정
>     - 결과물로 `objs/Makefile`과 설정 헤더(`objs/ngx_auto_config.h` 등)를 생성
> 2. `make` 빌드
>     - `gcc`로 컴파일
>         - c 코드 --컴파일--> 어셈블리 코드 --어셈블--> 오브젝트 파일(`.o`)
>         - ex: `src/core/nginx.c` -> `objs/src/core/nginx.o` 등
>     - 각 `.o` 파일을 링크
>         - 오브젝트 파일(`.o`) --링크--> 실행파일(`objs/nginx`)
> 
> 결국 빌드 과정 안에 컴파일 과정이 있는 것이다.
> 
> 이후 `make install`을 실행하면 `objs/nginx` 실행파일과 설정 파일 등이 `--prefix`로 지정한 경로에 복사된다.

```bash
tar -xvf nginx-1.30.5.tar.gz
cd nginx-1.30.5
```

- 반입한 소스 압축 해제

```bash
./configure --prefix=/svc/web/nginx --with-http_ssl_module --with-http_v2_module --with-http_gunzip_module --with-http_gzip_static_module --with-http_stub_status_module --with-http_realip_module
```

- 설정 값을 지정하여 `Makefile` 생성

```bash
make
make install
```

- 빌드

```bash
mkdir -p /log/web/nginx/logs
rm -rf /svc/web/nginx/logs
ln -s /log/web/nginx/logs /svc/web/nginx/logs
```

- Log 파티션 분리를 하는 경우, 심볼릭 링크로 분리

```bash
/svc/web/nginx/sbin/nginx -V
/svc/web/nginx/sbin/nginx -t
```

- 설치 확인

---
### 컴파일 옵션

|Options|Description|
|---|---|
|`--prefix`|설치 경로를 지정<br/>Nginx 바이너리, 설정 파일, 로그 파일 등이 해당 경로 아래에 설치<br/>옵션을 지정하지 않을 경우 default 경로 : `/usr/local/nginx`|
|`--with-http_ssl_module`|SSL/TLS 지원 활성화<br/>HTTPS를 사용하기 위해 OpenSSL 라이브러리 필요<br/>SSL 인증서 설정을 가능하게 함|
|`--with-http_v2_module`|HTTP/2 프로토콜 지원 활성화<br/>기존 HTTP/1.1보다 효율적인 연결 유지 및 멀티플렉싱 지원<br/>Nginx 1.25.1부터는 `listen` 지시자의 `http2` 파라미터가 Deprecated되고 `server` 블록의 `http2 on\|off` 지시자로 제어 (기본값 `off`)|
|`--with-http_gunzip_module`|`Content-Encoding: gzip`으로 압축된 응답을 Nginx가 해제하여 gzip을 지원하지 않는 클라이언트에 전달할 수 있음|
|`--with-http_gzip_static_module`|미리 압축해 둔 `.gz` 파일을 그대로 전송<br/>정적 자원이 많을 때 CPU 사용량을 줄임|
|`--with-http_stub_status_module`|서버 상태 정보를 제공하는 모듈 활성화<br/>`/stub_status` 엔드포인트를 통해 Nginx의 실시간 상태 확인 가능<br/>모니터링 시스템과 연동할 때 유용|
|`--with-http_realip_module`|L4/프록시를 거친 요청에서 `X-Forwarded-For` 등의 헤더를 이용해 실제 클라이언트 IP를 인식하게 함|
|`--with-compat`|동적 모듈 호환성 활성화<br/>동적 모듈을 별도로 컴파일할 계획이면 함께 지정 (2.3.5절)<br/>위 configure 예시에는 포함하지 않음|

---
### 전용 유저 생성

```bash
useradd -r -s /sbin/nologin nginx
```

---
## Nginx 설정

---
### 일반적인 설정 예시 (nginx.conf)

```bash
vi /svc/web/nginx/conf/nginx.conf
```

```nginx
user  nginx;
worker_processes  auto;

events {
    worker_connections  1024;
    use epoll;
    multi_accept on;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" "$cookie_name" '
                      '"$http_user_agent" "$http_x_forwarded_for" $upstream_addr '
                      '$request_time $upstream_response_time';

    open_file_cache max=200000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    reset_timedout_connection on;
    client_body_timeout  60;
    keepalive_timeout    30;
    sendfile             on;
    send_timeout         60;
    keepalive_requests   10000;

    server_tokens    off;
    autoindex        off;
    disable_symlinks on;

    upstream tomcat {
        hash $remote_addr consistent;
        server 192.168.56.105:8080;
        server 192.168.56.105:8180;
        keepalive 64;
    }

    server {
        listen       80;
        server_name  test.example.com;

        access_log  logs/access.log  main;
        error_log   logs/error.log   info;

        location / {
            proxy_pass http://tomcat;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $http_host;
		}

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }

    include extra/*.conf;
}
```

**전역 (main context)**

- **`user nginx;`**: 워커 프로세스를 root가 아닌 `nginx` 계정으로 실행한다. 워커가 탈취되더라도 권한을 최소화하기 위한 설정이다. 마스터 프로세스는 80 포트 바인딩 때문에 root로 실행된다.
- **`worker_processes auto;`**: CPU 코어 수만큼 워커를 띄운다. nginx는 이벤트 기반 싱글 스레드 구조라 코어당 워커 1개가 가장 효율적이다.

**events 블록**

- **`worker_connections 1024;`**: 워커 하나가 동시에 유지할 수 있는 연결 수다. 대략 `worker_processes × worker_connections`가 최대 동시 연결 수가 된다. 리버스 프록시에서는 요청 하나가 클라이언트 측과 업스트림 측 연결 2개를 쓰므로, 실제 처리 가능한 클라이언트 수는 그 절반 정도다.
- **`use epoll;`**: 리눅스에서 가장 효율적인 I/O 이벤트 통지 방식을 지정한다. 리눅스에서는 원래 기본값이라 명시하는 의미 정도다.
- **`multi_accept on;`**: 이벤트가 오면 대기 중인 연결을 한 번에 모두 accept한다. 연결이 몰릴 때 accept 지연을 줄이는 대신, 특정 워커에 연결이 쏠릴 수 있다.

**http 블록: 기본**

- **`include mime.types;`**: 확장자와 Content-Type 매핑 테이블을 불러온다. 정적 파일에 올바른 MIME 타입을 붙이기 위한 것이다.
- **`default_type application/octet-stream;`**: 매핑에 없는 파일은 바이너리로 취급한다. 브라우저가 알 수 없는 파일을 렌더링하지 않고 다운로드하게 되므로 안전한 기본값이다.

**로그 포맷**

- **`log_format main ...`**: 기본 combined 포맷에 프록시 분석용 필드를 추가한 형태다.
    - `$http_x_forwarded_for`: 앞단에 LB나 CDN이 있을 때 실제 클라이언트 IP를 추적한다.
    - `$upstream_addr`: 요청이 어느 Tomcat 인스턴스로 갔는지 `IP:Port` 형태로 기록한다. 두 인스턴스가 같은 IP(`192.168.56.105`)이므로 포트(`8080`/`8180`)로 구분한다. 해시 분산이 제대로 되는지 확인하는 용도다.
    - `$request_time`: 클라이언트 기준 전체 처리 시간이다.
    - `$upstream_response_time`: Tomcat 응답 시간이다. `$request_time`과 비교하면 지연이 nginx 쪽인지 WAS 쪽인지 구분할 수 있다.
    - `$cookie_name`: **`name`이라는 이름의 쿠키** 값을 기록한다. 템플릿에서 그대로 가져왔을 가능성이 크다. 세션 추적이 목적이라면 `$cookie_JSESSIONID`처럼 실제 쿠키 이름으로 바꿔야 의미가 있다.

**파일 디스크립터 캐시**

- **`open_file_cache max=200000 inactive=20s;`**: 열었던 파일의 fd, 크기, 수정시간을 최대 20만 개까지 캐시한다. 20초 동안 접근이 없으면 제거한다. 정적 파일을 서빙할 때 open/stat 시스템콜을 줄여준다.
- **`open_file_cache_valid 30s;`**: 캐시된 항목의 유효성을 30초마다 재검사한다.
- **`open_file_cache_min_uses 2;`**: `inactive` 기간 안에 2번 이상 쓰인 파일만 캐시에 남긴다. 한 번만 쓰인 파일이 캐시를 채우는 것을 막는다.
- **`open_file_cache_errors on;`**: "파일 없음" 같은 에러 결과도 캐시한다. 존재하지 않는 경로를 반복해서 요청하는 경우의 부하를 줄인다.
    - 현재 `location /`는 전부 Tomcat으로 프록시하므로, 이 캐시가 실제로 효과를 내는 곳은 `/50x.html` 정도뿐이다.

**타임아웃 / 연결 관리**

- **`reset_timedout_connection on;`**: 타임아웃된 연결을 FIN이 아닌 RST로 즉시 끊는다. FIN_WAIT 상태로 남은 소켓이 메모리와 fd를 점유하는 것을 방지한다.
- **`client_body_timeout 60;`**: 요청 바디를 읽을 때 두 read 사이 간격이 60초를 넘으면 408을 반환한다. Slowloris류의 느린 전송 공격을 막기 위한 설정이다.
- **`keepalive_timeout 30;`**: 클라이언트 keep-alive 연결을 유휴 상태로 30초 유지한다. 기본값 75초보다 짧게 잡아 유휴 연결이 워커 슬롯을 점유하는 시간을 줄인다.
- **`sendfile on;`**: 커널 공간에서 파일을 소켓으로 바로 복사한다(zero-copy). 정적 파일 전송 성능이 좋아진다.
- **`send_timeout 60;`**: 응답 전송 중 두 write 사이 간격이 60초를 넘으면 연결을 끊는다. 응답을 받지 않고 버티는 클라이언트를 정리한다.
- **`keepalive_requests 10000;`**: 연결 하나당 최대 1만 요청까지 재사용한다(기본값 1000). 연결 재수립 비용을 줄이기 위한 설정이다.

**보안**

- **`server_tokens off;`**: 응답 헤더와 에러 페이지에서 nginx 버전을 숨긴다. 버전별 취약점을 노린 정찰을 어렵게 한다.
- **`autoindex off;`**: 디렉터리 목록 노출을 막는다. 원래 기본값이지만 의도를 명시한 것이다.
- **`disable_symlinks on;`**: 경로 중에 심볼릭 링크가 있으면 접근을 거부한다. 웹 루트 밖 파일(`/etc/passwd` 등)로 향하는 링크를 이용한 우회를 차단한다. 경로마다 추가 검사를 하므로 약간의 비용이 있다.

**upstream tomcat**

- **`hash $remote_addr consistent;`**: 클라이언트 IP 기준으로 항상 같은 Tomcat에 요청을 보낸다. 세션 클러스터링이 없을 때 세션을 유지(sticky)하기 위한 목적이다. `consistent`(ketama)는 서버가 추가되거나 빠질 때 재배치되는 키를 최소화한다.
    - 앞단에 L4 LB나 NAT가 있으면 모든 요청이 같은 IP로 보여 **한 대에 쏠린다.** 이 경우 `$http_x_forwarded_for`나 `$cookie_JSESSIONID`를 해시 키로 쓰는 것을 검토해야 한다.
- **`server 192.168.56.105:8080;` / `server 192.168.56.105:8180;`**: 같은 서버(`192.168.56.105`)에 포트를 달리해 띄운 Tomcat 인스턴스 2개다. 기본값이 `max_fails=1 fail_timeout=10s`이므로, 한 번 실패하면 10초 동안 해당 인스턴스를 제외한다.
    - 인스턴스 하나가 죽는 경우(프로세스 다운, 재기동)에는 대응하지만, 서버 자체가 내려가면 두 인스턴스가 함께 빠지므로 서버 장애에는 대응하지 못한다.
- **`keepalive 64;`**: 각 Nginx 워커가 upstream(Tomcat)과 맺은 **유휴 keepalive 연결을 최대 64개까지 캐시하여 재사용**하도록 설정. 요청마다 새로운 TCP 연결을 생성하는 비용을 줄이기 위한 설정.
    - 동시 연결 수의 상한이 아니라 **요청 처리 후 남겨둘 유휴 연결의 상한**. 동시 요청이 64개를 넘으면 초과분은 새 연결을 맺고, 처리 후 64개를 넘는 유휴 연결은 닫힘.
    - 백엔드 서버별 값이 아니라 **워커당 upstream 그룹 전체**에 대한 값. 워커가 4개면 Tomcat 인스턴스 2개(`8080`, `8180`) 합계 최대 256개의 유휴 연결이 유지될 수 있음.
    - `worker_connections`는 클라이언트 연결과 upstream 연결을 합산하므로, 리버스 프록시에서 워커 하나가 가질 수 있는 upstream 연결은 `worker_connections`의 절반 정도. 이보다 큰 `keepalive` 값은 채워질 수 없어 의미가 없고, 트래픽이 몰렸다 빠진 뒤 유휴 연결이 워커 슬롯과 Tomcat 연결을 계속 점유하게 됨.
    - 유휴 연결 유지 시간은 upstream의 `keepalive_timeout`(default: `60s`)으로 정하며, Tomcat의 `keepAliveTimeout`보다 짧게 설정해야 이미 닫힌 연결을 재사용해 502가 발생하는 것을 막을 수 있음.

**server 블록**

- **`listen 80;`**: HTTP 80 포트에서 수신한다.
- **`server_name test.example.com;`**: 요청의 Host 헤더와 비교해 어느 server 블록이 처리할지 정하는 값이다. 80 포트는 평문 HTTP라 SNI가 없고, Host 헤더 기준의 name-based virtual host로 분기한다.
    - 단, 이 블록이 80 포트의 유일한(첫 번째) 블록이라 **default server로도 동작한다.** Host가 `test.example.com`이 아니거나 IP로 직접 접속한 요청도 매칭되는 블록이 없으면 이 블록이 처리한다.
    - 등록되지 않은 Host의 요청을 거부하려면 별도의 default server 블록을 두어 연결을 끊어야 한다. 이렇게 하면 임의의 Host 값이 `$http_host`를 통해 Tomcat까지 전달되는 것(Host header injection)도 막을 수 있다.
- **`access_log logs/access.log main;`**: 위에서 정의한 `main` 포맷으로 기록한다.
- **`error_log logs/error.log info;`**: `info` 레벨이라 로그가 많이 남는다(클라이언트 연결 종료 같은 메시지까지 기록된다). 운영 환경에서는 보통 `warn`이나 `error`를 쓴다.

**location /**

- **`proxy_pass http://tomcat;`**: 모든 요청을 upstream `tomcat` 그룹으로 전달한다.
- **`proxy_http_version 1.1;`**: nginx가 업스트림(Tomcat)에 요청할 때 사용하는 HTTP 버전을 1.1로 지정한다.
    - 기본값은 `1.0`이다. HTTP/1.0은 기본 동작이 "요청 하나 처리 후 연결 종료"라서 연결 재사용이 되지 않는다.
- **`proxy_set_header Connection "";`**: 업스트림으로 보내는 요청에서 `Connection` 헤더를 제거한다(값을 빈 문자열로 지정하면 헤더 자체가 전송되지 않는다).
    - nginx는 기본적으로 업스트림 요청에 `Connection: close`를 넣는다. HTTP/1.1로 올려도 이 헤더가 있으면 Tomcat이 응답 후 연결을 끊으므로 keepalive가 무력화된다.
- **`proxy_set_header X-Real-IP $remote_addr;`**: Tomcat 입장에서는 접속자가 nginx IP로 보이므로 실제 클라이언트 IP를 헤더로 넘긴다.
- **`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`**: 기존 XFF 헤더에 현재 클라이언트 IP를 덧붙여 프록시 경로 전체를 전달한다.
- **`proxy_set_header X-Forwarded-Proto $scheme;`**: 원래 요청이 http인지 https인지 알려준다. Tomcat이 리다이렉트 URL을 만들 때 스킴을 틀리지 않게 하기 위한 것이다(Tomcat 쪽 `RemoteIpValve`와 짝을 이룬다).
- **`proxy_set_header Host $http_host;`**: 클라이언트가 보낸 Host 헤더를 포트까지 그대로 넘긴다. 기본값은 업스트림 이름(`tomcat`)이라 이 설정이 없으면 가상호스트나 리다이렉트가 깨진다. `$host`와 달리 요청에 Host가 없으면 빈 값이 된다.

**에러 페이지**

- **`error_page 500 502 503 504 /50x.html;`**: 서버 에러가 나면 nginx의 정적 에러 페이지를 보여준다.
    - `proxy_intercept_errors on;`이 없으면 **Tomcat이 돌려준 500 응답은 그대로 전달된다.** 이 설정이 실제로 적용되는 것은 nginx가 직접 만든 502/504(Tomcat 다운, 타임아웃)뿐이다.
- **`location = /50x.html { root html; }`**: 에러 페이지 파일을 `html/50x.html`에서 정확히 매칭해 서빙한다. `=`는 정확 일치라 location 매칭 중 가장 먼저 평가된다.

**include**

- **`include extra/*.conf;`**: `conf/extra/` 아래의 `.conf` 파일을 http 블록 안으로 불러온다. 아래 `ssl.conf`가 이 경로로 로드되므로, 443 블록에서도 `upstream tomcat`과 `log_format main`을 그대로 쓸 수 있다.

---
### 전체 프로세스 및 시스템 설정 옵션

|전체 프로세스 및 시스템 설정 Options|Description|
|---|---|
|`user`|worker 프로세스를 실행할 계정|
|`worker_processes auto;`|Nginx가 사용할 worker 프로세스 개수<br/>보통 서버의 CPU 코어 개수와 동일하게 설정하며 `auto`로 설정 시 서버의 CPU 코어 개수만큼 설정됨|
|`worker_rlimit_nofile`|worker 프로세스가 열 수 있는 파일 디스크립터 최대 개수<br/>`worker_connections`보다 크게 잡아야 함 (연결 1개당 최소 1개 사용)<br/>예시 설정에는 미포함|
|**event 설정 Options**|**Description**|
|`worker_connections 1024;`|각 worker 프로세스가 동시에 처리할 수 있는 최대 연결 수<br/>총 동시 접속 가능 수 = `worker_processes × worker_connections`<br/>리버스 프록시는 클라이언트 1 + upstream 1 = 연결 2개를 사용<br/>default: `512`|
|`use epoll;`|Linux 커널에서 제공하는 고성능 이벤트 처리 방식<br/>수많은 동시 연결을 효율적으로 관리 가능 (특히 대규모 트래픽 처리에 유리)<br/>종류: `select`, `poll`, `kqueue`, `epoll`|
|`multi_accept on;`|worker 프로세스가 여러 연결을 한 번에 처리할 수 있도록 함<br/>비활성화된 경우 프로세스는 한 번에 하나의 새 연결을 수락<br/>`kqueue` 설정 시 해당 옵션은 무시됨<br/>default: `off`|
|**HTTP 설정 Options**|**Description**|
|`include mime.types;`|MIME 타입을 설정하는 파일을 불러옴<br/>(ex. `.html` → `text/html`, `.jpg` → `image/jpeg`)|
|`default_type application/octet-stream;`|MIME 타입을 알 수 없는 경우 기본값 설정 (파일 다운로드 시 사용)|
|`open_file_cache max=200000 inactive=20s`|최대 200,000개의 파일 정보를 캐시에 저장<br/>캐시 오버플로우 시 가장 최근에 사용되지 않은(LRU) 요소가 제거<br/>20초 동안 사용되지 않으면 캐시에서 제거<br/>default: `off`|
|`open_file_cache_valid 30s`|30초마다 캐시 항목의 유효성을 재검사<br/>default: `60s`|
|`open_file_cache_min_uses 2`|파일이 2번 이상 사용되면 캐시에 저장<br/>default: `1`|
|`open_file_cache_errors on`|파일 조회 오류의 캐싱을 활성화<br/>default: `off`|
|`reset_timedout_connection on`|시간 초과 연결 및 비표준 코드 `444`로 종료된 연결을 RST로 즉시 정리<br/>단, 시간 초과된 keep-alive 연결은 정상적으로 닫힘<br/>비표준 코드 `444`: Nginx 전용 코드로 응답 없이 연결을 즉시 끊음<br/>주로 악성 요청, 스팸 트래픽 차단 등의 보안 용도로 사용<br/>default: `off`|
|`client_body_timeout 60`|클라이언트 요청 본문 읽기를 위한 시간 제한(초)<br/>전체 요청 본문 전송 시간이 아닌 두 개의 연속적인 읽기 작업 사이의 기간에 적용<br/>이 시간 내에 아무것도 전송하지 않으면 `408` 오류와 함께 요청 종료<br/>default: `60`|
|`keepalive_timeout 30`|클라이언트와 서버 간의 keep-alive 유지 시간(초)<br/>`0`으로 설정 시 keep-alive 비활성화 (요청마다 새로운 연결 생성)<br/>default: `75`|
|`sendfile on`|OS의 `sendfile()` 시스템 콜 사용 여부<br/>`on`이면 커널에서 최적화된 방식으로 파일을 전송하여 속도가 빨라지고 메모리 복사가 줄어 고성능 웹서버 구축에 유용|
|`send_timeout 60`|응답 전송 시 두 개의 연속적인 쓰기 작업 사이의 시간 제한(초)<br/>이 시간 내에 클라이언트가 아무것도 받지 않으면 연결 종료<br/>default: `60`|
|`tcp_nopush on`|`sendfile`과 함께 사용하여 응답 헤더와 본문을 하나의 패킷으로 묶어 전송<br/>네트워크 효율 향상<br/>예시 설정에는 미포함|
|`keepalive_requests 10000`|하나의 Keep-Alive 연결에서 처리할 최대 요청 수<br/>값을 초과하면 서버가 해당 연결을 닫고 새로운 연결을 생성<br/>무한정 유지되면 메모리 사용량 증가 가능성이 있으므로 최대 요청 수 지정<br/>default: `1000`|
|`autoindex off`|`on`인 경우 URI가 `/`로 끝나면 디렉토리 요청으로 해석하여 파일 목록을 출력<br/>`autoindex on` : index 파일이 없으면 파일 목록 출력<br/>`autoindex off` : index 파일이 없으면 `403` 에러<br/>default: `off`|
|`server_tokens off`|응답 헤더(Server 필드) 및 에러 페이지에서 버전 정보를 표시할지 여부<br/>`on` : `Server: nginx/1.30.5`<br/>`off` : `Server: nginx`<br/>default: `on`|
|`disable_symlinks on`|파일을 열 때 심볼릭 링크를 어떻게 처리할지 결정<br/>`off` : 심볼릭 링크를 허용하고 검사하지 않음<br/>`on` : 경로 구성 요소가 심볼릭 링크이면 접근 거부<br/>`if_not_owner` : 링크 소유자가 원본 파일 소유자와 다르면 차단<br/>`from=part` : 특정 디렉토리 이후부터 검사 적용<br/>default: `off`|
|`include extra/*.conf`|`conf/extra/` 아래의 설정 파일을 http 블록에 포함<br/>`ssl.conf` 등 가상호스트별 설정을 분리할 때 사용|
|**Upstream 설정 Options**|**Description**|
|`hash $remote_addr consistent;`|클라이언트 IP 기반으로 백엔드 서버를 라우팅<br/>같은 사용자가 같은 서버로 요청을 보내도록 함 (세션 유지)<br/>`consistent`는 서버 증감 시 재배치되는 키를 최소화|
|`server $IP:PORT`|백엔드 서버의 IP 및 Port 설정<br/>예시는 한 서버(`192.168.56.105`)의 Tomcat 인스턴스 2개를 Port(`8080`, `8180`)로 구분<br/>`max_fails`, `fail_timeout`으로 장애 판정 기준을 조정할 수 있음 (default: `max_fails=1 fail_timeout=10s`)|
|`keepalive 64`|각 worker 프로세스가 upstream 그룹과 유지할 유휴 커넥션의 최대 개수<br/>동시 연결 수 제한이 아닌 유휴 연결 캐시 크기<br/>`worker_connections`의 절반보다 작게 설정|

---
### Log Format 옵션

|Log Format Options|Description|
|---|---|
|`$remote_addr`|클라이언트 IP|
|`$remote_user`|인증된 사용자 이름|
|`$time_local`|요청 시간|
|`$request`|요청된 HTTP 요청 라인<br/>ex) `"GET /index.html HTTP/1.1"`|
|`$status`|HTTP 응답 코드<br/>ex) `200`, `404`, `500`|
|`$body_bytes_sent`|응답 바이트 크기|
|`$http_referer`|요청의 Referer 헤더 값|
|`$http_user_agent`|사용자 브라우저 정보|
|`$http_x_forwarded_for`|프록시를 거쳐 온 원래 클라이언트 IP|
|`$upstream_addr`|요청을 처리한 백엔드 서버(ex: Tomcat)의 `IP:Port`<br/>ex) `192.168.56.105:8080`<br/>한 서버에 인스턴스가 여러 개면 Port로 구분|
|`$request_time`|전체 요청 처리 시간(초)|
|`$upstream_response_time`|백엔드 서버(Tomcat)의 응답 시간(초)<br/>`$request_time`과의 차이가 크면 클라이언트 구간 지연을 의심|
|`$cookie_이름`|특정 쿠키 값<br/>ex) `$cookie_JSESSIONID`<br/>`$cookie_name`은 이름이 `"name"`인 쿠키를 의미하므로 주의|

---
### Proxy 관련 옵션

|Proxy Options|Description|
|---|---|
|`proxy_pass`|`location`에 설정한 경로로 들어온 요청을 백엔드 서버(upstream)로 전달|
|`proxy_http_version 1.1;`|upstream과의 통신에 HTTP/1.1을 사용<br/>default는 `1.0`이며, keepalive를 사용하려면 반드시 `1.1`이어야 함|
|`proxy_set_header Connection "";`|upstream으로 전달되는 `Connection` 헤더를 비움<br/>비우지 않으면 `Connection: close`가 전달되어 keepalive가 동작하지 않음|
|`proxy_set_header X-Real-IP $remote_addr;`|클라이언트의 실제 IP 주소를 `X-Real-IP` 헤더에 추가<br/>프록시가 요청을 전달하면 백엔드에는 프록시 IP가 기록되므로 이를 방지하기 위한 설정|
|`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`|`X-Forwarded-For` 헤더는 클라이언트가 거쳐온 IP 주소 목록을 저장<br/>`$proxy_add_x_forwarded_for`는 기존 XFF 값 뒤에 `$remote_addr`(Nginx에 직접 접속한 IP)를 추가<br/>ex) 클라이언트 A → Nginx → Tomcat이면 Tomcat에서는 `"A"`로 보임<br/>ex) 클라이언트 A → 프록시 P → Nginx → Tomcat이면 `"A, P"`로 보임<br/>Nginx 자신의 IP는 추가되지 않음 (Tomcat에서는 접속 IP로 확인)|
|`proxy_set_header X-Forwarded-Proto $scheme;`|원래 요청이 `http`인지 `https`인지를 백엔드에 전달<br/>WAS에서 HTTPS 여부를 판단하거나 리다이렉트를 생성할 때 필요|
|`proxy_set_header Host $http_host;`|클라이언트가 요청한 원래 Host 값(포트 포함)을 백엔드 서버로 전달<br/>이 설정이 없으면 upstream 이름(`tomcat`)이 Host로 전달됨|
|`proxy_connect_timeout`|백엔드 서버와 연결을 맺기까지 기다리는 시간<br/>default: `60s`<br/>예시에서는 미설정 (기본값 적용)|
|`proxy_read_timeout`|백엔드 서버로부터 응답을 읽는 사이의 최대 대기 시간<br/>default: `60s`<br/>오래 걸리는 업무 화면이 있으면 늘려야 `504`가 발생하지 않음<br/>예시에서는 미설정 (기본값 적용)|
|`proxy_send_timeout`|백엔드 서버로 요청을 전송하는 사이의 최대 대기 시간<br/>default: `60s`<br/>예시에서는 미설정 (기본값 적용)|

---
### SSL 설정 예시 (ssl.conf)

```bash
vi /svc/web/nginx/conf/extra/ssl.conf
```

```nginx
server {
    listen  443 ssl;

    server_name  test.example.com;

    error_log   logs/ssl-error.log  info;
    access_log  logs/ssl-access.log main;

    ssl_certificate      ssl/server.crt;
    ssl_certificate_key  ssl/server.key;

    ssl_session_cache    shared:SSL:1m;
    ssl_session_timeout  5m;
    ssl_session_tickets  off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers  on;

    location / {
        proxy_pass http://tomcat;
        proxy_http_version 1.1;
		proxy_set_header Connection "";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
	}
}
```

**server 블록 (443)**

- **`listen 443 ssl;`** : 443 포트에서 TLS로 수신한다.
- **`server_name test.example.com;`** : 80 블록과 같은 도메인이다. HTTPS에서는 TLS 핸드셰이크의 SNI 값으로 server 블록(과 사용할 인증서)을 고른다. 인증서의 CN/SAN에 `test.example.com`이 포함되어 있어야 브라우저 검증을 통과한다.
    - 80 블록과 마찬가지로 443 포트의 유일한(첫 번째) 블록이라 **default server로도 동작한다.** SNI가 없거나 다른 도메인·IP로 들어온 요청도 이 블록의 인증서로 응답하므로, 클라이언트에는 인증서 이름 불일치 경고가 뜬다.
- **`error_log logs/ssl-error.log info;`** : HTTPS 에러 로그를 따로 분리한다.
- **`access_log logs/ssl-access.log main;`** : HTTPS 트래픽을 HTTP와 분리해 기록한다. 같은 `main` 포맷을 쓰므로 비교 분석이 쉽다.

**인증서**

- **`ssl_certificate ssl/server.crt;`** : 서버 인증서 경로다(`conf` 기준 상대 경로이므로 `/svc/web/nginx/conf/ssl/server.crt`). 공인 인증서라면 이 파일에 **중간 인증서까지 이어 붙인 체인(fullchain)** 이 들어 있어야 한다. 서버 인증서만 있으면 브라우저는 AIA로 보완해 통과하더라도 curl, Java 클라이언트, 모바일 앱 등에서 검증에 실패한다.
- **`ssl_certificate_key ssl/server.key;`** : 개인키 경로다. 마스터 프로세스(root)가 읽으므로 권한은 `600`이나 `400`으로 제한한다.

**세션 재사용**

- **`ssl_session_cache shared:SSL:1m;`** : TLS 세션을 모든 워커가 공유하는 메모리 캐시에 저장한다. 재접속 시 전체 핸드셰이크를 생략해 CPU와 지연을 줄인다. 1MB에 약 4,000개 세션이 들어가므로 트래픽이 많으면 `10m` 정도로 늘린다.
- **`ssl_session_timeout 5m;`** : 캐시된 세션의 유효 시간이다(기본값과 같다). 이 시간이 지나면 전체 핸드셰이크를 다시 한다.
- **`ssl_session_tickets off;`** : 세션 티켓(세션 상태를 암호화해 클라이언트에 맡기는 방식)을 끈다. nginx는 티켓 암호화 키를 재시작 전까지 교체하지 않기 때문에, 키가 유출되면 과거 트래픽이 복호화될 수 있다. 즉 **전방 비밀성(PFS)** 을 지키기 위한 설정이다. 재사용은 위의 서버 측 캐시로 대신한다.

**프로토콜 / 암호 스위트**

- **`ssl_protocols TLSv1.2 TLSv1.3;`** : 취약한 SSLv3, TLS 1.0, 1.1을 제외한다. 현재 권장 기준(Mozilla Intermediate)과 같다.
- **`ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:...:ECDHE-RSA-CHACHA20-POLY1305;`** : TLS 1.2에서 쓸 암호 스위트다. Mozilla Intermediate 권장 목록에서 DHE 계열 3개를 뺀 구성으로, 키 교환은 전부 ECDHE(전방 비밀성 보장), 암호화는 전부 AEAD(AES-GCM, CHACHA20-POLY1305)다.
    - 이 지시어는 **TLS 1.2 이하에만 적용된다.** TLS 1.3 암호 스위트는 OpenSSL 기본값을 따른다.
    - `ECDHE-ECDSA-*`는 ECDSA 인증서, `ECDHE-RSA-*`는 RSA 인증서일 때만 선택된다. 인증서가 하나면 그 키 타입의 스위트 3개만 실제로 쓰이고, 나머지는 인증서 타입을 바꾸거나 RSA/ECDSA 이중 인증서를 둘 때를 대비한 항목이다.
    - DHE 계열이 없으므로 `ssl_dhparam` 설정이 필요 없다. CBC 모드 스위트도 없어 AEAD 스위트만 협상된다.
    - 순서는 AES128-GCM → AES256-GCM → CHACHA20이다.
- **`ssl_prefer_server_ciphers on;`**: 클라이언트가 아닌 서버의 암호 순서를 우선한다. 위 목록 순서대로 AES128-GCM이 가장 먼저 선택된다.
    - 목록이 전부 강한 스위트(ECDHE + AEAD)로만 구성되어 있어 보안상 차이는 없다. Mozilla Intermediate는 이런 경우 `off`로 두고 클라이언트가 자기 하드웨어에 맞는 것(예: AES 하드웨어 가속이 없는 모바일의 CHACHA20)을 고르게 하는 것을 권장한다. `on`이면 이런 클라이언트도 AES-GCM을 쓰게 되어 성능 면에서만 약간 불리하다.

**location /**

- **`proxy_pass http://tomcat;`** : TLS는 nginx에서 종료(SSL offloading)하고 Tomcat에는 평문 HTTP로 전달한다. Tomcat이 TLS 연산을 하지 않아도 되며, 인증서도 nginx 한 곳에서만 관리하면 된다. upstream `tomcat`은 `nginx.conf`에 정의된 것을 그대로 쓴다(`include extra/*.conf`로 http 블록 안에 로드되기 때문).
- **`proxy_http_version 1.1;`**: nginx가 업스트림(Tomcat)에 요청할 때 사용하는 HTTP 버전을 1.1로 지정한다.
    - 기본값은 `1.0`이다. HTTP/1.0은 기본 동작이 "요청 하나 처리 후 연결 종료"라서 연결 재사용이 되지 않는다.
- **`proxy_set_header Connection "";`**: 업스트림으로 보내는 요청에서 `Connection` 헤더를 제거한다(값을 빈 문자열로 지정하면 헤더 자체가 전송되지 않는다).
    - nginx는 기본적으로 업스트림 요청에 `Connection: close`를 넣는다. HTTP/1.1로 올려도 이 헤더가 있으면 Tomcat이 응답 후 연결을 끊으므로 keepalive가 무력화된다.
- **`proxy_set_header X-Real-IP / X-Forwarded-For`**: 80 블록과 같다. 실제 클라이언트 IP를 Tomcat에 넘긴다.
- **`proxy_set_header X-Forwarded-Proto $scheme;`**: 이 블록에서는 값이 `https`가 된다. Tomcat은 평문으로 요청을 받기 때문에 이 헤더가 없으면 자신이 http로 서비스된다고 판단한다. 그러면 리다이렉트가 `http://`로 나가거나 Secure 쿠키가 제대로 처리되지 않는다. SSL offloading 구조에서 **가장 중요한 헤더**다(Tomcat 쪽 `RemoteIpValve`의 `protocolHeader` 설정이 함께 필요하다).
- **`proxy_set_header Host $http_host;`**: 원래 Host 헤더를 그대로 전달한다.

---
### SSL 옵션

| SSL Options                 | Description                                                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssl_certificate`           | 서버 인증서(공개키) 파일 경로<br/>중간 인증서가 있으면 서버 인증서 뒤에 이어붙인 파일을 지정                                                                                                          |
| `ssl_certificate_key`       | 서버 개인키 파일 경로 (권한 `600`)                                                                                                                                          |
| `ssl_protocols`             | 허용할 TLS 버전<br/>TLS 1.0/1.1은 RFC 8996으로 폐기되었으므로 `TLSv1.2 TLSv1.3`만 사용                                                                                             |
| `ssl_ciphers`               | TLS 1.2 이하에서 사용할 암호화 스위트 목록<br/>예시는 Mozilla Intermediate 목록에서 DHE 계열을 제외한 6개 (`ssl_dhparam` 불필요)<br/>TLS 1.3의 cipher는 이 지시자로 제어되지 않음                             |
| `ssl_prefer_server_ciphers` | 클라이언트가 아닌 서버가 제시한 cipher 우선순위를 따르도록 설정<br/>목록이 전부 강한 스위트면 `off`가 Mozilla 권장 (클라이언트가 CHACHA20 등을 선택 가능)<br/>default: `off`                                        |
| `ssl_session_cache`         | TLS 세션을 공유 메모리에 캐시하여 재협상 비용을 줄임<br/>`shared:SSL:1m`은 약 4,000 세션을 저장할 수 있음<br/>트래픽이 많으면 `10m`(약 40,000 세션)으로 증설                                                   |
| `ssl_session_timeout`       | 세션 캐시 유효 시간<br/>default: `5m`                                                                                                                                    |
| `ssl_session_tickets`       | 세션 티켓 사용 여부<br/>키 로테이션이 되지 않으면 Forward Secrecy가 약화되므로 `off` 권장                                                                                                   |
| `http2 on;`                 | HTTP/2 활성화 (Nginx 1.25.1 이상)<br/>기본값이 `off`이므로 반드시 명시해야 함<br/>예시 설정에는 미포함                                                                                        |
| `Strict-Transport-Security` | HSTS 헤더<br/>브라우저가 이후 요청을 무조건 HTTPS로 보내도록 강제<br/>HTTP로 서비스되는 경로가 있으면 접속 불가가 되므로 사전 확인 필수<br/>`add_header` 사용 시 `always`를 붙여야 4xx/5xx 응답에도 헤더가 적용됨<br/>예시 설정에는 미포함 |

---
## Logrotate

---
### 설정

```bash
vi /etc/logrotate.d/nginx
```

```conf
/log/web/nginx/logs/*.log {
copytruncate
daily
rotate 365
missingok
notifempty
dateext
}
```

- `copytruncate`: 원본을 복사한 뒤 원본 내용을 비우는 방식이다. Nginx이 파일을 계속 열고 있으므로, 재기동 없이 로테이션하기 위해 사용한다.
- `daily`: 매일 로테이션한다.
- `rotate 365`: 로테이션된 파일을 365개(약 1년)까지 보관하고, 초과분은 삭제한다. 로그 보관 기간 정책을 준수하기 위함이다.
- `missingok`: 대상 로그 파일이 없어도 오류 없이 넘어간다.
- `notifempty`: 로그 파일이 비어 있으면 로테이션하지 않아 불필요한 빈 파일 생성을 방지한다.
- `dateext`: 로테이션 파일명에 숫자(.1, .2) 대신 날짜(-YYYYMMDD)를 붙여 특정 날짜의 로그를 쉽게 찾을 수 있게 한다.

**logrotate 강제 기동 명령어**

```bash
logrotate -f /etc/logrotate.d/nginx
```

---
### Logrotate Options

| Logrotate Options          | Description                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `daily`                    | 로그 파일 로테이션 주기 설정<br/>`daily`: 매일 / `weekly`: 매주 / `monthly`: 매달                                  |
| `rotate 365`               | 로그 파일 보관 개수 설정<br/>설정한 개수를 초과하면 오래된 로그부터 삭제                                                      |
| `missingok`                | 로그 파일이 존재하지 않더라도 오류를 발생시키지 않음                                                                    |
| `notifempty`               | 로그 파일이 비어 있으면 로테이션하지 않음                                                                          |
| `dateext`                  | 로테이션된 로그 파일 이름에 날짜를 추가                                                                           |
| `sharedscripts`            | 여러 로그 파일이 매칭되어도 `postrotate` 스크립트를 한 번만 실행                                                       |
| `postrotate ... endscript` | 로그 로테이션 후 실행할 명령 지정<br/>Nginx는 `kill -USR1` 시그널을 통해 로그 파일을 재오픈                                   |
| `copytruncate`             | 로그 파일을 복사한 뒤 원본 파일을 비우는 방식<br/>프로세스에 시그널을 보낼 수 없을 때 사용할 수 있으나, 복사와 truncate 사이에 기록된 로그가 유실될 수 있음 |

---
## Module 별 설정

---
### http_stub_status_module

> http_stub_status_module 은 Nginx 자체 상태/통계 정보를 HTTP로 노출하는 모듈 (apache의 `mod_status`와 비슷하다고 보면 됨)

```nginx
server {
    location /nginx_status {
        stub_status;
        allow 192.12.30.0/24;
        deny  all;
    }
}
```

- 그렇게 눈여겨 볼 부분은 없고, 이 상태 페이지의 경우에는 관리자 이외에 접근하면 안되므로 위처럼 반드시 접근 IP를 제한해야한다.

---
### gzip / http_gunzip_module

|구분|`gzip`|`http_gunzip_module`|
|---|---|---|
|역할|응답을 **gzip으로 압축**|gzip 응답을 **압축 해제**|
|방향|원본 → gzip|gzip → 원본|
|주 사용 목적|네트워크 트래픽/전송량 감소|gzip을 지원하지 않는 클라이언트 대응|
|관련 지시어|`gzip on;`|`gunzip on;`|
|빌드 옵션|기본 포함|`--with-http_gunzip_module`|

```nginx
http {

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_vary on;

    server {
        ...
        }
    }
}

```

- **`gzip on`**: Nginx가 응답을 gzip으로 압축하여 클라이언트에 전달
- **`gunzip on`**: 백엔드가 gzip으로 보낸 응답을 Nginx가 압축 해제하여 gzip을 지원하지 않는 클라이언트에 전달 (`http_gunzip_module` 필요)
- **`gzip_min_length`**: 지정한 크기 미만의 응답은 압축하지 않도록 설정. 작은 응답은 압축에 따른 오버헤드가 더 클 수 있음
- **`gzip_vary on`**: 캐시 서버가 gzip 압축 응답과 비압축 응답을 구분할 수 있도록 `Vary: Accept-Encoding` 헤더 추가

---
## 보안 설정

---
### 기본 보안 설정

**버전 정보 노출 차단**

```nginx
http {
	...
	server_tokens    off;
	...
}
```

- on일 경우 응답에 `Server: nginx/1.30.5` 이런식으로 버전 정보가 노출된다.
- off일 경우 응답에 `Server: nginx` 이렇게 표시되며, 버전 정보가 노출되지 않는다.
- `Server` 헤더 자체를 지우려면 서드파티 모듈(headers-more)이 필요하다.


**디렉토리 목록 노출 차단**

```nginx
http {
	...
    autoindex        off;
	...
}
```

- `autoindex off` 설정은 Nginx 기본값이지만 명시적으로 선언한다.


**파일 권한**

```bash
chown -R nginx:nginx /svc/web/nginx
chmod 750 /svc/web/nginx/conf
chmod 600 /svc/web/nginx/conf/*.conf
chmod 750 /log/web/nginx/logs
chmod 600 /log/web/nginx/logs/*
```

- **`chown -R nginx:nginx /svc/web/nginx`**: Nginx 설치 디렉토리와 하위 파일의 소유자 및 그룹을 `nginx` 계정으로 변경
- **`chmod 750 /svc/web/nginx/conf`**: Nginx 설정 디렉토리를 소유자는 모든 권한, 그룹은 읽기·접근만 가능하도록 제한
- **`chmod 600 /svc/web/nginx/conf/*.conf*`**: Nginx 설정 파일을 소유자만 읽고 수정할 수 있도록 제한
- **`chmod 750 /log/web/nginx/logs`**: Nginx 로그 디렉토리를 소유자는 모든 권한, 그룹은 읽기·접근만 가능하도록 제한
- **`chmod 600 /log/web/nginx/logs/*`**: Nginx 로그 파일을 소유자만 읽고 수정할 수 있도록 제한

---
## 그 외 설정

---
### 설정 확인 및 기동

```bash
cd /svc/web/nginx/sbin

# 문법 검증 (Syntax OK / test is successful 확인)
./nginx -t

# 컴파일 옵션 및 버전 확인
./nginx -V

# 기동
./nginx

# 재기동
./nginx -s reload

# 종료
./nginx -s stop

# 프로세스 및 포트 확인
ps -ef | grep nginx
netstat -natp | grep nginx
```

---
### 점검 항목

| 구분 | 점검 항목 | 확인 방법 |
| --- | --- | --- |
| 설정 | Syntax 오류가 없는가 | `nginx -t` |
| 프로세스 | worker가 서비스 계정으로 동작하는가 | `ps -ef \| grep nginx` |
| 포트 | 의도한 IP/포트에 바인딩되었는가 | `netstat -natp \| grep nginx` |
| 로그 | 로그가 LOG 파티션에 쌓이는가 | `df -h`<br/>`ls -al /log/web/nginx/logs/` |
| Logrotate | logrotate 설정 문법에 오류가 없는가 | `logrotate -d /etc/logrotate.d/nginx` |

---
