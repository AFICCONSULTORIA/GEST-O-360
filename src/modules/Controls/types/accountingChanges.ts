/**
 * Tipos e Interfaces do Módulo de Controle e Tramitação de 
 * Solicitações de Retificação Contábil (SRC) - Gestão 360 Municipal
 * 
 * Em conformidade com:
 * - Lei Federal nº 4.320/1964 (Normas Gerais de Direito Financeiro)
 * - Lei Complementar nº 101/2000 (Lei de Responsabilidade Fiscal)
 * - NBC TSP (Normas Brasileiras de Contabilidade Aplicadas ao Setor Público)
 * - MCASP (Manual de Contabilidade Aplicada ao Setor Público - STN)
 * - Instruções e Resoluções Normativas dos Tribunais de Contas dos Estados (TCE)
 */

export type AccountingChangeStatus = 
  | 'pending' 
  | 'in_review' 
  | 'approved' 
  | 'rejected' 
  | 'completed';

export type AccountingChangeType = 
  | 'retificacao_empenho'
  | 'anulacao_empenho'
  | 'ajuste_liquidacao'
  | 'alteracao_dotacao'
  | 'reclassificacao_despesa'
  | 'ajuste_plano_contas'
  | 'cancelamento_restos_pagar'
  | 'suplementacao_orcamentaria'
  | 'conciliacao_bancaria'
  | 'outros';

// ---------------------------------------------------------------------------
// 1. ENUMS ESTRUTURADOS DO SISTEMA DE RETIFICAÇÃO CONTÁBIL (SRC)
// ---------------------------------------------------------------------------

export type TipoDocumentoContabil = 
  | 'EMPENHO' 
  | 'LIQUIDACAO' 
  | 'PAGAMENTO' 
  | 'LANCAMENTO_PATRIMONIAL' 
  | 'RESTOS_A_PAGAR';

export type TipoAjusteContabil = 
  | 'ESTORNO_TOTAL' 
  | 'ESTORNO_PARCIAL' 
  | 'COMPLEMENTACAO' 
  | 'TRANSFERENCIA_DESPESA' 
  | 'RECLASSIFICACAO_FONTE';

export type StatusSRC = 
  | 'RASCUNHO' 
  | 'AGUARDANDO_PARECER' 
  | 'AGUARDANDO_HOMOLOGACAO' 
  | 'APROVADO_EXECUTADO' 
  | 'INDEFERIDO';

export type EtapaTramitacao = 
  | 'ABERTURA' 
  | 'PARECER_CONTABIL' 
  | 'HOMOLOGACAO_CONTADOR_GERAL' 
  | 'EXECUCAO_LANCAMENTO' 
  | 'RECUSA';

// ---------------------------------------------------------------------------
// 2. MODELAGEM DE PARTIDAS CONTÁBEIS (PCASP - DÉBITO / CRÉDITO)
// ---------------------------------------------------------------------------
export interface PartidaContabil {
  contaDebitoCodigo: string;       // Ex: 3.3.9.0.30.00 (Material de Consumo)
  contaDebitoNome: string;
  contaCreditoCodigo: string;      // Ex: 1.1.1.1.1.00 (Caixa / Bancos)
  contaCreditoNome: string;
  fonteRecursoCodigo: string;      // Ex: 1.500.0000 (Recursos Ordinários)
  fonteRecursoNome: string;
  elementoDespesaCodigo?: string;  // Ex: 3.3.90.39 (Outros Serviços de Terceiros)
  elementoDespesaNome?: string;
  subfuncaoCodigo?: string;        // Ex: 12.361 (Ensino Fundamental)
  subfuncaoNome?: string;
  unidadeOrcamentaria?: string;    // Ex: 02.05 - Sec. Municipal de Educação
  valor: number;
  descricao?: string;
}

