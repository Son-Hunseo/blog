---
title: Ollama를 사용한 Local LLM 추론 및 웹 UI 호스팅
description: 로컬 환경에서 Ollama를 설치하고 GPU 기반 LLM 모델을 실행하는 방법을 소개합니다. 또한 Open WebUI를 Docker로 설치해 Ollama와 연동하고, 웹 인터페이스를 통해 대화형으로 모델을 활용하는 과정을 단계별로 설명합니다.
keywords:
  - Ollama 설치
  - Open WebUI 연동
  - 로컬 LLM 실행
---
---
## Ollama 설치

https://github.com/ollama/ollama?tab=readme-ov-file 여기서 각 OS에 맞는 Ollama를 설치한다.

---
## 모델 다운로드

https://ollama.com/search 여기서 원하는 모델을 찾고 아래 명령어로 모델을 설치한다.

```bash
ollama pull 모델이름
```

- 나는 나의 GPU에서 구동이 가능하며 준수한 성능을 보이는 `gpt-oss:20b`를 다운로드 받았다.


---
## 모델 실행

```bash
ollama run 모델이름
```

![ollama1](./assets/ollama1.jpg)

---
## 웹 UI
### 왜 웹 UI?

Ollama에서 네트워크 활성화 상태로 실행하고 API형태로 요청을 보낼 수도 있지만, 아래 사진처럼 응답이 오기 때문에 읽기 힘들다. 또한 대화 기록을 아카이빙할 수 없다.

![ollama2](./assets/ollama2.jpg)

### open-webui 설치

- Github: https://github.com/open-webui/open-webui

```bash
docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main
```

- 위 명령어를 입력해 `open-webui`를 도커 컨테이너로 실행한다.
- Ollama와 연동되므로 따로 설정을 할 필요는 없다.

### 결과

![ollama3](./assets/ollama3.jpg)

- http://localhost:3000 으로 접속해서 이름, 계정 설정 후 사용해본다.
- 계정은 로컬에 저장되므로 안전하다.
- Docker Engine은 기본적으로 `bridge` 네트워크를 사용하므로, 방화벽에서 3000번 포트를 허용해주면, 내부망에서 `http://Ollama가-실행되는-PC의-IP:3000`으로 접속하여 사용할 수 있다.
- 내부망의 서비스는 VPN으로 연결해서 사용하는 것이 권장되지만, 원한다면 포팅해서 외부에서 접근하게한 뒤 사용하면 된다.
- 보안이 중요한 소규모 기업에서 LLM을 직원들에게 제공하고자 할 때, 이러한 방법으로 제공할 수 있을 것 같다.



