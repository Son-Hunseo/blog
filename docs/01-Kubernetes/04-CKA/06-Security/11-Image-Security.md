---
title: Image Security
description: 컨테이너 이미지 이름 구조(레지스트리/사용자/이미지)를 이해하고, 비공개 이미지(Private Registry)에 접근하기 위해 쿠버네티스(Kubernetes)에서 Secret을 생성하고 imagePullSecrets를 사용하여 인증하는 방법을 단계별로 학습합니다.
keywords:
  - Kubernets
  - 쿠버네티스
  - imagePullSecrets
  - AWS ECR
---
---
## 컨테이너 이미지 이름의 구조

![image-security1](./assets/image-security1.png)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx
```

- 위의 `Pod` yaml 파일에서 사용되는 `nginx`와 같은 이미지 이름은 사실은 축약된 형태이다.
- 구조: `레지스트리/사용자/이미지`
	- 레지스트리:
		- 이미지가 저장된 서버 주소이다.
		- 생략 시 도커의 기본 레지스트리인 DockerHub(`docker.io`)로 간주된다.
	- 사용자(계정):
		- 이미지를 관리하는 주체이다.
		- 생략 시 공식 이미지를 의미하는 `library`로 간주된다.
	- 이미지:
		- 이미지의 실제 이름이다.

---
## Private Registry
### 개념

- 사내 애플리케이션 이미지와 같이 외부에 노출되어서는 안되는 이미지들이 있다.
- 이런 이미지의 경우 비공개 레지스트리에 보관하여 사용해야한다.
- 내부 Private Registry도 있고, CSP사의 Private Registry도 있다.
	- 내부: `HARBOR`, `Dragonfly`
	- CSP사: `AWS ECR` 등

### 접근 방법 (Docker registry 예시)

**1. `Secret` 생성**

```bash
kubectl create secret docker-registry regcred \
  --docker-server=private-registry.io \
  --docker-username=registry-user \
  --docker-password=registry-password \
  --docker-email=registry-user@org.com
```

- `regcred`: 생성할 시크릿의 이름 (임의 지정 가능)
- `--docker-server`: 비공개 레지스트리 주소
- `--docker-username` / `password` / `email`: 접속 계정 정보

**2. `Pod`에 `Secret` 연결**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    # 비공개 레지스트리의 전체 이미지 경로 입력
    image: private-registry.io/apps/internal-app
  # 이미지를 가져올 때 사용할 시크릿 지정
  imagePullSecrets:
  - name: regcred
```

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/containers/images/](https://kubernetes.io/docs/concepts/containers/images/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)