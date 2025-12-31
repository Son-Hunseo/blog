---
title: Kustomize vs Helm
description: Kustomize와 Helm 중 무엇을 선택해야 할까요? 쿠버네티스 매니페스트 관리 도구의 특징, 가독성, 복잡도 및 환경별 설정 방식을 완벽 비교합니다. 자체 서비스 개발인지 패키징 배포인지에 따른 명확한 선택 기준을 확인해 보세요.
keywords:
  - Kustomize vs Helm
  - Kustomize
  - Helm
---
---
## Kustomize vs Helm
###  Helm으로 환경을 나눠서 관리한다면?

```plain
my-helm-project/
├── templates/                 # [로직] 변수가 적용된 쿠버네티스 매니페스트들이 위치
│   ├── deployment.yaml        # (위의 예시처럼 {{ }} 문법이 들어간 파일)
│   ├── service.yaml
│   └── ingress.yaml
│
├── values.yaml                # [기본 데이터] 모든 환경에 공통으로 적용될 기본값
│
# --- 환경별로 다른 값을 덮어씌우기 위한 파일들 ---
├── values.dev.yaml            # [Dev] 개발 환경용 설정 (예: replicas: 1)
├── values.staging.yaml        # [Staging] 스테이징 환경용 설정
└── values.prod.yaml           # [Prod] 운영 환경용 설정 (예: replicas: 5)
```

### 비교

| **특징**  | **Helm**                                                           | **Kustomize**                       |
| ------- | ------------------------------------------------------------------ | ----------------------------------- |
| **방식**  | Go 템플릿 엔진 사용                                                       | 표준 YAML 오버레이(Overlay) 방식            |
| **복잡도** | **높음.** 기능이 많고 문법이 복잡함                                             | **낮음.** 구조가 단순하고 이해하기 쉬움            |
| **가독성** | **어려움.** Go 템플릿 문법(`{{ }}`) 때문에 표준 YAML이 아니며, 차트를 읽고 해석하기 난해할 수 있음 | **좋음.** 표준 YAML 문법을 그대로 사용하므로 읽기 편함 |
| **기능**  | 조건문, 루프 등 프로그래밍적 기능 제공                                             | 기본적인 패치 및 병합(Merge) 기능 위주           |
| **결론**  | 복잡한 로직과 패키징이 필요할 때 유리하지만 러닝 커브가 있음                                 | 단순하고 가독성이 중요한 프로젝트에 유리함             |

### Kustomize, Helm 선택의 기준

:::tip
- `Helm`은 단순한 설정 도구를 넘어 Linux의 `YUM`이나 `APT` 처럼 패키지 매니저 역할을 한다.
- 조건문, 루프와 같은 동적인 설정 / 버전 관리와 롤백의 기능이 특징적이다.
- 그렇다고 `Kustomize`가 버전 관리의 기능이 없냐? -> 아니다 `ArgoCD`와 같은 도구로 `GitOps` 형태로 관리하면 된다.
- 그러면 어떠한 기준으로 선택해야하냐?
	- 자체 서비스를 개발한다 -> `Kustomize`
	- 우리가 만든 소프트웨어를 여러 고객사나 다양한 환경에 맞춤형으로 배포해야한다. -> `Helm`
:::

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)