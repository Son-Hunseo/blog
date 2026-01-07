---
title: Mock Exam 2 오답 정리
description: Udemy Mumshad 강의의 Mock Exam 2 문제 오답 정리
---
## 1 (O)

Create a StorageClass named `local-sc` with the following specifications and set it as the default storage class:

- The provisioner should be `kubernetes.io/no-provisioner`
- The volume binding mode should be `WaitForFirstConsumer`
- Volume expansion should be enabled


**My Answer**

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-sc
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/no-provisioner
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```


---
## 2 (X)

Create a deployment named `logging-deployment` in the namespace `logging-ns` with 1 replica, with the following specifications:
The main container should be named `app-container`, use the image `busybox`, and should run the following command to simulate writing logs:

```
sh -c "while true; do echo 'Log entry' >> /var/log/app/app.log; sleep 5; done"
```

Add a sidecar container named `log-agent` that also uses the `busybox` image and runs the command:

```
tail -f /var/log/app/app.log
```

`log-agent` logs should display the entries logged by the main `app-container`


**My Answer**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logging-deployment
  namespace: logging-ns
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logging
  template:
    metadata:
      labels:
        app: logging
    spec:
      containers:
      - name: app-container
        image: busybox
        args: [sh, -c, "while true; do echo 'Log entry' >> /var/log/app/app.log; sleep 5; done"]
        volumeMounts:
        - name: varlogapp
          mountPath: /var/log/app
      - name: log-agent
        image: busybox
        args: [/bin/sh, -c, 'tail -f /var/log/app/app.log']
        volumeMounts:
        - name: varlogapp
          mountPath: /var/log/app
      volumes:
      - name: varlogapp
        emptyDir: {}
```

**Right Answer**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logging-deployment
  namespace: logging-ns
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logging
  template:
    metadata:
      labels:
        app: logging
    spec:
      containers:
      - name: app-container
        image: busybox
        command: [sh, -c]
        args:
        - "while true; do echo 'Log entry' >> /var/log/app/app.log; sleep 5; done"
        volumeMounts:
        - name: varlogapp
          mountPath: /var/log/app
      - name: log-agent
        image: busybox
        command: [tail, -f]
        args:
        - "/var/log/app/app.log"
        volumeMounts:
        - name: varlogapp
          mountPath: /var/log/app
      volumes:
      - name: varlogapp
        emptyDir: {}
```

- `command`와 `args`에 대한 이해가 부족했다
- `command` - Docker에서의 ENTRYPOINT와 같은 "기본 명령어" prefix 와 같은 역할이다.
- `args` - 일반 실행 명령어이다.
- `args`에 리스트 형태로 모든 명령어를 박아도 되지만 예: `args: [tail, -f, "/var/log/app/app.log"]` 이미지의 기본 `command`가 뭔지 모르는 상태이므로 위처럼 `command`와 `args`로 분리하는 것이 리스크가 적은 '정답'이다.


---
## 3 (X)

A Deployment named `webapp-deploy` is running in the `ingress-ns` namespace and is exposed via a Service named `webapp-svc`.
Create an Ingress resource called `webapp-ingress` in the same namespace that will route traffic to the service. The Ingress must:

- Use `pathType: Prefix`
- Route requests sent to path `/` to the backend service
- Forward traffic to port `80` of the service
- Be configured for the host `kodekloud-ingress.app`

Test app availablility using the following command:

```
curl -s http://kodekloud-ingress.app/
```


**My Answer**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
spec:
  rules:
  - host: "kodekloud-ingress.app"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webapp-svc
            port:
              number: 80
```


**Right Answer**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  namespace: ingress-ns
spec:
  ingressClassName: nginx
  rules:
  - host: "kodekloud-ingress.app"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webapp-svc
            port:
              number: 80
```

- 오답인 이유
	- 네임스페이스를 빼먹어서
	- nginx class가 없어서
- `kubectl get ingressclass`로 현재 어떤 ingress class인지 확인해서 기입한다.
- ingress class에 대해 배운 적이 없는데?
	- k8s 1.19+부터 ingress class를 명시해야한다.
	- 왜냐하면 2개 이상의 ingress controller가 있을 때 해당 ingress 리소스를 어떤 ingress controller가 처리할지 모호하기 때문이다.


---
## 4 (O)

Create a new deployment called `nginx-deploy`, with image `nginx:1.16` and `1` replica. Next, upgrade the deployment to version `1.17` using rolling update.


**My Answer**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.17
```

---
## 5 (X)

Create a new user called `john`. Grant him access to the cluster using a csr named `john-developer`. Create a role `developer` which should grant John the permission to `create, list, get, update and delete pods` in the `development` namespace . The private key exists in the location: `/root/CKA/john.key` and csr at `/root/CKA/john.csr`.  

