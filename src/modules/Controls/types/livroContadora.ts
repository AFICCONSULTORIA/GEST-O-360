export type CanalSolicitacao = 
  | 'WhatsApp' 
  | 'E-mail' 
  | 'Ofício' 
  | 'Memorando Interno' 
  | 'Verbal'
  | 'Outro';

export type AcaoContadora = 
  | 'Aprovado e Feito' 
  | 'Recusado' 
  | 'Feito com Ressalva'
  | 'Em Análise';

export interface RegistroAlteracaoContabil {
  id: string;
  dataHoraRegistro: string;
  dataPedido: string; // YYYY-MM-DD
  solicitanteNome: string;
  solicitanteSetorCargo: string;
  canalSolicitacao: CanalSolicitacao;
  documentoAfetado: string; // Ex: 'Empenho 432/2026'
  valorEnvolvido?: number;
  oQueFoiPedido: string;
  justificativaAlegada?: string;
  acaoDaContadora: AcaoContadora;
  dataHoraExecucao?: string; // ISO ou YYYY-MM-DDTHH:mm
  observacaoTecnicaContadora?: string;
  comprovanteNome?: string;
  comprovanteUrl?: string; // base64 data URL ou link
  comprovanteTipo?: string; // 'image/png', 'application/pdf', etc.
  createdAt?: string;
  updatedAt?: string;
}

export const CANAIS_SOLICITACAO: { value: CanalSolicitacao; label: string; cor: string }[] = [
  { value: 'WhatsApp', label: 'WhatsApp (Print)', cor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
  { value: 'E-mail', label: 'E-mail', cor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800' },
  { value: 'Ofício', label: 'Ofício', cor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' },
  { value: 'Memorando Interno', label: 'Memorando Interno', cor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' },
  { value: 'Verbal', label: 'Verbal / Presencial', cor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
  { value: 'Outro', label: 'Outro Canal', cor: 'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800' }
];

export const ACOES_CONTADORA_CONFIG: Record<AcaoContadora, { label: string; bg: string; text: string; border: string }> = {
  'Aprovado e Feito': {
    label: 'Aprovado e Feito no ERP',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  'Feito com Ressalva': {
    label: 'Feito com Ressalva',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  'Recusado': {
    label: 'Recusado / Indeferido',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800'
  },
  'Em Análise': {
    label: 'Em Análise',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  }
};

export const SETORES_SUGESTOES = [
  'Gabinete do Prefeito',
  'Sec. de Finanças / Fazenda',
  'Sec. de Administração',
  'Sec. de Obras e Serviços Públicos',
  'Sec. de Saúde',
  'Sec. de Educação e Cultura',
  'Sec. de Assistência Social',
  'Setor de Compras e Licitação',
  'Setor de Contratos / Fiscal de Contrato',
  'Setor de Recursos Humanos / Folha',
  'Controle Interno Municipal',
  'Procuradoria Jurídica'
];

export const DOCUMENTOS_SUGESTOES = [
  'Empenho',
  'Liquidação',
  'Ordem de Pagamento (OP)',
  'Dotação Orçamentária',
  'Restos a Pagar',
  'Retificação de Credor',
  'Reclassificação de Elemento / Fonte'
];
