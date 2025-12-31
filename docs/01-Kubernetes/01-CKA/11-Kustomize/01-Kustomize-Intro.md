---
title: Kustomize 개요
description: 쿠버네티스(Kubernetes) 환경별(Dev, Prod) 설정 관리를 위한 Kustomize의 개념, Base와 Overlays 구조, 장점을 예제 코드와 함께 알기 쉽게 설명합니다. YAML 중복 문제를 해결하는 효율적인 배포 관리 방법을 알아보세요.
keywords:
  - Kubernetes
  - Kustomize
---
---
## Kustomize 개요
### 배경

```plain
kubernetes/
 ├── dev/
 │   └── deployment.yaml    # replicas: 1 (개발용)
 ├── staging/
 │   └── deployment.yaml    # replicas: 2 (검증용)
 └── prod/
     └── deployment.yaml    # replicas: 10 (운영용)
```

- 애플리케이션을 운영할 때, Dev, Stage, Prod 환경이 있다고 가정하자.
- 같은 애플리케이션을 환경에 따라서 배포하고 운영해야한다고 할 때 어떻게 할 수 있을까?
- 단순하게 생각해보면 각 폴더별로 나누고 기본 yaml 파일을 복사해둔 뒤 각 환경별 리소스에 일일이 수치를 변경해서 저장하면 될 것이다.
- 이 방법에는 문제점이 있다.
	- 새로운 리소스를 추가하거나 설정을 변경할 때 모든 폴더를 일일이 수정해야한다. 하나라도 빼먹으면 문제가 생긴다. 즉, 유지보수가 어려워진다.

### Kustomize의 등장

```plain
project-root/
 ├── base/                     # 공통 리소스 정의 (기본 틀)
 │   ├── deployment.yaml       # replicas: 1 (기본값)
 │   ├── service.yaml          # 공통 서비스 설정
 │   └── kustomization.yaml    # base 리소스 선언
 └── overlays/                 # 환경별 차이점 정의
     ├── dev/
     │   └── kustomization.yaml # 별도 수정 없이 base 참조 가능
     ├── staging/
     │   ├── kustomization.yaml # base 참조 + replicas 변경 선언
     │   └── patch.yaml         # replicas를 2로 변경하는 내용
     └── prod/
         ├── kustomization.yaml # base 참조 + replicas 변경 선언
         └── patch.yaml         # replicas를 10으로 변경하는 내용
```

```yaml
# base/kustomization.yaml
resources:
  - deployment.yaml
  - service.yaml
```

```yaml
# overlays/prod/kustomization.yaml
resources:
  - ../../base                # 1. 일단 Base를 가져온 뒤

patches:
  - path: patch.yaml          # 2. Prod 전용 설정으로 덮어씌움
```

```yaml
# overlays/prod/patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 10                # 운영 환경은 10개로
```

- `Kustomize`는 공통된 설정은 재사용하고, 변경이 필요한 부분만 덮어쓰자는 개념으로 이 문제를 해결한다.
- `Base` (기본 설정, 공통 설정)
	- 모든 환경에서 공통으로 사용되는 리소스와 기본값을 정의한다.
- `Overlays`
	- `Base`를 바탕으로 특정 환경에서만 변경할 값(Patch)을 정의한다

### 작동 원리

- `Kustomize`는 `Base` 설정과 특정 환경의 `Overlay` 설정을 Merge 하여 최종적으로 클러스터에 적용할 Manifest를 생성한다.
- 해당 Manifest를 적용하는 것이다.
- 적용 명령어: `kubectl apply -k overlays/prod`

### 장점

- 별도의 도구 설치 없이 `kubectl` 만으로 사용 가능하다.
	- 단, 최신 기능 사용을 위해 별도 설치를 권장하기도 한다.
- `Helm`에서 사용하는 것과 같은 별도의 템플릿 언어가 없어서 추가적인 무언가를 배울 필요가 없다.
- 모든 설정이 순수 YAML 파일이므로 가독성이 좋고 기존 YAML 검증 도구들을 그대로 사용할 수 있다.

---
## 레퍼런스

- https://kubernetes.io/ko/docs/tasks/manage-kubernetes-objects/kustomization/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)