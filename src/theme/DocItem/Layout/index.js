/**
 * DocItem/Layout/index.js
 *
 * Docusaurus 문서 레이아웃 테마 오버라이드 (Swizzling)
 *
 * [목적]
 * - 모든 문서 페이지 하단에 Giscus 댓글 컴포넌트 자동 추가
 * - 기존 레이아웃 기능은 그대로 유지하면서 댓글 기능만 확장
 *
 * [Swizzling 방식]
 * - Wrap 방식: 원본 컴포넌트를 감싸서 기능 추가
 * - 원본 Layout 컴포넌트를 그대로 렌더링하고, 그 아래에 댓글 추가
 *
 * [동작 방식]
 * 1. @theme-original/DocItem/Layout에서 원본 Layout 컴포넌트 import
 * 2. 원본 Layout을 렌더링하여 문서 본문 표시
 * 3. Layout 아래에 GiscusComponent 추가하여 댓글 표시
 *
 * [관련 파일]
 * - src/components/GiscusComponent.js: 실제 댓글 위젯 컴포넌트
 */

import React from 'react';
import Layout from '@theme-original/DocItem/Layout';        // 원본 Docusaurus 문서 레이아웃
import GiscusComponent from '@site/src/components/GiscusComponent';  // 커스텀 댓글 컴포넌트

/**
 * 문서 레이아웃 래퍼 컴포넌트
 *
 * 원본 Layout 컴포넌트를 감싸서 모든 문서 하단에 댓글 추가
 *
 * @param {Object} props - 원본 Layout에 전달될 props
 * @returns {JSX.Element} 원본 레이아웃 + 댓글 컴포넌트
 */
export default function LayoutWrapper(props) {
  return (
    <>
      {/* 원본 Docusaurus 문서 레이아웃 (본문, TOC 등) */}
      <Layout {...props} />

      {/* 문서 하단에 GitHub Discussions 댓글 추가 */}
      <GiscusComponent />
    </>
  );
}
