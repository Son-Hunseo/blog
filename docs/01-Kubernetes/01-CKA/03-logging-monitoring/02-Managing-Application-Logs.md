---
title: Pod 로그 확인법
description: Kubernetes에서 Pod 로그를 확인하는 기본 방법을 정리한 가이드입니다. 단일 컨테이너 및 다중 컨테이너 Pod의 로그 조회 방식(kubectl logs)을 비교하며, Docker 로그 명령과의 차이도 함께 설명합니다. CKA 시험 준비 및 쿠버네티스 운영 환경에서 필수적인 로그 관리 개념을 이해할 수 있습니다.
keywords:
  - Kubernetes 로그 조회
  - kubectl logs
  - 다중 컨테이너 로그
---
---
## Kubernetes에서의 로그 관리
### 단일 컨테이너 Pod

```bash
kubectl logs -f <pod-name>
```

- Docker에서의 `docker logs -f <container-id>` 처럼 사용하면 된다.
- `-f` 옵션이 있으면 실시간 로그 스트리밍

### 다중 컨테이너 Pod

```bash
kubectl logs -f <pod-name> <container-name>
```

- `Pod`에 컨테이너가 여러 개가 있다면 컨테이너까지 지정해주면 된다.
- `-f` 옵션이 있으면 실시간 로그 스트리밍

---
## 레퍼런스

- [https://kubernetes.io/blog/2015/06/cluster-level-logging-with-kubernetes/](https://kubernetes.io/blog/2015/06/cluster-level-logging-with-kubernetes/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)