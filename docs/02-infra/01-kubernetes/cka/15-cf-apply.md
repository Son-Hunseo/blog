---
title: cf) kubectl apply 명령어의 원리
description: kubectl apply 명령어의 내부 동작 원리와 Local, Live, Last Applied Configuration의 관계를 상세히 설명합니다. Kubernetes에서 선언적 관리가 왜 중요한지, 그리고 apply, create, replace를 혼용하면 관리가 꼬이는 이유를 구체적인 예시와 함께 알아봅니다.
keywords:
  - kubectl apply
  - kubernetes apply
  - Live Object Configuration
  - Last Applied Configuration
---
---
## kubectl apply
### 개념

- `kubectl apply`는 선언적 방식(declarative approach)으로 Kubernetes 객체를 관리하는 명령어이다.
- 내부적으로 `apply`는 아래 3가지 구성 요소를 비교하여 변경사항을 결정한다.

1. `Local File` - 사용자가 작성한 YAML 파일
2. `Live Object Configuration` - 클러스터 내부에 존재하는 Object의 실시간 구성도
	- `Local File`과 유사한 구성이지만, `status` 필드와 같이 Kubernetes가 관리하는 runtime 필드들이 추가적으로 존재한다.
	- 해당 구성도는 `ETCD`에 존재한다.
3. `Last Applied Configuration` - 마지막으로 `apply`를 적용했을 때의 스냅샷
	- `Local File`의 구성이 JSON 형식으로 변환된 형태
	- `Live Object Configuration`의 `annotation`으로 저장된다.
	- 오직 `kubectl apply`를 사용할 떄만 저장되며, `kubectl create`, 나 `kubectl replace`는 이 정보를 저장하지 않는다.

### 예시

**Local File**

```yaml
# nginx.yaml
apiVersion: v1
kind: Pod

metadata:
  name: myapp-pod
  labels:
    app: myapp
    type: front-end-services
spec:
  containers:
  - name: nginx-container
    image: nginx:1.18
```

**Live Object Configuration (+ Last Applied Configuration)**

```yaml
apiVersion: v1
kind: Pod

metadata:
  name: myapp-pod
  labels:
    app: myapp
    type: front-end-services
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"Pod","metadata":{"name":"myapp-pod","labels":{"app":"myapp","type":"front-end-services"}},"spec":{"containers":[{"name":"nginx-container","image":"nginx:1.18"}]}}
spec:
  containers:
  - name: nginx-container
    image: nginx:1.18
status:
  conditions:
  - lastProbeTime: null
    status: "True"
    type: Initialized
```

---
## 동작 원리
### 생성

1. 오브젝트가 아직 존재하지 않는다면, `kubectl apply`는 오브젝트를 새로 생성한다.
2. 생성될 때 Kubernetes 는 `status`를 포함한 `Live Object Configuration`을 만든다.
3. 동시에, `Local File`을 JSON 형태로 변환하여 `Last Applied Configuration` 으로 오브젝트의 `annotation`에 저장한다.

### 수정

`apply`를 실행하면 아래 비교가 이루어진다.

- 수정:
	- `Local File`에 수정된 필드가 있다면, `Live Object Configuration`에는 수정되지 않았을 것이다. 그렇다면 `apply`시 `Live Object Configuration`이 업데이트 될 것이다.
	- 이후 `Last Applied Configuration`도 업데이트 된다.

- 삭제:
	- 만약 `Local File`의 삭제된 필드가 있다면, `Last Applied Configuration`에는 존재할 것이다. 그렇다면 `apply`시 `Live Object Configuration`에서 해당 필드가 삭제될 것이다.
	- 이후 `Last Applied Configuration`에서도 삭제된 것이 업데이트 된다.

:::info
'삭제' 부분에서 잘 이해가 되지 않을 수 있다. (그냥 `Local File`에 없고 `Live Object Configuration`에 있는 필드는 삭제해버리면 되잖아 라는 의문이 들 수 있다)

하지만, 그렇게 되면 Kubernetes 입장에서는 그게 '사용자가 삭제한 필드인지', '시스템이 알아서 추가한 필드인지'를 구분할 수 없다.

예를들어 `Live Object Configuration`에는 `status` 필드나 `metadata.creationTimestamp`와 같은 필드도 존재한다. 이는 Kubernetes가 `apply`를 했을 때 자동으로 붙인 요소들이다.

만약 `Last Applied Configuration`이 없다면, 이러한 시스템이 관리하는 필드까지 삭제될 것이다.

이때문에, Kubernetes는 '사용자가 추가한 필드인지', '시스템이 추가한 필드인지'를 판단할 기준이 필요하고, 그 기준이 바로 `Last Applied Configuration`이다.
:::

---
## 주의할 점

- `apply`(declarative) 와 `create`/`replace`(imperative)를 혼용하면 관리가 꼬일 수 있다.
- 즉, `apply`를 사용하기 시작했다면, 이후에도 계속 `apply`로 관리하는 것이 좋다.

**예시**

| 상황                         | 문제점                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `create`로 만든 뒤 `apply` 실행  | `apply`는 비교 기준(`Last Applied Configuration`)이 없음 → “무엇이 변경됐는지” 몰라서 충돌/에러 가능            |
| `apply`로 만든 뒤 `replace` 실행 | `replace`는 Live를 통째로 덮어써서, `Last Applied Configuration`가 삭제됨 → 이후 `apply` 시 diff 계산 불가 |
| `apply`와 `replace`를 번갈아 씀  | `Last Applied Configuration` 내용이 실제 YAML과 불일치 → 삭제/갱신 판단이 꼬임                           |
