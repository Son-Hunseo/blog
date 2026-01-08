---
title: Taints, Tolerations
description: Kubernetes의 Taints와 Tolerations 개념, 적용 방법, Taint 효과(NoSchedule·PreferNoSchedule·NoExecute) 차이, GPU 노드 활용 전략까지 한 번에 정리한 실전 가이드입니다. Pod 스케줄링 제어가 필요한 엔지니어에게 필수 개념을 쉽게 설명합니다.
keywords:
  - Kubernetes Taints Tolerations
  - Kubernetes Pod Scheduling
  - NoSchedule NoExecute 설명
---
---
## Taints, Tolerations
### 개념

`Taint`
- 단어 뜻(오염)처럼 특정 `Node`를 오염시켜서(장벽을 만들어서) 해당 오염에 `Toleration`(면역)을 가지지 않은 `Pod`들은 들어오지 못하게 하는 옵션이다.
- `Node`에 설정된다.

`Toleration`
- 특정 `Taint`(오염)을 견딜 수 있는 `Toleration`(면역)을 가지고 있다는 표시이다.
- `Pod`에 설정된다.

### Taint effect 종류

| 효과                 | 의미                                            |
| ------------------ | --------------------------------------------- |
| `NoSchedule`       | `Toleration` 없으면 이 `Node`에 Scheduling 안 됨     |
| `PreferNoSchedule` | 가능하면 스케줄링하지 않음. 강제는 아님                        |
| `NoExecute`        | 신규 Pod 스케줄링 금지 + 기존 Pod도 `toleration` 없으면 쫓아냄 |
- `NoSchedule`의 경우 기존에 해당 `Node`에 실행되고 있던 `Pod`들이 `Toleration`이 없어도 영향을 받지 않는다. (쫓아내지 않는다 = `evict` 하지 않는다)
- 하지만, `NoExecute`의 경우 `Toleration`이 없는 기존 `Pod`들도 쫓아낸다.

### 헷갈리기 쉬운 부분

- `Taints`/`Toleration`은 `Node` 입장에서 누가 들어오면 안되는지 결정하는 기술이다.
- `Toleration`이 있다고 해서, 해당 `Taint`가 있는 `Node`에 강제로 올리는 기능이 아니다. (배치 될 '수' 있는 것이다)
	- 강제로 배치하려면 추가적으로 `Node Affinity`로 해결해야한다.

:::tip
예를 들어, GPU를 사용하는 `Pod`만 GPU가 장착된 특정 `Node`에 배치하고 싶다면, 해당 GPU `Node`에 `Taint`로 `NoSchedule`을 적용하고, 해당 `Node`에 배치하고 싶은 `Pod`들에 `Toleration`을 적용한 뒤 추가적으로 `Node Affinity`를 적용해서 강제로 배치한다.
:::

### Mater Node

- `Master Node`에는 기본적으로 일반 워크로드 `Pod`가 스케줄링되지 않는다.
- 왜냐하면 기본적으로 `Taint`가 `NoSchedule`로 설정되어있기 때문이다.

```bash
kubectl describe node <master-node> | grep Taint
# node-role.kubernetes.io/master:NoSchedule
```

---
## 적용 방법
### Taints

```bash
kubectl taint nodes <node-name> key=value:effect
```

- 문법

```bash
kubectl taint nodes node1 app=blue:NoSchedule
```

- 예시

### Tolerations (Yaml)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
spec:
  containers:
  - name: nginx-container
    image: nginx
  tolerations:
  - key: "app"
    operator: "Equal"
    value: "blue"
    effect: "NoSchedule"
```

- `spec`
	- `tolerations`
		- `app=blue:NoSchedule`라는 `taint`가 있는 `Node`에 스케줄링 될 수 있다.
- 중요한 점!!
	- `tolerations`의 모든 key의 value는 쌍따옴표 안에 들어가야한다.

:::tip
`operator` 필드의 경우 `Equal`과 `Exist`를 가질 수 있다.

위 yaml 파일을 예시로 설명하자면 `Equal`의 경우 `taint`가 정확히 `app=blue:NoSchedule`일 때만 `toleration`이 적용되어 스케줄링 될 수 있다.

하지만, `Exist`의 경우 `value`를 사용하지 않는다. 만약 `key: "app"`, `operator: "Exist"`, `effect: "NoSchedule"` 일 경우 `app=blue:NoSchedule`, `app=red:NoSchedule`, `app=green:NoSchedule` 모두에 `toleration`이 적용되어 스케줄링 될 수 있다.
:::

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)