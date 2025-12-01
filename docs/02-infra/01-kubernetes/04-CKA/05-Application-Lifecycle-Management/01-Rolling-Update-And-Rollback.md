---
title: Rolling Update & Rollback
description: 쿠버네티스(Kubernetes) Deployment Rollout의 핵심 개념과 전략을 자세히 정리합니다. Rollout과 Rolling Update 용어의 차이점, 배포 과정(최초 배포, 업그레이드, 롤백), 주요 배포 전략인 Recreate와 Rolling Update의 장단점 및 절차를 비교합니다. 또한, YAML 수정이나 kubectl set image 명령을 사용한 업데이트 방법과 kubectl rollout 관련 핵심 명령어를 안내하여 무중단 배포의 이해를 돕습니다.
keywords:
  - Kubernetes
  - Kubernetes Deployment
  - Rollout
  - Rolling Update
  - Revision
---
---
:::warning
헷갈렸던 용어 정리

**Rollout**
- 일반적으로 새로운 소프트웨어 버전, 기능, 시스템 전체를 배포하는 과정 전체를 의미하는 '포괄적인' 용어

**Rolling Update**
- 서비스 중단 없이 애플리케이션의 새로운 버전을 배포하는 '특정 Rollout 전략'
:::

## Deployment Rollout 과정

**최초 배포**
1. `Deployment`가 처음 생성되었을 때, `Rollout`이 트리거된다.
2. `Rollout`이 새로운 `ReplicaSet`을 생성한다.
3. 해당 `ReplicaSet`은 새로운 `Revision`(배포 버전)으로 기록된다.

**업그레이드**
- 애플리케이션 컨테이너 버전 등을 업데이트하면 새로운 `Rollout`이 트리거된다.
- `Rollout`이 업데이트 된 `ReplicaSet`을 생성한다.
- 업데이트 된 `ReplicaSet`은 새로운 `Revision`으로 기록한다.

**롤백**
- 기록된 이전 `Revision`으로 롤백되며, 이에 따라 이전 `ReplicaSet`이 생성된다.

---
## Deployment Rollout 전략

![rolling1](./assets/rolling1.png)

### Recreate

**상황**
- 기존에 `Pod`가 5개 존재하는 `ReplicaSet`을 가진 `Deployment`가 있다고 가정
- 새로운 버전으로 업그레이드(롤백) 하는 상황

**절차**
1. 기존 `Pod` 5개를 모두 삭제
2. 새로운 `Pod` 5개 생성

**문제점**
- 기본 `Pod`를 5개를 모두 삭제하고 새로운 `Pod`를 생성하는 사이에 <span style={{color: 'red'}}>서비스 중단</span> 발생

### Rolling Update

**상황**
- 기존에 `Pod`가 5개 존재하는 `ReplicaSet`을 가진 `Deployment`가 있다고 가정
- 새로운 버전으로 업그레이드(롤백) 하는 상황

**절차**
1. 기존 `Pod` 1개를 삭제
2. 새로운 `Pod` 1개 생성
3. 위 과정 5회 반복

**장점**
- 서비스가 중단되지 않고 무중단 배포 가능
- 이러한 장점으로 인해 `Deployment`는 <span style={{color: 'red'}}>기본 Rollout 정책</span>으로 `Rolling Update`를 사용한다.

### Recreate vs Rolling Update

![rolling2](./assets/rolling2.png)

---
## 업데이트 방법
### yaml 수정 -> apply

```yaml
# deployment-definition.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
 name: myapp-deployment
 labels:
  app: nginx
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
      image: nginx:1.7.1 # 1.7.0 -> 1.7.1
 replicas: 3
 selector:
  matchLabels:
    type: front-end       
```

```bash
kubectl apply -f deployment-definition.yaml
```

### command

```bash
kubectl set image deployment/<deployment 이름> <contaiiner 이름>=<image 이름>
```

---
## 명령어

```bash
kubectl rollout status deployment/<deployment 이름>
```

- 현재 `rollout`의 상태 확인 (몇 개의 `pod`가 혅재 업데이트 되었는지, `rollout`이 완료 되었는지 등)

```bash
kubectl rollout history deployment/<deployment 이름>
```

- `revision` 히스토리 보기

```bash
kubectl rollout undo deployment/<deployment 이름>
```

- 이전 `revision`으로 롤백

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/workloads/controllers/deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment)
- [https://kubernetes.io/docs/tasks/run-application/run-stateless-application-deployment](https://kubernetes.io/docs/tasks/run-application/run-stateless-application-deployment)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)