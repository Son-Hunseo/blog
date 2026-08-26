# Docusaurus 커스터마이징 문서

이 문서는 기본 Docusaurus 프로젝트(`../basic-docu`)와 현재 프로젝트(`son-blog`)의 차이점을 상세하게 정리합니다.

---

## 1. 프로젝트 구조 비교

### 기본 Docusaurus 구조
```
basic-docu/
├── docs/                          # 문서 폴더
│   ├── tutorial-basics/
│   └── tutorial-extras/
├── src/
│   ├── components/
│   │   └── HomepageFeatures/      # 홈페이지 피처 컴포넌트
│   ├── css/
│   │   └── custom.css
│   └── pages/
│       ├── index.js               # 별도 랜딩 페이지
│       └── index.module.css
├── static/img/                    # 정적 이미지
├── docusaurus.config.js
├── sidebars.js
└── package.json
```

### 현재 프로젝트 구조 (추가/변경된 부분)
```
son-blog/
├── docs/                          # 번호 프리픽스로 정렬 (대분류 → 소분류 2단계)
│   ├── 00-IaaS/                   # 01-AWS, 11-Openstack
│   ├── 01-Container/              # 01-Docker, 02-Kubernetes
│   ├── 02-Platform/               # 01-Registry, 02-Secret, 03-CI-CD
│   ├── 03-Observability/          # 01-Monitoring, 02-Logging
│   ├── 04-Middleware/             # 01-Web, 02-Messaging, 03-Cache
│   ├── 05-CS/                     # 01-Algorithm, 02-OS, 03-Network, 11-Security
│   ├── 06-Dev/                    # 01-Golang, 02-SQL, 11-Spring, 31-Project
│   ├── 07-AI/
│   ├── 08-HomeLab/                # 01-SynologyNas, 02-Proxmox, 03-Hands-on
│   ├── 09-Peer-Learning/          # 스터디 기록
│   ├── 10-Etc/
│   └── index.mdx                  # docs가 랜딩 페이지 역할 (src/pages 없음)
├── src/
│   ├── components/                # 커스텀 컴포넌트 추가
│   │   ├── CategoryPosts.js       # 카테고리별 포스트 목록
│   │   ├── GiscusComponent.js     # GitHub Discussions 댓글
│   │   ├── SelectedPosts.js       # 선택된 포스트 표시
│   │   ├── SimpleDocList.js       # 단순 문서 목록
│   │   ├── Posts.module.css       # 포스트 목록 공통 스타일
│   │   └── SimpleDocList.module.css  # 단순 문서 목록 스타일
│   ├── css/custom.css             # 확장된 스타일
│   └── theme/                     # 테마 오버라이드
│       ├── DocCard/               # 문서 카드 커스터마이징
│       ├── DocItem/Layout/        # 문서 레이아웃 (댓글 추가)
│       ├── DocItem/Content/       # 문서 콘텐츠 (제목 아래 날짜 표시)
│       ├── DocItem/Paginator/     # 이전/다음 네비게이션 (index.mdx 제외)
│       └── DocSidebar/            # 사이드바 (글 개수 표시)
├── plugins/
│   └── gather-meta-plugin.js      # 커스텀 플러그인
├── .github/
│   ├── workflows/build-push-and-bump-tag.yaml   # 온프렘/AWS 2중 배포 파이프라인
│   └── scripts/calc_next_tag.py                 # 이미지 태그 자동 증가 스크립트
├── Dockerfile                     # 멀티 스테이지 빌드 (Node 20 -> Nginx)
└── package.json
```

각 카테고리 폴더에는 `_category_.json`으로 사이드바 라벨을 지정합니다 (번호 프리픽스 제거용).

```json
{ "label": "IaaS" }
```

---

## 2. package.json 차이점

### 버전 차이

| 항목 | basic-docu | son-blog |
|------|------------|----------|
| Docusaurus | 3.10.2 | 3.8.1 |
| Node.js (engines) | >=20.0 | >=18.0 |

### basic-docu 추가 패키지

| 패키지 | 용도 |
|--------|------|
| `@docusaurus/faster` | 빌드 성능 최적화 (rspack 기반) |

### son-blog 추가된 의존성

