---
title: Kube-scheduler
description: kube-scheduler는 Kubernetes에서 Pod를 어떤 노드에 배치할지 결정하는 핵심 컴포넌트입니다. 이 글에서는 스케줄러의 역할, Filter 및 Rank 단계의 동작 원리, 스케줄링 우선순위 요소, 그리고 설치 및 확인 방법을 CKA 학습 기준으로 정리했습니다.
keywords:
  - kube-scheduler
  - kubernetes scheduler
  - pod scheduling
  - node affinity
  - taints and tolerations
---
---
## 개요

- `kube-scheduler`는 `Pod`를 어느 노드에 배치할지 결정하는 역할을 한다.
- 중요한 점: `kube-scheduler`는 단지 <span style={{color: 'red'}}>"어디에 둘지 결정"</span>만 하며, 실제로 `Pod`를 생성하여 실행하는 것은 각 노드의 `kubelet`이 담당한다.

---
## 스케줄러가 필요한 이유

- 클러스터에는 여러 노드가 있고, 각 노드의 리소스 상태(cpu, memory 등)가 다르다.
- 특정 `Pod`가 필요한 리소스를 만족할 수 있는 노드에 배치하지 않으면 실행이 불가능하다.
- 따라서 스케줄러는 `Pod`의 요구사항과 클러스터 상태를 바탕으로 최적의 노드를 선택한다.

---
## Pod 배치 과정 (스케줄링 흐름)

예시: cpu 10을 요구하는 `Pod`가 있고, 노드들의 cpu 상태가 각각 4/4/12/16이라고 가정할 때
1. Filter 단계
    - 조건에 맞지 않는 노드들을 걸러낸다.
    - 예시: cpu 4/4인 노드는 pod 요구사항(cpu 10)을 충족하지 못하므로 제외
    
2. Rank 단계
    - 남은 후보 노드(12, 16)에 점수를 매긴다. (Priority Functions)
    - 예시:
        - 노드 12에 배치 시: 남는 cpu = 2
        - 노드 16에 배치 시: 남는 cpu = 6
        - 남는 자원이 더 많은 노드(16)가 더 높은 점수를 받아 선택됨
    
3. 우선순위 결정 요소들
    - Resource Requirements and Limits
    - Taints and Tolerations
    - Node Selectors 및 Affinity
    - 이 외에도 다양한 요소들이 있으며, 알고리즘은 커스텀할 수 있다.

---
## 설치 및 확인

### Kubeadm Setup

**설치**

- `kubeadm`으로 클러스터 설치 시 `kube-scheduler`는 자동으로 설치된다. (`Pod` 형태로)


**설정 조회**

 ```bash
sudo nano /etc/kubernetes/manifests/kube-scheduler.yaml
 ```

- 위 경로에 yaml 형태로 설정이 저장되어있다.
- 설정 변경도 위 yaml 파일을 변경하면 자동으로 된다.
	- Static Pod 이기 때문인데, 이는 나중에 자세히 다루도록 한다.

### Manual Setup (Kubernetes The Hard Way)

**설치**

```bash
wget https://dl.k8s.io/v1.31.14/bin/linux/amd64/kube-scheduler

sudo mv kube-scheduler /usr/local/bin/ 
sudo chmod +x /usr/local/bin/kube-scheduler

sudo nano /etc/systemd/system/kube-scheduler.service
```

```ini
[Unit]
Description=Kubernetes Scheduler
Documentation=https://kubernetes.io/docs/
After=network.target

[Service]
ExecStart=/usr/local/bin/kube-scheduler \
  --kubeconfig=/etc/kubernetes/kube-scheduler.kubeconfig \
  --leader-elect=true \
  --v=2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target

```

```bash
sudo systemctl daemon-reload
sudo systemctl start kube-scheduler
sudo systemctl enable kube-scheduler
```

- 위 명령어는 `kube-scheduler`를 바이너리를 직접 다운로드하여 설치하는 명령어이다.
	- https://www.downloadkubernetes.com/ 참조
- `/usr/local/bin/` 으로 이동시켜 PATH에 등록한다.
- 이에 시스템 전역 실행 파일로 사용가능한 것이다.


**설정 조회**

```bash
cat /etc/systemd/system/kube-scheduler.service
```

- `systemd`에 설치했기 때문에 위 경로에서 설정을 조회하고 수정할 수 있다.
- 해당 파일을 수정한 뒤 아래 명령어 수행해야 적용된다.
	- `sudo systemctl daemon-reload`
	- `sudo systemctl restart kube-scheduler`

---
## 레퍼런스

- [https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/)
- [https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/)
- [https://kubernetes.io/docs/concepts/overview/components/](https://kubernetes.io/docs/concepts/overview/components/)
- [https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/](https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)