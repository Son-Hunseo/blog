---
title: Jenkins Webhook을 위해 Nginx 화이트리스트 처리하기
sidebar_position: 1
---
---
## 왜?



---
## 전

```nginx
server {
    listen 443 ssl;
    server_name 젠킨스도메인;

    # SSL 인증서 설정
    ssl_certificate 풀체인키경로;
    ssl_certificate_key 개인키경로;

    # SSL 설정 최적화
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'SSL 싸이퍼'
    ssl_prefer_server_ciphers off;

    # SSL 세션 캐시 설정
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # HSTS 설정
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass 내부젠킨스주소;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;
    }
}
```



---
## 후

```nginx
server {
    listen 443 ssl;
    server_name 젠킨스도메인;

    # SSL 인증서 설정
    ssl_certificate 풀체인키경로;
    ssl_certificate_key 개인키경로;

    # SSL 설정 최적화
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'SSL 싸이퍼'
    ssl_prefer_server_ciphers off;

    # SSL 세션 캐시 설정
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # HSTS 설정
    add_header Strict-Transport-Security "max-age=63072000" always;

    location /github-webhook/ {
        proxy_pass 내부젠킨스주소;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 핵심: 클라이언트는 HTTPS였음을 전달
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;

        # Github 웹훅 화이트리스트
        allow 192.30.252.0/22;
        allow 185.199.108.0/22;
        allow 140.82.112.0/20;
        deny all;
    }

    location / {
        deny all;
    }
}
```