| 패키지 | 용도 |
|--------|------|
| `@docusaurus/theme-mermaid` | Mermaid 다이어그램 지원 |
| `@giscus/react` | GitHub Discussions 기반 댓글 시스템 |
| `gray-matter` | Markdown 프론트매터 파싱 |
| `rehype-katex` | LaTeX 수식 렌더링 |
| `remark-math` | 수학 문법 파싱 |
| `rehype-callouts` | Obsidian 콜아웃 문법 지원 |

---

## 3. docusaurus.config.js 차이점

### 3.1 기본 설정 변경

| 항목 | 기본값 | 현재 값 |
|------|--------|---------|
| `title` | `'My Site'` | `'Pipes\' Blog'` |
| `tagline` | `'Dinosaurs are cool'` | `'Cloud, DevOps 관련 기록을 남깁니다.'` |
| `url` | `'https://your-docusaurus-site.example.com'` | `'https://blog.sonhs.com'` |
| `i18n.defaultLocale` | `'en'` | `'ko'` |

### 3.2 Mermaid 다이어그램 지원 (신규)

```js
markdown: {
  mermaid: true,
},
themes: ['@docusaurus/theme-mermaid'],
```

### 3.3 Docs 설정 변경

```js
docs: {
  routeBasePath: '/',  // docs가 루트 페이지가 됨 (기본: '/docs')
  remarkPlugins: [require('remark-math')],   // LaTeX 수식
  rehypePlugins: [
    require('rehype-katex'),                    // LaTeX 렌더링
    [rehypeCallouts, { theme: 'obsidian' }],    // Obsidian 콜아웃 문법 지원
  ],
}
```

- 기본 Docusaurus는 `/docs`에서 문서가 시작되지만, 현재 프로젝트는 `/`에서 바로 문서가 표시됨
- `rehype-callouts` 플러그인으로 Obsidian 스타일 콜아웃 지원

### 3.3.1 기타 최상위 설정 변경

| 항목 | 기본값 | 현재 값 |
|------|--------|---------|
| `onBrokenMarkdownLinks` | (없음) | `'warn'` (신규 추가) |
| `organizationName` / `projectName` | `'facebook'` / `'docusaurus'` | 미사용 (주석 처리, GitHub Pages 배포 안 함) |
| `themeConfig.image` (소셜 카드) | `img/docusaurus-social-card.jpg` | `img/default-image.png` |
| `navbar.logo.src` | `img/logo.svg` | `img/logo.png` (실제로는 빈 이미지, 로고 숨김 용도) |

### 3.3.2 우측 목차(Table of Contents) 헤딩 범위 확장 (신규)

```js
themeConfig: {
  tableOfContents: {
    minHeadingLevel: 2,
    maxHeadingLevel: 4,   // 기본값(3)보다 깊은 #### 까지 목차에 표시
  },
}
```

### 3.4 Google Analytics 추가 (신규)

```js
gtag: {
  trackingID: 'G-Q9GGC935DY',
  anonymizeIP: true,
}
```

### 3.5 Algolia 검색 추가 (신규)

```js
algolia: {
  appId: 'CY65KO6RH6',
  apiKey: '350cd5efedaa3c8e59890af4244fdbe7',
  indexName: 'my_blog_crawler_pages',
  contextualSearch: false,
}
```

### 3.6 Navbar 변경

**기본:**
- Tutorial 링크
- Blog 링크
- Facebook Docusaurus GitHub 링크

**현재:**
- Blog 링크 (`/`)
- 개인 GitHub 링크 (Son-Hunseo)

### 3.7 Footer 간소화

**기본:**
- Docs, Community, More 섹션
- Stack Overflow, Discord, X 링크
- Copyright 표시

**현재:**
- Docs, More 섹션만 유지
- Community 섹션 제거
- Copyright 제거

### 3.8 Color Mode 설정

```js
colorMode: {
  defaultMode: 'light',          // 기본 라이트모드 (순정 기본값과 동일)
  disableSwitch: false,
  respectPrefersColorScheme: false,  // 시스템 설정 무시 (순정: false)
}
```

- 초기에는 다크모드가 기본값이었으나, 라이트모드로 변경됨

### 3.9 추가 언어 지원 (Prism)

