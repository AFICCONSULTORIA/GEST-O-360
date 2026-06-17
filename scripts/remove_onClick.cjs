const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace onClick on same element as "fixed inset-0"
    content = content.replace(/(className=\"[^\"]*fixed inset-0[^\"]*\"[^\>]*?)\s+onClick=\{[^\}]+\}/g, '$1');
    content = content.replace(/(className=\`[^\`]*fixed inset-0[^\`]*\`[^\>]*?)\s+onClick=\{[^\}]+\}/g, '$1');
    content = content.replace(/onClick=\{[^\}]+\}\s+(className=\"[^\"]*fixed inset-0[^\"]*\")/g, '$1');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated: ' + filePath);
    }
  }
});
