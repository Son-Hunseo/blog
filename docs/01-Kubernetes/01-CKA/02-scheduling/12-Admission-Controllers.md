---
title: Admission Controllers (2025 추가)
description: Kubernetes Admission Controller는 API Server로 들어오는 요청을 검증·수정·차단하여 클러스터 보안과 정책 준수를 강화하는 핵심 기능이다. 최신 태그 금지, root 권한 방지, 기본 StorageClass 자동 지정 등 다양한 정책을 구현하며, 바이너리 실행 방식과 kubeadm 환경 모두에서 활성화할 수 있다. 본 문서는 Admission Controller의 개념, 활성화 방법, 스케줄러와의 연관성을 자세히 설명한다.
keywords:
  - Kubernetes Admission Controller
  - Admission Controller 활성화
  - Kubernettets Admission Webhook
---
---
## Admission Controller

:::warning
- 스케줄링 섹션에 있어서 헷갈릴 수 있는데, Custom Scheduler나 Scheduler Profile은 어디까지나 "`Pod` 스케줄링"을 컨트롤하는 역할이고, 
- 이 글에서 다루는 Admission Controller는 스케줄링과정 이전에 "`kube-apiserver`로 들어오는 요청" 자체를 검증, 수정, 차단하는 역할이다.
:::

### 왜 Admission Controller?

- 우리가 `kubectl`로 `Pod` 생성과 같은 요청을 보내면 요청은 Kubernetes API Server로 전달되고 다음과 같은 단계를 거친다.

1. Authentication (인증)
	- 요청을 보낸 사용자가 쿠버네티스 클러스터에 접근할 수 있는 유저인지 확인 (`kubeconfig` 내부 인증서 사용)
2. Authorization (인가)
	- 해당 사용자가 그 작업을 수행할 권한이 있는지 `RBAC`(Rule Based Access Control) 규칙으로 판단한다.
3. `Etcd` 에 반영

- 위 과정으로는 '`latest`이미지 태그 금지', 'root 권한 금지'같은 세부 정책을 구현할 수 없다.
- 이러한 API 요청 자체를 검증, 수정, 거부하는 기능이 `Admission Controller`이다.

### 개념

- API Server로 들어오는 요청을 가로채 검증하거나 수정하거나 별도 작업을 수행하는 플러그인이다.
- 즉, `RBAC` 이후 단계에서 클러스터 보안과 정책 준수 강화를 위해 작동하는 필터라고 볼 수 있다.
- 예시
	- `latest` 태그 금지
	- root 사용자 실행 금지
	- `PVC`에 기본 `StorageClass` 자동 추가

### 종류

**Validating Admission Controller**
- 요청을 Validate하여 허용/거부만 한다.
- 예: `NamespaceExits`(Deprecated) - 네임스페이스가 없으면 요청을 거부


**Mutating Admission Controller**
- 요청을 Mutate(변경)한다.
- 예: `DefaultStorageClass` - `PVC` 생성 시 `StorageClass` 없으면 `StorageClass` 자동 추가
- cf) Validate, Mutate 둘 다 하는 컨트롤러도 존재한다.


:::tip
**실행 순서**
- Mutate Admission Controllerr -> Validate Admission Controller 순서로 실행된다.
- 왜? -> Mutate에서 바뀐 내용이 Validate 시점에 반영되어야하기 때문이다.
:::

### 대표 예시 (기본 제공)

- `AlwaysPullImages`
	- `Pod` 생성 시 항상 이미지를 다시 pull 하도록 강제
- `DefaultStorageClass`
	- `PVC`에서 `StorageClass` 미지정 시 자동으로 기본 `StorageClass` 추가 
- `EventRateLimit`
	- API Server로의 이벤트 요청량 제한
- `NamespaceExists` (Deprecated -> `NamespaceLifecycle` 로 통합됨)
	- 존재하지 않는 namespace에 객체 생성 요청 시 거부

---
## Admission Controller 활성화 방법
### Manual Setup으로 설치했을 경우

```bash
sudo nano /etc/systemd/system/kube-apiserver.service
```

```bash
ExecStart=/usr/local/bin/kube-apiserver \\
	--advertise-address=${INTERNAL_IP} \\
	--allow-privileged=true \\
	--apiserver-count=3 \\
	--authorization-mode=Node, RBAC \\
	--bind-address=0.0.0.0 \\
	--enable-swagger-ui=true \\
	--etcd-servers=https://127.0.0.1:2379 \\
	--event-ttl=1h \\
	--runtime-config=api/all \\
	--service-cluster-ip-range=10.32.0.0/24 \\
	--service-node-port-range=30000-32767 \\
	--v=2
	--enable-admission-plugins=NodeRestriction, # 이 부분에 사용할 Admission Controller들 추가
```

