# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 다룰 때 참고하는 가이드입니다.

## 프로젝트 개요

**Docusaurus 3.8.1** (React 기반 정적 사이트 생성기)로 구축된 문서/블로그 사이트입니다. Cloud, DevOps 관련 기술 문서를 한국어로 작성합니다.

## 빌드 및 실행 명령어

```bash
npm start          # 핫 리로드 개발 서버
npm run build      # 프로덕션 빌드
npm run serve      # 프로덕션 빌드 로컬 서빙
npm run clear      # Docusaurus 캐시 삭제
```

## 아키텍처

### 디렉토리 구조

- **docs/** - 메인 콘텐츠 (MDX 파일, 번호 프리픽스 폴더로 구성)
  - 카테고리 폴더: `01-Kubernetes/`, `03-Docker/`, `04-Nginx/`, `05-Openstack/`, `11-Spring/`, `12-Golang/`, `13-Algorithm/`, `14-Database/`, `15-Network/`, `16-OS/`, `17-Security/`, `21-SynologyNas/`, `22-Proxmox/`, `23-HomeLab/`, `24-Project/`, `25-AI/`
  - `docs/index.mdx` - 랜딩 페이지 (`src/pages/` 대체)
- **src/components/** - React 컴포넌트
  - `SelectedPosts.js` - 홈페이지 추천 글
  - `CategoryPosts.js` - 카테고리별 포스트 목록
  - `GiscusComponent.js` - GitHub Discussions 댓글
  - `SimpleDocList.js` - 단순 문서 목록
  - `Posts.module.css` - 포스트 목록 공통 스타일
  - `SimpleDocList.module.css` - 단순 문서 목록 스타일
- **src/theme/** - Docusaurus 테마 오버라이드
  - `DocCard/` - 카테고리 카드 (항목 개수 표시)
  - `DocItem/Layout/` - 문서 레이아웃 (날짜 및 댓글 추가)
  - `DocSidebar/` - 사이드바 (카테고리별 글 개수 표시)
- **plugins/gather-meta-plugin.js** - 포스트 메타데이터 수집 커스텀 플러그인
- **k8s/resource/** - Kubernetes 배포 매니페스트

### 주요 커스텀 시스템

**메타데이터 플러그인** (`plugins/gather-meta-plugin.js`): 모든 문서를 스캔하여 프론트매터를 추출하고, `recentPosts`와 `postsByPath` 전역 데이터를 컴포넌트에 제공합니다.

**테마 커스터마이징**:
- DocItem: 각 포스트에 날짜 표시 및 Giscus 댓글 추가
- DocCard: 카테고리 카드에 총 항목 개수 표시
- DocSidebar: 카테고리 이름 옆에 글 개수 표시 (예: `Kubernetes (13)`)

**랜딩 페이지**: `src/pages/` 대신 `docs/index.mdx` 사용. 타이핑 애니메이션이 있는 히어로 섹션과 `<SelectedPosts />` 컴포넌트 포함.

### 추천 글 변경

홈페이지 추천 글을 변경하려면 `src/components/SelectedPosts.js`의 `SELECTED_POST_IDS` 배열을 수정합니다.

## 설정

`docusaurus.config.js`의 주요 커스터마이징:
- `routeBasePath: '/'` - 문서가 `/docs` 대신 루트에서 서빙
- Algolia 검색 연동
- Google Analytics (`G-Q9GGC935DY`)
- Mermaid 다이어그램 활성화
- LaTeX 수식 지원 (`remark-math`, `rehype-katex`)
- 한국어(`ko`)가 기본 로케일
- 다크 모드 기본값

## 배포

- **Docker**: 멀티 스테이지 빌드 (Node 20 -> Nginx)
- **CI/CD**: GitHub Actions가 main 브랜치 커밋 시 AWS ECR에 빌드 및 푸시
- **Kubernetes**: `k8s/resource/deploy.yaml`에서 이미지 태그 자동 업데이트

무한 루프 방지를 위해 `k8s/` 폴더 커밋은 빌드 파이프라인을 트리거하지 않습니다.

## CSS 참고사항

`src/css/custom.css`의 주요 커스텀 스타일:
- `.hidden-sidebar-item` - 사이드바에서 개별 포스트 숨김 (카테고리만 표시)
- KaTeX 스타일 (LaTeX 렌더링용)
- Algolia 검색 하이라이트 커스터마이징
- 히어로 섹션 타이포그래피 및 타이핑 애니메이션
