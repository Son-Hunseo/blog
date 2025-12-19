/*
메인 화면에 아무것도 없으니 처음 사람이 들어왔을 때 뭘 읽어야할지 허전할 것 같아서 만듬
전체 글 중 설정한 n개 리스트 형식으로 랜덤하게 배치됨
*/
import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './RandomPosts.module.css';

function RandomPosts() {
  const {recentPosts} = usePluginData('random-posts-plugin');
  const [randomPosts, setRandomPosts] = useState([]);
  
  useEffect(() => {
    if (recentPosts && recentPosts.length > 0) {
      // Fisher-Yates 셔플 알고리즘
      const shuffled = [...recentPosts];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      // 10개만 선택
      setRandomPosts(shuffled.slice(0, 10));
    }
  }, [recentPosts]);
  
  if (!randomPosts || randomPosts.length === 0) {
    return null;
  }

  return (
    <section className={styles.randomPosts}>
      <h2>글 목록</h2>
      <div className={styles.postsGrid}>
        {randomPosts.map((post, idx) => (
          <article key={idx} className={styles.postCard}>
            <Link to={post.link} className={styles.postLink}>
              {post.image ? (
                <div className={styles.imageWrapper}>
                  <img src={post.image} alt={post.title} className={styles.postImage} />
                </div>
              ) : (
                <div className={styles.noImageWrapper}>
                  <span style={{fontSize: '2rem', opacity: 0.5}}>📄</span>
                </div>
              )}
              <div className={styles.postContent}>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                <p className={styles.description}>{post.description}</p>
                <div className={styles.postMeta}>
                  <span className={styles.category}>{post.category}</span>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className={styles.tags}>
                    {post.tags.slice(0, 3).map((tag, tagIdx) => (
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

export default RandomPosts;