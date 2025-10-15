---
title: Docker vs ContainerD
description: Kubernetes에서 Docker 지원이 중단된 이유와 containerd, nerdctl, crictl 등 주요 컨테이너 런타임 및 CLI 도구의 차이를 정리합니다. CKA 학습을 위한 핵심 개념을 이해하고, Docker 없이 Kubernetes를 운영하는 방법을 배웁니다.
keywords:
  - Kubernetes
  - Docker
  - containerd
  - nerdctl
  - crictl
  - ctr
  - CRI
  - dockershim
  - CKA
  - Kubernetes 런타임
  - Docker 지원 종료
  - OCI 표준
  - container runtime interface
  - container runtime
  - Kubernetes containerd 설치
  - nerdctl 사용법
---
---
## Docker와 Containerd의 관계

- 초창기에는 Docker가 컨테이너 생태계를 주도했고 Kubernetes도 Docker만 지원.
- 이후 다양한 컨테이너 런타임을 지원하기 위해 CRI(Container Runtime Interface) 도입.
- OCI(Open Container Initiative) 표준(이미지 스펙, 런타임 스펙)을 따르는 런타임들은 Kubernetes와 호환 가능.
- Docker는 CRI 표준을 따르지 않았기에 Kubernetes가 dockershim이라는 별도 호환 계층을 제공.
	- Docker는 Kubernetes를 위해 만들어진 것이 아니라 그 자체의 기능들도 많았기 때문에 CRI 표준을 따르기 힘들었음.
- Kubernetes v1.24에서 dockershim 제거 → Docker 직접 지원 종료.
	- 그런데 Kubernetes에서 업데이트를 하며, dockershim을 지원하기 위한 리소스가 너무 많이 들어 Docker 지원 종료
- 그러나 Docker가 생성한 이미지는 OCI 스펙을 따르므로 containerd 등 다른 런타임에서 그대로 사용 가능.
	- 그래서 Docker 이미지도 kubernetes에서 사용가능한 것

---
## Containerd

- 원래 Docker 내부 구성요소였으나 현재는 독립 프로젝트(CNCF).
	- Containerd는 원래 docker의 컨테이너 런타임이었으나 docker가 이를 CNCF에 기부함.
- Kubernetes가 직접 사용할 수 있는 CRI 호환 런타임.
- 단독 설치 가능하며 Docker 없이도 컨테이너 실행 가능.
	- cf) 원래 나는 kubernetes를 설치할 때, Docker 설치 -> Kubernetes 설치 이렇게 했었는데, 불필요한 Docker의 다른 요소까지 설치하기 보다는 containerd 설치 -> Kubernetes 설치 이게 맞다.

---
## 주요 CLI 도구 비교

### ctr
    
- containerd 기본 제공 CLI        
- 디버깅용, 기능 제한적, 사용자 친화적이지 않음
- 예: `ctr images pull`, `ctr run`
        
### nerdctl (추천)
    
- containerd 커뮤니티에서 개발
- Docker와 유사한 CLI 경험 제공
- Docker보다 더 많은 최신 기능 지원 (이미지 암호화, lazy pull, P2P 배포 등)
- 실사용 시 Docker CLI를 대체 가능
	- Docker의 많은 명령어를 그냥 nerdctl로 대체해서 사용 가능 (`docker ps` -> `nerdctl ps`)
        
### crictl
    
- Kubernetes 커뮤니티에서 개발
- CRI 호환 런타임을 대상으로 디버깅/점검용 CLI
- 컨테이너 생성보다는 로그 확인, pod 조회, 디버깅 목적
- kubelet과 협력하여 동작

### 요약 정리

- ctr: containerd 기본 디버깅용 → 거의 사용 X    
- nerdctl: Docker CLI와 유사, containerd 기반 운영 시 주 사용
- crictl: Kubernetes 전용 디버깅용, 모든 CRI 런타임과 호환

즉, 일반적으로 컨테이너 실행/관리에는 **nerdctl**, Kubernetes 환경 디버깅에는 **crictl**을 사용.

## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)