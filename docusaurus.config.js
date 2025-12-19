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

  /*
  mermaid 문법 지원 설정
  */
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  // Set the production url of your site here
  //SEO에 도움 됨
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
  i18n: {
    /*
    번역같은거 지원하는 옵션
    일단 다른 언어 번역본을 내가 넣어둔게 아니라 (기술 docs 등에서는 이런걸로 여러 언어 지원하나 봄)
    한국어인 ko만 설정해둠
    내용이 한국어이고 한국사람에게 노출되기 위해서는 ko로 설정하는게 나음
    */
    defaultLocale: 'ko', // 기본 언어
    locales: ['ko'], // 지원하는 언어
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
          
          
          remarkPlugins: [require('remark-math')], // latex 문법 추가 설정
          rehypePlugins: [require('rehype-katex')], // latex 문법 추가 설정


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

        /*
        Google Analytics
        */
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

      // docusaurus 사이트 소유주 인증 과정
      // metadata: [
      //   {name: 'algolia-site-verification', content: 'E4E0793C52EF1DEC'},
      // ],

      // 검색 기능 algolia - github 소셜 로그인으로 가입함
      algolia: {
        appId: 'CY65KO6RH6',
        apiKey: '350cd5efedaa3c8e59890af4244fdbe7',
        indexName: 'my_blog_crawler_pages',
        contextualSearch: false, // 언어 필터 끄기
      },

      // Replace with your project's social card
      image: 'img/default-image.jpg',
      navbar: {
        title: 'Son\'s Blog', // 메뉴 바의 웹사이트 메인 제목
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.png', // 안보이게 하려고 비워 둠 (없는 이미지임)
        },
        items: [
        {
          to: '/',
          position: 'left',
          label: 'Blog',
        },
          /* 
          nav바 필요없어서 없앰
          */
          // {
          //   type: 'docSidebar',
          //   sidebarId: 'tutorialSidebar',
          //   position: 'left',
          //   label: 'Blog',
          // },

          /*
          블로그 타입 필요없어서 없앰
          */
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

          /*
          커뮤니티 필요없어서 없앰
          */
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
              /*
              포폴 임시로 숨겨둔 상태
              */
              // {
              //   label: 'Portfolio',
              //   to: 'https://pf.sonhs.com',
              // },
              {
                label: 'GitHub',
                href: 'https://github.com/Son-Hunseo',
              },
            ],
          },
        ],

        /*
        저작권 표시 필요 없어서 없애놓음
        */
        // copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      },
      colorMode: {
        defaultMode: 'dark', // 기본으로 다크모드를 디폴트로 설정
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        
        /*
        코드블럭에서 지원할 언어 리스트 (추가 가능)
        */
        additionalLanguages: ['java', 'bash', 'markup', 'sql'],
      },
    }),
  
  // plugins 섹션 추가
  plugins: [
    './plugins/random-posts-plugin.js',
  ],
};

export default config;