`Important Note`: As of kubernetes 1.19, the CertificateSigningRequest object expects a `signerName`.   
Please refer to the documentation to see an example. The documentation tab is available at the top right of the terminal.


**My Answer**

- 개념 자체를 모호하게 기억하고 있어서 어떻게 진행해야할지 로드맵이 그려지지 않아 시간상 일단 넘어갔다.


**Right Answer**

- 일단 이 과정에 대한 이해가 부족하다.
- 내가 이 문제르 봣을 때, 그래 뭐... CSR을 생성하고 그걸 내가 승인해줘야겠지...? 정도만 떠오르고 구체적인 to-do 로드맵이 떠오르지 않았다.
- 이 문제는 인증(Authentication)과 인가(Authorization)에 대한 과정을 이해해야한다.

- 인증
	- kubeconfig가 필요한 것
		1. 유저 개인키
		2. CA에게 서명 받은 인증서
		3. CA 공개키
	- 과정
		1. 유저가 유저 개인키를 생성함
		2. 유저 개인키로 CSR을 생성함
			- CSR 구성 요소 (아래 요소들이 다같이 base64로 인코딩 되어 있음)
				- CN(Common Name)값: 유저 이름(이게 RBAC의 사용자 name을 구분하는 기준이다)
				- 유저 공개키
				- CN 과 유저 공개키를 유저 개인키로 서명(암호화)한 값
		3. CSR을 base64로 (한번 더)인코딩해서 쿠버네티스 CSR 객체 포맷에 맞게 바꾼 뒤 이 객체를 클러스터에 생성한다. (유저가 가지고잇던 다른 자격증명이 있다면 CSR 객체를 만들고, 없다면 CSR yaml을 관리자에게 보내 관리자가 CSR 객체를 만든다)
		4. CSR을 클러스터가 알아서 검증함 (자동)
			- (base64 디코딩을 2번하고) 유저 공개키로 서명을 풀어봄 -> 음 지금 이 CSR을 보낸 녀석은 개인키를 가지고 있군 (보낸 시점까지는!!) -> 관리자에게 넘겨도 되겠구만
		5. 클러스터 관리자가 CSR을 approve함 (수동)
			- 여기서 approve하면, CSR을 CA 개인키로 서명하여 인증서가 생성됨
		6. 인증서와 CA 공개키는 관리자에게 받음(직접 받든 아니면 EKS처럼 어떤 자동화 장치가 마련되어 있던)
		7. 이제 유저는 kubeconfig로 kubectl 명령어로 클러스터에 요청을 보냄 (여기서 TLS 핸드셰이크 이루어짐)
			1. api-server는 유저에게 ca에게 서명받은 api-server 인증서를 보여줌
			2. 유저가 가진 ca 공개키로 검증 (지금 요청을 보내는 목적지가 내가 보내려는 목적지가 맞구만 -> 중간자 공격이 없구만)
			3. 유저는 본인이 ca에게 서명받은 인증서를 api-server로 보냄
			4. api-server는 본인이 가진 ca 공개키로 서명을 검증함 (ca가 검증한 유저가 맞구만)
			5. 하지만, 아직 api-server는 해당 요청을 보낸 주체가 인증서의 주체인지 검증하지 못했다.
			6. api-server는 랜덤 챌린지를 유저에게 보낸다.
			7. 유저는 본인의 개인키로 챌린지에 서명해서 api-server에 보낸다.
			8. api-server는 서명된 챌린지를 유저 인증서에 있던 공개키로 검증한다. (지금 이 순간에도 개인키를 가진것을 보면 요청을 보내는 녀석이 유저 인증서의 소유주가 맞구만)
		8. 인증 끝 (이제 인가 시작)
- 인가
	- Role을 만든다 (필요한 권한이 있는, 즉, 문제에서 제시한 권한이 있는)
	- RoleBinding으로 Role과 User(즉, CSR의 CN)를 바인딩 한다.

- 자 그러면 문제로 돌아와서, 문제에서 유저 개인키와 CSR은 만들어 뒀다고 했다.
- cat으로 csr을 열어보니 쿠버네티스에서 사용가능한 csr 객체는 아니고 아직 csr 자체이다.
- docs에 csr 검색해보자. 여러 docs에서 full example을 찾을 수 없는데 Issue a Certificate for Kubernetes API Client .. 문서에 있다. (해당 문서의 Create a Kubernetes CertificateSigningRequest를 보자)
- 위 문서에 나온대로 하면 쿠버네티스 CSR 객체를 만들 수 있다.
- 해당 문서에서 그 뒤 과정도 나와있다. (CSR approve하는 과정)
- 이제 인가를 진행하면 된다.
- docs에 Role 혹은 RBAC를 검색해서 나오는 docs로 간다.
- 나와있는 Role과 RoleBinding 객체로 인가를 마무리한다.