// ---------------------------------------------------------------------------
// 3. DOCUMENTOS COMPROBATÓRIOS COM HASH SHA-256 (INTEGRIDADE AUDITÁVEL)
// ---------------------------------------------------------------------------
export interface DocumentoComprobatorioSRC {
  id: string;
  solicitacaoId: string;
  tipoComprovante: 'Nota Fiscal' | 'Medição de Obras' | 'Parecer Jurídico' | 'Extrato Bancário' | 'Ofício Explicativo' | 'Contrato/Aditivo' | 'Outro';
  faseDocumento: 'ORIGINAL' | 'RETIFICADO' | 'COMPROBANTE';
  nomeArquivo: string;
  hashSha256: string;              // Impressão digital criptográfica do arquivo
  tamanhoBytes: number;
  urlArquivo?: string;
  arquivoBase64?: string;
  usuarioUploadNome?: string;
  dataHoraUpload: string;          // ISO 8601
}

// ---------------------------------------------------------------------------
// 4. TRILHA DE AUDITORIA E TRAMITAÇÃO IMUTÁVEL (TCE)
// ---------------------------------------------------------------------------
export interface TrilhaAuditoriaTramitacao {
  id: string;
  solicitacaoId: string;
  etapa: EtapaTramitacao;
  usuarioResponsavelId?: string;
  usuarioResponsavelNome: string;
  matriculaCargoUsuario: string;
  crcUsuario?: string;
  parecerDespacho: string;
  statusResultante: StatusSRC;
  ipOrigem?: string;
  userAgent?: string;
  dataHoraExata: string;           // ISO 8601 com carimbo de milissegundos
  assinaturaEletronicaHash: string; // Hash SHA-256 da etapa
}

// ---------------------------------------------------------------------------
// 5. INTERFACE PRINCIPAL: SOLICITAÇÃO DE RETIFICAÇÃO CONTÁBIL (SRC)
// ---------------------------------------------------------------------------
export interface SolicitacaoRetificacaoContabil {
  id: string;
  protocoloAnual: string;          // Ex: SRC-2026-00042
  exercicioFinanceiro: number;     // Ex: 2026
  mesCompetencia: number;          // 1 a 12
  unidadeGestora: string;          // Prefeitura Municipal
  secretariaSolicitante: string;   // Ex: Secretaria Municipal de Educação
  
  // Documento de Origem
  tipoDocumento: TipoDocumentoContabil;
  numeroDocumentoOrigem: string;   // Ex: Empenho nº 1245/2026
  dataFatoGerador: string;         // YYYY-MM-DD (Data exata do fato gerador original)
  dataDocumentoOrigem: string;     // YYYY-MM-DD (Data de emissão original)
  
  // Detalhes do Ajuste
  tipoAjuste: TipoAjusteContabil;
  valorOriginal: number;
  valorAjuste: number;
  justificativaFato: string;       // O que ocorreu e a motivação do pedido
  baseLegalMcasp: string;          // Ex: Art. 63 da Lei 4.320/64, MCASP 9ª Edição
  
  // Partidas Contábeis (De / Para estruturado)
  dadosContabeisOriginais: PartidaContabil;
  dadosContabeisPropostos: PartidaContabil;
  
  // Histórico Gerado para o Diário/Razão
  historicoPadraoRazao: string;
  
  // Status do Fluxo
  statusSRC: StatusSRC;
  
  // Rigor Temporal e Tramitação
  solicitanteId?: string;
  solicitanteNome: string;
  solicitanteCargo: string;
  solicitanteEmail?: string;
  solicitanteTelefone?: string;
  dataHoraSolicitacao: string;     // ISO 8601 (Timestamp exato)
  
  analistaContabilId?: string;
  analistaContabilNome?: string;
  parecerTecnicoTexto?: string;
  dataHoraParecerTecnico?: string; // ISO 8601
  
  contadorGeralId?: string;
  contadorGeralNome?: string;
  contadorGeralCrc?: string;
  despachoHomologacao?: string;
  dataHoraHomologacao?: string;    // ISO 8601
  
