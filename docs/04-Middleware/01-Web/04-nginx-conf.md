---
title: Nginx 설치 방법 및 운영환경에서의 주요 설정
description: Nginx 소스 빌드 설치부터 nginx.conf, SSL/TLS, Reverse Proxy, Logrotate, 모듈 및 보안 설정까지 운영 환경 구성을 정리합니다.
date: 2026-09-29
sidebar_class_name: hidden-sidebar-item
image: /img/posts/04-Middleware/01-Web/04-nginx-conf/nginx.png
tags:
  - "유형/블로그"
  - "주제/html"
  - "주제/security"
  - "주제/nginx"
related:
  - "[[0. Main/2. Publish/2. Blog/04-Middleware/01-Web/02-httpd-conf]]"
  - "[[0. Main/2. Publish/2. Blog/04-Middleware/01-Web/03-tomcat-conf]]"
  - "[[0. Main/2. Publish/2. Blog/04-Middleware/01-Web/05-jboss-conf]]"
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

> [!info] 소스 빌드를 하는 이유 
> - [참고](./02-httpd-conf.md#소스-빌드를-하는-이유)

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
rpm -q gcc make pcre2-devel zlib-devel openssl-devel

# 레포지토리(Local or Remote)가 존재할 경우
dnf install -y gcc make pcre2-devel zlib-devel openssl-devel

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
./configure --prefix=/svc/web/nginx \
    --with-http_ssl_module \
    --with-http_v2_module \
    --with-http_realip_module \
    --with-http_gunzip_module \
    --with-http_stub_status_module \
    --with-threads
```

- 설정 값을 지정하여 `Makefile` 생성

```bash
make
make install
```

- 컴파일 옵션 확인

```bash
/svc/web/nginx/sbin/nginx -V
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

| Options                                | Description                                                                                                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--prefix`                             | 설치 경로를 지정<br/>Nginx 바이너리, 설정 파일, 로그 파일 등이 해당 경로 아래에 설치<br/>옵션을 지정하지 않을 경우 default 경로: `/usr/local/nginx`                                                                                                                                |
| `--user` / `--group`                   | Worker 프로세스의 기본 실행 계정 및 그룹 지정<br/>`nginx.conf`에 `user` 지시어가 없을 때 적용<br/>default: `nobody` (환경에 따라 다를 수 있음)                                                                                                                              |
| `--error-log-path` / `--http-log-path` | 기본 에러 로그 및 접근 로그 경로를 LOG HOME(`/log/web/nginx/logs`)으로 지정<br/>`nginx.conf` 로드 전 기동 단계의 에러 로그도 LOG HOME에 기록<br/>default: `${prefix}/logs/error.log`, `${prefix}/logs/access.log`                                                         |
| `--pid-path`                           | Master 프로세스 PID 파일 경로 지정<br/>logrotate, systemd 등에서 참조<br/>default: `${prefix}/logs/nginx.pid`                                                                                                                                          |
| `--with-http_ssl_module`               | SSL/TLS 지원 활성화<br/>HTTPS를 사용하기 위해 OpenSSL 라이브러리(`openssl-devel`) 필요<br/>SSL 인증서 설정을 가능하게 함                                                                                                                                              |
| `--with-http_v2_module`                | HTTP/2 프로토콜 지원 모듈 활성화 (표준: 컴파일만 수행, 미사용)<br/>컴파일만으로는 HTTP/2가 활성화되지 않으며, 향후 재컴파일 없이 설정만으로 사용 가능하도록 포함<br/>1.25.1 이상: `server` 블록에 `http2 on;` 설정 시 활성화 (default: `off`)<br/>1.25.1 미만: `listen 443 ssl http2;`처럼 `listen` 파라미터로 지정해야 활성화 |
| `--with-http_realip_module`            | L4/LB/프록시 뒤에서 `X-Forwarded-For` 등의 헤더를 이용해 실제 클라이언트 IP를 복원<br/>`set_real_ip_from`, `real_ip_header` 설정과 함께 사용<br/>Access Log, `allow/deny`, `$remote_addr`를 사용하는 설정이 실제 클라이언트 IP 기준으로 동작                                                |
| `--with-http_gunzip_module`            | gzip으로 압축된 응답(`Content-Encoding: gzip`)을 gzip 미지원 클라이언트를 위해 Nginx가 해제하여 전달<br/>`nginx.conf`에 `gunzip on;` 설정 시 동작 (2.5.3 참조)<br/>※ 응답 압축(`gzip on;`)은 기본 내장 모듈(`http_gzip_module`)로 별도 컴파일 옵션 불필요                                       |
| `--with-http_stub_status_module`       | 서버 상태 정보를 제공하는 모듈 활성화<br/>`/nginx_status` 엔드포인트를 통해 Nginx의 실시간 상태 확인 가능 (별도 location 설정 필요)<br/>모니터링 시스템과 연동할 때 유용 (외부 접근 차단 필수, 2.5.1 참조)                                                                                              |
| `--with-threads`                       | 스레드 풀 지원 (`aio threads`)<br/>대용량 정적 파일 제공 시 디스크 I/O로 인한 Worker 블로킹 완화 (2.4.8 선택 튜닝 참조)                                                                                                                                                  |
| `--with-stream` (선택)                   | TCP/UDP(L4) 프록시 기능이 필요한 경우에만 추가                                                                                                                                                                                                         |

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
worker_rlimit_nofile 65535;

events {
    worker_connections  4096;
    use epoll;
    multi_accept on;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for" '
                      '$upstream_addr $upstream_status $request_time '
                      '$upstream_connect_time $upstream_header_time $upstream_response_time';
    access_log  /log/web/nginx/logs/access.log  main;

    sendfile          on;
    tcp_nopush        on;
    server_tokens     off;
    autoindex         off;
    disable_symlinks  on;            # 배포 경로에 심볼릭 링크 사용 시 off 또는 if_not_owner

    keepalive_timeout   30;
    keepalive_requests  10000;
    reset_timedout_connection  on;
    client_header_timeout  60;
    client_body_timeout    60;
    send_timeout           60;
    client_max_body_size   10m;      # 업무 최대 업로드 크기에 맞게 조정
    large_client_header_buffers  4 16k;

    open_file_cache           max=200000 inactive=20s;
    open_file_cache_valid     30s;
    open_file_cache_min_uses  2;
    open_file_cache_errors    on;

    # L4/LB 뒤에 구성된 경우 실제 클라이언트 IP 복원
    # set_real_ip_from  10.10.10.0/24;     # LB(SNAT) IP 대역
    # real_ip_header    X-Forwarded-For;

    proxy_http_version     1.1;
    proxy_connect_timeout  5s;
    proxy_send_timeout     60s;
    proxy_read_timeout     60s;
    proxy_buffer_size      16k;
    proxy_buffers          8 16k;
    proxy_next_upstream    error timeout http_502 http_503;
    proxy_intercept_errors on;

    upstream tomcat {
        hash $remote_addr consistent;
        server 192.168.56.105:8080;
        server 192.168.56.105:8180;
        keepalive 32;
        keepalive_timeout  15s;      # Tomcat keepAliveTimeout(기본 20s)보다 짧게
    }

    server {
        listen       80;
        server_name  test.example.com;

        access_log   /log/web/nginx/logs/host.access.log  main;
        error_log    /log/web/nginx/logs/host.error.log  warn;
        
        # HTTPS 전용 운영 시 아래 location 대신 사용
        # return 301 https://$host$request_uri;

        location / {
            proxy_pass  http://tomcat;
            proxy_set_header  Connection         "";
            proxy_set_header  Host               $host;
            proxy_set_header  X-Real-IP          $remote_addr;
            proxy_set_header  X-Forwarded-For    $proxy_add_x_forwarded_for;
            proxy_set_header  X-Forwarded-Proto  $scheme;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
    
    server {
        listen       443 ssl;          # http2 미사용 (표준). 모듈은 컴파일되어 있음
        server_name  test.example.com;
        access_log   /log/web/nginx/logs/ssl-access.log  main;
        error_log    /log/web/nginx/logs/ssl-error.log  warn;

        ssl_certificate      ssl/server.crt;
        ssl_certificate_key  ssl/server.key;
        ssl_protocols        TLSv1.2 TLSv1.3;
        ssl_ciphers          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
        ssl_prefer_server_ciphers  off;
        ssl_session_cache    shared:SSL:10m;
        ssl_session_timeout  1d;
        ssl_session_tickets  off;

        # HSTS : HTTPS 전용 운영 확정 후 적용
        # add_header  Strict-Transport-Security  "max-age=31536000"  always;

        location / {
            proxy_pass  http://tomcat;
            proxy_set_header  Connection         "";
            proxy_set_header  Host               $host;
            proxy_set_header  X-Real-IP          $remote_addr;
            proxy_set_header  X-Forwarded-For    $proxy_add_x_forwarded_for;
            proxy_set_header  X-Forwarded-Proto  $scheme;
        }

        error_page  500 502 503 504  /50x.html;
        location = /50x.html {
            root  html;
        }
    }

    include extra/*.conf;
}
```

---
### 전체 프로세스 및 시스템 설정 옵션

| 전체 프로세스 및 시스템 설정 Options                               | Description                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user ${Service_user};`                                | Worker 프로세스 실행 계정<br/>Master 프로세스는 root로 기동하여 80/443(1024 미만) 포트를 바인딩하고, 실제 요청을 처리하는 Worker는 지정 계정으로 실행<br/>root 기동이 불가한 경우: `setcap 'cap_net_bind_service=+ep' /svc/web/nginx/sbin/nginx`로 비root 계정의 1024 미만 포트 바인딩 허용 (이 경우 `user` 지시어는 무시됨)<br/>default: `nobody` (컴파일 시 `--user` 지정 값)                                                                    |
| `worker_processes auto;`                               | Nginx가 사용할 Worker 프로세스 개수<br/>`auto`: 서버의 CPU 코어 개수만큼 자동 설정 (권장)<br/>WAS와 같은 서버에 설치된 경우 등은 성능 테스트 후 고정 값으로 조정<br/>default: `1`                                                                                                                                                                                                                                |
| `worker_rlimit_nofile 65535;`                          | Worker 프로세스가 열 수 있는 최대 파일 디스크립터(소켓 포함) 수<br/>`worker_connections × 2` 이상으로 설정 (프록시 시 클라이언트 연결과 백엔드 연결을 각각 1개씩 사용)<br/>OS `ulimit(nofile)`도 함께 상향 필요 (2.4.6 참조)<br/>default: OS 설정 값 (`ulimit -n`, 통상 1024)                                                                                                                                                    |
| `error_log /log/web/nginx/logs/error.log warn;`        | 전역 에러 로그 경로 및 레벨<br/>레벨: `debug`, `info`, `notice`, `warn`, `error`, `crit`, `alert`, `emerg`<br/>운영 환경은 `warn` 이상 권장 (`info`는 클라이언트 연결 종료 등까지 기록되어 로그량 과다)<br/>default: `logs/error.log error`                                                                                                                                                               |
| `pid logs/nginx.pid;`                                  | Master 프로세스 PID 파일 경로 (logrotate, systemd에서 참조)<br/>default: `logs/nginx.pid`                                                                                                                                                                                                                                                                                 |
| **Events 설정 Options**                                  | **Description**                                                                                                                                                                                                                                                                                                                                               |
| `worker_connections 4096;`                             | 각 Worker 프로세스가 동시에 처리할 수 있는 최대 연결 수<br/>클라이언트 연결뿐 아니라 백엔드(upstream) 연결도 포함됨<br/>리버스 프록시 환경 최대 동시 클라이언트 수 ≈ `worker_processes × worker_connections ÷ 2` (ex. 4코어 × 4096 ÷ 2 = 8,192)<br/>`worker_rlimit_nofile` 값을 초과할 수 없음<br/>default: `512`                                                                                                                 |
| `use epoll;`                                           | Linux 커널에서 제공하는 고성능 이벤트 처리 방식<br/>수많은 동시 연결을 효율적으로 관리 가능 (특히 대규모 트래픽 처리에 유리)<br/>Linux에서는 미지정 시에도 epoll이 자동 선택됨 (명시적 표기 목적)<br/>종류: `select`, `poll`, `kqueue`, `epoll`<br/>참조: https://nginx.org/en/docs/events.html                                                                                                                                         |
| `multi_accept on;`                                     | Worker 프로세스가 대기 중인 새 연결을 한 번에 모두 수락하도록 함<br/>비활성화된 경우 Worker 프로세스는 한 번에 하나의 새 연결을 수락함<br/>`kqueue` 사용 시 해당 설정 옵션은 무시됨<br/>부하가 높은 환경에서 성능 향상 가능<br/>default: `off`                                                                                                                                                                                             |
| **HTTP 설정 Options**                                    | **Description**                                                                                                                                                                                                                                                                                                                                               |
| `include mime.types;`                                  | MIME 타입을 설정하는 파일을 불러옴<br/>(ex. `.html` → `text/html`, `.jpg` → `image/jpeg`)                                                                                                                                                                                                                                                                                  |
| `default_type application/octet-stream;`               | MIME 타입을 알 수 없는 경우 기본값 설정 (파일 다운로드 시 사용)                                                                                                                                                                                                                                                                                                                      |
| `sendfile on;`                                         | OS의 `sendfile()` 시스템 콜 사용 여부에 대한 설정<br/>On일 경우, 커널 내부에서 파일을 소켓으로 직접 전송하여 파일 전송 속도가 빨라지고 메모리 복사가 감소<br/>Nginx가 직접 서비스하는 정적 파일에 적용 (프록시 응답에는 영향 없음)<br/>default: `off`                                                                                                                                                                                          |
| `tcp_nopush on;`                                       | `sendfile on;`과 함께 사용<br/>응답 헤더와 파일의 시작 부분을 하나의 패킷으로 전송하여 전송 패킷 수 감소 (Linux TCP_CORK)<br/>default: `off`                                                                                                                                                                                                                                                      |
| `server_tokens off;`                                   | 응답 헤더(Server 필드) 및 에러 페이지에서 버전 정보를 표시할지 여부를 결정<br/>on인 경우: `Server: nginx/1.26.3`<br/>off인 경우: `Server: nginx`<br/>default: `on`                                                                                                                                                                                                                              |
| `autoindex off;`                                       | on인 경우 URI가 `/`로 끝나는 경우 디렉토리에 대한 요청으로 Nginx는 해석하며, 디렉토리 목록을 출력<br/>`autoindex on`인 경우: `index.html` 없으면 파일 목록 출력, 있으면 `index.html` 출력<br/>`autoindex off`인 경우: `index.html` 없으면 403 에러 발생, 있으면 `index.html` 출력<br/>default: `off` (보안 점검 대응을 위해 명시적으로 설정)                                                                                                     |
| `disable_symlinks on;`                                 | 파일을 열 때 심볼릭 링크를 어떻게 처리할지 결정<br/>`off`: 심볼릭 링크를 허용하고 아무런 검사도 하지 않음<br/>`on`: 경로 이름의 구성 요소가 심볼릭 링크인 경우 파일에 대한 액세스 거부<br/>`if_not_owner`: 심볼릭 링크의 소유자가 원본 파일의 소유자와 다르면 접근 차단<br/>`from=part`: 특정 디렉토리 이후부터 심볼릭 링크 검사를 적용<br/>주의: html 디렉토리나 배포 경로를 심볼릭 링크로 구성한 환경에서는 403 발생 → `off` 또는 `if_not_owner` 적용<br/>경로 구성 요소마다 검사를 수행하므로 약간의 오버헤드 발생<br/>default: `off` |
| `keepalive_timeout 30;`                                | 클라이언트와 서버 간의 Keep-Alive 시간 설정<br/>클라이언트가 Nginx 서버에 요청을 보낸 후, 새로운 요청이 없으면 일정 시간 후 연결을 닫음<br/>0으로 설정 시 Keep-Alive 비활성화 (요청마다 새로운 연결을 생성)<br/>default: `75초`                                                                                                                                                                                                     |
| `keepalive_requests 10000;`                            | 하나의 Keep-Alive 연결에서 처리할 최대 요청 수 설정<br/>값을 초과하면 서버가 해당 연결을 닫고 클라이언트는 새로운 연결을 생성<br/>연결별로 할당된 메모리를 해제하기 위해 주기적으로 연결을 종료하는 것이 필요하므로 무제한 설정은 비권장<br/>default: `1000` (1.19.10 이상, 이전 버전은 100)                                                                                                                                                                     |
| `reset_timedout_connection on;`                        | 시간 초과된 연결 및 비표준 코드 444로 종료된 연결을 RST로 즉시 정리하여 소켓 메모리를 빠르게 회수 (444 대상은 1.15.2 이상)<br/>단, 시간 초과된 Keep-Alive 연결은 정상적으로 닫힘<br/>비표준 코드 `444`: Nginx에서만 사용하는 특수 코드로 클라이언트에 응답을 보내지 않고 연결을 즉시 종료, 주로 악성 요청, 스팸 트래픽, 불법 접근 차단 등의 보안 용도로 사용 (Access Log에는 상태 코드 444로 기록됨)<br/>default: `off`                                                                            |
| `client_header_timeout 60;`                            | 클라이언트 요청 헤더 읽기 시간 제한<br/>시간 내에 전체 헤더를 전송하지 않으면 408(Request Time-out) 오류와 함께 요청 종료<br/>default: `60s` (기본값 유지, 명시적 표기)                                                                                                                                                                                                                                         |
| `client_body_timeout 60;`                              | 클라이언트 요청 본문 읽기를 위한 시간 제한 정의<br/>타임아웃은 전체 요청 본문 전송이 아닌 두 개의 연속적인 읽기 작업 사이의 기간에만 설정됨<br/>클라이언트가 이 시간 내에 아무것도 전송하지 않으면 408(Request Time-out) 오류와 함께 요청 종료<br/>default: `60s` (기본값 유지, 명시적 표기)                                                                                                                                                                    |
| `send_timeout 60;`                                     | 클라이언트로 응답을 전송할 때 두 번의 연속적인 쓰기 작업 사이의 시간 제한<br/>클라이언트가 이 시간 내에 아무것도 수신하지 않으면 연결 종료<br/>default: `60s` (기본값 유지, 명시적 표기)                                                                                                                                                                                                                                         |
| `client_max_body_size 10m;`                            | 클라이언트 요청 본문의 최대 크기<br/>초과 시 413(Request Entity Too Large) 오류 반환 → 파일 업로드 업무가 있으면 업무 최대 크기에 맞게 조정<br/>0으로 설정 시 크기 검사 안 함 (비권장)<br/>default: `1m`                                                                                                                                                                                                               |
| `large_client_header_buffers 4 16k;`                   | 큰 요청 헤더(쿠키, 긴 URL)를 읽기 위한 버퍼의 개수와 크기<br/>쿠키가 많은 SSO 환경 등에서 400 Bad Request (Request Header Or Cookie Too Large) 발생 시 조정<br/>default: `4 8k`                                                                                                                                                                                                                   |
| `open_file_cache max=200000 inactive=20s;`             | 최대 200,000개의 파일 정보(디스크립터, 크기, 수정 시간 등)를 캐시에 저장<br/>캐시가 가득 차면 가장 오랫동안 사용되지 않은(LRU) 항목부터 제거<br/>20초 동안 사용되지 않으면 캐시에서 제거<br/>Nginx가 정적 파일을 직접 서비스하는 경우에 효과가 있으며, 프록시 전용 구성에서는 영향이 적음<br/>default: `off`                                                                                                                                                          |
| `open_file_cache_valid 30s;`                           | 30초마다 캐시된 항목의 유효성을 검사<br/>default: `60s`                                                                                                                                                                                                                                                                                                                      |
| `open_file_cache_min_uses 2;`                          | `inactive` 시간 동안 파일이 2번 이상 사용되어야 캐시에 유지<br/>default: `1`                                                                                                                                                                                                                                                                                                      |
| `open_file_cache_errors on;`                           | 파일 조회 오류(파일 없음 등)의 캐싱을 활성화<br/>파일 배포 직후 `open_file_cache_valid` 시간 동안 이전 404 결과가 캐시되어 응답될 수 있음<br/>default: `off`                                                                                                                                                                                                                                             |
| `set_real_ip_from` / `real_ip_header`                  | (L4/LB 구성 시) 신뢰할 프록시 IP 대역과 실제 클라이언트 IP가 담긴 헤더 지정<br/>`$remote_addr`가 LB IP 대신 실제 클라이언트 IP로 치환되어 로그, 접근 제어, `hash $remote_addr` 분산이 정상 동작<br/>`--with-http_realip_module` 컴파일 필요                                                                                                                                                                              |
| **Proxy 설정 Options**                                   | **Description**                                                                                                                                                                                                                                                                                                                                               |
| `proxy_http_version 1.1;`                              | 백엔드와 HTTP/1.1로 통신<br/>Upstream Keep-Alive 사용 시 필수 (HTTP/1.0은 요청마다 연결을 생성/종료)<br/>default: `1.0` (1.29.7 이상은 1.1이 기본값이나 버전 호환을 위해 명시)                                                                                                                                                                                                                          |
| `proxy_connect_timeout 5s;`                            | 백엔드 서버와 연결을 맺기 위한 시간 제한<br/>백엔드 장애 시 빠르게 다음 서버로 전환하기 위해 짧게 설정 (최대 75s)<br/>default: `60s`                                                                                                                                                                                                                                                                     |
| `proxy_send_timeout 60s;`                              | 백엔드로 요청을 전송할 때 두 번의 연속적인 쓰기 작업 사이의 시간 제한<br/>default: `60s`                                                                                                                                                                                                                                                                                                   |
| `proxy_read_timeout 60s;`                              | 백엔드 응답 대기 시간 제한 (두 번의 연속적인 읽기 작업 사이)<br/>초과 시 504 Gateway Time-out 반환<br/>배치, 리포트 등 장시간 처리 URL은 별도 `location`에서 개별 상향<br/>default: `60s`                                                                                                                                                                                                                      |
| `proxy_buffer_size 16k;`                               | 백엔드 응답의 첫 부분(응답 헤더)을 읽는 버퍼 크기<br/>큰 `Set-Cookie` 등으로 "upstream sent too big header" 502 오류 발생 시 상향<br/>default: `4k` 또는 `8k` (메모리 페이지 크기)                                                                                                                                                                                                                     |
| `proxy_buffers 8 16k;`                                 | 백엔드 응답 본문을 읽는 버퍼의 개수와 크기 (연결당)<br/>버퍼를 초과하는 응답은 임시 파일(`proxy_temp`)에 기록<br/>default: `8 4k` 또는 `8 8k`                                                                                                                                                                                                                                                         |
| `proxy_next_upstream error timeout http_502 http_503;` | 지정한 조건 발생 시 다음 Upstream 서버로 요청을 재시도<br/>POST 등 비멱등(non-idempotent) 요청은 중복 처리 방지를 위해 기본적으로 재시도하지 않음<br/>default: `error timeout`                                                                                                                                                                                                                               |
| `proxy_intercept_errors on;`                           | 백엔드의 오류 응답(4xx/5xx)을 Nginx의 `error_page`로 대체<br/>off인 경우 `error_page`는 Nginx 자체에서 발생한 오류(502, 504 등)에만 적용<br/>WAS 자체 에러 페이지를 그대로 노출해야 하는 경우 off<br/>default: `off`                                                                                                                                                                                            |
| **Upstream 설정 Options**                                | **Description**                                                                                                                                                                                                                                                                                                                                               |
| `hash $remote_addr consistent;`                        | 클라이언트 IP 기반으로 백엔드 서버를 라우팅 (같은 IP는 같은 서버로 전달되는 IP 기반 세션 고정)<br/>`consistent`: 서버 추가/제거 시 다른 서버로 재배치되는 클라이언트를 최소화 (Ketama 해시)<br/>주의: L4/NAT/프록시 뒤에서는 클라이언트 IP가 소수로 보여 특정 서버로 쏠림 → Real IP 모듈로 실제 IP 복원 필요<br/>서버 장애 시 해당 서버의 클라이언트는 다른 서버로 이동하므로 세션이 유실될 수 있음 → 무중단 세션이 필요하면 WAS 세션 클러스터링 병행                                                                   |
| `server $IP:PORT max_fails=3 fail_timeout=10s;`        | 백엔드 서버의 IP 및 Port 설정<br/>`fail_timeout` 시간 내 실패 횟수가 `max_fails`에 도달하면 `fail_timeout` 동안 해당 서버를 분산 대상에서 제외<br/>`down`: 일시 제외, `backup`: 대기 서버 지정 (hash 분산 방식에서는 backup 사용 불가)<br/>default: `max_fails=1 fail_timeout=10s`                                                                                                                                      |
| `keepalive 32;`                                        | Worker 프로세스별로 유지하는 백엔드 유휴(Idle) 연결의 최대 개수 (최대 연결 수 제한이 아님)<br/>실제 유지 연결 수 = Worker 수 × 설정 값 → WAS의 `maxConnections`/`maxThreads` 범위 내에서 설정<br/>`proxy_http_version 1.1`, `proxy_set_header Connection ""` 설정이 함께 있어야 동작<br/>default: 미사용                                                                                                                      |
| `keepalive_timeout 15s;`                               | 백엔드 유휴 연결 유지 시간 (Upstream 블록 내, 1.15.3 이상)<br/>WAS의 `keepAliveTimeout` (Tomcat 기본: `connectionTimeout` 값, server.xml 기본 20s)보다 짧게 설정<br/>WAS가 먼저 연결을 끊은 상태에서 Nginx가 재사용하면 간헐적 502 발생 가능<br/>default: `60s`                                                                                                                                                    |
| **SSL 설정 Options**                                     | **Description**                                                                                                                                                                                                                                                                                                                                               |
| `listen 443 ssl;`                                      | HTTPS 수신<br/>표준: HTTP/2 미사용 (`http_v2_module`은 컴파일만 수행)<br/>향후 HTTP/2 적용 시: 1.25.1 이상은 `server` 블록에 `http2 on;` / 1.25.1 미만은 `listen 443 ssl http2;`                                                                                                                                                                                                          |
| `ssl_protocols TLSv1.2 TLSv1.3;`                       | 허용 TLS 프로토콜 버전<br/>TLSv1.0, TLSv1.1은 취약 프로토콜로 제외 (버전별 기본값이 다르므로 명시적으로 지정)                                                                                                                                                                                                                                                                                     |
| `ssl_ciphers ECDHE-...-GCM / CHACHA20;`                | ECDHE 키 교환 + AEAD(GCM, CHACHA20-POLY1305) Cipher만 허용 (Mozilla Intermediate 기준)<br/>CBC 계열 Cipher 제외 → 취약점 진단(Lucky13, BEAST 등) 대응<br/>TLSv1.3 Cipher는 OpenSSL 기본값을 사용 (`ssl_ciphers` 영향 없음)                                                                                                                                                                   |
| `ssl_prefer_server_ciphers off;`                       | 허용한 Cipher가 모두 안전하므로 클라이언트의 선호 순서를 사용 (모바일 기기의 CHACHA20 선택 등)<br/>고객사 진단 기준에서 on을 요구하는 경우 on 적용 가능<br/>default: `off`                                                                                                                                                                                                                                         |
| `ssl_session_cache shared:SSL:10m;`                    | 모든 Worker가 공유하는 SSL 세션 캐시<br/>1MB당 약 4,000개 세션 저장, 세션 재사용으로 TLS 핸드셰이크 비용(CPU) 감소<br/>default: `none`                                                                                                                                                                                                                                                          |
| `ssl_session_timeout 1d;`                              | SSL 세션 재사용 가능 시간<br/>default: `5m`                                                                                                                                                                                                                                                                                                                            |
| `ssl_session_tickets off;`                             | 세션 티켓 사용 여부<br/>티켓 암호화 키가 재기동 전까지 교체되지 않아 전방향 안전성(PFS)이 약화되므로 off (세션 재사용은 `ssl_session_cache`로 처리)<br/>default: `on`                                                                                                                                                                                                                                         |
| `return 301 https://$host$request_uri;`                | (선택) 80 포트 요청을 443으로 리다이렉트<br/>HTTPS 전용 운영 시 80 `server` 블록의 `location` 대신 사용                                                                                                                                                                                                                                                                                 |
| `add_header Strict-Transport-Security`                 | (선택) HSTS: 브라우저가 해당 도메인을 `max-age` 기간 동안 HTTPS로만 접속<br/>적용 후에는 `max-age` 동안 HTTP 접속으로 되돌릴 수 없으므로 HTTPS 전용 운영 확정 후 적용<br/>default: 미사용                                                                                                                                                                                                                         |

---
### Log Format 옵션

| Log Format Options        | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `$remote_addr`            | 클라이언트 IP (Real IP 모듈 설정 시 실제 클라이언트 IP)                    |
| `$remote_user`            | Basic 인증 사용자 이름 (미사용 시 `-`)                               |
| `$time_local`             | 요청 시간                                                     |
| `$request`                | 요청된 HTTP 요청 (ex. `GET /index.html HTTP/1.1`)              |
| `$status`                 | HTTP 응답 코드 (200, 404, 500 등)                              |
| `$body_bytes_sent`        | 응답 본문 바이트 크기 (헤더 제외)                                      |
| `$http_referer`           | 요청의 Referer 헤더 값                                          |
| `$http_user_agent`        | 사용자 브라우저 정보                                               |
| `$http_x_forwarded_for`   | 프록시를 거쳐 온 원래 클라이언트 IP                                     |
| `$upstream_addr`          | 요청을 처리한 백엔드 서버(ex. Tomcat)의 IP:PORT (재시도 시 콤마로 복수 표시)     |
| `$upstream_status`        | 백엔드 서버의 응답 코드 (Nginx 응답 코드와 구분하여 장애 지점 확인)                |
| `$request_time`           | 전체 요청 처리 시간 (클라이언트 첫 바이트 수신 ~ 응답 마지막 바이트 전송, 초 단위/ms 정밀도) |
| `$upstream_connect_time`  | 백엔드 서버와 연결을 맺는 데 걸린 시간 (Keep-Alive 재사용 시 0)               |
| `$upstream_header_time`   | 백엔드 서버로부터 응답 헤더를 받기까지 걸린 시간 (WAS 처리 시간에 해당)               |
| `$upstream_response_time` | 백엔드 서버(Tomcat)의 전체 응답 시간                                  |

---
### Proxy 관련 옵션

| Server/Location Options                                        | Description                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proxy_pass`                                                   | `location` 뒤에 설정한 경로로 들어온 요청을 백엔드 서버(`upstream`에 설정한 곳)로 전달                                                                                                                                                                                                                                                                                                                                       |
| `proxy_set_header Connection "";`                              | 백엔드로 전달하는 `Connection` 헤더를 제거하여 연결이 close 되지 않도록 함<br/>Upstream Keep-Alive 사용 시 `proxy_http_version 1.1`과 함께 필수                                                                                                                                                                                                                                                                                   |
| `proxy_set_header Host $host;`                                 | 클라이언트가 요청한 원래 Host 값을 백엔드 서버로 전달<br/>ex. 클라이언트가 `http://growin.test.com`으로 요청을 보내면 백엔드 서버는 `Host: growin.test.com` 값을 그대로 받음<br/>`$host`: 요청 라인 → Host 헤더 → `server_name` 순으로 결정되어 항상 값이 존재 (포트 제외)<br/>`$http_host`: Host 헤더 원문(포트 포함)으로, Host 헤더가 없는 HTTP/1.0 요청에서는 빈 값이 됨<br/>비표준 포트로 서비스하여 WAS가 포트 정보까지 필요한 경우 `$host:$server_port` 사용<br/>이 설정이 없으면 백엔드 서버는 upstream 이름(`tomcat`)을 Host로 인식함 |
| `proxy_set_header X-Real-IP $remote_addr;`                     | 클라이언트의 실제 IP 주소를 `X-Real-IP` 헤더에 추가<br/>백엔드 서버는 이 헤더를 통해 클라이언트의 원래 IP를 확인 가능<br/>프록시 서버가 요청을 백엔드 서버에 전달하면 원래 클라이언트 IP가 아니라 프록시 서버의 IP가 기록되는데, 이를 방지하기 위한 설정                                                                                                                                                                                                                                       |
| `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` | `X-Forwarded-For` 헤더는 클라이언트가 거쳐온 IP 주소 목록을 저장<br/>`$proxy_add_x_forwarded_for` 변수는 기존 `X-Forwarded-For` 값 뒤에 현재 요청의 클라이언트 IP(`$remote_addr`)를 추가<br/>ex. 클라이언트 A → L4/프록시 P → Nginx → Tomcat 순으로 요청이 전달되면 Tomcat에서 `X-Forwarded-For`를 확인했을 때 `A, P` 형태로 표시됨 (앞단 프록시가 해당 헤더를 설정한 경우)                                                                                                               |
| `proxy_set_header X-Forwarded-Proto $scheme;`                  | 클라이언트가 접속한 프로토콜(http/https)을 백엔드로 전달<br/>HTTPS 종단을 Nginx에서 처리할 때 WAS가 Redirect URL을 http로 생성하는 문제 방지<br/>Tomcat: `RemoteIpValve(protocolHeader="X-Forwarded-Proto")` 설정과 함께 사용                                                                                                                                                                                                                    |
| `proxy_set_header` 상속 주의                                       | `location`에 `proxy_set_header`를 하나라도 정의하면 상위(`http`/`server`)에 정의한 `proxy_set_header`는 모두 상속되지 않음<br/>따라서 `proxy_set_header`는 `location`마다 전체 헤더 세트를 정의 (`proxy_http_version`, timeout, buffer 등 다른 지시어는 개별 상속됨)                                                                                                                                                                                  |
| `error_page 500 502 503 504 /50x.html;`                        | 오류 발생 시 표시할 페이지 지정<br/>`proxy_intercept_errors on;`일 때 백엔드의 오류 응답에도 적용                                                                                                                                                                                                                                                                                                                            |

---
## Logrotate

---
### 설정

```bash
vi /etc/logrotate.d/nginx
```

```conf
/log/web/nginx/logs/*.log {
    daily
    rotate 365
    missingok
    notifempty
    dateext
    compress
    delaycompress
    create 0640 ${Service_user} ${Service_user}
    sharedscripts
    postrotate
        [ -f /svc/web/nginx/logs/nginx.pid ] && kill -USR1 $(cat /svc/web/nginx/logs/nginx.pid)
    endscript
}

```

- `copytruncate` 대신 USR1 시그널(`postrotate`)로 로그 파일을 다시 열어 로그 유실 방지
	- 결과 파일명: `access.log-20250101` → 다음 rotate 시 `access.log-20250101.gz` (delaycompress)
- cf) 로그 디렉토리가 group/other 쓰기 권한(775, 777 등)인 경우 "insecure permissions" 오류로 rotate가 수행되지 않음 → 디렉토리 권한을 755로 설정(불가 시 su 지시어 추가)


