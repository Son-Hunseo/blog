---
title: Gateway API
description: Kubernetes Ingress의 어노테이션 의존성과 멀티 테넌시 충돌 문제를 Gateway API로 해결하는 방법을 알아봅니다. GatewayClass, Gateway, HTTPRoute 리소스 분리와 표준화된 트래픽 제어(Rewrite, Redirect, Canary) 설정을 예제와 함께 정리했습니다.
keywords:
  - Kubernetes Gateway API
  - Gateway API
  - Ingress vs Gateway API
  - GatewayClass
  - Gateway
  - HTTPRoute
---
---
## Gateway API 배경
### Ingress의 문제점

- 이전 [`Ingress`글에서의 예시](./06-Ingress.md#ingress-설정-예시)를 생각해보자.
- `wear-service`와 `video-service`가 각각 다른 팀에서 관리한다고 했을 때(멀티 테넌시 환경) 충돌이 발생할 위험이 높다.
	- 각각 다른 `Ingress` 객체로 관리하거나, 다른 네임스페이스에서 사용하면 조금 더 낫긴 하지만, 단순한 '호스트 이름'과 '경로'라는 한정된 자원을 여럿이서 나눠 쓰는 구조이기 때문에 개선이 필요한 것이다. 
	- 이를 방지하기 위해 `GitOps`, CICD 파이프라인에서의 검증 등의 방법이 있지만 논리적으로 이러한 설정 충돌을 방지할 장치가 필요하다.
- `rewrite-target` 어노테이션을 생각해보자.
	- `nginx.ingress.kubernetes.io/rewrite-target: /`
	- 이 설정은 쿠버네티스 입장에서는 전혀 모르는 옵션이다.
	- 이는 `Nginx Ingress Controller` 전용 어노테이션이다.
	- 즉, 이러한 고급 라우팅(헤더 조작, 트래픽 분할 등)을 위해 벤더 별 Annotation에 의존해야 했기 때문에 복잡하고 이식성이 떨어진다.
	- 이러한 설정을 표준화할 필요가 있다.

### Gateway API의 특징

| **리소스**        | **관리 주체 예시**             | **역할**                                               |
| -------------- | ------------------------ | ---------------------------------------------------- |
| `GatewayClass` | 인프라 관리자 (Cloud/Platform) | 어떤 부하 분산 장치(LB) 기술을 쓸지 결정 (예: AWS ALB, Nginx, Istio) |
| `Gateway`      | 클러스터 운영자 (SRE/Ops)       | 실제 서비스 입구(IP, 포트, TLS 인증서)를 생성                       |
| `HTTPRoute`    | 서비스 개발자                  | 내 서비스로 가는 경로(Path)와 규칙 정의                            |

- 위와 같은 문제를 해결하기 위해 `Gateway API`는 리소스를 3가지로 분리했다.
- 아래 예시들을 보며 어떻게 해결했는지 보자.

---
## 예시: 멀티 테넌시 환경
### 경로 기반

:::info
[`Ingress`글에서의 경로 기반 예시](./06-Ingress.md#경로-기반)
:::

**`GatewayClass`**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx-gateway
spec:
  controllerName: "gateway.nginx.org/nginx-gateway-controller"
```

- 어떤 벤더를 사용할 것인가에 대한 결정 객체
- 사용 예시: `GatewayClass` 타입에 대한 권한을 인프라 관리자에게만 줌으로써 다른 직무의 팀원들이 해당 설정을 변경할 여지를 줄인다.

**`Gateway`**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: infra-ns
spec:
  gatewayClassName: nginx-gateway # 위에서 정의한 Class 참조
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: "myonlinestore.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: store-tls-secret
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            exposed: "true" # 'exposed=true' 라벨이 붙은 네임스페이스의 Route만 허용
```

- 서비스의 호스트이름, 포트, TLS 등을 설정하는 객체
- 사용 예시: 해당 `Gateway` 객체에 대한 권한을 해당 서비스를 관리하는 클러스터 운영자에게만 부여한다. 또한, `exposed: "true"` 레이블이 붙은 네임스페이스의 Route만 허용함으로써 허용되지 않은 다른 팀이 해당 호스트네임 하위 경로를 사용하는 것을 방지한다.

**`HTTPRoute`**

```yaml
// wear 팀
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: wear-route
  namespace: wear-ns # 이 네임스페이스에는 'exposed: true' 라벨이 있어야 함
spec:
  parentRefs:
  - name: shared-gateway
    namespace: infra-ns
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /wear
    backendRefs:
    - name: wear-service
      port: 80
```

```yaml
// video 팀
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: video-route
  namespace: video-ns
spec:
  parentRefs:
  - name: shared-gateway
    namespace: infra-ns
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /video
    backendRefs:
    - name: video-service
      port: 80
```

- 위처럼 `HTTPRoute` 객체가 팀마다 나뉘면서 충돌에 있어 비교적 안전해진다.
- 하지만 서로 같은 경로를 사용하는 문제는 아직 해결되지 않았다. (video팀에서 `/wear` 경로를 사용하는 것과 같은)
- `Ingress`의 경우 그냥 나중에 적용한 설정이 덮어씌워졌지만 `Gateway API`의 경우 규칙이 있다.
	1. 구체적인 경로 우선 - `/wear/blue`가 `/wear` 보다 우선된다.
	2. 생성 시간 - '먼저' 생성된 `HTTPRoute`가 우선된다.
	3. 알파벳 순서
	4. (중요) 배제된 설정은 `HTTPRoute`의 `Status` 필드에 `Accepted: False` 혹은 `Partially Invalid` 상태로 기록된다. (`Ingress`는 기록되지 않았다.)
- 그래도 논리적으로 이러한 충돌이 격리되지 않았다.
- 이에 이러한 팀이나 서비스 단위의 분리는 도메인 기반이 선호된다.

### 도메인 기반

**`GatewayClass`**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx-gateway
spec:
  controllerName: "gateway.nginx.org/nginx-gateway-controller"
```

**`Gateway`**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: infra-ns
spec:
  gatewayClassName: nginx-gateway
  listeners:
  # For A Team
  - name: wear-listener
    protocol: HTTP
    port: 80
    hostname: "wear.myonlinestore.com" # 도메인 고정
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            team: wear-team # wear-team 라벨이 붙은 NS만 연결 가능

  # For B Team
  - name: video-listener
    protocol: HTTP
    port: 80
    hostname: "video.myonlinestore.com" # 도메인 고정
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            team: video-team # video-team 라벨이 붙은 NS만 연결 가능
```

**`HTTPRoute`**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: wear-app-route
  namespace: wear-ns # 이 네임스페이스는 team: wear-team 라벨을 가짐
spec:
  parentRefs:
  - name: shared-gateway
    namespace: infra-ns
    sectionName: wear-listener # 특정 리스너에 명시적 연결
  hostnames:
  - "wear.myonlinestore.com"
  rules:
  - matches:
    - path: { type: PathPrefix, value: / } # 경로가 겹쳐도 도메인이 달라 안전함
    backendRefs:
    - name: wear-service
      port: 80
```

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: video-app-route
  namespace: video-ns # 이 네임스페이스는 team: video-team 라벨을 가짐
spec:
  parentRefs:
  - name: shared-gateway
    namespace: infra-ns
    sectionName: video-listener
  hostnames:
  - "video.myonlinestore.com"
  rules:
  - matches:
    - path: { type: PathPrefix, value: / } # 경로가 겹쳐도 도메인이 달라 안전함
    backendRefs:
    - name: video-service
      port: 80
```

- 이렇게 도메인 기반으로 나누면 책임의 분리가 완벽하게 된다.

### 그래서 경로와 도메인 기반을 어떤 상황에 사용?

:::tip
`Gateway API` 설계 철학상
- 서비스/조직/도메인 단위 -> 호스트네임 단위 분리 (`wear.myonlinestore.com`, `video.myonlinestore.com`)
	- 책임 분리가 필요한 영역
- 버전/기능 단위 -> 경로 기반 (`myonlinestore.com/v1`, `myonlinestore.com/cart`)
	- 책임 분리가 상대적으로 덜 필요한 영역
:::

---
## 예시: 설정 표준화
### HTTP to HTTPS 리다이렉트

`Nginx Ingress`

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
```

`Gateway API`

```yaml
rules:
- filters:
  - type: RequestRedirect
    requestRedirect:
      scheme: https
      statusCode: 301
```

- `Ingress`의 경우 구현체가 달라지면 어노테이션을 다르게 사용해야하지만, `Gateway API`의 경우 바꾸지 않아도 된다.

### Rewrite

`Nginx Ingress`

```yaml
metadata:
  annotations:
    # 매칭된 두 번째 그룹($2)을 새 경로 뒤에 붙임
    nginx.ingress.kubernetes.io/rewrite-target: /v2/accounts/$2
spec:
  rules:
  - http:
      paths:
      - path: /users(/|$)(.*) # 정규식으로 ID 이후의 경로를 캡처
        pathType: ImplementationSpecific
        backend:
          service:
            name: my-service
            port:
              number: 80
```

`Gateway API`

```yaml
rules:
- matches:
  - path:
      type: RegularExpression
      # /users/ 뒤의 ID와 나머지 경로를 캡처 그룹()으로 지정
      value: /users/([^/]+)(/.*)?
  filters:
  - type: URLRewrite
    urlRewrite:
      path:
        type: ReplaceRegex
        replaceRegex:
          # 캡처된 첫 번째 그룹(ID)을 포함하여 경로 재구성
          pattern: /users/([^/]+)(/.*)?
          substitution: /v2/accounts/${1}${2}
  backendRefs:
  - name: my-service
    port: 80
```

- `Ingress`의 경우 구현체가 달라지면 어노테이션을 다르게 사용해야하지만, `Gateway API`의 경우 바꾸지 않아도 된다.

### 헤더 조작

`Nginx Ingress`

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header X-Env "staging";
```

`Gateway API`

```yaml
rules:
- filters:
  - type: RequestHeaderModifier
    requestHeaderModifier:
      add:
      - name: X-Env
        value: staging
  backendRefs:
  - name: my-service
    port: 80
```

- `Ingress`의 경우 구현체가 달라지면 어노테이션을 다르게 사용해야하지만, `Gateway API`의 경우 바꾸지 않아도 된다.

### 트래픽 분할 (Canary)

`Nginx Ingress`

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "20"
```

`Gateway API`

```yaml
rules:
- backendRefs:
  - name: v1-service
    port: 80
    weight: 80
  - name: v2-service
    port: 80
    weight: 20
```

- `Ingress`의 경우 구현체가 달라지면 어노테이션을 다르게 사용해야하지만, `Gateway API`의 경우 바꾸지 않아도 된다.

---
## 레퍼런스

- https://kubernetes.io/docs/concepts/services-networking/gateway/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)