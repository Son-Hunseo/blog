---
title: Kube-API Server
description: kube-apiserver는 Kubernetes 클러스터의 모든 요청을 처리하는 핵심 컴포넌트로, 인증·검증 과정을 거쳐 etcd와 통신하며 클러스터 상태를 관리합니다. 이 글에서는 kube-apiserver의 역할, 동작 방식, 설치 및 확인 방법을 CKA 관점에서 자세히 정리했습니다.
keywords:
  - kube-apiserver
  - kubernetes api server
  - kubernetes control plane
  - kubeadm kube-apiserver
  - kubernetes 요청 흐름
---
---
## 역할

- Kubernetes의 핵심 컴포넌트로 <span style={{color: 'red'}}>모든 요청은 kube-apiserver를 거쳐 처리</span>된다.
- 주요 기능:
    - 사용자 요청을 인증(authenticate) 및 검증(validate)
    - `etcd`에 데이터를 조회(retrieve)하거나 업데이트(update)
    - <span style={{color: 'red'}}>etcd와 직접 통신하는 유일한 컴포넌트</span>
    - 다른 컴포넌트(`kube-scheduler`, `controller-manager`, `kubelet` 등)는 `etcd와` 직접 통신하지 않고 `kube-apiserver`를 통해 상태를 갱신한다.

---
## 동작 예시
### (1) 정보 조회 요청 (예: `kubectl get nodes`)

1. `kube-apiserver`는 사용자를 인증하고 요청을 검증한다.
2. `etcd`에 요청된 데이터를 조회한다.
3. `etcd`에서 가져온 데이터를 사용자에게 응답한다.

- 참고: `kubectl` 대신 직접 `kube-apiserver`에 POST API 요청을 보내고 JSON 응답을 받을 수도 있다.

### (2) Pod 생성 요청

1. (`kubeconfig`에 정의된 인증 정보를 통해)사용자를 인증하고 요청을 검증한다.
2. `kube-apiserver`가 `Pod` 객체를 생성한다. (아직 어떤 노드에 배치될지는 정해지지 않음)
	- 실제 컨테이너를 만들었다는 것이 아니라, `Pod` 객체 '데이터'를 만들었다는 뜻 (설계도를 만들었다고 보면 된다)
3. `etcd`에 `Pod` 객체의 정보를 기록한다.
4. 사용자에게 `Pod`가 생성되었음을 알린다. (예시: `pod/nginx created`)
5. `kube-scheduler`는 `kube-apiserver`를 모니터링하다가 새로운 `pod`가 생긴 것을 확인하고, 적절한 노드를 선택해 `kube-apiserver`에 알려준다. (이때, `Pod` 객체 데이터에 배치될 노드 이름이 기입된다)
6. `kube-apiserver`는 해당 `Pod`가 어떤 노드에 배치될 것인지 `etcd`에 기록한다.
7. `kube-apiserver`는 선택된 노드의 `kubelet`에 `Pod` 실행 지시를 보낸다.
8. `kubelet`은 `Pod`를 생성하고 container runtime(예: `containerd`)에게 실제 컨테이너 실행을 지시한다. (ex: `STATUS: Pending`)
9. 실행이 완료되면 `kubelet`은 상태를 `kube-apiserver`에 전달한다.
10. `kube-apiserver`는 최종 상태를 `etcd`에 업데이트한다. (ex: `STATUS: Running`)

---
## 설치 및 확인 방법

### Kubeadm Setup

**설치**

- `kubeadm`으로 클러스터 설치 시 `kube-apiserver`는 자동으로 설치된다. (`Pod` 형태로)


**설정 조회**

```bash
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

- 위 경로에 yaml 형태로 설정이 저장되어있다.
- 설정 변경도 위 yaml 파일을 변경하면 자동으로 된다.
	- Static Pod 이기 때문인데, 이는 나중에 자세히 다루도록 한다.


### Manual Setup (Kubernetes The Hard Way)

**설치**

```bash
wget -q --https-only \ "https://dl.k8s.io/v1.31.14/bin/linux/amd64/kube-apiserver"

sudo mv kube-apiserver /usr/local/bin/ 
sudo chmod +x /usr/local/bin/kube-apiserver

sudo nano /etc/systemd/system/kube-apiserver.service
```

```ini
[Unit]
Description=Kubernetes API Server
Documentation=https://kubernetes.io/docs/
After=network.target

[Service]
ExecStart=/usr/local/bin/kube-apiserver \
  --advertise-address=<CONTROLLER_NODE_IP> \
  --bind-address=0.0.0.0 \
  --secure-port=6443 \
  --allow-privileged=true \
  --apiserver-count=3 \
  --authorization-mode=Node,RBAC \
  --client-ca-file=/etc/kubernetes/pki/ca.crt \
  --tls-cert-file=/etc/kubernetes/pki/kubernetes.crt \
  --tls-private-key-file=/etc/kubernetes/pki/kubernetes.key \
  --service-account-key-file=/etc/kubernetes/pki/service-account.crt \
  --service-account-signing-key-file=/etc/kubernetes/pki/service-account.key \
  --service-account-issuer=https://kubernetes.default.svc.cluster.local \
  --etcd-servers=https://<ETCD1>:2379,https://<ETCD2>:2379,https://<ETCD3>:2379 \
  --etcd-cafile=/etc/kubernetes/pki/etcd-ca.crt \
  --etcd-certfile=/etc/kubernetes/pki/etcd-client.crt \
  --etcd-keyfile=/etc/kubernetes/pki/etcd-client.key \
  --encryption-provider-config=/var/lib/kubernetes/encryption-config.yaml \
  --kubelet-client-certificate=/etc/kubernetes/pki/kube-apiserver-kubelet-client.crt \
  --kubelet-client-key=/etc/kubernetes/pki/kube-apiserver-kubelet-client.key \
  --service-cluster-ip-range=10.32.0.0/24 \
  --enable-admission-plugins=NodeRestriction \
  --audit-log-path=/var/log/kubernetes/audit.log \
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start kube-apiserver
sudo systemctl enable kube-apiserver
```

- 위 명령어는 `kube-apiserver`를 바이너리를 직접 다운로드하여 설치하는 명령어이다.
	- https://www.downloadkubernetes.com/ 참조
- `/usr/local/bin/` 으로 이동시켜 PATH에 등록한다.
- 이에 시스템 전역 실행 파일로 사용가능한 것이다. (인증서가 필요한데 이건 추후 진행한다고 가정하자)


**설정 조회

```bash
cat /etc/systemd/system/kube-apiserver.service
```

- `systemd`에 설치했기 때문에 위 경로에서 설정을 조회하고 수정할 수 있다.
- 해당 파일을 수정한 뒤 아래 명령어 수행해야 적용된다.
	- `sudo systemctl daemon-reload`
	- `sudo systemctl restart kube-apiserver`

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://kubernetes.io/docs/concepts/overview/kubernetes-api/](https://kubernetes.io/docs/concepts/overview/kubernetes-api/)
- [https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster/](https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster/)
- [https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/](https://kubernetes.io/docs/tasks/administer-cluster/access-cluster-api/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)