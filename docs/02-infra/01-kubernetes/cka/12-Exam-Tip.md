---
title: 시험 팁 (시간 줄여주는 명령어)
---
---
## 시간 줄여주는 명령어

- 참고 링크 (북마크 해두기): https://kubernetes.io/docs/reference/kubectl/conventions/

### run (Pod)

```bash
kubectl run nginx --image=nginx
```

- 시험에서 굳이 yaml 파일을 만들지 않아도 되는 간단한 `Pod` 생성의 경우 `run` 명령어 한 줄로 해결할 수 있다.

### create (Deployment)

```bash
kubectl create deployment --image=nginx nginx
```

- 시험에서 굳이 yaml 파일을 만들지 않아도 되는 간단한 `Deployment` 생성의 경우 `create` 명령어 한 줄로 해결할 수 있다.

```bash
kubectl create deployment --image=nginx nginx --replicas=4
```

- Kubernetes v1.19 이후부터는 `--replicas` 옵션을 줄 수 있다.

### --dry-run

```bash
kubectl run nginx --image=nginx --dry-run=client -o yaml
```

```bash
kubectl create deployment --image=nginx nginx --dry-run=client -o yaml
```

- yaml 파일을 만들어야하는 경우, `--dry-run=client` 명령어로 `Pod`를 직접 생성하지 않고, yaml 기본 템플릿을 자동으로 출력할 수 있다.

```bash
kubectl run nginx --image=nginx --dry-run=client -o yaml > nginx-deployment.yaml
```

```bash
kubectl create deployment --image=nginx nginx --dry-run=client -o yaml > nginx-deployment.yaml
```

- 파일을 저장까지 하려면 위처럼 `> 파일이름.yaml`로 저장할 수 있다.
- 위와 같이 템플릿을 만드는 이유는 yaml 파일의 모든 요소를 기억하기 힘든 것도 있겠지만, Indentation과 같은 사소한 실수를 예방할 수도 있기 때문이다.

```bash
kubectl apply -f nginx-deployment.yaml
```

- 추출한 yaml 파일을 수정하고 적용하여 리소스를 생성할 수 있다.

---
## 시험장에서 Docs에서 찾기 힘들고 기억나지 않는것이 있을 때

```bash
kubectl api-resoucres
```

- 리소스의 `apiVersion`이나 `name`, 축약어 등이 기억나지 않을 경우 위 명령어 사용 

```bash
kubectl explain pods
```

- 특정 리소스의 `apiVersion`이나 `metadata`, `spec` 등이 기억나지 않을 경우 위 명령어 사용
- 위 명령어는 `Pod`에 어떤 요소가 들어가는지를 알고싶을 때 사용 (최상위 요소만 나타냄)

```bash
kubectl explain pods.spec
```

- 최상위 요소 하위에 더 자세한 요소가 기억나지 않을경우 위처럼 명령어 사용
- 위 명령어는 `Pod`의 `spec`에 어떤 요소가 들어가야하는지 기억나지 않을 경우 사용

```bash
kubectl explain pods --recursice
```

- yaml 파일 형식처럼 모든 요소를 보고싶을 경우
- 해당 리소스에서 사용가능한 모든 필드를 출력한다.
- yaml 파일 작성에 도움받을 수 있음