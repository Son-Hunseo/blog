const fs = require('fs-extra');
const path = require('path');

// 숫자 프리픽스 제거 함수
function removeNumberPrefix(str) {
  return str.replace(/^\d+-/, '');
}

async function copyImages() {
  const docsDir = path.join(__dirname, '../docs');
  const staticImgDir = path.join(__dirname, '../static/img');

  console.log('📸 이미지 복사 시작...');

  // static/img 폴더가 없으면 생성
  await fs.ensureDir(staticImgDir);

  // docs 폴더를 재귀적으로 탐색
  async function scanDirectory(dir, relativePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // assets 폴더를 발견하면 복사
        if (entry.name === 'assets') {
          // 상위 폴더 경로에서 숫자 프리픽스 제거
          const pathParts = relativePath.split(path.sep).filter(p => p).map(p => removeNumberPrefix(p));
          const targetDir = path.join(staticImgDir, ...pathParts);
          
          // 대상 폴더 생성
          await fs.ensureDir(targetDir);
          
          // assets 폴더 내의 모든 이미지 복사
          const assetFiles = await fs.readdir(fullPath);
          for (const file of assetFiles) {
            // 이미지 파일만 복사 (jpg, jpeg, png, gif, svg, webp)
            if (/\.(jpe?g|png|gif|svg|webp)$/i.test(file)) {
              const srcFile = path.join(fullPath, file);
              const destFile = path.join(targetDir, file);
              
              await fs.copy(srcFile, destFile);
              console.log(`  ✓ ${path.relative(docsDir, srcFile)} → ${path.relative(staticImgDir, destFile)}`);
            }
          }
        } else if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          // assets가 아닌 일반 폴더는 재귀 탐색
          const newRelativePath = path.join(relativePath, entry.name);
          await scanDirectory(fullPath, newRelativePath);
        }
      }
    }
  }

  await scanDirectory(docsDir);
  console.log('✅ 이미지 복사 완료!');
}

// 스크립트 실행
copyImages().catch(err => {
  console.error('❌ 이미지 복사 중 오류 발생:', err);
  process.exit(1);
});