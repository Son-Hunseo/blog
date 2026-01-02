---
title: Overlay
description: Kustomize의 Base와 Overlay 구조를 활용해 Kubernetes 환경별 설정을 효율적으로 관리하는 방법을 알아봅니다. 중복 없는 k8s 매니페스트 관리 전략과 실제 디렉토리 구조 예시를 확인하세요.
keywords:
  - Kustomize
  - Kustomize Overlay
---
---
## 개념

- `Kustomize`의 주된 설계 의도는 하나의 Base를 두고 이를 각 Env에 맞게 Overlay하여 사용하는 것이다.
- 이를 통해서 하나의 커다란 목잡한 `kustomization.yaml`이 되는 것이 아니라 각 환경별 간단한 `kustomization.yaml`로 관리할 수 있다.

---
## 예시

**구조**

```plain
my-k8s-project/
├── base/                   # [공통] 모든 환경의 기본이 되는 설정
│   ├── kustomization.yaml
│   └── nginx-depl.yaml     # 예: Replicas: 1
│
└── overlays/               # [환경별] 환경 특화 설정 폴더
    ├── dev/                # 개발 환경
    │   ├── kustomization.yaml
    │   └── patch-replicas.yaml
    │
    ├── staging/            # 스테이징 환경
    │   ├── kustomization.yaml
    │   └── patch-replicas.yaml
    │
    └── prod/               # 운영 환경
        ├── kustomization.yaml
        ├── patch-replicas.yaml
        └── grafana-depl.yaml # [추가 리소스] 운영 환경에만 필요한 별도 리소스
```

### Base

**`base/nginx-depl.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1  # 기본값
  template:
    spec:
      containers:
      - name: nginx
        image: nginx
```

**`base/kustomization.yaml`**

```yaml
resources:
- nginx-depl.yaml
```

### Overlay (dev)

**`overlays/dev/kustomization.yaml`**

```yaml
bases:
- ../../base

patches:
- path: patch-replicas.yaml
```

**`overlays/dev/patch-replicas.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 2 # Dev 환경은 2개로 변경
```

- 다른 환경(`staging`, `prod`) 도 같은 구조

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)