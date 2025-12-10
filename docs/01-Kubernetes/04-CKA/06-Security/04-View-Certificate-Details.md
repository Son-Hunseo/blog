---
title: 쿠버네티스 인증서 문제 해결 체크리스트
description: Kubeadm으로 구축된 쿠버네티스(Kubernetes) 클러스터의 인증서 오류 해결 가이드. 인증서 경로 확인, OpenSSL을 이용한 만료일 및 SAN 검증, 런타임 로그 분석 등 트러블슈팅의 핵심 절차를 정리했습니다.
keywords:
  - 쿠버네티스
  - Kubernetes
  - 인증서 갱신
  - Kubernetes 인증서 문제 해결
  - Kubernetes Certificate Trouble Shooting
---
---
:::info
- 본인이 새로운 팀에 합류하였고, 마주한 업무가 인증서에서 생긴 문제를 해결해야한다고 가정하자.
- 클러스터가 직접 `manual`하게 구축되었는지, `kubeadm`으로 자동으로 구축되었는지에 따라 다르지만, `manual`하게 구축 된 경우는 많지 않으므로 `kubeadm`으로 구축된 경우 어떠한 절차를 따라서 인증서에 생긴 문제를 해결해야하는지 알아보자. 
:::

## 인증서 현황 파악 프로세스

**1. 인증서 파일 위치 찾기**

```bash
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

- `kube-apiserver` yaml 파일 등(원하는 컴포넌트의 yaml 파일)을 보고, 내부 인자에서의 인증서 경로들을 확인한다.

**2. 인증서 세부 정보 체크**

```bash
openssl x509 -in <인증서파일경로> -text -noout
```

- 확인해야 할 정보
	- `Subject (CN)`: 인증서 이름
	- `Subject Alternative Names (SAN)`: DNS 이름 및 IP 주소 목록
	- `Validity`: 인증서 만료일
	- `Issuer`: 발급자 정보 (`kubeadm`의 경우 보통 Kubernetes CA)

---
## 트러블 슈팅
### 검증 체크리스트

- [ ] 인증서 이름이 올바른가?
- [ ] 필요한 모든 대체 이름(SAN)이 포함되어 있는가?
- [ ] 올바른 조직(Organization)에 속해 있는가?
- [ ] 신뢰할 수 있는 올바른 발급자(CA)가 발급했는가?
- [ ] 인증서가 만료되지 않았는가?

### 로그 확인

- 정상적인 상황
	- `kubectl logs <Pod이름>` 으로 로그 확인
- 핵심 컴포넌트 (`kube-apiserver`, `etcd` 등) 가 다운된 경우
	- 이 때는 컨테이너 런타임 레벨(`Docker` or`Containerd`)에서 직접 로그를 확인해야 한다.
	- 컨테이너 조회: `docker ps -a` or `crictl ps -a`
	- 로그 조회: `docker logs <컨테이너ID>` or `crictl logs <컨테이너ID>`

---
## 레퍼런스

- [https://kubernetes.io/docs/setup/best-practices/certificates/#certificate-paths](https://kubernetes.io/docs/setup/best-practices/certificates/#certificate-paths)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)