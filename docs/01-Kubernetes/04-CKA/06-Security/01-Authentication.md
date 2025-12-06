---
title: Authentication
description: Kubernetes 인증(Authentication)의 기본 개념과 작동 원리를 알아보세요. User Account와 Service Account의 차이점을 이해하고, Static Token File을 사용한 인증 방식의 설정 예시를 단계별로 자세히 설명합니다. (보안상 권장되는 Certificates와 Service Account는 다음 글에서 다룰 예정입니다.)
keywords:
  - Kubernetes
  - Kubernetes Authentication
  - Service Account
  - Static Token File
  - Kubernetes 인증
  - 쿠버네티스 인증
---
---
## Authentication in Kubernetes
### 개념

![authentication1](./assets/authentication1.png)

- Kubernetes 클러스터에 접근/조작 하기 위해서는
	1. 클러스터에 접근 가능한 자격이 있는지(인증 - Authentication) 확인하고
	2. 클러스터 내에서 어떠한 리소스들에 권한이 있는지(인가 - Authorization)에 대한 확인
- 을 거쳐야한다.

- Authentication을 하는 주체는 `kube-apiserver`이다.

### Authentication 대상

![authentication2.png](./assets/authentication2.png)

**User Account**

- 대상 - 쿠버네티스 클러스터 내의 리소스를 조작하는 사람
	- 클러스터 관리자
	- 개발자
- <span style={{color: 'red'}}>Kubernetes는 User Account 객체가 존재하지 않는다. - 다른 방법으로 관리</span>

**Service Account**

- 클러스터 내 다른 객체 
	- ex: `Deployment`, `Ingress Controller` 등)
- Kubernetes에는 클러스터 내 객체가 Authentication을 하기위한 객체인 `Service Account`가 존재한다.

### Authentication 종류

- User
	- ~~Static Password File~~ (v1.19에서 Deprecated)
	- `Static Token File` (권장 X)
	- `Certificates` (권장 O)
	- Third party Service (`LDAP`, `Kerberos` 등)
- Bot
	- `Service Account`

---
## 예시 - Static Token File (For 이해, 권장 X)

:::info
이 글에서는 Authentication 이해를 위한 가장 쉬운 예시인 `Static Token File` 방법을 소개한다. (토큰이 plain text 그대로 저장되기 때문에 보안상 권장 x) 권장되는 User 인증 방법인 `Certificate`와 객체 끼리의 인증 방법인 `Service Account`는 다른 글에서 자세히 다룬다.
:::

### In Kubernetes Cluster

**토큰 파일 생성**

```bash
mkdir /etc/kubernetes/token
nano /etc/kubernetes/token/static-tokens.csv
```

```csv
<토큰>,<사용자 이름>,<UID>,"<그룹>"
```

```csv
# 예시
23a31c5195e33d0639d67d739812a02e,remote-son,001,"system:masters"
```

- 위와같이 4개의 column을 가진 csv 파일 형태로 토큰을 `/etc/kubernetes/token`(임의의 디렉토리 - 변경 가능)에 생성한다.
- `RBAC`를 아직 배우지 않았기 때문에, 그룹에 `"system:masters"`로 이미 존재하는 최고 권한을 가진 그룹에 포함시킨다.

**`kube-apiserver` 설정 변경**

```bash
nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

```yaml
...
spec:
  containers:
  - command:
    - kube-apiserver
    - --authorization-mode=Node,RBAC  # RBAC 포함 확인
    - --token-auth-file=/etc/kubernetes/token/static-tokens.csv # 이 줄을 추가
...
volumeMounts:
- mountPath: /etc/kubernetes/token
  name: static-token-dir # 위에서 정의한 볼륨 이름
  readOnly: true
...
volumes:
- hostPath:
    path: /etc/kubernetes/token
    type: DirectoryOrCreate # token 폴더가 없으면 생성
  name: static-token-dir # 볼륨 이름
...
```

- `Static Token File` 파일을 등록하기 위해 `kube-apiserver`의 설정 파일을 수정한다.
	- `command`에 `Static Token File` 경로 추가
	- `Pod`에서 `Static Token File` 경로에 접근할 수 있도록 `volumes`, `volumeMounts` 추가
- `kube-apiserver`는 `Static Pod`이기 때문에 설정 파일을 수정하고 조금 기다리면 수정된다.

**CA 인증서 확인**

```bash
cat /etc/kubernetes/pki/ca.crt | base64 -w 0
```

- `kube-apiserver`의 인증서를 검증하는 데 사용하는 CA 인증서
- 이를 기록해둔다.
- 왜냐하면, 토큰이 Authentication 부분은 해결하지만, TLS 연결을 해결해주는 것이 아니기 때문에 CA 인증서가 필요하다.

### User Local

- 클러스터에 접근하려는 유저가 로컬에서 클러스터에 요청을 보내고 싶을 경우를 가정한다.

**`kubectl` 설치 (mac 기준)**

```bash
brew install kubectl
```

- 클러스터에 요청을 보내기 위해서는 쿠버네티스를 설치할 필요는 없고 `kubectl`만 설치하면 된다. (설치하지 않고, `curl`로 api 요청을 보내도 된다)

**로컬 kubeconfig 파일 생성**

```bash
mkdir ~/.kube
nano ~/.kube/config
```

```yaml
apiVersion: v1
kind: Config
preferences: {}

# 1. 클러스터 정보 정의
clusters:
- cluster:
    certificate-authority-data: <위에서 기록해둔 CA 인증서>
    server: https://192.168.0.1:6443 # 마스터 노드의 IP 및 포트
  name: kubernetes-static-token

# 2. 사용자 정보 정의
users:
- name: remote-son
  user:
    token: 23a31c5195e33d0639d67d739812a02e # 설정한 Static Token

# 3. Context 정의
contexts:
- context:
    cluster: kubernetes-static-token
    user: remote-son
  name: remote-son-context@kubernetes

# 4. 현재 Context 설정
current-context: remote-son-context@kubernetes
```

- 사용자의 로컬에 Authentication을 위한 confing 파일을 생성한다.
	- 경로: `~/.kube`

```bash
kubectl get pod --all-namespaces
```

- 이제 User의 로컬에서 클러스터에 인증 후 명령어를 사용할 수 있는 것을 볼 수 있다.
	- `RBAC` 그룹을 모든 권한이 있는 `system:masters`로 해둔 상태이다.

**API 요청을 직접 보내고 싶다면**

```bash
CA_DATA_ENCODED="<기록해둔 CA 인증서>"

echo $CA_DATA_ENCODED | base64 -D > /tmp/ca.crt
```

```bash
curl -X GET \
  --cacert "/tmp/ca.crt" \ # CA 인증서를 저장한 경로 (기록해둔 것 파일로 저장)
  -H "Authorization: Bearer <설정한 토큰>" \
  -H 'Accept: application/json' \
  "https://192.168.0.1:6443/api/v1/pods?limit=500"
```

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/access-authn-authz/authentication/](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)