```bash
sudo systemctl daemon-reload  
sudo systemctl start kube-apiserver  
sudo systemctl enable kube-apiserver
```

- 위 명령어로 `kube-apiserver` 바이너리 실행 (예시이므로 명령어 본인 환경에 맞게 변경해서 사용)

### kubeadm 환경

```yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --authorization-mode=Node, RBAC
    - --advertise-address=${INTERNAL_IP}
    - --allow-privileged=true
    - --enable-bootstrap-token-auth=true
    - --enable-admission-plugins=NodeRestriction, # 이 부분에 사용할 Admission Controller들 추가
    image: k8s.gcr.io/kube-apiserver-amd64:v1.11.3
    name: kube-apiserver
```

---
## Admission Webhook
### 개념

- 기존에 정의되어있는 플러그인들이 아니라 커스텀 `Admission Webhook`을 사용하고 싶을 경우 사용하는 방법이다.
- `Webhook Server`로 요청(`AdmissionReview`)을 보내서 `Webhook Server`에서 요청을 처리하고 결과(Validate의 경우 true/false, Mutate의 경우 바뀐 `patch`)를 받는 방식이다.
	- `Webhook Server`의 경우 클러스터 밖에 놓든, 안에(`Deployment`+`Service`) 놓든 상관없다. 또한, 요청을 받고 가공해서 응답할 수 있는 API 서버라면, `Spring`으로 개발하든 `FastAPI`로 개발하든 `Go`로 개발하든 상관없다.

### 동작 흐름

1. 사용자가 요청(`Pod`, `PVC` 등) 생성
2. 기본 `Mutating Controllers` 실행
3. 기본 `Validating Controllers` 실행
4. Webhooks(Mutating → Validating) 실행
5. `Webhook Server`가 JSON 요청(`AdmissionReview`)을 받고 판단 후 응답
6. 허용되면 etcd로 저장되고 객체 생성, 거부되면 에러 메시지 출력

### 구성 방법

1. `Webhook Server` 배포
2. 클러스터에 `Webhook Configuration` 적용

**예시: `Webhook Server`**

```java
// Spring Boot Webhook Server 예시
@RestController
@RequestMapping("/api/v1/webhook")
public class AdmissionReviewController {

    // Validating Webhook 요청 처리
    @PostMapping("/validate/pods")
    public AdmissionReview validatePods(@RequestBody AdmissionReview review) {
        // Pod 검증 로직...
    }

    // Mutating Webhook 요청 처리
    @PostMapping("/mutate/deployments")
    public AdmissionReview mutateDeployments(@RequestBody AdmissionReview review) {
        // Deployment 변경 로직...
    }
}
```

**예시: `Webhook Configuration`**

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pod-validator-config
webhooks:
- name: pod-validation-webhook.example.com
  clientConfig:
    service:
      namespace: default
      name: webhook-service
      path: "/api/v1/webhook/validate/pods"
      port: 443
    caBundle: <<YOUR_CA_BUNDLE_BASE64_HERE>> 
  rules:
  - operations: ["CREATE", "UPDATE"] # Pod 생성 및 수정 시 호출
    apiGroups: [""] # Core API Group (Pod, Service, Namespace 등)
    apiVersions: ["v1"]
    resources: ["pods"] # Pod 리소스에 대해 동작
  sideEffects: None # 이 웹훅은 클러스터 상태를 변경하지 않음
  admissionReviewVersions: ["v1", "v1beta1"] # 지원하는 AdmissionReview API 버전
  timeoutSeconds: 5 # 타임아웃 설정 (최대 30초)
```

- `apiVersion`: `admissionregistration.k8s.io/v1`
- `kind`: `ValidatingWebhookConfiguration` / `MutatingWebhookConfiguration`
- `metadata`
- `webhooks`
	- `name`: 웹훅 이름 작성 (FQDN 형식 권장)
	- `clientConfig`
		- `service`: 외부 서버라면 여기에 `service` 대신 `url` 사용
			- `namespace`: Webhook Server Service가 있는 네임스페이스
			- `name`: Webhook Server`Service` 이름
			- `path`: Webhook 서버로 보내야하는 요청 경로
			- `port`
		- `caBundle`: API 서버가 웹훅 서버의 TLS 인증서를 신뢰하도록 하는 CA 인증서의 Base64 인코딩 값 (필수 - https 만 가능학고, http 불가능)
	- `rules`: 여기에 규칙 설정
		- 자세한 옵션 https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#what-are-admission-webhooks 참조

---
## Admission Controller를 Scheduler 주제에서 다루는 이유

- `Admission Controller`는 스케줄링 과정의 핵심인 `Pod`에 직접 접근 및 수정을 하고, 결과적으로 스케줄러가 어떤 `Node`를 선택하게 만드는 구조를 결정하는 전처리 역할을 하기 때문


---
## 레퍼런스

- https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)