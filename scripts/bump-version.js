import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const versionJsonPath = path.join(rootDir, 'src', 'config', 'version.json');
const packageJsonPath = path.join(rootDir, 'package.json');

const type = process.argv[2] || 'build'; // 'build' (padrão), 'patch', 'minor', 'major'

let versionData = {
  major: 0,
  minor: 0,
  patch: 0,
  build: 1,
  version: '0.0.0.1',
  buildDate: '',
  buildTime: ''
};

if (fs.existsSync(versionJsonPath)) {
  try {
    versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
  } catch (err) {
    console.warn('Erro ao ler version.json, usando padrão:', err);
  }
}

if (type === 'major') {
  versionData.major += 1;
  versionData.minor = 0;
  versionData.patch = 0;
  versionData.build = 0;
} else if (type === 'minor') {
  versionData.minor += 1;
  versionData.patch = 0;
  versionData.build = 0;
} else if (type === 'patch') {
  versionData.patch += 1;
  versionData.build = 0;
} else {
  // Padrão: incrementa a 4ª casa (build / revisão automática)
  versionData.build += 1;
}

// Regra: a cada 100 builds (ou ao atingir 100), avança a 3ª casa (patch) e zera o build (ex: após 0.0.0.99/100 vira 0.0.1.0)
if (versionData.build >= 100) {
  versionData.patch += Math.floor(versionData.build / 100);
  versionData.build = versionData.build % 100;
}

if (versionData.patch >= 100) {
  versionData.minor += Math.floor(versionData.patch / 100);
  versionData.patch = versionData.patch % 100;
}

if (versionData.minor >= 100) {
  versionData.major += Math.floor(versionData.minor / 100);
  versionData.minor = versionData.minor % 100;
}

versionData.version = `${versionData.major}.${versionData.minor}.${versionData.patch}.${versionData.build}`;

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
versionData.buildDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
versionData.buildTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8');

// Sincroniza package.json
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    pkg.version = versionData.version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  } catch (err) {
    console.warn('Erro ao atualizar package.json:', err);
  }
}

console.log(`[Version Manager] Nova versão gerada: v${versionData.version} (${versionData.buildDate} ${versionData.buildTime})`);

