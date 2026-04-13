/**
 * gather-meta-plugin.js
 *
 * Docusaurus 커스텀 플러그인: 모든 문서의 메타데이터를 수집하여 전역 데이터로 제공
 *
 * [목적]
 * - docs/ 폴더 내 모든 .md/.mdx 파일을 스캔
 * - 각 문서의 프론트매터(title, description, tags, date 등)를 추출
 * - URL 경로를 자동으로 생성 (숫자 프리픽스 제거)
 * - 카테고리 경로별로 문서를 그룹화
 *
 * [제공 데이터]
 * - recentPosts: 모든 포스트 배열 (SelectedPosts 컴포넌트에서 사용)
 * - postsByPath: 경로별 포스트 그룹 (CategoryPosts 컴포넌트에서 사용)
 *
 * [사용처]
 * - src/components/SelectedPosts.js - 홈페이지 추천 글 표시
 * - src/components/CategoryPosts.js - 카테고리별 포스트 목록
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter'); // 마크다운 프론트매터 파싱 라이브러리

/**
 * Docusaurus 플러그인 메인 함수
 * @param {Object} context - Docusaurus 컨텍스트 (siteDir 등 포함)
 * @param {Object} options - 플러그인 옵션 (현재 미사용)
 * @returns {Object} 플러그인 객체
 */
