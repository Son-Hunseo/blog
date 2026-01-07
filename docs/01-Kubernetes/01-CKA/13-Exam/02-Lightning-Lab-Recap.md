---
title: Lightning Lab 오답 정리
description: Udemy Mumshad 강의의 Lightning Lab 문제 오답 정리
---
---
:::tip
- CKA 시험 중 k8s docs 뿐만 아니라, helm 공식 문서, Gateway API docs는 허용되고, etcd docs는 허용되지 않는다.
- 또한, k8s docs에서 discussion은 접근 금지이다.
:::

---
## 1. 클러스터 업그레이드 (X)

Q)
Upgrade the current version of kubernetes from `1.33.0` to `1.34.0` exactly using the `kubeadm` utility. Make sure that the upgrade is carried out one node at a time starting with the controlplane node. To minimize downtime, the deployment `gold-nginx` should be rescheduled on an alternate node before upgrading each node.

Upgrade `controlplane` node first and drain node `node01` before upgrading it. Pods for `gold-nginx` should run on the `controlplane` node subsequently.

A)

1. docs에 'upgrade kubeadm cluster' 검색한다.
2. 제일 상단의 docs 접속
3. 1.33에서 1.34로 업그레이드 해야하니까 해당 페이지의 'Upgrading a kubeadm cluster from 1.33 to 1.34' 들어간다.
4. 새로운 버전의 쿠버네티스 패키지 레포지토리를 설치해야하기 때문에 해당 페이지의 'Chaging the Kubernetes package repository'로 들어간다.
	- 해당 페이지에 나온대로 `/etc/apt/sources.list.d/kubernetes.list` 이 파일에 적힌 패키지 레포지토리 경로를 원하는 버전으로 바꾼다. (마스터, 워커 둘다)
5. 원래 페이지로 돌아간다.
6. 해당 페이지에서 controlplane / worker 각각 나온 내용대로 진행한다.
	- 마스터노드
		- `sudo apt update`
		- `kubeadm` upgrade
			- `sudo kubeadm upgrade apply v1.34.0` (컨트롤 플레인 요쇼들 업그레이드)
		- `kubelet`, `kubectl` upgrade
			- drain node
			- `kubelet`, `kubectl` upgrade
			- restart `kubelet` & `daemon-reload`
			- uncordon node
	- 워커노드
		- `sudo apt update`
		- `kubelet`, `kubectl` upgrade
			- drain node
			- `kubelet`, `kubectl` upgrade
			- restart `kubelet` & `daemon-reload`
			- uncordon node

---
## 2. Custom columns 사용 (O)

Q) 
Print the names of all deployments in the `admin2406` namespace in the following format:  
  
`DEPLOYMENT CONTAINER_IMAGE READY_REPLICAS NAMESPACE`  
  
`<deployment name> <container image used> <ready replica count> <Namespace>`  
. The data should be sorted by the increasing order of the `deployment name`.

Example:  
  
`DEPLOYMENT CONTAINER_IMAGE READY_REPLICAS NAMESPACE`  
`deploy0 nginx:alpine 1 admin2406`  
Write the result to the file `/opt/admin2406_data`.

A)

1. custom columns를 docs에 검색 -> 딱히 해당 섹션은 없네..? -> 검색결과 중 kubectl 이 관련되어있으니 해당 docs 페이지 들어감
2. ctrl + f 누르고 custom columns를 검색해보자.
3. Syntax 표에 custom columns 포맷 설명에 링크가 걸려있네? 해당 docs 페이지 링크로 접속
4. 해당 문법을 보고 작성한다.
	- `-o json` 옵션으로 살펴보고 어떤 계층으로 작성해야하는지 확인한다.

---
## 3. kubeconfig 트러블 슈팅 (O)

Q)
A kubeconfig file called `admin.kubeconfig` has been created in `/root/CKA`. There is something wrong with the configuration. Troubleshoot and fix it.

A)

