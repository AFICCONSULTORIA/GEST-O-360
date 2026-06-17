const fs = require('fs');
const glob = require('glob'); // Note: we can just use fs.readdirSync since it's flat

const modulesDir = 'src/modules';
const moduleFolders = fs.readdirSync(modulesDir);

for (const folder of moduleFolders) {
  const filePath = `${modulesDir}/${folder}/index.tsx`;
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix types import
  content = content.replace(
    /import { CheckItem[^}]*} from '\.\.\/\.\.\/types';/,
    `import { 
  CheckItem, Protocol, PatrimonioItem, DocumentRecord, OrderItem,
  OrderType, OrderStatus, DocType, PNTPItem, DocumentTemplate, Contract,
  Institution, AdminUser, View, PNTPCategory, Evidence
} from '../../types';`
  );

  // Fix icons
  content = content.replace(
    /const {([^}]+)} = LucideIcons;/s,
    (match, p1) => {
      const existingIcons = p1.split(',').map(i => i.trim()).filter(i => i);
      const newIcons = ['AlarmClock', 'Clock', 'Target', 'Upload', 'GraduationCap', 'Home', 'Bus', 'Salad', 'Users2', 'Leaf', 'BookText', 'Truck', 'Globe', 'FileBadge', 'X', 'Contract'];
      const combined = Array.from(new Set([...existingIcons, ...newIcons]));
      return `const { \n  ${combined.join(', ')}\n} = LucideIcons;`;
    }
  );

  // Add supabase import if not present
  if (!content.includes('import { supabase }')) {
    content = content.replace(
      "import * as LucideIcons from 'lucide-react';",
      "import * as LucideIcons from 'lucide-react';\nimport { supabase } from '../../lib/supabase';"
    );
  }

  // Import missing constants from App
  if (folder === 'Contracts') {
    content = content.replace("import { supabase } from '../../lib/supabase';", "import { supabase } from '../../lib/supabase';\nimport { MOCK_CONTRACTS } from '../../App';");
  }
  if (folder === 'Templates') {
    content = content.replace("import { supabase } from '../../lib/supabase';", "import { supabase } from '../../lib/supabase';\nimport { MOCK_TEMPLATES } from '../../App';");
  }
  if (folder === 'PNTP') {
    content = content.replace("import { supabase } from '../../lib/supabase';", "import { supabase } from '../../lib/supabase';\nimport { RADAR_DATA } from '../../App';");
  }
  if (folder === 'Patrimonio') {
    content = content.replace("import { supabase } from '../../lib/supabase';", "import { supabase } from '../../lib/supabase';\nimport { PatrimonioPrintLayout } from '../Reports';");
  }

  fs.writeFileSync(filePath, content);
}

// Export constants from App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace('const MOCK_CONTRACTS', 'export const MOCK_CONTRACTS');
appContent = appContent.replace('const MOCK_TEMPLATES', 'export const MOCK_TEMPLATES');
appContent = appContent.replace('const RADAR_DATA', 'export const RADAR_DATA');
fs.writeFileSync('src/App.tsx', appContent);

console.log('Build errors fixed!');
