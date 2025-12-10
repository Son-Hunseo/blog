---
title: Certificates API 로 인증서 발급 자동화하기
description: Kubernetes 인증서 관리의 고통을 해결하는 Certificate API 완벽 가이드. 수동 발급의 문제점부터 CSR 생성, 승인, kube-controller-manager의 동작 원리까지 상세히 알아봅니다. CKA 시험 대비 및 보안 강화 필수 지식.
keywords:
  - Kubernetes
  - 쿠버네티스
  - Kubernetes Certificate API
---
---
## 기존의 방식의 문제점

**기존의 방식(수동)**

- 프로세스
	- 첫 발급
		1. 새로운 User가 개인키를 생성하고 CSR을 만든다.
		2. 관리자에게 CSR을 전달한다.
		3. 관리자는 CA서버(보통 마스터노드)에 접속하여 CA키와 루트 인증서로 CSR에 서명한다. -> 인증서 생성
		4. 생성된 인증서를 사용자에게 전달한다.
	- 인증서 갱신
		1. User가 개인키를 생성하고 CSR을 만든다.
		2. 관리자에게 CSR을 전달한다.
		3. 관리자는 CA서버(보통 마스터노드)에 접속하여 CA키와 루트 인증서로 CSR에 서명한다. -> 인증서 생성
		4. 생성된 인증서를 사용자에게 전달한다.

- 문제점: 팀이 커지거나 인증서 만료로 인한 갱신이 빈번해지면 관리 부담이 커진다.

---
## Certificate API
### 프로세스

**1. User(jane) - 개인키, CSR 생성**

```bash
openssl genrsa -out jane.key 2048

openssl req -new -key jane.key -subj "/CN=jane" -out jane.csr
```

**2. `CertificateSigningRequest` 객체 생성**

- 첫 발급 
	- 사용자는 `kubectl` 접근 자체가 불가능하므로 CSR을 관리자에게 넘긴다.
	- 관리자가 `CertificateSigningRequest` 객체를 만든다.
- 인증서 갱신
	- 사용자가 `CertificateSigningRequest` 객체를 만든다.

```bash
cat jane.csr | base64 | tr -d "\n"
```

- CSR 내용은 Base64로 인코딩되어야한다.

```yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: jane
spec:
  groups:
  - system:authenticated
  usages:
  - digital signature
  - key encipherment
  - client auth
  request:
    <Base64로_인코딩된_CSR_내용>
```

```bash
kubectl create -f jane.yaml
```

**3. 관리자 - 요청 확인 및 승인**

```bash
kubectl get csr
```

- 요청이 들어온 CSR 목록 확인

```bash
kubectl certificate approve jane
```

- 요청을 승인

**4. 인증서 발급**

```bash
kubectl get csr jane -o yaml
```

```bash
echo "<certificate_값>" | base64 --decode > jane.crt
```

- 첫 발급
	- 사용자는 클러스터 접근 자체가 불가능하므로 '관리자'가 발급된 인증서를 유저에게 전달해야한다.
- 갱신
	- 갱신이라면 `kubectl` 명령어를 유저가 입력 가능하므로 위 과정을 유저가 직접 하면 된다.

### 장점

- 이러한 인증서 발급 프로세스를 중앙 집중화하면서 관리의 이점을 누릴 수 있다.
	- 새로운 유저 생성보다는 인증서 갱신 부분에서 이점이 있다.
- 직접 CA 개인키에 접근하지 않아도 된다. (보안적 이점)
- 외부 컨트롤러(ex: `Cert-Manager`)나 `kubelet`이 인증서 라이프사이클을 자동화할 수 있도록 하는 표준 인터페이스를 제공한다.

### 동작 원리

- 이러한 모든 인증서 관련 작업(승인, 서명 등)을 실제로 수행하는 컴포넌트는 `kube-controller-manager`이다.
- `kube-controller-manager` 내부의 `CSR-Approving`, `CSR-Signing` 등의 컨트롤러가 해당 작업을 수행한다.
	- 실제로 `kube-controller-manager`의 yaml 파일에 보면 `cluster-signing-cert-file`, `cluster-signing-key-file` 에 CA의 루트 인증서와 개인키 경로를 입력하는 란이 있다.

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/](https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/)
- [https://kubernetes.io/docs/tasks/tls/managing-tls-in-a-cluster/](https://kubernetes.io/docs/tasks/tls/managing-tls-in-a-cluster/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)