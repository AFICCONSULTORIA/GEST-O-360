const fs = require('fs');

const modulesDir = 'src/modules';
const moduleFolders = fs.readdirSync(modulesDir);

for (const folder of moduleFolders) {
  const filePath = `${modulesDir}/${folder}/index.tsx`;
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // Remove Contract from LucideIcons
  content = content.replace(/, Contract\b/g, '');
  content = content.replace(/\bContract , /g, '');

  fs.writeFileSync(filePath, content);
}

// Fix Templates module specifically
const templatesPath = `${modulesDir}/Templates/index.tsx`;
if (fs.existsSync(templatesPath)) {
  let content = fs.readFileSync(templatesPath, 'utf8');
  content = content.replace(/\.fileUrl/g, '.url');
  content = content.replace(/=== 'Word'/g, "=== 'DOCX'");
  content = content.replace(/=== 'Excel'/g, "=== 'XLSX'");
  content = content.replace(/=== 'PowerPoint'/g, "=== 'PPTX'"); // or PDF depending on what it is
  fs.writeFileSync(templatesPath, content);
}

console.log('Contract icon conflict and Templates fixed!');
