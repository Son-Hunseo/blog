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
├── docs/                          # 번호 프리픽스로 정렬 (01-Kubernetes/, 03-Docker/ 등)
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
│       └── DocSidebar/            # 사이드바 (글 개수 표시)
├── plugins/
│   └── gather-meta-plugin.js      # 커스텀 플러그인
└── package.json
```

---

## 2. package.json 차이점

### 버전 차이

| 항목 | basic-docu | son-blog |
|------|------------|----------|
| Docusaurus | 3.10.0 | 3.8.1 |
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
  rehypePlugins: [require('rehype-katex')],  // LaTeX 렌더링
}
```

- 기본 Docusaurus는 `/docs`에서 문서가 시작되지만, 현재 프로젝트는 `/`에서 바로 문서가 표시됨

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
  defaultMode: 'dark',           // 기본 다크모드
  disableSwitch: false,
  respectPrefersColorScheme: false,  // 시스템 설정 무시
}
```

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
  'AI/Claude-Code-Tips',
  'Kubernetes/CKA/Exam/Exam-Recap-2',
  // ...
];
```

- `Posts.module.css` 공통 스타일 사용

### 5.3 CategoryPosts.js

**목적:** 현재 카테고리의 포스트 목록 표시

- URL 경로 기반 자동 필터링
- index 페이지 제외
- `Posts.module.css` 공통 스타일 사용

### 5.4 SimpleDocList.js

**목적:** 단순한 문서 목록 표시

---

## 6. 테마 오버라이드 (Swizzling)

### 6.1 DocItem/Layout/index.js

**변경 내용:**
- 문서 하단에 Giscus 댓글 추가

```jsx
export default function LayoutWrapper(props) {
  return (
    <>
      <Layout {...props} />
      <GiscusComponent />   {/* 댓글 */}
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

```js
const countItemsRecursive = (items) => {
  let count = 0;
  items?.forEach((item) => {
    if (item.type === 'category') {
      count += countItemsRecursive(item.items);
    } else if (item.type === 'link') {
      count += 1;
    }
  });
  return count;
};
```

### 6.4 DocSidebar/index.js

**변경 내용:**
- 사이드바 카테고리에 글 개수 표시
- 예: `Kubernetes (13)`, `CKA (12)`

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

---

## 7. CSS 커스터마이징

### 7.1 KaTeX 지원

```css
@import "katex/dist/katex.min.css";
```

### 7.2 사이드바 아이템 숨김

```css
.hidden-sidebar-item {
  display: none !important;
}
```

- 프론트매터에 `sidebar_class_name: hidden-sidebar-item` 설정 시 사이드바에서 숨김
- index 파일만 사이드바에 표시하려면 개별 글에 이 클래스 적용

### 7.3 Algolia 검색 하이라이트

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

### 7.4 홈페이지 히어로 섹션

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
| `src/css/custom.css` | 확장 | KaTeX, 검색 하이라이트, 홈페이지 스타일 |
| `src/pages/` | 삭제 | docs/index.mdx로 대체 |
| `src/components/` | 신규 | 4개 커스텀 컴포넌트 + 공통 CSS |
| `src/theme/` | 신규 | 4개 테마 오버라이드 |
| `plugins/` | 신규 | gather-meta-plugin.js |

---

## 10. 글작성 시 참고사항

### 새 문서 추가 시

1. `docs/` 하위에 `.md` 또는 `.mdx` 파일 생성
2. 이미지는 `static/img/` 폴더에 직접 저장
3. 프론트매터에 필요한 메타데이터 직접 작성 (`image`, `sidebar_class_name` 등)

### 추천 글 변경 시

`src/components/SelectedPosts.js`의 `SELECTED_POST_IDS` 배열 수정
