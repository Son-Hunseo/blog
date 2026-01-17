---
title: Ubuntu/Debian WOL(Wake-On-LAN) 설정하기
description: MSI 메인보드와 Ubuntu/Debian에서 Wake-on-LAN(WOL)을 설정하는 방법을 정리했습니다. BIOS 설정부터 ethtool, systemd 서비스 등록, 공유기 설정까지 간단히 안내합니다.
keywords:
  - WOL
  - Wake On LAN
  - MSI
  - Ubuntu
  - Debian
  - ethtool
  - BIOS
  - 원격 부팅
  - 홈서버 구축
---
---
:::info
WOL의 경우 pc가 한 번 이상 켰던 상태여야한다. 왜냐하면 WOL의 경우 S5상태(전원은 종료, 네트워크 카드에 대기 전력은 공급되는 상태)이어야 작동하는데, 한 번도 켜지지 않았던 pc의 경우 G3상태(모든 전력이 차단된 상태)이기 때문이다.
:::

## 바이오스 설정

**MSI 메인보드 기준**

1. 부팅 시 Del키로 바이오스 진입
2. SETTINGS - Advanced - Wake Up Event Setup
	- Resume By PCI-E Device: `Disabled` -> `Enabled`
3. cf) SETTINGS - Advanced - Power Management Setup - ErP Ready 옵션이 만약 `Enabled`로 설정되어있다면, `Disabled`로 설정 (보통은 기본적으로 `Disabled`로 되어있다.

---
## WOL 설정 (Ubuntu/Debian)

```bash
ip link show
```

- 위 명령어를 입력하고 네트워크 인터페이스 이름과 MAC주소를 알아둔다.

```
sudo apt-get install ethtool
```

- `ethtool`을 설치한다.

```bash
sudo ethtool <네트워크 인터페이스 이름>
```

- 해당 인터페이스에서 WOL을 지원하는지 본다.
	- `Wake-on` 옵션을 보고 `d`라면 비활성 `g`라면 활성되어있는 것이다.
	- 이미 활성되어있다면 아래 내용 생략

```bash
sudo ethtool -s <네트워크 인터페이스 이름> wol g
```

- 위 명령어를 입력하면 `Wake-on` 옵션이 활성화된다.
- 하지만 재부팅하면 다시 비활성화된다.
- 영구적으로 적용하려면 아래 내용을 따른다.

```bash
sudo nano /etc/systemd/system/wol.service
```

```bash
[Unit]
Description=Enable Wake-on-LAN
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ethtool -s <네트워크 인터페이스 이름> wol g

[Install]
WantedBy=multi-user.target
```

- 위와같은 내용의 파일을 추가한다.

```bash
sudo systemctl daemon-reload
sudo systemctl enable wol.service
sudo systemctl start wol.service
```

- 이렇게하면 재부팅 후에도 `Wake-on` 옵션이 계속 활성화된다.

---
## 공유기 설정

**KT 공유기 기준**
- 공유기에 따라 MAC주소를 입력하는 경우가있고 IP주소를 입력하는 경우가 있다.

![wol1](assets/wol1.png)

- 장치설정 - 부가 기능 - 스마트 부팅 설정
	- MAC 주소와 PC이름을 설정하고 PC켜기를 누르면 원격으로 컴퓨터를 부팅할 수 있다.
- 보통 통신사 공유기들은 외부 접근을 허용하지 않는다. 이에 포트포워딩을 하거나 vpn을 통해 접속하면 된다.

:::info
WOL 기능을 좀 더 편하게 사용하기 위해서는 휴대폰 앱을 사용할 수 있다. 다만, 외부에서 원격으로 사용해야할 때는 내부망에 접속 하기위한 VPN을 켠 상태에서 사용하면 된다.
:::