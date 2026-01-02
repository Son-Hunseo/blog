---
title: 애플리케이션 레벨 트러블 슈팅
description: 쿠버네티스(k8s) 애플리케이션 장애 발생 시 해결을 위한 5단계 트러블슈팅 가이드를 확인하세요. curl 접속 확인부터 서비스 엔드포인트 체크, Pod 로그 분석 및 DB 계층 점검까지 실무 필수 명령어를 정리했습니다.
keywords:
  - Kubernetes
  - 트러블슈팅
  - 쿠버네티스 애플리케이션 레벨 트러블 슈팅
---
---
## 애플리케이션 레벨 트러플 슈팅 과정
### 1. 외부 접근 가능 여부 확인

```bash
curl http://<web-service-ip>:<node-port>
```

- `curl` 명령어를 사용해서 `NodePort` 또는 `LoadBalancer` IP로 접속을 시도한다.


### 2. 서비스 및 엔드포인트 확인

```bash
kubectl describe service <service-name>
```

- `Service`의 `Selector`와 `Pod`의 `Label`이 일치하는지 비교한다.
- 또한, `Endpoints` 항목에 `Pod`의 IP가 올바르게 기입되어있는지 확인한다.
	- 만약 비어잇다면 `Selector` 설정 오류일 확률이 높다.


### 3. Pod 상태 및 이벤트 확인

```bash
kubectl get pods
kubectl describe pod <pod-name> # Pod의 이벤트 로그(Events) 확인
```

- `Pod`의 상태가 `Running`인지, 혹은 `CrashLoopBackOff`인지 확인한다.
	- `RESTARTS` 횟수가 높다면 애플리케이션 내부 오류를 의심해야 한다.'


### 4. 애플리케이션 로그 분석

```bash
kubectl logs <pod-name>
kubectl logs <pod-name> --previous  # 재시작 전의 마지막 로그 확인
```

- 실시간 로그 확인: `-f` 옵션
- `Pod`가 `RESTART`되어 현재 로그만으로는 파악이 어려울 경우 `--previous` 옵션을 사용한다.


### 5. 데이터베이스 계층 확인

- 다른 모든 사항이 정상인데도 오류가 발생한다면 DB 계층을 점검한다.
	- DB `Pod`, DB `Service` 등

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)