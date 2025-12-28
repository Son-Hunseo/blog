---
title: 암호화(비대칭키) vs 전자 서명
description: 비대칭키 암호화와 전자서명의 차이를 쉽고 명확하게 정리한 글입니다. 공개키·개인키의 역할, 암호화 목적, TLS 인증서의 전자서명 검증 과정까지 예시와 함께 자세히 설명합니다. 데이터 기밀성과 무결성, 인증 과정의 원리를 이해하고 싶은 개발자 및 학습자를 위한 가이드.
keywords:
  - 비대칭키 암호화
  - 전자 서명
  - TLS 인증서
  - 전자 서명 원리
---
---
## 비대칭키 암호화
### 특징

- 목적: 데이터 기밀성
	- 누가 읽어볼 수 있는지를 통제
	- 암호화된 데이터는 '정해진 사람'만 복호화 가능해야함
- 공개키로 암호화
- 개인키로 복호화
	- '정해진 사람'만 복호화 가능해야하기 때문에 개인키로 복호화한다.
- https://www.devglan.com/online-tools/rsa-encryption-decryption 여기서 시뮬레이션 해볼 수 있다.

### 예시

```json
{
	"fact": "son is fool"
}
```

- kim은 위 데이터를 암호화해서  son에게 보내야한다.

```plain
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx9AWfixaxQpbSeugIkn5idUqvCOJ2wr0uuf4i8sG/CdL7GVCKe/Xh8kB/OnzBPRsumkt1p/KXQ+UURWa/w8UoN9m6SP2Yaj58ZfU+GCRUUaD8fPULraD0fxNPbUeRL+cm5fY9IcQM6RDWQl/0CZYsut3BXZM1XyQ6sUmzYLtZ3qJK+vsvVyJWnsz+MNu37E0IrB0jYa5+YpjcG1JJNSqak93XpOp+5vG5rpeiWcJ5ug2+mWYrsjiizN52bk1rAywrihMzClCazbcOPOpl0O857PmJrlMHvfcPkboN3OyuoWmkfm3yCjOiJ/DJiUSrVSN0oz+BiMtNbWLMsHOLVoNfQIDAQAB
-----END PUBLIC KEY-----
```

- 공개키 예시이다.

```plain
CTezLEiFM9bJzP44U7GJmZTbxomqSTb6/Ig4a5LYkS9trHqm862jfEQNmT5rZNDqlZMp66fmwJI78QePXXmZxMN2+8MtRvmaEFaXE184/bNrqHYZIcmOtJ6uPKgVC43DgUWXDkKhdlppk3jCIRj8xyOvlD9m5jW3FCsHPJYuLbEd1dMM68o+MbLFNr/SKFay7I330XmMCm3Bdv8DGw0HPf+m3keUL9KD1dI69uLi/yYcH3z9N+b5Jtbsk2zjERTf3yaeuZ4ozc2t8Nrn8SE43N8ZWnYR1Ri1+Udq493yMiDzCqVRHLs3ZS1BVt9ffvD3KzXbNK0Q7rZKv3a0zgL5UQ==
```

- 퍼블릭 키로 암호화한 결과 값이다.
- son은 위와 같은 데이터를 받았다.

