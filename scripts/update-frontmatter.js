const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const glob = require('glob');

// 1. 작업할 디렉토리 설정
const TARGET_DIR = path.join(__dirname, '../docs');
const docsDir = TARGET_DIR;

// [설정] 디렉토리별 기본 썸네일 설정 (키워드 : 이미지경로)
// 파일 경로에 '키워드'가 포함되어 있으면 해당 이미지를 기본값으로 사용
const DEFAULT_IMAGES = {
  'Kubernetes': '/img/default/kubernetes.png',
  'Openstack': '/img/default/openstack.png',
  'Docker': '/img/default/docker.png',
  'Proxmox': '/img/default/proxmox.png',
  'Nginx': '/img/default/nginx.png',
  
  'Spring': '/img/default/spring.png',
  'Database': '/img/default/database.png',
  
  'Algorithm': '/img/default/algorithm.png',
  'Security': '/img/default/security.png',
  'Network': '/img/default/network.png',
  
  'SynologyNas': '/img/default/synologynas.png',
  // 필요한 만큼 추가
};

// 2. 숫자 접두어 제거 함수
function removeNumberPrefix(str) {
  return str.replace(/^\d+[-.]/, '');
}

// 3. 이미지 찾기 함수 (본문 검색)
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

  // 절대 경로
  if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
    return imagePath;
  }

  // 상대 경로 변환
  if (imagePath.startsWith('./') || imagePath.startsWith('../')) {
    const fileDir = path.dirname(filePath);
    const docPath = path.relative(docsDir, fileDir);
    const pathParts = docPath.split(path.sep).map(p => removeNumberPrefix(p));
    const imageName = path.basename(imagePath);
    return `/img/${pathParts.join('/')}/${imageName}`;
  }
  return imagePath;
}

// 4. 기본 이미지 찾기 함수 (디렉토리 기준)
function findDefaultImage(filePath) {
  for (const [keyword, imagePath] of Object.entries(DEFAULT_IMAGES)) {
    // 파일 경로에 특정 키워드(예: Kubernetes)가 포함되어 있는지 확인
    if (filePath.includes(keyword)) {
      return imagePath;
    }
  }
  return null;
}

// 5. 메인 실행 로직
console.log(`[Update-FM] 썸네일 자동화(기본값 포함) 및 문법 교정 시작...`);

const files = glob.sync(`${TARGET_DIR}/**/*.md*`);
let updateCount = 0;
let fixedCount = 0;

files.forEach((filePath) => {
  try {
    let rawContent = fs.readFileSync(filePath, 'utf8');
    let needsSave = false;
    let logMsg = '';

    // [문법 교정] --- 사이 빈 줄 삽입
    const doubleDashRegex = /(\n---\s*\r?\n)(---\s*\r?\n)/g;
    if (doubleDashRegex.test(rawContent)) {
      rawContent = rawContent.replace(doubleDashRegex, '$1\n$2');
      needsSave = true;
      logMsg += `[Fix Syntax] `;
      fixedCount++;
    }

    const { data, content } = matter(rawContent);

    // [썸네일 로직] 이미지가 없을 때만 수행
    if (!data.image) {
      // 1순위: 본문 내 이미지 찾기
      let foundImage = findFirstImage(content, filePath);
      let source = 'Context';

      // 2순위: 본문에 없으면 디렉토리별 기본 이미지 찾기
      if (!foundImage) {
        foundImage = findDefaultImage(filePath);
        source = 'Default';
      }

      // 이미지를 찾았고 유효하다면 적용
      if (foundImage && !foundImage.includes('undefined') && !foundImage.includes('null')) {
        data.image = foundImage;
        needsSave = true;
        logMsg += `[Add Image(${source})] ${foundImage}`;
        updateCount++;
      }
    }

    if (needsSave) {
      console.log(`  ✓ 수정됨: ${path.basename(filePath)} -> ${logMsg}`);
      const newContent = matter.stringify(content, data);
      fs.writeFileSync(filePath, newContent);
    }

  } catch (e) {
    console.error(`  ⚠️ [SKIP] 에러 발생: ${path.basename(filePath)} / ${e.message.split('\n')[0]}`);
  }
});

console.log(`---------------------------------------------------`);
console.log(`[결과] 문법 수정: ${fixedCount}건, 썸네일 추가: ${updateCount}건 완료.`);