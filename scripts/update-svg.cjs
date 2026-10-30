const fs = require('fs');

const b64 = fs.readFileSync('public/pwa-512x512.png').toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="squircle">
      <rect width="512" height="512" rx="108" ry="108" />
    </clipPath>
  </defs>
  <rect width="512" height="512" rx="108" fill="#0A0907" />
  <image href="data:image/png;base64,${b64}" width="512" height="512" clip-path="url(#squircle)" preserveAspectRatio="xMidYMid slice" />
</svg>
`;

fs.writeFileSync('public/icon.svg', svg);
console.log('Updated public/icon.svg successfully');

