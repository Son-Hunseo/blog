---
title: Storage Class
description: 쿠버네티스(Kubernetes)의 StorageClass를 활용한 동적 프로비저닝(Dynamic Provisioning) 개념과 작동 흐름을 완벽하게 이해하세요. 기존 정적 프로비저닝의 비효율성을 해소하고, 클라우드 환경(AWS, GCP 등)에서 스토리지(PV)를 자동으로 생성하여 운영 부담을 줄이는 방법을 구체적인 YAML 예시와 함께 설명합니다.
keywords:
  - 쿠버네티스
  - Kubernetes
  - Storage Class
  - 쿠버네티스 동적 프로비저닝
---
---
## Storage Class
### 왜 Storage Class?

- 기존의 PV방식에서는 아래와 같은 절차들이 필요했다.
	1. 클라우드(AWS, GCP 등)에서 디스크를 직접 생성
	2. 해당 디스크를 참조하는 `PV`를 수동으로 생성
	3. `PVC`를 만들어 `PV`에 바인딩
	4. `Pod`에서 `PVC`를 사용
- 이처럼 '스토리지를 미리 사람이 직접 만들어 두는 방식'을 정적 프로비저닝(Static Provisioning) 이라고 한다.
- 이러한 방식에서는 애플리케이션이 스토리지를 필요로 할 때마다 위 과정을 반복해야한다.
- 이러한 과정은 운영 부담이 크며, 대규모 환경에서 비효율적이다.
- 이때 '스토리지가 필요해질 때 자동으로 생성되는 방식'인 동적 프로비저닝(Dynamic Provisioning)을 사용하면 이러한 문제점을 해결할 수 있다.
- 이러한 동적 프로비저닝을 하기위한 리소스가 `StorageClass`이다.

:::info
Provisioner란?
- 실제로 스토리지를 생성하는 주체이다.
- ex: GCP, AWS, Azure Disk, Azure FIle 등
:::

### Dynamic Provisioning 흐름

1. `StorageClass` 생성
2. `PVC` 생성 (`StorageClass` 지정)
3. `StorageClass`가 프로비저너를 통해
	- 클라우드 디스크 생성
	- PV 생성
4. `PVC`와 `PV` 자동 바인딩
5. `Pod`에서 `PVC` 사용

- 위 과정을 따르면, '클라우드 디스크를 생성', '`PV` 생성', '`PV`와 `PVC` 마운트' 과정이 자동화된다.

---
## 예시
### StroageClass (예시: GCP)

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: google-storage
provisioner: kubernetes.io/gce-pd
parameters:
	...
```

- 벤더별 CSI 드라이버 설치가 사전되어야 함
- `provisioner`: 어떤 스토리지를 사용할지 정의
- `parameters`: 벤더마다 세부 항목이 매우 다르므로 이 글에서는 다루지 않음

### PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myclaim
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: google-storage
  resources:
    requests:
      storage: 500Mi
```

- `spec.storageClassName`: 여기에서 `StroageClass` 지정

### Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mypod
spec:
  containers:
    - name: frontend
      image: nginx
      volumeMounts:
        - mountPath: "/var/www/html"
          name: web
  volumes:
    - name: web
      persistentVolumeClaim:
        claimName: myclaim
```

- `Pod`에서는 다를 것 없이 `PVC`를 사용하면 된다.

---
## 활용 예시

- 성능에 따라 여러 `StorageClass`를 만들어두고, 애플리케이션의 필요한 성능에 맞게 사용
- 복구 정책에 따라 여러 `StorageClass`를 만들어두고, 애플리케이션의 복구 정책에 따라 맞게 사용
- 위 예시 뿐만 아니라 다양한 상황에 맞게 Class를 나누고 사용하면 된다.

---
## 레퍼런스

- [https://kubernetes.io/docs/concepts/storage/storage-classes/](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [https://cloud.google.com/kubernetes-engine/docs/concepts/persistent-volumes#storageclasses](https://cloud.google.com/kubernetes-engine/docs/concepts/persistent-volumes#storageclasses)
- [https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html](https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)