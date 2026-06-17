const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize everything to \n for matching
content = content.replace(/\r\n/g, '\n');

// Restore onClick for the z-30 dropdown backdrop
content = content.replace(
  `<div className="fixed inset-0 z-30" />`,
  `<div className="fixed inset-0 z-30" onClick={() => setExpandedCategory(null)} />`
);

// Restore onClick for the mobile backdrop
content = content.replace(
  `exit={{ opacity: 0 }}\n                  className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 lg:hidden print:hidden"`,
  `exit={{ opacity: 0 }}\n                  onClick={() => setIsMobileMenuOpen(false)}\n                  className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 lg:hidden print:hidden"`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Restored onClick on navbars.');
