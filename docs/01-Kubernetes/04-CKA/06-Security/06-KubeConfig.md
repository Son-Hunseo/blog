---
title: KubeConfig
description: KubeConfig 파일의 역할, 구조(Cluster, User, Context), YAML 포맷, 그리고 kubectl config 명령어를 사용한 클러스터 접근 및 관리 방법을 상세히 설명합니다. 쿠버네티스 외부에서 안전하고 효율적으로 클러스터에 접속하기 위한 필수 설정 파일입니다.
keywords:
  - KubeConfig
  - Kubernetes
  - 구버네티스
  - 쿠버네티스 kubeconfig
  - .kube
---
---
## KubeConfig
### 왜?

```bash
kubectl get pods \
  --server https://my-kube-playground:6443 \
  --client-key admin.key \
  --client-certificate admin.crt \
  --certificate-authority ca.crt
```

- 등록된 인증서, 키를 가지고 클러스터 외부에서 `kubectl`을 통해 쿠버네티스 클러스터에 접근하기 위해서는 위와같이 주소, 경로 등을 옵션으로 입력해야했다.
- 하지만, `KubeConfig`를 사용하면 이러한 옵션 없이 클러스터에 접근할 수 있다.
- `KubeConfig`란 이러한 옵션 정보들을 파일하나에 담은 설정 파일이다.
- 이 파일은 `$HOME/.kube/config`로 생성하고 작성하면 된다.
	- 바꾸고싶다면, 환경변수 `KUBECONFIG`에 경로를 등록하자.
- 클러스터 내부에서도 이 `KubeConfig`가 등록되어있기 때문에 옵션없이 명령어를 사용할 수 있는 것이다. (확인해보면 있음)

### YAML

![kubeconfig1](./assets/kubeconfig1.png)

```yaml
apiVersion: v1
kind: Config
current-context: my-kube-admin@my-kube-playground
clusters:
- name: my-kube-playground
  cluster:
    server: https://my-kube-playground:6443
    certificate-authority: /path/to/ca.crt

users:
- name: my-kube-admin
  user:
    client-certificate: /path/to/admin.crt
    client-key: /path/to/admin.key

contexts:
- name: my-kube-admin@my-kube-playground
  context:
    cluster: my-kube-playground
    user: my-kube-admin
```

- `current-context`: 현재 기본으로 사용 할 컨텍스트 (cli로 바꿀 경우 파일 내용도 변경됨)
- `clusters`: 접속할 쿠버네티스 클러스터 정보
	- `-`를 보면 배열형태임을 알 수 있다. 따라서 여러개 등록 가능
- `users`: 어떤 유저로 접속할 것인지에 대한 사용자 자격 증명
	- `-`를 보면 배열형태임을 알 수 있다. 따라서 여러개 등록 가능
- `contexts`: 클러스터와 유저를 연결한 하나의 컨텍스트 정보
	- `-`를 보면 배열형태임을 알 수 있다. 따라서 여러개 등록 가능
	- 접속하는 묶음(클러스터-유저)을 지정하는 것이다.

---
## 주요 명령어

```bash
kubectl config view
```

- 현재 설정되어있는 `KubeConfig`를 확인

```bash
kubectl get pods --kubeconfig=./my-custom-config
```

- 기본 경로(`~/.kube/config`)가 아닌 다른 경로에 잇는 `KubeConfig`를 지정해서 명령어 실행

```bash
kubectl config use-context prod-user@production
```

- 컨텍스트 변경 명령어
	- 예를들어 dev 환경에서 prod 환경으로 바꾸거나.. 등등
- 이 명령어를 사용하면 `KubeConfig` yaml 파일의 `current-context` 필드가 바뀐다.

---
## 추가 옵션
### 네임스페이스

```yaml
contexts:
- name: my-kube-admin@my-kube-playground
  context:
    cluster: my-kube-playground
    user: my-kube-admin
    namespace: default
```

- 특정 컨텍스트를 사용할 때 기본 네임스페이스를 지정하고 싶다면, `context`에  `namespace` 필드를 추가하면 된다.

### 인증서 데이터 직접 입력

```yaml
clusters:
- name: my-kube-playground
  cluster:
    server: https://my-kube-playground:6443
	certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JS... (생략)
```

- `cluster`에 `certificate-authority` 필드 대신 `certificate-authority-data`를 넣으면 된다.
- 인증서 내용을 그대로 넣는 것이 아니라 base64로 인코딩한 값을 넣어야 한다.
	- 명령어: `cat ca.crt | base64`

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/](https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/)
- [https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#config](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#config)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)