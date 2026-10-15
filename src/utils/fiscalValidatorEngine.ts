/**
 * Motor de Auditoria e Pré-Validação de Documentos Fiscais
 * Compatível com:
 * - NT 2026.010 da NF-e (Modelo 55 - DANFE Reforma Tributária - IBS/CBS/IS)
 * - NT 008 do DANFSe Padrão Nacional (NFS-e - Serviços)
 * 
 * Gestão 360 - Setor Público & Inteligência Fiscal
 */

export interface FiscalIssue {
  type: 'erro' | 'aviso' | 'sucesso';
  tagOrField: string;
  title: string;
  description: string;
  expected?: string | number;
  found?: string | number;
}

export interface FiscalItemDetail {
  itemNumber: number;
  description: string;
  ncm?: string;
  cClassTrib?: string;
  vProd: number;
  vBC: number;
  // Alíquotas e Valores Declarados
  pIBSUF: number;
  vIBSUF: number;
  pIBSMun: number;
  vIBSMun: number;
  pCBS: number;
  vCBS: number;
  pIS?: number;
  vIS?: number;
  pAliqEfet?: number;
  pAliqEfetUF?: number;
  pAliqEfetMun?: number;
  pAliqEfetCBS?: number;
  // Valores Calculados
  calcIBSUF: number;
  calcIBSMun: number;
  calcCBS: number;
  calcIS?: number;
  hasErrors: boolean;
  hasWarnings: boolean;
}

export interface FiscalDiagnostic {
  docType: 'NFE_55' | 'NFSE_NACIONAL' | 'UNKNOWN';
  status: 'conforme' | 'aviso' | 'erro';
  summary: {
    emitter: string;
    recipient: string;
    docNumber: string;
    vTotal: number;
    vIBS: number;
    vCBS: number;
    vIS?: number;
    vISSQN?: number;
  };
  issues: FiscalIssue[];
  // Campos detalhados para visualização avançada
  extra?: {
    rawKey?: string;
    keyValidation?: { valid: boolean; reason?: string };
    itemsCount: number;
    items: FiscalItemDetail[];
    totals: {
      declared: {
        vProd: number;
        vNF: number;
        vIBSUF: number;
        vIBSMun: number;
        vCBS: number;
        vIS: number;
        vISSQN: number;
      };
      calculated: {
        vIBSUF: number;
        vIBSMun: number;
        vCBS: number;
        vIS: number;
        vISSQN: number;
      };
    };
    year2026TestAlert: boolean;
    emissionDate?: string;
    naturezaOperacao?: string;
  };
}

// Utilitário para arredondamento fiscal a 2 casas decimais (padrão SEFAZ)
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// Utilitário para parse de números aceitando ponto ou vírgula
export function parseFiscalNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  // Se contiver vírgula e ponto (ex: 1.250,50)
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Se contiver apenas vírgula (ex: 1250,50)
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
}

/**
 * Validação de Chave de Acesso da NF-e Modelo 55 (44 dígitos)
 * Algoritmo do Módulo 11 (Pesos de 2 a 9 da direita para a esquerda)
 */
export function validateChaveNFe(chave: string): { valid: boolean; reason?: string; uf?: string; aamm?: string; cnpj?: string; mod?: string; serie?: string; nNF?: string } {
  const clean = chave.replace(/\D/g, '');
  if (!clean) return { valid: false, reason: 'Chave de acesso não informada.' };
  if (clean.length !== 44) {
    return { valid: false, reason: `Chave possui ${clean.length} dígitos (esperado: 44 dígitos).` };
  }

  const mod = clean.substring(20, 22);
  if (mod !== '55') {
    return { valid: false, reason: `Modelo indicado na chave é ${mod} (esperado Modelo 55 - NF-e).` };
  }

  // Cálculo do dígito verificador (DV)
  const base43 = clean.substring(0, 43);
  const dvInformado = parseInt(clean.charAt(43), 10);

  let soma = 0;
  let peso = 2;
  for (let i = base43.length - 1; i >= 0; i--) {
    soma += parseInt(base43.charAt(i), 10) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }

  const resto = soma % 11;
  const dvEsperado = (resto === 0 || resto === 1) ? 0 : (11 - resto);

  if (dvInformado !== dvEsperado) {
    return {
      valid: false,
      reason: `Dígito verificador inválido: informado ${dvInformado}, calculado ${dvEsperado}.`
    };
  }

  return {
    valid: true,
    uf: clean.substring(0, 2),
    aamm: clean.substring(2, 6),
    cnpj: clean.substring(6, 20),
    mod,
    serie: clean.substring(22, 25),
    nNF: clean.substring(25, 34)
  };
}

/**
 * Validação de Chave de Acesso do DANFSe Nacional (50 dígitos)
 */
export function validateChaveNFSeNacional(chave: string): { valid: boolean; reason?: string } {
  const clean = chave.replace(/\D/g, '');
  if (!clean) return { valid: false, reason: 'Chave da NFS-e não informada.' };
  if (clean.length !== 50) {
    return { valid: false, reason: `Chave NFS-e Nacional possui ${clean.length} dígitos (esperado: 50 dígitos).` };
  }
  return { valid: true };
}

/**
 * Utilitário de Extração de Tags XML seguro (com suporte a namespaces)
 */
function getTagText(xmlDoc: Document | Element, tagName: string): string {
  // Procura direta
  let el = xmlDoc.getElementsByTagName(tagName)[0];
  if (el && el.textContent) return el.textContent.trim();

  // Procura ignorando namespace (ex: nfe:vBC ou ns2:vBC)
  const allElements = xmlDoc.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const item = allElements[i];
    const localName = item.localName || item.nodeName.split(':').pop();
    if (localName?.toLowerCase() === tagName.toLowerCase() && item.textContent) {
      return item.textContent.trim();
    }
  }
  return '';
}

function getElements(xmlDoc: Document | Element, tagName: string): Element[] {
  const list = xmlDoc.getElementsByTagName(tagName);
  if (list && list.length > 0) return Array.from(list);

  const matched: Element[] = [];
  const allElements = xmlDoc.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const item = allElements[i];
    const localName = item.localName || item.nodeName.split(':').pop();
    if (localName?.toLowerCase() === tagName.toLowerCase()) {
      matched.push(item);
    }
  }
  return matched;
}

/**
 * Função de Detecção do Tipo de Documento
 */
export function detectDocumentType(input: string): 'NFE_55' | 'NFSE_NACIONAL' | 'UNKNOWN' {
  const lower = input.toLowerCase();

  // Padrão NFS-e Nacional / DPS
  if (
    lower.includes('<dps') || 
    lower.includes('<nfse') || 
    lower.includes('<infdps') || 
    lower.includes('<compnfse') ||
    lower.includes('"infdps"') ||
    lower.includes('"danfse"')
  ) {
    return 'NFSE_NACIONAL';
  }

  // Padrão NF-e Modelo 55
  if (
    lower.includes('<nfe') || 
    lower.includes('<infnfe') || 
    lower.includes('mod="55"') || 
    lower.includes('<mod>55</mod>') ||
    lower.includes('"mod": 55') ||
    lower.includes('"mod": "55"')
  ) {
    return 'NFE_55';
  }

  return 'UNKNOWN';
}

