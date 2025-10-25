---
title: AMD mini pc 안정성을 위한 바이오스 설정
description: AMD CPU 발열 문제 해결을 위한 BIOS 설정 가이드. Core Performance Boost, C-state, PSS Support 비활성화로 서버 운영 시 IDLE 온도 60→45도, 빌드 시 92→60도 감소. 오버클럭 없이 안정적인 시스템 구축 방법.
keywords:
  - mini pc 발열 감소
---
---
부팅시 Delete키를 눌러서 바이오스 화면으로 진입

Advanced - AMD CBS - CPU Common Options
- Core Performance Boost - `Disabled`
	- 자동 오버클럭 기능 해제
- Global C-state Control - `Disabled`
	- 레이턴시 최적화

Advanced - CPU Configuration
- PSS Support - `Disabled`
	- PBO와 같은 설정, 오버클럭이 필요없으니 꺼준다.

위 설정을 할 시 발열이 확연하게 줄어든다. 

게임을 할 경우의 성능은 낮아질 수 있지만 나처럼 서버로 사용하는 입장에서는 CPU에 부하를 많이 발생시킬 경우가 없기 때문에 상당한 도움이 됐다.

IDLE 온도 : 60 -> 45
어플리케이션 빌드시 온도 : 92 -> 60