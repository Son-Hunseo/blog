---
title: Patches
description: Kubernetes Kustomize의 핵심 기능인 Patch 개념과 JSON 6902, Strategic Merge Patch의 차이점을 완벽 정리합니다. 리스트 수정, 값 변경 등 실무 예시를 통해 효율적인 리소스 관리 방법을 확인하세요.
keywords:
  - Kustomize Patch
  - JSON 6902 Patch
  - 3-Way Strategic Merge Patch
  - 쿠버네티스 Kustomize 사용법
---
---
:::info
`Patch`는 이전 글에서 다른 `Transformer`의 한 종류라고 이해하면 된다.
- 차이점
	- `Transformer`: 전역적인 성격
	- `Patch`: 특정 리소스에 집중
:::

## Patch
### 개념

1. Operation: 무엇을 할 것인가
	- `add`: 리스트에 항목 추가, 혹은 새 필드 추가
	- `remove`: 라벨이나 컨테이너 등 특정 항목 삭제
	- `replace`: 기존 값을 새로운 값으로 교체 (예: 레플리카 수 변경)
2. Target: 어떤 리소스를 수정할 것인가
	- `kind`, `name`, `namespace` 등을 조합하여 특정 객체를 지정한다.
3. Value: 무엇으로 바꿀 것인가? (Remove Operation에는 불필요)

### JSON 6902 Patch

- 특징: `op`(Operation), `path`, `value`를 명시적으로 지정한다.
- 장점: 매우 정밀하며 리스트의 특정 인덱스를 지정하여 수정할 수 있다.
- Path 표기법: YAML 구조를 `/`로 구분한다. (예: `/spec/replicas`)

### Startegic Merge Patch

- 특징: 일반적인 Kubernetes YAML 파일 형식이다. 원본 파일의 일부를 복사해 수정할 부분만 남겨두고 나머지는 지우는 방식이다.
- 장점: 가독성이 높고 익숙한 문법을 사용한다.
- 작동 원리: `Kustomize가 원본과 패치 파일을 Merge한다.

---
## 예시
### 단순 값 변경

**\[원본]**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  replicas: 1
  # ... (생략)
```

**\[방식 1: JSON 6902 Patch]**

```yaml
# kustomization.yaml 내부에 인라인으로 작성 혹은 별도 파일로 분리 가능
patches:
- target:
    kind: Deployment
    name: api-deployment
  # 별도 파일로 분리하고 싶다면 여기에, path: replica-patch.yaml로 작성하고 해당 파일에 
  # - op: 부터 작성하면 된다.
  patch: |-
    - op: replace
      path: /spec/replicas
      value: 5
```

**\[방식 2: Strategic Merge Patch]**

```yaml
# patch-replicas.yaml (별도 파일)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment # 타겟 지정
spec:
  replicas: 5 # 변경할 값만 명시
```

### Dictionary 수정

**\[원본]**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
  labels:
    component: api      # 변경 대상
    org: kodekloud      # 삭제 대상
spec:
  replicas: 1
  template:
    metadata:
      labels:
        component: api
# ... (이하 생략)
```

**\[방식 1: JSON 6902 Patch]**

```yaml
patches:
- target:
    kind: Deployment
    name: api-deployment
  patch: |-
    # 1. 변경 (Replace)
    - op: replace
      path: /metadata/labels/component
      value: web
    
    # 2. 추가 (Add)
    - op: add
      path: /metadata/labels/tier
      value: backend

    # 3. 삭제 (Remove) - value 불필요
    - op: remove
      path: /metadata/labels/org
```

**\[방식 2: Strategic Merge Patch]**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
  labels:
    component: web     # 1. 같은 키에 새로운 값을 적으면 덮어씌워짐 (변경)
    tier: backend      # 2. 없는 키를 적으면 추가됨 (추가)
    org: null          # 3. 값을 null로 설정하면 삭제됨 (삭제)
```

### List 수정

**\[원본]**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  template:
    spec:
      containers:
      - name: nginx          # 인덱스 0 (변경 대상)
        image: nginx:1.14
      - name: database       # 인덱스 1 (삭제 대상)
        image: postgres:10
```

**\[방식 1: JSON 6902 Patch]**

```yaml
patches:
- target:
    kind: Deployment
    name: api-deployment
  patch: |-
    # 1. 변경 (Replace) - 인덱스 0번의 이미지 수정
    - op: replace
      path: /spec/template/spec/containers/0/image
      value: haproxy

    # 2. 삭제 (Remove) - 인덱스 1번(database) 삭제
    - op: remove
      path: /spec/template/spec/containers/1

    # 3. 추가 (Add) - 리스트의 끝(-)에 추가
    - op: add
      path: /spec/template/spec/containers/-
      value:
        name: logger
        image: busybox
```

**\[방식 2: Strategic Merge Patch]**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  template:
    spec:
      containers:
      # 1. 변경 (Replace) - name이 nginx인 것을 찾아 이미지 업데이트
      - name: nginx
        image: haproxy

      # 2. 삭제 (Remove) - $patch: delete 지시어 사용
      - name: database
        $patch: delete

      # 3. 추가 (Add) - 새로운 name은 자동으로 리스트에 추가됨
      - name: logger
        image: busybox
```

---
## 레퍼런스

- https://kubectl.docs.kubernetes.io/guides/config_management/container_images/
- https://kubectl.docs.kubernetes.io/guides/config_management/labels_annotations/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)