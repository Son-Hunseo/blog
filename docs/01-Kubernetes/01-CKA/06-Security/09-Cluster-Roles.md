---
title: Cluster Roles
description: Kubernetes RBAC의 핵심인 ClusterRole과 ClusterRoleBinding의 개념 및 사용법을 명확히 이해하세요. 네임스페이스 리소스와 클러스터 리소스의 차이점을 배우고, ClusterRole을 사용하여 클러스터 전체에 걸친 권한을 효과적으로 관리하는 방법을 YAML 예시와 함께 정리했습니다.
keywords:
  - Kubernetes
  - 쿠버네티스
  - ClusterRole
  - ClusterRoleBinding
  - Namespaced Resource
  - Cluster Scoped Resource
---
---
## 범위별 리소스의 종류
### 네임스페이스 범위 리소스 (Namespaced Resource)

```bash
kubectl api-resources --namespaced=true
```

- 특정 네임스페이스 내에 생성되고 격리되는 리소스이다.
- 네임스페이스를 지정하지 않으면 `default` 네임스페이스에 생성된다.
- 예시
	- `Pod`, `Deployment`, `Service`, `Job`, `ConfigMap`, `Secret`, `Role`, `RoleBindings`



### 클러스터 범위 리소스 (Cluster Scoped Resource)

```bash
kubectl api-resources --namespaced=false
```

- 특정 네임스페이스에 속하지 않고 클러스터 전체에 존재하는 리소스이다.
- 예시
	- `Node`, `PersistentVolumes(PV)`, `Namespace`, `ClusterRoles`, `ClusterRoleBindings`, `CertificateSigningRequests`

---
## Cluster Role
### 개념

- `ClusterRole`은 `Role`과 유사하지만, 클러스터 범위의 리소스(ex: `Node`)에 대한 권한을 정의할 때 사용한다.
- 예:
	- 노드 생성, 삭제, 조회
	- PV 생성, 삭제

### YAML

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-administrator
rules:
- apiGroups: [""] # ""는 core API 그룹을 의미
  resources: ["nodes"]
  verbs: ["get", "list", "delete", "create"]
```

---
## Cluster Role Binding
### 개념

- `ClusterRoleBinding`은 권한을 사용하는 User와 `ClusterRole`을 연결해주는 역할을 한다.
- 이를 통해 특정 User에게 클러스터 범위 리소스에 대한 권한을 부여할 수 있다.

### YAML

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin-role-binding
subjects:
- kind: User
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-administrator
  apiGroup: rbac.authorization.k8s.io
```

---
## 헷갈릴 수 있는 부분

- `ClusterRole`은 반드시 클러스터 범위 리소스에만 사용해야 하는 것은 아니다.
- 예를들어, `Role`에 네임스페이스를 지정하지 않고 `Pod`에 대한 조회 권한을 부여했다면, 이는 `default` 네임스페이스에 존재하는 `Pod`만 조회할 수 있다.
- 하지만, 전체 네임스페이스에 대한 `Pod` 조회 권한을 주고싶다면 이는`ClusterRole`에서 `Pod` 조회 권한을 주면 된다.

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/access-authn-authz/rbac/#role-and-clusterrole](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#role-and-clusterrole)
- [https://kubernetes.io/docs/reference/access-authn-authz/rbac/#command-line-utilities](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#command-line-utilities)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)