/**
 * Motor de Auditoria Fiscal Principal
 */
export function auditFiscalDocument(rawInput: string): FiscalDiagnostic {
  const issues: FiscalIssue[] = [];
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return {
      docType: 'UNKNOWN',
      status: 'erro',
      summary: {
        emitter: 'Não identificado',
        recipient: 'Não identificado',
        docNumber: '-',
        vTotal: 0,
        vIBS: 0,
        vCBS: 0
      },
      issues: [{
        type: 'erro',
        tagOrField: 'INPUT',
        title: 'Documento Vazio',
        description: 'Nenhum conteúdo XML ou JSON foi fornecido para auditoria.'
      }]
    };
  }

  // Identificação do Formato (JSON ou XML)
  let isJson = false;
  let jsonData: any = null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      jsonData = JSON.parse(trimmed);
      isJson = true;
    } catch {
      // Continua como tentativa de XML
    }
  }

  if (isJson) {
    return auditJsonPayload(jsonData);
  }

  // Parse XML via DOMParser do browser
  let xmlDoc: Document;
  try {
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(trimmed, 'application/xml');
    const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parserError) {
      return {
        docType: 'UNKNOWN',
        status: 'erro',
        summary: {
          emitter: 'Não identificado',
          recipient: 'Não identificado',
          docNumber: '-',
          vTotal: 0,
          vIBS: 0,
          vCBS: 0
        },
        issues: [{
          type: 'erro',
          tagOrField: 'XML_SYNTAX',
          title: 'Erro de Estrutura XML',
          description: `O XML fornecido é inválido: ${parserError.textContent?.slice(0, 200)}`
        }]
      };
    }
  } catch (err: any) {
    return {
      docType: 'UNKNOWN',
      status: 'erro',
      summary: {
        emitter: 'Não identificado',
        recipient: 'Não identificado',
        docNumber: '-',
        vTotal: 0,
        vIBS: 0,
        vCBS: 0
      },
      issues: [{
        type: 'erro',
        tagOrField: 'XML_PARSER',
        title: 'Falha no Parser XML',
        description: `Não foi possível processar o documento: ${err.message || String(err)}`
      }]
    };
  }

  const detectedType = detectDocumentType(trimmed);

  if (detectedType === 'NFE_55') {
    return auditNFe55Xml(xmlDoc, trimmed);
  } else if (detectedType === 'NFSE_NACIONAL') {
    return auditNFSeNacionalXml(xmlDoc, trimmed);
  }

  // Se não foi identificado expressamente, tenta auditar como NF-e 55 com aviso de tipo
  issues.push({
    type: 'aviso',
    tagOrField: 'docType',
    title: 'Tipo de Documento Não Reconhecido Imediatamente',
    description: 'Tentando realizar a auditoria com base na estrutura de tags encontradas.'
  });

  const hasNFeTags = getElements(xmlDoc, 'det').length > 0 || getElements(xmlDoc, 'total').length > 0;
  if (hasNFeTags) {
    return auditNFe55Xml(xmlDoc, trimmed);
  }

  return {
    docType: 'UNKNOWN',
    status: 'erro',
    summary: {
      emitter: 'Não identificado',
      recipient: 'Não identificado',
      docNumber: '-',
      vTotal: 0,
      vIBS: 0,
      vCBS: 0
    },
    issues: [{
      type: 'erro',
      tagOrField: 'ROOT',
      title: 'Documento Não Reconhecido',
      description: 'O conteúdo não corresponde a uma NF-e (Modelo 55) nem a um DPS/NFS-e Padrão Nacional.'
    }]
  };
}

/**
 * Auditoria de NF-e Modelo 55 - NT 2026.010 (Reforma Tributária IBS/CBS/IS)
 */
