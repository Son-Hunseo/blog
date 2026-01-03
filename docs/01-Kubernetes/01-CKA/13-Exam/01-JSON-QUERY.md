---
title: JSON Path
description: Kubernetes kubectl의 -o jsonpath와 custom-columns 옵션을 활용하여 노드 이름, CPU 사양 등 원하는 데이터를 추출하고 정렬하는 방법을 정리합니다. CKA 자격증 준비와 실무 효율을 높여주는 고급 출력 제어 팁을 확인하세요.
keywords:
  - kubectl jsonpath 사용법
  - kubectl 출력 형식 변경
  - kubectl 노드 정보 추출
---
---
## JSON Path 사용법
### JSON 출력 확인

```bash
kubectl get nodes -o json

// 예시 출력
{
    "apiVersion": "v1",
    "items": [
        {
            "apiVersion": "v1",
            "kind": "Node",
            "metadata": {
                "annotations": {
                    "csi.volume.kubernetes.io/nodeid": 
...
```

- `-o json` 옵션을 붙여 전체 구조 파악

### 쿼리 구성

```bash
kubectl get nodes -o=jsonpath='{.items[*].metadata.name}'

// 예시 출력
master worker1 worker2
```

- 필요한 데이터의 경로를 `-o=jsonpath='{경로}'` 이렇게 사용

---
## 고급 출력 제어
### Range를 이용한 Loop

```bash
kubectl get nodes -o=jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.capacity.cpu}{"\n"}{end}'

// 예시 출력
master  4
worker1 2
worker2 2
```

- 여러 데이터를 순회하며 탭(`\t`)이나 줄바꿈(`\n`)을 넣어 가독성을 높일 수 있다.


### 커스텀 컬럼

```bash
kubectl get nodes -o=custom-columns=NODE:.metadata.name,CPU:.status.capacity.cpu

// 예시 출력
NODE      CPU
master    4
worker1   2
worker2   2
```

- 위처럼 커스텀 컬럼을 설정해서 표 형태로 출력하는 방법이다.

---
## 정렬 기능

```bash
// 이름순 정렬
kubectl get nodes --sort-by=.metadata.name

// CPU 사양순 정렬
kubectl get nodes --sort-by=.status.capacity.cpu
```

- 특정 필드값을 기준으로 결과를 정렬할 수 있다.

---
## 레퍼런스

- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)