**logrotate 설정 검증**

```bash
# 실제 rotate 없이 동작 확인
logrotate -d /etc/logrotate.d/nginx
```


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
|                            |                                                                                                  |

---
## OS 튜닝 (ulimit / 커널 파라미터)

1. 서비스 계정 open files 상향

```bash
vi /etc//security/limits.d/nginx.conf
```

```conf
${Service_user}  soft  nofile  65535
${Service_user}  hard  nofile  65535
```


2. 커널 파라미터

```bash
vi /etc/sysctl.d/90-nginx.conf
```

```conf
net.core.somaxconn = 4096                    # listen backlog 상한 (커널 5.4 미만 기본 128)
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.ip_local_port_range = 10240 65000   # 백엔드 연결용 로컬 포트 범위 확대
net.ipv4.tcp_tw_reuse = 1                    # TIME_WAIT 소켓을 신규 outbound(백엔드) 연결에 재사용
```


3. 적용

```bash
sysctl --system
```


4. 적용 확인 (worker 프로세스 기준)

```bash
for p in $(pgrep -f "nginx: worker"); do grep "open files" /proc/$p/limits; done

sysctl net.core.somaxconn
```

---
## 서비스 등록(systemd) 및 설정 반영

```bash
vi /etc/systemd/system/nginx.service
```

