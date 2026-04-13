/**
 * DocSidebar/index.js
 *
 * Docusaurus 사이드바 테마 오버라이드 (Swizzling)
 *
 * [목적]
 * - 사이드바의 각 카테고리 이름 옆에 하위 문서 총 개수 표시
 * - 모든 하위 카테고리의 문서까지 재귀적으로 카운트
 *
 * [Swizzling 방식]
 * - Wrap 방식: 원본 컴포넌트를 감싸서 props 수정
 * - sidebar 데이터를 가공하여 원본 컴포넌트에 전달
 *
 * [렌더링 결과]
 * 사이드바:
 * ├── Kubernetes (13)      <- 하위 문서 총 13개
 * │   ├── Install (1)      <- 하위 문서 1개
 * │   └── CKA (12)         <- 하위 문서 12개
 * ├── Docker (5)
 * └── ...
 *
 * [동작 방식]
 * 1. 원본 sidebar 데이터 받기
 * 2. addCountToItems 함수로 각 카테고리의 label에 개수 추가
 * 3. 수정된 sidebar 데이터를 원본 DocSidebar에 전달
 */

import React from 'react';
import DocSidebar from '@theme-original/DocSidebar';  // 원본 Docusaurus 사이드바

/**
 * 사이드바 아이템들의 문서 개수를 재귀적으로 카운트
 *
 * 카테고리의 모든 하위 항목을 순회하며 link 타입(실제 문서)의 개수를 합산
 *
 * @param {Array} items - 사이드바 아이템 배열
 * @returns {number} 모든 하위 문서(link 타입)의 총 개수
 *
 * @example
 * // Kubernetes 카테고리 구조:
 * // Kubernetes/
 * //   ├── Install/
 * //   │   └── guide.md (link)
 * //   └── CKA/
 * //       ├── overview.md (link)
 * //       └── ... (11개 더)
 * // 결과: 13 (1 + 12)
 */
const countItems = (items) => {
  let count = 0;
  items?.forEach(item => {
    if (item.type === 'category') {
      // 카테고리면 하위 아이템을 재귀적으로 탐색
      count += countItems(item.items);
    } else if (item.type === 'link') {
      // 링크(실제 문서)면 1개 추가
      count += 1;
    }
  });
  return count;
};

/**
 * 사이드바 아이템들에 문서 개수를 label에 추가
 *
 * 각 카테고리의 label을 "원본 (개수)" 형식으로 변환
 * 하위 카테고리도 재귀적으로 처리
 *
 * @param {Array} items - 원본 사이드바 아이템 배열
 * @returns {Array} label에 개수가 추가된 새 아이템 배열
 *
 * @example
 * // 입력: [{ type: 'category', label: 'Kubernetes', items: [...] }]
 * // 출력: [{ type: 'category', label: 'Kubernetes (13)', items: [...] }]
 */
const addCountToItems = (items) => {
  return items?.map(item => {
    if (item.type === 'category') {
      // 이 카테고리의 하위 문서 총 개수 계산
      const itemCount = countItems(item.items);

      return {
        ...item,
        // label에 개수 추가: "Kubernetes" -> "Kubernetes (13)"
        label: `${item.label} (${itemCount})`,
        // 하위 카테고리도 재귀적으로 처리
        items: addCountToItems(item.items)
      };
    }
    // link 타입은 그대로 반환
    return item;
  });
};

/**
 * 사이드바 래퍼 컴포넌트
 *
 * 원본 DocSidebar를 감싸서 sidebar 데이터에 개수 정보 추가
 *
 * @param {Object} props - 원본 DocSidebar에 전달될 props
 * @param {Array} props.sidebar - 사이드바 아이템 배열
 * @returns {JSX.Element} 수정된 sidebar가 적용된 원본 DocSidebar
 */
export default function DocSidebarWrapper(props) {
  // sidebar 데이터에 개수 정보 추가
  const modifiedProps = {
    ...props,
    sidebar: addCountToItems(props.sidebar)
  };

  // 수정된 props로 원본 DocSidebar 렌더링
  return <DocSidebar {...modifiedProps} />;
}
