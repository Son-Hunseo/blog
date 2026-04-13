/**
 * CategoryPosts.js
 *
 * 카테고리별 포스트 목록 컴포넌트
 *
 * [목적]
 * - 현재 카테고리(URL 경로)에 속한 모든 글을 카드 형태로 표시
 * - 각 카테고리의 index.mdx 파일에서 사용하여 해당 카테고리의 글 목록 제공
 *
 * [동작 방식]
 * 1. 현재 URL 경로를 파싱하여 카테고리 경로 추출
 * 2. gather-meta-plugin의 postsByPath에서 해당 경로의 글 목록 가져오기
 * 3. index 페이지 자체는 목록에서 제외
 * 4. 글들을 카드 그리드로 렌더링
 *
 * [사용처]
 * - 각 카테고리의 index.mdx 파일
 * - 예: docs/01-Kubernetes/index.mdx에서 <CategoryPosts /> 사용
 */

import React from 'react';
import Link from '@docusaurus/Link';                    // Docusaurus 내부 링크 컴포넌트
import {usePluginData} from '@docusaurus/useGlobalData'; // 플러그인 전역 데이터 훅
import {useLocation} from '@docusaurus/router';          // 현재 URL 경로 훅
import styles from './Posts.module.css';                // 공통 포스트 스타일

/**
 * 날짜 문자열을 사람이 읽기 쉬운 형식으로 변환
 * @param {string} dateString - ISO 형식 날짜 문자열 (예: '2024-01-15')
 * @returns {string|null} 포맷된 날짜 (예: 'January 15, 2024') 또는 null
 */
function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * 카테고리 포스트 목록 컴포넌트
 *
 * 현재 URL 경로를 기반으로 해당 카테고리의 글 목록을 자동으로 표시
 *
 * @returns {JSX.Element|null} 포스트 카드 그리드 또는 null (글이 없을 경우)
 */
function CategoryPosts() {
  // gather-meta-plugin에서 경로별 포스트 데이터 가져오기
  const {postsByPath} = usePluginData('gather-meta-plugin');

  // 현재 브라우저 URL 경로 가져오기
  const location = useLocation();

  /**
   * 현재 경로에서 카테고리 경로 추출
   * - 앞뒤 슬래시 제거하여 postsByPath의 키와 매칭
   * 예: '/Kubernetes/CKA/' -> 'Kubernetes/CKA'
   */
  let currentPath = location.pathname.replace(/^\/|\/$/g, '');

  // 현재 카테고리의 글 목록 가져오기 (없으면 빈 배열)
  const categoryPosts = postsByPath?.[currentPath] || [];

  /**
   * index 페이지 자체는 목록에서 제외
   * - 카테고리 index 페이지가 자기 자신을 목록에 포함하지 않도록 필터링
   */
  const filteredPosts = categoryPosts.filter(post =>
    post.link !== `/${currentPath}` &&
    post.link !== `/${currentPath}/`
  );

  // 표시할 글이 없으면 컴포넌트 렌더링 안 함
  if (!filteredPosts || filteredPosts.length === 0) {
    return null;
  }

  return (
    <section className={styles.categoryPosts}>
      {/* 포스트 카드 그리드 */}
      <div className={styles.postsGrid}>
        {filteredPosts.map((post, idx) => (
          <article key={idx} className={styles.postCard}>
            {/* 카드 전체를 링크로 감싸서 클릭 가능하게 */}
            <Link to={post.link} className={styles.postLink}>
              <div className={styles.postContent}>
                {/* 글 제목 */}
                <h3 className={styles.postTitle}>{post.title}</h3>

                {/* 글 설명 (요약) */}
                <p className={styles.description}>{post.description}</p>

                {/* 메타 정보 영역 */}
                <div className={styles.postMeta}>
                  {/* 작성일 */}
                  {post.date && (
                    <span className={styles.metaItem}>{formatDate(post.date)}</span>
                  )}

                  {/* 읽는 시간 */}
                  {post.readingTime && (
                    <>
                      <span className={styles.metaSeparator}>·</span>
                      <span className={styles.metaItem}>{post.readingTime} min</span>
                    </>
                  )}

                  {/* 카테고리 */}
                  {post.category && (
                    <>
                      <span className={styles.metaSeparator}>·</span>
                      <span className={styles.metaCategory}>{post.category}</span>
                    </>
                  )}

                  {/* 태그 목록 */}
                  {post.tags && post.tags.length > 0 && (
                    <>
                      <span className={styles.metaSeparator}>·</span>
                      <span className={styles.metaTags}>{post.tags.join(', ')}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CategoryPosts;
