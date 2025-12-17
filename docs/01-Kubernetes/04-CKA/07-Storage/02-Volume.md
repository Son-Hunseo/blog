---
title: Volume
description: 쿠버네티스(Kubernetes) Pod에서 데이터의 영속성을 확보하는 핵심 개념인 Volume에 대해 알아봅니다. hostPath의 작동 방식과 한계점을 이해하고, AWS EBS와 같은 외부 스토리지 볼륨의 필요성 및 사용 예시를 상세한 YAML 코드로 확인해보세요.
keywords:
  - 쿠버네티스
  - Kubernetes
  - Volume Driver Plugin
  - hostPath
---
---
:::info
도커 스토리지, 도커 볼륨에 대한 사전 지식이 필요하다.
없다면 [도커 스토리지](../../../05-Docker/02-Docker-Storage.md), [도커 볼륨](../../../05-Docker/03-Docker-Volume.md) 글 참조
:::

## Volume
### 개념

- 쿠버네티스에서의 `Pod` 또한 도커에서의 컨테이너와 마찬가지로 Container Layer에서 수정, 생성된 데이터는 `Pod`가 삭제될 경우 같이 삭제된다.
- 이를 해결해기 위해서 `Pod`에 `Volume`을 연결한다.

### hostPath

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: random-number-generator
spec:
  containers:
  - name: random-number
    image: busybox
    command: ["sh", "-c", "echo $RANDOM > /opt/number.out"]
    volumeMounts:
    - name: data-volume
      mountPath: /opt
  volumes:
  - name: data-volume
    hostPath:
      path: /data
      type: DirectoryOrCreate
```

- 위 `Pod`는 어떠한 랜덤한 숫자를 `/opt/number.out`에 저장한다.
- `Volume`을 연결하지 않을 경우, `Pod`가 삭제됨과 동시에 이 랜덤한 숫자 또한 사라진다.
- `volumes`
	- `hostPath`: `Pod`가 실행되는 노드의 디렉토리를 볼륨으로 사용 (권장 X)
		- `path`: 볼륨으로 사용할 노드의 디렉토리
		- `type`: 볼륨의 타입 (`DirectoryOrCreate`의 경우 해당 디렉토리가 없을 경우 생성하는 옵션)
- `volumeMounts`
	- `name`: 연결할 볼륨 이름을 작성
	- `mountPath`: 연결할 컨테이너 내부의 디렉토리 위치
- `hostPath`는 권장되지 않는다. 왜냐하면, `Pod`가 어떤 노드에서 실행될지 보장되지 않으며, 각 노드의 해당 디렉토리는 실제로 서로 다른 디렉토리이기 때문이다.

### 외부 Volume Storage

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: random-number-generator
spec:
  containers:
  - name: random-number
    image: busybox
    command: ["sh", "-c", "echo $RANDOM > /opt/number.out"]
    volumeMounts:
    - name: data-volume
      mountPath: /opt
  volumes:
  - name: data-volume
    awsElasticBlockStore:
      volumeID: <volume-id>
      fsType: ext4
```

- `hostPath`의 문제점을 해결하기 위해서 쿠버네티스는 다양한 스토리지 타입을 지원한다.
- 네트워크/클러스터 스토리지
	- NFS, GlusterFS, CephFS
- 퍼블릭 클라우드 스토리지
	- AWS EBS
	- Azure Disk / Azure File
	- Google Persistent DIsk

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/storage/volumes/](https://kubernetes.io/docs/concepts/storage/volumes/)
- [https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/)
- [https://unofficial-kubernetes.readthedocs.io/en/latest/concepts/storage/volumes/](https://unofficial-kubernetes.readthedocs.io/en/latest/concepts/storage/volumes/)
- [https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.18/#volume-v1-core](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.18/#volume-v1-core)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)