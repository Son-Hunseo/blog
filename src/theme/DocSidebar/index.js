/*
사이드바에 해당 카태고리 내 몇 개의 글이 있는지 나타내기 위한 코드
예: Kubernetes(13) - Kubernetes 카테고리 내(최하위 까지 포함) 글 13개란 뜻임
*/

import React from 'react';
import DocSidebar from '@theme-original/DocSidebar';

/*
하위 항목 개수 계산 함수
*/
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

/*
하위 항목 갯수를 본인의 1차 자식 갯수만큼만 세지말고 재귀적으로 최하위까지 세는 함수
예: Kubernetes 하위에 Install 서브 카테고리에 글 1개 CKA 서브 카테고리에 글 12개 있을 경우에
Install(1), CKA(12) 해서 Kubernetes(13)이 된다.
*/
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

/*
위에서 만든 최하위까지 재귀적으로 글 수 세는 함수를 통해서 직접 사이드바에 숫자를 붙이는 함수
예: Kubernetes -> Kubernetes(13)
*/
export default function DocSidebarWrapper(props) {
  const modifiedProps = {
    ...props,
    sidebar: addCountToItems(props.sidebar)
  };
  
  return <DocSidebar {...modifiedProps} />;
}