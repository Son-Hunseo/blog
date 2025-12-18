const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const glob = require('glob');

// 1. 작업할 디렉토리 설정 (docs 폴더)
const TARGET_DIR = path.join(__dirname, '../docs');
const docsDir = TARGET_DIR; // 함수 내부에서 쓰던 변수명 매핑

// 2. 숫자 접두어 제거 함수 (예: '01-Kubernetes' -> 'Kubernetes')
function removeNumberPrefix(str) {
  // 숫자+하이픈 또는 점으로 시작하는 패턴 제거
  return str.replace(/^\d+[-.]/, '');
}

// 3. 이미지 찾기 함수
function findFirstImage(content, filePath) {
  // 1) 마크다운 이미지 문법 (![alt](src))
  const mdRegex = /!\[.*?\]\((.*?)\)/;
  const mdMatch = content.match(mdRegex);

  // 2) HTML 이미지 태그 문법 (<img src="...">)
  const htmlRegex = /<img[^>]+src=["']([^"']+)["']/;
  const htmlMatch = content.match(htmlRegex);

  let imagePath = null;

  // 3) 우선순위 판별 (더 위에 있는 것 선택)
  if (mdMatch && htmlMatch) {
    imagePath = mdMatch.index < htmlMatch.index ? mdMatch[1] : htmlMatch[1];
  } else if (mdMatch) {
    imagePath = mdMatch[1];
  } else if (htmlMatch) {
    imagePath = htmlMatch[1];
  } else {
    return null; // 이미지 없음
  }

  // 4) 경로 처리 로직
  // 절대 경로(http, /)는 그대로 반환
  if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
    return imagePath;
  }

  // 상대 경로(./, ../) 처리
  if (imagePath.startsWith('./') || imagePath.startsWith('../')) {
    const fileDir = path.dirname(filePath);
    
    // docsDir 기준으로 상대 경로 계산
    const docPath = path.relative(docsDir, fileDir);
    
    // 경로의 각 부분에서 숫자 접두어 제거
    const pathParts = docPath.split(path.sep).map(p => removeNumberPrefix(p));
    const imageName = path.basename(imagePath);

    // Docusaurus static 폴더 구조에 맞게 반환 (/img/폴더/폴더/이미지.png)
    // 주의: copy-images.js가 이미지를 어디로 복사하는지에 따라 '/img/' 부분은 조정 필요할 수 있음
    // 보통 static/img 로 복사된다면 여기는 '/img/...' 가 맞습니다.
    return `/img/${pathParts.join('/')}/${imageName}`;
  }

  return imagePath;
}

// 4. 메인 실행 로직
console.log(`[Update-FM] 썸네일 메타데이터 업데이트 시작... (대상: ${TARGET_DIR})`);

const files = glob.sync(`${TARGET_DIR}/**/*.md*`);

let updateCount = 0;

files.forEach((filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // frontmatter 파싱
  const { data, content } = matter(fileContent);

  // 이미 image가 설정되어 있으면 스킵
  if (data.image) {
    return;
  }

  // 본문에서 이미지 찾기
  const foundImage = findFirstImage(content, filePath);

  if (foundImage) {
    // 상대 경로가 깨져서 이상하게 잡히는 경우 제외 (선택 사항)
    if (!foundImage.includes('undefined') && !foundImage.includes('null')) {
        console.log(`  ✓ 추가됨: ${path.basename(filePath)} -> ${foundImage}`);
        
        // Frontmatter에 image 필드 추가
        data.image = foundImage;

        // 파일 다시 쓰기
        const newContent = matter.stringify(content, data);
        fs.writeFileSync(filePath, newContent);
        updateCount++;
    }
  }
});

console.log(`[Update-FM] 완료! 총 ${updateCount}개의 파일에 썸네일이 추가되었습니다.`);