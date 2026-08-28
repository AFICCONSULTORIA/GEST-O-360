export type TipoMateria = 
  | 'Projeto de Lei Ordinária'
  | 'Projeto de Lei Complementar'
  | 'Decreto Legislativo'
  | 'Projeto de Resolução'
  | 'Emenda à LOM'
  | 'Moção'
  | 'Requerimento'
  | 'Pedido de Informação'
  | 'Veto';

export type RegimeTramitacao = 'Ordinário' | 'Urgência' | 'Urgência Urgentíssima';

export type StatusMateria = 
  | 'Protocolado'
  | 'Lido no Expediente'
  | 'Em Comissão'
  | 'Apto para Ordem do Dia'
  | '1ª Votação Aprovada'
  | '2ª Votação Aprovada'
  | 'Aprovado em Redação Final'
  | 'Enviado ao Executivo'
  | 'Sancionado'
  | 'Promulgado'
  | 'Vetado'
  | 'Rejeitado'
  | 'Arquivado';

export interface Tramitacao {
  id: string;
  materia_id: string;
  data_tramitacao: string;
  fase: string;
  despacho: string;
  responsavel: string;
  status_resultante: StatusMateria;
  documento_anexo?: string;
}

export interface Parecer {
  id: string;
  comissao_id: string;
  comissao_nome?: string;
  materia_id: string;
  relator_id?: string;
  relator_nome?: string;
  conclusao: 'Favorável' | 'Contrário' | 'Favorável com Emenda Substitutiva' | 'Favorável com Emenda Aditiva';
  relatorio: string;
  voto_relator: string;
  data_emissao: string;
  aprovado_comissao: boolean;
  documento_url?: string;
}

export interface MateriaLegislativa {
  id: string;
  numero: string;
  ano: number;
  tipo: TipoMateria;
  ementa: string;
  texto_integral: string;
  autor_id?: string;
  autor_nome: string;
  coautores?: string[];
  regime: RegimeTramitacao;
  status: StatusMateria;
  comissao_atual_id?: string;
  comissao_atual_nome?: string;
  relator_id?: string;
  relator_nome?: string;
  data_protocolo: string;
  data_limite_comissao?: string;
  link_anexo?: string;
  tags?: string[];
  tramitacoes?: Tramitacao[];
  pareceres?: Parecer[];
  votacoes?: Votacao[];
  institution_id?: string;
}

export interface Vereador {
  id: string;
  nome: string;
  nome_parlamentar: string;
  partido: string;
  numero_urna?: string;
  cargo_mesa: 'Presidente' | 'Vice-Presidente' | '1º Secretário' | '2º Secretário' | 'Vereador(a)' | 'Líder de Bancada';
  bancada?: string;
  foto_url?: string;
  email: string;
  telefone?: string;
  gabinete?: string;
  biografia?: string;
  redes_sociais?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  mandato_inicio: string;
  mandato_fim: string;
  ativo: boolean;
  estatisticas?: {
    pls_apresentados: number;
    indicacoes_protocoladas: number;
    presenca_percent: number;
    verba_gabinete_utilizada: number;
  };
  institution_id?: string;
}

export interface Comissao {
  id: string;
  nome: string;
  sigla: string;
  tipo: 'Permanente' | 'Especial' | 'CPI' | 'Representação';
  descricao: string;
  presidente_id?: string;
  presidente_nome?: string;
  vice_presidente_id?: string;
  vice_presidente_nome?: string;
  relator_padrao_id?: string;
  membros_ids: string[];
  membros_nomes?: string[];
  materias_em_analise_count?: number;
  ativo: boolean;
  institution_id?: string;
}

export interface PresencaVereador {
  vereador_id: string;
  nome_parlamentar: string;
  foto_url?: string;
  partido: string;
  presente: boolean;
  justificativa?: string;
  horario_registro?: string;
}

export type TipoSessao = 'Ordinária' | 'Extraordinária' | 'Solene' | 'Audiência Pública';
export type StatusSessao = 'Agendada' | 'Em Andamento' | 'Suspensa' | 'Encerrada' | 'Cancelada';

export interface SessaoPlenaria {
  id: string;
  numero: number;
  ano: number;
  tipo: TipoSessao;
  data_sessao: string;
  hora_inicio: string;
  hora_fim?: string;
  status: StatusSessao;
  quorum_abertura: number;
  presencas: PresencaVereador[];
  pauta_expediente: string[]; // IDs de matérias ou temas
  pauta_ordem_dia: string[]; // IDs de matérias a votar
  ata_resumida?: string;
  video_transmissao_url?: string;
  materia_em_discussao_id?: string;
  institution_id?: string;
}

export interface VotoIndividual {
  vereador_id: string;
  nome_parlamentar: string;
  foto_url?: string;
  partido: string;
  voto: 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE';
}

export interface Votacao {
  id: string;
  sessao_id: string;
  materia_id: string;
  materia_numero?: string;
  materia_ementa?: string;
  tipo_votacao: 'Nominal' | 'Secreta' | 'Simbólica';
  tipo_quorum: 'Maioria Simples' | 'Maioria Absoluta' | 'Dois Terços (2/3)';
  turno: '1º Turno' | '2º Turno' | 'Único' | 'Redação Final';
  resultado: 'Aprovado' | 'Rejeitado' | 'Empatado' | 'Retirado de Pauta';
  votos_sim: number;
  votos_nao: number;
  votos_abstencao: number;
  detalhes_votos: VotoIndividual[];
  data_votacao: string;
  institution_id?: string;
}

export type StatusIndicacao = 'Aguardando Envio' | 'Encaminhado' | 'Em Análise' | 'Respondido' | 'Atendido' | 'Vencido';

export interface Indicacao {
  id: string;
  numero: string;
  ano: number;
  tipo: 'Indicação' | 'Requerimento' | 'Pedido de Providência';
  vereador_id?: string;
  vereador_nome: string;
  bairro?: string;
  secretaria_destino: string;
  descricao: string;
  data_envio: string;
  prazo_resposta_dias: number;
  data_limite_resposta: string;
  data_resposta?: string;
  resposta_executivo?: string;
  status: StatusIndicacao;
  anexo_resposta?: string;
  institution_id?: string;
}

export interface SugestaoPopular {
  id: string;
  nome_cidadao: string;
  email: string;
  telefone?: string;
  bairro?: string;
  titulo: string;
  descricao: string;
  categoria: 'Infraestrutura' | 'Saúde' | 'Educação' | 'Segurança' | 'Meio Ambiente' | 'Cultura & Esporte' | 'Outros';
  vereador_destinatario_id?: string;
  vereador_destinatario_nome?: string;
  apoios_count: number;
  status: 'Em Avaliação' | 'Acolhida pelo Gabinete' | 'Convertida em PL' | 'Arquivada';
  resposta_gabinete?: string;
  created_at: string;
  institution_id?: string;
}

export interface CriterioPNTPCamara {
  id: string;
  categoria: string;
  item: string;
  criterio_atricon: string;
  peso: number;
  atendido: boolean;
  obrigatorio: boolean;
  evidencia?: string;
  link_ou_evidencia?: string;
  recomendacao?: string;
}

export type TipoCronometro = 
  | 'pequeno_expediente' 
  | 'grande_expediente' 
  | 'ordem_do_dia' 
  | 'pela_ordem' 
  | 'lideranca' 
  | 'aparte' 
  | 'livre';

export interface CronometroConfig {
  tipo: TipoCronometro;
  label: string;
  duracao_segundos: number;
}
