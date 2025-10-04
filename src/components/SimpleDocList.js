import React from 'react';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common';
import Link from '@docusaurus/Link';

export default function SimpleDocList() {
  const category = useCurrentSidebarCategory();
  
  if (!category) {
    return null;
  }

  return (
    <ul>
      {category.items.map((item, index) => (
        <li key={index}>
          <Link to={item.href}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}