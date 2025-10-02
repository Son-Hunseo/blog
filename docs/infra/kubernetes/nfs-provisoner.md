---
title: NFS를 이용한 정적 프로비저닝
sidebar_position: 1
---

---

## 왜?

그동안 블로그, 포폴, 개인적인 용도의 어플리케이션들을 `Jenkins`와 `ArgoCD`로 자동 배포해왔다. `ArgoCD`의 경우에는 정보들이 쿠버네티스 클러스터의 `etcd` 등에 저장되는 stateless한 어플리케이션이지만, `Jenkins`의 경우 pod 내부에 설정파일이 들어있는 stateful한 어플리케이션이다. 따라서 PV를 연결해주어야한다. 그러나 귀찮아서 PV를 `emptyDir`로 그냥 써왔다. 그러다가 모든 서버들을 한번씩 재부팅 할 일이 있었는데, 이때 모든 설정이 날아갔다. 복구하는 김에 얼마전에 NAS에 NFS로 VM 볼륨을 마운팅 했듯이 PV도 NFS로 하면 되겠다는 생각이 들어서 시도하게되었다.

---

## NFS 클라이언트 툴 설치

```bash
sudo apt-get update
sudo apt-get install -y nfs-common
```

- 사실 nfs pod가 뜨는 워커노드에만 설치하면 되는데, 자원 현황에 따라서 어느 노드에서 뜰지 모르니 모든 노드에 다 설치하자.
- 위 설치는 `Ubuntu/Debian` 계열, `CentOS/RHEL` 계열이라면 `sudo yum install -y nfs-utils`

---

## NFS 프로비저너 설치

```bash
helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/
```

- 프로비저너 Helm 레포지토리 추가

```bash
helm install nfs-subdir-external-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
    --set nfs.server=192.168.1.100
    --set nfs.path=/volume1/jenkins
    --set storageClass.name=nfs-client
```

- 프로비저너 설치
  - `nfs.server`: NFS의 IP
  - `nfs.path`: NFS 스토리지 경로
  - `storageClass.name`: 식별자
- `kubectl get sc` 하면 등록된 프로비저너를 확인할 수 있다.

---

## 재배포 (예시: Jenkins)

```yaml
controller:
  persistence:
    enabled: true
    storageClass: "nfs-client" # 식별자와 일치시키기
    accessMode: "ReadWriteOnce"
    size: "20Gi"
```

- `jenkins-values.yaml` 이라는 파일을 하나 만들고 위 내용을 작성해주자.

```bash
helm upgrade --install jenkins jenkins/jenkins \
  -n jenkins \
  -f jenkins-values.yaml
```

- 나는 기존에 `helm`으로 `jenkins`를 설치 해줬기 때문에 이처럼 재배포 해줬다.
- 이후 `kubectl get pvc -n jenkins`로 PVC 생성되었는지 확인하면 완료

---

이러한 과정으로 마음의 안정을 얻었다.