  dataLancamentoContabilEfetivo?: string; // YYYY-MM-DD (Data efetiva no balancete)
  dataHoraExecucaoSistema?: string;      // ISO 8601
  numeroLancamentoContabil?: string;     // Lançamento nº 4509/2026 no Razão
  
  documentosComprobatorios?: DocumentoComprobatorioSRC[];
  trilhaAuditoria?: TrilhaAuditoriaTramitacao[];
  
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 6. INTERFACE DE COMPATIBILIDADE AMPLA (AccountingChange)
// ---------------------------------------------------------------------------
export interface AccountingChange {
  id: string;
  protocolNumber: string;        // Ex: SRC-2026-00042 ou ALT-2026-0001
  
  // Quem solicitou a alteração
  requesterName: string;
  requesterRole: string;
  requesterDepartment: string;
  requesterEmail?: string;
  requesterPhone?: string;
  
  // Datas e Rigor Temporal
  changeDate?: string;           // Data específica da alteração (YYYY-MM-DD)
  dataFatoGerador?: string;      // Data exata do fato gerador (YYYY-MM-DD)
  dataDocumentoOrigem?: string;  // Data do documento original (YYYY-MM-DD)
  dataLancamentoEfetivo?: string;// Data do lançamento no razão/balancete (YYYY-MM-DD)
  dataHoraSolicitacao?: string;  // ISO 8601
  dataHoraParecer?: string;      // ISO 8601
  dataHoraHomologacao?: string;  // ISO 8601
  
  // Classificação
  changeType: AccountingChangeType;
  tipoDocumentoSRC?: TipoDocumentoContabil;
  tipoAjusteSRC?: TipoAjusteContabil;
  referenceDoc: string;          // Nº do Empenho, Proc. Administrativo ou Nota Fiscal
  fiscalYear: number;            // Exercício (ex: 2026)
  monthRef: string;              // Mês de Competência
  amount?: number;               // Valor envolvido na alteração (R$)
  valorOriginal?: number;
  
  // Justificativa e Descrição Técnica
  reason: string;
  baseLegalMcasp?: string;
  currentState?: string;         // Como está registrado atualmente
  proposedState?: string;        // Como deve ser registrado após a alteração
  historicoPadraoRazao?: string; // Histórico padrão oficial para o diário/razão
  
  // Partidas Contábeis estruturadas
  partidaOriginal?: PartidaContabil;
  partidaProposta?: PartidaContabil;
  
  // Análise e Parecer do Contador / Setor Contábil
  status: AccountingChangeStatus;
  statusSRC?: StatusSRC;
  accountantName?: string;
  accountantCrc?: string;
  accountantNotes?: string;
  reviewedAt?: string;
  completedAt?: string;
  
  // Anexos de Auditoria com Hash SHA-256
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentBeforeName?: string;
  attachmentBeforeUrl?: string;
  attachmentBeforeHash?: string;
  attachmentAfterName?: string;
  attachmentAfterUrl?: string;
  attachmentAfterHash?: string;
  