```js
prism: {
  additionalLanguages: ['java', 'bash', 'markup', 'sql'],
}
```

### 3.10 커스텀 플러그인

```js
plugins: [
  './plugins/gather-meta-plugin.js',
]
```

---

## 4. 커스텀 플러그인

### 4.1 gather-meta-plugin.js

**목적:** 모든 문서의 메타데이터를 수집하여 전역 데이터로 제공

**기능:**
- 모든 `.md`/`.mdx` 파일 스캔
- 프론트매터에서 제목, 설명, 태그, 이미지, 날짜 추출
- URL 경로 자동 생성 (숫자 프리픽스 제거)
- 카테고리 경로별 그룹화

**제공 데이터:**
```js
{
  recentPosts: [...],    // 모든 포스트 배열
  postsByPath: {...}     // 경로별 포스트 그룹
}
```

**사용처:**
- `SelectedPosts.js` - 선택된 포스트 표시
- `CategoryPosts.js` - 카테고리별 포스트 표시

---

## 5. 커스텀 컴포넌트

### 5.1 GiscusComponent.js

**목적:** GitHub Discussions 기반 댓글 시스템

```jsx
<Giscus
  repo="Son-Hunseo/blog"
  category="Q&A"
  mapping="pathname"
  theme={colorMode}  // 다크/라이트 모드 자동 전환
  lang="ko"
/>
```

### 5.2 SelectedPosts.js

**목적:** 홈페이지에 수동 선택한 포스트 표시

```js
const SELECTED_POST_IDS = [
  '/AI/GitAIOps-01',
  'AI/Claude-Code-Tips',
  'Cloud-Infra/Kubernetes/CKA/Exam/Exam-Recap-2',
  'Cloud-Infra/Openstack/Install-OpenStack',
  // ...
];
```

- 자주 바뀌는 값이므로 최신 목록은 `src/components/SelectedPosts.js` 코드에서 직접 확인

- `Posts.module.css` 공통 스타일 사용

### 5.3 CategoryPosts.js

**목적:** 현재 카테고리의 포스트 목록 표시

- URL 경로 기반 자동 필터링
- index 페이지 제외
- **날짜 내림차순 정렬** (최신 글이 상단, `date` 없는 글은 하단, 날짜 동일 시 파일명 숫자 프리픽스 내림차순)
- `Posts.module.css` 공통 스타일 사용

### 5.4 SimpleDocList.js

**목적:** 단순한 문서 목록 표시

### 5.5 Posts.module.css (공통 포스트 목록 스타일)

`SelectedPosts.js`와 `CategoryPosts.js`가 공유하는 카드형 목록 스타일입니다.

- **레이아웃**: `flex-direction: row-reverse` — 텍스트 좌측, 썸네일 우측 (모바일 768px 이하에서는 세로 스택)
- **썸네일 배경 레이어**: `.imageWrapper`에 `background: var(--ifm-color-emphasis-100)` 지정
  - 투명 배경(PNG)이거나 비율이 맞지 않는 썸네일이 카드에서 비어 보이지 않도록 뒤에 깔아주는 배경
  - 이미지는 `object-fit: cover`로 150×150 영역을 채움
- **썸네일 없을 때**: `.noImage`가 브랜드 색상 그라디언트(`--ifm-color-primary-lighter` → `--ifm-color-primary-light`)로 대체 표시
- **설명 2줄 말줄임**: `-webkit-line-clamp: 2`
- 색상은 모두 Infima 변수(`--ifm-color-emphasis-*`)를 사용하므로 다크/라이트 모드에 자동 대응

```css
.imageWrapper {
  width: 150px;
  height: 150px;
  overflow: hidden;
  background: var(--ifm-color-emphasis-100);  /* 썸네일 뒤 배경 레이어 */
  border-radius: 4px;
}

.noImage {
  background: linear-gradient(135deg,
    var(--ifm-color-primary-lighter) 0%,
    var(--ifm-color-primary-light) 100%);
}
```

---

## 6. 테마 오버라이드 (Swizzling)

### 6.1 DocItem/Layout/index.js

**변경 내용:**
- 개별 글 하단에 Giscus 댓글 추가
- `index.mdx` 기반 페이지(홈 랜딩, 카테고리 목록)는 doc id가 `index`로 끝나는 것으로 판별하여 댓글 제외

