---
title: 오퍼레이터 (커스텀 리소스, 커스텀 컨트롤러)
description: 쿠버네티스 오퍼레이터 패턴을 완벽히 이해하세요. CRD(Custom Resource Definition)를 정의하여 커스텀 리소스 상태를 정의하고, 커스텀 컨트롤러로 상태를 실현하는 원리를 예시 YAML과 함께 상세히 설명합니다.
keywords:
  - 쿠버네티스
  - Kubernetes
  - 오퍼레이터 패턴
  - CRD
  - Custom Resource Definition
  - 커스텀 리소스
  - 커스텀 컨트롤러
---
---
## 리소스와 컨트롤러

쿠버네티스에서 `Deployment`와 같은 기본 리소스를 생성하면 다음과 같은 일이 일어난다.

1. 사용자가 `Deployment`와 같은 리소스를 생성한다.
2. 이 리소스의 정보는 `etcd`에 저장된다.
3. `Deployment Controller`가 `etcd`에 저장된 이 변경 사항을 감지한다.
4. 컨트롤러는 정의된 내용(예: replica 3개)에 맞게 실제 리소스(`Pod`)를 생성하여 저장된 리소스 스펙과 실제 상태를 맞춘다.

즉, 리소스가 '상태를 정의'하고, 컨트롤러는 '상태를 실현' 한다.

---
## 문제 시나리오

```yaml
apiVersion: flights.com/v1
kind: FlightTicket
metadata:
  name: my-flight-ticket
spec:
  from: Mumbai
  to: London
  number: 2
```

- 예를 들어, 우리도 `Deployment`처럼 `FlightTicket`이라는 커스텀 리소스를 만들고 싶다고 해보자.
- 위와 같은 yaml 파일을 작성해서 `apply` 하면 당연히 쿠버네티스는 `FlightTicket`이라는 Kind를 모르기 때문에 에러가 발생한다.

---
## Operator 패턴
### 개념

- 이렇게 커스텀 리소스를 만들고 싶을 경우 어떻게 해야할까?
- `Deployment` 리소스가 '상태를 정의'하고 `Deployment Controller`가 '상태를 실현'하는 것 처럼 커스텀 리소스도 이러한 형태로 만들 수 있다.
- 첫 번째로 커스텀 리소스를 정의해서 리소스 상태를 '정의'할 수 있게 한다.
- 두 번째로 해당 리소스를 '실현'할 수 있게하는 컨트롤러를 제작한다.
- 이렇게 `CRD`를 구성하고 커스텀 컨트롤러로 이를 지속적으로 관리하는 방식을 Operator 패턴이라고 한다.
	- Operator Hub에서 OLM(Operator Lifecycle Manager)를 설치하고 원하는 오퍼레이터를 설치할 수 있다.

### CRD (Custom Resource Definition)

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: flighttickets.flights.com # 이름 규칙: <plural>.<group>
spec:
  group: flights.com              # API 그룹
  scope: Namespaced               # 네임스페이스 레벨인지 클러스터 레벨인지 지정
  names:
    kind: FlightTicket            # 리소스 종류 (PascalCase)
    singular: flightticket        # 단수형 (kubectl 출력용)
    plural: flighttickets         # 복수형 (API 요청용)
    shortNames:                   # 단축어 (예: kubectl get ft)
    - ft
  versions:
  - name: v1
    served: true                  # API 서버를 통해 제공 여부
    storage: true                 # etcd 저장 버전 여부
    schema:
      openAPIV3Schema:            # 데이터 유효성 검증 (Validation)
        type: object
        properties:
          spec:
            type: object
            properties:
              from:
                type: string
              to:
                type: string
              number:
                type: integer
                minimum: 1        # 최소값 검증
                maximum: 10       # 최대값 검증
