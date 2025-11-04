---
title: Pi-Hole로 광고 차단과 내부 DNS 설정하기
description: Proxmox 환경에서 Debian 기반 LXC 컨테이너로 Pi-hole을 설치하고 내부망 DNS 서버 및 광고 차단 시스템을 구축하는 방법을 단계별로 설명합니다. 정적 IP 설정, 공유기 DNS 등록, 내부 도메인 관리와 화이트리스트 추가 방법까지 자세히 다룹니다.
keywords:
  - Pi-hole 설치
  - 내부 DNS 서버
  - Proxmox 컨테이너
---
---
## 왜?

![pi-hole0](./assets/pi-hole0.png)

내부망에서 사용하는 서비스가 많아질 수록 ip를 직접 입력하고 접속하는 것 보다. dns로 접속하고 싶었다. 추가적으로 광고 차단도 되는 Pi-Hole을 사용해보았다.

---
## 컨테이너 생성
### 컨테이너 템플릿 다운로드

```bash
pveam update
pveam available | grep debian
```

- debian os 컨테이너 템플릿을 확인한다.

```bash
pveam download local debian-12-standard_12.12-1_amd64.tar.zst
```

- 템플릿 중 cpu 아키텍처와 맞으며, 원하는 컨테이너 템플릿을 다운로드한다.

### 컨테이너 생성

| 항목        | 설정값 예시                                                                            |
| --------- | --------------------------------------------------------------------------------- |
| Node      | cloud                                                                             |
| CT ID     | 105                                                                               |
| Hostname  | pihole                                                                            |
| Template  | debian-12-standard                                                                |
| Password  | (원하는 비밀번호)                                                                        |
| Disk Size | 8GB                                                                               |
| CPU       | 1 core                                                                            |
| Memory    | 512MB                                                                             |
| Network   | Static IP<br>- IPv4/CIDR: 원하는IP/24<br>- Gateway (IPv4): 게이트웨이IP<br>- Firewall 비활성 |
| Features  | Nesting=1                                                                         |

- 단순 DNS서버이기 때문에, 높은 사양이 필요없다.
- DNS서버이기 때문에 DHCP가 아닌 Static IP를 설정하자.
- `Nesting=1` 필수

### Pi-Hole 설치

```bash
apt update && apt upgrade -y
apt install curl -y
curl -sSL https://install.pi-hole.net | bash
```

- 여기서 Upstream DNS provider를 선택하는 옵션이 있는데, 이건 상위 DNS 서버를 선택하는 것이다.
- 예를 들어, https://www.naver.com 은 나의 DNS서버에는 당연히 등록되어있지 않고, 이를 비롯해 많은 우리가 사용하는 인터넷 주소들이 나의 DNS서버에는 없다. 
- 그래서 Pi-hole로 지정한 나의 DNS서버에 없는 주소를 입력했을 경우 찾는 DNS서버를 설정하는 것이다.
	- ex: 1.1.1.1(Cloudflare), 8.8.8.8(Google)
- 다른 옵션은 모두 디폴트로 선택한다.


```bash
pihole setpassword
```

- 설치 이후 초기 비밀번호를 위 명령어로 얻은 뒤, 로그인하고 앞으로 사용할 비밀번호를 설정한다.

---

## DNS 등록

![pi-hole1](./assets/pi-hole1.jpg)

- 공유기 설정 페이지로 가서 DNS 주소에 Pi-Hole 서버의 IP를 등록한다.
- 대체로 여기에 각 통신사 DNS서버 주소가 들어가 있을 것이다.
- 보조 DNS 주소는 비워두자. 왜냐하면, 이를 통해 광고가 차단되지 않을 수 있기 때문이다.


---

## 추가 기능
### 내부 DNS

![pi-hole2](./assets/pi-hole2.jpg)

- Settings > Local DNS Records


### 추가 허용 및 차단

![pi-hole3](./assets/pi-hole3.jpg)

- Domains