module.exports = function (context, options) {
  return {
    name: 'gather-meta-plugin',

    /**
     * contentLoaded 훅: Docusaurus가 콘텐츠를 로드한 후 실행
     * 모든 문서를 스캔하고 메타데이터를 수집하여 전역 데이터로 설정
     */
    async contentLoaded({content, actions}) {
      const {setGlobalData} = actions;

      // docs 폴더 경로
      const docsDir = path.join(context.siteDir, 'docs');

      /**
       * 폴더/파일 이름에서 숫자 프리픽스 제거
       * 예: "01-Kubernetes" -> "Kubernetes", "03-Docker" -> "Docker"
       *
       * Docusaurus에서 폴더 순서를 제어하기 위해 숫자 프리픽스를 사용하지만,
       * URL에서는 이 숫자를 제거하여 깔끔한 URL을 생성
       *
       * @param {string} str - 원본 문자열
       * @returns {string} 숫자 프리픽스가 제거된 문자열
       */
      function removeNumberPrefix(str) {
        return str.replace(/^\d+-/, '');
      }

      /**
       * 디렉토리 내 모든 마크다운 파일(.md, .mdx)을 재귀적으로 탐색
       *
       * @param {string} dir - 탐색할 디렉토리 경로
       * @param {Array} fileList - 수집된 파일 경로 배열 (재귀 호출용)
       * @returns {Array} 모든 마크다운 파일 경로 배열
       */
      function getAllMdFiles(dir, fileList = []) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            // 디렉토리면 재귀적으로 탐색
            getAllMdFiles(filePath, fileList);
          } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
            // 마크다운 파일이면 목록에 추가
            fileList.push(filePath);
          }
        });

        return fileList;
      }

      /**
       * 폴더의 index 파일에서 slug 값을 추출
       * 폴더에 커스텀 slug가 설정되어 있으면 해당 slug를 URL 경로에 사용
       *
       * @param {string} folderPath - 폴더 경로
       * @returns {string|null} slug 값 또는 null
       */
      function getFolderSlug(folderPath) {
        const indexPath = path.join(folderPath, 'index.mdx');
        const indexMdPath = path.join(folderPath, 'index.md');

        // index.mdx 또는 index.md 파일 찾기
        let targetPath = null;
        if (fs.existsSync(indexPath)) {
          targetPath = indexPath;
        } else if (fs.existsSync(indexMdPath)) {
          targetPath = indexMdPath;
        }

        // index 파일이 있으면 프론트매터에서 slug 추출
        if (targetPath) {
          const content = fs.readFileSync(targetPath, 'utf-8');
          const {data} = matter(content);
          return data.slug || null;
        }

        return null;
      }

      /**
       * 폴더의 index 파일에서 카테고리 이름(title)을 추출
       * 사이드바나 UI에 표시할 카테고리 이름으로 사용
       *
       * @param {string} folderPath - 폴더 경로
       * @returns {string|null} 카테고리 이름 또는 null
       */
      function getCategoryName(folderPath) {
        const indexPath = path.join(folderPath, 'index.mdx');
        const indexMdPath = path.join(folderPath, 'index.md');

        let targetPath = null;
        if (fs.existsSync(indexPath)) {
          targetPath = indexPath;
        } else if (fs.existsSync(indexMdPath)) {
          targetPath = indexMdPath;
        }

        if (targetPath) {
          const content = fs.readFileSync(targetPath, 'utf-8');
          const {data} = matter(content);
          return data.title || null;
        }

        return null;
      }

      // 모든 마크다운 파일 수집
      const mdFiles = getAllMdFiles(docsDir);
      const posts = [];                 // 전체 포스트 배열
      const postsByPath = {};           // 카테고리 경로별 포스트 그룹

      // 각 마크다운 파일 처리
      mdFiles.forEach(filePath => {
        const fileName = path.basename(filePath, path.extname(filePath));

        // index 파일과 _category_ 파일은 포스트 목록에서 제외
        // (이들은 카테고리 설정용 파일이므로)
        if (fileName === 'index' || fileName === '_category_') {
          return;
        }

        // 파일 내용 읽기 및 프론트매터 파싱
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const {data: frontMatter, content: contentText} = matter(fileContent);

        // 루트 랜딩 페이지(slug: '/')는 포스트 목록에서 제외
        if (frontMatter.slug === '/') {
          return;
        }

        // 파일 경로 분석
        const fileDir = path.dirname(filePath);
        const relativePath = path.relative(docsDir, filePath);  // docs/로부터의 상대 경로
        const pathParts = relativePath.split(path.sep);         // 경로를 부분으로 분리

        let urlPath = '';
        const fileDirParts = pathParts.slice(0, -1);  // 파일명을 제외한 디렉토리 경로

        /**
         * URL 경로 구성
         * 1. 각 폴더의 slug를 확인 (index 파일의 프론트매터)
         * 2. slug가 없으면 폴더명에서 숫자 프리픽스 제거
         * 3. 최종 URL: /카테고리/서브카테고리/문서slug
         */
        if (fileDirParts.length > 0) {
          const folderSlugs = [];
          for (let i = 0; i < fileDirParts.length; i++) {
            const folderPath = path.join(docsDir, ...pathParts.slice(0, i + 1));
            const folderSlug = getFolderSlug(folderPath);
            if (folderSlug) {
              // 폴더에 커스텀 slug가 있으면 사용
              const cleanSlug = folderSlug.replace(/^\//, '').split('/').pop();
              folderSlugs.push(cleanSlug);
            } else {
              // 없으면 폴더명에서 숫자 프리픽스 제거하여 사용
              folderSlugs.push(removeNumberPrefix(fileDirParts[i]));
            }
          }
          urlPath = folderSlugs.join('/');

          // 문서 자체의 slug 처리
          if (frontMatter.slug) {
            const docSlug = frontMatter.slug.startsWith('/') ? frontMatter.slug.substring(1) : frontMatter.slug;
            urlPath = `${urlPath}/${docSlug}`;
          } else {
            urlPath = `${urlPath}/${removeNumberPrefix(fileName)}`;
          }
        } else {
          // 루트 레벨 문서
          if (frontMatter.slug) {
            urlPath = frontMatter.slug.replace(/^\//, '');
          } else {
            urlPath = removeNumberPrefix(fileName);
          }
        }

        /**
         * 카테고리 경로 생성
         * - 파일이 속한 폴더의 전체 경로
         * - CategoryPosts 컴포넌트에서 현재 카테고리의 글 목록을 찾는 데 사용
         */
        let categoryPath = '';
        if (fileDirParts.length > 0) {
          const folderSlugs = [];
          for (let i = 0; i < fileDirParts.length; i++) {
            const folderPath = path.join(docsDir, ...pathParts.slice(0, i + 1));
            const folderSlug = getFolderSlug(folderPath);
            if (folderSlug) {
              const cleanSlug = folderSlug.replace(/^\//, '');
              folderSlugs.push(cleanSlug);
            } else {
              folderSlugs.push(removeNumberPrefix(fileDirParts[i]));
            }
          }
          categoryPath = folderSlugs.join('/');
        }

        /**
         * 카테고리 이름 생성 (UI 표시용)
         * 예: "Kubernetes / CKA / Exam"
         * - 각 폴더의 title을 추출하여 슬래시로 연결
         */
        let categoryName = 'Etc';
        if (fileDirParts.length > 0) {
          const categoryParts = [];
          for (let i = 0; i < fileDirParts.length; i++) {
            const folderPath = path.join(docsDir, ...pathParts.slice(0, i + 1));
            const folderTitle = getCategoryName(folderPath);
            if (folderTitle) {
              categoryParts.push(folderTitle);
            } else {
              categoryParts.push(removeNumberPrefix(fileDirParts[i]));
            }
          }
          categoryName = categoryParts.join(' / ');
        }

        /**
         * 문서 설명 자동 추출
         * 프론트매터에 description이 없으면 본문 첫 줄에서 추출
         * - 제목(#), import문, 이미지(!) 제외
         * - 최대 150자로 제한
         */
        const description = contentText
          .split('\n')
          .find(line => line.trim() && !line.startsWith('#') && !line.startsWith('import') && !line.startsWith('!'))
          ?.substring(0, 150) || '';

        /**
         * 읽는 시간 계산
         * - 평균 독서 속도: 200단어/분 기준
         * - 최소 1분으로 설정
         */
        const wordCount = contentText.trim().split(/\s+/).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        // 포스트 데이터 객체 생성
        const postData = {
          title: frontMatter.title || 'Untitled',        // 문서 제목
          description: frontMatter.description || description,  // 문서 설명
          link: `/${urlPath}`,                           // URL 링크
          category: categoryName,                        // 카테고리 이름 (표시용)
          categoryPath: categoryPath,                    // 카테고리 경로 (필터링용)
          tags: frontMatter.tags || [],                  // 태그 배열
          date: frontMatter.date || null,                // 작성일
          readingTime: readingTime,                      // 예상 읽기 시간 (분)
        };

        // 전체 포스트 배열에 추가
        posts.push(postData);

        // 카테고리 경로별로 그룹화
        if (!postsByPath[categoryPath]) {
          postsByPath[categoryPath] = [];
        }
        postsByPath[categoryPath].push(postData);
      });

      /**
       * 전역 데이터 설정
       * 다른 컴포넌트에서 usePluginData('gather-meta-plugin')로 접근 가능
       */
      setGlobalData({
        recentPosts: posts,           // 전체 포스트 배열
        postsByPath: postsByPath      // 카테고리 경로별 포스트 그룹
      });
    },
  };
};
