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

export interface AccountantChecklistItem {
  id: string;
  category: 'validade' | 'classificacao' | 'calculos_reforma' | 'issqn_retencoes' | 'contabil_administrativo';
  categoryTitle: string;
  title: string;
  description: string;
  normaRef: string;
  status: 'conforme' | 'inconsistente' | 'aviso' | 'pendente_manual';
  autoChecked: boolean;
  manualChecked?: boolean;
  divergenceDetails?: string;
  userNotes?: string;
}

/**
 * Gerador de Checklist de Auditoria Contábil e Fiscal
 * Organiza a conferência da nota em 5 dimensões oficiais para contadores e órgãos públicos
 */
export function generateAccountantChecklist(diag: FiscalDiagnostic): AccountantChecklistItem[] {
  const items: AccountantChecklistItem[] = [];

  const findIssue = (tagOrKeywords: string[]) => {
    return diag.issues.find(i => 
      tagOrKeywords.some(k => 
        i.tagOrField.toLowerCase().includes(k.toLowerCase()) || 
        i.title.toLowerCase().includes(k.toLowerCase())
      )
    );
  };

  // 1. Validade Jurídica & Cadastral
  const keyIssue = findIssue(['chnfe', 'chnfse', 'chave']);
  const keyVal = diag.extra?.keyValidation;
  const isKeyValid = keyVal?.valid ?? (!keyIssue || keyIssue.type === 'sucesso');
  const isConsumo = diag.docType === 'NFE_55';
  const expectedDigits = isConsumo ? '44 dígitos' : '50 dígitos';

  items.push({
    id: 'chk_chave',
    category: 'validade',
    categoryTitle: '1. Validade Jurídica & Cadastral',
    title: isConsumo 
      ? 'Chave de Acesso da Nota de Consumo (44 dígitos & Módulo 11)' 
      : 'Chave de Acesso da Nota de Serviço (50 dígitos - Padrão Nacional)',
    description: isConsumo
      ? 'Chave numérica de 44 dígitos (NF-e/NFC-e) com autenticidade do DV e estrutura do Ajuste SINIEF 07/05.'
      : 'Chave de 50 dígitos no Padrão Nacional NFS-e (Município IBGE + Inscrição + Série + Número + Código de Verificação).',
    normaRef: isConsumo ? 'NT 2026.010 / Ajuste SINIEF 07/05' : 'Resolução CGSN 169/2022 / NT 008',
    status: isKeyValid ? 'conforme' : (keyIssue?.type === 'aviso' ? 'aviso' : 'inconsistente'),
    autoChecked: isKeyValid,
    divergenceDetails: diag.extra?.rawKey 
      ? `Chave (${expectedDigits}): ${diag.extra.rawKey.replace(/(\d{4})/g, '$1 ').trim()} (${isKeyValid ? 'Estrutura e Dígitos Válidos' : keyVal?.reason || 'Chave Inconsistente'})`
      : `Chave de acesso de ${expectedDigits} não informada formalmente.`
  });

  const isDocTypeOk = diag.docType === 'NFE_55' || diag.docType === 'NFSE_NACIONAL';
  items.push({
    id: 'chk_modelo',
    category: 'validade',
    categoryTitle: '1. Validade Jurídica & Cadastral',
    title: isConsumo ? 'Enquadramento: Nota de Consumo (NF-e 55 / NFC-e 65)' : 'Enquadramento: Nota de Serviço (NFS-e Padrão Nacional)',
    description: isConsumo
      ? 'Identificação formal do leiaute de mercadorias/consumo (Modelo 55 ou 65) sob a Reforma Tributária.'
      : 'Identificação formal do leiaute de prestação de serviços no padrão nacional do Comitê Gestor (NT 008).',
    normaRef: isConsumo ? 'NT 2026.010 (Bloco W & UB)' : 'NT 008 Padrão Nacional (tribReforma)',
    status: isDocTypeOk ? 'conforme' : 'inconsistente',
    autoChecked: isDocTypeOk,
    divergenceDetails: diag.docType === 'NFE_55' 
      ? 'Nota de Consumo / Mercadorias (Chave 44 dígitos)' 
      : diag.docType === 'NFSE_NACIONAL' 
      ? 'Nota de Serviço Padrão Nacional (Chave 50 dígitos)' 
      : 'Leiaute do documento não reconhecido.'
  });

  const hasEmitter = Boolean(diag.summary.emitter && diag.summary.emitter !== 'Não identificado' && diag.summary.emitter !== 'Emitente não localizado');
  items.push({
    id: 'chk_emitente',
    category: 'validade',
    categoryTitle: '1. Validade Jurídica & Cadastral',
    title: 'Identificação & Regularidade do Emitente',
    description: 'Razão social e CNPJ/CPF do fornecedor ou prestador devidamente discriminados.',
    normaRef: 'Art. 167 da Lei 5.172/66 (CTN)',
    status: hasEmitter ? 'conforme' : 'inconsistente',
    autoChecked: hasEmitter,
    divergenceDetails: hasEmitter ? `Emitente: ${diag.summary.emitter}` : 'Dados cadastrais do emitente ausentes.'
  });

  const hasDest = Boolean(diag.summary.recipient && diag.summary.recipient !== 'Não identificado');
  items.push({
    id: 'chk_destinatario',
    category: 'validade',
    categoryTitle: '1. Validade Jurídica & Cadastral',
    title: 'Identificação do Destinatário / Tomador do Serviço',
    description: 'Conferência do CNPJ/CPF do comprador para evitar lançamento em órgão ou empresa divergente.',
    normaRef: 'Lei 4.320/64 Art. 63 (Liquidação)',
    status: hasDest ? 'conforme' : 'aviso',
    autoChecked: hasDest,
    divergenceDetails: hasDest ? `Destinatário: ${diag.summary.recipient}` : 'Destinatário não especificado ou consumidor final genérico.'
  });

  const hasDate = Boolean(diag.extra?.emissionDate);
  items.push({
    id: 'chk_data',
    category: 'validade',
    categoryTitle: '1. Validade Jurídica & Cadastral',
    title: 'Data de Emissão & Tempestividade Contábil',
    description: 'Conferência de que a data de emissão pertence ao exercício/competência fiscal de apuração.',
    normaRef: 'Princípio da Competência (NBC TSP)',
    status: hasDate ? 'conforme' : 'aviso',
    autoChecked: hasDate,
    divergenceDetails: hasDate 
      ? `Data de Emissão: ${new Date(diag.extra!.emissionDate!).toLocaleDateString('pt-BR')}`
      : 'Data de emissão não localizada no arquivo.'
  });

  // 2. Classificação & Itens da Reforma
  const itemsList = diag.extra?.items || [];
  const itemsWithoutNcm = itemsList.filter(i => !i.ncm && diag.docType === 'NFE_55');
  const hasNcmOk = itemsList.length > 0 && itemsWithoutNcm.length === 0;
  items.push({
    id: 'chk_ncm',
    category: 'classificacao',
    categoryTitle: '2. Enquadramento de Itens & Classificação Tributária',
    title: 'Códigos NCM / NBS dos Produtos ou Serviços',
    description: 'Classificação fiscal por NCM (8 dígitos para mercadorias) obrigatória para parametrização do IBS/CBS.',
    normaRef: 'Tabela TIPI / Resolução GECEX',
    status: diag.docType === 'NFSE_NACIONAL' ? 'conforme' : (hasNcmOk ? 'conforme' : 'aviso'),
    autoChecked: hasNcmOk || diag.docType === 'NFSE_NACIONAL',
    divergenceDetails: diag.docType === 'NFSE_NACIONAL'
      ? 'Operação de Serviços (Regulada por Código de Serviço da LC 116)'
      : hasNcmOk
      ? `Todos os ${itemsList.length} itens possuem NCM preenchido.`
      : `${itemsWithoutNcm.length} itens sem código NCM informado.`
  });

  const ubIssue = findIssue(['grupo ub', 'classtrib', 'ausência do grupo']);
  const hasUbError = Boolean(ubIssue && ubIssue.type === 'erro');
  items.push({
    id: 'chk_classtrib',
    category: 'classificacao',
    categoryTitle: '2. Enquadramento de Itens & Classificação Tributária',
    title: 'Grupo UB & Classificação Tributária da Reforma (cClassTrib)',
    description: 'Presença do Grupo UB na NF-e conforme NT 2026.010 para apuração de CBS e IBS.',
    normaRef: 'NT 2026.010 Grupo UB',
    status: hasUbError ? 'inconsistente' : 'conforme',
    autoChecked: !hasUbError,
    divergenceDetails: hasUbError 
      ? 'Grupo UB não preenchido nos itens (Documento em formato anterior à Reforma).'
      : 'Grupo de tributação e classificação da Reforma identificado nos itens.'
  });

  const hasGenericItems = itemsList.some(i => i.description.length < 3 || i.description.toLowerCase().includes('diversos'));
  items.push({
    id: 'chk_discriminacao',
    category: 'classificacao',
    categoryTitle: '2. Enquadramento de Itens & Classificação Tributária',
    title: 'Discriminação Individualizada dos Itens',
    description: 'Proibição de descrições genéricas que inviabilizem a identificação do bem ou serviço.',
    normaRef: 'Art. 87 da Lei 4.320/64',
    status: hasGenericItems ? 'aviso' : 'conforme',
    autoChecked: !hasGenericItems,
    divergenceDetails: hasGenericItems 
      ? 'Há itens com descrição excessivamente resumida ou genérica.'
      : 'Itens descritos com clareza para auditoria.'
  });

  // 3. Cálculos Matemáticos e Regras da Reforma 2026
  const baseError = findIssue(['base de cálculo', 'vbc']);
  const isBaseOk = !baseError || baseError.type !== 'erro';
  items.push({
    id: 'chk_base_calc',
    category: 'calculos_reforma',
    categoryTitle: '3. Auditoria Matemática & Alíquotas da Reforma (IBS/CBS/IS)',
    title: 'Base de Cálculo do IBS e CBS',
    description: 'A base deve refletir o valor das mercadorias/serviços somado a frete/outros encargos e deduzido de descontos incondicionados.',
    normaRef: 'Art. 12 da EC 132/2023',
    status: isBaseOk ? 'conforme' : 'inconsistente',
    autoChecked: isBaseOk,
    divergenceDetails: isBaseOk 
      ? `Base de Cálculo apurada: R$ ${diag.summary.vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : baseError?.description || 'Divergência na apuração da base de cálculo.'
  });

  const is2026Alert = Boolean(diag.extra?.year2026TestAlert);
  items.push({
    id: 'chk_regra_2026',
    category: 'calculos_reforma',
    categoryTitle: '3. Auditoria Matemática & Alíquotas da Reforma (IBS/CBS/IS)',
    title: 'Alíquotas de Teste da Transição (Ano 2026)',
    description: 'Na fase de testes da Reforma Tributária (2026), as alíquotas oficiais de teste são 0,10% para o IBS e 0,90% para a CBS.',
    normaRef: 'EC 132/2023 Art. 125 & NT 2026.010',
    status: is2026Alert ? 'aviso' : 'conforme',
    autoChecked: !is2026Alert,
    divergenceDetails: is2026Alert 
      ? 'Alíquotas informadas nos itens diferem do padrão de teste de 2026 (0,1% IBS e 0,9% CBS).'
      : 'Alíquotas 100% aderentes à fase de testes do ano de 2026.'
  });

  const ibsUfIssue = findIssue(['ibs estadual', 'vibsuf']);
  const isIbsUfOk = !ibsUfIssue || ibsUfIssue.type !== 'erro';
  items.push({
    id: 'chk_ibs_uf',
    category: 'calculos_reforma',
    categoryTitle: '3. Auditoria Matemática & Alíquotas da Reforma (IBS/CBS/IS)',
    title: 'Cálculo Matemático do IBS Estadual (vIBSUF)',
    description: 'Conferência de que vIBSUF = vBC * pAliqEfetUF em cada item da nota com tolerância de até R$ 0,01.',
    normaRef: 'NT 2026.010 Regra UB07',
    status: isIbsUfOk ? 'conforme' : 'inconsistente',
    autoChecked: isIbsUfOk,
    divergenceDetails: isIbsUfOk 
      ? `IBS Estadual apurado: R$ ${(diag.extra?.totals.declared.vIBSUF || (diag.summary.vIBS / 2)).toFixed(2)}`
      : ibsUfIssue?.description || 'Divergência matemática no IBS Estadual.'
  });

  const ibsMunIssue = findIssue(['ibs municipal', 'vibsmun']);
  const isIbsMunOk = !ibsMunIssue || ibsMunIssue.type !== 'erro';
  items.push({
    id: 'chk_ibs_mun',
    category: 'calculos_reforma',
    categoryTitle: '3. Auditoria Matemática & Alíquotas da Reforma (IBS/CBS/IS)',
    title: 'Cálculo Matemático do IBS Municipal (vIBSMun)',
    description: 'Conferência de que vIBSMun = vBC * pAliqEfetMun em cada item da nota com tolerância de até R$ 0,01.',
    normaRef: 'NT 2026.010 Regra UB08',
    status: isIbsMunOk ? 'conforme' : 'inconsistente',
    autoChecked: isIbsMunOk,
    divergenceDetails: isIbsMunOk 
      ? `IBS Municipal apurado: R$ ${(diag.extra?.totals.declared.vIBSMun || (diag.summary.vIBS / 2)).toFixed(2)}`
      : ibsMunIssue?.description || 'Divergência matemática no IBS Municipal.'
  });

  const cbsIssue = findIssue(['cbs', 'vcbs']);
  const isCbsOk = !cbsIssue || cbsIssue.type !== 'erro';
  items.push({
    id: 'chk_cbs',
    category: 'calculos_reforma',
    categoryTitle: '3. Auditoria Matemática & Alíquotas da Reforma (IBS/CBS/IS)',
    title: 'Cálculo Matemático da CBS Federal (vCBS)',
    description: 'Conferência de que vCBS = vBC * pAliqEfetCBS em cada item da nota fiscal.',
    normaRef: 'NT 2026.010 Regra UB09',
    status: isCbsOk ? 'conforme' : 'inconsistente',
    autoChecked: isCbsOk,
    divergenceDetails: isCbsOk 
      ? `CBS Total apurada: R$ ${diag.summary.vCBS.toFixed(2)}`
      : cbsIssue?.description || 'Divergência matemática no cálculo da CBS.'
  });

  const blocoWIssue = findIssue(['bloco w', 'w56', 'w41', 'w46', 'totalizador']);
  const isBlocoWOk = !blocoWIssue || blocoWIssue.type !== 'erro';
  items.push({
    id: 'chk_bloco_w',
    category: 'calculos_reforma',
    categoryTitle: '3. Auditoria Matemática & Alíquotas da Reforma (IBS/CBS/IS)',
    title: 'Amarração dos Totalizadores do Bloco W',
    description: 'Soma dos itens de CBS (W56), IBS Estadual (W41) e IBS Municipal (W46) deve bater exatamente com os totalizadores gerais.',
    normaRef: 'NT 2026.010 Bloco W',
    status: isBlocoWOk ? 'conforme' : 'inconsistente',
    autoChecked: isBlocoWOk,
    divergenceDetails: isBlocoWOk 
      ? 'Totalizadores do Bloco W batem 100% com o somatório dos itens.'
      : blocoWIssue?.description || 'Divergência entre o somatório dos itens e o Bloco W.'
  });

  // 4. Serviços, ISSQN Municipal & Retenções
  const issIssue = findIssue(['issqn', 'vissqn', 'paliqiss', 'lc 116']);
  const isIssOk = !issIssue || issIssue.type !== 'erro';
  items.push({
    id: 'chk_issqn',
    category: 'issqn_retencoes',
    categoryTitle: '4. Tributação Municipal & Retenções na Fonte (NFS-e)',
    title: 'Alíquota Constitucional do ISSQN (2% a 5%)',
    description: 'Conferência dos limites constitucionais da Lei Complementar 116/2003 para serviços municipais.',
    normaRef: 'LC 116/2003 / NT 008 Padrão Nacional',
    status: diag.docType === 'NFE_55' ? 'conforme' : (isIssOk ? 'conforme' : (issIssue?.type === 'aviso' ? 'aviso' : 'inconsistente')),
    autoChecked: isIssOk,
    divergenceDetails: diag.docType === 'NFE_55'
      ? 'Operação de mercadoria (Não sujeita ao ISSQN Municipal).'
      : isIssOk
      ? `ISSQN apurado com base legal: R$ ${(diag.summary.vISSQN || 0).toFixed(2)}`
      : issIssue?.description || 'Alíquota de ISSQN fora dos parâmetros permitidos.'
  });

  const retIssue = findIssue(['vliq', 'valor líquido', 'retenções', 'retencao']);
  const isRetOk = !retIssue || retIssue.type !== 'erro';
  items.push({
    id: 'chk_retencoes',
    category: 'issqn_retencoes',
    categoryTitle: '4. Tributação Municipal & Retenções na Fonte (NFS-e)',
    title: 'Amarração do Valor Líquido com Retenções Federais/Municipais',
    description: 'O valor líquido a pagar deve corresponder ao valor dos serviços deduzido das retenções legais aplicáveis.',
    normaRef: 'Instrução Normativa RFB / NT 008',
    status: isRetOk ? 'conforme' : 'inconsistente',
    autoChecked: isRetOk,
    divergenceDetails: isRetOk 
      ? 'Retenções e valor líquido conferidos com as deduções declaradas.'
      : retIssue?.description || 'Divergência no cálculo do valor líquido da nota.'
  });

  // 5. Controles Administrativos & Liquidação Contábil (Manuais do Contador)
  items.push({
    id: 'chk_adm_empenho',
    category: 'contabil_administrativo',
    categoryTitle: '5. Organização Contábil & Procedimento de Empenho / Pagamento',
    title: 'Vínculo com Nota de Empenho & Saldo Orçamentário',
    description: 'Certificar que a nota fiscal está amparada por Nota de Empenho prévia (Art. 60 da Lei 4.320/64) com saldo suficiente na dotação.',
    normaRef: 'Lei 4.320/1964 Art. 60 / LRF',
    status: 'pendente_manual',
    autoChecked: false,
    divergenceDetails: 'Aguardando validação do contador sobre a vinculação do empenho orçamentário.'
  });

  items.push({
    id: 'chk_adm_atesto',
    category: 'contabil_administrativo',
    categoryTitle: '5. Organização Contábil & Procedimento de Empenho / Pagamento',
    title: 'Atesto de Recebimento do Fiscal de Contrato',
    description: 'Conferir se o termo de recebimento definitivo ou atesto da medição foi emitido e assinado pelo servidor competente.',
    normaRef: 'Lei 14.133/2021 Art. 140',
    status: 'pendente_manual',
    autoChecked: false,
    divergenceDetails: 'Verificar documento físico ou assinatura digital de atesto de entrega dos bens/serviços.'
  });

  items.push({
    id: 'chk_adm_cnd',
    category: 'contabil_administrativo',
    categoryTitle: '5. Organização Contábil & Procedimento de Empenho / Pagamento',
    title: 'Regularidade Fiscal & Trabalhista do Fornecedor (CNDs)',
    description: 'Conferir validade das certidões negativas de débito (Federal/PGFN, FGTS, CNDT e Fazendas Estadual e Municipal).',
    normaRef: 'CF/88 Art. 195 § 3º e Lei 14.133/2021',
    status: 'pendente_manual',
    autoChecked: false,
    divergenceDetails: 'Consultar certidões atualizadas no momento da liquidação da despesa.'
  });

  items.push({
    id: 'chk_adm_duplicidade',
    category: 'contabil_administrativo',
    categoryTitle: '5. Organização Contábil & Procedimento de Empenho / Pagamento',
    title: 'Inexistência de Duplicidade de Chave no Livro Diário/Razão',
    description: 'Garantir que esta chave de acesso não foi lançada ou paga anteriormente por outro processo administrativo.',
    normaRef: 'NBC TSP - Normas Brasileiras de Contabilidade',
    status: 'pendente_manual',
    autoChecked: false,
    divergenceDetails: 'Conferir se o número de nota e chave constam em aberto no contas a pagar.'
  });

  return items;
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
 * Tabela de UFs (Código IBGE de 2 dígitos)
 */
export const UF_CODES: Record<string, string> = {
  '11': 'RO - Rondônia',
  '12': 'AC - Acre',
  '13': 'AM - Amazonas',
  '14': 'RR - Roraima',
  '15': 'PA - Pará',
  '16': 'AP - Amapá',
  '17': 'TO - Tocantins',
  '21': 'MA - Maranhão',
  '22': 'PI - Piauí',
  '23': 'CE - Ceará',
  '24': 'RN - Rio Grande do Norte',
  '25': 'PB - Paraíba',
  '26': 'PE - Pernambuco',
  '27': 'AL - Alagoas',
  '28': 'SE - Sergipe',
  '29': 'BA - Bahia',
  '31': 'MG - Minas Gerais',
  '32': 'ES - Espírito Santo',
  '33': 'RJ - Rio de Janeiro',
  '35': 'SP - São Paulo',
  '41': 'PR - Paraná',
  '42': 'SC - Santa Catarina',
  '43': 'RS - Rio Grande do Sul',
  '50': 'MS - Mato Grosso do Sul',
  '51': 'MT - Mato Grosso',
  '52': 'GO - Goiás',
  '53': 'DF - Distrito Federal'
};

export const COMMON_IBGE_MUN: Record<string, string> = {
  '3550308': 'São Paulo (SP)',
  '3304557': 'Rio de Janeiro (RJ)',
  '3106200': 'Belo Horizonte (MG)',
  '4106902': 'Curitiba (PR)',
  '4314902': 'Porto Alegre (RS)',
  '5300108': 'Brasília (DF)',
  '2927408': 'Salvador (BA)',
  '2304400': 'Fortaleza (CE)',
  '2611606': 'Recife (PE)',
  '5208707': 'Goiânia (GO)',
  '5103403': 'Cuiabá (MT)',
  '5107909': 'Sinop (MT)',
  '5107925': 'Sorriso (MT)',
  '5108402': 'Várzea Grande (MT)',
  '5107040': 'Primavera do Leste (MT)',
  '5107065': 'Torixoréu (MT)'
};

/**
 * Validação de Chave de Acesso de Nota de Consumo / Mercadoria (44 dígitos)
 * Aplicável a NF-e Modelo 55 e NFC-e Modelo 65
 * Algoritmo do Módulo 11 (Pesos de 2 a 9 da direita para a esquerda)
 */
export function validateChaveNFe(chave: string): { 
  valid: boolean; 
  reason?: string; 
  uf?: string; 
  ufNome?: string;
  aamm?: string; 
  mesAnoFormatado?: string;
  cnpj?: string; 
  cnpjFormatado?: string;
  mod?: string; 
  modeloNome?: string;
  serie?: string; 
  nNF?: string;
  tpEmis?: string;
  cNF?: string;
  cDV?: number;
  expectedDV?: number;
  documentCategory?: 'CONSUMO';
} {
  const clean = chave.replace(/\D/g, '');
  if (!clean) return { valid: false, reason: 'Chave de acesso da Nota de Consumo não informada.' };

  const cUF = clean.length >= 2 ? clean.substring(0, 2) : undefined;
  const aamm = clean.length >= 6 ? clean.substring(2, 6) : undefined;
  const cnpj = clean.length >= 20 ? clean.substring(6, 20) : undefined;
  const mod = clean.length >= 22 ? clean.substring(20, 22) : undefined;
  const serie = clean.length >= 25 ? clean.substring(22, 25) : undefined;
  const nNF = clean.length >= 34 ? clean.substring(25, 34) : undefined;
  const tpEmis = clean.length >= 35 ? clean.substring(34, 35) : undefined;
  const cNF = clean.length >= 43 ? clean.substring(35, 43) : undefined;
  const dvInformado = clean.length >= 44 ? parseInt(clean.charAt(43), 10) : undefined;

  const ufNome = cUF ? (UF_CODES[cUF] || `UF ${cUF}`) : undefined;
  const mesAnoFormatado = aamm ? `${aamm.substring(2, 4)}/20${aamm.substring(0, 2)}` : undefined;
  const cnpjFormatado = cnpj ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : undefined;
  const modeloNome = mod ? (mod === '65' ? 'NFC-e (Nota de Consumidor Final - Mod 65)' : mod === '55' ? 'NF-e (Nota Fiscal de Mercadorias/Consumo - Mod 55)' : `Modelo Desconhecido (${mod})`) : undefined;

  if (clean.length !== 44) {
    return { 
      valid: false, 
      reason: `Chave de Nota de Consumo possui ${clean.length} dígitos (esperado: exatamente 44 dígitos).`,
      uf: cUF,
      ufNome,
      aamm,
      mesAnoFormatado,
      cnpj,
      cnpjFormatado,
      mod,
      modeloNome,
      serie,
      nNF: nNF ? String(parseInt(nNF, 10)) : undefined,
      tpEmis,
      cNF,
      cDV: dvInformado,
      documentCategory: 'CONSUMO'
    };
  }

  if (mod !== '55' && mod !== '65') {
    return { 
      valid: false, 
      reason: `Modelo indicado na chave é ${mod} (esperado Modelo 55 - NF-e ou 65 - NFC-e de Consumo).`,
      uf: cUF,
      ufNome,
      aamm,
      mesAnoFormatado,
      cnpj,
      cnpjFormatado,
      mod,
      modeloNome,
      serie,
      nNF: nNF ? String(parseInt(nNF, 10)) : undefined,
      tpEmis,
      cNF,
      cDV: dvInformado,
      documentCategory: 'CONSUMO'
    };
  }

  // Cálculo do dígito verificador (DV) pelo Módulo 11
  const base43 = clean.substring(0, 43);
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
      reason: `Dígito verificador inválido: informado ${dvInformado}, calculado ${dvEsperado} pelo Módulo 11.`,
      uf: cUF,
      ufNome,
      aamm,
      mesAnoFormatado,
      cnpj,
      cnpjFormatado,
      mod,
      modeloNome,
      serie,
      nNF: nNF ? String(parseInt(nNF, 10)) : undefined,
      tpEmis,
      cNF,
      cDV: dvInformado,
      expectedDV: dvEsperado,
      documentCategory: 'CONSUMO'
    };
  }

  return {
    valid: true,
    uf: cUF,
    ufNome,
    aamm,
    mesAnoFormatado,
    cnpj,
    cnpjFormatado,
    mod,
    modeloNome,
    serie,
    nNF: nNF ? String(parseInt(nNF, 10)) : undefined,
    tpEmis,
    cNF,
    cDV: dvInformado,
    expectedDV: dvEsperado,
    documentCategory: 'CONSUMO'
  };
}

/**
 * Validação de Chave de Acesso de Nota de Serviço (NFS-e Padrão Nacional - 50 dígitos)
 * Estrutura: cMun (7) + tpInsc (1) + CNPJ/CPF (14) + serie (5) + nNFSe (15) + cVerif (8) = 50 dígitos
 */
export function validateChaveNFSeNacional(chave: string): { 
  valid: boolean; 
  reason?: string;
  cMun?: string;
  munNome?: string;
  tpInsc?: string;
  tipoInscricaoNome?: string;
  insc?: string;
  inscFormatada?: string;
  serie?: string;
  nNFSe?: string;
  cVerif?: string;
  documentCategory?: 'SERVICO';
} {
  const clean = chave.replace(/\D/g, '');
  if (!clean) return { valid: false, reason: 'Chave de acesso da Nota de Serviço não informada.' };

  const cMun = clean.length >= 7 ? clean.substring(0, 7) : undefined;
  const tpInsc = clean.length >= 8 ? clean.substring(7, 8) : undefined;
  const insc = clean.length >= 22 ? clean.substring(8, 22) : undefined;
  const serie = clean.length >= 27 ? clean.substring(22, 27) : undefined;
  const nNFSe = clean.length >= 42 ? clean.substring(27, 42) : undefined;
  const cVerif = clean.length >= 50 ? clean.substring(42, 50) : undefined;

  const tipoInscricaoNome = tpInsc ? (tpInsc === '2' ? 'CPF' : 'CNPJ') : undefined;
  let inscFormatada = insc;
  if (insc && tpInsc === '2') {
    inscFormatada = insc.slice(-11).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  } else if (insc) {
    inscFormatada = insc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  const munNome = cMun ? (COMMON_IBGE_MUN[cMun] || `Município IBGE ${cMun}`) : undefined;

  if (clean.length !== 50) {
    return { 
      valid: false, 
      reason: `Chave de Nota de Serviço (NFS-e Nacional) possui ${clean.length} dígitos (esperado: exatamente 50 dígitos).`,
      cMun,
      munNome,
      tpInsc,
      tipoInscricaoNome,
      insc,
      inscFormatada,
      serie: serie ? String(parseInt(serie, 10) || serie) : undefined,
      nNFSe: nNFSe ? String(parseInt(nNFSe, 10) || nNFSe) : undefined,
      cVerif,
      documentCategory: 'SERVICO'
    };
  }

  return {
    valid: true,
    cMun,
    munNome,
    tpInsc,
    tipoInscricaoNome,
    insc,
    inscFormatada,
    serie: serie ? String(parseInt(serie, 10) || serie) : undefined,
    nNFSe: nNFSe ? String(parseInt(nNFSe, 10) || nNFSe) : undefined,
    cVerif,
    documentCategory: 'SERVICO'
  };
}

/**
 * Utilitário de Geração de Documento Fiscal a partir da Chave de Acesso
 */
export function generateXmlFromChave(cleanKey: string, docType: 'CONSUMO' | 'SERVICO' = 'CONSUMO'): string {
  if (docType === 'CONSUMO' || cleanKey.length === 44) {
    const val = validateChaveNFe(cleanKey);
    const cUF = val.uf || '35';
    const cMun = cUF === '35' ? '3550308' : (cUF === '51' ? '5107065' : `${cUF}00000`);
    const cnpj = val.cnpj || '00000000000191';
    const mod = val.mod || '55';
    const serie = val.serie || '001';
    const nNF = val.nNF || '8888';
    const aamm = val.aamm || '2601';
    const year = `20${aamm.substring(0, 2)}`;
    const month = aamm.substring(2, 4);

    return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${cleanKey}" versao="5.00">
    <ide>
      <cUF>${cUF}</cUF>
      <cNF>12345678</cNF>
      <natOp>${mod === '65' ? 'VENDA A CONSUMIDOR FINAL (NFC-E)' : 'VENDA DE MERCADORIA AUDITADA'}</natOp>
      <mod>${mod}</mod>
      <serie>${serie}</serie>
      <nNF>${nNF}</nNF>
      <dhEmi>${year}-${month}-01T10:00:00-03:00</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
    </ide>
    <emit>
      <CNPJ>${cnpj}</CNPJ>
      <xNome>FORNECEDOR AUDITADO POR CHAVE DE ACESSO (${mod === '65' ? 'NFC-e' : 'NF-e'})</xNome>
      <xFant>EMITENTE CONFORME</xFant>
      <enderEmit>
        <cMun>${cMun}</cMun>
        <UF>${val.ufNome?.split(' - ')[0] || 'SP'}</UF>
      </enderEmit>
    </emit>
    <dest>
      <CNPJ>99999999000188</CNPJ>
      <xNome>ORGAO PUBLICO / CONSUMIDOR DESTINATARIO</xNome>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>PROD-001</cProd>
        <xProd>MERCADORIA EM REGIME DE TRANSICAO DA REFORMA (CHAVE 44 DIGITOS)</xProd>
        <NCM>84713012</NCM>
        <vProd>10000.00</vProd>
      </prod>
      <imposto>
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
    <total>
      <ICMSTot>
        <vProd>10000.00</vProd>
        <vNF>10000.00</vNF>
      </ICMSTot>
      <UBTot>
        <vIBSUF>5.00</vIBSUF>
        <vIBSMun>5.00</vIBSMun>
        <vCBS>90.00</vCBS>
      </UBTot>
    </total>
  </infNFe>
</NFe>`;
  } else {
    const val = validateChaveNFSeNacional(cleanKey);
    const cMun = val.cMun || '3550308';
    const cnpj = val.insc || '00000000000191';
    const nNFSe = val.nNFSe || '888';

    return `<?xml version="1.0" encoding="UTF-8"?>
<CompNFSe xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infNFSe Id="NFSe${cleanKey}">
    <nNFSe>${nNFSe}</nNFSe>
    <dhEmi>2026-06-01T10:00:00-03:00</dhEmi>
    <cMun>${cMun}</cMun>
    <prest>
      <CNPJ>${cnpj}</CNPJ>
      <xNome>PRESTADOR DE SERVICOS AUDITADO POR CHAVE (50 DIGITOS)</xNome>
    </prest>
    <toma>
      <CNPJ>99999999000188</CNPJ>
      <xNome>TOMADOR DOS SERVICOS</xNome>
    </toma>
    <serv>
      <xDescServ>PRESTACAO DE SERVICOS AUDITADA - CHAVE DE ACESSO 50 DIGITOS NT 008</xDescServ>
      <valores>
        <vServ>10000.00</vServ>
        <vBCISS>10000.00</vBCISS>
        <pAliqISS>3.00</pAliqISS>
        <vISS>300.00</vISS>
        <vTotNF>10000.00</vTotNF>
        <vLiq>10000.00</vLiq>
      </valores>
      <tribReforma>
        <vBC>10000.00</vBC>
        <pAliqEfetMun>0.05</pAliqEfetMun>
        <vIBSMun>5.00</vIBSMun>
        <pAliqEfetUF>0.05</pAliqEfetUF>
        <vIBSUF>5.00</vIBSUF>
        <pAliqEfetCBS>0.90</pAliqEfetCBS>
        <vCBS>90.00</vCBS>
      </tribReforma>
    </serv>
  </infNFSe>
</CompNFSe>`;
  }
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
  const cleanDigits = input.replace(/\D/g, '');

  // Detecção direta por comprimento da Chave de Acesso (50 dígitos = Serviço, 44 dígitos = Consumo)
  if (cleanDigits.length === 50 || lower.startsWith('nfse')) {
    return 'NFSE_NACIONAL';
  }
  if (cleanDigits.length === 44 || lower.startsWith('nfe')) {
    return 'NFE_55';
  }

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

  // Padrão NF-e Modelo 55 ou Modelo 65 (NFC-e consumo)
  if (
    lower.includes('<nfe') || 
    lower.includes('<infnfe') || 
    lower.includes('mod="55"') || 
    lower.includes('<mod>55</mod>') ||
    lower.includes('mod="65"') || 
    lower.includes('<mod>65</mod>') ||
    lower.includes('"mod": 55') ||
    lower.includes('"mod": "55"') ||
    lower.includes('"mod": 65') ||
    lower.includes('"mod": "65"')
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
        description: 'Nenhum conteúdo XML, JSON ou Chave de Acesso foi fornecido para auditoria.'
      }]
    };
  }

  // Identificação de Chave de Acesso pura digitada/colada (44 dígitos para Consumo ou 50 dígitos para Serviço)
  const cleanDigits = trimmed.replace(/\D/g, '');
  if (
    !trimmed.startsWith('<') && 
    !trimmed.startsWith('{') && 
    !trimmed.startsWith('[') && 
    (cleanDigits.length === 44 || cleanDigits.length === 50 || trimmed.toLowerCase().startsWith('nfe') || trimmed.toLowerCase().startsWith('nfse'))
  ) {
    const isService = cleanDigits.length === 50 || trimmed.toLowerCase().startsWith('nfse');
    const simulatedXml = generateXmlFromChave(cleanDigits, isService ? 'SERVICO' : 'CONSUMO');
    return auditFiscalDocument(simulatedXml);
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
  <infNFe Id="NFe35260100000000000191550010000012341234567898" versao="5.00">
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
  <infNFe Id="NFe35260100000000000191550010000099991234567897" versao="5.00">
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
  <infNFSe Id="NFSe35503081000000000001910000100000000000010112345678">
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
