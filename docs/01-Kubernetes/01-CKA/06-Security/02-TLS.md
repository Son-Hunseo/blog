---
title: TLS in Kubernetes
description: 쿠버네티스(Kubernetes) 클러스터 내부의 TLS(Transport Layer Security) 통신 구조와 Zero Trust 보안 모델을 상세히 설명합니다. kube-apiserver, etcd, kubelet 등 각 컴포넌트가 사용하는 서버 인증서 및 클라이언트 인증서의 역할과, 클러스터 내부 CA(인증 기관)의 생성 및 관리 방식에 대해 다룹니다. CKA 시험 및 보안 관련 지식을 위한 핵심 가이드입니다.
keywords:
  - Kubernetes
  - Kubernetes TLS
  - Kubernetes Certificate
---
---
## Kubernetes에서의 TLS 통신
### 개념

![TLS1](assets/TLS1.png)

- 쿠버네티스는 '`Node` to `Node`', 'User to `kube-apiserver'', '`kube-apiserver` to kube-sceduler`' 등 모든 컴포넌트 간 통신을 TLS로 한다.
- 여기서 의문이 들 수 있다. '클러스터 내부인데 굳이 내부안에서 TLS 같은 보안 통신을 할 필요가 있나?'
- 이러한 보안 통신을 하는 이유는 쿠버네티스는 이미 해커가 클러스터 내부에 들어와있다는 전제로 모든 것을 신뢰하지 않는 'Zero Trust' 보안 모델을 채택하기 때문이다.

### 흐름도

![TLS2](assets/TLS2.png)

---
## Kubernetes 클러스터 내부의 인증서 종류

**1. 서버 인증서**
- 서버가 자신이 해당 서버가 맞음을 증명하는 데 사용한다.
- 예: `kube-apiserver`, `etcd`, `kubelet`

**2. 클라이언트 인증서**
- 클라이언트가 서버에 접근할 때 본인의 자격을 증명하는데 사용한다.
- 예: User, `kube-scheduler`, `kube-controller-manager`, `kube-proxy`

:::info
- 일반적인 웹 환경을 생각해보면 클라이언트의 자격 증명을 하는 '클라이언트 인증서' 조금 낯설 수 있다.
- 왜냐하면, 일반적인 웹 페이지는 보통 클라이언트의 자격 증명을 Id/pw 로 하기 때문이다.
- 우리에게 익숙한 인증서 기반 클라이언트 자격 증명이 존재하는데, 은행이나 공공기관에서 사용되는 '공인인증서'를 떠올려보면 된다. (공인인증서는 과거의 TLS와 같은 RSA를 사용하였다)
- 쿠버네티스는 이러한 클라이언트 자격증명을 '클라이언트 인증서'로 하는 것이다.
:::

**3. 루트 인증서(Root Certificate, CA Certificate)**
- CA가 본인이 신뢰할만한 CA임을 증명하는 인증서
- CA는 모든 서버/클라이언트의 인증서를 서명한다.

:::info
여기서 의문이 들 수 있다. 엥? CA가 클러스터 내부에 있다고?

- 일반적인 웹 환경에서는 몇몇 공인된 회사들이 CA역할을 하며 인증서를 발급한다.
- 하지만, 쿠버네티스 클러스터 내부에서는 클러스터가 설치될 때(by `kubeadm`) `/etc/kubernetes/pki/` 폴더 내부에 `ca.crt`와 `ca.key`를 생성하여 CA를 만든다.
- 해당 CA가 모든 서버/클라이언트 인증서에 서명하는 것이다.
:::

:::info
그러면 해커가 마스터 노드에 침입해서 `ca.key`를 탈취하면요? (이러면 서명을 위조하여 가짜 인증서를 만들 수 있게 됨)

- 일반적으로는 `/etc/kubernetes/pki/ca.key`는 `600`(소유자만 읽기/쓰기 가능)으로 설정되어있고 소유자는 `root`이다.
- 즉, 해커가 `root` 권한을 얻지 못한다면 `ca.key`를 얻을 수 없다.
- 근데, 마스터 노드에 침입할 정도라면 `root` 권한도  얻을 수 있지 않을까?
- 이 때문에 금융권과 같은 매우 높은 보안이 필요한 쿠버네티스 환경에서는 `ca.key`를 HSM과 같은 전용 하드웨어 보안 장치에 둔다. (HSM 외에도 여러 보안 use case가 존재)
:::

---
## Kubernetes 구성 요소별 인증서

![TLS3](assets/TLS3.png)

**Server Certificates**
- `kube-apiserver`, `etcd`, `kubelet` 등이 '요청을 받는' 역할을 수행하므로 '서버 인증서'가 필요하다.

**Client Certificates**
- User(`admin`), `kube-scheduler`, `kube-controller-manager`, `kube-proxy` 는 `kube-apiserver`로 '요청을 하는' 역할이므로 '클라이언트 인증서'가 필요하다.
- 추가적으로 `kube-apiserver`는 `etcd`와 통신하는 유일한 컴포넌트이며, 이 때, `kube-apiserver`는 `etcd`로 '요청을 하는' 역할이므로 '클라이언트 인증서'가 필요한데, 이때 하나의 인증서로 클라이언트/서버 모두 가능하다. (하지만, 따로 관리하는 것이 표준)
- `kubelet` 또한 '요청을 받는' 역할과 '요청을 하는' 역할 모두 수행한다. 이때`kube-apiserver`와 같이 1개의 인증서로 클라이언트/서버 모두 사용해도 되고, 따로 관리해도 된다. (하지만, 따로 관리하는 것이 표준)

**CA**
- 기본적으로 쿠버네티스 설치(by `kubeadm`)시 `/etc/kubernetes/pki/` 폴더 내부에 `ca.crt`와 `ca.key`를 생성하여 CA를 만든다.
- 원한다면, `etcd` 전용 CA를 별도로 둘 수 있다.

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)