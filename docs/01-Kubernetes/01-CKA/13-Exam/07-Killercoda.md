---
title: Killercoda 트러블슈팅 문제 풀이
description: Killercoda 트러블슈팅 문제 풀이
---

---
## Apiserver Crash

:::tip
이 섹션에서는 실전처럼 문제가 주어진다기 보다는, 직접 문제를 일으켜보고 어디서 문제가 생기는지 직접 보게한다.
이를 통해 어떤 문제를 맞닥뜨렸을 때 아.. 여기서 이런 로그가 나오면 그거 문제인데? 라는 생각을 가지게 만드는 것이 목적
:::


Q1)
The idea here is to misconfigure the Apiserver in different ways, then check possible log locations for errors.

You should be very comfortable with situations where the Apiserver is not coming back up.

Configure the Apiserver manifest with a new argument `--this-is-very-wrong` .

Check if the _Pod_ comes back up and what logs this causes.

Fix the Apiserver again.

A1)

```bash
cd /etc/kubernetes/manifests
nano kube-apiserver.yaml
```

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    ...
    - --this-is-very-wrong
```

- 문제에서 요구받은 대로 설정 추가

```bash
kubectl get all -n kube-system
```

```plain
The connection to the server 172.30.1.2:6443 was refused - did you specify the right host or port?
The connection to the server 172.30.1.2:6443 was refused - did you specify the right host or port?
...
```

- 당연히 이상한 설정을 했으니 오류가 난다.

```bash
crictl ps
```

- crictl로 체크해보니 `kube-apiserver` Pod 자체가 생기지 않았다.

```bash
systemctl status kubelet

// 혹은

journalctl -u kubelet | grep kube-apiserver
```

```plain
"Error syncing pod, skipping" err="failed to \"StartContainer\" for \"kube-apiserver\" with CrashLoopBackOff
```

- `kube-apiserver`가 생기는데 문제가 생긴 모양이다.
- `kubelet` 상태를 확인하여 로그를 확인해보자
- `kube-apiserver` pod를 만드는데 문제가 생겼다.
- 다시 원복하자.



Q2)
Change the existing Apiserver manifest argument to: `--etcd-servers=this-is-very-wrong` .

Check what the logs say, **without using anything in** `/var` .

Fix the Apiserver again.


A2)

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    ...
    - --etcd-servers=this-is-very-wrong
```

- 원래는 https://127.0.0.1:2379 이렇게 되어있었는데 문제에서 요구받은대로 문제를 일으켰다.
	- 단일 마스터 노드 클러스터에서는 https://127.0.0.1:2379 이렇게 구성되어있는게 일반적이다.
	- 내가 첫 시험에서 겪은 문제에서는 etcd가 마스터 노드 밖에 위치해서 IP주소가 다른 경우였다. 그 설정을 etcd.yaml에서 보았고 그것을 kube-apiserver.yaml 에 적용 (+ 다른 문제도 있었다)

```plain
The connection to the server 172.30.1.2:6443 was refused - did you specify the right host or port?
The connection to the server 172.30.1.2:6443 was refused - did you specify the right host or port?
...
```

```bash
systemctl status kubelet

// 혹은

journalctl -u kubelet | grep kube-apiserver
```

- 에러 로그를 볼 수 있다.
- 다시 원복한다.
- 대충 에러 로그를 기억해두고 나중에 트러블 슈팅할 때 여러 지점을 의심할 수 있으면 된다.





Q3)
Q1 Q2와 똑같은데 kube-apiserver.yaml에 오류내는 위치만 달라져서 생략



---
## Apiserver Misconfigured

Q1)
Make sure to have solved the previous Scenario [Apiserver Crash](https://killercoda.com/killer-shell-cka/scenario/apiserver-crash).

The Apiserver is not coming up, the manifest is misconfigured in 3 places. Fix it.

A1)
```bash
kubectl get all
```