function auditNFe55Xml(xmlDoc: Document, rawXml: string): FiscalDiagnostic {
  const issues: FiscalIssue[] = [];

  // 1. Chave de Acesso e Cabeçalho
  const infNFe = getElements(xmlDoc, 'infNFe')[0];
  const rawId = infNFe?.getAttribute('Id') || '';
  const chNFe = rawId.replace(/^NFe/, '') || getTagText(xmlDoc, 'chNFe');

  if (chNFe) {
    const keyVal = validateChaveNFe(chNFe);
    if (!keyVal.valid) {
      issues.push({
        type: 'erro',
        tagOrField: 'chNFe',
        title: 'Chave de Acesso da NF-e Inválida',
        description: keyVal.reason || 'Dígito verificador ou tamanho incorreto.',
        expected: '44 dígitos válidos com DV mod 11',
        found: chNFe
      });
    } else {
      issues.push({
        type: 'sucesso',
        tagOrField: 'chNFe',
        title: 'Chave de Acesso Válida',
        description: `Chave Modelo ${keyVal.mod} UF ${keyVal.uf} série ${keyVal.serie} e nNF ${keyVal.nNF} com DV autêntico.`
      });
    }
  } else {
    issues.push({
      type: 'aviso',
      tagOrField: 'chNFe',
      title: 'Chave de Acesso não informada',
      description: 'Documento pode ser um rascunho de pré-envio ainda sem chave assinada.'
    });
  }

  // Identificação do Emitente e Destinatário
  const emitEl = getElements(xmlDoc, 'emit')[0];
  const destEl = getElements(xmlDoc, 'dest')[0];
  const ideEl = getElements(xmlDoc, 'ide')[0];

  const emitterName = emitEl ? (getTagText(emitEl, 'xNome') || getTagText(emitEl, 'xFant') || getTagText(emitEl, 'CNPJ')) : 'Emitente não localizado';
  const recipientName = destEl ? (getTagText(destEl, 'xNome') || getTagText(destEl, 'CNPJ') || getTagText(destEl, 'CPF')) : 'Consumidor / Não informado';
  const docNumber = ideEl ? (getTagText(ideEl, 'nNF') || 'S/N') : 'S/N';
  const emissionDate = ideEl ? (getTagText(ideEl, 'dhEmi') || getTagText(ideEl, 'dEmi')) : undefined;
  const natOp = ideEl ? getTagText(ideEl, 'natOp') : undefined;

  // 2. Validação dos Itens e do Grupo UB (Reforma Tributária NT 2026.010)
  const detElements = getElements(xmlDoc, 'det');
  if (detElements.length === 0) {
    issues.push({
      type: 'erro',
      tagOrField: 'det',
      title: 'Nenhum Item Encontrado',
      description: 'O XML não contém a tag obrigatória <det> com produtos ou serviços.'
    });
  }

  const itemsList: FiscalItemDetail[] = [];
  let sumItemsIBSUF = 0;
  let sumItemsIBSMun = 0;
  let sumItemsCBS = 0;
  let sumItemsIS = 0;
  let hasUbInAnyItem = false;
  let is2026TestAlert = false;

  detElements.forEach((det, index) => {
    const itemNum = parseInt(det.getAttribute('nItem') || String(index + 1), 10);
    const prodEl = getElements(det, 'prod')[0];
    const xProd = prodEl ? getTagText(prodEl, 'xProd') : `Item ${itemNum}`;
    const vProd = prodEl ? parseFiscalNumber(getTagText(prodEl, 'vProd')) : 0;
    const ncm = prodEl ? getTagText(prodEl, 'NCM') : '';

    // Grupo de Impostos da Reforma Tributária (NT 2026.010)
    // Pode vir como <gUB>, <UB>, <IBSCBS>, <IBS>, <CBS>
    const impostoEl = getElements(det, 'imposto')[0] || det;
    const ubEl = getElements(impostoEl, 'UB')[0] || 
                 getElements(impostoEl, 'gUB')[0] || 
                 getElements(impostoEl, 'IBSCBS')[0] ||
                 getElements(impostoEl, 'IBS')[0] ||
                 impostoEl;

    const cClassTrib = getTagText(ubEl, 'cClassTrib') || getTagText(impostoEl, 'cClassTrib');
    const vBC = parseFiscalNumber(getTagText(ubEl, 'vBC') || getTagText(impostoEl, 'vBC') || vProd);

    // Alíquotas e Valores de IBS
    const pIBSUF = parseFiscalNumber(getTagText(ubEl, 'pIBSUF') || getTagText(impostoEl, 'pIBSUF'));
    const vIBSUF = parseFiscalNumber(getTagText(ubEl, 'vIBSUF') || getTagText(impostoEl, 'vIBSUF'));
    const pIBSMun = parseFiscalNumber(getTagText(ubEl, 'pIBSMun') || getTagText(impostoEl, 'pIBSMun'));
    const vIBSMun = parseFiscalNumber(getTagText(ubEl, 'vIBSMun') || getTagText(impostoEl, 'vIBSMun'));

    // Alíquotas e Valores de CBS
    const pCBS = parseFiscalNumber(getTagText(ubEl, 'pCBS') || getTagText(impostoEl, 'pCBS'));
    const vCBS = parseFiscalNumber(getTagText(ubEl, 'vCBS') || getTagText(impostoEl, 'vCBS'));

    // Alíquota Efetiva (se houver redução)
    const pAliqEfet = parseFiscalNumber(getTagText(ubEl, 'pAliqEfet') || getTagText(impostoEl, 'pAliqEfet'));
    const pAliqEfetUF = parseFiscalNumber(getTagText(ubEl, 'pAliqEfetUF') || getTagText(impostoEl, 'pAliqEfetUF')) || (pAliqEfet || pIBSUF);
    const pAliqEfetMun = parseFiscalNumber(getTagText(ubEl, 'pAliqEfetMun') || getTagText(impostoEl, 'pAliqEfetMun')) || (pAliqEfet || pIBSMun);
    const pAliqEfetCBS = parseFiscalNumber(getTagText(ubEl, 'pAliqEfetCBS') || getTagText(impostoEl, 'pAliqEfetCBS')) || (pAliqEfet || pCBS);

    // Imposto Seletivo (IS)
    const isEl = getElements(impostoEl, 'IS')[0] || impostoEl;
    const vBCIS = parseFiscalNumber(getTagText(isEl, 'vBCIS') || vBC);
    const pIS = parseFiscalNumber(getTagText(isEl, 'pIS'));
    const vIS = parseFiscalNumber(getTagText(isEl, 'vIS'));

    // Verifica se há tags da reforma no item
    const hasReformaTags = (vBC > 0 || pIBSUF > 0 || pCBS > 0 || vIBSUF > 0 || vCBS > 0 || cClassTrib !== '');
    if (hasReformaTags) {
      hasUbInAnyItem = true;
    }

    // Cálculos matemáticos conforme NT 2026.010
    const calcIBSUF = roundCurrency(vBC * (pAliqEfetUF / 100));
    const calcIBSMun = roundCurrency(vBC * (pAliqEfetMun / 100));
    const calcCBS = roundCurrency(vBC * (pAliqEfetCBS / 100));
    const calcIS = pIS > 0 ? roundCurrency(vBCIS * (pIS / 100)) : 0;

    let itemHasError = false;
    let itemHasWarning = false;

    // Conferência do IBS Estadual (UF)
    if (Math.abs(vIBSUF - calcIBSUF) > 0.01) {
      issues.push({
        type: 'erro',
        tagOrField: `det[${itemNum}].vIBSUF`,
        title: `Divergência Matemática no IBS Estadual (Item ${itemNum})`,
        description: `vIBSUF declarado não confere com vBC (${vBC.toFixed(2)}) * Alíq (${pAliqEfetUF}%).`,
        expected: calcIBSUF.toFixed(2),
        found: vIBSUF.toFixed(2)
      });
      itemHasError = true;
    }

    // Conferência do IBS Municipal
    if (Math.abs(vIBSMun - calcIBSMun) > 0.01) {
      issues.push({
        type: 'erro',
        tagOrField: `det[${itemNum}].vIBSMun`,
        title: `Divergência Matemática no IBS Municipal (Item ${itemNum})`,
        description: `vIBSMun declarado não confere com vBC (${vBC.toFixed(2)}) * Alíq (${pAliqEfetMun}%).`,
        expected: calcIBSMun.toFixed(2),
        found: vIBSMun.toFixed(2)
      });
      itemHasError = true;
    }

    // Conferência da CBS
    if (Math.abs(vCBS - calcCBS) > 0.01) {
      issues.push({
        type: 'erro',
        tagOrField: `det[${itemNum}].vCBS`,
        title: `Divergência Matemática na CBS (Item ${itemNum})`,
        description: `vCBS declarado não confere com vBC (${vBC.toFixed(2)}) * Alíq (${pAliqEfetCBS}%).`,
        expected: calcCBS.toFixed(2),
        found: vCBS.toFixed(2)
      });
      itemHasError = true;
    }

    // Conferência do Imposto Seletivo (se informado)
    if (pIS > 0 && Math.abs(vIS - calcIS) > 0.01) {
      issues.push({
        type: 'erro',
        tagOrField: `det[${itemNum}].vIS`,
        title: `Divergência no Imposto Seletivo (Item ${itemNum})`,
        description: `vIS informado não confere com vBCIS (${vBCIS.toFixed(2)}) * pIS (${pIS}%).`,
        expected: calcIS.toFixed(2),
        found: vIS.toFixed(2)
      });
      itemHasError = true;
    }

    // Regra temporal de teste (Ano 2026): alíquota padrão 0,1% IBS e 0,9% CBS
    const totalAliqIBS = pIBSUF + pIBSMun;
    if (hasReformaTags) {
      if (Math.abs(pCBS - 0.9) > 0.001 || Math.abs(totalAliqIBS - 0.1) > 0.001) {
        is2026TestAlert = true;
        itemHasWarning = true;
      }
    }

    sumItemsIBSUF += vIBSUF;
    sumItemsIBSMun += vIBSMun;
    sumItemsCBS += vCBS;
    sumItemsIS += vIS;

    itemsList.push({
      itemNumber: itemNum,
      description: xProd,
      ncm,
      cClassTrib,
      vProd,
      vBC,
      pIBSUF,
      vIBSUF,
      pIBSMun,
      vIBSMun,
      pCBS,
      vCBS,
      pIS: pIS > 0 ? pIS : undefined,
      vIS: vIS > 0 ? vIS : undefined,
      pAliqEfet,
      pAliqEfetUF,
      pAliqEfetMun,
      pAliqEfetCBS,
      calcIBSUF,
      calcIBSMun,
      calcCBS,
      calcIS,
      hasErrors: itemHasError,
      hasWarnings: itemHasWarning
    });
  });

  // Alerta da Regra Temporal de Teste 2026
  if (is2026TestAlert) {
    issues.push({
      type: 'aviso',
      tagOrField: 'REGRA_TEMPORAL_2026',
      title: 'Alíquotas em Desacordo com a Fase de Testes de 2026 (NT 2026.010)',
      description: 'No ano-calendário de 2026, as alíquotas de teste da Reforma Tributária são fixadas em 0,1% para o IBS (estadual/municipal) e 0,9% para a CBS. Foram identificadas alíquotas divergentes nesses itens.',
      expected: 'IBS: 0,10% | CBS: 0,90%',
      found: 'Alíquotas divergentes informadas nos itens'
    });
  }

  if (!hasUbInAnyItem && detElements.length > 0) {
    issues.push({
      type: 'erro',
      tagOrField: 'det.imposto.UB',
      title: 'Ausência do Grupo UB da Reforma Tributária',
      description: 'Nenhum dos itens informados contém os grupos de tributação da Reforma Tributária (<UB> ou <gUB> com cClassTrib, vBC, pIBS, pCBS) exigidos pela NT 2026.010.'
    });
  }

  // 3. Validação dos Totalizadores do Bloco W (Total da NF-e)
  const totalEl = getElements(xmlDoc, 'total')[0];
  const icmsTot = totalEl ? getElements(totalEl, 'ICMSTot')[0] : null;
  const ubTot = totalEl ? (getElements(totalEl, 'UBTot')[0] || getElements(totalEl, 'IBSCBSTot')[0]) : null;

  const vNF = parseFiscalNumber(getTagText(totalEl || xmlDoc, 'vNF') || getTagText(icmsTot || xmlDoc, 'vNF'));
  const vProdTotal = parseFiscalNumber(getTagText(icmsTot || xmlDoc, 'vProd'));

  // W56 - Total da CBS
  const declaredTotalCBS = parseFiscalNumber(
    getTagText(ubTot || totalEl || xmlDoc, 'vCBS') || 
    getTagText(icmsTot || xmlDoc, 'vCBS')
  );

  // W41 - Total do IBS Estadual (UF)
  const declaredTotalIBSUF = parseFiscalNumber(
    getTagText(ubTot || totalEl || xmlDoc, 'vIBSUF') || 
    getTagText(icmsTot || xmlDoc, 'vIBSUF')
  );

  // W46 - Total do IBS Municipal
  const declaredTotalIBSMun = parseFiscalNumber(
    getTagText(ubTot || totalEl || xmlDoc, 'vIBSMun') || 
    getTagText(icmsTot || xmlDoc, 'vIBSMun')
  );

  // Total do Imposto Seletivo
  const declaredTotalIS = parseFiscalNumber(
    getTagText(ubTot || totalEl || xmlDoc, 'vIS') || 
    getTagText(icmsTot || xmlDoc, 'vIS')
  );

  const roundedSumIBSUF = roundCurrency(sumItemsIBSUF);
  const roundedSumIBSMun = roundCurrency(sumItemsIBSMun);
  const roundedSumCBS = roundCurrency(sumItemsCBS);
  const roundedSumIS = roundCurrency(sumItemsIS);

  // Verificação Bloco W vs Soma dos Itens: CBS (W56)
  if (Math.abs(declaredTotalCBS - roundedSumCBS) > 0.01) {
    issues.push({
      type: 'erro',
      tagOrField: 'W56 (vCBS)',
      title: 'Totalizador da CBS (Bloco W56) Divergente da Soma dos Itens',
      description: 'O valor total de CBS declarado no totalizador não confere com o somatório dos itens.',
      expected: `R$ ${roundedSumCBS.toFixed(2)}`,
      found: `R$ ${declaredTotalCBS.toFixed(2)}`
    });
  } else if (roundedSumCBS > 0) {
    issues.push({
      type: 'sucesso',
      tagOrField: 'W56 (vCBS)',
      title: 'Totalizador de CBS em Conformidade',
      description: `Somatório dos itens (R$ ${roundedSumCBS.toFixed(2)}) bate exatamente com o Bloco W.`
    });
  }

  // Verificação Bloco W vs Soma dos Itens: IBS Estadual (W41)
  if (Math.abs(declaredTotalIBSUF - roundedSumIBSUF) > 0.01) {
    issues.push({
      type: 'erro',
      tagOrField: 'W41 (vIBSUF)',
      title: 'Totalizador do IBS Estadual (Bloco W41) Divergente da Soma dos Itens',
      description: 'O total de IBS Estadual declarado no Bloco W não confere com a soma dos itens.',
      expected: `R$ ${roundedSumIBSUF.toFixed(2)}`,
      found: `R$ ${declaredTotalIBSUF.toFixed(2)}`
    });
  } else if (roundedSumIBSUF > 0) {
    issues.push({
      type: 'sucesso',
      tagOrField: 'W41 (vIBSUF)',
      title: 'Totalizador de IBS Estadual em Conformidade',
      description: `Somatório dos itens (R$ ${roundedSumIBSUF.toFixed(2)}) confere com o Bloco W41.`
    });
  }

  // Verificação Bloco W vs Soma dos Itens: IBS Municipal (W46)
  if (Math.abs(declaredTotalIBSMun - roundedSumIBSMun) > 0.01) {
    issues.push({
      type: 'erro',
      tagOrField: 'W46 (vIBSMun)',
      title: 'Totalizador do IBS Municipal (Bloco W46) Divergente da Soma dos Itens',
      description: 'O total de IBS Municipal declarado no Bloco W não confere com a soma dos itens.',
      expected: `R$ ${roundedSumIBSMun.toFixed(2)}`,
      found: `R$ ${declaredTotalIBSMun.toFixed(2)}`
    });
  } else if (roundedSumIBSMun > 0) {
    issues.push({
      type: 'sucesso',
      tagOrField: 'W46 (vIBSMun)',
      title: 'Totalizador de IBS Municipal em Conformidade',
      description: `Somatório dos itens (R$ ${roundedSumIBSMun.toFixed(2)}) confere com o Bloco W46.`
    });
  }

  // Determinação do Status Global
  const hasError = issues.some(i => i.type === 'erro');
  const hasWarning = issues.some(i => i.type === 'aviso');
  const status: 'conforme' | 'aviso' | 'erro' = hasError ? 'erro' : (hasWarning ? 'aviso' : 'conforme');

  return {
    docType: 'NFE_55',
    status,
    summary: {
      emitter: emitterName,
      recipient: recipientName,
      docNumber,
      vTotal: vNF || vProdTotal,
      vIBS: roundCurrency(declaredTotalIBSUF + declaredTotalIBSMun) || roundCurrency(roundedSumIBSUF + roundedSumIBSMun),
      vCBS: declaredTotalCBS || roundedSumCBS,
      vIS: declaredTotalIS || roundedSumIS
    },
    issues,
    extra: {
      rawKey: chNFe,
      keyValidation: chNFe ? validateChaveNFe(chNFe) : undefined,
      itemsCount: detElements.length,
      items: itemsList,
      totals: {
        declared: {
          vProd: vProdTotal,
          vNF,
          vIBSUF: declaredTotalIBSUF,
          vIBSMun: declaredTotalIBSMun,
          vCBS: declaredTotalCBS,
          vIS: declaredTotalIS,
          vISSQN: 0
        },
        calculated: {
          vIBSUF: roundedSumIBSUF,
          vIBSMun: roundedSumIBSMun,
          vCBS: roundedSumCBS,
          vIS: roundedSumIS,
          vISSQN: 0
        }
      },
      year2026TestAlert: is2026TestAlert,
      emissionDate,
      naturezaOperacao: natOp
    }
  };
}

