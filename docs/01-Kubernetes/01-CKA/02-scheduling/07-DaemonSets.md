---
title: DaemonSets
description: Kubernetes 클러스터 내의 모든 노드에 단 하나의 Pod를 배포하고 관리하는 워크로드 컨트롤러인 DaemonSet의 개념, 사용 사례, 그리고 스케줄링 원리를 알아봅니다. 노드 레벨 모니터링 에이전트, 로그 수집기, 네트워크 플러그인 등 필수 구성 요소를 안정적으로 운영하는 방법을 이해하고, Kubernetes 1.12 버전 이후 변경된 스케줄링 메커니즘을 확인하세요.
keywords:
  - Kubernetes
  - DaemonSet
  - Kubernetes 스케줄링
---
---
## DaemonSet
### 개념

- `ReplicaSet`과 비슷하게 여러 `Pod`를 배포하지만, 차이점은 클러스터의 모든 `Node`에 `Pod`를 1개씩 배치하는 것을 보장한다는 점이다.
- 새로운 `Node`가 클러스터에 추가되면 자동으로 `Pod`도 추가된다.
- `Node`가 클러스터에서 제거되면 해당 `Node`에서 실행 중이던 `Pod`도 자동 삭제됨.

### Use Cases

아래 사례들 처럼 모든 `Node`에 하나씩 존재해야하는 `Pod`들을 관리할 때 사용한다.

- `Node` 단위 모니터링 에이전트
	- `Node Exporter`
	- `Datadog agent`
	- `Prometheus Node-level exporter` 등
- 로그 수집기
	- `Fluentd`
	- `Filebeat`
	- `Logstash`
- `Kube-proxy`
- `CNI Plugin`
	- `Calico`
	- `Flannel`

---
## Yaml

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-daemon
  labels:
    app: nginx
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      containers:
      - name: monitoring-agent
        image: monitoring-agent

```

- `kind`가 `DaemonSet`이라는 점을 제외하면 `ReplicaSet`과 동일하다.

---
## 스케줄링 원리
### Kubernetes 1.12 이전

- `DaemonSet`이 `kube-scheduler`를 우회하고 직접 `Node`에 `Pod`를 생성한다.
- `Pod` 정의 내부에 `nodeName: <node-name>` 같은 형태로 `Node`를 직접 지정하는 방식을 사용한다.

### Kubernetes 1.12 이후

- 기본 스케줄러(`kube-scheduler`)를 그대로 사용한다.
- `DaemonSet`은 `NodeAffiniy`, `Toleration`, `NodeSelector`를 활용하여 적절한 `Node`에 `Pod`를 배치한다.
	- 이를 통해서 `kube-scheduler`의 고급 기능(리소스 최적화, 선점, 일관된 스케줄링 정책)을 활용할 수 있게 된다.
	- 스케줄러가 노드의 리소스를 고려하여 배치하므로, 리소스 부족 문제를 더 잘 처리할 수 있다.


---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#writing-a-daemonset-spec](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#writing-a-daemonset-spec)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)