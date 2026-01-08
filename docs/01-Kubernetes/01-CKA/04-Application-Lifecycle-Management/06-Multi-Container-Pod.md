---
title: Multi Container Pod
description: Multi-Container Pods는 **쿠버네티스(Kubernetes)**에서 여러 컨테이너를 하나의 Pod에 묶어 네트워크와 볼륨을 공유하며 생명주기를 함께하도록 관리하는 방식입니다. 이 아키텍처는 Sidecar, Init Container, Co-located Containers 등의 디자인 패턴을 통해 로깅, 프록시, 초기화 작업 등 메인 애플리케이션을 보조하는 기능을 효율적으로 통합합니다. 특히 Init Containers는 메인 앱 시작 전 필수 사전 작업을 순차적으로 수행하며, Sidecar Containers는 메인 앱과 함께 지속적으로 실행되는 보조 기능을 제공합니다. 이 패턴들은 마이크로 서비스 아키텍처(MSA) 환경에서 긴밀하게 협력해야 하는 구성 요소들의 배포 및 확장(Scaling) 효율성을 높이는 핵심 전략입니다.
keywords:
  - Kubernetes
  - Multi-Container Pod
  - Sidecar Container
  - Native Sidecar Container
  - Init Container
---
---
## Multi Container Pod
### 개념

- `Multi Container Pod`란 하나의 `Pod` 내부에 여러 컨테이너를 함께 배치하는 개념이다.
- `Pod` 내부의 여러 컨테이너는 생명주기(생성, 삭제)를 함께하며, 네트워크(localhost)와 `Volume`을 공유한다. (별도의 `Service` 없이, 각 컨테이너끼리 localhost로 통신이 가능하며, <span style={{color: 'red'}}>같은 볼륨을 공유</span>)

### 왜 사용?

- Micro Service Architecture 에서는 기능별로 서비스들이 독립적인 서비스로 배포되어있다.
- 이에, 서비스마다 독립적인 배포/확장이 가능해 운영 효율이 올라간다는 장점이 있다.
- 하지만, <span style={{color: 'red'}}>항상 함께 동작해야하는(배포/확장도 함께 해야하는) 서비스가 존재</span>할 때가 있다.
	- 메인 애플리케이션 + 로그 수집기
	- 메인 애플리케이션 + 리버스 프록시 서버
	- 등등

---
## Multi Container Pod 디자인 패턴

:::tip
멀티 컨테이너 `Pod`는 CKA 시험에 상당히 자주 나온다.
기억해야할 점은, 여러 컨테이너가 실행되어야하는 `Pod` 내에서 "먼저" 생성해야하는 컨테이너가 있을 경우 Init Container를 떠올리고 docs에 검색하면 된다.
:::

### Co-located Containers 패턴 (기본)

- `spec.containers` 배열에 2개 이상 컨테이너를 넣는 형태
- 두 컨테이너는 동일한 시점에 시작되고 종료
- 시작 순서를 정할 수 없다.
- 단순히 같이 실행되는 형태

**예시**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: backend-proxy-pod
spec:
  containers:
    # 1. 메인 애플리케이션 컨테이너 (백엔드 로직 수행)
    - name: main-app
      image: main-app:latest
      # 메인 앱은 내부 포트 8080으로 서비스
      ports:
        - containerPort: 8080

    # 2. 리버스 프록시 컨테이너 (외부 요청 처리)
    - name: nginx-proxy
      image: nginx:latest
      # Nginx는 80번 포트를 외부에 노출합니다.
      ports:
        - containerPort: 80
      volumeMounts:
        - name: nginx-config-volume
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf 

  volumes:
    - name: nginx-config-volume
      configMap:
        name: nginx-proxy-config
```

- 위 예시는 백엔드 서버 컨테이너 + 리버스 프록시 서버 컨테이너이다.

:::info
위 예시는 Sidecar Containers 패턴으로 볼 수도 있다. (네이티브 사이드카 컨테이너가 아닐 뿐)

Co-located Containers 패턴은 2개 이상의 컨테이너가 같은 라이프 사이클을 공유하는 형태의 패턴을 지칭하는데, Sidecar Containers 패턴의 형태에서도 같은 라이프 사이클을 공유하는 형태가 나타날 수 있다.
:::

### Init Containers 패턴

- `Pod` 시작 전에 초기화 작업(사전 작업)을 수행하는 컨테이너가 존재하는 패턴
- 해당 컨테이너는 초기화 작업이 끝나면 종료된다.
- 메인 컨테이너는 그 이후에 시작된다.
- 여러 `Init Container`가 있을 경우 순차적으로 실행된다.

**예시**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: application-with-init-db-check
spec:
  # 데이터베이스 준비 상태를 확인하는 Init Container
  initContainers:
    - name: wait-for-db
      image: busybox:1.36
      command: ['sh', '-c', '
        echo "데이터베이스 연결 준비를 확인 중입니다...";
        nc -z db-service 5432;
        sleep 5;
        echo "데이터베이스 연결 준비 확인 성공.";
      ']

  containers:
    - name: main-app
      image: main-app:latest
      ports:
        - containerPort: 8080
```

- 위 예시는 메인 애플리케이션이 실행되기 이전에, 데이터베이스 연결을 확인 후 메인 애플리케이션 컨테이너를 실행하는 예시이다.
- `initContainers` 단계에서 실패하면 `Pod`를 재생성한다.

### Sidecar Containers 패턴

- (여기서 설명하는 부분은 사이드카 패턴의 개념 자체보다는, v1.28부터 적용되는 `initContainers.restartPolicy: Always` 를 사용한 '네이티브 사이드카 컨테이너' 기능을 설명)
- `Init Container` 처럼 먼저 보조 컨테이너가 실행된다.
- 하지만, `Pod`가 살아있는 동안 계속 함께 실행된다. (생성은 먼제되지만, 종료는 함께 종료)
- 주로 메인 앱을 보조하는 기능 수행

**예시**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: simple-webapp
spec:
  containers:
  - name: web-app
    image: web-app:latest
    ports:
      - containerPort: 8080
  initContainers:
  - name: log-shipper
    image: busybox
    command: 'setup-log-shipper.sh'
    restartPolicy: Always
```

- 위 예시는 메인 애플리케이션 컨테이너가 실행되기 전에 로그 수집기 컨테이너가 실행되고 메인 애플리케이션이 작동하는 동안 로그 수집기도 계속 같이 작동하는 예시이다.
	- 먼저 실행되어야하는 이유: 애플리케이션 시작 완료 혹은 시작 중 에러 로그도 수집해야하기 때문
- `restartPolicy: Always` 옵션이 있어야하며, 이를 '네이티브 사이드카 컨테이너' 라고 한다. (v1.28 부터 적용)

- 실제 예시는 `app`(메인앱 + filebeat) -> `elastic-search` -> `kibana` 가 있을 수 있다.
	- `Prometheus` -> `Grafana` 패턴과 비슷...

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/access-application-cluster/communicate-containers-same-pod-shared-volume/](https://kubernetes.io/docs/tasks/access-application-cluster/communicate-containers-same-pod-shared-volume/)
- [https://kubernetes.io/blog/2015/06/the-distributed-system-toolkit-patterns/](https://kubernetes.io/blog/2015/06/the-distributed-system-toolkit-patterns/)
- https://kubernetes.io/blog/2023/08/25/native-sidecar-containers/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)