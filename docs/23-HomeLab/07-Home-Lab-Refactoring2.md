---
title: "[홈랩 리팩토링 - 2] Jenkins to Github Action"
description: "[홈랩 리팩토링 - 2] Jenkins to Github Action"
---

---
:::tip
리팩토링 아키텍처는 [이전 글](./06-Home-Lab-Refactoring1.md) 참조
:::

---
## Github Action으로 옮기는 이유

Jenkins와 Github Action을 비교했을 때 가장 큰 차이점은 셀프 호스팅을 하냐 아니냐인 것 같다. (물론 Github Action에서도 Self-hosted 옵션이 있지만)

이전에는 모든 도구들을 자체 인프라에서 Self hosting하는 것이 좋아보였다.
뭔가 모든 요소를 자체적으로 컨트롤한다는 것이 있어보이고 좋아보였던 것 같다.
다른 이유가 있어서가 아니라 그런 이유로 선택했던 것 같다.

하지만, 개발을 할 때 어떤 도구를 선택한다는 것은 모든 부분을 종합적으로 고려해서 가장 좋은 선택을 해야한다.
실제로 회사들에서도 어떤 솔루션을 채택할 때 기술력이 없어서 자체 기술을 개발해서 쓰지않는 것이 아니라, 현재 회사의 개발 환경, 유지 보수 비용, 인력 풀, 책임의 주체 등을 종합적으로 고려해서 자체 시스템을 구축할지, 외부 솔루션을 사용할지를 선택하는 것이다.

이러한 의미에서 Jenkins보다 Github Action으로 옮기는 것이 타당한 선택이었다.

- 환경
	- CI 과정을 셀프 호스팅해야하는 폐쇄망 환경인가? - 아니요
- 비용 비교
	- Jenkins - 금액적인 비용 없음, 호스팅하는 자원적 비용 존재
	- Github Action - Public 레포의 경우 비용 없음, Github에서 호스팅하기 때문에 자원적 비용도 없음
- 관리 비용
	- Jenkins의 경우 사용하는 플러그인, 스크립트, 사용자 설정 등의 여러 관리 지점이 존재한다. (그래서 이러한 설정들을 PV로 외부 스토리지에 저장하고 Jenkins를 재설치하거나 다른 물리 자원으로 옮길 때 마이그레이션 했다)
	- Github Action의 경우 스크립트 yaml 파일과 Secret 변수정도만 레포지토리에 저장해두면 되므로 관리 지점이 상대적으로 적다.

이러한 이유로 Github Action으로 옮기게 되었다.
Jenkins보다 Github Action이 우월하다는 것이 아니다. Jenkins는 내부망에서 사용해야하거나 대규모 프로젝트들을 관리할 때 강력한 이점들이 존재한다.


---
## AS-IS (Jenkins)

```bash
#!/bin/bash

SERVER_IP="***.***.***.***"
SERVER_USER="son"
GIT_REPO="https://github.com/Son-Hunseo/blog.git"

ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << EOF
  set -e

  cd /home/son || exit 1

  # 이전 클론 삭제 후 새로 클론
  rm -rf blog
  git clone ${GIT_REPO}
  cd blog || exit 1

  # 빌드 실행
  npm install
  npm run build

  # 기존 폴더 삭제 및 새 폴더 생성 // 여기서 sudo 안써도되는건 따로 설정햇고 /var/www의 소유권도 son에게 다 주었다.
  rm -rf /var/www/son-blog
  mkdir -p /var/www/son-blog

  # 빌드 결과 배포
  cp -r build/* /var/www/son-blog/
EOF
```

1. 레포지토리 push 이벤트 발생
2. ssh로 블로그를 호스팅하고있는 Nginx VM에 접속
3. 레포지토리를 clone
4. 블로그를 빌드
5. 빌드 결과물을 Nginx의 `/var/www` 경로로 옮겨서 호스팅


---
## TO-BE (Github Action)

```yaml
name: Build & Push to ECR and Update k8s deploy tag  
  
on:  
  push:  
    branches:  
      - main  
  
permissions:  
  contents: write  
  
jobs:  
  build-push-update:  
    # k8s 리소스 푸시로 다시 재귀적으로 트리거되어 무한으로 호출되는 것을 막음  
    if: github.actor != 'github-actions[bot]'  
    runs-on: ubuntu-latest  
  
    env:  
      IMAGE_NAME: son-blog  
      DEPLOY_FILE: k8s/deploy.yaml  
      AWS_REGION: ap-northeast-2  
      ECR_REPOSITORY: son/blog  
  
    steps:  
      - name: Checkout  
        uses: actions/checkout@v4  
  
      # Access Key 기반 AWS 인증  
      - name: Configure AWS credentials (Access Key)  
        uses: aws-actions/configure-aws-credentials@v4  
        with:  
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}  
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}  
          aws-region: ap-northeast-2  
  
      - name: Login to Amazon ECR  
        id: ecr_login  
        uses: aws-actions/amazon-ecr-login@v2  
  
      - name: Set ECR registry env  
        run: |  
          echo "ECR_REGISTRY=${{ steps.ecr_login.outputs.registry }}" >> $GITHUB_ENV    
  
      # 최신 태그 조회 + 0.1 증가 (외부 파이썬 스크립트 사용)  
      - name: Calculate next image tag  
        id: next_tag  
        run: |  
          JSON="$(aws ecr describe-images \    
            --repository-name "${ECR_REPOSITORY}" \    
            --query 'imageDetails' \    
            --output json || echo '[]')"    
            
          NEXT_TAG="$(echo "$JSON" | python3 .github/scripts/calc_next_tag.py)"    
          echo "NEXT_TAG=${NEXT_TAG}" >> $GITHUB_ENV    
  
      - name: Build & Push Docker image  
        run: |  
          docker build -t ${IMAGE_NAME}:${NEXT_TAG} .    
          docker tag ${IMAGE_NAME}:${NEXT_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${NEXT_TAG}    
          docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${NEXT_TAG}    
  
      - name: Update deploy.yaml image tag  
        run: |  
          sed -i -E \  
            "s|(image:\s*.*${ECR_REPOSITORY}:)[^[:space:]]+|\1${NEXT_TAG}|" \  
            "${DEPLOY_FILE}"  
      
      - name: Commit and push    
        run: |    
          git config user.name github-actions[bot]    
          git config user.email github-actions[bot]@users.noreply.github.com    
          git add "${DEPLOY_FILE}"    
          git commit -m "chore(k8s): bump image tag to ${NEXT_TAG} [skip ci]" || exit 0    
          git push
```

1. 레포지토리 push 이벤트 발생
2. AWS CLI 인증을 받음
3. 해당 ECR 이미지 레포에서 가장 최신 버전을 불러옴 (예: 1.2)
4. 블로그를 호스팅하는 Nginx 를 컨테이너 이미지로 빌드하고 새로운 버전을 태그함 (예: 1.3)
5. 해당 이미지를 ECR에 push
6. git 레포지토리의 k8s manifest에 있는 이미지 버전을 업데이트하고 푸시함 (예: `image: blog:1.2` -> `image:blog:1.3`)
7. ArgoCD가 바뀐 이미지 버전을 반영한다.


---
## 결과

- Jenkins를 호스팅하는 리소스적 비용 절감
- CI 도구를 직접 관리할 필요없고 내가 설정한 yaml 스크립트만 관리하면 되게되었다.