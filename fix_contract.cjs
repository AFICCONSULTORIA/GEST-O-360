const fs = require('fs');

const modulesDir = 'src/modules';
const moduleFolders = fs.readdirSync(modulesDir);
for (const folder of moduleFolders) {
  const filePath = `${modulesDir}/${folder}/index.tsx`;
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('DocumentTemplate,')) {
    content = content.replace('DocumentTemplate,', 'DocumentTemplate, Contract,');
  }
  
  if (folder === 'Templates') {
     content = content.replace("=== 'PPTX'", "=== 'PDF'");
     content = content.replace("=== 'Word'", "=== 'DOCX'");
     content = content.replace("=== 'Excel'", "=== 'XLSX'");
  }
  
  fs.writeFileSync(filePath, content);
}
console.log('Fixed Contract import!');