1. nano /root/CKA/admin.kubeconfig` 하고 이상한게 없는지 확인
2. 6443 포트가 정상인데 이상한 포트로 되어있길래 수정함

---
## 4. deployment 생성 및 업그레이드 (O)

Q) 
Create a new deployment called `nginx-deploy`, with image `nginx:1.16` and `1` replica.  
Next, upgrade the deployment to version `1.17` using `rolling update` and add the annotation message  
`Updated nginx image to 1.17`.


A)

1. deploy yaml 포맷을 외우고 있지는 않기 때문에 docs에 deployment 검색하고 페이지 들어감.
2. 샘플 yaml 파일 복사해서 필요한 부분만 작성함

---
## 5. 애플리케이션 레벨 트러블 슈팅 (X)

Q)
A new deployment called `alpha-mysql` has been deployed in the `alpha` namespace. However, the pods are not running. Troubleshoot and fix the issue. The deployment should make use of the persistent volume `alpha-pv` to be mounted at `/var/lib/mysql` and should use the environment variable `MYSQL_ALLOW_EMPTY_PASSWORD=1` to make use of an empty root password.

Important: Do not alter the persistent volume.

A)
1. `Pod`가 `Pending`이다. -> describe로 이벤트를 확인해보니 `pvc`에 문제가 있어 볼륨이 바인딩이 안된다.
2. `pvc`를 조회해본다. `pvc`도 `Pending`이다. 정상이라면 `Bound`이어야 한다.
	- 문제1 - `Pod`에 명시된 `pvc`와 이름이 다르다.
	- 문제2 - `pvc`에 명시된 `StroageClass`의 이름이 클러스터에 존재하는 `StorageClass` 이름과 매칭이 안된다.
3. 문제1, 문제 2를 수정했는데도 `Pending`이다.
4. 동적프로비저닝이 아닌가..? 문제를 다시 읽어보니 `alpha-pv`를 사용해야한단다.
5. `kubectl get pv`로 해당 `pv`를 조회해보니 `CAPACITY`와 `ACCESS MODES`가 조건에 맞지 않다.
6. 해당 조건에 맞게 다시 `pvc`를 작성하고 적용한다.

- 헤맸던 요소
	- `StorageClass`가 있지만, 현재 문제의 상태는 동적 프로비저닝되는 환경은 아니었다. 이에 정적 프로비저닝된 `PV`에 맞게 세팅해야했다.
	- 다른 요소(Name이 일치하는지 등)는 생각했는데, `CAPACITY`와 `ACCESS MODES`를 생각을 못했다. 
	- 참고: [바인딩 규칙](../07-Storage/03-PV-And-PVC.md#바인딩-규칙)

---
## 6. ETCD 백업 (X)

Q)
Take the backup of ETCD at the location `/opt/etcd-backup.db` on the `controlplane` node.

A)
1. docs에 'backup etcd' 검색한다.
2. 최상단 페이지로 들어간다.
3. 해당 페이지의 선행 작업은 `etcdctl`이 설치되어야한다.
	- 해맸던 요소) `apt install etcd-client` < 이 `etcdctl` 설치 명령어는 docs에 찾아봐도 없다. 외워야 한다.
4. `kubectl get all -n kube-system -o wide`로 `etcd` `Pod`의 IP를 확인한다.
5. 헤맸던 요소) etcd 독스에서 Securing communication 이 부분이 선행되어야 한다.
6. 해당 페이지의 Backing up an etcd cluster 페이지로 가서 지침을 따른다.

---
## 7. 주어진 조건에 맞는 Pod 생성 (X)

Q)
Create a pod called `secret-1401` in the `admin1401` namespace using the `busybox` image. The container within the pod should be called `secret-admin` and should sleep for `4800` seconds.  

The container should mount a `read-only` secret volume called `secret-volume` at the path `/etc/secret-volume`. The secret being mounted has already been created for you and is called `dotfile-secret`.

A)
1. 먼저 `Secret`이 생성되어있다고 하니까 실제로 있는지 확인해보자.
2. docs에 `Secret`을 검색해서 페이지에 접속한다.
3. ctrl + f로 'volume'을 검색한다.
4. 샘플 yaml 파일을 복사해서 이를 토대로 문제에 맞는 설정으로 바꿔서 적용한다.
	- 헤맸던 요소) `Secret` 객체를 `Pod`의 특정 경로에 볼륨으로 마운팅한다는 Use Case 자체를 잊고있었다.