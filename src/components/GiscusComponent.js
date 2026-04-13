/**
 * GiscusComponent.js
 *
 * GitHub Discussions 기반 댓글 시스템 컴포넌트
 *
 * [목적]
 * - 블로그 글 하단에 GitHub Discussions를 활용한 댓글 기능 제공
 * - 별도의 댓글 서버 없이 GitHub 저장소의 Discussions 기능으로 댓글 관리
 *
 * [특징]
 * - 다크/라이트 모드 자동 전환
 * - 한국어 인터페이스
 * - pathname 기반 매핑 (각 글마다 별도의 Discussion 생성)
 * - 지연 로딩(lazy)으로 성능 최적화
 *
 * [사용처]
 * - src/theme/DocItem/Layout/index.js에서 문서 하단에 렌더링
 *
 * [설정 방법]
 * 1. GitHub 저장소에서 Discussions 기능 활성화
 * 2. https://giscus.app/ 에서 설정 생성
 * 3. repo, repoId, category, categoryId 값을 업데이트
 */

import React from 'react';
import Giscus from '@giscus/react';              // Giscus React 컴포넌트
import { useColorMode } from '@docusaurus/theme-common';  // Docusaurus 테마 모드 훅

/**
 * Giscus 댓글 컴포넌트
 * @returns {JSX.Element} Giscus 댓글 위젯
 */
export default function GiscusComponent() {
  // 현재 테마 모드 가져오기 (dark 또는 light)
  const { colorMode } = useColorMode();

  return (
    // 댓글 영역 상단 여백 (본문과 구분)
    <div style={{ marginTop: '5rem' }}>
      <Giscus
        // GitHub 저장소 정보
        repo="Son-Hunseo/blog"           // 저장소: username/repo 형식
        repoId="R_kgDOP2AlTg"             // 저장소 ID (giscus.app에서 확인)

        // Discussions 카테고리 설정
        category="Q&A"                    // 사용할 Discussion 카테고리
        categoryId="DIC_kwDOP2AlTs4CwQsW" // 카테고리 ID (giscus.app에서 확인)

        // 매핑 설정
        mapping="pathname"                // URL pathname으로 Discussion 매핑
        strict="0"                        // 엄격 모드 비활성화 (유연한 매핑)

        // 기능 설정
        reactionsEnabled="0"              // 이모지 반응 비활성화
        emitMetadata="0"                  // 메타데이터 전송 비활성화
        inputPosition="bottom"            // 댓글 입력창 위치: 하단

        // 테마 및 언어
        theme={colorMode}                 // Docusaurus 테마와 동기화 (dark/light)
        lang="ko"                         // 한국어 인터페이스

        // 성능 최적화
        loading="lazy"                    // 스크롤 시 지연 로딩
      />
    </div>
  );
}
