// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  // 탭에 뜨는 부분들
  title: 'Son\'s Blog',
  tagline: '개발, 인프라(클라우드, 플랫폼), 홈랩(홈서버) 등의 주제로 글을 작성하는 블로그입니다.',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  // 검색 최적화 등에 사용
  url: 'https://blog.sonhs.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.

  // 여기는 GitHub Pages 사용할 경우만 사용
  // organizationName: 'facebook', // Usually your GitHub org/user name.
  // projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  // 번역 파일 따로 안넣어서 영어로 작성한 것도 어색하게 한국어로 번역될까봐 수정 안함
  i18n: {
    defaultLocale: 'en', // 기본 언어
    locales: ['en'], // 지원하는 언어
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/', // 랜딩 페이지 없이 docs 페이지만 놔두기 위함
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          remarkPlugins: [require('remark-math')], // latex 문법 추가
          rehypePlugins: [require('rehype-katex')], // latex 문법 추가
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        // Google Analytics
        gtag: {
          trackingID: 'G-Q9GGC935DY', // 여기에 측정 ID 입력
          anonymizeIP: true, // IP 익명화 (선택사항)
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Son Hunseo', // 메뉴 바의 웹사이트 메인 제목
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.png', // 필요없을 것 같아서 비워 둠
        },
        items: [
          // doc 타입의 메뉴
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Blog',
          },
          // 블로그 타입 필요없어서 없앰
          // {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/Son-Hunseo', // 깃허브 링크
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Blog',
                to: '/', // 여기에 경로 입력
              },
            ],
          },
          // 커뮤니티 없어서 없앰
          // {
          //   title: 'Community',
          //   items: [
          //     {
          //       label: 'Stack Overflow',
          //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
          //     },
          //     {
          //       label: 'Discord',
          //       href: 'https://discordapp.com/invite/docusaurus',
          //     },
          //     {
          //       label: 'X',
          //       href: 'https://x.com/docusaurus',
          //     },
          //   ],
          // },
          {
            title: 'More',
            items: [
              {
                label: 'Portfolio',
                to: 'https://pf.sonhs.com',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/Son-Hunseo',
              },
            ],
          },
        ],
        // copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['java', 'bash'],
      },
    }),
};

export default config;
