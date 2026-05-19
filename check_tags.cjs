const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');
const startIdx = code.indexOf('export default function App() {');
const returnIdx = code.indexOf('return (', startIdx);
const block = code.substring(returnIdx);

let lines = block.split('\n');
let stack = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  // naive tag matcher
  let match;
  let re = /<\/?([a-zA-Z0-9\.]+)[^>]*>/g;
  while ((match = re.exec(line)) !== null) {
    let fullTag = match[0];
    let isSelfClosing = fullTag.endsWith('/>');
    if (isSelfClosing) continue;
    
    let tagName = match[1];
    
    // Ignore some components or SVG elements that might be weird?
    // Wait, simple components
    if (fullTag.startsWith('</')) {
      if (stack.length > 0 && stack[stack.length - 1].tag === tagName) {
        stack.pop();
      } else {
        console.log(`Line ${i + returnIdx}: Unmatched close tag </${tagName}>. Top of stack is <${stack.length > 0 ? stack[stack.length - 1].tag : 'empty'}>`);
        // Don't break immediately to see all
      }
    } else if (fullTag.startsWith('<')) {
      stack.push({ tag: tagName, line: i + returnIdx });
    }
  }
}

if (stack.length > 0) {
    console.log("Unclosed tags remaining:");
    stack.forEach(item => {
        console.log(`- <${item.tag}> opened at line ${item.line}`);
    });
}