```jsx
export default function LayoutWrapper(props) {
  const {metadata} = useDoc();  // @docusaurus/plugin-content-docs/client
  const isIndexPage = metadata.id === 'index' || metadata.id.endsWith('/index');

  return (
    <>
      <Layout {...props} />
      {!isIndexPage && <GiscusComponent />}   {/* 개별 글에만 댓글 */}
    </>
  );
}
```

### 6.2 DocItem/Content/index.js

**변경 내용:**
- 문서 제목(h1) 바로 아래에 날짜 표시
- 프론트매터의 `date` 필드를 파싱하여 표시

```jsx
export default function DocItemContent({children}) {
  const syntheticTitle = useSyntheticTitle();
  const {metadata} = useDoc();
  const {frontMatter} = metadata;
  const formattedDate = formatDate(frontMatter.date);

  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown')}>
      {syntheticTitle && (
        <header>
          <Heading as="h1">{syntheticTitle}</Heading>
        </header>
      )}
      {formattedDate && (
        <div className={styles.docDate}>
          {formattedDate}
        </div>
      )}
      <MDXContent>{children}</MDXContent>
    </div>
  );
}
```

### 6.3 DocCard/index.js

**변경 내용:**
- 카테고리 카드에 하위 항목 총 개수 표시
- 재귀적으로 모든 하위 문서 카운트
- 카테고리 목록 페이지(`index.mdx`)는 글이 아니므로 집계에서 제외

```js
// 글이 없는 카테고리는 Docusaurus가 카테고리를 link로 접어버려 index.mdx가 글 1개로 잡힌다.
// (예: 글 0개인 Platform이 "3 items"로 표시) 이를 막기 위해 index 문서를 걸러낸다.
const isCategoryIndexLink = (item) =>
  item.docId === 'index' || item.docId?.endsWith('/index');

const countItemsRecursive = (items) => {
  let count = 0;
  items?.forEach((item) => {
    if (item.type === 'category') {
      count += countItemsRecursive(item.items);
    } else if (item.type === 'link' && !isCategoryIndexLink(item)) {
      count += 1;
    }
  });
  return count;
};

// 글 0개라 link로 접힌 카테고리 카드는 본문 첫 줄(`---`)이 description으로 잡히므로
// 대신 "0 항목"을 표시한다. (CardLink)
const description = isCategoryIndexLink(item)
  ? categoryItemsPlural(0)
  : doc?.description;
```

### 6.4 DocSidebar/index.js

**변경 내용:**
- 사이드바 카테고리에 글 개수 표시
- 예: `Kubernetes (13)`, `CKA (12)`
- 글이 없는 카테고리는 `(0)`으로 표시 (카테고리 목록 페이지 `index.mdx`는 집계 제외)

```js
const addCountToItems = (items) => {
  return items?.map(item => {
    if (item.type === 'category') {
      const itemCount = countItems(item.items);
      return {
        ...item,
        label: `${item.label} (${itemCount})`,
        items: addCountToItems(item.items)
      };
    }
    return item;
  });
};
```

### 6.5 DocItem/Paginator/index.js

**변경 내용:**
- 글 하단 이전/다음 네비게이션에서 카테고리 목록 페이지(`index.mdx`)를 건너뛰도록 재계산
- 기본 페이지네이션은 사이드바 순서를 그대로 따라가서 index 페이지가 이전/다음 대상으로 잡히는 문제가 있음. 프론트매터(`pagination_prev/next: null`)는 해당 페이지 "자신의" 페이지네이터만 없앨 뿐, 다른 글의 대상 목록에서 빼주지는 못하므로 Eject 방식으로 대체
- `useDocsSidebar()`로 사이드바 트리를 평탄화해 `link` 타입만 수집 (카테고리 링크로 붙은 index.mdx는 category 항목이라 자연히 제외), docId가 `index`로 끝나는 문서도 제외
- 현재 문서를 목록에서 못 찾으면(= index 페이지) 페이지네이터를 렌더링하지 않음

