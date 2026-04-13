/**
 * DocItem/Content/index.js
 *
 * Docusaurus 문서 콘텐츠 테마 오버라이드 (Swizzling)
 *
 * [목적]
 * - 문서 제목(h1) 바로 아래에 작성일(date) 표시
 * - 프론트매터의 date 필드를 읽어서 사람이 읽기 쉬운 형식으로 변환
 *
 * [Swizzling 방식]
 * - Eject 방식: 원본 컴포넌트를 완전히 교체
 * - 원본 DocItemContent 로직을 복사 후 날짜 표시 기능 추가
 *
 * [동작 방식]
 * 1. useDoc 훅으로 현재 문서의 메타데이터 가져오기
 * 2. frontMatter에서 date 필드 추출
 * 3. 제목 렌더링 후 날짜 표시 div 추가
 * 4. MDXContent로 본문 렌더링
 *
 * [프론트매터 예시]
 * ---
 * title: 문서 제목
 * date: 2024-01-15
 * ---
 *
 * [렌더링 결과]
 * # 문서 제목
 * January 15, 2024
 * (본문 내용...)
 */

import React from 'react';
import clsx from 'clsx';                                    // 조건부 클래스 결합 유틸
import {ThemeClassNames} from '@docusaurus/theme-common';   // Docusaurus 테마 클래스
import {useDoc} from '@docusaurus/plugin-content-docs/client';  // 현재 문서 정보 훅
import Heading from '@theme/Heading';                       // Docusaurus 헤딩 컴포넌트
import MDXContent from '@theme/MDXContent';                 // MDX 콘텐츠 렌더러
import styles from './styles.module.css';                   // 컴포넌트 전용 스타일

/**
 * 날짜 문자열을 사람이 읽기 쉬운 형식으로 변환
 * @param {string} dateString - ISO 형식 날짜 문자열 (예: '2024-01-15')
 * @returns {string|null} 포맷된 날짜 (예: 'January 15, 2024') 또는 null
 */
function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * 합성 제목(Synthetic Title) 훅
 *
 * Docusaurus에서 제목을 표시할지 결정하는 로직:
 * - hide_title이 true면 제목 숨김
 * - contentTitle이 있으면 (마크다운에 # 제목이 있으면) 중복 방지로 숨김
 * - 둘 다 아니면 metadata.title을 제목으로 사용
 *
 * @returns {string|null} 표시할 제목 또는 null
 */
function useSyntheticTitle() {
  const {metadata, frontMatter, contentTitle} = useDoc();

  // hide_title이 아니고, 마크다운에 # 제목이 없을 때만 제목 표시
  const shouldRender =
    !frontMatter.hide_title && typeof contentTitle === 'undefined';

  if (!shouldRender) {
    return null;
  }
  return metadata.title;
}

/**
 * 문서 콘텐츠 컴포넌트
 *
 * 문서의 제목, 날짜, 본문을 순서대로 렌더링
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - MDX로 파싱된 문서 본문
 * @returns {JSX.Element} 문서 콘텐츠 영역
 */
export default function DocItemContent({children}) {
  // 합성 제목 (프론트매터 title 사용 여부)
  const syntheticTitle = useSyntheticTitle();

  // 현재 문서의 메타데이터에서 프론트매터 추출
  const {metadata} = useDoc();
  const {frontMatter} = metadata;

  // 프론트매터의 date 필드를 포맷팅
  const formattedDate = formatDate(frontMatter.date);

  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown')}>
      {/* 제목 영역: hide_title이 아니고 마크다운에 #제목이 없을 때만 표시 */}
      {syntheticTitle && (
        <header>
          <Heading as="h1">{syntheticTitle}</Heading>
        </header>
      )}

      {/* 작성일 표시: 프론트매터에 date가 있을 때만 표시 */}
      {formattedDate && (
        <div className={styles.docDate}>
          {formattedDate}
        </div>
      )}

      {/* 문서 본문 (MDX 콘텐츠) */}
      <MDXContent>{children}</MDXContent>
    </div>
  );
}
