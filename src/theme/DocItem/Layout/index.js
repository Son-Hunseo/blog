import React from 'react';
import Layout from '@theme-original/DocItem/Layout';
import GiscusComponent from '@site/src/components/GiscusComponent';
import Head from '@docusaurus/Head';

export default function LayoutWrapper(props) {
  return (
    <>
      <Layout {...props} />
      <GiscusComponent />
    </>
  );
}

// for SEO
export default function LayoutWrapper(props) {
  const {content} = props;
  const {metadata} = content;
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: metadata.title,
    description: metadata.description,
    datePublished: metadata.editUrl?.lastUpdated,
  };

  return (
    <>
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Head>
      <Layout {...props} />
    </>
  );
}