```plain
-----BEGIN RSA PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDH0BZ+LFrFCltJ66AiSfmJ1Sq8I4nbCvS65/iLywb8J0vsZUIp79eHyQH86fME9Gy6aS3Wn8pdD5RRFZr/DxSg32bpI/ZhqPnxl9T4YJFRRoPx89QutoPR/E09tR5Ev5ybl9j0hxAzpENZCX/QJliy63cFdkzVfJDqxSbNgu1neokr6+y9XIlaezP4w27fsTQisHSNhrn5imNwbUkk1KpqT3dek6n7m8bmul6JZwnm6Db6ZZiuyOKLM3nZuTWsDLCuKEzMKUJrNtw486mXQ7zns+YmuUwe99w+Rug3c7K6haaR+bfIKM6In8MmJRKtVI3SjP4GIy01tYsywc4tWg19AgMBAAECggEADbGlsP0CNYnZqs3CukbemsMovB8lZgUws5SNVKtT7bkVu3xPFgexekVc5QP1m0vTHc1yjkiCOnGEZTA5YKycadAVwfmse5H0m0mgF2uq2eqexVjEHHV2wE/tzUJZ8jU9mu5DuLJ++kMSOIptn4rZPl3j2NR8PI9ecTCU0bXc5mAA9QNe2cA5acuIEkr+nBPNICzmoFpfidC8mNYFnDTmKXJRGlZh1BvabNwNzfaDS0VMAcuiQT1pYHdMNwFSRw2vDj5ZcTkU+/1OtJw2hqGUKLNqoIqCASQJT6IazLUWSJxSrmcZVTxDdtdFL86UVAAeUnpjFn+HUla+2yNvwauskwKBgQDvMK8tFopMQvMwG8EablU5cXHjDhVwB8FOch/TwJdy+wHGnPq0iO31LlgBxUMnxZoWQA2AutsI/u1UmBSPv9Tiq9Rw3HMHS/3a6FqfdfIVf1xRbzAROkCCxrqFMHZsaDbh9g2idZ2utqGWwuJ3bsuxVYcJwiJwr6qQWa5MCXZCHwKBgQDV2vVlj8pV08tHVCgYenSPy/IeaEYBk5yLUGY6BEGkKhxiuBvBo3x1URREiqtoDkqp6dBwXJgBn51Ibz0DJdCxFmVRZvJ+M+yeX5786nQtY/pCRhrwa0EVmll+I868zlrHE1et6WEbQS4FOglYfyv3jmUxDxp7Csi11O1iN00U4wKBgQCmj6tc5XZW1sRMOveEdVKJltMsvtD026GkA9rf9RxBqEM7UHNQpo22D5ifWwOBvZuoZOBCRVxj7knMf77Jv1b6pZdhJFJBwYw8FVON+W8jwzXBS4EYbg0gREz8lJvSr9uQDGzANdEhKfJqbrmPW6siiSFpDTQ4bkuDC8BRGMGuFwKBgC5uVLtRRdfunQMGlZIC/E3ANPg/IXv0JZflw9wy0mGnNvSEDpqzOTFrgiADj4WPHMzZVAUhRWuM0SRJ6pBFZJMeTq8mz91wvp4AGs/Ew6abP1mmSPEMCFx9X5LQiXFayEDSxUWgFxJIy4oc+Kx7J/uesf+9zL0MMVmxOj0JzrWLAoGAJmf4RgL5nIAZpszcDzje4YqqMUreq0xOHah0cx2S60zFZEeC55KG5C7cOpaKkFW+ibPDXdqMG+lu9Av489OnSXNr7PkXaYgpImyOGSKGzScHAgSRP5p3efYWD+fdq7AiUqqFVhk528vOQhou4IvTfg5eZtmGlbhNd0NDRFX2+FI=
-----END RSA PRIVATE KEY-----
```

- 개인키 예시이다.

```json
{
	"fact": "son is fool"
}
```

- son은 개인키로 데이터를 복호화하여 자신이 바보라는 사실을 kim을 제외한 아무에게도 들키지 않았다.

---
## 전자 서명
### 특징

- 목적: 인증(Authentication) + 무결성(Integrity)
- 전자 서명은 원본 데이터를 해시한 후 "특정 개인키"로 암호화한 값이다.
- 서명을 공개키로 복호화한 값 = 원본 데이터를 해시한 값 이라면
	- 해당 서명이 올바른 이에게 서명 되었다는 것이 증명된다. (인증)
	- 원본 데이터가 중간에 수정되지 않았음이 증명된다. (무결성)

### 예시(TLS 인증서)

- https://blog.sonhs.com 에 접속했다고 했을 때 해당 사이트가 내가 가려는 사이트가 맞는지 확인하는 절차를 예시로 들어보자.
- 인증서는 임의로 SONCA 라는 회사(가상의 회사)에서 발급받았으며, 해당 회사는 대표적인 CA사라고 하자.

```yaml
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 1234567890
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN=Example CA
        Validity
            Not Before: Mar 17 00:00:00 2025 GMT
            Not After : Mar 17 00:00:00 2026 GMT
        Subject: CN=blog.sonhs.com
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
            RSA Public-Key: (2048 bit)
            Public-Key (PEM):
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BA...QyeE2zkImYUNk/2x7T8uVPdXgi
7wIDAQAB
-----END PUBLIC KEY-----
    Signature Algorithm: sha256WithRSAEncryption
         bb:90:d4:94:d9:ac:03:d6:2f:02:9c:30:02:84:fb:02:
         81:ac:fa:c3:21:fb:81:f1:57:49:c7:7a:21:4f:b9:43:
         3c:83:ec:0d:e5:d7:67:89:ce:0e:f1:3c:0b:0f:fd:eb:
         7e:9c:12:fd:62:78:22:12:3e:46:6a:37:fe:d3:4a:93:
         1e:93:fd:08:bd:84:19:a0:65:8c:92:f8:ad:96:67:fd:
         7a:7b:15:0d:6f:42:06:8e:f2:7e:2a:3b:8c:b0:5c:f1:
         88:cb:ac:16:ba:da:1d:58:df:e9:2d:05:13:52:56:3c:
         75:0d:69:aa:a3:99:09:80:da:2f:5e:ed:7a:be:58:34:
         44:2c:78:bd:d1:2f:a7:02:f8:2c:b3:31:8e:bc:6b:23:
         5c:0f:3e:d3:73:e4:32:4c:ff:0f:4d:35:80:bf:b0:2f:
         e5:3e:69:d3:bf:72:a3:1a:b7:0b:89:c2:19:ce:7f:23:
         66:13:9f:b6:d4:93:5a:91:27:15:5b:5b:28:28:29:fe:
         4b:e6:24:5d:7e:90:96:ef:89:99:88:96:47:3f:bd:95:
         e4:5a:c4:7c:96:18:37:a5:f0:f6:e0:89:7f:d6:48:0f:
         7d:2b:2f:46:2f:98:d1:44:bb:17:77:31:49:55:e1:87:
         52:af:60:76:a2:03:06:cb:7f:6b:5e:ef:3c:ea:f7:7f:
```

