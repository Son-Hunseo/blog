const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

module.exports = function (context, options) {
  return {
    name: 'random-posts-plugin',
    async contentLoaded({content, actions}) {
      const {setGlobalData} = actions;
      
      const docsDir = path.join(context.siteDir, 'docs');
      
      // 숫자 프리픽스 제거 함수 (Docusaurus 규칙)
      function removeNumberPrefix(str) {
        return str.replace(/^\d+-/, '');
      }
      
      // 모든 문서 파일 재귀적으로 찾기
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
      
      // 폴더의 slug를 찾는 함수
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
      
      // 카테고리 이름을 얻는 함수 (index.mdx의 title 사용)
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
      
      // 마크다운에서 첫 번째 이미지 찾기
      function findFirstImage(content, filePath) {
        const imageRegex = /!\[.*?\]\((.*?)\)/;
        const match = content.match(imageRegex);
        
        if (!match) return null;
        
        let imagePath = match[1];
        
        if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
          return imagePath;
        }
        
        if (imagePath.startsWith('./') || imagePath.startsWith('../')) {
          const fileDir = path.dirname(filePath);
          const imageName = path.basename(imagePath);
          const docPath = path.relative(docsDir, fileDir);
          const pathParts = docPath.split(path.sep).map(p => removeNumberPrefix(p));
          
          return `/img/${pathParts.join('/')}/${imageName}`;
        }
        
        return imagePath;
      }
      
      const mdFiles = getAllMdFiles(docsDir);
      const posts = [];
      
      mdFiles.forEach(filePath => {
        const fileName = path.basename(filePath, path.extname(filePath));
        
        if (fileName === 'index' || fileName === '_category_') {
          return;
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const {data: frontMatter, content: contentText} = matter(fileContent);
        
        if (frontMatter.slug === '/' || frontMatter.sidebar_class_name === 'hidden-sidebar-item') {
          return;
        }
        
        const fileDir = path.dirname(filePath);
        const relativePath = path.relative(docsDir, filePath);
        const pathParts = relativePath.split(path.sep);
        
        let urlPath = '';
        const fileDirParts = pathParts.slice(0, -1);
        
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
        
        const firstImage = findFirstImage(contentText, filePath);
        
        const stats = fs.statSync(filePath);
        let postDate;
        
        if (frontMatter.date) {
          postDate = new Date(frontMatter.date);
        } else {
          postDate = stats.mtime;
        }
        
        posts.push({
          title: frontMatter.title || 'Untitled',
          description: frontMatter.description || description,
          link: `/${urlPath}`,
          category: categoryName,
          date: postDate,
          tags: frontMatter.tags || [],
          image: frontMatter.image || firstImage || null,
        });
      });
      
      posts.sort((a, b) => b.date - a.date);
      
      posts.forEach(post => {
        const now = new Date();
        const diffTime = Math.abs(now - new Date(post.date));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          post.dateText = '오늘';
        } else if (diffDays === 1) {
          post.dateText = '어제';
        } else if (diffDays < 30) {
          post.dateText = `${diffDays}일 전`;
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30);
          post.dateText = `${months}개월 전`;
        } else {
          const years = Math.floor(diffDays / 365);
          post.dateText = `${years}년 전`;
        }
        
        delete post.date;
      });
      
      setGlobalData({recentPosts: posts});
    },
  };
};