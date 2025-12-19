/*
Giscus라는 깃헙 디스커스를 댓글로 이용하는 오픈소스를 사용하여
글 하단에 댓글을 추가하는 컴포넌트
*/

import React from 'react';
import Giscus from '@giscus/react';
import { useColorMode } from '@docusaurus/theme-common';

export default function GiscusComponent() {
  const { colorMode } = useColorMode();

  return (
    <div style={{ marginTop: '5rem' }}>
      <Giscus
        repo="Son-Hunseo/blog"
        repoId="R_kgDOP2AlTg"
        category="Q&A"
        categoryId="DIC_kwDOP2AlTs4CwQsW"
        mapping="pathname"
        strict="0"
        reactionsEnabled="0" // 반응 비활성화
        emitMetadata="0"
        inputPosition="bottom"
        theme={colorMode}
        lang="ko"
        loading="lazy"
        />
    </div>  
  );
}