---
title: 쿠버네티스 기본 모니터링
description: 쿠버네티스 모니터링이 왜 중요한지, 어떤 리소스를 추적해야 하는지, Heapster·Metrics Server 등 기본 제공 모니터링 도구의 특징과 한계를 상세히 정리했습니다. Metrics Server 설치 방법부터 kubectl top 명령어 활용까지, Kubernetes 메트릭 수집 기초를 이해하고 모니터링 아키텍처를 구축하는 데 필요한 핵심 내용을 제공합니다.
keywords:
  - Kubernetes 모니터링
  - Heapster
  - Metrics Server
---
---
## 왜 쿠버네티스를 모니터링 해야할까?

쿠버네티스에서는 다음과 같은 리소스 사용량을 모니터링해야한다.

**Node 수준**
- 전체 노드 숫
- 각 노드의 상태(헬스 체크)
- CPU, 메모리 사용량
- 네트워크/디스크 I/O

**Pod 수준**
- Pod 수
- 각 Pod의 CPU / 메모리 사용량

그런데 ,쿠버네티스에는 기본적으로 완전한 모니터링 솔루션이 내장되어있지 않다. 이에 별도의 도구를 사용해야한다.
- ex: `Prometheus`, `Elastic Stack`, `Datadog`, `Dynatrace`

---
## 쿠버네티스 빌트인 모니터링 프로젝트
### Heapster

- 초기 쿠버네티스 모니터링 프로젝트
- `Node`/`Pod` 메트릭 수집 및 분석 가능
- 지금은 Deprecated

### Metrics Server

- Heapster의 경량화 버전
- HPA / VPA /`kubectl top` 명령 등에 필요한 실시간 메트릭 제공
- 그러나, 메모리에만 저장 -> 과거 데이터 조회 불가
- 작동방식
	- 모든 노드의 `kubelet`에서 `Metrics Server`로 전달한다. 
	- `kubelet`은 내부적으로 `cAdvisor`를 포함하고있으며 `cAdvisor`이 `Pod`의 CPU / 메모리 / 네트워크 사용량을 수집하고 `Kubelet` API로 노출시킨다.


---
## Metrics Server 설치 방법 (하지만, 외부 솔루션 추천!)
### 설치

```bash
git clone https://github.com/kubernetes-incubator/metrics-server.git
```

- GitHub Repo 클론

```bash
kubectl create -f metrics-server/deploy/1.8+/
```

- Metrics Server 배포

### 메트릭 조회

**Node 단위**

```bash
kubectl top node
```

**Pod 단위**

```bash
kubectl top pod
```

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)