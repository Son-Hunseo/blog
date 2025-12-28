---
title: Network Policies
description: 쿠버네티스(Kubernetes) Network Policy의 개념, Ingress/Egress 트래픽 규칙 설정 방법, 다양한 Selector 종류(pod, namespace, ipBlock), 그리고 AND/OR 조건 YAML 구조를 완벽하게 정리했습니다. Calico, Weave-net 등 지원 CNI와 Flannel 등 미지원 CNI 정보까지 포함하여 Pod 간 통신 보안을 설정하는 방법을 자세히 알아봅니다.
keywords:
  - Kubernets
  - 쿠버네티스
  - Network Policy
  - 네트워크 정책
---
---
:::info
- Ingress: 들어오는 트래픽
- Egress: 나가는 트래픽
- 참고: 아래에서 설정하는 규칙들은 모두 요청 트래픽이다.
	- Ingress 규칙: 들어오는 요청 트래픽에 대한 규칙
	- Egress 규칙: 나가는 요청 트래픽에 대한 규칙
	- 응답 트래픽은 규칙을 만들 필요가 없다. (요청이 있어야 응답이 있기 때문)
:::

## Network Policy
### 개념

- 쿠버네티스의 네트워크는 기본적으로 모든 `Pod` 서로 통신이 가능하다.
- 이런 상황을 가정해보자. 보안상의 이유로 DB `Pod`가 허가된 특정 `Pod`를 제외하고는 접근하지 못하도록 해야한다고 하자.
- 이 때 사용하는 것이 `Network Policy` 이다.
- 특정 `Pod`에 `Network Policy`를 설정하면 해당 `Pod`는 `Network Policy`에서 허용한 트래픽 외에는 모두 차단한다.

### Selector의 종류

| **종류**                | **설명**                              | **사용 예시**                             |
| --------------------- | ----------------------------------- | ------------------------------------- |
| **podSelector**       | 같은 네임스페이스 내에서 특정 `label`을 가진 파드를 선택 | `role: api-pod` 레이블을 가진 파드만 허용        |
| **namespaceSelector** | 특정 `label`을 가진 네임스페이스를 선택           | `name: prod` 레이블이 있는 네임스페이스의 모든 파드 허용 |
| **ipBlock**           | 클러스터 외부의 특정 IP 대역(CIDR)을 선택         | 외부 백업 서버(`192.168.1.0/24`)에서의 접근 허용   |

---
## YAML
### 예시

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-policy
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: api-pod
    ports:
    - protocol: TCP
      port: 3306
```

- 위 예시는 `role: db`라는 `label`을 가진 `Pod`에서는, `role: api-pod`라는 `label`을 가진 `Pod`의 3306포트의 TCP 요청만 받겠다라는 Network Policy 이다.

### Selector 조건 (AND, OR)

**OR 조건 (배열이 분리되어 있는 경우, 개별 항목)**

```yaml
ingress:
  - from:
    - podSelector:
        matchLabels:
          role: api-pod
    - namespaceSelector:
        matchLabels:
          name: prod
```

- 위 조건은 `Pod`의 `label`이 `role: api-pod` 이거나 `Namespace`의 `label`이 `name: prod`인 조건

**AND 조건 (`-`안에 같이 있는 경우, 단일 항목)**

```yaml
ingress:
  - from:
    - podSelector:
        matchLabels:
          role: api-pod
      namespaceSelector:
        matchLabels:
          name: prod
```

위 조건은 `Pod`의 `label`이 `role: api-pod` 이고 `Namespace`의 `label`이 `name: prod`인 조건

---
## 지원 CNI 플러그인

- Network Policy는 쿠버네티스 API 서버가 아니라 CNI가 실제 패킷 필터링을 수행한다.
- 이에 지원하는 CNI도 있고 지원하지 않는 CNI도 있다.
	- 지원하는 CNI - `Kube-router`, `Calico`, `Romana`, `Weave-net` 등
	- 지원하지 않는 CNI - `Flannel`
- 주의) `Flannel`을 사용하는 환경에서 Network Policy를 생성한다고 해서 에러 메시지가 나오지 않는다. 그냥 동작을 하지 않는 것이다.

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/services-networking/network-policies/](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/](https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)