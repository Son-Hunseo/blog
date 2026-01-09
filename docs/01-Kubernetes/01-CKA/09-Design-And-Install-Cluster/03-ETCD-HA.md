---
title: External Etcd 토폴로지 (HA)
description: 쿠버네티스 고가용성을 위한 External Etcd 토폴로지 완벽 가이드. Raft 프로토콜의 리더 선출 원리부터 쿼럼(Quorum) 계산법, 홀수 노드 구성의 이유 및 실제 설치/설정 방법까지 상세히 설명합니다.
keywords:
  - etcd
  - External Etcd
  - RAFT Protocol
  - Quorum
  - HA 구성
  - Etcd HA
---
---
## External Etcd 토폴로지
### ETCD 특징

- 분산되고 신뢰할 수 있는 Key-Value 저장소로 단순하고 안전하며 빠르다.
- `etcd`를 여러 서버에 구축하여 클러스터로 묶는다면 여러 `etcd`에 데이터를 동일하게 복제하여 저장하므로 특정 노드에 장애가 발생해도 데이터 유실을 방지한다.

### 리더 선출 (RAFT 프로토콜)

**노드의 상태 종류**

- Leader: 모든 클라이언트의 요청(Write)을 수신하고 관리하며 팔로워들에게 데이터를 복제한다.
- Follower: 리더로부터 메시지를 수신하며 대기한다. 또한, 리더가 살아있는지 감시한다.
- Candidate: 리더가 없는 상태에서 새로운 리더가 되기 위해 선거를 시작한 노드이다.

**선출 과정**

1. Heartbeat 감시: 리더는 주기적으로 팔로워들에게 본인이 살아있음을 알리는 'Heartbeat' 메시지를 보낸다.
2. 타임아웃 발생: 팔로워가 일정 시간(Election Timeout) 동안 Heartbeat를 받지 못하면, Leader에게 문제가 생겼다고 판단하고 자신의 상태를 Candidate로 변경한다.
3. 투표 요청: Candidate는 자신에게 한 표를 던지고, 다른 노드들에게 투표 요청 메시지를 보낸다.
4. 과반수 득표: 클라스터 전체 노드 중 과반수(Quorum: 쿼럼) 이상의 찬성표를 얻은 노드가 새로운 리더가 된다.
	- 동시에 여러 노드가 Candidate가 되어 표가 갈리는 경우, 각각 랜덤한 대기 시간을 가진 후 다시 선거를 시작하여 충돌을 방지한다.
5. 리더 확정: 선출된 리더는 즉시 다른 노드들에게 Heartbeat를 보내 자신이 리더임을 알리고 선거를 종료한다.

### 쿼럼(Quorum)과 홀수 노드 구성의 중요성

- 클러스터가 정상적으로 쓰기 작업을 수행하기 위해 필요한 최소한의 노드 수를 쿼럼(Quorum)이라고 한다.
- 쿼럼 계산 공식: $Quorum = \frac{\text{Total Nodes}}{2} + 1 \quad (소수점은 버림 처리)$

| **전체 노드 수** | **쿼럼 (필요 노드 수)** | **내결함성 (허용 장애 수)** | **비고**                          |
| ----------- | ---------------- | ------------------ | ------------------------------- |
| 1           | 1                | 0                  | 장애 시 서비스 중단                     |
| 2           | 2                | 0                  | 1대 장애 시 남은 노드가 1대라 쿼럼(2) 미달로 중단 |
| **3**       | **2**            | **1**              | **최소 권장 구성**                    |
| 4           | 3                | 1                  | 3노드와 동일한 내결함성 (비효율적)            |
| **5**       | **3**            | **2**              | 안정적인 운영 권장                      |
| 6           | 4                | 2                  | 5노드와 동일한 내결함성                   |
| 7           | 4                | 3                  | 안정적                             |

- 위와 같이 짝수 갯수의 노드 구성은 노드 수가 1개 적은 구성과 같은 내결함성을 가지기 때문에 구성할 이유가 없다.
- 또한 내결함성 이유 뿐만 아니라 네트워크 분리 상황에서의 생존성도 이유가 된다.
- 예
	- 6개의 노드 구성: 네트워크 문제로 정확히 반(3:3)으로 나뉘면, 양쪽 그룹 모두 쿼럼(4)을 충족하지 못해 전체 클러스터 실패한다.
	- 5개의 노드 구성: 네트워크 문제로 분리(3:2)되더라도 한쪽 그룹은 쿼럼(3)을 유지하므로 클러스터가 계속 작동할 수 있다.

### Write 프로세스

- `etcd` 클러스터에서는 모든 노드에서 Read는 가능하지만 Write는 오직 리더를 통해서만 처리할 수 있다.
- Write 프로세스
	1. 팔로워 노드로 Write 요청이 들어오면 내부적으로 리더에게 전달한다.
	2. 리더는 Write 요청을 처리하고 다른 팔로워들에게 데이터를 복제(동기화)한다.
	3. 합의(Consensus): 클러스터 내 과반수(Majority) 노드에 데이터가 기록되어야 쓰기가 완료된 것으로 간주한다.

---
## 구성 과정
### 설치

- [ETCD 글](../01-concept/03-etcd.md) 와 비슷

```bash
curl -LO https://github.com/etcd-io/etcd/releases/download/v3.5.6/etcd-v3.5.6-linux-amd64.tar.gz
```

```bash
tar xvzf etcd-v3.5.6-linux-amd64.tar.gz
```

```bash
mv etcd-v3.5.6-linux-amd64/etcd* /usr/local/bin/
```

```bash
mkdir -p /etc/etcd /var/lib/etcd
```

### 인증서 발급 및 적용

:::info
인증서 발급 관련해서는 -> 참고 글: [ETCD 인증서 발급](../06-Security/03-Certificate-Creation.md#etcd)
:::

```bash
cp ca.pem kubernetes-key.pem kubernetes.pem /etc/etcd/
```

- 인증서 옮기기

### etcd.service 설정

- `/etc/systemd/system/etcd.service` 파일 수정 (클러스터에서는 Static Pod yaml 수정했지만 현재는 외부 토폴로지 구성으로 이 파일을 수정해야함)
- 예시

```ini
...
ExecStart=/usr/local/bin/etcd \
  --name node-1 \
  --data-dir /var/lib/etcd \
  --initial-advertise-peer-urls http://192.168.0.10:2380 \
  --listen-peer-urls http://192.168.0.10:2380 \
  --listen-client-urls http://192.168.0.10:2379,http://127.0.0.1:2379 \
  --advertise-client-urls http://192.168.0.10:2379 \
  --initial-cluster-token etcd-cluster-1 \
  --initial-cluster node-1=http://192.168.0.10:2380,node-2=http://192.168.0.11:2380,node-3=http://192.168.0.12:2380 \
  --initial-cluster-state new
...
```

- `--initial-cluster`: 여기가 클러스터 설정하는 부분

```bash
sudo systemctl daemon-reload
sudo systemctl start etcd
sudo systemctl enable etcd
```

---
## 레퍼런스

- https://etcd.io/docs/v3.5/op-guide/clustering/
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)