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

// --- 추가된 재귀 카운트 함수 ---
const countItemsRecursive = (items) => {
  let count = 0;
  items?.forEach((item) => {
    if (item.type === 'category') {
      count += countItemsRecursive(item.items); // 카테고리면 안으로 더 들어감
    } else if (item.type === 'link') {
      count += 1; // 링크면 1개 추가
    }
  });
  return count;
};

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
function CardContainer({className, href, children}) {
  return (
    <Link
      href={href}
      className={clsx('card padding--lg', styles.cardContainer, className)}>
      {children}
    </Link>
  );
}
function CardLayout({className, href, icon, title, description}) {
  return (
    <CardContainer href={href} className={className}>
      <Heading
        as="h2"
        className={clsx('text--truncate', styles.cardTitle)}
        title={title}>
        {icon} {title}
      </Heading>
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
function CardCategory({item}) {
  const href = findFirstSidebarItemLink(item);
  const categoryItemsPlural = useCategoryItemsPlural();
  
  if (!href) {
    return null;
  }

  // 변경된 부분: item.items.length 대신 countItemsRecursive(item.items) 사용
  const totalItems = countItemsRecursive(item.items);

  return (
    <CardLayout
      className={item.className}
      href={href}
      icon=""
      title={item.label}
      description={item.description ?? categoryItemsPlural(totalItems)}
    />
  );
}
function CardLink({item}) {
  const icon = "";
  const doc = useDocById(item.docId ?? undefined);
  return (
    <CardLayout
      className={item.className}
      href={item.href}
      icon={icon}
      title={item.label}
      description={item.description ?? doc?.description}
    />
  );
}
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
