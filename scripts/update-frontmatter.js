const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const glob = require('glob');

// 1. 작업할 디렉토리 설정
const TARGET_DIR = path.join(__dirname, '../docs');
const docsDir = TARGET_DIR;

// 2. 숫자 접두어 제거 함수
function removeNumberPrefix(str) {
  return str.replace(/^\d+[-.]/, '');
}

// 3. 이미지 찾기 함수
function findFirstImage(content, filePath) {
  const mdRegex = /!\[.*?\]\((.*?)\)/;
  const mdMatch = content.match(mdRegex);
  const htmlRegex = /<img[^>]+src=["']([^"']+)["']/;
  const htmlMatch = content.match(htmlRegex);

  let imagePath = null;

  if (mdMatch && htmlMatch) {
    imagePath = mdMatch.index < htmlMatch.index ? mdMatch[1] : htmlMatch[1];
  } else if (mdMatch) {
    imagePath = mdMatch[1];
  } else if (htmlMatch) {
    imagePath = htmlMatch[1];
  } else {
    return null;
  }

  if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
    return imagePath;
  }

  if (imagePath.startsWith('./') || imagePath.startsWith('../')) {
    const fileDir = path.dirname(filePath);
    const docPath = path.relative(docsDir, fileDir);
    const pathParts = docPath.split(path.sep).map(p => removeNumberPrefix(p));
    const imageName = path.basename(imagePath);
    return `/img/${pathParts.join('/')}/${imageName}`;
  }
  return imagePath;
}

// 4. 메인 실행 로직
console.log(`[Update-FM] 썸네일 자동화 및 문법 교정 시작... (대상: ${TARGET_DIR})`);

const files = glob.sync(`${TARGET_DIR}/**/*.md*`);
let updateCount = 0;
let fixedCount = 0;

files.forEach((filePath) => {
  try {
    let rawContent = fs.readFileSync(filePath, 'utf8');
    let needsSave = false;
    let logMsg = '';

    // 🚨 [문법 교정 로직] 
    // Frontmatter 닫는 --- 바로 뒤에 ---가 또 나오면, 그 사이에 개행(\n)을 추가
    // 정규식 그룹 1: 닫는 --- 와 줄바꿈
    // 정규식 그룹 2: 시작하는 --- 와 줄바꿈
    const doubleDashRegex = /(\n---\s*\r?\n)(---\s*\r?\n)/g;
    
    if (doubleDashRegex.test(rawContent)) {
      // $1(위쪽)과 $2(아래쪽) 사이에 \n(빈 줄)을 하나 끼워넣음
      rawContent = rawContent.replace(doubleDashRegex, '$1\n$2');
      needsSave = true;
      logMsg += `[Fix Syntax: 빈 줄 삽입] `;
      fixedCount++;
    }

    // 이제 문법이 고쳐졌으므로 matter 파싱 시도
    const { data, content } = matter(rawContent);

    // 썸네일(image) 없으면 추가 로직
    if (!data.image) {
      const foundImage = findFirstImage(content, filePath);

      if (foundImage && !foundImage.includes('undefined') && !foundImage.includes('null')) {
        data.image = foundImage;
        needsSave = true;
        logMsg += `[Add Image] ${foundImage}`;
        updateCount++;
      }
    }

    // 변경사항이 있으면 파일 저장
    if (needsSave) {
      console.log(`  ✓ 수정됨: ${path.basename(filePath)} -> ${logMsg}`);
      
      // 주의: matter.stringify를 쓰면 포맷이 재정렬됩니다.
      // 우리가 위에서 강제로 넣은 \n이 content의 시작부분에 포함되어 잘 들어갑니다.
      const newContent = matter.stringify(content, data);
      fs.writeFileSync(filePath, newContent);
    }

  } catch (e) {
    console.error(`  ⚠️ [SKIP] 처리 중 치명적 오류: ${path.basename(filePath)}`);
    console.error(`     원인: ${e.message.split('\n')[0]}`);
  }
});

console.log(`---------------------------------------------------`);
console.log(`[결과] 문법(빈줄) 수정: ${fixedCount}건, 썸네일 추가: ${updateCount}건 완료.`);