---
title: Security Context
description: 쿠버네티스(Kubernetes)에서 Pod와 컨테이너의 보안 권한 및 접근 제어를 설정하는 securityContext에 대해 알아봅니다. 프로세스 실행 사용자 ID(runAsUser) 설정과 리눅스 Capabilities(capabilities) 추가/삭제를 Pod 또는 컨테이너 레벨에서 구성하는 방법을 예시 YAML과 함께 상세히 설명합니다.
keywords:
  - Kubernets
  - 쿠버네티스
  - SecurityContext
---
---
## Security Context
### 개념

- 쿠버네티스의 `securityContext`는 `Pod`나 컨테이너의 권한 및 접근 제어 설정을 정의하는 필드이다.
- Docker에서 사용자와 권한을 관리하기 위해 `docker run --user`나 `--cap-add` 옵션을 사용하는 것과 유사한 기능이다.
	- 프로세스를 실행할 사용자 ID 설정, Linux Capabilities 추가/삭제 등
### 설정 방법

- `securityContext`는 `Pod`레벨, 컨테이너 레벨 모두에서 구성할 수 있다.

**`Pod` 레벨 예시**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
spec:
  securityContext:
    runAsUser: 1000
  containers:
  - name: ubuntu
    image: ubuntu
    command: ["sleep", "3600"]
```

- 위처럼 설정하면 해당 `Pod`에 존재하는 모든 컨테이너는 User ID 1000으로 실행된다.
- `Pod`레벨에서는 `capabilities`를 설정할 수 없다.


**컨테이너 레벨 예시**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-pod
spec:
  containers:
  - name: ubuntu
    image: ubuntu
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 1000
      capabilities:
        add: ["KILL"]
```

- 위처럼 설정하면 `ubuntu` 컨테이너만  User ID 1000으로 실행되며, `KILL` Linux Capabilities를 얻는다.

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/configure-pod-container/security-context/](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)