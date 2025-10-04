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