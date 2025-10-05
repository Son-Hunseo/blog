import React from 'react';
import Giscus from '@giscus/react';
import { useColorMode } from '@docusaurus/theme-common';

export default function GiscusComponent() {
  const { colorMode } = useColorMode();

  return (
    <Giscus
      repo="Son-Hunseo/blog"
      repoId="R_kgDOP2AlTg"
      category="Q&A"
      categoryId="DIC_kwDOP2AlTs4CwQsW"
      mapping="pathname"
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="bottom"
      theme={colorMode}
      lang="ko"
      loading="lazy"
    />
  );
}