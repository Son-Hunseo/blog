/**
 * SimpleDocList.js
 *
 * 단순 문서 목록 컴포넌트
 *
 * [목적]
 * - 카테고리의 문서들을 간단한 리스트 형태로 표시
 * - 기본 Docusaurus의 DocCardList보다 심플한 UI 제공
 * - 글이 많아졌을 때 카드 형태보다 깔끔하게 표시
 *
 * [렌더링 예시]
 * • 글1
 * • 글2
 * • 글3
 * ...
 *
 * [동작 방식]
 * 1. Docusaurus의 useCurrentSidebarCategory 훅으로 현재 카테고리 정보 가져오기
 * 2. 카테고리의 items(하위 문서들)를 순회
 * 3. 각 문서를 클릭 가능한 링크 리스트로 렌더링
 *
 * [사용처]
 * - 카테고리 index.mdx 파일에서 <SimpleDocList /> 로 사용
 * - CategoryPosts 대신 더 간단한 목록이 필요할 때 사용
 *
 * [비교]
 * - DocCardList: 기본 Docusaurus 컴포넌트, 카드 형태
 * - CategoryPosts: 커스텀, 카드 그리드 + 메타정보 표시
 * - SimpleDocList: 커스텀, 단순 리스트 형태
 */

import React from 'react';
import {useCurrentSidebarCategory} from '@docusaurus/theme-common'; // 현재 사이드바 카테고리 훅
import Link from '@docusaurus/Link';                                // Docusaurus 내부 링크 컴포넌트
import styles from './SimpleDocList.module.css';                    // 컴포넌트 전용 스타일

/**
 * 단순 문서 목록 컴포넌트
 *
 * 현재 카테고리의 하위 문서들을 심플한 불릿 리스트로 표시
 *
 * @returns {JSX.Element|null} 문서 링크 리스트 또는 null (카테고리가 없을 경우)
 */
export default function SimpleDocList() {
  // Docusaurus 사이드바에서 현재 카테고리 정보 가져오기
  // category.items: 하위 문서/카테고리 배열
  // 각 item: { type, label, href, ... }
  const category = useCurrentSidebarCategory();

  // 카테고리 정보가 없으면 렌더링하지 않음
  if (!category) {
    return null;
  }

  return (
    // 문서 목록 ul 요소
    <ul className={styles.list}>
      {/* 카테고리의 각 아이템(문서)을 순회하며 리스트 아이템 생성 */}
      {category.items.map((item, index) => (
        <li key={index} className={styles.listItem}>
          {/* 문서로 이동하는 링크 */}
          <Link to={item.href} className={styles.link}>
            {item.label}  {/* 문서 제목 */}
          </Link>
        </li>
      ))}
    </ul>
  );
}
