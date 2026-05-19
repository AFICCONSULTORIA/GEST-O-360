const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/<\/div>\n\s*<\/main>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);\n\s*}/, '      </div>\n    </div>\n  </div>\n  );\n}');

// Also close the overflow container where <main> ends
code = code.replace(/<\/div>\n\s*<\/main>\n\s*\{\/\* Toasts \*\/\}/, '</div>\n      </main>\n    </div>\n\n      {/* Toasts */}');
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed");