/**
 * Auditoria de NFS-e Padrão Nacional / DPS - NT 008 (Serviços e Reforma Tributária)
 */
function auditNFSeNacionalXml(xmlDoc: Document, rawXml: string): FiscalDiagnostic {
  const issues: FiscalIssue[] = [];

  // 1. Chave de Acesso (50 dígitos) ou Identificação DPS
  const infNFSe = getElements(xmlDoc, 'infNFSe')[0] || getElements(xmlDoc, 'CompNFSe')[0];
  const infDPS = getElements(xmlDoc, 'infDPS')[0] || xmlDoc;
  
  const rawKey = infNFSe?.getAttribute('Id')?.replace(/\D/g, '') || 
                 getTagText(xmlDoc, 'chNFSe') || 
                 getTagText(xmlDoc, 'chaveAcesso');

  if (rawKey) {
    const keyVal = validateChaveNFSeNacional(rawKey);
    if (!keyVal.valid) {
      issues.push({
        type: 'erro',
        tagOrField: 'chNFSe',
        title: 'Chave de Acesso da NFS-e Nacional Inválida',
        description: keyVal.reason || 'Comprimento ou formato incorreto (deve conter 50 dígitos).',
        expected: '50 dígitos numéricos',
        found: rawKey
      });
    } else {
      issues.push({
        type: 'sucesso',
        tagOrField: 'chNFSe',
        title: 'Chave NFS-e Nacional Válida',
        description: 'Chave de 50 dígitos no Padrão Nacional devidamente identificada.'
      });
    }
  } else {
    // Se não tem a chave da nota já emitida, verifica se é uma DPS válida
    const nDPS = getTagText(infDPS, 'nDPS') || getTagText(xmlDoc, 'nDPS');
    const serie = getTagText(infDPS, 'serie') || getTagText(xmlDoc, 'serie');
    if (nDPS) {
      issues.push({
        type: 'sucesso',
        tagOrField: 'infDPS',
        title: 'Declaração de Prestação de Serviços (DPS) Identificada',
        description: `Rascunho de DPS número ${nDPS}, série ${serie || '1'} pronto para auditoria prévia de emissão.`
      });
    } else {
      issues.push({
        type: 'aviso',
        tagOrField: 'chNFSe / nDPS',
        title: 'Identificador do DPS / NFS-e Não Informado',
        description: 'Não foi localizada a chave de 50 dígitos nem o número do DPS.'
      });
    }
  }

  // 2. Prestador e Tomador
  const prestEl = getElements(xmlDoc, 'prest')[0] || getElements(xmlDoc, 'prestador')[0] || getElements(xmlDoc, 'emit')[0];
  const tomaEl = getElements(xmlDoc, 'toma')[0] || getElements(xmlDoc, 'tomador')[0] || getElements(xmlDoc, 'dest')[0];

  const emitterName = prestEl ? (getTagText(prestEl, 'xNome') || getTagText(prestEl, 'xRazao') || getTagText(prestEl, 'CNPJ') || getTagText(prestEl, 'CPF')) : 'Prestador não informado';
  const recipientName = tomaEl ? (getTagText(tomaEl, 'xNome') || getTagText(tomaEl, 'xRazao') || getTagText(tomaEl, 'CNPJ') || getTagText(tomaEl, 'CPF')) : 'Tomador de Serviços';
  const docNumber = getTagText(xmlDoc, 'nNFSe') || getTagText(infDPS, 'nDPS') || getTagText(xmlDoc, 'nDPS') || 'S/N';
  const emissionDate = getTagText(xmlDoc, 'dhEmi') || getTagText(infDPS, 'dhEmi') || getTagText(xmlDoc, 'dCompet');

  // 3. Valores dos Serviços e ISSQN Municipal
  const servEl = getElements(xmlDoc, 'serv')[0] || getElements(xmlDoc, 'valores')[0] || xmlDoc;
  const valoresEl = getElements(xmlDoc, 'valores')[0] || servEl;

  const vServ = parseFiscalNumber(getTagText(valoresEl, 'vServ') || getTagText(servEl, 'vServPrest'));
  const vDescIncond = parseFiscalNumber(getTagText(valoresEl, 'vDescIncond'));
  const vDed = parseFiscalNumber(getTagText(valoresEl, 'vDed') || getTagText(valoresEl, 'vDeducao'));
  const declaredBCISS = parseFiscalNumber(getTagText(valoresEl, 'vBC') || getTagText(valoresEl, 'vBCISS'));
  const pAliqISS = parseFiscalNumber(getTagText(valoresEl, 'pAliq') || getTagText(valoresEl, 'pAliqISS'));
  const declaredVISSQN = parseFiscalNumber(getTagText(valoresEl, 'vISS') || getTagText(valoresEl, 'vISSQN'));
  const vTotNF = parseFiscalNumber(getTagText(valoresEl, 'vTotNF') || getTagText(valoresEl, 'vLiq') || vServ);

  // Base esperada do ISSQN = vServ - vDed - vDescIncond
  const expectedBCISS = roundCurrency(Math.max(0, vServ - vDed - vDescIncond));
  if (declaredBCISS > 0 && Math.abs(declaredBCISS - expectedBCISS) > 0.01) {
    issues.push({
      type: 'erro',
      tagOrField: 'vBCISS',
      title: 'Base de Cálculo do ISSQN Inconsistente',
      description: 'A base informada diverge do valor dos serviços deduzido das parcelas legais incondicionadas.',
      expected: `R$ ${expectedBCISS.toFixed(2)}`,
      found: `R$ ${declaredBCISS.toFixed(2)}`
    });
  }

  // Alíquota ISSQN (entre 2% e 5% conforme Lei Complementar 116/2003)
  if (pAliqISS > 0) {
    if (pAliqISS < 2.0 || pAliqISS > 5.0) {
      issues.push({
        type: 'aviso',
        tagOrField: 'pAliqISS',
        title: 'Alíquota de ISSQN Fora dos Limites Constitucionais (LC 116/03)',
        description: `A alíquota de ISSQN informada (${pAliqISS}%) está fora da faixa constitucional de 2% a 5%, salvo regimes especiais.`,
        expected: 'Entre 2,00% e 5,00%',
        found: `${pAliqISS.toFixed(2)}%`
      });
    }

    const baseToUse = declaredBCISS > 0 ? declaredBCISS : expectedBCISS;
    const expectedISS = roundCurrency(baseToUse * (pAliqISS / 100));

    if (declaredVISSQN > 0 && Math.abs(declaredVISSQN - expectedISS) > 0.01) {
      issues.push({
        type: 'erro',
        tagOrField: 'vISSQN',
        title: 'Cálculo Divergente do ISSQN',
        description: `vISSQN declarado não bate com Base (${baseToUse.toFixed(2)}) * Alíquota (${pAliqISS}%).`,
        expected: `R$ ${expectedISS.toFixed(2)}`,
        found: `R$ ${declaredVISSQN.toFixed(2)}`
      });
    } else {
      issues.push({
        type: 'sucesso',
        tagOrField: 'vISSQN',
        title: 'ISSQN Municipal em Conformidade',
        description: `Cálculo do imposto municipal conferido com base de R$ ${baseToUse.toFixed(2)} a ${pAliqISS}%.`
      });
    }
  }

  // 4. Tributos da Reforma Tributária no DANFSe (NT 008)
  // Tags: <tribReforma>, <IBSMun>, <IBSUF>, <CBS>, <pAliqEfetMun>, <pAliqEfetUF>, <pAliqEfetCBS>
  const reformaEl = getElements(xmlDoc, 'tribReforma')[0] || 
                    getElements(xmlDoc, 'reforma')[0] || 
                    getElements(xmlDoc, 'IBSCBS')[0] || 
                    valoresEl;

  const vBCReforma = parseFiscalNumber(getTagText(reformaEl, 'vBC') || vServ);

  // Alíquotas e Valores Efetivos da Reforma
  const pAliqEfetMun = parseFiscalNumber(getTagText(reformaEl, 'pAliqEfetMun') || getTagText(reformaEl, 'pIBSMun'));
  const vIBSMun = parseFiscalNumber(getTagText(reformaEl, 'vIBSMun'));

  const pAliqEfetUF = parseFiscalNumber(getTagText(reformaEl, 'pAliqEfetUF') || getTagText(reformaEl, 'pIBSUF'));
  const vIBSUF = parseFiscalNumber(getTagText(reformaEl, 'vIBSUF'));

  const pAliqEfetCBS = parseFiscalNumber(getTagText(reformaEl, 'pAliqEfetCBS') || getTagText(reformaEl, 'pCBS'));
  const vCBS = parseFiscalNumber(getTagText(reformaEl, 'vCBS'));

  const expectedIBSMun = roundCurrency(vBCReforma * (pAliqEfetMun / 100));
  const expectedIBSUF = roundCurrency(vBCReforma * (pAliqEfetUF / 100));
  const expectedCBS = roundCurrency(vBCReforma * (pAliqEfetCBS / 100));

  if (pAliqEfetMun > 0 && Math.abs(vIBSMun - expectedIBSMun) > 0.01) {
    issues.push({
      type: 'erro',
      tagOrField: 'vIBSMun (NFS-e NT 008)',
      title: 'Cálculo Divergente de IBS Municipal no Serviço',
      description: `vIBSMun (${vIBSMun}) não confere com Base (${vBCReforma}) * Alíquota Efetiva (${pAliqEfetMun}%).`,
      expected: `R$ ${expectedIBSMun.toFixed(2)}`,
      found: `R$ ${vIBSMun.toFixed(2)}`
    });
  }

  if (pAliqEfetUF > 0 && Math.abs(vIBSUF - expectedIBSUF) > 0.01) {
    issues.push({
      type: 'erro',
      tagOrField: 'vIBSUF (NFS-e NT 008)',
      title: 'Cálculo Divergente de IBS Estadual no Serviço',
      description: `vIBSUF (${vIBSUF}) não confere com Base (${vBCReforma}) * Alíquota Efetiva (${pAliqEfetUF}%).`,
      expected: `R$ ${expectedIBSUF.toFixed(2)}`,
      found: `R$ ${vIBSUF.toFixed(2)}`
    });
  }

  if (pAliqEfetCBS > 0 && Math.abs(vCBS - expectedCBS) > 0.01) {
    issues.push({
      type: 'erro',
      tagOrField: 'vCBS (NFS-e NT 008)',
      title: 'Cálculo Divergente de CBS no Serviço',
      description: `vCBS (${vCBS}) não confere com Base (${vBCReforma}) * Alíquota Efetiva (${pAliqEfetCBS}%).`,
      expected: `R$ ${expectedCBS.toFixed(2)}`,
      found: `R$ ${vCBS.toFixed(2)}`
    });
  }

  // 5. Amarração do Valor Total da Nota com Retenções
  const vRetPIS = parseFiscalNumber(getTagText(valoresEl, 'vRetPIS') || getTagText(valoresEl, 'vPIS'));
  const vRetCOFINS = parseFiscalNumber(getTagText(valoresEl, 'vRetCOFINS') || getTagText(valoresEl, 'vCOFINS'));
  const vRetCSLL = parseFiscalNumber(getTagText(valoresEl, 'vRetCSLL') || getTagText(valoresEl, 'vCSLL'));
  const vRetIRRF = parseFiscalNumber(getTagText(valoresEl, 'vRetIRRF') || getTagText(valoresEl, 'vIRRF'));
  const vRetISS = parseFiscalNumber(getTagText(valoresEl, 'vRetISS') || getTagText(valoresEl, 'vISSRetido'));

  const totalRetencoes = roundCurrency(vRetPIS + vRetCOFINS + vRetCSLL + vRetIRRF + vRetISS);
  const expectedLiq = roundCurrency(vServ - vDescIncond - totalRetencoes);
  const declaredLiq = parseFiscalNumber(getTagText(valoresEl, 'vLiq'));

  if (declaredLiq > 0 && Math.abs(declaredLiq - expectedLiq) > 0.01) {
    issues.push({
      type: 'erro',
      tagOrField: 'vLiq (Valor Líquido)',
      title: 'Amarração do Valor Líquido com Retenções Divergente',
      description: 'O valor líquido da NFS-e não bate com Valor dos Serviços deduzido dos descontos e retenções federais/municipais.',
      expected: `R$ ${expectedLiq.toFixed(2)}`,
      found: `R$ ${declaredLiq.toFixed(2)}`
    });
  }

  const hasError = issues.some(i => i.type === 'erro');
  const hasWarning = issues.some(i => i.type === 'aviso');
  const status: 'conforme' | 'aviso' | 'erro' = hasError ? 'erro' : (hasWarning ? 'aviso' : 'conforme');

  return {
    docType: 'NFSE_NACIONAL',
    status,
    summary: {
      emitter: emitterName,
      recipient: recipientName,
      docNumber,
      vTotal: vTotNF || vServ,
      vIBS: roundCurrency(vIBSMun + vIBSUF) || roundCurrency(expectedIBSMun + expectedIBSUF),
      vCBS: vCBS || expectedCBS,
      vISSQN: declaredVISSQN || roundCurrency(expectedBCISS * (pAliqISS / 100))
    },
    issues,
    extra: {
      rawKey,
      keyValidation: rawKey ? validateChaveNFSeNacional(rawKey) : undefined,
      itemsCount: 1,
      items: [{
        itemNumber: 1,
        description: getTagText(servEl, 'xDescServ') || 'Serviços Prestados',
        vProd: vServ,
        vBC: vBCReforma,
        pIBSUF: pAliqEfetUF,
        vIBSUF,
        pIBSMun: pAliqEfetMun,
        vIBSMun,
        pCBS: pAliqEfetCBS,
        vCBS,
        calcIBSUF: expectedIBSUF,
        calcIBSMun: expectedIBSMun,
        calcCBS: expectedCBS,
        hasErrors: (Math.abs(vIBSMun - expectedIBSMun) > 0.01) || (Math.abs(vIBSUF - expectedIBSUF) > 0.01) || (Math.abs(vCBS - expectedCBS) > 0.01),
        hasWarnings: false
      }],
      totals: {
        declared: {
          vProd: vServ,
          vNF: vTotNF || vServ,
          vIBSUF,
          vIBSMun,
          vCBS,
          vIS: 0,
          vISSQN: declaredVISSQN
        },
        calculated: {
          vIBSUF: expectedIBSUF,
          vIBSMun: expectedIBSMun,
          vCBS: expectedCBS,
          vIS: 0,
          vISSQN: roundCurrency(expectedBCISS * (pAliqISS / 100))
        }
      },
      year2026TestAlert: false,
      emissionDate
    }
  };
}

