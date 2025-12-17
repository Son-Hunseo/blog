---
title: DNS
description: 리눅스(Linux) 시스템의 네임 레졸루션(Name Resolution) 원리부터 /etc/hosts, DNS 서버 설정(/etc/resolv.conf), 우선순위 변경(nsswitch.conf) 및 도메인 구조와 레코드 타입까지 핵심 내용을 완벽 정리합니다.
keywords:
  - Name Resolution
  - /etc/hosts
  - DNS서버 설정
  - DNS 우선순위 변경
  - 도메인 구조
  - 레코드 타입
---
---
## Name Resolution

- 우리가 브라우저에 https://www.google.com 을 입력하고 구글에 접속하는 것이 익숙하지, 구글의 IP주소를 입력하고 접속하는 것이 익숙하지는 않다.
- 실제로는 https://www.google.com 이라고 입력해도 이를 구글의 IP주소로 변환해주기 때문이다.
- 이처럼 이름 -> IP 주소로 변환하는 과정을 Name Resolution이라고 한다.

---
## 시스템 내부 설정(`/etc/hosts`)

- 각 Linux 시스템에는 `/etc/hosts` 파일이 존재한다.
- 해당 파을에 이름과 IP를 직접 매핑하여 해당 시스템 내부에서의 Name Resolution이 가능하다.
- 다만, 해당 시스템 내부에서만 유효하다.

**예시**

```
sudo nano /etc/hosts
```

```plain
172.17.0.64   web
```

---
## DNS 서버
### 개념

- 위처럼 `/etc/hosts` 파일을 수정하는 식의 방식은 여러 한계점을 가진다.
	- 서버 수가 많아질수록 관리 불가능
	- IP 변경 시 모든 서버의 hosts 파일을 수정해야 함
- 이를 해결하기 위해 중앙 집중식 방법인 'DNS 서버'를 사용한다.
- DNS 서버는 이름 -> IP 주소를 중앙에서 관리하는 서버이다.
- 모든 시스템은 DNS 서버에 이러한 매핑 관계를 질문한다.

### DNS 서버 설정

```bash
nano /etc/resolv.conf
```

```plain
nameserver 127.0.0.53
nameserver 8.8.8.8
options edns0
```

- `nameserver`: 질의할 DNS 서버의 IP
- 위에서부터 순서대로 질의한다.
- 127.0.0.53은 내부 DNS 서버 리졸버이다.
- 이 세상의 모든 도메인네임들을 내부 DNS서버에 가지고 있지는 않으므로 내부 DNS서버에 없는 도메인 네임을 찾기위해 Public DNS서버를 등록한다.
- 주로 1.1.1.1(CloudFlare) 혹은 8.8.8.8(Google) 등을 사용한다.
- cf) 로컬 시스템에서는 한번 물어본 도메인 주소를 캐시해두었다가, 다음에 물어볼 때는 외부 DNS 서버에 나가지 않고 바로 답해줌으로써 속도를 빠르게한다.
- cf) `/etc/resolv.conf`은 재부팅 후 초기화될 수 있으므로 `netplan`이나 `resolvconf` 패키지를 통해 수정해야 영구 적용

### Search Domain 설정

- 예를 들어, 사내에서 아래와 같은 도메인을 사용한다고 가정하자.
	- `hr.mycompany.com`
	- `dev.mycompany.com`
	- `web.mycompany.com`
- 매번 모든 주소를 치기 귀찮아서 `hr`, `dev`, `web`만 쳐도 알아서 찾아가게 만들고 싶을 때 이 설정을 사용한다.

```bash
nano /etc/resolv.conf
```

```plain
search mycompany.com
```

- 위처럼 설정하면 아래와 같은 과정을 거친다.
	- 사용자가 `ping web`을 입력한다.
	- 컴퓨터는 우선 `web`을 찾아본다.
	- 없으니 `search`에 등록된 도메인을 붙여서 찾아본다. (`web.mycompany.com`)
	- 연결 성공
- 여러개 등록도 가능하다. (예: `search mycompany.com yourcompany.com`)

### 우선 순위 설정 (로컬 설정 vs DNS서버)

```bash
nano /etc/nsswitch.conf
```

```
hosts: files dns
```

- 설정 파일을 열어보면 위처럼 나올 것이다.
- 위 문구의 의미는 
	- `files` - `/etc/hosts` 먼저 확인
	- `dns` - 없으면 DNS 서버에 질의
- 순서를 바꾸면 우선 순위의 순서가 바뀐다.

---
## 기타
### 도메인 이름 구조

- 큰 범위가 오른쪽, 왼쪽으로 갈 수록 작은 범위
- 예: `www.google.com`

|구성 요소|설명|
|---|---|
|`.`|Root|
|`com`|Top Level Domain|
|`google`|Domain|
|`www`|Subdomain|

### DNS Record 타입

| 타입    | 설명           |
| ----- | ------------ |
| A     | IPv4 주소 ↔ 이름 |
| AAAA  | IPv6 주소 ↔ 이름 |
| CNAME | 이름 ↔ 이름 (별칭) |

### DNS 테스트 도구 (nslookup, dig)

**nslookup**

```bash
nslookup www.google.com
```

- DNS 서버 기준 결과 확인
- `/etc/hosts` 무시

**dig**

```bash
dig www.google.com
```

- 더 상세한 DNS 정보 출력
- TTL, 레코드 타입 등 확인 가능
- `/etc/hosts` 무시

:::warning
- `ping` : `/etc/hosts` + DNS 모두 사용
- `nslookup`, `dig` : **DNS 서버만 조회**
:::
