const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const protocolLines = lines.slice(4611, 4896); 

const content = `import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Filter, CircleOff, Download, Edit2, Trash2, Eye, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Protocol } from '../../types';

${protocolLines.join('\n')}

export { ProtocolModule, NewProtocolModal };
`;

fs.mkdirSync('src/modules/Protocol', { recursive: true });
fs.writeFileSync('src/modules/Protocol/index.tsx', content);

// Also remove from App.tsx
// From bottom to top to avoid index shifting

lines.splice(4611, 4896 - 4612 + 1);

// Wait! We also need to add import to App.tsx
lines.splice(5, 0, "import { ProtocolModule, NewProtocolModal } from './modules/Protocol';");

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('ProtocolModule extraído com sucesso!');
