const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const glob = require('glob');

function findFirstImage(content, filePath) {
  // 1. 기존 마크다운 이미지 문법 (![alt](src))
  const mdRegex = /!\[.*?\]\((.*?)\)/;
  const mdMatch = content.match(mdRegex);

  // 2. HTML 이미지 태그 문법 (<img src="...">) - 작은따옴표/큰따옴표 모두 대응
  const htmlRegex = /<img[^>]+src=["']([^"']+)["']/;
  const htmlMatch = content.match(htmlRegex);

  let imagePath = null;

  // 3. 둘 중 더 먼저 나오는 이미지를 선택하는 로직
  if (mdMatch && htmlMatch) {
    // 둘 다 있으면 인덱스가 더 작은(더 위에 있는) 것을 선택
    imagePath = mdMatch.index < htmlMatch.index ? mdMatch[1] : htmlMatch[1];
  } else if (mdMatch) {
    imagePath = mdMatch[1];
  } else if (htmlMatch) {
    imagePath = htmlMatch[1];
  } else {
    return null; // 이미지가 없음
  }

  // --- 이하 기존 경로 처리 로직 유지 ---
  
  if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
    return imagePath;
  }

  if (imagePath.startsWith('./') || imagePath.startsWith('../')) {
    const fileDir = path.dirname(filePath);
    const imageName = path.basename(imagePath);
    // docsDir, removeNumberPrefix 등은 외부 scope에 정의되어 있다고 가정
    const docPath = path.relative(docsDir, fileDir); 
    const pathParts = docPath.split(path.sep).map(p => removeNumberPrefix(p));

    return `/img/${pathParts.join('/')}/${imageName}`;
  }
  
  // 그 외의 경우(그냥 파일명만 있는 경우 등) 처리
  return imagePath;
}

// 작업할 디렉토리 설정 (예: docs 또는 blog)
const TARGET_DIR = path.join(__dirname, '../docs'); 
// 혹은 블로그라면 '../blog'

// 메인 실행 로직
const files = glob.sync(`${TARGET_DIR}/**/*.md*`);

files.forEach((filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // gray-matter로 파싱 (data: 헤더 정보, content: 본문)
  const { data, content } = matter(fileContent);

  // 이미 image(썸네일)가 설정되어 있다면 스킵
  if (data.image) {
    return;
  }

  // 이미지가 없으면 본문에서 찾기
  const foundImage = findFirstImage(content, filePath);

  if (foundImage) {
    console.log(`[Update] 썸네일 추가됨: ${path.basename(filePath)} -> ${foundImage}`);
    
    // Frontmatter 업데이트
    data.image = foundImage;

    // 파일 다시 쓰기
    const newContent = matter.stringify(content, data);
    fs.writeFileSync(filePath, newContent);
  }
});

console.log('썸네일 자동화 작업 완료.');