```jsx
export default function DocItemPaginator() {
  const {metadata} = useDoc();
  const sidebar = useDocsSidebar();
  if (!sidebar) return null;

  const docLinks = flattenDocLinks(sidebar.items);  // index 페이지 제외한 글 목록
  const currentIndex = docLinks.findIndex(
    (item) => item.permalink === metadata.permalink,
  );
  if (currentIndex === -1) return null;

  return (
    <DocPaginator
      className="docusaurus-mt-lg"
      previous={docLinks[currentIndex - 1]}
      next={docLinks[currentIndex + 1]}
    />
  );
}
```

---

## 7. CSS 커스터마이징

### 7.0 Infima 색상 변수 오버라이드

Docusaurus는 Infima CSS 프레임워크를 사용하며, `--ifm-color-primary` 계열 변수로 사이트 전체 테마 색상이 결정됩니다. 현재는 순정 템플릿과 동일한 값(라이트=녹색, 다크=청록)을 유지 중이며, 브랜드 색상을 바꾸려면 이 블록만 수정하면 됩니다.

```css
:root {
  --ifm-color-primary: #2e8555;   /* 라이트 모드 (녹색 계열) */
  --ifm-code-font-size: 95%;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] {
  --ifm-color-primary: #25c2a0;   /* 다크 모드 (청록 계열) */
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.3);
}
```

- `Posts.module.css`의 썸네일 없는 카드 그라디언트, 타이핑 커서 색상 등이 이 변수를 참조

### 7.1 문서 본문 전용 스타일

글 본문(`.markdown`)에만 폰트/크기/줄간격을 적용합니다. 사이드바, 네비게이션, 메인페이지 등은 Docusaurus 기본 스타일을 유지합니다.

```css
/* 문서 본문 전용 스타일 */
.markdown {
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont,
    "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif,
    "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  line-height: 32px;
  word-break: keep-all;
}

/* 다크 모드 본문 색상 */
[data-theme='dark'] .markdown {
  color: rgba(255, 255, 255, 0.81);
}
```

### 7.2 KaTeX 지원

```css
@import "katex/dist/katex.min.css";
```

### 7.3 사이드바 아이템 숨김

```css
.hidden-sidebar-item {
  display: none !important;
}
```

- 프론트매터에 `sidebar_class_name: hidden-sidebar-item` 설정 시 사이드바에서 숨김
- index 파일만 사이드바에 표시하려면 개별 글에 이 클래스 적용

### 7.4 Algolia 검색 하이라이트

```css
/* 검색 팝업 */
.DocSearch-Hit mark {
  background-color: #fff566 !important;
  color: #000000 !important;
}

/* 검색 결과 페이지 */
[class^="searchResultItem"] em {
  background-color: #fff566 !important;
  color: #000000 !important;
  font-weight: bold !important;
}
```

### 7.5 홈페이지 히어로 섹션

```css
.heroSection {
  padding: 1.5rem 0 0.5rem 0 !important;
}

.heroTitle {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
}

.heroSubtitle {
  font-family: var(--ifm-font-family-monospace);
}

/* 타이핑 커서 애니메이션 */
.typewriterCursor {
  animation: typewriterBlink 1s infinite;
}
```

### 7.6 Obsidian 콜아웃 스타일 (rehype-callouts)

Obsidian 콜아웃 문법을 Docusaurus에서 사용하기 위한 스타일

**사용 예시:**
```markdown
> [!note] 제목
> 내용

> [!warning] 경고
> 경고 내용

> [!tip] 팁
> 유용한 정보
```

**CSS 설정:**
```css
/* rehype-callouts 기본 테마 import */
@import "rehype-callouts/theme/obsidian";

/* 다크모드 호환 (Docusaurus는 [data-theme='dark'] 사용) */
[data-theme='dark'] .callout {
  mix-blend-mode: lighten;
  background-color: rgb(from var(--rc-color-dark, var(--rc-color-default)) r g b / 0.1);
}

[data-theme='dark'] .callout-title {
  color: var(--rc-color-dark, var(--rc-color-default));
}

/* 콜아웃 제목과 내용 사이 간격 */
.callout-content {
  margin-top: 0.5em;
}
```

### 7.7 공용 마크다운 색상 클래스

Obsidian과 Docusaurus에서 동일한 색상 클래스를 사용하기 위한 스타일

**동기화 위치:**
- Obsidian: `.obsidian/snippets/colors.css`
- Docusaurus: `src/css/custom.css`

