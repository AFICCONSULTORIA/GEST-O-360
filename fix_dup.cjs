const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');
const dupStart = code.lastIndexOf("import React from 'react';");

if (dupStart > 0) {
    // dupStart is the start of the duplicated content that was mistakenly embedded.
    // Let's find exactly where it was embedded.
    console.log("Dup start is at: ", dupStart);
}
