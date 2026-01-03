---
title: PV(Persistent Volume) & PVC(Persistent Volume Claim)
description: Kubernetes의 영구 스토리지 관리 핵심 개념인 **PV (Persistent Volume)**와 **PVC (Persistent Volume Claim)**의 개념, 구조, 바인딩 규칙, 그리고 Pod에 적용하는 방법을 상세히 설명합니다. PV/PVC의 YAML 예시와 Deprecated된 Recycle 정책에 대한 최신 정보도 포함되어 있습니다.
keywords:
  - 쿠버네티스
  - Kubernets
  - PV
  - PersistentVolume
  - PVC
  - PersistentVolumeClaim
  - AccessModes
---
---
## PV (Persistent Volume)
### 개념

- 클러스터 전체에서 사용 가능한 스토리지 풀이다.
- Cluster-scoped 리소스이다.
- 주된 사용 패턴은 다음과 같다.
	- 클러스터 관리자가 `PV`를 생성한다.
	- 사용자는 `PVC`(Persistent Volume Claim)을 통해 필요한 만큼 요청한다.
	- `PVC` 조건에 맞는 `PV`가 할당된다.
	- `Pod`의 볼륨으로 `PVC`를 적용한다.
- cf) `PV`의 스토리지 구현으로 `hostPath`를 사용이 가능하긴 하지만(할당되는 `Pod`가 실행되는 노드의 디스크 사용), 이는 `PV`의 설계의도와 맞지 않는 사용 사례이며, 권장되지 않는다.

### 예시

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv
spec:
  accessModes:
    - ReadWriteMany 
  capacity:
    storage: 5Gi 
  volumeMode: Filesystem
  persistentVolumeReclaimPolicy: Retain 
  
  nfs:
    server: <EFS-Mount-Target-IP-Address>
    path: "/"
    readOnly: false
```

- `accessModes`:
	- `ReadWriteOnce` - 단 하나의 노드에서 읽기/쓰기로 마운트 될 수 있다.
	- `ReadOnlyMany` - 여러 노드에서 읽기 전용으로 마운트될 수 있다.
	- `ReadWriteMany` - 여러 노드에서 읽기/쓰기로 마운트 될 수 있다.
- `capacity`: 저장 용량
- `persistentVolumeReclaimPolicy`
	- `Retain` - PVC가 삭제되어도 PV를 유지, 이후 새로운 PVC에 할당될 수 없음
	- `Delete` - PVC가 삭제되면 PV도 삭제
	- `Recycle`(Deprecated) - PVC가 삭제되면 PV를 재활용 가능하게 만듬, PVC에 할당될 수 있음
- 이외 필드는 해당 스토리지 구현체에 따라 다르므로 생략

:::info
`Recycle`이 Deprecated 된 이유
- `rm -rf` 수준의 단순 삭제
- 보안 삭제를 보장하지 않음
- 스냅샷, 암호화, 클라우드 메타데이터 미처리
- CSI 및 클라우드 스토리지와 부적합

-> 이에 현재 `StorageClass` + 동적 프로비저닝 사용
:::

---
## PVC (Persistent Volume Claim)
### 개념

- 사용자가 스토리를 요청하는 객체 (PV - 자원, PVC - 요청서)
- Namespace-scoped 리소스이다.
- PV와 PVC는 1 : 1 관계로 바인딩 된다.
- PV에서 PVC와 바인딩 된 이후 남는 용량이 있다고 하더라도 다른 PVC가 사용할 수 없다.
	- ex: PVC에서 1기가 요청하더라도 할당된 PV가 2기가라면 PVC에는 2기가가 할당된다.

### 바인딩 규칙

**우선순위**

1. `StorageClass`가 일치하는지?
2. `label`/`selector`가 일치하는지?
3. `PV`의 용량이 `PVC` 요청을 만족할만큼 큰지?
4. `AccessMode`가 일치하는지?

- 조건이 맞는 `PV`가 없으면 `PVC`는 Pending 상태가 된다.

### 예시

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myclaim
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 500Mi
```

---
## Pod에 PVC 적용

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mypod
spec:
  containers:
    - name: myfrontend
      image: nginx
      volumeMounts:
        - mountPath: "/var/www/html"
          name: web
  volumes:
    - name: web
      persistentVolumeClaim:
        claimName: myclaim
```

- `Pod`와 `PVC`는 같은 네임스페이스에 존재해야 함
- `spec.volumes.persistentVolumeClaim`
	- `claimName` - 여기에 `PVC` 이름 작성

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/storage/persistent-volumes/](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [https://portworx.com/tutorial-kubernetes-persistent-volumes/](https://portworx.com/tutorial-kubernetes-persistent-volumes/)
- [https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims)
- [https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.18/#persistentvolumeclaim-v1-core](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.18/#persistentvolumeclaim-v1-core)
- [https://docs.cloud.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingpersistentvolumeclaim.htm](https://docs.cloud.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingpersistentvolumeclaim.htm)
- [https://kubernetes.io/docs/concepts/storage/persistent-volumes/#claims-as-volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#claims-as-volumes)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)