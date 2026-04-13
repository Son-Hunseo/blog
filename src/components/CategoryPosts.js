import React from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useLocation} from '@docusaurus/router';
import styles from './Posts.module.css';

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function CategoryPosts() {
  const {postsByPath} = usePluginData('gather-meta-plugin');
  const location = useLocation();
  
  // 현재 경로에서 전체 카테고리 경로 추출 (마지막 슬래시 제거)
  let currentPath = location.pathname.replace(/^\/|\/$/g, '');
  
  // 현재 경로의 글들 가져오기
  const categoryPosts = postsByPath?.[currentPath] || [];
  
  // index 페이지는 제외
  const filteredPosts = categoryPosts.filter(post => 
    post.link !== `/${currentPath}` && 
    post.link !== `/${currentPath}/`
  );
  
  if (!filteredPosts || filteredPosts.length === 0) {
    return null;
  }

  return (
    <section className={styles.categoryPosts}>
      <div className={styles.postsGrid}>
        {filteredPosts.map((post, idx) => (
          <article key={idx} className={styles.postCard}>
            <Link to={post.link} className={styles.postLink}>
              <div className={styles.postContent}>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.description}>{post.description}</p>
                <div className={styles.postMeta}>
                  {post.date && (
                    <span className={styles.metaItem}>{formatDate(post.date)}</span>
                  )}
                  {post.readingTime && (
                    <>
                      <span className={styles.metaSeparator}>·</span>
                      <span className={styles.metaItem}>{post.readingTime} min</span>
                    </>
                  )}
                  {post.category && (
                    <>
                      <span className={styles.metaSeparator}>·</span>
                      <span className={styles.metaCategory}>{post.category}</span>
                    </>
                  )}
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