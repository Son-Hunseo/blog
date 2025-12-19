const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

module.exports = function (context, options) {
  return {
    name: 'gather-meta-plugin',
    async contentLoaded({content, actions}) {
      const {setGlobalData} = actions;
      
      const docsDir = path.join(context.siteDir, 'docs');
      
      function removeNumberPrefix(str) {
        return str.replace(/^\d+-/, '');
      }
      
      function getAllMdFiles(dir, fileList = []) {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            getAllMdFiles(filePath, fileList);
          } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
            fileList.push(filePath);
          }
        });
        
        return fileList;
      }
      
      function getFolderSlug(folderPath) {
        const indexPath = path.join(folderPath, 'index.mdx');
        const indexMdPath = path.join(folderPath, 'index.md');
        
        let targetPath = null;
        if (fs.existsSync(indexPath)) {
          targetPath = indexPath;
        } else if (fs.existsSync(indexMdPath)) {
          targetPath = indexMdPath;
        }
        
        if (targetPath) {
          const content = fs.readFileSync(targetPath, 'utf-8');
          const {data} = matter(content);
          return data.slug || null;
        }
        
        return null;
      }
      
      function getCategoryName(folderPath) {
        const indexPath = path.join(folderPath, 'index.mdx');
        const indexMdPath = path.join(folderPath, 'index.md');
        
        let targetPath = null;
        if (fs.existsSync(indexPath)) {
          targetPath = indexPath;
        } else if (fs.existsSync(indexMdPath)) {
          targetPath = indexMdPath;
        }
        
        if (targetPath) {
          const content = fs.readFileSync(targetPath, 'utf-8');
          const {data} = matter(content);
          return data.title || null;
        }
        
        return null;
      }
      
      const mdFiles = getAllMdFiles(docsDir);
      const posts = [];
      const postsByPath = {}; // 전체 경로별로 글을 저장할 객체
      
      mdFiles.forEach(filePath => {
        const fileName = path.basename(filePath, path.extname(filePath));
        
        if (fileName === 'index' || fileName === '_category_') {
          return;
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const {data: frontMatter, content: contentText} = matter(fileContent);
        
        if (frontMatter.slug === '/') {
          return;
        }
        
        const fileDir = path.dirname(filePath);
        const relativePath = path.relative(docsDir, filePath);
        const pathParts = relativePath.split(path.sep);
        
        let urlPath = '';
        const fileDirParts = pathParts.slice(0, -1);
        
        // URL 경로 구성
        if (fileDirParts.length > 0) {
          const folderSlugs = [];
          for (let i = 0; i < fileDirParts.length; i++) {
            const folderPath = path.join(docsDir, ...pathParts.slice(0, i + 1));
            const folderSlug = getFolderSlug(folderPath);
            if (folderSlug) {
              const cleanSlug = folderSlug.replace(/^\//, '').split('/').pop();
              folderSlugs.push(cleanSlug);
            } else {
              folderSlugs.push(removeNumberPrefix(fileDirParts[i]));
            }
          }
          urlPath = folderSlugs.join('/');
          if (frontMatter.slug) {
            const docSlug = frontMatter.slug.startsWith('/') ? frontMatter.slug.substring(1) : frontMatter.slug;
            urlPath = `${urlPath}/${docSlug}`;
          } else {
            urlPath = `${urlPath}/${removeNumberPrefix(fileName)}`;
          }
        } else {
          if (frontMatter.slug) {
            urlPath = frontMatter.slug.replace(/^\//, '');
          } else {
            urlPath = removeNumberPrefix(fileName);
          }
        }
        
        // 카테고리 경로 - 파일이 속한 폴더의 전체 경로
        let categoryPath = '';
        if (fileDirParts.length > 0) {
          const folderSlugs = [];
          for (let i = 0; i < fileDirParts.length; i++) {
            const folderPath = path.join(docsDir, ...pathParts.slice(0, i + 1));
            const folderSlug = getFolderSlug(folderPath);
            if (folderSlug) {
              const cleanSlug = folderSlug.replace(/^\//, '');
              folderSlugs.push(cleanSlug);
            } else {
              folderSlugs.push(removeNumberPrefix(fileDirParts[i]));
            }
          }
          categoryPath = folderSlugs.join('/');
        }
        
        let categoryName = 'Etc';
        if (fileDirParts.length > 0) {
          const categoryParts = [];
          for (let i = 0; i < fileDirParts.length; i++) {
            const folderPath = path.join(docsDir, ...pathParts.slice(0, i + 1));
            const folderTitle = getCategoryName(folderPath);
            if (folderTitle) {
              categoryParts.push(folderTitle);
            } else {
              categoryParts.push(removeNumberPrefix(fileDirParts[i]));
            }
          }
          categoryName = categoryParts.join(' / ');
        }

        const description = contentText
          .split('\n')
          .find(line => line.trim() && !line.startsWith('#') && !line.startsWith('import') && !line.startsWith('!'))
          ?.substring(0, 150) || '';
        
        const postData = {
          title: frontMatter.title || 'Untitled',
          description: frontMatter.description || description,
          link: `/${urlPath}`,
          category: categoryName,
          categoryPath: categoryPath, // 전체 경로
          tags: frontMatter.tags || [],
          keywords: frontMatter.keywords || [],
          image: frontMatter.image || null, 
        };
        
        posts.push(postData);
        
        // 전체 경로별로 글 그룹화
        if (!postsByPath[categoryPath]) {
          postsByPath[categoryPath] = [];
        }
        postsByPath[categoryPath].push(postData);
      });
      
      setGlobalData({
        recentPosts: posts,
        postsByPath: postsByPath // 전체 경로별 글 데이터
      });
    },
  };
};