---
title: Components 기능
description: Kustomize Components를 활용해 Kubernetes 설정의 중복을 제거하는 방법을 알아봅니다. Base와 Overlay 구조의 한계를 넘어서, 특정 환경(Dev, Premium, Self-hosted)에만 필요한 기능을 모듈화하고 재사용하는 실전 예제를 제공합니다.
keywords:
  - Kustomize
  - Kustomize Components
---
---
## 배경

- 일반적인 `Kustomize` 구조 (`Base` + `Overlay`)를 사용한다고 가정하자.
- 모든 환경에 필요한 요소 -> `Base`
- 특정 하나의 환경에 필요한 요소 -> `Overlay`
- A, B, C `Overlay` 중 A, B에는 필요하지만 C에는 필요 없는 경우에는 어떻게 해야할까?
	- A와 B `Overlay`에 각각 작성하면 코드가 중복되어 유지보수가 어려워진다. (2개가 아니라 더 많다고 생각해보자)
- 이러한 상황에서 `Component` 기능을 사용하면 중복 없이 필요한 `Overlay`에만 특정 요소를 넣을 수 있다.

---
## 예시
### 요구 사항

- 배포 환경 (Overlays)
	- Development (개발용)
	- Premium (프리미엄 고객용)
	- Self-hosted (고객 직접 설치용)
- 옵션 기능
	- Caching (Redis): 성능 향상을 위해 필요 (Premium, Self-hosted에만 적용)
	- External DB (Postgres): 외부 DB 연결 필요 (Development, Premium에만 적용)

### 구현

**폴더 구조**

```plain
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── components/
│   ├── caching/              # Caching 컴포넌트
│   │   ├── kustomization.yaml
│   │   ├── redis-deployment.yaml
│   │   └── redis-secret.yaml
│   └── database/             # Database 컴포넌트
│       ├── kustomization.yaml
│       ├── postgres-deployment.yaml
│       └── deployment-patch.yaml (앱에 DB 비번 주입용)
└── overlays/
    ├── dev/                  # Development 환경
    │   └── kustomization.yaml
    ├── premium/              # Premium 환경
    │   └── kustomization.yaml
    └── self-hosted/          # Self-hosted 환경
        └── kustomization.yaml
```

**Component 정의(`components/database/kustomization.yaml`)**

```yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
  - postgres-deployment.yaml  # 이 기능에 필요한 리소스 생성
  - secret.yaml

patches:
  - path: deployment-patch.yaml # Base의 Deployment에 환경변수 등을 추가
```

- `apiVersion`과 `kind`가 특징

**Overlay에서 Component 사용(`overlays/dev/kustomization.yaml`)**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

components: # 여기서 필요한 컴포넌트를 지정합니다.
  - ../../components/database
```

**Overlay에서 Component 사용(`overlays/premium/kustomization.yaml`)**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

components:
  - ../../components/database
  - ../../components/caching
```

---
## 레퍼런스

- https://kubectl.docs.kubernetes.io/guides/config_management/components/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)

