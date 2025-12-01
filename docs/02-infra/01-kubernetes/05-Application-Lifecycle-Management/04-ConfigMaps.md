---
title: Env - ConfigMaps
description: "Kubernetes ConfigMap을 활용하여 Pod의 환경 설정과 환경 변수를 효과적으로 관리하는 방법을 마스터하세요. 이 가이드는 ConfigMap의 생성 방법(Imperative, Declarative), Pod에 환경 변수로 주입하는 세 가지 주요 방식(envFrom, valueFrom: configMapKeyRef), 그리고 설정 파일을 볼륨으로 마운트하는 방법까지 YAML 예제와 함께 단계별로 설명합니다. 복잡한 Pod YAML 파일에서 환경 설정을 분리하여 관리의 효율성을 높이고, 애플리케이션의 유연성을 극대화하세요."
keywords:
  - 쿠버네티스
  - ConfigMap
  - Pod 환경 변수
  - envFrom
  - configMapKeyRef
  - volumeMounts configMap
---
---
## 개념

- `Pod` yaml 파일 안에 환경 변수를 `env`로 직접 넣으면 파일이 복잡해지고 관리가 어려워진다.
- `ConfigMap`을 사용하면, 환경 변수로 사용할 key-value 들을 따로 관리할 수 있다.
- `Pod`가 생성될 때 `ConfigMap` 객체를 주입하거나, key-value(`.conf`, `.yaml`, `.properties` 등)의 파일로 `ConfigMap`을 마운트해서 사용한다.

---
## ConfigMap 생성
### Imperative(명령형) 방법

**from-literal**

```bash
kubectl create configmap <name> \
    --from-literal=APP_COLOR=blue \
    --from-literal=APP_MODE=prod
```

**from-file**

```bash
kubectl create configmap <name> --from-file=app.properties
```

### Declarative(선언적) 방법 - yaml

```yaml
# my-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: <name>
data:
  APP_COLOR: blue
  APP_MODE: prod
```

- `data`:
	- `<key>: <value>` (여러 개 가능)

```bash
kubectl apply -f my-configmap.yaml
```

---
## Pod에 삽입
### ConfigMap 전체

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-envfrom
spec:
  containers:
    - name: nginx
      image: nginx
      envFrom:
        - configMapRef:
            name: nginx-config
```

- `ConfigMap`에 있는 key-value 전체를 `Pod`안에 환경변수로 등록한다.

- `spec`
	- `containers`
		- `envFrom`
			- `configMapRef`
				- `name`: `ConfigMap` 객체의 이름

### 특정 변수만 삽입

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-env-key
spec:
  containers:
    - name: nginx
      image: nginx
      env:
        - name: APP_COLOR
          valueFrom:
            configMapKeyRef:
              name: nginx-config
              key: APP_COLOR
        - name: APP_MODE
          valueFrom:
            configMapKeyRef:
              name: nginx-config
              key: APP_MODE
```

- `ConfigMap`에 있는 특정 key-value만 `Pod`의 환경변수로 등록한다. (여러 개 가능)

- `spec`
	- `containers`
		- `env`
			- `name`: 환경변수 이름
			- `valueFrom`
				- `configMapKeyRef`
					- `name`: `ConfigMap` 객체의 이름
					- `key`: `ConfigMap` 에서 가져올 value의 key

### ConfigMap을 Pod 내부 특정 경로에 마운트

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    server {
        listen 80;
        server_name localhost;

        location / {
            root   /usr/share/nginx/html;
            index  index.html index.htm;
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   /usr/share/nginx/html;
        }
    }
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-volume
spec:
  containers:
    - name: nginx
      image: nginx
      volumeMounts:
        - name: nginx-config-volume
          mountPath: /etc/nginx/conf.d
  volumes:
    - name: nginx-config-volume
      configMap:
        name: nginx-config
        items:
          - key: nginx.conf
            path: nginx.conf
```

- `ConfigMap`을 `Pod`안의 특정 경로에 주입하고 싶을 경우 사용 (환경변수 X)

- `spec`
	- `containers`
		- `volumeMounts`
			- `name`: 아래에 설정할 `volumes`의 `name`
			- `mountPath`: 마운트할 `Pod` 내부의 경로
	- `volumes`
		- `name`: `volume`의 이름
		- `configMap`:
			- `name`: 주입할 `ConfigMap` 객체의 이름
			- `items`:
				- `key`: 주입할 value의 key
				- `path`: `Pod` 내부에 만들어질 파일 명

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)
- [https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#define-container-environment-variables-using-configmap-data](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#define-container-environment-variables-using-configmap-data)
- [https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#create-configmaps-from-files](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#create-configmaps-from-files)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)