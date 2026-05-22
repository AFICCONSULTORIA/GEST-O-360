const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const reportLines = lines.slice(1741, 1884); // 1742 to 1884 (0-indexed => 1741 to 1883)

const content = `import React from 'react';
import { Package, Download, Plus, Search, Filter, Printer, X } from 'lucide-react';
import { PatrimonioItem } from '../../types';

${reportLines.join('\n')}

export { ReportsModule, PatrimonioPrintView };
`;

fs.mkdirSync('src/modules/Reports', { recursive: true });
fs.writeFileSync('src/modules/Reports/index.tsx', content);

// Also remove from App.tsx
// From bottom to top to avoid index shifting

lines.splice(1741, 1884 - 1742 + 1);

// Add import to App.tsx
lines.splice(6, 0, "import { ReportsModule } from './modules/Reports';");

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('ReportsModule extraído com sucesso!');
