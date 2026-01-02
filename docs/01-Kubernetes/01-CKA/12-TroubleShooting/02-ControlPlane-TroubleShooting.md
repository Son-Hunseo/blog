---
title: 컨트롤플레인 트러블슈팅
description: 쿠버네티스(Kubernetes) 컨트롤 플레인 장애 해결을 위한 노드 상태 점검, kube-system 포드 상태 확인, systemd 서비스 로그 분석 등 필수적인 트러블슈팅 단계와 명령어를 정리합니다.
keywords:
  - 쿠버네티스 트러블슈팅
  - 컨트롤 플레인 점검
  - 컨트롤 플레인 트러블 슈팅
---
---
## 컨트롤플레인 트러블 슈팅
### 클러스터 기본 상태 확인

```bash
kubectl get nodes
```

- 모든 노드가 `Ready`인지 확인한다.

### 컨트롤 플레인 컴포넌트 상태 확인

**kubeadm 사용 시**

```bash
kubectl get pod -n kube-system
```

- `kube-system` 네임스페이스 내의 컨트롤 플레인 `Pod`들이 `Running` 상태인지 확인한다.

```bash
kubectl logs <컴포넌트이름> -n kube-system
```

- 문제가 있다면 로그를 분석한다.


**Service 형태(systemd)로 실행 중인 경우**

```bash
service kube-apiserver status
service kube-controller-manager status
service kube-scheduler status
service kubelet status
service kube-proxy status
```

- 컨트롤 플레인 구성요소들이 정상 동작하고 있는지 확인한다.

```bash
# API 서버 로그 확인 예시
sudo journalctl -u kube-apiserver
```

- 문제가 있다면 로그를 분석한다.

---
## 레퍼런스

- https://kubernetes.io/ko/docs/tasks/debug/debug-cluster/