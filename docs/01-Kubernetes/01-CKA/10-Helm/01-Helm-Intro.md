---
title: Helm 개요
description: Kubernetes 운영의 필수 도구 Helm 입문 가이드. Deployment, Service 등 수많은 객체를 values.yaml 하나로 제어하는 방법과 중앙 집중식 설정 관리의 효율성을 확인하세요. CKA 시험 준비와 실무 환경 모두에 유용한 내용을 담고 있습니다.
keywords:
  - Helm Chart
  - Helm
  - 헬름
  - 쿠버네티스 패키지 매니저
---
---
## Helm
### 배경

- 쿠버네티스에서 애플리케이션이 복잡해질수록 모든 리소스를 각각 관리하기 어려워진다.
- 예를 들어, 간단한 웹 서비스라고 하더라도 `Deployment`, `Service`, `PVC`, `Secret`이 필요하다.
	- 이러한 모든 객체마다 별도의 YAML 파일이 필요하며 `kubectl apply`를 파일마다 실행해야 한다.
	- 설정 변경을 할 때 여러 파일을 일일이 열어 수정해야 한다.
	- 업그레이드나 삭제 시 해당 애플리케이션에 속한 모든 객체를 기억하고 하나씩 처리해야 하므로 실수가 발생하기 쉽다.
- 그렇다고 모든 설정을 하나의 거대한 YAML 파일로 합치면 관리는 편해질 수 있으나 내용이 너무 길어 디버깅과 유지보수가 더 어려워진다.

### Helm의 등장

- `Helm`은 쿠버네티스 애플리케이션을 패키지 단위로 관리하는 도구이다.
- 쿠버네티스는 개발 객체(`Pod`, `Service` 등)만 인식하지만, `Helm`은 이들을 하나의 '애플리케이션 그룹'으로 인식한다.
- `Helm`은 쿠버네티스의 패키지 매니저로 불리며 수백 개의 객체가 포함된 앱이라도 패키지 이름만으로 제어할 수 있다.

:::tip
- 레거시 스프링을 생각해보자. 하나부터 열까지 직접 `web.xml`, `root-context.xml` 등의 수많은 xml 파일과 설정들을 일일히 해야한다.
- 스프링 부트는 Auto-configuration으로 이러한 설정들을 하나로 묶고 `application.yml`과 같은 파일 하나만 수정해서 설정을 편하게 만들었다.
- 또한 라이브러리간의 의존성도 알아서 해결해준다.
- 이와 비슷하게 `Helm`은 이러한 여러 복잡한 리소스들을 `value.yaml`로 하나로 묶어서 관리하며 의존성 또한 묶어서 한번에 관리하여 편의성을 높여준다.
:::

### 주요 기능 및 장점

- **간편한 설치:** 단일 명령어로 앱 구동에 필요한 모든 객체를 자동으로 생성한다.
- **중앙 집중식 설정 관리 (`values.yaml`):** 여러 YAML 파일을 일일이 수정하는 대신, `values.yaml`이라는 하나의 파일에서 원하는 설정(비밀번호, 볼륨 크기 등)만 변경하여 적용할 수 있다.
- **업그레이드 및 롤백:** 명령어 하나로 앱을 업그레이드할 수 있으며, 변경 이력을 추적하므로 문제 발생 시 이전 버전(Revision)으로 즉시 되돌릴(Rollback) 수 있다.
- **깔끔한 삭제:** 앱과 관련된 모든 객체를 추적하고 있으므로, 명령어 한 번으로 찌꺼기 없이 깨끗하게 삭제(Uninstall)할 수 있다.

## 설치

```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4
chmod 700 get_helm.sh
./get_helm.sh
```

:::tip
- 위 방법은 스크립트로 설치하는 방법이고 각 OS 및 환경 별 설치 방법은 아래 공식 docs에 나와있다.
- https://helm.sh/ko/docs/intro/install
:::

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)