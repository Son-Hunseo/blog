/*
사용자가 직접 선택한 글들을 메인 화면에 보여주는 컴포넌트
파일 경로(ID)를 기준으로 글을 선택함
*/
import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
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

// 여기에 메인에 띄우고 싶은 글의 ID(경로)를 입력하세요.
// 예: 'docs/category/my-post' 또는 'my-post' 등 docusaurus가 생성하는 ID 기준
const SELECTED_POST_IDS = [
    'AI/Claude-Code-Tips',
    'Kubernetes/CKA/Exam/Exam-Recap-2',
    'Golang/Java-vs-Go-Thread',
    'Network/Namespace',
    'Project/Chocoletter-Advance-00',
    'Project/Chocoletter-Advance-01',
    'Project/Chocoletter-Advance-02',
    'Project/Chocoletter-Advance-03',
    'Project/Chocoletter-Advance-04',
    'Project/Chocoletter-Advance-05',
    'Project/Chocoletter-Advance-06',
];

function SelectedPosts() {
  const {recentPosts} = usePluginData('gather-meta-plugin');
  const [displayPosts, setDisplayPosts] = useState([]);
  
  useEffect(() => {
    if (recentPosts && recentPosts.length > 0 && SELECTED_POST_IDS.length > 0) {
      // 선택된 ID에 해당하는 포스트 필터링
      // recentPosts의 id나 link 등을 확인하여 매칭해야 함.
      // 보통 recentPosts 데이터 구조에 id가 포함되어 있다고 가정하거나, 
      // link에서 유추해야 할 수도 있습니다. gather-meta-plugin의 데이터 구조에 따라 조정 필요.
      // 여기서는 id가 일치하거나 link가 해당 문자열을 포함하는 경우로 매칭 시도
      
      const selected = SELECTED_POST_IDS.map(targetId => {
        return recentPosts.find(post => {
            // post.id가 있다면 그것을 우선 비교, 없다면 link 등을 비교
            // Docusaurus 플러그인 데이터 구조에 따라 post.id, post.metadata.id 등을 확인해야 함
            // 여기서는 일반적인 경우를 가정하여 비교
            return (post.id === targetId) || (post.link && post.link.includes(targetId));
        });
      }).filter(post => post !== undefined); // 찾지 못한 경우 제외

      setDisplayPosts(selected);
    }
  }, [recentPosts]);
  
  if (!displayPosts || displayPosts.length === 0) {
    return null;
  }

  return (
    <section className={styles.categoryPosts}>
      <div className={styles.postsGrid}>
        {displayPosts.map((post, idx) => (
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

export default SelectedPosts;