```ini
[Unit]
Description=nginx web server
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=/svc/web/nginx/logs/nginx.pid
ExecStartPre=/svc/web/nginx/sbin/nginx -t
ExecStart=/svc/web/nginx/sbin/nginx
ExecReload=/svc/web/nginx/sbin/nginx -s reload
ExecStop=/svc/web/nginx/sbin/nginx -s quit
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

등록 및 기동

```bash
systemctl daemon-reload
systemctl enable --now nginx
```

설정 변경 시 (무중단 반영)

```bash
/svc/web/nginx/sbin/nginx -t          # 문법 검사 (반드시 선행)
systemctl reload nginx                # 또는 /svc/web/nginx/sbin/nginx -s reload
```

---
## Module 별 설정

---
### http_stub_status_module

> http_stub_status_module 은 Nginx 자체 상태/통계 정보를 HTTP로 노출하는 모듈 (apache의 `mod_status`와 비슷하다고 보면 됨)

```nginx
server {
    location /nginx_status {
        stub_status;
        allow 127.0.0.1;
        allow 192.12.30.0/24;
        deny  all;
        access_log off;
    }
}
```

- 그렇게 눈여겨 볼 부분은 없고, 이 상태 페이지의 경우에는 관리자 이외에 접근하면 안되므로 위처럼 반드시 접근 IP를 제한해야한다.


테스트

```bash
curl -v 127.0.0.1/nginx_status
```

---
### http_gzip_module

| 구분      | `gzip`            | `http_gunzip_module`        |
| ------- | ----------------- | --------------------------- |
| 역할      | 응답을 **gzip으로 압축** | gzip 응답을 **압축 해제**          |
| 방향      | 원본 → gzip         | gzip → 원본                   |
| 주 사용 목적 | 네트워크 트래픽/전송량 감소   | gzip을 지원하지 않는 클라이언트 대응      |
| 관련 지시어  | `gzip on;`        | `gunzip on;`                |
| 빌드 옵션   | 기본 포함             | `--with-http_gunzip_module` |

```nginx
http {
    gzip  on;
    gzip_comp_level  5;          # 1~9, 높을수록 압축률↑ CPU 사용↑ (default: 1)
    gzip_min_length  1024;       # 1KB 미만 응답은 압축 제외 (default: 20)
    gzip_proxied  any;           # L7/CDN 등 프록시 경유(Via 헤더) 요청도 압축 (default: off)
    gzip_vary  on;               # Vary: Accept-Encoding 헤더 추가 (중간 캐시 오동작 방지)
    gzip_types  text/plain text/css text/xml application/json application/javascript application/xml;
                                 # text/html은 항상 압축 대상 (별도 지정 불필요)
    server {
        ...(중략)...
    }
}
```


테스트

```bash
curl -H "Accept-Encoding: gzip" -I http://localhost
```

결과

```
# gzip 활성화된 경우

