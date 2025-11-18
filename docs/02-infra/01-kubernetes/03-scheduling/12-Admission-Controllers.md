---
title: Admission Controllers (2025 추가)
description: Kubernetes Admission Controller는 API Server로 들어오는 요청을 검증·수정·차단하여 클러스터 보안과 정책 준수를 강화하는 핵심 기능이다. 최신 태그 금지, root 권한 방지, 기본 StorageClass 자동 지정 등 다양한 정책을 구현하며, 바이너리 실행 방식과 kubeadm 환경 모두에서 활성화할 수 있다. 본 문서는 Admission Controller의 개념, 활성화 방법, 스케줄러와의 연관성을 자세히 설명한다.
keywords:
  - Kubernetes Admission Controller
  - Admission Controller 활성화
---
---
## Admission Controller
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
### 바이너리

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
--enable-admission-plugins=NodeRestriction, # 이 부분이 중요
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
    - --enable-admission-plugins=NodeRestriction, # 이 부분이 중요
    image: k8s.gcr.io/kube-apiserver-amd64:v1.11.3
    name: kube-apiserver
```

- 예시이므로 명령어 본인 환경에 맞게 변경해서 사용

---
## Admission Controller를 Scheduler 주제에서 다루는 이유

- `Admission Controller`는 스케줄링 과정의 핵심인 `Pod`에 직접 접근을 하고, 결과적으로 스케줄러가 어떤 `Node`를 선택하게 만드는 구조를 결정하는 전처리 역할을 하기 때문


---
## 레퍼런스

- https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)