- 오류 발생 -> apiserver에 문제가 생겼나? 의심

```bash
crictl ps
```

- apiserver의 pod가 떠있나? 체크 -> 안떠있음 -> 문제가 생겼으니 apiserver 설정파일을 봐야함

```bash
nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

1. `metadata;` -> `metadata:`
2. `--etcd-servers=https://127.0.0.1:23000` -> `--etcd-servers=https://127.0.0.1:2379`
3. (이건 못찾아서 답지 봤음) `--authorization-modus` -> `--authorization-mode`

---
## Kube Controller Manager Misconfigured

Q1)
A custom Kube Controller Manager container image was running in this cluster for testing. It has been reverted back to the default one, but it's not coming back up. Fix it.

A1)

```bash
kubectl get all -n kube-system
```

- 컨트롤러 매니저가 CrashLoopBackOff 상태이다.

```bash
nano /etc/kubernetes/manifests/kube-controller-manager.yaml
kubectl describe pod kube-controller-manager-controlplane -n kube-system
kubectl logs kube-controller-manager-controlplane -n kube-system
```

- 설정 파일을 봤는데 뭐가 문제인지 모르겠다.
- describe 해봤는데 딱히 특별한 Event는 안보인다. (마지막에 그냥 CrashLoopBackOff 됐다는 이벤트)
- 로그를 본다.

```bash
Error: unknown flag: --project-sidecar-insertion
```

- 마지막줄에 이런 에러가 뜬다.

```bash
nano /etc/kubernetes/manifests/kube-controller-manager.yaml
```

- 해당 플래그를 설정파일에서 제거한다.

---
## Kubelet Misconfigured

Q1)
Someone tried to improve the Kubelet on _Node_ `node01` , but broke it instead. Fix it.

A1)

```bash
ssh node01
systemctl status kubelet
```

- 상태를 확인해보니 문제가 생겼다.

```bash
journalctl -u kubelet
cat /var/log/syslog | grep kubelet
```

- systemd에 실행되고 있는 것들에 문제가 생겼을 때 (예: kubelet) 해야할 명령어
- `journalctl -u` 해서 해당 서비스 로그 보기
- `/var/log/syslog`에 있는 시스템 로그 보기

```plain
node01 kubelet[11598]: E0115 07:05:02.197136   11598 run.go:72] "command failed" err="failed to parse kubelet flag: unknown flag: --improve-speed"
```

- 이런 로그가 있다.
- 근데 나는 kubelet의 flag를 어디서 설정하는지 모른다.
- 이럴 때 find 명령어로 kubelet의 설정 파일들이 있을 거라는 의심이 되는 파일들을 열어보자.

```bash
find / | grep kubelet
```

- 의심되는 목록 중에 `/var/lib/kubelet/kubeadm-flags.env` 가 있다.

```bash
nano /var/lib/kubelet/kubeadm-flags.env
```

- 위 파일에서 `--imporve-speed`를 삭제한다.

```bash
systemctl restart kubelet
systemctl status kubelet
```

- 재시작하고 상태를 확인한다.


---
## Application Misconfigured1

Q1)
There is a _Deployment_ in _Namespace_ `application1` which seems to have issues and is not getting ready.

Fix it by only editing the _Deployment_ itself and no other resources.

A1)
Deploy에서 지정하는 ConfigMap이 다른이름으로 존재했다.
해당 Deploy를 수정해서 존재하는 ConfigMap으로 옮겨줬다.

---
## Application Misconfigured2

Q1)
A _Deployment_ has been imported from another Kubernetes cluster. But it's seems like the _Pods_ are not running. Fix the _Deployment_ so that it would work in any Kubernetes cluster.

A1)
클러스터에는 controlplane 노드 하나인데 deployment에서는 nodename을 다른 어떤 노드로 지정하고 있었다. 
해당 nodeName 설정을 삭제해주고 다시 deployment를 생성했다.