**사용 예시:**
```html
<!-- 텍스트 색상 -->
<span class="t-red">빨간 텍스트</span>
<span class="t-blue">파란 텍스트</span>
<span class="t-green">초록 텍스트</span>

<!-- 형광펜 효과 -->
<span class="hl-amber">주황 하이라이트</span>
<span class="hl-purple">보라 하이라이트</span>
<span class="hl-teal">청록 하이라이트</span>
```

**색상 팔레트:**

| 클래스 | 다크 모드 | 라이트 모드 |
|--------|-----------|-------------|
| `.t-red` / `.hl-red` | #F09595 | #A32D2D |
| `.t-blue` / `.hl-blue` | #85B7EB | #185FA5 |
| `.t-green` / `.hl-green` | #97C459 | #3B6D11 |
| `.t-amber` / `.hl-amber` | #EF9F27 | #854F0B |
| `.t-purple` / `.hl-purple` | #AFA9EC | #534AB7 |
| `.t-teal` / `.hl-teal` | #5DCAA5 | #0F6E56 |

모든 `.t-*` / `.hl-*` 클래스에는 `font-weight: bold`가 적용되어 색상 강조와 함께 굵게 표시됩니다.

**테마 구분:**
- Obsidian 라이트 모드: `.theme-light` 클래스
- Docusaurus 라이트 모드: `html[data-theme='light']` 속성

### 7.8 문서 본문 이미지 테두리 및 그림자 (신규)

터미널/코드 스크린샷처럼 어두운 이미지가 다크 모드 배경에 묻히는 문제를 방지하기 위해, 글 본문(`.markdown`) 내 이미지에만 밝은 테두리와 은은한 그림자를 적용합니다. 로고/아이콘 등 본문 외 이미지는 영향받지 않습니다.

```css
[data-theme='dark'] .markdown img {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

[data-theme='light'] .markdown img {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
```

---

## 8. 랜딩 페이지 차이

### 기본 Docusaurus

- `src/pages/index.js` 사용
- `HomepageFeatures` 컴포넌트로 3개 피처 카드 표시
- Hero 배너 + 버튼

### 현재 프로젝트

- `src/pages/` 디렉토리 없음
- `docs/index.mdx`가 `/` 경로로 서빙
- MDX 내 React 컴포넌트 사용
  - 타이핑 애니메이션 효과
  - `SelectedPosts` 컴포넌트로 추천 글 표시

```mdx
<header className="heroSection">
  <h1 className="heroTitle">Pipes' Blog</h1>
  <TypewriterText />
</header>

## 추천 글
<SelectedPosts />
```

---

## 9. 파일별 변경 요약

### 버전 비교
- **basic-docu**: Docusaurus 3.10.0, Node.js >=20.0, `@docusaurus/faster` 포함
- **son-blog**: Docusaurus 3.8.1, Node.js >=18.0

### 파일 변경 내역

| 파일 | 상태 | 설명 |
|------|------|------|
| `docusaurus.config.js` | 수정 | 한국어, Algolia, Analytics, Mermaid, LaTeX 등 |
| `sidebars.js` | 동일 | 자동 생성 사용 |
| `src/css/custom.css` | 확장 | KaTeX, 검색 하이라이트, 홈페이지 스타일, Obsidian 콜아웃, 공용 색상 클래스, 본문 이미지 테두리 |
| `src/pages/` | 삭제 | docs/index.mdx로 대체 |
| `src/components/` | 신규 | 4개 커스텀 컴포넌트 + 공통 CSS |
| `src/theme/` | 신규 | 5개 테마 오버라이드 |
| `plugins/` | 신규 | gather-meta-plugin.js |
| `Dockerfile` | 신규 | 멀티 스테이지 빌드 (Node 20 -> Nginx) |
| `.github/` | 신규 | 온프렘/AWS 2중 배포 워크플로 + 태그 계산 스크립트 |

---

## 10. 글작성 시 참고사항

### 네이밍 규칙

- **카테고리 폴더**: 번호 프리픽스 + **대문자 시작** (예: `01-Container/02-Kubernetes/`)
- **글 파일**: 번호 프리픽스 + **소문자 케밥 케이스** (예: `05-llm-serving-study-week1.md`)
- 카테고리 폴더에는 `_category_.json`으로 사이드바 라벨 지정, `index.mdx`로 카테고리 목록 페이지 구성