/**
 * Auditoria de Payload JSON (usado por ERPs e simulações via API)
 */
function auditJsonPayload(data: any): FiscalDiagnostic {
  const issues: FiscalIssue[] = [];

  const isNFe = data.mod === '55' || data.mod === 55 || data.nfe || data.infNFe;
  const isNFSe = data.nfse || data.dps || data.infDPS;

  const docType: 'NFE_55' | 'NFSE_NACIONAL' = isNFSe ? 'NFSE_NACIONAL' : 'NFE_55';

  const emitter = data.emitente?.nome || data.emit?.xNome || data.prestador?.nome || 'Emitente Simulado';
  const recipient = data.destinatario?.nome || data.dest?.xNome || data.tomador?.nome || 'Destinatário Simulado';
  const docNumber = String(data.numero || data.nNF || data.nDPS || '101');
  const vTotal = parseFiscalNumber(data.valorTotal || data.vNF || data.vServ || 1000);

  // Itens
  const items = Array.isArray(data.itens) ? data.itens : (Array.isArray(data.det) ? data.det : []);
  let sumIBSUF = 0;
  let sumIBSMun = 0;
  let sumCBS = 0;
  let sumIS = 0;

  const parsedItems: FiscalItemDetail[] = items.map((it: any, idx: number) => {
    const vProd = parseFiscalNumber(it.vProd || it.valor);
    const vBC = parseFiscalNumber(it.vBC || vProd);
    const pIBSUF = parseFiscalNumber(it.pIBSUF);
    const vIBSUF = parseFiscalNumber(it.vIBSUF);
    const pIBSMun = parseFiscalNumber(it.pIBSMun);
    const vIBSMun = parseFiscalNumber(it.vIBSMun);
    const pCBS = parseFiscalNumber(it.pCBS);
    const vCBS = parseFiscalNumber(it.vCBS);
    const pIS = parseFiscalNumber(it.pIS);
    const vIS = parseFiscalNumber(it.vIS);

    const calcIBSUF = roundCurrency(vBC * (pIBSUF / 100));
    const calcIBSMun = roundCurrency(vBC * (pIBSMun / 100));
    const calcCBS = roundCurrency(vBC * (pCBS / 100));
    const calcIS = pIS > 0 ? roundCurrency(vBC * (pIS / 100)) : 0;

    let hasErrors = false;
    if (Math.abs(vIBSUF - calcIBSUF) > 0.01) {
      issues.push({
        type: 'erro',
        tagOrField: `itens[${idx}].vIBSUF`,
        title: `IBS Estadual Divergente no Item ${idx + 1}`,
        description: `Informado R$ ${vIBSUF.toFixed(2)}, calculado R$ ${calcIBSUF.toFixed(2)}.`
      });
      hasErrors = true;
    }
    if (Math.abs(vCBS - calcCBS) > 0.01) {
      issues.push({
        type: 'erro',
        tagOrField: `itens[${idx}].vCBS`,
        title: `CBS Divergente no Item ${idx + 1}`,
        description: `Informado R$ ${vCBS.toFixed(2)}, calculado R$ ${calcCBS.toFixed(2)}.`
      });
      hasErrors = true;
    }

    sumIBSUF += vIBSUF;
    sumIBSMun += vIBSMun;
    sumCBS += vCBS;
    sumIS += vIS;

    return {
      itemNumber: idx + 1,
      description: it.xProd || it.descricao || `Item ${idx + 1}`,
      vProd,
      vBC,
      pIBSUF,
      vIBSUF,
      pIBSMun,
      vIBSMun,
      pCBS,
      vCBS,
      pIS,
      vIS,
      calcIBSUF,
      calcIBSMun,
      calcCBS,
      calcIS,
      hasErrors,
      hasWarnings: false
    };
  });

  const hasError = issues.some(i => i.type === 'erro');
  const hasWarning = issues.some(i => i.type === 'aviso');

  return {
    docType,
    status: hasError ? 'erro' : (hasWarning ? 'aviso' : 'conforme'),
    summary: {
      emitter,
      recipient,
      docNumber,
      vTotal,
      vIBS: roundCurrency(sumIBSUF + sumIBSMun),
      vCBS: roundCurrency(sumCBS),
      vIS: sumIS > 0 ? roundCurrency(sumIS) : undefined
    },
    issues,
    extra: {
      itemsCount: items.length,
      items: parsedItems,
      totals: {
        declared: {
          vProd: vTotal,
          vNF: vTotal,
          vIBSUF: sumIBSUF,
          vIBSMun: sumIBSMun,
          vCBS: sumCBS,
          vIS: sumIS,
          vISSQN: 0
        },
        calculated: {
          vIBSUF: sumIBSUF,
          vIBSMun: sumIBSMun,
          vCBS: sumCBS,
          vIS: sumIS,
          vISSQN: 0
        }
      },
      year2026TestAlert: false
    }
  };
}