  // Trilha de Tramitação
  trilhaAuditoria?: TrilhaAuditoriaTramitacao[];
  documentosSrc?: DocumentoComprobatorioSRC[];
  
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 7. TABELAS DE DOMÍNIO E CONSTANTES GOVERNAMENTAIS
// ---------------------------------------------------------------------------

export const TIPOS_DOCUMENTOS_CONTABEIS: { value: TipoDocumentoContabil; label: string; sigla: string; desc: string }[] = [
  { value: 'EMPENHO', label: 'Nota de Empenho (NE)', sigla: 'NE', desc: 'Anulação total/parcial, retificação de credor, dotação ou elemento de despesa' },
  { value: 'LIQUIDACAO', label: 'Liquidação da Despesa (NL)', sigla: 'NL', desc: 'Estorno ou retificação de nota fiscal, medição de obra ou serviço' },
  { value: 'PAGAMENTO', label: 'Ordem de Pagamento / Guia (OP/GR)', sigla: 'OP', desc: 'Retificação de conta bancária, repasses, retenções e pagamentos' },
  { value: 'LANCAMENTO_PATRIMONIAL', label: 'Lançamento Patrimonial (VPD/VPA)', sigla: 'LP', desc: 'Variações patrimoniais diminutivas/aumentativas, bens móveis/imóveis e depreciação' },
  { value: 'RESTOS_A_PAGAR', label: 'Restos a Pagar (RPP / RPNP)', sigla: 'RP', desc: 'Baixa, cancelamento ou reclassificação de restos a pagar processados e não processados' }
];

export const TIPOS_AJUSTES_CONTABEIS: { value: TipoAjusteContabil; label: string; desc: string }[] = [
  { value: 'ESTORNO_TOTAL', label: 'Estorno Total', desc: 'Anulação integral do lançamento contábil original por erro de fato ou cancelamento' },
  { value: 'ESTORNO_PARCIAL', label: 'Estorno Parcial', desc: 'Redução parcial do valor registrado incorretamente' },
  { value: 'COMPLEMENTACAO', label: 'Complementação de Valor', desc: 'Adição de valor por insuficiência do registro primitivo' },
  { value: 'TRANSFERENCIA_DESPESA', label: 'Transferência de Despesa / Dotação', desc: 'Remanejamento da despesa para a dotação orçamentária devida' },
  { value: 'RECLASSIFICACAO_FONTE', label: 'Reclassificação de Fonte de Recursos', desc: 'Ajuste de destinação de recursos vinculados/ordinários para conformidade com a LRF' }
];

export const BASES_LEGAIS_MCASP = [
  'Art. 63 da Lei Federal nº 4.320/1964 (Liquidação da Despesa)',
  'Art. 60 da Lei Federal nº 4.320/1964 (Emissão e Anulação de Empenho)',
  'Art. 64 da Lei Federal nº 4.320/1964 (Ordem de Pagamento e Quitação)',
  'Art. 35 da Lei Federal nº 4.320/1964 (Regime Contábil Misto: Caixa p/ Receita, Competência p/ Despesa)',
  'Art. 42 da Lei Complementar nº 101/2000 - LRF (Restos a Pagar no Último Ano de Mandato)',
  'MCASP 9ª Edição - Parte II (Procedimentos Contábeis Orçamentários - PCO)',
  'MCASP 9ª Edição - Parte III (Procedimentos Contábeis Patrimoniais - PCP - VPD e VPA)',
  'MCASP 9ª Edição - Parte IV (Plano de Contas Aplicado ao Setor Público - PCASP)',
  'NBC TSP Estrutura Conceitual (Retificação de Erro de Período Anterior)',
  'Resolução Normativa do Tribunal de Contas do Estado (TCE) sobre Prestação de Contas'
];

export const REQUESTER_ROLES = [
  'Secretário(a) Municipal',
  'Contador(a) Geral do Município',
  'Assessor(a) Contábil / Setor Técnico',
  'Controlador(a) Interno / Auditor(a)',
  'Procurador(a) / Assessor(a) Jurídico(a)',
  'Diretor(a) Financeiro / Orçamentário',
  'Diretor(a) de Compras e Licitações',
  'Fiscal de Contrato / Gestor(a)',
  'Chefe de Gabinete',
  'Prefeito(a) / Vice-Prefeito(a)',
  'Presidente da Câmara / Vereador(a)',
  'Servidor(a) Efetivo',
  'Servidor(a) Comissionado',
  'Outro Cargo / Função'
];

export const MUNICIPAL_DEPARTMENTS = [
  'Gabinete do Prefeito',
  'Secretaria Municipal de Finanças / Fazenda',
  'Secretaria Municipal de Administração',
  'Secretaria Municipal de Educação',
  'Secretaria Municipal de Saúde',
  'Secretaria Municipal de Obras e Serviços Públicos',
  'Secretaria Municipal de Meio Ambiente e Turismo',
  'Secretaria Municipal de Assistência Social',
  'Secretaria Municipal de Agricultura e Pecuária',
  'Controladoria Geral do Município / Controle Interno',
  'Procuradoria Geral do Município',
  'Câmara Municipal de Vereadores',
  'Fundo Municipal de Saúde (FMS)',
  'Fundo Municipal de Educação (FUNDEB)',
  'Fundo Municipal de Previdência Social (RPPS)',
  'Departamento de Compras, Frotas e Licitações',
  'Outro Órgão / Autarquia'
];

export const ACCOUNTING_CHANGE_TYPES: { value: AccountingChangeType; label: string; desc: string }[] = [
  { value: 'retificacao_empenho', label: 'Retificação de Empenho', desc: 'Correção de credor, valor, especificação ou fonte de recursos' },
  { value: 'anulacao_empenho', label: 'Anulação de Empenho (Total/Parcial)', desc: 'Cancelamento total ou parcial de empenho emitido' },
  { value: 'ajuste_liquidacao', label: 'Ajuste de Liquidação / Pagamento', desc: 'Correção de valores, retenções ou dados bancários de liquidação' },
  { value: 'alteracao_dotacao', label: 'Alteração de Dotação Orçamentária', desc: 'Mudança de dotação, projeto/atividade ou órgão executor' },
  { value: 'reclassificacao_despesa', label: 'Reclassificação de Despesa/Receita', desc: 'Ajuste no elemento de despesa ou natureza de receita' },
  { value: 'ajuste_plano_contas', label: 'Ajuste no Plano de Contas (PCASP)', desc: 'Lançamentos de reclassificação no plano contábil municipal' },
  { value: 'cancelamento_restos_pagar', label: 'Cancelamento de Restos a Pagar', desc: 'Baixa ou prescrição de restos a pagar processados/não processados' },
  { value: 'suplementacao_orcamentaria', label: 'Suplementação / Crédito Adicional', desc: 'Remanejamento ou solicitação de abertura de crédito' },
  { value: 'conciliacao_bancaria', label: 'Conciliação Bancária / Lançamento', desc: 'Ajuste de saldo ou regularização de divergência bancária' },
  { value: 'outros', label: 'Outra Alteração Contábil', desc: 'Outras solicitações de alteração nos registros contábeis' }
];

export const ACCOUNTING_STATUS_CONFIG: Record<AccountingChangeStatus, { label: string; bg: string; text: string; border: string }> = {
  pending: {
    label: 'Aguardando Análise',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/60'
  },
  in_review: {
    label: 'Em Análise Contábil',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800/60'
  },
  approved: {
    label: 'Aprovada / Homologada',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800/60'
  },
  completed: {
    label: 'Efetivada no Razão',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/60'
  },
  rejected: {
    label: 'Indeferida / Recusada',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/60'
  }
};

export const STATUS_SRC_CONFIG: Record<StatusSRC, { label: string; bg: string; text: string; border: string }> = {
  RASCUNHO: {
    label: 'Rascunho Inicial',
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-700 dark:text-neutral-300',
    border: 'border-neutral-300 dark:border-neutral-700'
  },
  AGUARDANDO_PARECER: {
    label: 'Aguardando Parecer Técnico',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/60'
  },
  AGUARDANDO_HOMOLOGACAO: {
    label: 'Aguardando Homologação (Contador/Secretário)',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800/60'
  },
  APROVADO_EXECUTADO: {
    label: 'Aprovado & Efetivado no Razão',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/60'
  },
  INDEFERIDO: {
    label: 'Indeferido / Recusado com Despacho',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/60'
  }
};
