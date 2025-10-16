import React from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './RecentPosts.module.css';

function RecentPosts() {
  const {recentPosts} = usePluginData('recent-posts-plugin');
  
  if (!recentPosts || recentPosts.length === 0) {
    return null;
  }

  return (
    <section className={styles.recentPosts}>
      <h2>최근 게시글</h2>
      <div className={styles.postsGrid}>
        {recentPosts.map((post, idx) => (
          <article key={idx} className={styles.postCard}>
            <Link to={post.link} className={styles.postLink}>
              {post.image && (
                <div className={styles.imageWrapper}>
                  <img src={post.image} alt={post.title} className={styles.postImage} />
                  <div className={styles.imageOverlay}>
                    <h3 className={styles.cardTitle}>{post.title}</h3>
                  </div>
                </div>
              )}
              {!post.image && (
                <div className={styles.noImageWrapper}>
                  <h3 className={styles.cardTitle}>{post.title}</h3>
                </div>
              )}
              <div className={styles.postContent}>
                <p className={styles.description}>{post.description}</p>
                <div className={styles.postMeta}>
                  <span className={styles.category}>{post.category}</span>
                  <span className={styles.separator}>·</span>
                  <span className={styles.date}>{post.dateText}</span>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className={styles.tags}>
                    {post.tags.map((tag, tagIdx) => (
                      <span key={tagIdx} className={styles.tag}>
                        {tag}
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

export default RecentPosts;