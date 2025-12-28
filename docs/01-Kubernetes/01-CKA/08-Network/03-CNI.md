---
title: 쿠버네티스에서의 CNI
description: 쿠버네티스에서 CNI 플러그인은 누가, 어떻게 호출할까요? 컨테이너 런타임(Containerd, CRI-O)의 역할부터 CNI 바이너리 경로(/opt/cni/bin) 및 설정 파일(/etc/cni/net.d)의 위치까지, K8s 네트워크 네임스페이스 생성 과정을 쉽고 정확하게 정리해 드립니다.
keywords:
  - 쿠버네티스 CNI
  - CNI 동작 원리
  - 컨테이너 런타임 CNI 호출
---
---
:::info
CNI에 대한 사전 지식 필요 -> 참고: [CNI](../../../15-Network/04-CNI.md)
:::

---
## 쿠버네티스의 역할

- `Pod`를 생성할 때 쿠버네티스에서는 `Pod`의 네트워크 네임스페이스를 생성해야한다. (네트워크 네임스페이스 생성)
- 그리고 CNI 플러그인을 호출하여 해당 네임스페이스를 네트워크에 연결해야한다. (CNI 플러그인 호출)
- 그러면 쿠버네티스 컴포넌트 중에서 CNI 플러그인을 호출하는 주체는 누구일까?
- CNI 플러그인을 호출하는 주체는 컨테이너 런타임(예: `Containerd`, `CRI-O`)이다.
	- 컨테이너가 생성된 직후 네트워크 설정이 필요하기 때문이다.
	- 정확하게는 `kubelet`->CRI -> 컨테이너 런타임 -> CNI 플러그인
- 그럼 컨테이너 런타임은 CNI 플러그인을 어떻게 호출할까?

---
## CNI 플러그인 위치 및 설정

- 컨테이너 런타임은 아래 경로들을 통해 플러그인을 찾고 설정한다.
- 플러그인 실행 파일(바이너리) 경로: `/opt/cni/bin`
	- 해당 경로에 모든 CNI 플러그인(`bridge`, `dhcp`, `calico` 등)의 실행 파일(바이너리)이 모여있다.
- 설정 파일 경로: `/etc/cni/net.d`
	- 컨테이너 런타임은 이 경로에서 어떤 플러그인을 사용할지 결정한다.
	- 만약 여러 개의 설정 파일이 존재할 경우, 알파벳 순서로 결정한다.
		- 그래서 보통 `10-calico.conflist` 이렇게 이름 앞에 숫자를 붙여 우선순위를 관리한다.

---
## 레퍼런스

- https://kubernetes.io/ko/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)