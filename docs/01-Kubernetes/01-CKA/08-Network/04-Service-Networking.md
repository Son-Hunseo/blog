---
title: Service 네트워크
description: Kubernetes Service의 네트워크 원리와 kube-proxy의 역할을 정리합니다. 실체 없는 가상 객체인 Service가 어떻게 iptables와 DNAT를 통해 Pod로 트래픽을 전달하는지 확인해 보세요.
keywords:
  - Kubernetes
  - kubernetes service
  - kube-proxy
  - 쿠버네티스 서비스 네트워크
---
---
:::info
`Service` 개념 참고 글 - [Service](../01-concept/12-Service.md)
:::

---
## Service 네트워크
### 개념

- `Pod` to `Pod` 통신을 하는 경우는 드물다.
- 다른 애플리케이션에 접근할 때도 보통 해당 애플리케이션의 `Service`라는 추상화된 객체에 접근한다.
	- 여러 `Replica`에 대한 단일 접근 통로 등의 이유로 ..
- 또한, 클러스터 외부에서 애플리케이션에 접근하려고 할 때, `Pod`의 IP는 클러스터 내부에서만 유효하므로 `Service`를 통해 접근한다.
	- `ClusterIP`: 클러스터 내부에서만 접근 가능하다. (`Service`의 기본 타입)
	- `NodePort`: 모든 노드의 특정 포트를 열어 애플리케이션에 대한 접근을 `Service`를 통해 가능하게 한다. (`ClusterIP` 기능 포함)

### Service는 실체하지 않는다

- `Pod`와 달리 `Service`는 특정 노드에 존재하지 않으며, 프로세스, 네임스페이스, 네트워크 인터페이스가 존재하지 않는다.
	- `Pod` 네트워크를 떠올려보면 이러한 모든 요소들이 존재했다. ([Pod 네트워크](./02-Pod-Networking.md))
- `Service`는 실체하는 요소가 아니라 클러스터 전체에 걸친 가상 객체이다.
- 그러면 이렇게 실체하지도 않는데 `Service`로 보낸 패킷을 알맞게 전달하는걸까?

### Kube-proxy

- 이렇게 실체하지 않는 `Service`라는 개념이 패킷을 알맞게 전달하는 이유는 `kube-proxy` 덕분이다.
- 모든 노드에는 `kubelet`과 함께 `kube-proxy`가 실행된다.
	- `kube-proxy`는 `kube-apiserver`를 통해 클러스터 내 `Service` 생성/삭제 변경 사항을 감시(Watch)한다.
	- 새로운 `Service`가 생성되면 `kube-proxy`는 해당 `Service`의 IP로 들어오는 트래픽을 해당하는 `Pod` IP로 전달하기 위한 포워딩 규칙을 각 노드에 생성한다.
	- 이에 대한 내용을 [Kube-proxy](../01-concept/08-kube-proxy.md#service와-kube-proxy의-역할) 에서 다루었었다.

### Proxy Mode

- `kube-proxy`가 포워딩 규칙을 각 노드에 생성한다고 했었는데 이러한 규칙을 생성하는데에 몇가지 모드가 있으며 이 모드를 Proxy Mode라고한다.
- 기본 모드는 `iptables`이다. (`Userspace`, `IPVS` 등의 여러 모드가 있음)
- IP 할당 및 대역(CIDR)
	- `Service` 생성 시 `kube-apiserver`의 설정 파일(Static Pod yaml)에 있는 `--service-cluster-ip-range` 옵션에 지정된 범위 내에서 가상 IP가 할당된다. (기본값 보통 `10.96.0.0/12`)
	- 주의: 이 범위가 `Pod` 대역과 겹치면 안된다. 
		- 나는... 내부망 대역 피한답시고 `10.0.0.0/8` 과 같이 무지막지하게 넓은 범위를 `Pod` 대역에 설정해둬서 수정이 필요한 상태이다. (언제 문제가 생길지 모름)
- `iptables` 규칙 (DNAT)
	- `kube-proxy`는 노드의 `iptables` NAT 테이블에 규칙을 추가한다.
	- `Service`IP:Port를 목적지로 패킷이 도착-> `iptables` 규칙 매칭 -> DNAT(Destination NAT) 수행 -> 목적지가 실제 `Pod`IP:Port로 변경됨
	- 실제로 `iptables -t nat -L` 명령어를 입력해보면 `Service`IP가 `Pod`IP로 변환되는 규칙을 볼 수 있다.

---
## 레퍼런스

- https://kubernetes.io/ko/docs/concepts/services-networking/service/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)