- https://blog.sonhs.com 으로 접속하니 위와같은 인증서를 브라우저가 받았다.
- Signature Algorithm 밑에 줄에 있는 값들이 '전자 서명'이다.
	- SONCA라는 CA에서 본인들의 개인키로 데이터의 해시값을 암호화한 값이 '전자 서명'이다.
	- 즉, '전자 서명'을 복호화 해봤자 나오는 값은 해시 값이고, 해시는 단방향 암호화이므로 원본 데이터를 알 수 없다. 즉, 목적이 암호화에 있는 것이 아니라 '개인키를 사용했음' 이라는 증명절차이다.

```plain
bb:90:d4:94:d9:ac:03:d6:2f:02:9c:30:02:84:fb:02:
81:ac:fa:c3:21:fb:81:f1:57:49:c7:7a:21:4f:b9:43:
3c:83:ec:0d:e5:d7:67:89:ce:0e:f1:3c:0b:0f:fd:eb:
7e:9c:12:fd:62:78:22:12:3e:46:6a:37:fe:d3:4a:93:
1e:93:fd:08:bd:84:19:a0:65:8c:92:f8:ad:96:67:fd:
7a:7b:15:0d:6f:42:06:8e:f2:7e:2a:3b:8c:b0:5c:f1:
88:cb:ac:16:ba:da:1d:58:df:e9:2d:05:13:52:56:3c:
75:0d:69:aa:a3:99:09:80:da:2f:5e:ed:7a:be:58:34:
44:2c:78:bd:d1:2f:a7:02:f8:2c:b3:31:8e:bc:6b:23:
5c:0f:3e:d3:73:e4:32:4c:ff:0f:4d:35:80:bf:b0:2f:
e5:3e:69:d3:bf:72:a3:1a:b7:0b:89:c2:19:ce:7f:23:
66:13:9f:b6:d4:93:5a:91:27:15:5b:5b:28:28:29:fe:
4b:e6:24:5d:7e:90:96:ef:89:99:88:96:47:3f:bd:95:
e4:5a:c4:7c:96:18:37:a5:f0:f6:e0:89:7f:d6:48:0f:
7d:2b:2f:46:2f:98:d1:44:bb:17:77:31:49:55:e1:87:
52:af:60:76:a2:03:06:cb:7f:6b:5e:ef:3c:ea:f7:7f:
```

```plain
f0f50e002dd50dd5840fcf15c115afb0059a46f67821df07deba08b5cd44c00b
```

- 위 서명을 브라우저에 저장된 공개키로 복호화하니 위와같은 해시값이 나왔다.
- 원본 데이터의 공개키는 'CA 공개키'가 아니라 '서버 공개키'이며 이후 세션키(대칭키)를 교환할 때 쓰인다. ('CA 공개키'는 브라우저가 가지고 있다.)
	- (참고) TLS 1.2까지는 '서버 공개키'로 'RSA 키 교환 방식'(클라이언트가 대칭키를 '서버 공개키'로 암호화하고 ' 서버에서 '서버 개인키'로 복호화)이 가능했다. (1.2에서도 디피-헬만 계열 알고리즘을 사용하여 '공통 키 생성' 알고리즘을 사용하는 방식이 가능하다)
		- (참고) 하지만, TLS 1.3 부터는 'RSA 키 교환 방식'을 지원하지 않고, 디피-헬만 계열 알고리즘을 사용하여 '공통 키 생성'을 한다. 이 때, '서버 공개키'는 디피-헬만 알고리즘에서 사용하는 값들을 교환할 때 해당 값들을 암호화하는데 사용된다.

```yaml
Version: 3 (0x2)
Serial Number: 1234567890
Signature Algorithm: sha256WithRSAEncryption
Issuer: CN=Example CA
Validity
	Not Before: Mar 17 00:00:00 2025 GMT
	Not After : Mar 17 00:00:00 2026 GMT
Subject: CN=blog.sonhs.com
Subject Public Key Info:
...
```

```plain
f0f50e002dd50dd5840fcf15c115afb0059a46f67821df07deba08b5cd44c00b
```

- 위 원본 데이터를 SHA256으로 해시하니 위와 같은 해시값이 나왔다.
- 서명을 공개키로 복호화한 값과 원본 데이터를 해시한 값이 같다.
	- 즉 위 인증서는 SONCA라는 믿을만한 CA로 부터 도메인 소유가 인증되었으며, 중간에 데이터가 위변조되지 않았다는 것이 검증되었다.
