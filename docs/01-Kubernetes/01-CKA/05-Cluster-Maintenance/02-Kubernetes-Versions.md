---
title: Kubernetes Versions
description: Kubernetes의 **버전 구조(Major, Minor, Patch)**와 **기능 안정화 단계(Alpha, Beta, Stable)**를 자세히 설명합니다. 또한, kube-apiserver, kubelet 등 Kubernetes 구성 요소들의 버전 관리 정책과 etcd, CoreDNS와 같은 독립적인 버전 체계를 갖는 컴포넌트에 대한 정보를 제공하여, 쿠버네티스 버전 관리에 대한 심층적인 이해를 돕습니다.
keywords:
  - Kubernetes 버전 구조
  - Kubernetes 릴리즈 단계
  - Kubernetes Alpha Beta Stable
---
---
## Kubernetes 버전 구조

![version1](assets/version1.png)

- Major: 큰 변화가 있을 때
- Minor: 몇 달 주기로 출시, 새로운 기능 포함
- Patch: 더 자주 출시, 버그 수정 포함

---
## Alpha / Beta / Stable 릴리즈

- Kubernetes 기능은 다음 단계를 거쳐 안정화된다.

| 단계     | 특징                                       |
| ------ | ---------------------------------------- |
| Alpha  | 가장 먼저 기능 포함됨. 기본적으로 disabled. 불안정할 수 있음. |
| Beta   | 충분히 테스트된 기능. 기본 활성화. 여전히 변경 가능성 존재.      |
| Stable | 완전히 안정화된 기능. API 변경 거의 없음.               |

---
## 구성 요소 버전

- 모든 컴포넌트가 동일 버전을 사용하지는 않는다.
- 동일 버전 사용
	- `kube-apiserver`
	- `kube-controller-manager`
	- `kube-scheduler`
	- `kubelet`
	- `kube-proxy`
- 별도 버전 체계
	- `etcd`
	- `CoreDNS`
- 각 Kubernetes 릴리즈에는 지원되는 `etcd` / `CoreDNS` 버전이 릴리즈 노트에 명시된다.

---
## 레퍼런스

- [https://blog.risingstack.com/the-history-of-kubernetes/](https://blog.risingstack.com/the-history-of-kubernetes/)
- [https://kubernetes.io/docs/setup/release/version-skew-policy/](https://kubernetes.io/docs/setup/release/version-skew-policy/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
