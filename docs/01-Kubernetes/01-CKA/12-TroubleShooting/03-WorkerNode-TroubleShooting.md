---
title: 워커 노드 트러블 슈팅
description: 쿠버네티스(Kubernetes) 워커 노드가 NotReady 또는 Unknown 상태일 때 해결하는 5단계 가이드를 확인하세요. kubectl describe, kubelet 로그 분석, 리소스 점검 및 인증서 검증까지 CKA 자격증 대비와 실무 장애 대응을 위한 필수 명령어를 정리했습니다.
keywords:
  - 쿠버네티스 트러블 슈팅
  - 워커노드 트러블 슈팅
---
---
## 워커 노드 트러블 슈팅 과정
### 1. 노드 상태 확인

```bash
kubectl get nodes
```

- `Ready`: 정상 상태
- `NotReady`: 문제가 발생한 상태
- `Unknown`: 마스터 노드와 통신이 끊긴 상태


### 2. 세부 정보 진단

```bash
kubectl describe node <노드-이름>
```

- `OutOfDisk`: 디스크 공간 부족 여부
- `MemoryPressure`: 메모리 부족 여부
- `DiskPressure`: 디스크 용량 임계치 근접 여부
- `PIDPressure`: 프로세스가 너무 많아 실행 불가능한지 여부
- `Ready`: 노드가 건강하면 `True`, 문제가 있으면 `False`, 통신 불가 시 `Unknown`


### 3. 호스트 리소스 및 시스템 상태 점검

- CPU/Memory 확인: `top` 또는 `htop` 명령어로 부하 확인
- 디스크 공간 확인: `df -h` 명렁어로 마운트된 볼륨의 잔여 용량 확인


### 4. Kubelet 서비스 상태 및 로그 확인

```bash
service kubelet status
```

- `kubelet` 상태 확인

```bash
sudo journalctl -u kubelet
```

- `kubelet` 로그 확인


### 5. Kubelet 인증서 검증

```bash
openssl x509 -in /var/lib/kubelet/<노드-이름>.crt -text
```

- `kubelet`이 마스터와 통신할 때 사용하는 인증서에 문제가 없는지 확인한다.

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)