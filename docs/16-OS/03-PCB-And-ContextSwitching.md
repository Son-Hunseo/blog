---
title: PCB와 Context Switching
description: PCB(Process Control Block)와 Context Switching의 개념을 쉽게 설명합니다. 프로세스 메타데이터 관리 방식과 CPU 레지스터 기반의 컨텍스트 스위칭 동작 원리를 이해할 수 있는 운영체제 핵심 정리입니다.
keywords:
  - PCB
  - Process Control Block
  - 컨텍스트 스위칭
  - context switching
  - 운영체제
---

---
## PCB(Process Control Block)
### 정의

프로세스가 여러개일 때, CPU는 프로세스들을 효율적으로 처리하기위해 스케줄링을 통해 우선순위를 정해 처리한다.

이때 이 프로세스들을 식별하기 위한 메타데이터를 `Process Metadata`라고 하고 이 메타데이터를 저장하는 공간이 `PCB(Process Control Block)`이라는 곳에 저장된다.

### 자료 구조

`PCB`는 Linked List 방식으로 관리된다. (PCB List Head에 PCB들이 생성될 때 마다 붙는다)

---
## Context Switching
### 정의

위의 PCB에 프로세스의 메타데이터를 저장하고 다시 쓰고 하는 과정을 풀어서 말해보자.

CPU가 어떤 연산을 할 때 RAM에서 직접 데이터를 가져와서 계산하는 게 아니라 먼저 데이터를 레지스터로 가져온 뒤 레지스터 안에서 연산하고 결과를 다시 RAM에 써주는 방식으로 동작한다.

이에 프로세스의 메타데이터를 PCB에 저장하고 다시 쓰고하는 과정 또한 CPU의 레지스터에서 기존의 프로세스 메타데이터를 PCB에 저장하고 새로운 프로세스의 메타데이터를 CPU의 레지스터에 불러오는 과정인 것이다.

이때 "CPU의 레지스터 정보가 변경되는 것"을 `Context Switching`이라고 한다.

