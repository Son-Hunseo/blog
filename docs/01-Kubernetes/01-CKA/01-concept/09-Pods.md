---
title: Pods
description: 쿠버네티스에서 가장 작은 배포 단위인 Pod의 개념과 역할을 정리합니다. Pod와 컨테이너의 관계, 다중 컨테이너 구성 예시, 트래픽 증가 시 스케일링 방식 등을 명확하게 설명한 가이드입니다.
keywords:
  - 쿠버네티스 Pod
  - Pod와 컨테이너 관계
  - Kubernetes 기본 개념
---

---
## Pod란?
 
- Kubernetes는 컨테이너를 워커 노드에 직접 배포하지 않는다.
- Kubernetes에서 컨테이너는 `Pod`라는 Kubernetes 객체로 캡슐화된다.
- `Pod`는 쿠버네티스에서 생성할 수 있는 가장 작은 객체이다.
- `Pod`는 애플리케이션의 단일 인스턴스이다.

---
## Pod와 컨테이너

- 일반적으로 컨테이너와 `Pod`는 1대1 관계이지만, `Pod`에 반드시 컨테이너가 하나만 존재해야하는 것은 아니다.
	- 예시: 주 컨테이너는 애플리케이션 실행, 보조 컨테이너가 로그 수집. 이 2가지 컨테이너가 하나의 `Pod`를 구성하는 경우
- 하지만, 대부분의 경우 `Pod`와 컨테이너는 1대1 관계로 사용하며, 위와같은 경우에도 따로 분리하는 경우가 대부분이다. 이에 1대1 관계라고 보아도 무방하다.

:::info
애플리케이션의 트래픽이 증가할 경우, 우선 `Pod`를 추가하여 여러 `Pod`에 로드밸런싱한다. 이후 트래픽이 더 증가하여 해당 노드에서 감당하기 힘든 상황이 되었을 경우 노드를 추가하며 `Pod`들이 여러 노드에 분산되어 배치된다.

cf) 이 때, `Service`가 `Deployment`가 관리하는 여러개의 `Pod`로 트래픽을 분산하는 것은 L4 로드밸런싱이다.
:::

---
## 명령어 예시

```bash
kubectl run nginx --image nginx
```

- `Nginx` `Pod`를 생성하고 배포하는 명령어

```bash
kubectl get pods
```

- `Pod` 목록을 얻는 명령어

```bash
kubectl describe pod <pod-name>
```

- `Pod`에 대한 자세한 정보를 보는 명령어

---
## YAML

```yaml
# pod-definition.yml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
  labels:
    app: myapp
    type: front-end
spec:
  containers:
  - name: nginx-container
    image: nginx  
```

- `apiVersion`(String): 객체를 생성하는데 사용하는 Kubernetes API 버전
	- `Pod` - `v1` / `Service` - `v1` / `ReplicaSet` - `apps/v1` / `Deployment` - `apps/v1`  등
- `kind`(String): 생성하려는 객체의 유형
- `metadata`(Dictionary): 이름, 라벨과 같은 개체를 나타내는 데이터
	- 와야하는 값들이 정해진 `Dictionary` 형태
	- `name`(String): 이름을 나타내는 문자열
	- `label`(Dictionary): 
		- 원하는대로 key와 value를 가질 수 있다. (필요에 따라 key, value 추가 가능)
		- 예를 들어, 수백개의 프론트엔드, 백엔드 pod가 있다고 했을 때, `label`에 `type`를 지정해두면 필터링하기 편하다.
	- 원하는 값들을 넣을 수 있는 영역은 `metadata`뿐이다.
- `spec`(Dictionary): 객체와 관련된 추가 정보들
	- 객체마다 이 하위 항목은 다를 수 있으므로 해당 객체의 documentation을 참조해서 작성해야한다.
	- `containers`(List/Array):
		- List/Array인 이유는 Pod가 여러 컨테이너를 가질 수 있기 때문이다.
		- `-` 는 List/Array 항목을 나타내며, Dictionary 타입이다.
			- `name`(String): 컨테이너의 이름
			- `image`(String): 이미지의 이름 (위의 경우 Docker Hub에 있는 이미지의 이름을 뜻함)
				- Docker Hub에 있는 이미지가 아닐 경우 전체 경로를 모두 작성해야함

```bash
kubectl create -f pod-definition.yml
```

- 위 명령어로 작성한 yaml에 맞는 `Pod`를 생성한다.
- `kubectl apply -f pod-definition.yml` 도 정확히 똑같이 동작한다.


:::tip
Yaml에서 Indentation 의 경우 2칸을 띄우던, 4칸을 띄우던 더 많은 칸을 띄우던 상관없지만, 같은 계층의 요소들이 띄워쓰기 갯수가 다르면 안된다.

일반적로는 공백 2칸을 사용하며 이를 추천한다.
:::


---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/workloads/pods/pod/](https://kubernetes.io/docs/concepts/workloads/pods/pod/)
- [https://kubernetes.io/docs/concepts/workloads/pods/pod-overview/](https://kubernetes.io/docs/concepts/workloads/pods/pod-overview/)
- [https://kubernetes.io/docs/tutorials/kubernetes-basics/explore/explore-intro/](https://kubernetes.io/docs/tutorials/kubernetes-basics/explore/explore-intro/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)