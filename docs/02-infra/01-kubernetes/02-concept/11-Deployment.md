---
title: Deployment
description: 쿠버네티스 Deployment의 개념과 동작 원리를 이해하고, ReplicaSet을 자동으로 관리하며 롤링 업데이트와 롤백을 수행하는 방법을 YAML 예시와 함께 자세히 설명합니다.
keywords:
  - Kubernetes Deployment
  - ReplicaSet 관리
  - Rolling Update
---
---
## Deployment
### 왜 Deployment?

- 애플리케이션을 운영한다고 했을 때, 롤백이나 업데이트를 할 일이 생긴다.
- 이 경우 운영되고 있는 애플리케이션을 모두 종료했다가 다시 배포하는 과정은 서비스가 중단될 수 있으므로 좋지 않으며, 수동으로 하기에 번거롭다.
- 이러한 `Rolling Updates`, `Undo Changes`, `Pause`, `Resume Changes` 등을 기능을 갖추고 있으며, 이를 위해 `ReplicaSet`을 컨트롤하는 컨트롤러가 `Deployment`이다.

### 예시: 업데이트

`replicas: 3` 가정

1. 새로운 `ReplicaSet` 생성
2. 새로운 `ReplicaSet`에 업데이트 된 `Pod` 1개 생성
3. 기존 `ReplicaSet`에 `Pod` 1개 줄임
4. 위 과정 추가로 2회 반복
5. 기존 `ReplicaSet`은 `replicas: 0` 인 상태로 유지된다. (롤백을 위해)

### 예시: 롤백

`replicas: 3` 가정

1. 돌아가기를 원하는 시점의 `ReplicaSet`의 `replicas` 가 늘어난다.
2. 롤백되기를 원하는 시점의 `ReplicaSet`에 `Pod` 1개 생성
3. 기존 `ReplicaSet`에 `Pod` 1개 줄임
4. 위 과정 추가로 2회 반복

:::info
롤백을 위해 `replicas: 0`으로 유지되고 있는 `ReplicaSet`들은 `Deployment`의 `revisionHistoryLimit`로 최대 갯수를 관리할 수 있다. (기본 10개)
:::

---
## YAML

```yaml
# deployment-definition.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-deployment
  labels:
	app: myapp
	type: front-end
spec:
  template:
	metadata:
	  name: myapp-pod
	  labels:
		app: myapp
		type: front-end
	spec:
	  containers:
	  - name: nginx-container
	    image: nginx
  replicas: 3
  selector:
    matchLabels:
	  type: front-end
```

- `apiVersion`: `apps/v1`
- `kind`: `Deployment`
- 나머지는 `ReplicaSet` 과 정확히 같다.
- `Deployment`를 생성하였을 때, 정의된 요소와 맞는 `ReplicaSet`을 자동으로 생성한다.
	- 이에 `ReplicaSet`을 yaml로 정의해서 생성하는 경우는 거의 없고, `Deployment`를 생성해서 `ReplicaSet`이 자동으로 생성되게 한다.

:::info
어떤 `Deployment`가 어떤 `ReplicaSet`을 관리할지에 대한 정보는 내부적으로 `ReplicaSet`의 메타데이터인 `ownerReferences` 데이터로 구별된다. (쿠버네티스의 모든 "상위 컨트롤러 -> 하위 리소스" 관계는 `ownerReferences` 데이터로 구별된다 즉,`Pod`가 어떤 `ReplicaSet`에 관리되는지도 마찬가지)
:::

```bash
kubectl create -f deployment-definition.yaml
```

- `Deployment` 생성

```bash
kubectl get deployment
```

- 생성된 `Deployment` 확인

```bash
kubectl get replicaset
```

- `Deployment` 생성으로 인해 생성도니 `ReplicaSet` 확인

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/workloads/controllers/deployment/](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [https://kubernetes.io/docs/tutorials/kubernetes-basics/deploy-app/deploy-intro/](https://kubernetes.io/docs/tutorials/kubernetes-basics/deploy-app/deploy-intro/)
- [https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/](https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/)
- [https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)