---
title: Secrets
description: Kubernetes에서 민감한 정보(DB 접속 정보 등)를 안전하게 관리하고 Pod에 주입하는 방법을 배우세요. 일반 텍스트의 ConfigMap 대신, Secret 객체를 사용해야 하는 이유(RBAC, Encryption at Rest 등)와 함께, 명령형/선언적 방식으로 Secret을 생성하고, 이를 환경 변수 또는 볼륨 마운트 형태로 Pod에 삽입하는 YAML 예시와 실습 명령어를 상세히 설명합니다.
keywords:
  - Kubernetes
  - Secret
  - ConfigMap vs Secret
  - Encryption at Rest
  - 민감 정보 관리
  - 노드 레벨 보안
---
---
## 개념

- DB 접속 정보 등이 `ConfigMap`에 plain text로 하드코딩되어 있으면 위험하다.
- 이때, `ConfigMap`과 비슷하지만, 민감한 정보를 저장하기 위해 인코딩되거나 해시된 형식으로 저장하고, 이를 `Pod`에 주입하여 사용하는 객체가 `Secret`이다.
	- 인코딩이 암호화는 아니다. 추가적인 암호화가 필요하다. 

:::tip
그런데 단순히 `Base64` 등으로 인코딩하여 저장하는 것은 보안적 의미가 없지 않나?

- 그렇다. `Base64`로 인코딩하여 저장한 값은 누구나 디코딩하여 원래의 값을 볼 수 있다.
- 그럼에도 불구하고 민감한 정보를 `ConfigMap` 대신 `Secret`에 저장하도록 권장하는 이유는 `Secret` 객체 자체에 추가적인 보안적 설계를 하도록 하는 의도가 내포되어있기 때문이다.
	- `RBAC` - 일반 사용자에게 `get`/`list` 권한을 `ConfigMap` 은 주더라도, `Secret`은 주지 않게 설계
	- `Encryption at Rest` - `Base64` 인코딩하는 것은 암호화한 것이 아니다. 추가적인 설정을 하지 않는다면 `etcd`에 그대로 저장된다. 이에 추가적인 암호화가 필요하다. 이 때, `Encryption at Rest`를 설정하여 추가적인 암호화한 값을 저장하도록 설정한다.
	- 노드 레벨의 보안 - `Pod`가 `Secret`을 볼륨으로 마운트할 때, `Secret` 데이터는 해당 `Pod`가 실행되는 노드의 메모리(`tmpfs`)에만 저장된다. 즉, 디스크에 기록되는 것을 최소화하여 노출 위험을 줄인다. - `ConfigMap` 데이터는 디스크에 기록될 수 있다. 즉, `Secret`은 민감 정보를 다루기 때문에 이러한 처리가 플랫폼 레벨에서 이루어지는 것이다. 또한, 해당 `Secret`을 필요로 하는 `Pod`가 존재하는 노드에만 전달된다.
	- 의도 명확화 (가장 중요) - `ConfigMap`과 `Secret`을 분리하여 사용하여 '이 데이터는 민감하다'는 의도를 클러스터 관리자, 개발자 모두에게 명확히 전달하여, 해당 리소스에 더 많은 보안 조치를 취하도록 유도한다.
:::

---
## Secrets 생성
### Imperative(명령형) 방법

**from-literal**

```bash
kubectl create secret generic app-secret \
  --from-literal=DB_Host=mysql \
  --from-literal=DB_User=root \
  --from-literal=DB_Password=paswrd
```

**from-file**

```bash
kubectl create secret generic app-secret --from-file=app_secret.properties
```

### Declarative(선언적) 방법 - yaml

**Base64 인코딩 된 값을 확인**

```bash
echo -n "mysql" | base64
echo -n "root" | base64
echo -n "paswrd" | base64
```

**인코딩된 값으로 yaml 작성**

```yaml
# secret-data.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
data:
  DB_Host: bX1zcWw=
  DB_User: cm9vdA==
  DB_Password: cGFzd3Jk
```

- `kind: Secret` 외에는 `ConfigMap`과 유사하다.

```bash
kubectl create -f secret-data.yaml
```

- `apply`로 적용

```bash
kubectl get secret app-secret -o yaml
```

- `Secret`은 `describe`로 값을 볼 수 없다.
- 위 명령어를 입력하면 인코딩된 값을 볼 수 있다.

```bash
echo -n "cGFzd3Jk" | base64 --decode
```

- 인코딩 되어있는 값을 디코딩하여 원문 보기
- `Encryption at Rest`를 적용했더라도, API 서버에서 복호화한 값을 넘겨주기 때문에 디코딩만 하면 볼 수 있다.
	- API 서버가 암호화 key를 가지고 있기 때문이다.
	- 이 때문에 `RBAC`로 설정하는 것이다. (일반 사용자에게 `Secret` 객체의`get/list` 권한 주지 않는 등)
	- 이렇게 잘 설정한다면 보안적 관점에서 안전하다.

---
## Pod에 삽입
### Secret 전체

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-envfrom-secret
spec:
  containers:
    - name: app
      image: busybox
      envFrom:
        - secretRef:
            name: app-secret
```

- `Secret`에 있는 key-value 전체를 `Pod` 안에 환경변수로 등록한다.

- `spec`
    - `containers`
        - `envFrom`
            - `secretRef`
                - `name`: `Secret` 객체의 이름

### 특정 변수만 삽입

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-env-key-secret
spec:
  containers:
    - name: app
      image: busybox
      env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: password
```

- `Secret`에 있는 특정 key-value만 `Pod`의 환경변수로 등록한다. (여러 개 가능)

- `spec`
	- `containers`
	    - `env`
	        - `name`: 환경변수 이름 (컨테이너 내부에서 사용할 이름)
	        - `valueFrom`
	            - `secretKeyRef`
	                - `name`: `Secret` 객체의 이름
	                - `key`: `Secret` 에서 가져올 value의 key

### Secret을 Pod 내부 특정 경로에 마운트

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  db-user: YWRtaW4=
  db-pass: c2VjcmV0MTIz
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-volume-secret
spec:
  containers:
    - name: app
      image: busybox
      volumeMounts:
        - name: db-credentials-volume
          mountPath: /etc/secrets/db
          readOnly: true
  volumes:
    - name: db-credentials-volume
      secret:
        secretName: db-credentials
        items:
          - key: db-user
            path: username.txt
          - key: db-pass
            path: password.txt
```

- `Secret`을 `Pod` 안의 특정 경로에 파일 형태로 주입하고 싶을 경우 사용한다. (환경변수 X). 
- Secret의 내용은 자동으로 디코딩되어 파일로 저장된다.
	- `Pod` 내부의 `/etc/secrets/db` 경로에 `username.txt`와 `password.txt` 파일이 생성된다.

- `spec`
	- `containers`
	    - `volumeMounts`
	        - `name`: 아래에 설정할 `volumes`의 `name`
	        - `mountPath`: 마운트할 `Pod` 내부의 **경로**
	- `volumes`
	    - `name`: `volume`의 이름
	    - `secret`:
	        - `secretName`: 주입할 `Secret` 객체의 이름
	        - `items`:
	            - `key`: 주입할 value의 key (`Secret` 내부의 key)
	            - `path`: `Pod` 내부에 만들어질 파일명 (`mountPath` 아래에 생성됨)

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/configuration/secret/](https://kubernetes.io/docs/concepts/configuration/secret/)
- [https://kubernetes.io/docs/concepts/configuration/secret/#use-cases](https://kubernetes.io/docs/concepts/configuration/secret/#use-cases)
- [https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)