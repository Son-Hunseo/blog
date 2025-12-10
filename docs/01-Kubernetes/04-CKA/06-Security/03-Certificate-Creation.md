---
title: 쿠버네티스 컴포넌트 별 인증서 발급 방법
description: 쿠버네티스(Kubernetes) 클러스터 구축을 위한 OpenSSL 인증서 수동 발급 방법을 단계별로 상세히 알아봅니다. CA 구축부터 Admin, ETCD, API Server, Kubelet 등 주요 컴포넌트별 인증서 생성 과정과 CKA 시험 대비 핵심 개념을 정리했습니다.
keywords:
  - Kubernetes
  - Kubernetes 인증서
  - Kubernetes 인증서 발급
  - 쿠버네티스 인증서 발급
---
---
:::warning
- `kubeadm`으로 클러스터를 설치할 경우 모든 과정이 자동으로 이루어진다.
- 아래 내용은 수동으로 인증서를 발급하는 방법이다.
- 여러 발급 방법이 있지만 아래는 대표적인 `openssl`로 발급받는 방법이다.
:::

## CA

**1. 개인키(Private Key) 생성**

```bash
openssl genrsa -out ca.key 2048
```

**2. CSR(Certificate Signing Request) 생성**

```bash
openssl req -new -key ca.key -subj "/CN=KUBERNETES-CA" -out ca.csr
```

- CSR은 '아직 서명되지 않은 인증서 폼' 이라고 생각하면된다.
- CSR의 CN(Common Name)은 `KUBERNETES-CA`로 지정한다.
	- CN은 웹 인증서에서의 도메인과 비슷한 역할이라고 생각한다. (사용자 이름 등의 다양한 객체의 식별자)

**3. 인증서 서명 및 발급**

```bash
openssl x509 -req -in ca.csr -signkey ca.key -out ca.crt
```

- 클러스터의 CA인증서는 자신의 개인키로 <span style={{color: 'red'}}>Self-signed</span> 된다.
- 권장되는 위치
	- 아래 경로 위치들은 일반적인 위치이고, 경로들이 필요한 각 컴포넌트의 `Static Pod` 매니페스트 파일에서 지정할 수 있다.
	- `ca.key`: `/etc/kubernetes/pki/`(마스터 노드)
		- CA 개인키는 마스터 노드에 안전하게 보관되어야한다.
	- `ca.crt`: `/etc/kubernetes/pki/` (모든 노드)
		- CA 인증서는 각 노드에서 'CA 개인키'로 서명된 서버/클라이언트 인증서들의 '검증'에 사용된다.

---
## Client
### User(Admin)

**1. 개인키 생성**

```bash
openssl genrsa -out admin.key 2048
```

**2. CSR 생성**

```bash
openssl req -new -key admin.key -subj "/CN=kube-admin/O=system:masters" -out admin.csr
```

- CN: `kube-admin`
	- User 이름을 `kube-admin`이라고 지정하는 것과 같음
	- 도메인과 같은 식별자이므로 `kube-admin`이라는 이름을 가진 유저만 이 인증서를 사용이 가능하다.
- O (Organization): `system:masters`
	- `system:masters`는 클러스터 관리자 권한을 가지는 그룹이다.

**3. 서명**

```bash
openssl x509 -req -in admin.csr -CA ca.crt -CAkey ca.key -out admin.crt
```

- 위 명령어의 `ca.crt`, `ca.key`는 인증서와 키의 경로로 대체하면 된다.
- CA 인증서와 다르게 self-signed가 아니라 `ca.key`(CA 개인키)로 서명한다.
	- `ca.crt`는 발급하는 인증서에 기타 정보를 기록하기 위해 사용된다.
- 보통 사용자의 홈 디렉토리 내의 `.kube` 디렉토리에 위치한다. (따로 설정 가능)
	- `~/.kube/admin.crt`, `~/.kube/admin.key`

### Component (`kube-scheduler`, `kube-controller-manager`)

**1. 개인키 생성**

```bash
openssl genrsa -out scheduler.key 2048
```

- 다른 컴포넌트의 경우 `scheduler.key`를 `controller-manager.key` 등으로 바꾼다.

**2. CSR 생성**

```bash
openssl req -new -key scheduler.key -subj "/CN=system:kube-scheduler" -out scheduler.csr
```

