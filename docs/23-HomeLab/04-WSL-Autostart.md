---
title: 부팅될 때 WSL 자동으로 실행되게 하기
description: Windows 부팅 시 자동으로 WSL(Ubuntu 등)을 실행하는 방법을 단계별로 설명합니다. 작업 스케줄러를 이용해 Node Exporter나 DCGM Exporter를 자동 구동하고, Prometheus와 Grafana로 메트릭을 모니터링할 수 있는 환경을 구축할 수 있습니다.
keywords:
  - WSL 자동 실행
  - Windows 작업 스케줄러 설정
---
---
## 왜?


내 데스크탑(Windows OS)의 메트릭들을 `WSL`의 VM 내부에서 `Node Exporter`, `DCGM Exporter`를 통해 다른 서버에서 실행되고 있는 `Prometheus`로 보내서 그걸 `Grafana`로 모니터링 하고있었다.

그런데, 매번 컴퓨터를 부팅할 때마다 `WSL`의 해당 VM을 켜주는게 귀찮아서 이를 컴퓨터 실행시 자동으로 실행되게 하고싶었다.

---
## 사전 준비

```powershell
wsl -l -v

<# 출력 예시 #>

  NAME              STATE           VERSION
* Ubuntu            Running         2
  docker-desktop    Running         2
```

- 위 명령어를 `Powershell`에서 입력한다.
- 여기서 내가 실행하고자하는 VM의 `NAME`을 기록해둔다. (나의 경우 `Ubuntu`)

---
## 작업 스케줄러
### 작업 스케줄러 실행

1. `윈도우 + R` 입력해서 '실행' 켜기
2. '실행'에 `taskschd.msc` 입력 후 확인

### 작업 만들기

좌측에 작업 스케줄러 라이브러리 우클릭 > 작업 만들기

- 일반
	- 이름: `원하는 작업 이름`
	- 보안 옵션
		- 사용자가 로그온할 때만 실행
		- 가장 높은 수준의 권한으로 실행
- 트리거
	- 작업 시작: 시작할 때
	- 고급 설정
		- 작업 지연 시간: 30초
- 동작
	- 동작: 프로그램 시작
	- 설정
		- 프로그램/스크립트: `C:\Windows\System32\WindowsPowerShell\v.1.0\powershell.exe`
		- 인수 추가: `-Command "& {wsl -d 이전에확인한VM의NAME}"`
- 설정
	- 다음 시간 이상 작업이 실행되면 중지: 해제
	- 요청할 때 실행 중인 작업이 끝나지 않으면 강제로 작업 중지 : 해제
	- 작업이 이미 실행 중이면 다음 규칙 적용 : 새 인스턴스 실행 안 함


이후 재부팅해보면 시작 이후에 자동으로 WSL이 실행되는 것을 확인할 수 있다.