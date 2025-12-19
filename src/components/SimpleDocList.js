/*
해당 카테고리의 index.mdx에 추가할 수 있는 커스텀 컴포넌트 코드
이 컴포넌트를 카테고리의 index.mdx에 추가하면, 아래 예시처럼 글들이 나옴

기본으로 도큐사우루스에 내장되어있는 카드리스트 컴포넌트가 글이 많아지면 너무 번잡스러워져서 만듬

예시:
[카테고리]
- 글1
- 글2
- 글3
...
*/
import React from 'react';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';
import Link from '@docusaurus/Link';
import styles from './SimpleDocList.module.css';

export default function SimpleDocList() {
  const category = useCurrentSidebarCategory();
  
  if (!category) {
    return null;
  }

  return (
    <ul className={styles.list}>
      {category.items.map((item, index) => (
        <li key={index} className={styles.listItem}>
          <Link to={item.href} className={styles.link}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}