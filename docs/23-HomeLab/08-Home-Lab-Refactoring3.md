---
title: "[홈랩 리팩토링 - 3] Gateway API 도입"
description: "[홈랩 리팩토링 - 3] Gateway API 도입"
---

---
:::tip
리팩토링 아키텍처는 [이전 글](./06-Home-Lab-Refactoring1.md) 참조
:::

---
## Gateway API를 도입하는 이유

![home-refac3](assets/home-refac3.png)

기존에는 위 그림처럼 Nginx를 리버스 프록시 서버로 두고 크게 3가지 목적으로 사용했다.
1. 블로그 정적 웹 호스팅
2. 쿠버네티스 클러스터 내부 애플리케이션으로 프록시 (to NodePort)
3. NAS 서버 프록시

이러한 구조에는 몇가지 문제점이 있다.
1. 호스팅하는 애플리케이션이 늘어날 때마다 관리해야할 지점이 2배로 늘어난다. (리버스 프록시 설정 + 쿠버네티스 설정)
	- 추가적으로 결국에는 '특정 노드의 노드포트'로 리버스 프록시 설정을 해야하는데 해당 노드가 문제가 생기면 해당 애플리케이션에 접근이 불가능하다.
2. Nginx 리버스 프록시 서버가 폴트가 나면 모든 애플리케이션에 접근이 불가능하다. (SPOF 문제)
3. 한마디로 "클라우드 네이티브"하지 않다.

이 때문에 기존의 Nginx 리버스 프록시 서버를 없애고 Kubernetes Gateway API를 Nginx Gateway Fabric 구현체로 구현하고 이를 MetalLB로 노출시키는 형식으로 위 문제들을 해결할 것이다.


---
## AS-IS (Nginx Reverse Proxy)

```nginx
server {
    listen 80;
    server_name sonhs.com;

    # HTTP를 HTTPS로 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name sonhs.com;

    # SSL 인증서 설정
    ssl_certificate /etc/letsencrypt/live/sonhs.com/fullchain.pem; # 인증키와 중간키를 합친 것으로 사용해야함함
    ssl_certificate_key /etc/letsencrypt/live/sonhs.com/privkey.pem;

    # SSL 설정 최적화
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # SSL 세션 캐시 설정
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # HSTS 설정
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass https://172.30.1.77:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- 원래는 위처럼 특정 경로로의 요청을 특정 노드의 NodePort로 포워드하게끔 Nginx에 설정되어 있었다.

---
## TO-BE (Gateway API)

:::info
Prerequisite
- Gateway API crd 설치
- Nginx Gateway Fabric Operator 설치
- MetalLB 설치

Nginx Gateway Fabic은 MetalLB에게 IP를 자동으로 할당받는다. (특정 노드가 문제가가 생겨도 일관성있게 접근할 수 있는 가상의 IP)

 참고
 - 홈랩 기본 인프라 설정 파일
	 - https://github.com/Son-Hunseo/my-k8s-base/tree/main
:::

### Gateway

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: web-gateway
  namespace: gateway
spec:
  gatewayClassName: nginx
  listeners:
    - name: http-www
      protocol: HTTP
      port: 80
      hostname: www.sonhs.com
      allowedRoutes:
        namespaces:
          from: All
...
```

- Gateway API의 구현체가 Nginx Gateway Fabric이므로 `gatewayClassName: nginx`로 설정한다.
- 리스너에 원하는(`HttpRoute`로 연결할) 경로를 설정해준다.
- cf) 추가적으로 나는 TLS 인증을 위해 `cert-manager` 오퍼레이터를 설치하고 `Certificate` 리소스로 인증서를 발급받은 뒤 리스너에 HTTPS 설정을 추가로 해주었다.

### HttpRoute

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-route
  namespace: myapp
spec:
  parentRefs:
    - name: web-gateway
      namespace: gateway
      sectionName: http
  hostnames:
    - www.sonhs.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: my-service
          port: 80
```

- Gateway에서 정의된 리스너에 연결되는 `HTTPRoute`를 생성해서 연결해준다.
- `backendRefs`에 연결하고자하는 `Service` 리소스를 연결해주면된다.

---
## 결과

- 홈랩의 모든 애플리케이션에 대한 접근을 일관성있게 관리할 수 있게 되었다.
- 기존에 존재하던 SPOF 문제를 해결하였다.
- 특정 노드에 문제가 발생하더라도 애플리케이션 접근에 문제가 생기지 않게 되었다.