---
title: Transformers
description: Kustomize의 핵심 기능인 Transformation(Common, Image)을 완벽 정리합니다. commonLabels, namespace 설정부터 이미지 태그 일괄 변경까지, 쿠버네티스 리소스 관리 효율을 높이는 실무 예제를 확인하세요.
keywords:
  - Kustomize
  - Kubernets
  - 쿠버네티스
  - Transformers
  - Common Transformations
  - Image Transformer
---
---
:::info
`Transformation`이란?
- `kustomization.yaml`에서 원본 리소스에 적용할 변경 사항들을 나타내는 구성 요소이다.
- 아래 요소들 외에도 많은 `Transformation`들이 있지만, 이 글에서는 이정도만 소개
:::

## Common Transformations
### 개념

- 여러 쿠버네티스 리소스에 공통적인 설정을 일괄 적용할 때 사용한다.
- 주요 기능
	- `commonLabels`: 모든 리소스에 공통 라벨을 추가한다.
		- 리소스 뿐만 아니라 `selector` 필드에도 주입된다.
	- `namespace`: 모든 리소스가 배포될 네임스페이스를 지정한다.
	- `namePrefix`/`nameSuffix`: 모든 리소스 이름의 앞이나 뒤에 특정 문자열을 붙인다.
	- `commonAnnotations`: 모든 리소스에 공통 어노테이션을 추가한다.

### 예시

- 모든 리소스 이름 뒤에 `-dev` 붙임
- 모든 리소스에 `org: KodeKloud` 라벨 붙이기
- `development` 네임스페이스에 배포하기

**`kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

# 1. 네임스페이스 일괄 적용
namespace: development

# 2. 이름 접두사/접미사 적용 (Suffix 예시)
nameSuffix: -dev
# namePrefix: dev-  <-- 접두사가 필요하면 사용

# 3. 공통 라벨 적용
commonLabels:
  org: KodeKloud

# 4. 공통 주석 적용
commonAnnotations:
  maintainer: "devops-team"
```

---
## Image Transformer
### 개념

- `Deployment`나 `Pod`에서 사용하는 컨테이너의 이미지 이름이나 태그를 변경할 때 사용한다.
- 주요 속성
	- `name`: 변경하고 싶은 '기존' 이미지 이름
	- `newName`: 교체할 새로운 이미지 이름
	- `newTag`: 교체할 새로운 태그

### 예시

**`kustomization.yaml`**

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml

images:
  - name: nginx       # 찾을 이미지 (Target)
    newName: haproxy  # 변경할 이미지
    newTag: "2.4"
```

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)