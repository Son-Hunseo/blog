---
title: Env - Plain
description: Docker와 Kubernetes 환경에서 애플리케이션의 동작을 제어하는 환경 변수(Environment Variable)를 설정하는 방법을 비교 설명합니다. 단순한 Key-Value 쌍으로 $APP\_COLOR$ 변수를 정의하여 컨테이너에 전달하는 Docker 실행 명령어($docker$ $run$)와 Kubernetes Pod의 $spec.containers.env$ 필드를 활용한 YAML 구성을 명확하게 이해할 수 있습니다.
keywords:
  - Docker 환경 변수
  - Kubernetes 환경 변수
---
---
## 환경 변수 - Plain Key-Value
### Docker

```bash
docker run -e APP_COLOR=pink simple-webapp-color
```

### Kubernetes

```bash
apiVersion: v1
kind: Pod
metadata:
  name: simple-webapp-color
spec:
 containers:
 - name: simple-webapp-color
   image: simple-webapp-color
   ports:
   - containerPort: 8080
   env:
   - name: APP_COLOR
     value: pink
```

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/](https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)