- 다른 컴포넌트의 경우 `scheduler.key`를 `controller-manager.key` 등으로 바꾼다.
- 다른 컴포넌트의 경우 CN을 `system:kube-scheduler`를 `system:kube-controller-manager` 등으로 바꾼다.
- 다른 컴포넌트의 경우 `scheduler.csr`를 `controller-manager.csr` 등으로 바꾼다.

**3. 서명**

```bash
openssl x509 -req -in scheduler.csr -CA ca.crt -CAkey ca.key -out scheduler.crt
```

- 다른 컴포넌트의 경우 `scheduler.csr`를 `controller-manager.csr` 등으로 바꾼다.
- 다른 컴포넌트의 경우 `scheduler.crt`를 `controller-manager.crt` 등으로 바꾼다.
- `kube-scheduler`, `kube-controller-manager`의 경우에는 보통 마스터 노드의 `/etc/kubernetes/pki` 디렉토리에 저장한다. (따로 설정 가능)

:::warning
과거에는 `kube-proxy`도 `kube-scheduler`와 `kube-controller-manager`와 같은 방식으로 인증서를 발급받았지만, 현재는 `kube-proxy`만 TLS Bootstrap과정을 통해 인증된다. (이에 대해 자세히 언급하는건 나중에 시간될 때 정리)
:::

---
## Server
### ETCD

**1. 개인키 생성**

```bash
openssl genrsa -out etcd-server.key 2048
```

**2. CSR 생성**

```bash
openssl req -new -key etcd-server.key -subj "/CN=etcd-server" -out etcd-server.csr
```

**3. 서명**

```bash
openssl x509 -req -in etcd-server.csr -CA ca.crt -CAkey ca.key -out etcd-server.crt
```

- 인증서와 키의 위치는 보통 `/etc/kubernetes/pki/etcd` 디렉토리에 저장한다. (따로 설정 가능)

:::info
`ETCD`를 HA로 구성할 경우, `Peer Cert`를 추가로 생성해서 `ETCD` `Static Pod` yaml에 `Server Cert`와 `Peer Cert`의 경로를 각각 지정해주면 된다.
:::

### Kube-Apiserver

- `kube-apiserver`는 여러 이름(DNS, IP)으로 호출되므로 SAN(Subject Alternative Names) 설정이 필수이다.
	- CN 하나로 안된다는 말이다.

**1. OpenSSL 설정 파일 준비(`openssl.cnf`)**

```toml
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = kubernetes
DNS.2 = kubernetes.default
DNS.3 = kubernetes.default.svc
DNS.4 = kubernetes.default.svc.cluster.local
IP.1 = 10.96.0.1
IP.2 = <API_SERVER_HOST_IP>
```

**2. 개인키 생성**

```bash
openssl genrsa -out apiserver.key 2048
```

**3. CSR 생성 (설정 파일 포함)**

```bash
openssl req -new -key apiserver.key -subj "/CN=kube-apiserver" -config openssl.cnf -out apiserver.csr
```

**4. 서명 (확장 옵션 포함)**

```bash
openssl x509 -req -in apiserver.csr -CA ca.crt -CAkey ca.key -extensions v3_req -extfile openssl.cnf -out apiserver.crt -days 1000
```

- 인증서와 키의 위치는 보통 `/etc/kubernetes/pki`에 저장하면된다. (수정 가능)

### Kubelet

- 비슷한 과정을 많이 반복했으니, 자세한 설명은 생략
- `CN`은 노드 이름으로 설정

**Kubelet 서버 인증서 (API Server가 노드에 요청할 때)**

```bash
openssl genrsa -out node01.key 2048
openssl req -new -key node01.key -subj "/CN=node01" -out node01.csr
openssl x509 -req -in node01.csr -CA ca.crt -CAkey ca.key -out node01.crt
```

**Kubelet 클라이언트 인증서 (노드가 API Server에 요청할 때)**

```bash
openssl genrsa -out node01-client.key 2048
openssl req -new -key node01-client.key -subj "/CN=system:node:node01/O=system:nodes" -out node01-client.csr
openssl x509 -req -in node01-client.csr -CA ca.crt -CAkey ca.key -out node01-client.crt
```

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)