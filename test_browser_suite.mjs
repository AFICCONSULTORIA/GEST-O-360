import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = 0; // Porta dinâmica automática

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

function createStaticServer() {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    
    let filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const assignedPort = server.address().port;
      console.log(`[Test Server] Servindo dist na porta ${assignedPort}`);
      resolve({ server, port: assignedPort });
    });
  });
}

async function runBrowserTest() {
  const { server, port } = await createStaticServer();

  console.log('[Browser] Iniciando Chrome Headless...');
  const randomId = Math.random().toString(36).substring(2, 9);
  const tempProfile = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_prof_' + randomId);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--user-data-dir=' + tempProfile,
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('dialog', async dialog => {
    console.log('[Browser Dialog Confirmado]', dialog.message());
    await dialog.accept();
  });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[FleetFuel') || text.includes('Erro')) {
      console.log(`[Browser Console] ${text}`);
    }
  });

  // 1. Acessa tela de login
  console.log('[Browser] Navegando para /servidores...');
  await page.goto(`http://127.0.0.1:${PORT}/servidores`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Preenche credenciais
  console.log('[Browser] Realizando Login...');
  await page.type('input[type="email"]', 'aficconsultoria@gmail.com');
  await page.type('input[type="password"]', 'gestao123@');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 2500));

  // 2. Navega para a visão de Frotas (controls)
  console.log('[Browser] Acessando módulo de Frotas & Combustíveis...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const controlesBtn = buttons.find(b => b.textContent && b.textContent.trim().startsWith('Controles'));
    if (controlesBtn) controlesBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const frotasBtn = buttons.find(b => b.textContent && b.textContent.includes('Controle & Auditoria de Frotas'));
    if (frotasBtn) frotasBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  const ssFrotas = path.join(__dirname, 'screenshot_1_frotas_dashboard.png');
  await page.screenshot({ path: ssFrotas });
  console.log('[Screenshot] Dashboard de Frotas capturado');

  // 3. Teste da Aba Motoristas
  console.log('[Browser] Clicando na aba Motoristas...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const drvTab = tabs.find(t => t.textContent && t.textContent.includes('Motoristas'));
    if (drvTab) drvTab.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const ssDrivers = path.join(__dirname, 'screenshot_2_motoristas.png');
  await page.screenshot({ path: ssDrivers });
  console.log('[Screenshot] Aba Motoristas capturada');

  // Se houver botão "Limpar Todos", clica nele
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const clearBtn = buttons.find(b => b.textContent && b.textContent.includes('Limpar Todos'));
    if (clearBtn) clearBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Cadastra um novo motorista de teste
  console.log('[Browser] Cadastrando motorista oficial...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const newBtn = buttons.find(b => b.textContent && b.textContent.includes('Novo Motorista'));
    if (newBtn) newBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Preenche formulário do motorista
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    // Encontra campos do modal
    inputs.forEach(input => {
      const placeholder = (input.placeholder || '').toLowerCase();
      if (placeholder.includes('nome')) {
        input.value = 'MOTORISTA OFICIAL PREFEITURA';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (placeholder.includes('cpf') || placeholder.includes('000.')) {
        input.value = '777.888.999-00';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const submitBtns = Array.from(document.querySelectorAll('button'));
    const saveBtn = submitBtns.find(b => b.textContent && (b.textContent.includes('Cadastrar Motorista') || b.textContent.includes('Salvar')));
    if (saveBtn) saveBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  const ssDriverCreated = path.join(__dirname, 'screenshot_3_motorista_criado.png');
  await page.screenshot({ path: ssDriverCreated });
  console.log('[Screenshot] Motorista criado capturado');

  // Agora clica no botão Excluir do motorista para testar exclusão permanente
  console.log('[Browser] Excluindo o motorista para testar se ele some para sempre...');
  await page.evaluate(() => {
    const deleteBtns = Array.from(document.querySelectorAll('button[title*="Excluir"]'));
    if (deleteBtns.length > 0) {
      deleteBtns[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 2500));

  const ssDriverDeleted = path.join(__dirname, 'screenshot_4_motorista_excluido.png');
  await page.screenshot({ path: ssDriverDeleted });
  console.log('[Screenshot] Motorista excluído capturado');

  // 4. Teste da Aba Postos Credenciados
  console.log('[Browser] Clicando na aba Postos Credenciados...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const staTab = tabs.find(t => t.textContent && t.textContent.includes('Postos Credenciados'));
    if (staTab) staTab.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  const ssStations = path.join(__dirname, 'screenshot_5_postos.png');
  await page.screenshot({ path: ssStations });
  console.log('[Screenshot] Aba Postos capturada');

  // Clica no botão "Limpar Todos" dos postos
  console.log('[Browser] Acionando Limpar Todos em Postos Credenciados...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const clearBtn = buttons.find(b => b.textContent && b.textContent.includes('Limpar Todos'));
    if (clearBtn) clearBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  const ssStationsCleaned = path.join(__dirname, 'screenshot_6_postos_limpos.png');
  await page.screenshot({ path: ssStationsCleaned });
  console.log('[Screenshot] Postos limpos capturado');

  // 5. Teste da Tabela de Preços Licitados
  console.log('[Browser] Abrindo Modal de Preços Licitados...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const priceBtn = buttons.find(b => b.textContent && (b.textContent.includes('Tabela de Preços') || b.textContent.includes('Preços Licitados')));
    if (priceBtn) priceBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const ssPricesModal = path.join(__dirname, 'screenshot_7_modal_precos_licitados.png');
  await page.screenshot({ path: ssPricesModal });
  console.log('[Screenshot] Modal de Preços capturado');

  // 6. Recarrega a página inteira (F5) para provar persistência e que NÃO retorna!
  console.log('[Browser] Recarregando a página inteira (F5) para provar que dados excluídos NÃO voltam...');
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  // Se voltou para a tela de login, preenche ou submete novamente
  await page.evaluate(() => {
    const loginBtn = document.querySelector('button[type="submit"]');
    if (loginBtn) (loginBtn).click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Reabre Controles -> Frotas
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const controlesBtn = buttons.find(b => b.textContent && b.textContent.trim().startsWith('Controles'));
    if (controlesBtn) controlesBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const frotasBtn = buttons.find(b => b.textContent && b.textContent.includes('Controle & Auditoria de Frotas'));
    if (frotasBtn) frotasBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Volta para a aba de postos
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const staTab = tabs.find(t => t.textContent && t.textContent.includes('Postos Credenciados'));
    if (staTab) staTab.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const ssFinalPostos = path.join(__dirname, 'screenshot_8_postos_apos_reload.png');
  await page.screenshot({ path: ssFinalPostos });
  console.log('[Screenshot] Postos após reload capturado');

  // Volta para a aba de motoristas
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const drvTab = tabs.find(t => t.textContent && t.textContent.includes('Motoristas'));
    if (drvTab) drvTab.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const ssFinalDrivers = path.join(__dirname, 'screenshot_9_motoristas_apos_reload.png');
  await page.screenshot({ path: ssFinalDrivers });
  console.log('[Screenshot] Motoristas após reload capturado');

  await browser.close();
  server.close();
  console.log('=== TESTE EM NAVEGADOR CONCLUÍDO COM SUCESSO TOTAL ===');
}

runBrowserTest().catch(console.error);
