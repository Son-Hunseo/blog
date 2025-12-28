---
title: Pod 대역과 사설망 대역이 겹치는 문제
description: 쿠버네티스에서 Jenkins Pod가 java.net.UnknownHostException 오류로 외부 도메인에 접근하지 못하는 문제를 해결한 사례입니다. Calico 네트워크의 Pod CIDR과 내부망 IP 대역이 겹쳐 발생한 DNS 실패 원인을 분석하고, 클러스터 재설치로 해결한 과정을 정리했습니다.
keywords:
  - Kubernetes Calico DNS 오류
  - Pod CIDR 내부망 충돌
  - Jenkins UnknownHostException 해결
---
---
## 문제 상황

클러스터를 새로 구축하면서 `Jenkins`를 설치하던 중에 `Pod`에서 에러가 생기며 생성되지 않는 문제가 생겼다. 

로그를 찍어보니 `Caused by: java.net.UnknownHostException: updates.jenkins.io` 즉, `updates.jenkins.io` 라는 도메인을 IP 주소로 변환하는데 실패했다는 것이다.

현재 DNS서버는 `Pi-Hole`로 구축되어있으며 업스트림 DNS서버는 클라우드 플레어이다. 그래서 못찾을리가 없는데, 라고 생각하고 있었다. (쿠버네티스 클러스터 외부에 따로 컨테이너로 실행되고 있다.)

하지만 원인을 찾았다. Pod대역과 나의 내부망 대역이 겹쳐서(`192.168.0.0/16`) 클러스터 외부의 나의 내부망 대역들을 Pod 라고 생각하고 클러스터 내부에서 찾는데, 없으니까 요청이 소실되는 것이다.

이에 여러 시도를 해보았으나, 몇가지를 수정하고 재설정 한다고 해도 내부 설정들이 꼬이는 경우가 많아서 그냥 쿠버네티스를 내부 대역과 겹치지 않게 다시 설치하는게 낫다는 결론에 이르렀다.

- 관련 공식 문서: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster

---