### 이미지 경로 규칙 (본문 / 썸네일 이원화)

이미지는 **두 곳**에 저장하며 용도에 따라 참조 경로가 다릅니다.

| 용도 | 저장 위치 | 참조 방식 |
|------|-----------|-----------|
| 본문 이미지 | `docs/<카테고리>/assets/<글이름>/` | 상대 경로 (`assets/01-gitaiops-01/ai-book.png`) |
| 프론트매터 썸네일 | `static/img/posts/<카테고리>/<글이름>/` | 절대 경로 (`/img/posts/09-Peer-Learning/01-gitaiops-01/ai-book.png`) |

- 본문은 Docusaurus가 상대 경로 이미지를 번들링하므로 `docs/` 내 `assets/` 사용
- 프론트매터 `image`는 빌드 시 번들링되지 않으므로 `static/` 아래 실제 경로가 필요 (`SelectedPosts`/`CategoryPosts` 썸네일, 소셜 카드에 사용)
- **카테고리 폴더명을 바꾸면 두 경로 모두 함께 옮겨야 함**

### 새 문서 추가 시

1. `docs/<카테고리>/` 하위에 `.md` 또는 `.mdx` 파일 생성
2. 이미지는 위 규칙에 따라 `assets/`와 `static/img/posts/` 양쪽에 배치
3. 프론트매터 작성 (`title`, `description`, `date`, `image`, `sidebar_class_name: hidden-sidebar-item`)

### 추천 글 변경 시

`src/components/SelectedPosts.js`의 `SELECTED_POST_IDS` 배열 수정 (카테고리 구조가 바뀌면 이 경로들도 함께 갱신 필요)

---

## 11. 배포 및 CI/CD (순정 대비 신규)

순정 Docusaurus는 GitHub Pages 배포(`deploy` 스크립트)를 전제로 하지만, 이 프로젝트는 **컨테이너 이미지 빌드 + GitOps** 방식으로 배포합니다.

### 11.1 Dockerfile

멀티 스테이지 빌드 — `node:20-alpine`에서 `npm run build` 후 결과물(`/app/build`)을 `nginx:stable-alpine`으로 복사.

### 11.2 GitHub Actions 워크플로

`.github/workflows/build-push-and-bump-tag.yaml` — main 브랜치 push 시 실행되며, **온프렘과 AWS 두 개의 job**으로 구성됩니다.

| Job | 실행 환경 | 레지스트리 | GitOps 대상 |
|-----|-----------|------------|-------------|
| `deploy-onprem` | self-hosted runner (`my-blog-runner`) | Harbor (`harbor.onprem.arpa/son/blog`) | `overlays/onprem/prod/kustomization.yaml` |
| `deploy-aws` | `ubuntu-latest` | AWS ECR (OIDC role assume) | `overlays/aws/prod/kustomization.yaml` |

- 각 job은 리포지토리 변수 `ENABLE_ONPREM` / `ENABLE_AWS`로 개별 on/off (온프렘 기본 `false`, AWS 기본 `true`)
- 매니페스트는 이 저장소가 아닌 **별도 GitOps 저장소 `Son-Hunseo/blog-gitops`** 에 있으며, 워크플로가 해당 저장소의 kustomization `newTag`를 갱신하고 커밋/푸시 → ArgoCD가 동기화
- 과거에 있던 `k8s/resource/` 매니페스트 폴더는 GitOps 저장소로 이관되며 삭제됨

### 11.3 이미지 태그 자동 증가

`.github/scripts/calc_next_tag.py`가 레지스트리(Harbor API / `aws ecr describe-images`) 응답을 stdin으로 받아 `major.minor` 형식 태그 중 최댓값 +1을 계산합니다. (`0.9` → `1.0`, 태그가 없으면 `0.1`부터)

### 11.4 무한 루프 방지

- `paths-ignore: .github/**` — 워크플로 자체 수정은 파이프라인을 트리거하지 않음
- `github.actor != 'github-actions[bot]'` — 봇이 만든 커밋으로 재실행되지 않음
