---
title: Proxmox 설치 waiting for /dev to be fully populated 오류
description: GPU가 장착된 서버에서 Proxmox 설치 시 'waiting for /dev to be fully populated' 단계에서 멈추는 문제를 해결하는 방법을 설명합니다. nomodeset 옵션을 통해 그래픽 드라이버 충돌을 방지하고 설치를 완료할 수 있습니다.
keywords:
  - Proxmox 설치 오류
  - waiting for dev to be fully populated
  - nomodeset
  - Proxmox
  - Proxmox GPU 충돌
  - Proxmox 그래픽 드라이버
  - Proxmox 설치 문제
  - Proxmox 부팅 오류
---
---
## 상황

Proxmox 설치 초기에 `wating for /dev to be fully populated..`에서 화면이 멈추어버리는 현상 발생

## 원인

GPU가 장착되어있지 않은 일반적인 서버 환경에서는 위 오류가 발생하지 않지만, GPU가 장착되어있는 서버에 Proxmox를 설치하려고하면 그래픽 드라이버 충돌이나 호환성 문제로 위 현상이 발생한다.

이에 아예 오류를 억제하는 방식으로 설치하고 설치 이후 그래픽 드라이버를 설치해야한다.

## 해결 방법

![proxmox-install-error1](assets/pve-install-error1.png)

- Proxmox 설치 이미지가 있는 usb로 부팅을 하면 위와 같은 화면이 나온다.
- 위 화면에서 설치할 옵션을 선택(엔터 누르지말고 커서만 올려두기)해놓고 e키를 누른다.
- `linux` 가 있는 줄 끝에 `quiet splash=silent`를 지우고 `nomodeset`으로 바꾼다.
- F10을 눌러 해당 설정으로 설치한다.
- 위 설정으로 설치하면 그래픽 하드웨어의 고해상도 모드로 진입하지 않고, 기본적으로 바이오스가 제공하는 저해상도 모드룰 유지하며, 복잡한 드라이버를 부팅시 로드하지 않는다. 따라서 오류가 나지 않는 것이다.
- GPU를 사용할 것이라면, 추후에 따로 드라이버를 설치한다.