---
title: NFS 서버 IP 변경 시 PV 재설정 방법
description: 쿠버네티스 환경에서 NFS 서버 IP 변경 시 Helm으로 NFS Provisioner를 수정하고, 기존 PV(PersistentVolume)와 연결된 Pod를 안전하게 재기동하는 방법을 단계별로 정리한 가이드입니다.
keywords:
  - Kubernetes
  - NFS Provisioner
  - PersistentVolume
---
---
## NFS Provisioner Helm 설정 수정

```bash
helm upgrade nfs-subdir-external-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  -n 네임스페이스 \
  --set nfs.server=바뀐IP
```

---
## PV 수정
### 기존 PV 백업

```bash
kubectl get pv PV이름 -o yaml > pv.yaml
```

- 현재 NFS 서버를 정적 프로비저닝하고 있는 PV를 yaml로 백업

### PV 설정 수정

```bash
nano pv.yaml
```

```yaml
spec:
  nfs:
    server: 바뀐IP
    path: ...
```

- 바뀐 IP로 수정한다.

### 기존 PV 종료 후 새로 생성

```bash
kubectl delete pv PV이름
```

- 기존 PV를 삭제한다.
- 만약 `deleted` 메시지가 뜨고 진행되지 않는다면, `kubectl patch pv PV이름 -p '{"metadata":{"finalizers":null}}'` 으로 강제로 삭제한다.

```bash
kubectl apply -f pv.yaml
```

- 새로운 PV를 생성한다.
- IP를 제외한 나머지 모든 설정이 같다.

---
## Pod 재기동

```bash
kubectl delete pod POD이름 -n 네임스페이스
```

- PV와 연결된 POD들을 종료하고 재시작한다.
- 만약 제대로 삭제가 되지 않을 경우 `kubectl patch pod POD이름 -n 네임스페이스 -p '{"metadata":{"finalizers":null}}'`, `kubectl delete pod POD이름 -n 네임스페이스 --grace-period 0 --force` 로 종료하기

:::tip
`Prometheus` 처럼 Lock 파일이 있는 경우 해당 스토리지에서 Lock파일을 삭제한 후 Pod를 재기동해야 에러가 나지 않는다.
:::