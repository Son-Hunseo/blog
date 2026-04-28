/**
 * SelectedPosts.js
 *
 * 홈페이지 추천 글 표시 컴포넌트
 *
 * [목적]
 * - 관리자가 수동으로 선택한 글들을 홈페이지(docs/index.mdx)에 표시
 * - 최신 글이 아닌, 가장 중요하거나 인기 있는 글을 강조
 *
 * [동작 방식]
 * 1. gather-meta-plugin에서 전체 포스트 데이터를 가져옴
 * 2. SELECTED_POST_IDS 배열에 정의된 ID(경로)와 매칭
 * 3. 매칭된 글들을 카드 형태로 렌더링
 *
 * [추천 글 변경 방법]
 * SELECTED_POST_IDS 배열에 원하는 글의 경로(ID)를 추가/제거
 * 예: 'Kubernetes/CKA/Exam/Exam-Recap-2'
 *
 * [사용처]
 * - docs/index.mdx (홈페이지)
 */

import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';                   // Docusaurus 링크 컴포넌트
import {usePluginData} from '@docusaurus/useGlobalData';  // 플러그인 전역 데이터 훅
import styles from './Posts.module.css';              // 공통 포스트 스타일

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
 * 홈페이지에 표시할 추천 글 ID(경로) 목록
 *
 * [형식]
 * - 'Category/SubCategory/document-slug' 형태로 작성
 * - gather-meta-plugin이 생성하는 link 경로와 매칭됨
 *
 * [수정 방법]
 * - 새 글 추가: 배열에 경로 추가
 * - 글 제거: 배열에서 경로 삭제
 * - 순서 변경: 배열 순서 조정 (배열 순서대로 표시됨)
 */
const SELECTED_POST_IDS = [
    'AI/Claude-Code-Tips',
    'Cloud-Infra/Kubernetes/CKA/Exam/Exam-Recap-2',
    'Cloud-Infra/Openstack/Install-OpenStack',
    'Cloud-Infra/Openstack/Install-Ceph',
    'Cloud-Infra/Openstack/Connect-OpenStack-Ceph',
    'Dev/Project/Chocoletter-Advance-01',
    'Dev/Project/Chocoletter-Advance-02',
    'Dev/Project/Chocoletter-Advance-06',
];

/**
 * 선택된 포스트 목록 컴포넌트
 * @returns {JSX.Element|null} 포스트 카드 그리드 또는 null
 */
function SelectedPosts() {
  // gather-meta-plugin에서 전체 포스트 데이터 가져오기
  const {recentPosts} = usePluginData('gather-meta-plugin');

  // 필터링된 추천 글 목록 상태
  const [displayPosts, setDisplayPosts] = useState([]);

  /**
   * recentPosts 데이터가 로드되면 선택된 글 필터링
   * - SELECTED_POST_IDS 순서를 유지하면서 매칭
   */
  useEffect(() => {
    if (recentPosts && recentPosts.length > 0 && SELECTED_POST_IDS.length > 0) {
      // SELECTED_POST_IDS 배열 순서대로 포스트 찾기
      const selected = SELECTED_POST_IDS.map(targetId => {
        return recentPosts.find(post => {
          // post.id가 있으면 우선 비교, 없으면 link에서 매칭
          // link는 '/'로 시작하므로 targetId가 포함되어 있는지 확인
          return (post.id === targetId) || (post.link && post.link.includes(targetId));
        });
      }).filter(post => post !== undefined); // 매칭되지 않은 항목 제거

      setDisplayPosts(selected);
    }
  }, [recentPosts]);

  // 표시할 글이 없으면 컴포넌트 렌더링 안 함
  if (!displayPosts || displayPosts.length === 0) {
    return null;
  }

  return (
    <section className={styles.categoryPosts}>
      {/* 포스트 카드 그리드 */}
      <div className={styles.postsGrid}>
        {displayPosts.map((post, idx) => (
          <article key={idx} className={styles.postCard}>
            {/* 카드 전체를 링크로 감싸서 클릭 가능하게 */}
            <Link to={post.link} className={styles.postLink}>
              {/* 썸네일 이미지 */}
              {post.image ? (
                <div className={styles.imageWrapper}>
                  <img src={post.image} alt={post.title} className={styles.postImage} />
                </div>
              ) : (
                <div className={styles.noImage}>
                  <span className={styles.noImageIcon}>📄</span>
                </div>
              )}
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

export default SelectedPosts;