/**
 * Exemplos Prontos de Teste e Demonstração
 */
export const SAMPLE_DOCUMENTS = {
  nfe2026Conforme: `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35260100000000000191550010000012341234567890" versao="5.00">
    <ide>
      <cUF>35</cUF>
      <cNF>12345678</cNF>
      <natOp>VENDA DE MERCADORIA - REFORMA 2026</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>1234</nNF>
      <dhEmi>2026-03-15T10:30:00-03:00</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
    </ide>
    <emit>
      <CNPJ>00000000000191</CNPJ>
      <xNome>DISTRIBUIDORA BRASIL DE TECNOLOGIA LTDA</xNome>
      <xFant>BRASIL TECH</xFant>
      <enderEmit>
        <xLgr>Av. Paulista</xLgr>
        <nro>1000</nro>
        <xBairro>Bela Vista</xBairro>
        <cMun>3550308</cMun>
        <xMun>São Paulo</xMun>
        <UF>SP</UF>
      </enderEmit>
    </emit>
    <dest>
      <CNPJ>11222333000188</CNPJ>
      <xNome>MUNICIPIO DE TORIXOREU PREFEITURA</xNome>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>SRV-001</cProd>
        <xProd>LICENCA DE SOFTWARE GESTAO 360 SAAS</xProd>
        <NCM>85234990</NCM>
        <vProd>10000.00</vProd>
      </prod>
      <imposto>
        <!-- Grupo UB NT 2026.010 da Reforma Tributária (Alíquotas de Teste 2026: IBS 0.1% e CBS 0.9%) -->
        <UB>
          <cClassTrib>010101</cClassTrib>
          <vBC>10000.00</vBC>
          <pIBSUF>0.05</pIBSUF>
          <vIBSUF>5.00</vIBSUF>
          <pIBSMun>0.05</pIBSMun>
          <vIBSMun>5.00</vIBSMun>
          <pCBS>0.90</pCBS>
          <vCBS>90.00</vCBS>
        </UB>
      </imposto>
    </det>
    <det nItem="2">
      <prod>
        <cProd>SRV-002</cProd>
        <xProd>CONSULTORIA E TREINAMENTO EM AUDITORIA FISCAL</xProd>
        <NCM>85234990</NCM>
        <vProd>5000.00</vProd>
      </prod>
      <imposto>
        <UB>
          <cClassTrib>010101</cClassTrib>
          <vBC>5000.00</vBC>
          <pIBSUF>0.05</pIBSUF>
          <vIBSUF>2.50</vIBSUF>
          <pIBSMun>0.05</pIBSMun>
          <vIBSMun>2.50</vIBSMun>
          <pCBS>0.90</pCBS>
          <vCBS>45.00</vCBS>
        </UB>
      </imposto>
    </det>
    <total>
      <ICMSTot>
        <vProd>15000.00</vProd>
        <vNF>15000.00</vNF>
      </ICMSTot>
      <!-- Bloco W Totalizadores da Reforma (W41, W46, W56) -->
      <UBTot>
        <vIBSUF>7.50</vIBSUF>
        <vIBSMun>7.50</vIBSMun>
        <vCBS>135.00</vCBS>
      </UBTot>
    </total>
  </infNFe>
</NFe>`,

  nfe2026ComDivergenciaBlocoW: `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35260100000000000191550010000099991234567890" versao="5.00">
    <ide>
      <cUF>35</cUF>
      <cNF>99999999</cNF>
      <natOp>VENDA COM ERRO DE ARREDONDAMENTO</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>9999</nNF>
      <dhEmi>2026-04-10T14:00:00-03:00</dhEmi>
    </ide>
    <emit>
      <CNPJ>00000000000191</CNPJ>
      <xNome>COMERCIO MODELO S/A</xNome>
    </emit>
    <dest>
      <CNPJ>22333444000155</CNPJ>
      <xNome>CLIENTE TESTE AUDITORIA</xNome>
    </dest>
    <det nItem="1">
      <prod>
        <xProd>EQUIPAMENTO DE REDE E FIBRA OPTICA</xProd>
        <vProd>20000.00</vProd>
      </prod>
      <imposto>
        <UB>
          <vBC>20000.00</vBC>
          <pIBSUF>0.05</pIBSUF>
          <!-- Erro: 20000 * 0.05% = 10.00, mas foi informado 8.00 -->
          <vIBSUF>8.00</vIBSUF>
          <pIBSMun>0.05</pIBSMun>
          <vIBSMun>10.00</vIBSMun>
          <pCBS>0.90</pCBS>
          <vCBS>180.00</vCBS>
        </UB>
      </imposto>
    </det>
    <total>
      <ICMSTot>
        <vProd>20000.00</vProd>
        <vNF>20000.00</vNF>
      </ICMSTot>
      <!-- Bloco W com total de CBS divergindo da soma dos itens (declarou 250.00 em vez de 180.00) -->
      <UBTot>
        <vIBSUF>10.00</vIBSUF>
        <vIBSMun>10.00</vIBSMun>
        <vCBS>250.00</vCBS>
      </UBTot>
    </total>
  </infNFe>
</NFe>`,

  nfseNacionalConforme: `<?xml version="1.0" encoding="UTF-8"?>
<CompNFSe xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infNFSe Id="NFSe35503080000000000000000000000000000000000000000101">
    <nNFSe>505</nNFSe>
    <dhEmi>2026-05-20T16:45:00-03:00</dhEmi>
    <prest>
      <CNPJ>99888777000166</CNPJ>
      <xNome>CONSULTORIA TRIBUTARIA E FINANCEIRA S/S</xNome>
    </prest>
    <toma>
      <CNPJ>55444333000122</CNPJ>
      <xNome>SECRETARIA DE FINANCAS MUNICIPAL</xNome>
    </toma>
    <serv>
      <xDescServ>AUDITORIA PREVENTIVA DE ARRECADACAO TRIBUTARIA E CONTROLE INTERNO</xDescServ>
      <valores>
        <vServ>8000.00</vServ>
        <vDescIncond>0.00</vDescIncond>
        <vDed>0.00</vDed>
        <vBCISS>8000.00</vBCISS>
        <pAliqISS>3.00</pAliqISS>
        <vISS>240.00</vISS>
        <vTotNF>8000.00</vTotNF>
        <vLiq>8000.00</vLiq>
      </valores>
      <!-- Subgrupo Reforma Tributária NT 008 Padrão Nacional -->
      <tribReforma>
        <vBC>8000.00</vBC>
        <pAliqEfetMun>0.05</pAliqEfetMun>
        <vIBSMun>4.00</vIBSMun>
        <pAliqEfetUF>0.05</pAliqEfetUF>
        <vIBSUF>4.00</vIBSUF>
        <pAliqEfetCBS>0.90</pAliqEfetCBS>
        <vCBS>72.00</vCBS>
      </tribReforma>
    </serv>
  </infNFSe>
</CompNFSe>`
};
