export type AccountingChangeStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';

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

export interface AccountingChange {
  id: string;
  protocolNumber: string;        // Ex: ALT-2026-0001
  
  // Quem solicitou a alteração
  requesterName: string;         // Nome completo do solicitante
  requesterRole: string;         // Cargo ou Função (ex: Secretário Municipal, Diretor de Compras)
  requesterDepartment: string;   // Secretaria ou Órgão Solicitante
  requesterEmail?: string;
  requesterPhone?: string;
  
  // Dados da Alteração
  changeDate?: string;           // Data específica da alteração (Data completa: Dia, Mês e Ano - YYYY-MM-DD)
  changeType: AccountingChangeType;
  referenceDoc: string;          // Nº do Empenho, Proc. Administrativo ou Nota Fiscal
  fiscalYear: number;            // Exercício (ex: 2026)
  monthRef: string;              // Mês de Competência
  amount?: number;               // Valor envolvido na alteração (R$)
  
  // Justificativa e Descrição Técnica
  reason: string;                // Justificativa do pedido de alteração
  currentState?: string;         // Como está registrado atualmente nos sistemas contábeis (De)
  proposedState?: string;        // Como deve ser registrado após a alteração (Para)
  
  // Análise e Parecer do Contador / Setor Contábil
  status: AccountingChangeStatus;
  accountantName?: string;       // Nome do Contador Responsável
  accountantCrc?: string;        // CRC do Contador
  accountantNotes?: string;      // Parecer Técnico / Despacho
  reviewedAt?: string;           // Data da análise
  completedAt?: string;          // Data da efetivação
  
  // Anexos de Auditoria (Antes e Depois)
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentBeforeName?: string;
  attachmentBeforeUrl?: string;
  attachmentAfterName?: string;
  attachmentAfterUrl?: string;
  
  createdAt: string;
  updatedAt: string;
}

export const REQUESTER_ROLES = [
  'Secretário(a) Municipal',
  'Contador(a) / Setor Contábil',
  'Assessor(a) Contábil',
  'Controle Interno / Auditor(a)',
  'Assessor(a) Jurídico(a)',
  'Assessor(a) Especial / Técnico',
  'Diretor(a) Financeiro / Orçamentário',
  'Diretor(a) de Compras e Licitações',
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
    label: 'Aprovada pela Contabilidade',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800/60'
  },
  completed: {
    label: 'Efetivada nos Sistemas',
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
