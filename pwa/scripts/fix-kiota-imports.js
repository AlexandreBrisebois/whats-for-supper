const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.resolve(__dirname, '../src/lib/api/generated');

console.log(`🔧 Fixing Kiota imports in ${targetDir}...`);

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace .js' or .js"; with ' or ";
    const newContent = content.replace(/\.js(['"])/g, '$1');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  ✅ Fixed: ${path.relative(targetDir, filePath)}`);
    }
  }
});

console.log('✨ Kiota imports fixed!');
