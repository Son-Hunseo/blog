# [레거시] 컨테이너(Nginx) 배포용 이미지 - 온프레미스(Harbor)/ECR job에서만 사용.
# 기본 배포는 S3 + CloudFront(blog.sonhs.com)로 전환됨 (워크플로의 deploy-s3 job, 빌드 결과물을 그대로 업로드).
# 병행 운영 중이라 남겨둠. 각 job은 vars.ENABLE_ONPREM / ENABLE_AWS / ENABLE_S3로 토글.
FROM node:20-alpine AS build-stage

WORKDIR /app

# package.json 이랑 package-lock.json 둘다
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:stable-alpine AS production-stage

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]