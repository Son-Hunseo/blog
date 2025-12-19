const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const glob = require('glob');

// 1. 작업할 디렉토리 설정
const TARGET_DIR = path.join(__dirname, '../docs');
const docsDir = TARGET_DIR;

// [설정] 디렉토리별 기본 썸네일 설정
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
};

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

// 4. 기본 이미지 찾기 함수
function findDefaultImage(filePath) {
  for (const [keyword, imagePath] of Object.entries(DEFAULT_IMAGES)) {
    if (filePath.includes(keyword)) {
      return imagePath;
    }
  }
  return null;
}

// 5. 메인 실행 로직
console.log(`[Update-FM] 썸네일 자동화 및 문법 교정 시작...`);

const files = glob.sync(`${TARGET_DIR}/**/*.md*`);
let updateCount = 0;
let fixedCount = 0;

files.forEach((filePath) => {
  try {
    let rawContent = fs.readFileSync(filePath, 'utf8');
    let needsSave = false;
    let logMsg = '';

    const doubleDashRegex = /(\n---\s*\r?\n)(---\s*\r?\n)/g;
    if (doubleDashRegex.test(rawContent)) {
      rawContent = rawContent.replace(doubleDashRegex, '$1\n$2');
      needsSave = true;
      logMsg += `[Fix Syntax] `;
      fixedCount++;
    }

    const { data, content } = matter(rawContent);

    if (!data.image) {
      let foundImage = findFirstImage(content, filePath);
      let source = 'Context';

      if (!foundImage) {
        foundImage = findDefaultImage(filePath);
        source = 'Default';
      }

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
    console.error(`  ⚠️ [SKIP] 에러: ${path.basename(filePath)} / ${e.message.split('\n')[0]}`);
  }
});

console.log(`---------------------------------------------------`);
console.log(`[결과] 문법 수정: ${fixedCount}건, 썸네일 추가: ${updateCount}건`);

// ===================================================================
// sidebar_class_name 주입 (index 제외)
// ===================================================================
console.log(`[Update-FM] sidebar_class_name 주입 시작...`);

const files2 = glob.sync(`${TARGET_DIR}/**/*.md*`);
let sidebarHideCount = 0;
let skippedCount = 0;

const EXCLUDE_BASENAMES = new Set(['index.mdx', 'index.md']);

files2.forEach((filePath) => {
  try {
    const base = path.basename(filePath).toLowerCase();

    if (EXCLUDE_BASENAMES.has(base)) {
      skippedCount++;
      return;
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(rawContent);
    let needsSave = false;

    if (data.sidebar_class_name === undefined) {
      data.sidebar_class_name = 'hidden-sidebar-item';
      needsSave = true;
      sidebarHideCount++;
    }

    if (needsSave) {
      // ⭐ gray-matter 옵션 추가: YAML에 Boolean으로 명확히 저장
      const newContent = matter.stringify(content, data, {
        engines: {
          yaml: {
            stringify: (obj) => {
              const yaml = require('js-yaml');
              return yaml.dump(obj, {
                lineWidth: -1,
                noRefs: true,
                sortKeys: false
              });
            }
          }
        }
      });
      fs.writeFileSync(filePath, newContent);
      console.log(`  ✓ 메타데이터 추가: ${path.basename(filePath)}`);
    }

  } catch (e) {
    console.error(`  ⚠️ [SKIP] 메타데이터 에러: ${path.basename(filePath)}`);
  }
});

console.log(`---------------------------------------------------`);
console.log(`[결과] sidebar 숨김: ${sidebarHideCount}건`);
console.log(`[결과] 제외됨(index): ${skippedCount}건`);

// ===================================================================
// index.mdx 파일에 pagination null 추가
// ===================================================================
console.log(`[Update-FM] index.mdx pagination 메타데이터 주입 시작...`);

const indexFiles = glob.sync(`${TARGET_DIR}/**/index.md*`);
let indexUpdateCount = 0;

indexFiles.forEach((filePath) => {
  try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(rawContent);
    let needsSave = false;

    if (data.pagination_prev === undefined) {
      data.pagination_prev = null;
      needsSave = true;
    }

    if (data.pagination_next === undefined) {
      data.pagination_next = null;
      needsSave = true;
    }

    if (needsSave) {
      const newContent = matter.stringify(content, data, {
        engines: {
          yaml: {
            stringify: (obj) => {
              const yaml = require('js-yaml');
              return yaml.dump(obj, {
                lineWidth: -1,
                noRefs: true,
                sortKeys: false
              });
            }
          }
        }
      });
      fs.writeFileSync(filePath, newContent);
      indexUpdateCount++;
      console.log(`  ✓ index pagination 추가: ${path.basename(path.dirname(filePath))}/index.mdx`);
    }

  } catch (e) {
    console.error(`  ⚠️ [SKIP] index 메타데이터 에러: ${path.basename(filePath)}`);
  }
});

console.log(`---------------------------------------------------`);
console.log(`[결과] index pagination 추가: ${indexUpdateCount}건`);
console.log(`\n✅ 모든 작업 완료!`);