```

- 위의 예시처럼 커스텀 리소스를 정의한다.
- 위 사항을 `apply`하면, 이제 `FlightTicket` 리소스를 생성할 수 있다.
- 하지만, 실제 리소스가 어떤 동작을 하지는 않는다. 단지 `etcd`에 이 리소스에 대한 정보가 저장될 뿐이다.

### 커스텀 컨트롤러

- 이렇게 리소스가 생성되었을 때, 실제로 동작을 할 컨트롤러가 필요하다.
- 이러한 동작을 할 커스텀 컨트롤러는 주로 `Go` 언어로 작성(`client-go` 라이브러리 등을 사용하여)되며, 클러스터 내부에서 `Pod` 형태로 실행된다.
	- `kubernetes/sample-controller` 깃허브에 가서 클론하고 원하는 로직 작성 -> 빌드 -> 실행
	- 보통은 이러한 컨트롤러를 커스텀하고 `image` 형태로 만들어 원하는 여러 클러스터에서 `Pod` 형태로 실행한다.
- 이러한 커스텀 컨트롤러는 `etcd` 등에 접근하여 커스텀 리소스를 관리한다.
- 자세한 방법은 이 글에서는 다루지 않는다.

:::info
즉, 이러한 커스텀 리소스와 커스텀 컨트롤러 사용함으로써 쿠버네티스 자체 코드를 수정하지 않으면서 쿠버네티스 API를 확장할 수 있다.
:::

:::info
우리가 가장 많이 사용하는 `Prometheus`, `ArgoCD`, `cert-manager` 등도 이러한 오퍼레이터 패턴을 사용하여 구현된 예시이다.
:::

---
## 참고

- 내가 헷갈렸던 부분 정리

### Helm 과 Operator

- Helm과 Operator를 둘 다 어떠한 애플리케이션을 패키징하는 동일 선상인 개념이라고 오해했다.
- Helm은 여러 리소스의 정의 템플릿(yaml)을 YAML Chart로 묶어 애플리케이션을 패키징 및 배포하는 역할이다.
- 반면에, Operator는 Kubernetes에 어떠한 기능을 추가하여 확장하고 싶을 때, CRD + Custom Controller 패턴으로 확장하는 패턴이다.
- 이해하기 쉬운 예를 들어보면 아래와 같다.
	- `ArgoCD`는 보통 Helm으로 설치한다.
	- `ArgoCD`의 Helm Chart를 보면 `ArgoCD`가 사용하는 `CRD`와 해당 `CRD`를 관리하는 컨트롤러 `Pod`가 정의되어 있다.
		- 참고: https://artifacthub.io/packages/helm/argo/argo-cd
	- `ArgoCD`는 일반적으로 Helm으로 설치되고,내부적으로는 `CRD`와 먼트롤러를 통해 Operator 패턴으로 동작한다.

### 어떤 경우에 Operator를 사용하는가?

- 어떠한 경우에 오퍼레이터가 필요한지 잘 와닿지 않을 수 있다.
- 쿠버네티스가 하는 기능 대부분을 추상화하면 다음과 같다.
	- 어떠한 상태를 정의
	- 해당 상태를 컨트롤러가 지속적으로 비교
	- 해당 상태를 유지
- 이러한 쿠버네티스의 기능을 확장하여 새로운 리소스를 선언하고 해당 리소스를 정의한 방식에 따라 선언한 상태로 유지하기 위해서 오퍼레이터를 사용한다.
- 예시:
	- `cert-manager`는 오퍼레이터 패턴으로 구현되었는데, `Issuer`/`ClusterIssuer`/`Certificate`/`Order`/`Challenge` 등의 CRD를 정의하고 컨트롤러가 이 `CRD` 들을 watch(`etcd`에 기록된 리소스들을 `kube-apiserver`를 통해 watch)하며 인증서들을 갱신하는 기능을 자동화한다.
	- 추가적으로 내가 예전에 프로젝트를 진행할 때, `external-secrets-operator`를 사용하여 AWS Secret Manager에서 관리하는 비밀 값들을 가져와서 적용했었다.

---
## 레퍼런스

- https://kubernetes.io/ko/docs/concepts/extend-kubernetes/operator/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)