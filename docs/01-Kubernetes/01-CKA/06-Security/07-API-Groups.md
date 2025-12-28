---
title: API Groups, kubectl proxy
description: Kubernetes 클러스터와 상호작용하는 핵심 경로인 API 그룹(Core, Named)의 구조와 주요 리소스를 상세히 설명하고, 인증 없이 API 서버에 편리하게 접근할 수 있도록 돕는 kubectl proxy의 사용법 및 네트워킹을 담당하는 kube-proxy와의 차이점을 명확히 정리합니다.
keywords:
  - Kubernetes
  - 쿠버네티스
  - API Groups
  - Core Group
  - Named Group
  - kubectl proxy
  - kube-proxy vs kubectl proxy
---
---
## API Groups
### Kubernetes API 그룹

![api-group1](assets/api-group1.png)

- 우리가 `kubectl`을 사용하던, 직접 REST API를 호출하던, 클러스터와 상호작용하는 모든 작업은 Kubernetes API를 통해서 이루어진다.
- 이러한 Kubernetes API 는 목적에 따라 여러 그룹으로 나뉜다.
	- `/version`: 클러스터 버전 확인
	- `/metrics`, `/healthz`: 클러스터 상태 모니터링
	- `/logs`: 서드파티 로깅 애플리케이션 통합 용도
- 여기서 클러스터의 기능을 담당하는 API는 크게 `Core`그룹(`/api`)과 `Named`그룹(`/apis`)로 나뉜다.

### Core Group

![api-group2](assets/api-group2.png)

- 특징: `Kubernetes`의 가장 핵심적이고 오래된 기능들이 포함된다.
- API 경로: `/api/v1` (보통 `v1`이라고 불림)
- 포함된 리소스 예시:
    - `Namespaces`
    - `Pods` 
    - `ReplicationControllers`
    - `Events` 
    - `Endpoints`
    - `Nodes`
    - `Bindings`
    - `PersistentVolumes` (PV), `PersistentVolumeClaims` (PVC)
    - `ConfigMaps`, `Secrets`
    - `Services`


### Named Group

![api-group3](assets/api-group3.png)

- 특징: 더 자세히 분류되어 있으며 새로운 기능들은 대부분 이 그룹을 통해 제공된다.
- API 경로: `/apis`
- 주요 그룹 및 리소스 예시:
    - `/apps`:
        - `Deployments` 
        - `ReplicaSets` 
        - `StatefulSets` 
    - `/networking.k8s.io`:
        - `NetworkPolicies` 
    - `/certificates.k8s.io`:
        - `CertificateSigningRequests` 
    - 그 외 `/storage`, `/authentication`, `/authorization` 등의 다양한 그룹 존재한다.

### Verbs

- 각 API 그룹 아래에는 리소스가 있고, 각 리소스에 대해 수행할 수 있는 `Verbs`가 정의되어 있다.
- Verbs 예시:
    - `list` (목록 조회)
    - `get` (단일 정보 조회)
    - `create` (생성)
    - `delete` (삭제)
    - `update` (수정)
    - `watch` (변경 감지)

:::tip
- Kubernetes API 레퍼런스 문서를 보면 각 오브젝트의 그룹 정보를 확인할 수 있다.
	- 예: Deployment를 선택하면 그룹이 `apps/v1`임을 확인 가능
:::

---
## kubectl proxy
### 왜?

```bash
curl https://kube-apiserver:6443/apis \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  --cacert /path/to/ca.crt
```

- `kubectl`을 사용한다면, `KubeConfig`를 통해서 인증 정보 옵션들을 편하게 생략할 수 있지만, `curl`로 요청을 하거나, 다른 워크로드에서 API를 호출해야하는 경우 위처럼 귀찮은 인증정보 옵션들을 붙여줘야한다.

```bash
kubectl proxy
```

```bash
curl http://127.0.0.1:8001/apis
```

- 이 때, `kubectl proxy` 라고 명령어를 입력하면, 로컬 포트 8001에서 사용자의 `KubeConfig`로 인증 절차를 대신해주는 프록시 서버가 열린다.
- 이후 해당 프록시 서버로 요청을 보내면 편하게 API 요청을 보낼 수 있다.

### `kube-proxy` vs `kubectl proxy`

| **구분**            | **역할**       | **설명**                                                        |
| ----------------- | ------------ | ------------------------------------------------------------- |
| **kube-proxy**    | **네트워킹 담당**  | 클러스터 내의 **Pod와 Service 간의 연결**을 가능하게 함 (각 노드에서 실행됨)           |
| **kubectl proxy** | **HTTP 프록시** | 로컬에서 **API 서버에 쉽게 접근**하기 위해 `kubectl` 유틸리티가 생성하는 HTTP 프록시 서비스 |

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/overview/kubernetes-api/](https://kubernetes.io/docs/concepts/overview/kubernetes-api/)
- [https://kubernetes.io/docs/reference/using-api/api-concepts/](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [https://kubernetes.io/docs/tasks/extend-kubernetes/http-proxy-access-api/](https://kubernetes.io/docs/tasks/extend-kubernetes/http-proxy-access-api/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)