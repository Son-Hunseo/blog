/**
 * DocCard/index.js
 *
 * Docusaurus 문서 카드 테마 오버라이드 (Swizzling)
 *
 * [목적]
 * - 카테고리 카드에 하위 항목의 총 개수를 정확하게 표시
 * - 기본 Docusaurus는 직계 자식만 카운트하지만, 이 버전은 모든 하위 문서를 재귀적으로 카운트
 *
 * [Swizzling 방식]
 * - Eject 방식: 원본 컴포넌트를 완전히 교체
 *
 * [기본 vs 커스텀 비교]
 * - 기본: Kubernetes 카테고리 내 Install, CKA 서브카테고리가 있으면 "2 items"로 표시
 * - 커스텀: Install에 1개, CKA에 12개 문서가 있으면 "13 items"로 표시
 *
 * [렌더링 결과]
 * ┌─────────────────────────┐
 * │ Kubernetes              │
 * │ 13 items                │  <- 모든 하위 문서 총합
 * └─────────────────────────┘
 */

import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {
  useDocById,
  findFirstSidebarItemLink,
} from '@docusaurus/plugin-content-docs/client';
import {usePluralForm} from '@docusaurus/theme-common';
import isInternalUrl from '@docusaurus/isInternalUrl';
import {translate} from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

/**
 * 카테고리 내 모든 문서를 재귀적으로 카운트
 *
 * 하위 카테고리가 있으면 그 안의 문서도 모두 포함하여 총 개수 계산
 *
 * @param {Array} items - 사이드바 아이템 배열
 * @returns {number} 모든 하위 문서(link 타입)의 총 개수
 *
 * @example
 * // items 구조 예시:
 * // [
 * //   { type: 'category', items: [{ type: 'link' }, { type: 'link' }] },
 * //   { type: 'link' }
 * // ]
 * // 결과: 3
 */
const countItemsRecursive = (items) => {
  let count = 0;
  items?.forEach((item) => {
    if (item.type === 'category') {
      // 카테고리면 하위 아이템을 재귀적으로 탐색
      count += countItemsRecursive(item.items);
    } else if (item.type === 'link') {
      // 링크(실제 문서)면 1개 추가
      count += 1;
    }
  });
  return count;
};

/**
 * 아이템 개수 복수형 텍스트 생성 훅
 *
 * i18n을 지원하며, 개수에 따라 "1 item" 또는 "N items" 형식 반환
 *
 * @returns {Function} 개수를 받아 복수형 텍스트를 반환하는 함수
 */
function useCategoryItemsPlural() {
  const {selectMessage} = usePluralForm();
  return (count) =>
    selectMessage(
      count,
      translate(
        {
          message: '1 item|{count} items',
          id: 'theme.docs.DocCard.categoryDescription.plurals',
          description: 'Description for category card',
        },
        {count},
      ),
    );
}

/**
 * 카드 컨테이너 컴포넌트
 *
 * 카드의 외부 링크 래퍼, 클릭 시 해당 페이지로 이동
 *
 * @param {Object} props
 * @param {string} props.className - 추가 CSS 클래스
 * @param {string} props.href - 이동할 URL
 * @param {React.ReactNode} props.children - 카드 내용
 */
function CardContainer({className, href, children}) {
  return (
    <Link
      href={href}
      className={clsx('card padding--lg', styles.cardContainer, className)}>
      {children}
    </Link>
  );
}

/**
 * 카드 레이아웃 컴포넌트
 *
 * 카드의 내부 구조 (아이콘, 제목, 설명) 정의
 *
 * @param {Object} props
 * @param {string} props.className - 추가 CSS 클래스
 * @param {string} props.href - 이동할 URL
 * @param {string} props.icon - 아이콘 (현재 미사용으로 빈 문자열)
 * @param {string} props.title - 카드 제목
 * @param {string} props.description - 카드 설명 (아이템 개수 등)
 */
function CardLayout({className, href, icon, title, description}) {
  return (
    <CardContainer href={href} className={className}>
      {/* 카드 제목 */}
      <Heading
        as="h2"
        className={clsx('text--truncate', styles.cardTitle)}
        title={title}>
        {icon} {title}
      </Heading>

      {/* 카드 설명 (있을 경우에만 표시) */}
      {description && (
        <p
          className={clsx('text--truncate', styles.cardDescription)}
          title={description}>
          {description}
        </p>
      )}
    </CardContainer>
  );
}

/**
 * 카테고리 카드 컴포넌트
 *
 * 카테고리 타입 아이템을 카드로 렌더링
 * 하위 문서 총 개수를 재귀적으로 계산하여 표시
 *
 * @param {Object} props
 * @param {Object} props.item - 사이드바 카테고리 아이템
 */
function CardCategory({item}) {
  // 카테고리의 첫 번째 문서 링크 찾기 (카드 클릭 시 이동할 URL)
  const href = findFirstSidebarItemLink(item);
  const categoryItemsPlural = useCategoryItemsPlural();

  // 링크를 찾을 수 없으면 카드 렌더링 안 함
  if (!href) {
    return null;
  }

  // [커스텀] 기본 item.items.length 대신 재귀 카운트 사용
  // 모든 하위 카테고리의 문서까지 포함한 총 개수
  const totalItems = countItemsRecursive(item.items);

  return (
    <CardLayout
      className={item.className}
      href={href}
      icon=""  // 아이콘 제거 (깔끔한 UI)
      title={item.label}
      // description이 있으면 사용, 없으면 "N items" 형식 표시
      description={item.description ?? categoryItemsPlural(totalItems)}
    />
  );
}

/**
 * 링크 카드 컴포넌트
 *
 * 링크(문서) 타입 아이템을 카드로 렌더링
 *
 * @param {Object} props
 * @param {Object} props.item - 사이드바 링크 아이템
 */
function CardLink({item}) {
  const icon = "";  // 아이콘 제거
  // docId가 있으면 해당 문서의 메타데이터 가져오기
  const doc = useDocById(item.docId ?? undefined);
  return (
    <CardLayout
      className={item.className}
      href={item.href}
      icon={icon}
      title={item.label}
      // description이 있으면 사용, 없으면 문서의 description 사용
      description={item.description ?? doc?.description}
    />
  );
}

/**
 * 문서 카드 메인 컴포넌트
 *
 * 아이템 타입에 따라 적절한 카드 컴포넌트 렌더링
 *
 * @param {Object} props
 * @param {Object} props.item - 사이드바 아이템 (link 또는 category 타입)
 * @returns {JSX.Element} 타입에 맞는 카드 컴포넌트
 * @throws {Error} 알 수 없는 아이템 타입일 경우
 */
export default function DocCard({item}) {
  switch (item.type) {
    case 'link':
      return <CardLink item={item} />;
    case 'category':
      return <CardCategory item={item} />;
    default:
      throw new Error(`unknown item type ${JSON.stringify(item)}`);
  }
}