HTTP/1.1 200
Server: nginx
Date: Tue, 01 Apr 2025 06:29:44 GMT
Content-Type: text/html;charset=ISO-8859-1
Connection: keep-alive
Set-Cookie: JSESSIONID=35E964139123E625D366412D5671E48F.growin11; Path=/; HttpOnly
Vary: Accept-Encoding
Content-Encoding: gzip

# 비활성화된 경우
HTTP/1.1 200 OK
Server: nginx
Date: Tue, 01 Apr 2025 07:41:19 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Mon, 31 Mar 2025 00:34:47 GMT
Connection: keep-alive
ETag: "67e9e327-267"
Accept-Ranges: bytes
```

---
### http_gunzip_module

```nginx
location / {
    proxy_pass  http://tomcat;
    proxy_set_header  Connection         "";
    proxy_set_header  Host               $host;
    proxy_set_header  X-Real-IP          $remote_addr;
    proxy_set_header  X-Forwarded-For    $proxy_add_x_forwarded_for;
    proxy_set_header  X-Forwarded-Proto  $scheme;
    proxy_set_header  Accept-Encoding    gzip;    # 백엔드에 항상 압축 응답 요청
    gunzip  on;                                    # gzip 미지원 클라이언트에는 해제 후 전달
}
```


테스트

```bash
curl -I http://localhost # 응답에 Content-Encoding: gzip 헤더가 없어야 정상

curl -H "Accept-Encoding: gzip" -I http://localhost # Content-Encoding: gzip 응답 (백엔드 압축본 그대로 전달)
```

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
