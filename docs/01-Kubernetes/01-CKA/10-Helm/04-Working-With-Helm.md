---
title: Helm 명령어
description: Helm의 핵심 CLI 명령어를 한눈에 확인하세요. 레포지토리 추가부터 차트 검색, values.yaml 추출 및 사용자 정의 설치, 배포된 릴리즈 관리까지 쿠버네티스 패키지 관리에 꼭 필요한 필수 명령어 가이드를 제공합니다.
keywords:
  - Helm 명령어
  - Helm CLI
  - Helm 사용법
---
---
## Helm 주요 CLI 명령어
### Help

```bash
helm --help
```

- 명령어가 기억나지 않을 때 빠르게 확인하는 명령어

```bash
helm repo --help
```

- 레포지토리 관련 명령어 확인
- 하위 명령어가 기억나지 않을 때 `--help` 플래그를 붙여 찾을 수 있다.

### Search

```
helm search hub wordpress
```

- Artifact Hub에서 검색하는 명령어

```bash
helm search repo wordpress
```

- 내 로컬에 등록된 레포지토리 내에서만 검색하는 명령어

### Repo

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
```

- 레포지토리 추가 명령어

```bash
helm repo update
```

- 레포지토리 업데이트 명령어 (`apt-get update` 처럼 최신 차트 정보를 가져온다고 생각하면 됨)

```bash
helm repo list
```

- 로컬에 현재 등록된 레포지토리 목록 확인 명령어

### Install (Default)

```bash
helm install my-release bitnami/wordpress
```

- `bitnami` 레포지토리의 `wordpress`를 설치하는 명령어 (기본 설정값 그대로 설치)

### Install (Custom)

- 이전 명령어는 기본 설정값을 그대로 사용하여 설치하엿지만, 보통 설정을 수정하여 사용한다.
- 이렇게 커스텀하는 방법은 여러가지가 있다.

```bash
helm install my-release bitnami/wordpress \
  --set wordpressBlogName="Helm Tutorials" \
  --set userEmail="john@example.com"
```

- 방법1
- `--set` 옵션을 사용할 수 있다.
- 변경할 설정이 적을 때 사용하면 좋은 방법이다.

```bash
helm install my-release bitnami/wordpress -f custom-values.yaml
```

- 방법2
- `custom-values.yaml` 과 같은 이름으로 파일을 생성한다.
- 변경할 변수들을 `key: value` 형식의 yaml 형식으로 작성한다.
- 설치시 `-f` 옵션으로 파일을 지정하여 설치한다.
- 그러면 디폴트 `values.yaml`의 값보다 `custom-values.yaml`의 값이 우선된다.

```bash
helm pull bitnami/wordpress --untar
```

```bash
helm install my-release ./wordpress
```

- 방법3
- 이전 명령어는 기본 설정값을 그대로 사용하여 설치하엿지만, 보통 설정을 수정하여 사용한다.
- 이럴 때, 해당 차트의 `values.yaml`를 수정하여 설치한다.
- 위 명령어로 차트 전체를 pull 해서 이 안에 있는 `values.yaml`을 수정한다.
- 이후 pull한 차트를 기밚으로 설치한다.

### List & Uninstall

```bash
helm list
```

- 현재 설치된 Release들과 업데이트 현황을 조회하는 명령어이다.

```bash
helm uninstall my-release
```

- `Helm`을 사용하기 전에는 수동으로 `Deployment`, `Service`, `Secret` 등을 하나하나 지워야했지만 이 명령어로 이러한 자원들을 한번에 삭제할 수 있다.

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)
- https://helm.sh/ko/docs/helm/