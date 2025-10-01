// src/theme/DocSidebar/index.js
import React from 'react';
import DocSidebar from '@theme-original/DocSidebar';

// 하위 항목 개수 계산 함수
const countItems = (items) => {
  let count = 0;
  items?.forEach(item => {
    if (item.type === 'category') {
      count += countItems(item.items);
    } else if (item.type === 'link') {
      count += 1;
    }
  });
  return count;
};

// 사이드바 아이템 재귀적으로 수정
const addCountToItems = (items) => {
  return items?.map(item => {
    if (item.type === 'category') {
      const itemCount = countItems(item.items);
      return {
        ...item,
        label: `${item.label} (${itemCount})`,
        items: addCountToItems(item.items)
      };
    }
    return item;
  });
};

export default function DocSidebarWrapper(props) {
  // sidebar 데이터 수정
  const modifiedProps = {
    ...props,
    sidebar: addCountToItems(props.sidebar)
  };
  
  return <DocSidebar {...modifiedProps} />;
}