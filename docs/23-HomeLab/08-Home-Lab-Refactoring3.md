---
title: "[홈랩 리팩토링] Gateway API 도입"
description: "[홈랩 리팩토링] Gateway API 도입"
---

---
:::tip
리팩토링 아키텍처는 [이전 글](./06-Home-Lab-Refactoring1.md) 참조
:::

---
## Gateway API를 도입하는 이유

![home-refac3](assets/home-refac3.png)




---
## AS-IS (Nginx Reverse Proxy)

```nginx
server {
    listen 80;
    server_name blog.sonhs.com;

    # HTTP를 HTTPS로 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name blog.sonhs.com;

    root /var/www/son-blog;  # React build 폴더 경로
    index index.html;

    # SSL 인증서 설정
    ssl_certificate /etc/letsencrypt/live/sonhs.com-0001/fullchain.pem; 
    ssl_certificate_key /etc/letsencrypt/live/sonhs.com-0001/privkey.pem;

    # SSL 설정 최적화
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-CHACHA20-POLY1305...'
    ssl_prefer_server_ciphers off;

    # SSL 세션 캐시 설정
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # HSTS 설정
    add_header Strict-Transport-Security "max-age=63072000" always;

    # React 정적 파일 서빙
    location / {
        try_files $uri /index.html;
    }

    # Gzip 압축
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 256;

}
```











---
## TO-BE (Gateway API)








