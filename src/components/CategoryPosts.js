import React from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useLocation} from '@docusaurus/router';
import styles from './CategoryPosts.module.css';

function CategoryPosts() {
  const {postsByCategory} = usePluginData('random-posts-plugin');
  const location = useLocation();
  
  // 현재 경로에서 카테고리 추출
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentCategory = pathParts[0] || '';
  
  // 현재 카테고리의 글들 가져오기
  const categoryPosts = postsByCategory?.[currentCategory] || [];
  
  // index 페이지는 제외
  const filteredPosts = categoryPosts.filter(post => 
    !post.link.endsWith(`/${currentCategory}`) && 
    !post.link.endsWith(`/${currentCategory}/`)
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
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.description}>{post.description}</p>
                {post.keywords && post.keywords.length > 0 && (
                  <div className={styles.keywords}>
                    {post.keywords.slice(0, 3).map((keyword, keyIdx) => (
                      <span key={keyIdx} className={styles.keyword}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CategoryPosts;