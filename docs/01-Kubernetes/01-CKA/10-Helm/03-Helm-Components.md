---
title: Helm의 구성 요소
description: 쿠버네티스 패키지 매니저 Helm의 기본 개념인 Chart, Release, Revision을 입문자 눈높이에서 정리합니다. NGINX와 WordPress 예시 코드를 통해 Helm 템플릿 구조와 values.yaml 활용법을 확인해 보세요.
keywords:
  - Helm
  - Helm CLI
  - Helm Chart
  - Release
  - Revision
  - Metadata Storage
---
---
## Helm의 구성 요소 (컴포넌트)
### Helm CLI

- 로컬 시스템에서 실행되는 클라이언트 도구이다.
- 차트 설치, 업그레이드, 롤백 등의 작업을 수행한다.

### Chart

- `Helm`을 통해 애플리케이션을 설치할 떄 쿠버네티스 클러스터에 필요한 객체들을 생성하기 위한 파일들의 '집합'이다.
- 애플리케이션을 설치하기 위한 모든 Instruction과 템플릿을 포함하고 있다.
- `Template`
	- 이미지 이름, 레플리카 수 등을 하드코딩하지 않고 템플릿 형태 변수로 관리한다. (마치, `JSTL`를 사용해 `JSP`를 동적으로 만드는 것처럼)
- `values.yaml`
	- 차트의 설정값을 담고있는 파일이다. 즉, `Template`에 동적으로 주입할 값들을 담고있는 파일이다.
	- 사용자는 주로 이 파일만 수정하여 배포 환경에 맞게 커스터마이징한다.

### Release

![helm-components1](assets/helm-components1.png)

- Chart가 쿠버네티스 클러스터에 적용되어 생성된 '인스턴스'이다.
- 하나의 차트를 사용하여 여러 개의 Release를 생성할 수 있다.
	- Java에서 Class로 여러 인스턴스를 찍어내는 것을 생각해보면 이해가 쉽다.
- 각 Release는 독립적으로 추적되고 관리된다.

### Revision

![helm-components2](assets/helm-components2.png)

- Release의 '스냅샷'이다.
- 애플리케이션에 변경 사항(이미지 업데이트, 설정 변경 등)이 발생할 때마다 새로운 리비전 번호가 생성되어 이력을 관리한다.

### Metadata Storage

- `Helm`은 설치된 Release, 사용된 Chart, Revision 상태 등의 데이터를 저장해야 한다.
- 이를 로컬 컴퓨터에 저장하는 것은 옳지 않다.
- 이에 `Helm`은 이를 Release별로 클러스터 내부의 `Secrets`에 저장한다.
- 이에, 협업하는 이들이 모두 같은 데이터에 접근하는 것이 보장되며 데이터 또한 클러스터가 유지되는 한 안전하게 보존된다.


---
## Repository & Artifact Hub

- 레포지토리는 Docker Hub처럼 `Helm` 차트를 공유하고 다운로드할 수 있는 공용 저장소이다.
	- 가장 대표적인 레포지토리 - `Bitnami`(현재 유료로 바뀌었다고 들음..)
- Artifact Hub: `Bitnami`, `AppsCode` 등의 여러 공급자의 차트를 한곳에서 검색할 수 있는 중앙 허브이다.

---
## 예시
### 단순 NGINX 예시

**폴더 구조**

```plain
my-nginx/
├── Chart.yaml          # 차트의 메타데이터 (이름, 버전 등)
├── values.yaml         # 사용자가 설정할 수 있는 기본값 (변수)
└── templates/          # 실제 쿠버네티스 리소스 파일들 (템플릿)
    ├── deployment.yaml
    └── service.yaml
```

**`Chart.yaml`**

```yaml
apiVersion: v2
name: my-nginx
description: A simple NGINX Helm chart
type: application
version: 0.1.0
appVersion: "1.16.0"
```

**`values.yaml`**

```yaml
replicaCount: 2

image:
  repository: nginx
  tag: "stable"
  pullPolicy: IfNotPresent

service:
  type: NodePort
  port: 80
```

**`deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Chart.Name }}-deployment
  labels:
    app: {{ .Chart.Name }}
spec:
  replicas: {{ .Values.replicaCount }}  # values.yaml의 2가 들어감
  selector:
    matchLabels:
      app: {{ .Chart.Name }}
  template:
    metadata:
      labels:
        app: {{ .Chart.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}" # nginx:stable
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 80
```

**`service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Chart.Name }}-service
  labels:
    app: {{ .Chart.Name }}
spec:
  type: {{ .Values.service.type }}  # NodePort
  ports:
    - port: {{ .Values.service.port }}
      targetPort: 80
      protocol: TCP
  selector:
    app: {{ .Chart.Name }}
```

### WordPress 예시 (구조 조금 더 복잡 + 조건문)

**폴더 구조**

```plain
wordpress/
├── Chart.yaml           # 의존성(MariaDB) 정보가 포함됨
├── values.yaml          # WordPress 설정 + MariaDB 설정이 중첩됨
├── charts/              # 의존성 차트(MariaDB)가 다운로드되는 폴더
└── templates/
    ├── deployment.yaml  # 복잡한 조건문(if/else) 포함
    ├── service.yaml
    ├── ingress.yaml     # 외부 접속 설정 추가
    └── secrets.yaml     # 비밀번호 관리 추가
```

**`Chart.yaml`**

```yaml
apiVersion: v2
name: wordpress
version: 9.0.0
dependencies:
  - name: mariadb       # WordPress는 MariaDB 차트를 필요로 함
    version: 7.x.x
    repository: https://charts.bitnami.com/bitnami
    condition: mariadb.enabled
```

**`values.yaml`**

```yaml
# WordPress 설정
wordpressUsername: user
wordpressPassword: "password123"
service:
  type: LoadBalancer

# 하위 차트(MariaDB) 설정 (Helm이 자동으로 mariadb 차트에 전달)
mariadb:
  enabled: true
  auth:
    rootPassword: "secretpassword"
    database: wordpress_db
```

**`deployments.yaml`**

- 이것저것 많아서, 조건문이 들어간 `deployment`만 첨부

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "wordpress.fullname" . }}
spec:
  template:
    spec:
      containers:
        - name: wordpress
          image: {{ .Values.image.repository }}
          env:
            - name: WORDPRESS_DB_HOST
              value: {{ include "wordpress.databaseHost" . }}
            # 사용자가 외부 DB를 쓰겠다고 하면(mariadb.enabled=false), 비밀번호 로직 변경
            {{- if .Values.mariadb.enabled }}
            - name: WORDPRESS_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ .Release.Name }}-mariadb
                  key: mariadb-password
            {{- else }}
            - name: WORDPRESS_DB_PASSWORD
              value: {{ .Values.externalDatabase.password }}
            {{- end }}
```


---
## 레퍼런스

- https://blog.kubesimplify.com/introduction-to-helm
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)