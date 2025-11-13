---
title: Labels, Selectors
description: Kubernetes의 Labels와 Selectors 개념을 쉽게 설명한 가이드입니다. Label로 객체에 속성을 부여하고 Selector로 Pod, Service, ReplicaSet 등을 필터링하는 방법과 올바른 matchLabels 설정 기준을 명확히 정리했습니다. Annotation과의 차이까지 포함한 Kubernetes 메타데이터 이해에 도움이 되는 문서입니다.
keywords:
  - Kubernetes labels
  - Kubernetes selectors
  - matchLabels
  - Kubernetes annotation
---
---
## Labels, Selectors
### 개념

- `labels`: 객체(`Pod`, `Service` 등)에 붙이는 속성(Key-Value)
- `selectors`: `labels`를 기준으로 객체를 필터링하는 방법
	- AND 연산 - 여러 `Selectors` 조건이 있으면 모두 만족하는 객체 찾음

### 왜 필요?

- Kubernetes에서는 수많은 `Pod`, `Service`, `ReplicaSet`, `Deployment` 객체들이 생긴다. 이 객체들을 역할별로 묶고, 특정 조건에 맞는 객체만 조회하거나, 이 객체들 사이의 연결을 만드려면 `labels`와 `selectors`가 필요하다.

### 역할

```bash
kubectl get pods --selector app=myapp
```

- `app: myapp` 이라는 `label`을 가진 `Pod`들만 조회한다.

```yaml
...
spec:
  template:
    metadata:
      labels:
        app: myapp
...
  selector:
    matchLabels:
      app: myapp
...  
```

- 위와같이 `ReplicaSet` -> `Pod` / `Deployment` -> `Pod`를 연결할 때 사용한다.
- `spec.selector.matchLabels`에 정의된 **모든** key-value 쌍은`spec.template.metadata.labels`에 포함되어 있어야 한다. (즉, `spec.selector.matchLabels`는 `spec.template.metadata.labels`의 부분집합이어야 한다)
	- `spec.template.metadata.labels`에 `env: dev`, `type: front-end` 라는 조건이 있다고 하자, 이때 `spec.selector.matchLabels`에 `end: dev`만 있을 경우 생성이 가능하다. (다만, `type: back-end`와 같은 기존 `Pod`도 포함될 수 있으므로 일치시키는 것이 좋다)

```yaml
...
spec:
  template:
    metadata:
      labels:
        app: myapp
...
  selector:
    app: myapp
...  
```

- `Service`에서도 동일하게 동작한다.

---
## Annotation

```yaml
metadata:
  annotations:
    buildVersion: "1.2.3"
    contact: "dev@example.com"
```

- `annotations`는 `selector`에 사용되지 않고, 단순히 정보를 기록하는 메타데이터이다.
- 버전, 연락처, 필요한 정보 등을 기록한다.

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
