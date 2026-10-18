/**
 * DocSidebar/Desktop/index.js
 *
 * Docusaurus PC 사이드바 테마 오버라이드 (Swizzling - Eject)
 *
 * [목적]
 * - 사이드바 접기 버튼(docs.sidebar.hideable)을 하단에서 카테고리 목록 맨 위로 이동
 * - 원본은 버튼이 사이드바 맨 아래에 있어 찾기 어려움
 *
 * [Swizzling 방식]
 * - Eject 방식: 원본(@docusaurus/theme-classic)을 복사한 뒤 렌더링 순서만 변경
 * - styles.module.css는 원본 그대로 복사
 */

import React from 'react';
import clsx from 'clsx';
import {useThemeConfig} from '@docusaurus/theme-common';
import Logo from '@theme/Logo';
import CollapseButton from '@theme/DocSidebar/Desktop/CollapseButton';
import Content from '@theme/DocSidebar/Desktop/Content';
import styles from './styles.module.css';

function DocSidebarDesktop({path, sidebar, onCollapse, isHidden}) {
  const {
    navbar: {hideOnScroll},
    docs: {
      sidebar: {hideable},
    },
  } = useThemeConfig();
  return (
    <div
      className={clsx(
        styles.sidebar,
        hideOnScroll && styles.sidebarWithHideableNavbar,
        isHidden && styles.sidebarHidden,
      )}>
      {hideOnScroll && <Logo tabIndex={-1} className={styles.sidebarLogo} />}
      {/* 원본은 Content 아래에 있던 접기 버튼을 위로 이동 */}
      {hideable && <CollapseButton onClick={onCollapse} />}
      <Content path={path} sidebar={sidebar} />
    </div>
  );
}

export default React.memo(DocSidebarDesktop);
