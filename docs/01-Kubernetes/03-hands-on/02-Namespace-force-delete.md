---
title: Terminating 상태의 Namespace 강제로 삭제하기
description: Kubernetes에서 네임스페이스가 Terminating 상태로 삭제되지 않을 때, Finalizer를 제거하여 강제로 네임스페이스를 삭제하는 방법을 단계별로 설명합니다.
keywords:
  - Kubernetes 네임스페이스 삭제
  - Kubernetes Finalizer
  - Terminating 상태 해결
  - kubectl finalize
  - 네임스페이스 강제 삭제
---
---
## 상황

![namespace-force-delete1](assets/namespace-force-delete1.jpg)

Kubernetes에서 네임스페이스를 삭제했을 때, 해당 네임 스페이스의 리소스는 모두 삭제되었지만, `kubectl get ns` 했을 때, `Terminating` 상태로 지속적으로 네임스페이스가 삭제되지 않는 경우가 있다. 이럴 경우 강제로 네임스페이스를 삭제하는 법을 알아보자.

## 해결

### 네임스페이스 YAML 추출

```bash
kubectl get namespace 네임스페이스이름 -o json > ns.json
```

---

### Finalizer 제거

`ns.json` 파일을 열고 (`nano ns.json` 등으로) 아래처럼 `"spec.finalizers"` 항목을 빈 배열로 바꿔준다.

```bash
"spec": {
    "finalizers": [] 
}
```

---

### API 서버에 강제 적용

```bash
kubectl replace --raw "/api/v1/namespaces/mynamespace/finalize" -f ./ns.json
```

이 명령을 실행하면 해당 네임스페이스가 즉시 삭제된다.