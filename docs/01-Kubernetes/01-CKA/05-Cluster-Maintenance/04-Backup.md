---
title: Backup
description: "SEO 최적화 메타데이터Description쿠버네티스(Kubernetes) 클러스터의 핵심 백업 전략: 리소스 구성(Manifest)과 ETCD 백업 및 복원 방법에 대해 자세히 알아보세요. YAML 파일을 이용한 리소스 백업부터, Velero를 사용한 API 기반 백업, 그리고 ETCD 데이터베이스를 etcdctl로 스냅샷을 만들어 백업하고 복원하는 단계별 명령어 및 설정을 제공합니다. Managed Kubernetes와 Self-Managed Kubernetes 환경별 최적의 백업 방식을 비교하고, 클러스터 안정성을 높이는 방법을 안내합니다."
keywords:
  - Kubernetes
  - Kubernetes 백업
  - Velero
  - Manifest 백업
  - ETCD 백업
  - ETCD 스냅샷
---
---
## 백업 대상1: 리소스 구성(Manifest)
### 개념

- `Deployment`, `Pod`, `Service`, `ConfigMap`, `Secret`, `Namespace` 등 Kubernetes 객체들의 정의 -> 즉, yaml 파일
- Imperative 방식으로 만든 리소스의 경우 yaml 파일이 남아있지 않기 때문에, `kube-apiserver`에서 직접 추출해야한다. -> `-o yaml > sample.yaml`
- 이에, Declarative 방식(YAML 파일 관리)이 더 권장됨(시험 예외) -> Git으로 관리하는 것이 좋다.

### 방법

**1. 관리하고 있는 yaml 파일 + Imperative 방식으로 만든 리소스는 추출**

**2. API 서버에서 모두 추출**

```bash
kubectl get all --all-namespaces -o yaml > all-resource.yaml
```

- 하지만, `get all`은 `Pod`, `Deployment`, `Service` 정도만 가져옴
- `Role`, `ClusterRole`, `CRD`등 다른 리소스들까지 포함하려면 더 복잡함

**3. Velero**

- 1번 방법과 2번 방법 모두 모든 리소스를 가져오기엔 복잡함
- 이에 Kubernetes API 기반으로 전체 리소스를 백업하고 복구하는 솔루션인 `Velero`(구. ARK)를 사용한다.
- 스케줄링 백업을 지원한다.

:::tip
CSP 쿠버네티스 클러스터(EKS, GKE)의 경우 `etcd`에 직접 접근할 수 없으므로 `Velero`와 같은 솔루션을 사용하는 등의 API 서버 기반 백업을 사용한다.
:::

---
## 백업 대상2: ETCD
### 개념

- `ETCD`는 Kubernetes의 모든 클러스터의 상태 정보가 저장되는 key-value DB이다.
- 이에 백업해야한다.
- 참조: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#snapshot-using-etcdctl-options

### 방법 - 백업

```bash
sudo apt update 
sudo apt install etcd-client
```

- `kubeadm`으로 설치했을 경우 `etcd-client`를 설치해야 `etcdctl` 명령어가 작동한다.

```bash
sudo ETCDCTL_API=3 etcdctl snapshot save snapshot.db \
	--endpoints=https://127.0.0.1:2379 \
	--cacert=/etc/kubernetes/pki/etcd/ca.crt \
	--cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
	--key=/etc/kubernetes/pki/etcd/healthcheck-client.key
```

- `ETCD` 스냅샷을 추출한다.

```bash
ETCDCTL_API=3 etcdctl snapshot status snapshot.db \
	--write-out=table
```

- 추출한 스냅샷 상태 확인 명령어

### 방법 - 복원

```bash
mv /etc/kubernetes/manifests/kube-apiserver.yaml /etc/kubernetes/manifests/kube-apiserver.yaml.bak
```

- 임시로 `kube-apiserver`의 매니페스트 파일의 이름을 바꾸어 Static Pod로 실행되고 있는 `kube-apiserver` 를 중지시킨다.

```bash
ETCDCTL_API=3 etcdctl snapshot restore snapshot.db \
    --data-dir=/var/lib/etcd-from-backup
```

- `ETCD` 스냅샷으로 백업했던 상태로 복원합니다.
- `--data-dir`: 복원 명령을 실행했을 때, 기존에 사용하던 `ETCD` 디렉토리와 충돌을 방지하기위해 새로운 `etcd-from-backup`이라는 디렉토리에 저장

```bash
nano /etc/kubernetes/manifests/etcd.yaml
```

```yaml
  ...
  volumes:
  - hostPath:
      path: /var/lib/etcd-from-backup # 여기를 바꿔야한다.
      type: DirectoryOrCreate
    name: etcd-data
```

- 바뀐 디렉토리의 경로를 적용하기 위해 `ETCD` Static Pod를 수정해야한다.
- 이를 위해 `etc/kubernetes/manifests/etcd.yaml`을 수정한다.

```bash
mv /etc/kubernetes/manifests/kube-apiserver.yaml.bak /etc/kubernetes/manifests/kube-apiserver.yaml
```

- 원복하여 `kube-apiserver` 재시작

---
## 상황별 백업 선택
### Managed Kubernetes (EKS, GKE 등)

- `ETCD`에 직접 접근 불가 -> `Velero` 같은 API 기반 백업 도구 사용

### Self-Managed Kubernetes

- `ETCD` 백업이 가장 확실하고 빠르게 복구 가능하다.
- 리소스 구성 파일도 Git과 같은 방법으로 저장해두면 더 좋다.

:::tip
추가적으로 `PersistentVolume`을 사용한다면 해당 볼륨도 백업해야한다.
:::

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
