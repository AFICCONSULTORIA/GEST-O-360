const fs = require('fs');
const path = require('path');

let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const modulesToExtract = [
  'ControlsModule', 'RiskModule', 'PNTPModule', 'DocumentNumbersModule',
  'OrdersModule', 'PatrimonioModule', 'TemplatesModule', 'ContractsModule',
  'EducationModule', 'CalendarModule', 'NormsModule'
];

let importsToAdd = [];

for (const moduleName of modulesToExtract) {
  const startIdx = lines.findIndex(l => l && l.startsWith(`const ${moduleName} =`));
  if (startIdx === -1) {
    console.log(`Module ${moduleName} not found.`);
    continue;
  }

  let endIdx = startIdx;
  let braceCount = 0;
  let hasStarted = false;

  while (endIdx < lines.length) {
    const line = lines[endIdx];
    
    // Count { and }
    for (let char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }

    if (line.includes('{')) hasStarted = true;

    // Check if it's a JSX return where the module is wrapped in ()
    // e.g., const ControlsModule = () => ( ... );
    // Actually, ControlsModule is using `() => (` or `() => {`?
    
    if (hasStarted && braceCount === 0 && line.startsWith('};')) {
      break;
    }
    // if it's an implicit return like const X = () => ( ... );
    if (line.startsWith(');') && braceCount === 0) {
      break;
    }

    endIdx++;
  }

  // Adjust for any trailing empty lines
  while (lines[endIdx + 1] === '') {
    endIdx++;
  }

  const componentLines = lines.slice(startIdx, endIdx + 1);

  const dir = `src/modules/${moduleName.replace('Module', '')}`;
  fs.mkdirSync(dir, { recursive: true });

  // Common imports - this might be over-importing but it's safe
  const imports = `import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { CheckItem, Protocol, PatrimonioItem, DocumentRecord, OrderItem } from '../../types';
import { showToast } from '../../components/ui/Toast';

// Destructure common icons to avoid changing code
const { 
  Plus, Search, Filter, Edit2, Trash2, Eye, FileText, ClipboardCheck, 
  TrendingUp, TrendingDown, ChevronRight, ShieldAlert, Download, 
  CircleOff, History, Info, CheckCircle2, AlertCircle, AlertTriangle, 
  Package, LayoutDashboard, Calendar, FileBox, FileSignature, Landmark,
  ShieldCheck, ArrowRight, Settings, ChevronLeft, CalendarClock, Briefcase, 
  Users, Activity, Building2, Trees, CircleDollarSign, Tractor, HeartHandshake, 
  Trophy, BookOpen, PieChart: PieChartIcon
} = LucideIcons;

`;

  const content = imports + componentLines.join('\n') + `\n\nexport { ${moduleName} };\n`;
  fs.writeFileSync(`${dir}/index.tsx`, content);

  // Replace lines with empty strings to keep line numbers intact during iteration, we will filter them later
  for (let i = startIdx; i <= endIdx; i++) {
    lines[i] = null;
  }

  importsToAdd.push(`import { ${moduleName} } from './modules/${moduleName.replace('Module', '')}';`);
  console.log(`Extracted ${moduleName}`);
}

lines = lines.filter(l => l !== null);
lines.splice(7, 0, ...importsToAdd);

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('Todos os módulos extraídos!');
