---
title: CoreDNS
description: 쿠버네티스(Kubernetes) 서비스와 포드의 DNS 네이밍 규칙부터 CoreDNS의 동작 원리, /etc/resolv.conf 설정까지 한 번에 정리합니다. FQDN 구조와 Search Domain의 차이를 명확히 이해해 보세요.
keywords:
  - 쿠버네티스 DNS
  - CoreDNS
---
---
:::info
참고 글 -> [DNS](../../../15-Network/02-DNS.md)
:::

---
## 쿠버네티스 DNS 네이밍 규칙
### Service

- FQDN(Fully Qualified Domain Name) 구조
	- `서비스명.네임스페이스.svc.cluster.local`
	- 예: `web-service.apps.svc.cluster.local`
- 같은 네임스페이스 내 접근
	- `서비스명`만으로 접근 가능
	- 예: `web-service`
- 다른 네임스페이스 간 접근
	- `서비스명.네임스페이스`로 접근 가능

### Pod (잘 사용하지 않음)

- 기본적으로는 `Pod` DNS는 비활성화 되어있다. (잘 안씀)
	- 뒤에 나올 `CoreDNS` 설정 파일을 수정하며 활성화 시킬 수 있다.
- 네이밍 규칙: `Pod`의 IP 주소에서 `.`을 `-`로 변환하여 사용한다.
- FQDN 구조
	- `IP-변환-주소.네임스페이스.pod.cluster.local`
	- 예: `10-224-1-5.default.pod.cluster.local`
- `Service` 처럼 줄여서 사용할 수 없고, 항상 FQDN 전체를 작성해야한다.
	- 이 이유는 뒤에 나오지만, `Pod` 내부의 `/etc/resolv.conf` 에 Search Domain으로 `Service`는 등록되어있는데, `Pod`는 없기 때문이다.

---
## CoreDNS

:::info
v1.12 부터는 `CoreDNS`가 쿠버네티스의 표준 DNS 서버로 사용된다. (이전에는 `kube-dns` 사용)
:::

### 배포 및 구성

- 배포 위치: `kube-system` 네임스페이스에서 `replica`가 2개인 `ClusterIP` 타입 `Service`(이름: `kube-dns`)로 배포된다. (가용성을 위해)
- 설정 파일: `CoreDNS` 파드 내부의 `/etc/coredns/Corefile`에 위치하며, `ConfigMap`을 통해 관리된다. (`kubectl get configmap -n kube-system` 으로 확인 가능) 

### 원리

- `kubelet`
	- `kubelet`이 새로운 `Pod`가 생성될 때 `Pod`의 `/etc/resolv.conf` 파일의 `nameserver`로 `CoreDNS` 서비스의 IP를 기입한다. (참고: [네임서버 설정](../../../15-network/02-DNS.md#dns-서버-설정))
- `kube-apiserver`
	- `CoreDNS`의 `kubernetes`라는 이름의 플러그인이 주기적으로 `kube-apiserver`와 통신하며 새로운 `Service`/`Pod` 혹은 삭제된 `Service`/`Pod`를 Watch하고 있다가 이를 `CoreDNS`에 반영한다.

### Search Domain

- 앞서 `Service`의 경우 '같은 네임스페이스', '다른 네임스페이스 간'에 따라 도메인을 줄여서 사용할 수 있었다.
- 왜나하면 `kubelet`이 `Pod`의 `/etc/resolv.conf`를 설정할 때 `search` 옵션을 설정하기 때문이다.
	- `app` 네임스페이스에 있는 `Pod` 예시: 
	- `search app.svc.cluster.local svc.cluster.local cluster.local`
- 이 때, `Pod` 도메인에 대한 `search` 설정은 `kubelet`이 하지 않으므로 `Pod`의 경우 FQDN을 전부 입력해야하는 것이다.

## cf) CoreDNS 설정 파일 예시

```conf
.:53 {
    ...
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    ...
}
```

- `kubernetes`: `kubernetes` 플러그인을 사용하겠다. (`kube-apiserver`와의 통신을 통한 동기화를 위해)
- `cluster.local`: `cluster.local` 이 붙은 도메인 영역을 관리하겠다라는 뜻
- `pods insecure`: `pod` 도메인 기능을 활성화 하겠다라는 뜻 (`pods disabled`는 비활성화)

---
## 레퍼런스

- https://kubernetes.io/ko/docs/tasks/administer-cluster/coredns/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)