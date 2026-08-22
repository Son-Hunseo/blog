/**
 * DocItem/Paginator/index.js
 *
 * Docusaurus 이전/다음 페이지네이터 테마 오버라이드 (Swizzling)
 *
 * [목적]
 * - 글 하단의 이전/다음 네비게이션에서 카테고리 목록 페이지(index.mdx)를 건너뛰기
 * - 기본 페이지네이션은 사이드바 순서를 그대로 따라가므로, 카테고리 index 페이지가
 *   이전/다음 대상으로 잡히는 문제가 있음 (프론트매터로는 "대상에서 제외"가 불가능)
 *
 * [Swizzling 방식]
 * - Eject 방식: 원본 DocItem/Paginator를 대체
 *   (원본은 metadata.previous/next를 그대로 사용하므로 Wrap으로는 목록을 바꿀 수 없음)
 * - 사이드바 트리를 직접 평탄화하여 index 페이지를 제외한 글 목록을 만들고,
 *   현재 글 위치 기준으로 이전/다음을 다시 계산
 *
 * [동작 방식]
 * 1. useDocsSidebar()로 현재 사이드바 트리를 가져옴
 * 2. 트리를 순회하며 type이 'link'인 항목만 수집 (카테고리 링크로 붙은 index.mdx는
 *    category 항목의 href로 존재하므로 자연히 제외됨)
 * 3. docId가 'index'이거나 '/index'로 끝나는 문서도 제외 (홈 랜딩 등)
 * 4. 현재 문서의 permalink로 위치를 찾아 이전/다음을 계산해 원본 DocPaginator에 전달
 * 5. 목록에서 현재 문서를 못 찾으면(= index 페이지) 페이지네이터를 렌더링하지 않음
 */

import React from 'react';
import {useDoc, useDocsSidebar} from '@docusaurus/plugin-content-docs/client';
import DocPaginator from '@theme/DocPaginator';

// 사이드바 트리에서 개별 글(link)만 순서대로 수집. index 페이지는 제외.
function flattenDocLinks(items, acc = []) {
  items?.forEach((item) => {
    if (item.type === 'category') {
      // 카테고리 자체의 링크(index.mdx)는 수집하지 않고 하위 항목만 순회
      flattenDocLinks(item.items, acc);
    } else if (item.type === 'link') {
      const docId = item.docId ?? '';
      if (docId === 'index' || docId.endsWith('/index')) {
        return;
      }
      acc.push({title: item.label, permalink: item.href});
    }
  });
  return acc;
}

export default function DocItemPaginator() {
  const {metadata} = useDoc();
  const sidebar = useDocsSidebar();

  // 사이드바가 없는 문서는 페이지네이션 대상이 아님
  if (!sidebar) {
    return null;
  }

  const docLinks = flattenDocLinks(sidebar.items);
  const currentIndex = docLinks.findIndex(
    (item) => item.permalink === metadata.permalink,
  );

  // 목록에 없는 페이지(카테고리 index 등)는 페이지네이터 표시 안 함
  if (currentIndex === -1) {
    return null;
  }

  // 프론트매터에서 pagination_prev/next: null로 명시한 경우 존중
  const previous =
    metadata.frontMatter.pagination_prev === null
      ? undefined
      : docLinks[currentIndex - 1];
  const next =
    metadata.frontMatter.pagination_next === null
      ? undefined
      : docLinks[currentIndex + 1];

  return (
    <DocPaginator
      className="docusaurus-mt-lg"
      previous={previous}
      next={next}
    />
  );
}
