---
title: Command & Args (Docker, k8s)
description: Docker의 컨테이너 종료 원리부터 CMD, ENTRYPOINT의 차이점을 명확히 이해하고, 이를 Kubernetes Pod의 command와 args로 매핑하는 방법을 학습하세요. 이 가이드는 컨테이너의 핵심 실행 메커니즘을 다루며, 실행 프로세스 생명 주기 관리와 YAML 파일 구성을 통한 애플리케이션 실행 명령어 설정 방법을 상세히 설명합니다.
keywords:
  - Docker
  - CMD
  - ENTRYPOINT
  - Kubernetes
  - Kubernetes command
  - Kubernetes args
---
---
## Docker
### 컨테이너 이해를 위한 예시

```bash
docker run ubuntu
```

- 위 명령어를 실행하면 `ubuntu` 이미지의 컨테이너가 실행되었다가 즉시 꺼진다.
- 왜 즉시 꺼지는 걸까?
- 컨테이너는 OS를 실행하려는 목적이 아니라, <span style={{color: 'red'}}>하나의 프로세스를 실행하기 위해</span> 만들어지기 때문에, 컨테이너 내부에서 실행되는 프로세스가 종료되면 컨테이너도 즉시 종료된다.
- `ubuntu` 이미지의 `Dockerfile` 기본 `CMD`는 `/bin/bash`이다. 이에 해당 컨테이너는 기본적으로 컨테이너가 실행된 후 `/bin/bash`를 실행한다. 그런데, `-it` 옵션 없이 실행한다면 해당 컨테이너는 사용자로부터 받는 입력이 없고, 백그라운드에서 실행될 명령도 없으므로 <span style={{color: 'red'}}>실행할 프로세스가 없다</span>고 판단하고 즉시 종료되는 것이다.
	- `docker run -it ubuntu`로 실행하면 사용자가 접속해있는 동안(혹은, 실행한 프로세스가 동작하는 동안)은 컨테이너가 실행되지만, `exit`로 빠져나오면 종료된다.

### CMD

- 위와 같은 문제를 해결하기 위해서는 기본 `CMD`를 바꾸면 된다.

**일시적으로 변경**

```bash
docker run ubuntu sleep 5
```

- 이미지의 `CMD`를 덮어쓰며 실행된다.

**영구적으로 변경(`Dockerfile`)**

```Dockerfile
FROM ubuntu
CMD ["sleep", "5"]
```

```bash
docker build -t myubuntu:latest <Dockerfile경로>

docker run myUbuntu:latest
```

- 해당 이미지 실행 시 항상 `sleep 5` 실행
- 주의
	- `["sleep 5"]` (X)
	- `["sleep", "5"]` (O)

### ENTRYPOINT

- `CMD`의 경우 "기본 명령어" 역할이다. CLI에서 명령어를 덮어쓰면 완전히 변경된다.
- 하지만, `ENTRYPOINT`의 경우 "항상 실행되어야 할 기본 프로그램" 으로 지정된다. 이에 CLI에서 입력하는 명령어는 항상 `ENTRYPOINT` 뒤에 추가된다.

```Dockerfile
FROM ubuntu
ENTRYPOINT ["sleep"]
```

```bash
docker build -t myubuntu:latest <Dockerfile경로>

docker run myUbuntu:latest 10
```

- 위처럼 컨테이너를 실행하면, 컨테이너가 실행되고, 10초 뒤에 컨테이너가 종료된다.

```Dockerfile
FROM ubuntu
ENTRYPOINT ["sleep"]
CMD ["5"]
```

```bash
docker build -t myubuntu:latest <Dockerfile경로>

docker run myubuntu:latest # 5초 후 종료

docker run myubuntu:latest 10 # 10초 후 종료
```

- 위처럼 `ENTRYPOINT`와 `CMD`를 함께 사용할 수 있다.

```bash
docker run --entrypoint sleep ubuntu 10
```

- 위처럼 `ENTRYPOINT`도 런타임에 덮어쓸 수 있다.

---
## Kubernetes
### yaml

![command1](assets/command1.png)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myubuntu
spec:
 containers:
 - name: myubuntu
   image: myubuntu
   command: ["sleep"]
   args: ["5"]
```

- 앞서 `Docker` 에서 했던 `CMD`와 `ENTRYPOINT`를 Kubernetes `Pod`로 옮기면 위와 같다.
- `ENTRYPOINT` -> `command`
- `CMD` -> `args`
- `CMD` 가 `command`라고 헷갈릴 수 있음을 주의

---
## 레퍼런스

- [https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/](https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/)
- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)- Udemy - Certified Kubernetes Administrator (CKA) with Practice Tests (Mumshad)