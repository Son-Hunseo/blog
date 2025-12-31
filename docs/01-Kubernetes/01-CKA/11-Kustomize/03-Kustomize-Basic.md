---
title: Kustomize 기본 기능
description: 쿠버네티스 Kustomize의 핵심 파일인 kustomization.yaml의 개념과 구성 요소, 적용 방법을 정리합니다. kubectl apply -k를 활용한 효율적인 리소스 관리법을 확인하세요.
keywords:
  - 쿠버네티스
  - Kustomize
  - kustomization.yaml
  - kubectl apply -f
---
---
## kustomization.yaml
### 개념

- `kustomization.yaml` 파일은 `Kustomize`가 쿠버네티스 리소스를 관리하기 위해 가장 먼저 찾는 설정 파일이다.
	- 파일의 이름은 꼭 `kustomization.yaml` 이어야 한다.
	- `kubectl apply -f` 이 명령어로 적용하는 리소스가 아니다. 왜냐하면`kustomization.yaml`은 리소스 자체를 정의하는 파일이 아니라 다른 파일에 정의된 리소스들을 어떻게 조합하고 수정할 것인가에 대한 파일이다.

### 구성 요소

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# 1. 관리할 리소스 목록
resources:
  - deployment.yaml
  - service.yaml

# 2. 적용할 변경 사항 (모든 리소스에 공통 라벨 추가)
commonLabels:
  company: KodeKloud
```

1. Resource
	- `Kustomize`가 관리해야 할 원본 YAML 파일들의 목록이다.
2. Transformations: 원본 리소스에 적용할 변경 사항이다.
	- 예: 모든 리소스에 공통 라벨 추가

:::tip
- `kustomization.yaml` 파일은 Kustomize 단위마다 하나씩 존재한다. 
- 이전 글에서 환경마다 내부에 하나씩 더 존재했던 것은 `overlay`기능을 통해서 상위 `kustomization.yaml` 파일을 import하는 것이다.
- 각 환경에 따른 `kustomization.yaml`이 각각 있다고 했을 때(`dev/kustomization.yaml`, `prod/kustomization.yaml`) 상위 `kustomization.yaml`에서는 `resources`에 `dev/`, `prod/` 만 넣어두고 `kubectl apply -k ./` 이렇게 하면 모든 환경의 리소스가 생성된다.
:::

---
## 적용 방법
### build & apply -f

```bash
kustomize build <디렉토리경로>
```

- 위 명령어를 적용하면 정의된 리소스들에 `kustomization.yaml` 이 적용된 결과물이 나온다.
- 중요!!) 이 결과물들이 바로 적용되는 것이 아니라 그냥 적용된 yaml 파일이 나오는 것이다.

```bash
kustomize build k8s | kubectl apply -f -
```

```bash
kustomize build k8s | kubectl delete -f -
```

- 빌드된 결과물을 `kubectl apply -f`로 적용할 수도 있지만, 리눅스 파이프(`|`) 기능을 사용해서 `build`의 출력을 `kubectl`의 입력으로 바로 전달할 수 있다.

### apply -k (권장)

```bash
kubectl apply -k <디렉토리경로>
```

```bash
kubectl delete -k <디렉토리경로>
```

- 최신 `kubectl`에는 `Kustomize` 기능이 내장되어 있어 `-k` 옵션으로 더 간단하게 실행할 수 있다.
- 내부적으로 빌드 후 결과물을 바로 적용한다.

---
## 팁

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
```

- `kustomization.yaml` 파일 최상단에 `apiVersion`과 `kind`는 명시하는 것이 좋다.
- 왜냐하면, 향후 호환성 문제와 같은 변경 사항에 대비하기 위함이다.

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)