---
## 6 (X)

Create an nginx pod named `nginx-resolver` using the `nginx` image and expose it internally using a `ClusterIP` service called `nginx-resolver-service`.
From within the cluster, verify:

1. DNS resolution of the service name
2. Network reachability of the pod using its IP address

Use the **busybox:1.28** image to perform the lookups.
Save the service DNS lookup output to `/root/CKA/nginx.svc` and the pod IP lookup output to `/root/CKA/nginx.pod`.


**My Answer**

- `Pod`와 `Service`는 워낙 간단해서 만들었다.
- 그런데 `exec`의 파라미터와 플래그가 정확히 기억나지 않아. 테스트를 수행하지 못했다.

**Right Answer**

```bash
mkdir -p /root/CKA

kubectl run bb --image=busybox:1.28 --restart=Never -- sleep 3600
kubectl exec bb -- nslookup nginx-resolver-service > /root/CKA/nginx.svc

# Pod ip 확인하고 알아서 get -o wide이든 describe이든
kubectl exec bb -- nslookup http://<pod ip> > /root/CKA/nginx.pod
```

- `Pod`와 `Service`는 옳게 만들었다.
- 테스트용 더미 `Pod` 만드는 명령어 외워두기: `kubectl run <pod-name> --image=busybox -- sleep 3600` (`--` 뒤에 한칸 띄워야 한다. 자주 헷갈림)
- exec 명령어: `kubectl exec <pod-name> -- 명령어`
- look up 명령어: `ns lookup`
- cf) Pod의 경우 Pod DNS가 비활성화 되어있을 수도 있으므로 문제에서 Pod는 IP lookup으로 명시해준 것 같다.

---
## 7 (O)

Create a static pod on `node01` called `nginx-critical` with the image `nginx`. Make sure that it is recreated/restarted automatically in case of a failure.
For example, use `/etc/kubernetes/manifests` as the static Pod path.


**My Answer**

```bash
ssh node01

cd /etc/kubernetes/manifests

nano nginx-critical.yaml
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-critical
spec:
  containers:
  - name: nginx
    image: nginx
```

---
## 8 (O)

Create a Horizontal Pod Autoscaler with name `backend-hpa` for the deployment named `backend-deployment` in the **backend namespace** with the `webapp-hpa.yaml` file located under the root folder.  
Ensure that the HPA scales the deployment based on **memory utilization**, maintaining an average memory usage of **65%** across all pods.  
Configure the HPA with a minimum of 3 replicas and a maximum of 15.


**My Answer**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-deployment
  minReplicas: 3
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 65
```

- HPA 페이지 말고 HPA WalkThrough 페이지에서 full example 찾기


---
## 9 (X)

Modify the existing `web-gateway` on `cka5673` namespace to handle **HTTPS traffic** on port `443` for `kodekloud.com`, using a **TLS certificate** stored in a **secret** named `kodekloud-tls`.


**My Answer**

- 정확하게 모르겠어서 넘어갔다.


**Right Answer**

```bash
kubectl get secret -n cka5673
```

- `Secret` 조회

```bash
kubectl describe gateway web-gatway -n cka5673
```

- `describe` 해보니 잘못된 `Secret` 이름이 설정되어있다.
- 이것을 수정하고 `apply`


---
## 10 (X)

On the cluster, the team has installed multiple helm charts on a different namespace. By mistake, those deployed resources include one of the vulnerable images called `kodekloud/webapp-color:v1`. Find out the release name and uninstall it.


**My Answer**

- 모든 네임스페이스 조회하는 플래그 까먹어서 네임스페이스 목록을 보다가 `kodekloud/webapp-color:v3` 사용하는 `Deployment`가 존재하는 네임스페이스 잇길래 해당 네임스페이스에 존재하는 Helm 릴리즈 삭제했다. (적당히 이게 맞겠지 생각했던 것 같다)

**Right Answer**

- 모든 네임스페이스 플래그
	- `-A` 혹은 `--all-namespaces`
- 위 명령어로 조회된 helm 릴리즈들의 이미지를 확인해서 지우면 된다.

---
## 11 (O)

You are requested to create a NetworkPolicy to allow traffic from frontend apps located in the `frontend` namespace, to backend apps located in the `backend` namespace, but not from the databases in the `databases` namespace. There are three policies available in the `/root` folder. Apply the most restrictive policy from the provided YAML files to achieve the desired result. Do not delete any existing policies.

**My Answer**

- 3개의 yaml 파일을 보고 제대로 설정되있는 것 `apply` 했다.

