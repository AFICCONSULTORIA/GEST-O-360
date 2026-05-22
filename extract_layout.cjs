const fs = require('fs');

let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

// Find the start line of PatrimonioPrintLayout
const startIdx = lines.findIndex(l => l.includes('const PatrimonioPrintLayout ='));
let endIdx = startIdx;
while (endIdx < lines.length) {
  if (lines[endIdx].startsWith('};') && endIdx > startIdx + 10) {
    break;
  }
  endIdx++;
}

const componentLines = lines.slice(startIdx, endIdx + 1);

let reportsContent = fs.readFileSync('src/modules/Reports/index.tsx', 'utf8');
reportsContent = reportsContent.replace('export { ReportsModule, PatrimonioPrintView };', '');
reportsContent += '\n' + componentLines.join('\n') + '\n\nexport { ReportsModule, PatrimonioPrintView, PatrimonioPrintLayout };\n';

fs.writeFileSync('src/modules/Reports/index.tsx', reportsContent);

// Remove from App.tsx
lines.splice(startIdx, endIdx - startIdx + 1);

// Add import to App.tsx
// Find import ReportsModule
const importIdx = lines.findIndex(l => l.includes("import { ReportsModule } from './modules/Reports';"));
if (importIdx !== -1) {
  lines[importIdx] = "import { ReportsModule, PatrimonioPrintLayout } from './modules/Reports';";
} else {
  lines.splice(6, 0, "import { ReportsModule, PatrimonioPrintLayout } from './modules/Reports';");
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('PatrimonioPrintLayout extraído com sucesso!');
