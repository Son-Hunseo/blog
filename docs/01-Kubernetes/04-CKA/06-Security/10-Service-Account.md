---
title: Service Account
description: 쿠버네티스 ServiceAccount의 개념, 동작 원리, 인증 방식(JWT 토큰), Pod 할당 방법 및 최신 버전별(v1.24+) 토큰 관리 변화를 상세히 설명합니다. 애플리케이션이나 봇이 쿠버네티스 API와 안전하게 통신하기 위한 ServiceAccount의 생성과 외부 접속용 토큰 발급(kubectl create token) 방법을 다룹니다.
keywords:
  - Kubernets
  - 쿠버네티스
  - ServiceAccount
  - ServiceAccount 토큰
---
---
## Service Account
### 개념

- 이전까지는 사람이 클러스터에 접근할 때, 인증서 등의 방법으로 접근하는 방식을 다루었다.
- `ServiceAccount`는 사람 외의 리소스(예: 봇, 애플리케이션)이 쿠버네티스 API와 통신할 때 사용하는 리소스이다.
- 예: 
	- `Prometheus`: 클러스터 성능 지표를 수집하기 위해 API 서버와 통신
	- `Jenkins`: 애플리케이션 배포를 위해 클러스터에 접근할 때 API 서버와 통신

:::tip
User(쿠버네티스 리소스는 아님)와 `ServiceAccount`는 각각 'Authentication(인증)' 방식은 인증서 vs 토큰으로 다르지만, 'Authorization(인가)' 단계에서는 똑같이 `Role`/`ClusterRole` - `RoleBinding`/`ClusterRoleBinding` 방식의 RBAC를 사용한다.
:::

### 인증 방식 (토큰)

- User의 경우 인증서, Static Token File 과 같은 방식으로 인증하였다.
- 하지만, `ServiceAccount`는 Token을 통해 인증한다.
	- 여기서의 Token은 JWT 기반 토큰으로, Static Token File과는 다르다.
- `ServiceAccount`는 API 서버와 통신시 HTTP 헤더에 `Bearer Token`으로 포함하여 전송한다.

### 기본 동작

- 쿠버네티스 클러스터가 생성되면 기본적으로 모든 네임스페이스에 `default`라는 이름의 `ServiceAccount`가 생성된다. (제한적인 권한)

1. 자동 할당
	- `Pod`가 생성될 때, 별도의 `ServiceAccount`를 지정하지 않는다면, `default` `ServiceAccount`가 할당된다.
		- `default`는 권한이 제한적이므로 특정 권한이 필요한 경우 별도의 서비스 어카운트를 생성해서 관련 권한에 바인딩해야한다.
2. 토큰 마운트
	- 쿠버네티스는 자동으로 토큰을 생성하여 `Pod` 내부의 `Projected Volume`에 마운트한다.
		- `Projected Volume`은 `Secret`, `ConfigMap`, `serviceAccountToken` 등의 리소스를 동일한 디렉토리에 보관하는 '`Pod` 내부 볼륨'이라고 생각하면 된다.
		- 경로:`/var/run/secrets/kubernetes.io/serviceaccount/token`

:::tip
- 토큰은 유효기간이 있는데, 이건 누가 자동갱신하나요?
- `kubelet`이 `ServiceAccount`를 감시하며, 토큰이 만료되기 전에 갱신한다.
:::

---
## 생성
### Service Account

**Imperative**

```bash
kubectl create serviceaccount dashboard-sa
```

- yaml 로 생성할 수도 있지만, 넣을 리소스가 많지 않기 때문에 그냥 위처럼 imperative하게 생성하는 것이 빠르다.

**Declarative(YAML)**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-sa
  namespace: default
automountServiceAccountToken: false
```

- 하지만, git 등으로 관리해야할 경우 yaml로 저장하는 것이 좋다.
- 만약 토큰이 자동으로 마운트되는 것을 원치않는다면 `automountServiceAccountToken: false`로 지정하면 된다. (기본값이 `true`)
	- 주로 정적 웹서버, Job 등의 경우 API 서버와의 통신이 아예 불필요하므로 이 설정을 하는 것이 보안상 좋다.

### Pod에 할당

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-dashboard-pod
spec:
  serviceAccountName: dashboard-sa  # 여기에 서비스 어카운트 이름 지정
  containers:
  - name: my-dashboard
    image: my-dashboard-image
  automountServiceAccountToken: false
```

- `Pod`에 `ServiceAccount`를 할당할 때는 `spec.serviceAccountName` 필드에 지정하면 된다.
- `automountServiceAccountToken` 옵션은 `Pod` 레벨에서도 지정 가능하다.

---
## 외부 접속을 위한 토큰 생성

- CI/CD 툴이나 외부 모니터링 도구처럼 클러스터 외부에서 접속해야 할 때는 수동으로 토큰을 생성해서 이 토큰으로 `ServiceAccount`의 권한을 가지고 클러스터에 접근해야한다.

```bash
kubectl create token <serviceAccount이름>
```

- 위 명령어로 토큰 값을 출력할 수 있다.
- 기본 유효기간은 1시간이며, `--duration` 플래그로 연장할 수 있다.

:::tip
- 근데, 외부에서 토큰을 사용할 경우 `kubelet`이 자동 갱신하지 못하는데, CI/CD 툴이나 외부 모니터링 도구를 사용할 때 위처럼 토큰을 발급받아서 사용한다면 수동으로 갱신해야하는건가?
- `AWS Secret Manager` 등의 외부 보안 볼트 시스템을 사용하여 토큰을 안전하게 보관하고, 외부 툴은 이 볼트 시스템에 접근하여 토큰을 사용한다.
	- `cron job`, `AWS Lambda` 등으로 주기적으로 클러스터에 접근하여 새로운 토큰을 발급받는다.
- 이로써 토큰 수명을 짧게 유지함 + 최소 권한 원칙을 동시에 만족시킬 수 있다.
:::

---
## 쿠버네티스 버전별 변화

| **구분**            | **~ v1.21 (과거)**             | **v1.22 ~ v1.23 (과도기)**                       | **v1.24+ (현재)**                               |
| ----------------- | ---------------------------- | --------------------------------------------- | --------------------------------------------- |
| **서비스 어카운트 생성 시** | 영구 토큰(`Secret` 객체 형태) 자동 생성됨 | 영구 토큰(`Secret`) 자동 생성됨 (하지만 파드는 이걸 안 씀)       | 영구 토큰(`Secret`) 생성 안 됨                        |
| **파드에 마운트되는 것**   | 자동 생성된 `Secret`              | **TokenRequest**로 받은 단기 토큰 (Projected Volume) | **TokenRequest**로 받은 단기 토큰 (Projected Volume) |
| **외부 접속용 토큰**     | 생성된 `Secret` 값 복사해서 사용       | 생성된 `Secret` 값 복사해서 사용                        | **`kubectl create token`** 명령어로 직접 발급         |

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)