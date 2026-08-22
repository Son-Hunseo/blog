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

- **docs/** - 메인 콘텐츠 (MDX 파일, 번호 프리픽스 폴더로 대분류 → 소분류 2단계 구성)
  - `00-IaaS/` (01-AWS, 11-Openstack)
  - `01-Container/` (01-Docker, 02-Kubernetes)
  - `02-CS/` (01-Algorithm, 02-OS, 03-Network, 11-Security)
  - `03-Dev/` (01-Golang, 02-SQL, 11-Spring, 21-Middleware, 31-Project)
  - `04-AI/`, `05-HomeLab/` (01-SynologyNas, 02-Proxmox, 03-Hands-on), `06-Peer-Learning/`, `07-Etc/`
  - 각 카테고리 폴더에 `_category_.json`(사이드바 라벨)과 `index.mdx`(카테고리 목록 페이지)
  - `docs/index.mdx` - 랜딩 페이지 (`src/pages/` 대체)
  - 네이밍: 카테고리 폴더는 대문자 시작, 글 파일명은 소문자 케밥 케이스
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
  - `DocItem/Paginator/` - 이전/다음 네비게이션 (카테고리 index.mdx 페이지 건너뜀)
  - `DocSidebar/` - 사이드바 (카테고리별 글 개수 표시)
- **plugins/gather-meta-plugin.js** - 포스트 메타데이터 수집 커스텀 플러그인
- **.github/** - 배포 워크플로(`workflows/build-push-and-bump-tag.yaml`)와 이미지 태그 계산 스크립트(`scripts/calc_next_tag.py`)

### 이미지 경로 규칙

이미지는 용도에 따라 두 곳에 저장합니다.

- 본문 이미지: `docs/<카테고리>/assets/<글이름>/` → 상대 경로로 참조
- 프론트매터 `image`(썸네일/소셜 카드): `static/img/posts/<카테고리>/<글이름>/` → `/img/posts/...` 절대 경로로 참조

카테고리 폴더명을 변경하면 두 경로를 모두 함께 옮겨야 합니다.

### 주요 커스텀 시스템

**메타데이터 플러그인** (`plugins/gather-meta-plugin.js`): 모든 문서를 스캔하여 프론트매터를 추출하고, `recentPosts`와 `postsByPath` 전역 데이터를 컴포넌트에 제공합니다.

**테마 커스터마이징**:
- DocItem: 각 포스트에 날짜 표시 및 Giscus 댓글 추가, 이전/다음 네비게이션에서 카테고리 index 페이지 제외
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
- 라이트 모드 기본값 (`colorMode.defaultMode: 'light'`, 시스템 설정 무시)
- 우측 목차 `maxHeadingLevel: 4` (`####`까지 표시)

## 배포

- **Docker**: 멀티 스테이지 빌드 (Node 20 -> Nginx)
- **CI/CD**: `.github/workflows/build-push-and-bump-tag.yaml`가 main 브랜치 push 시 실행되며 두 개의 job으로 구성
  - `deploy-onprem`: self-hosted runner에서 Harbor(`harbor.onprem.arpa/son/blog`)로 푸시 (`vars.ENABLE_ONPREM`로 토글)
  - `deploy-aws`: OIDC로 AWS 인증 후 ECR로 푸시 (`vars.ENABLE_AWS`로 토글)
- **이미지 태그**: `.github/scripts/calc_next_tag.py`가 레지스트리의 기존 `major.minor` 태그를 조회해 자동 증가
- **GitOps**: 매니페스트는 이 저장소가 아닌 **별도 저장소 `Son-Hunseo/blog-gitops`** 에 있으며, 워크플로가 `overlays/{onprem,aws}/prod/kustomization.yaml`의 `newTag`를 갱신·푸시합니다. (이 저장소의 `k8s/` 폴더는 삭제됨)

무한 루프 방지: `paths-ignore: .github/**`와 `github.actor != 'github-actions[bot]'` 조건을 사용합니다.

## CSS 참고사항

`src/css/custom.css`의 주요 커스텀 스타일:
- Infima 색상 변수 오버라이드 (`--ifm-color-primary` 계열, 코드 하이라이트 배경)
- `.hidden-sidebar-item` - 사이드바에서 개별 포스트 숨김 (카테고리만 표시)
- KaTeX 스타일 (LaTeX 렌더링용)
- Algolia 검색 하이라이트 커스터마이징
- 히어로 섹션 타이포그래피 및 타이핑 애니메이션
- Obsidian 콜아웃(`rehype-callouts`) 다크모드 보정, 공용 색상 클래스(`.t-*`, `.hl-*`)
- 본문(`.markdown`) 이미지 테두리·그림자 (다크 배경에 스크린샷이 묻히는 문제 방지)

`src/components/Posts.module.css` (SelectedPosts/CategoryPosts 공통):
- `.imageWrapper`의 `background: var(--ifm-color-emphasis-100)` - 썸네일 뒤 배경 레이어
- `.noImage` - 썸네일 없을 때 브랜드 색상 그라디언트로 대체

## 문서 동기화 규칙

`CUSTOM.md`는 순정 Docusaurus 대비 이 프로젝트의 차이점을 상세히 정리한 문서입니다. **CLAUDE.md에 새로운 기능(컴포넌트, 테마 오버라이드, 플러그인 설정 등)이나 CSS가 추가/변경되면, 반드시 `CUSTOM.md`의 해당 섹션도 함께 업데이트해야 합니다.** (필요 시 `../basic-docu`에 순정 Docusaurus 프로젝트를 `npx create-docusaurus@latest basic-docu classic --javascript`로 받아 비교 기준으로 사용)
