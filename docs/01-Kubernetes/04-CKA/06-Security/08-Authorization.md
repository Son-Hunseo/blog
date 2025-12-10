---
title: Authorization
description: Kubernetes 클러스터 인가(Authorization)의 핵심 개념과 종류(Node, RBAC, ABAC, Webhook)를 상세히 설명합니다. 표준 인가 방식인 RBAC의 Role 및 RoleBinding 구조와 함께, API 서버의 --authorization-mode 설정을 통한 인가 메커니즘 체이닝 방식을 이해하고 관리할 수 있습니다.
keywords:
  - Kubernetes
  - 쿠버네티스
  - Kubernetes Authorization
  - 쿠버네티스 인가
  - RBAC
  - ABAC
  - Webhook Authorization
---
---
## Authorization in Kubernetes

- 쿠버네티스 클러스터에 대한 접근 자체를 관리하는 `Authentication`(주로 인증서 관련)을 이전에 다뤘었다.
- `Authorization`은 클러스터에 접근한 대상(유저, 객체)가 구체적으로 무엇을 할 수있는가(무엇을 허용하는가)를 정의하는 것이다.
- 예시 
	- 개발자가 쿠버네티스 클러스터에서 애플리케이션을 배포할 수는 있어야 하지만, 클러스터의 노드를 삭제하거나 네트워크/스토리지 설정을 변경해서는 안되므로 적절히 인가를 설정해야 한다.
	- 서드파티 애플리케이션도 작업을 수행하는 데 필요한 최소한의 권한만 가져야한다.
	- 여러 팀이 클러스터를 공유할 때, 해당 팀의 구성원은 해당 팀의 네임스페이스에만 접근하도록 제한해야 한다.

---
## 쿠버네티스 Authorization(인가) 종류
### Node

![authorization1](./assets/authorization1.png)

- 대상: `kubelet`
- 목적: 
	- 노드에서 실행되는 `kubelet`이 '자신이 관리하는 리소스에만 접근'하도록 '최소 권한 원칙'을 적용하기 위함
- 작동 방식: 
	- 요청을 보낸 주체(노드 혹은 `kubelet`)가 '자신이 관리하는 리소스'에 대한 작업을 요청할 때만 접근을 허용한다.
	- 즉, NodeA에서 PodA만 실행되고있다면, NodeA의 `kubelet`은 PodA에 대한 권한만 가진다. PodB에 대한 요청은 거부된다. (그럴 일도 없긴 하지만, 최소 권한 원칙)

### ABAC (레거시)

![authorization2](./assets/authorization2.png)

```json
{
  "apiVersion": "abac.authorization.kubernetes.io/v1beta1",
  "kind": "Policy",
  "spec": {
    "user": "alice",
    "namespace": "*",
    "resource": "*",
    "readonly": true
  }
}
```

- '사용자'나 '그룹'을 '권한 세트'와 직접 연결하는 방식이다.
- 방식: 
	- JSON 형식의 Policy 파일을 생성하여 API 서버에 전달해야한다.
	- API 서버의 yaml에 Policy 파일 경로 지정하고 재시작 필요 (`--authorization-policy-file=abac-policy.json`)
- 예시: 
	- `Dev User`(개발자)는 `Pod`를 조회, 생성, 삭제할 수 있다는 Policy를 정의한다.
- 단점:
	- 관리가 어렵다. 보안 정책을 변경하거나 사용자를 추가할 때마다 파일을 수동으로 수정하고 API 서버를 재시작해야한다.
	- 그래서 지금은 `RBAC`가 표준으로 사용된다.

### RBAC (표준)

![authorization3](./assets/authorization3.png)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: developer
  name: pod-manager
rules:
- apiGroups: [""] # ""는 코어 API 그룹을 의미 (Pod 등이 포함됨)
  resources: ["pods"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: developer
  name: assign-pod-manager-to-jane
subjects:
- kind: User
  name: jane # 실제 사용자 이름
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-manager # 위에서 만든 Role 이름
  apiGroup: rbac.authorization.k8s.io
```

- 사용자와 권한을 직접 연결하는 대신 역할(`Role`)을 정의하고 `RoleBinding`으로 연결한다.
- 예시:
	1. 역할 생성: 개발자를 위한 `Developer` 역할(`Role`)을 만들고 필요한 권한 세트를 정의한다.
	2. 연결: 모든 개발자 사용자를 `Developer` 역할에 연결한다. (`RoleBinding`)
	3. 이외에 관리자나 보안 담당자의 경우 각각 `Admin`, `Security` 역할을 만들어 연결한다.
- 장점:
	- 권한 변경이 필요할 때 역할(`Role`)만 수정하면, 해당 역할에 연결된 모든 사용자에게 즉시 반영된다.

### Webhook

![authorization4](./assets/authorization4.png)

```yaml
apiVersion: v1
kind: Config
clusters:
- name: my-remote-authorizer
  cluster:
    server: https://auth.example.com/authorize # 외부 인증 서버 주소
    certificate-authority: /path/to/ca.pem
users:
- name: api-server
  user:
    client-certificate: /path/to/client.crt
    client-key: /path/to/client.key
contexts:
- context:
    cluster: my-remote-authorizer
    user: api-server
  name: webhook
current-context: webhook
```

- Open Policy Agent와 같은 서드파티 서비스에 권한 확인을 맡길 때 사용한다.
- 예시:
	- (Open Policy Agent는 모든 설정이 되어있다고 가정)
	- Webhook 설정파일(`webhook-config.yaml`) 작성
	- API 서버 yaml 파일에 `--authorization-webhook-config-file=webhook-config.yaml` 옵션으로 지정한다.

:::info
Authorization 종류에는 `Always Allow`/`Always Deny`도 있다. (총 6개)
:::

---
## Authorization Mode 설정

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --advertise-address=192.168.0.1
    - --allow-privileged=true
    - --authorization-mode=Node,RBAC
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --enable-admission-plugins=NodeRestriction
    - --enable-bootstrap-token-auth=true
    - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
    - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
    - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
    - --etcd-servers=https://127.0.0.1:2379
    - --kubelet-client-certificate=/etc/kuberne
```

- `kube-apiserver`의 yaml 파일에서 `--authorization-mode`에 설정한다.
- 지정을 하면 이러한 인가 메커니즘이 chaining되면서 순서대로 동작한다.
	- 위 예시의 경우 Node -> RBAC 순서

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/access-authn-authz/authorization/](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)