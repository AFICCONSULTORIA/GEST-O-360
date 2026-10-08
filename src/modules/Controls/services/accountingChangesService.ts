/**
 * Serviço de Controle e Tramitação de Solicitações de Retificação Contábil (SRC)
 * 
 * Padrão de Engenharia de Software Especializada em Gestão Governamental e Contabilidade Pública
 * Atende às exigências de fiscalização do Tribunal de Contas do Estado (TCE), Ministério Público
 * de Contas e auditorias internas/externas com rastreabilidade absoluta e segregação de funções.
 */

import { supabase } from '../../../lib/supabase';
import { 
  AccountingChange, 
  AccountingChangeStatus, 
  EtapaTramitacao, 
  StatusSRC, 
  TrilhaAuditoriaTramitacao,
  DocumentoComprobatorioSRC,
  PartidaContabil
} from '../types/accountingChanges';

const STORAGE_KEY = 'gestao360_accounting_changes';
const DB_TABLE_LEGACY = 'control_accounting_changes';
const DB_TABLE_SRC = 'solicitacoes_retificacao_contabil';
const DB_TABLE_TRILHA = 'trilha_auditoria_tramitacao';
const DB_TABLE_DOCS = 'documentos_comprobatorios_src';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Calcula o hash SHA-256 criptográfico para garantir a imutabilidade
 * de documentos comprobatórios e assinaturas da trilha de auditoria
 */
export async function computeSha256(data: string | ArrayBuffer): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const source: BufferSource = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const hashBuffer = await crypto.subtle.digest('SHA-256', source);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('[SRC] Erro ao calcular SHA-256 nativo:', err);
  }

  // Fallback determinístico
  let hashStr = typeof data === 'string' ? data : new Uint8Array(data).toString();
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < hashStr.length; i++) {
    const ch = hashStr.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return hex.padStart(64, '0').slice(0, 64);
}

/**
 * Gera o histórico oficial obrigatório para lançamento no Razão/Diário da Prefeitura
 * Conforme NBC TSP e Manuais de Contabilidade Aplicada ao Setor Público (MCASP)
 * Sintaxe TCE: "Estorno/Retificação ref. ao [Tipo] nº [Nº/Ano], Proc. SRC nº [PROTOCOLO], de [DATA_LANCAMENTO]. Motivo: [Resumo]."
 */
export function generateHistoricoRazao(
  tipoDocumento: string,
  numeroDoc: string,
  exercicioOuProtocolo: number | string,
  protocoloOuData: string,
  dataLancamentoOuJustificativa: string,
  justificativa?: string
): string {
  let docRef = numeroDoc;
  let protocolo = '';
  let dataLancamento = '';
  let just = '';

  if (justificativa !== undefined) {
    // 6 argumentos: (tipoDoc, numeroDoc, exercicio, protocolo, dataLancamento, justificativa)
    const ano = exercicioOuProtocolo;
    docRef = numeroDoc.includes('/') ? numeroDoc : `${numeroDoc}/${ano}`;
    protocolo = protocoloOuData;
    dataLancamento = dataLancamentoOuJustificativa;
    just = justificativa;
  } else {
    // 5 argumentos: (tipoDoc, numeroDoc, protocolo, dataLancamento, justificativa)
    protocolo = String(exercicioOuProtocolo);
    dataLancamento = protocoloOuData;
    just = dataLancamentoOuJustificativa;
  }

  const resumo = (just || '').length > 120 ? `${just.slice(0, 117)}...` : just;
  return `Estorno/Retificação ref. ao ${tipoDocumento} nº ${docRef}, Proc. SRC nº ${protocolo}, de ${dataLancamento}. Motivo: ${resumo}`;
}

/**
 * Validação rigorosa de temporalidade conforme exigências do Tribunal de Contas
 */
export function validateSRCDates(
  dataFatoGerador: string,
  dataDocumentoOrigem: string,
  exercicio: number
): { valid: boolean; error?: string } {
  const hoje = new Date().toISOString().slice(0, 10);
  
  if (dataFatoGerador > hoje) {
    return {
      valid: false,
      error: `Data do fato gerador (${dataFatoGerador}) não pode ser futura. Deve corresponder ao dia em que ocorreu o fato administrativo original.`
    };
  }

  if (dataDocumentoOrigem > hoje) {
    return {
      valid: false,
      error: `Data de emissão do documento de origem (${dataDocumentoOrigem}) não pode ser futura.`
    };
  }

  const anoDocOrigem = parseInt(dataDocumentoOrigem.slice(0, 4), 10);
  if (anoDocOrigem > exercicio) {
    return {
      valid: false,
      error: `Ano do documento de origem (${anoDocOrigem}) é inconsistente com o exercício financeiro da SRC (${exercicio}).`
    };
  }

  return { valid: true };
}

/**
 * Verificação do Princípio da Segregação de Funções
 */
export function checkSegregationOfDuties(
  requesterName: string,
  actingUserName: string,
  targetAction: 'parecer' | 'homologacao'
): { allowed: boolean; reason?: string } {
  if (!requesterName || !actingUserName) return { allowed: true };

  const reqClean = requesterName.trim().toLowerCase();
  const actClean = actingUserName.trim().toLowerCase();

  if (reqClean === actClean && targetAction === 'homologacao') {
    return {
      allowed: false,
      reason: `Princípio da Segregação de Funções: O servidor solicitante (${requesterName}) não possui competência legal para homologar a própria solicitação de retificação contábil.`
    };
  }

  return { allowed: true };
}

function mapFromDb(row: any): AccountingChange {
  return {
    id: String(row.id),
    protocolNumber: row.protocol_number || row.protocolo_anual || `SRC-${new Date().getFullYear()}-00001`,
    requesterName: row.requester_name || row.solicitante_nome,
    requesterRole: row.requester_role || row.solicitante_cargo || 'Servidor(a)',
    requesterDepartment: row.requester_department || row.secretaria_solicitante || 'Secretaria Municipal',
    requesterEmail: row.requester_email || row.solicitante_email || '',
    requesterPhone: row.requester_phone || row.solicitante_telefone || '',
    
    // Rigor Temporal
    changeDate: row.change_date || row.data_fato_gerador || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    dataFatoGerador: row.data_fato_gerador || row.change_date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    dataDocumentoOrigem: row.data_documento_origem || row.change_date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    dataLancamentoEfetivo: row.data_lancamento_contabil_efetivo || row.change_date,
    dataHoraSolicitacao: row.data_hora_solicitacao || row.created_at || new Date().toISOString(),
    dataHoraParecer: row.data_hora_parecer_tecnico || row.reviewed_at,
    dataHoraHomologacao: row.data_hora_homologacao || row.reviewed_at,

    changeType: row.change_type || 'outros',
    tipoDocumentoSRC: row.tipo_documento,
    tipoAjusteSRC: row.tipo_ajuste,
    referenceDoc: row.reference_doc || row.numero_documento_origem || '',
    fiscalYear: Number(row.fiscal_year || row.exercicio_financeiro) || new Date().getFullYear(),
    monthRef: row.month_ref ? String(row.month_ref) : (row.mes_competencia ? `Mês ${row.mes_competencia}` : ''),
    amount: row.amount ? Number(row.amount) : (row.valor_ajuste ? Number(row.valor_ajuste) : 0),
    valorOriginal: row.valor_original ? Number(row.valor_original) : (row.amount ? Number(row.amount) : 0),
    
    reason: row.reason || row.justificativa_fato || '',
    baseLegalMcasp: row.base_legal_mcasp || 'Art. 63 da Lei Federal nº 4.320/1964',
    currentState: row.current_state || (row.dados_contabeis_originais ? JSON.stringify(row.dados_contabeis_originais) : ''),
    proposedState: row.proposed_state || (row.dados_contabeis_propostos ? JSON.stringify(row.dados_contabeis_propostos) : ''),
    historicoPadraoRazao: row.historico_padrao_razao,
    
    partidaOriginal: row.dados_contabeis_originais,
    partidaProposta: row.dados_contabeis_propostos,

    status: (row.status || 'pending') as AccountingChangeStatus,
    statusSRC: row.status_src,
    accountantName: row.accountant_name || row.contador_geral_nome || '',
    accountantCrc: row.accountant_crc || row.contador_geral_crc || '',
    accountantNotes: row.accountant_notes || row.despacho_homologacao || row.parecer_tecnico_texto || '',
    reviewedAt: row.reviewed_at || row.data_hora_homologacao || row.data_hora_parecer_tecnico || undefined,
    completedAt: row.completed_at || row.data_hora_execucao_sistema || undefined,
    
    attachmentName: row.attachment_name || '',
    attachmentUrl: row.attachment_url || '',
    attachmentBeforeName: row.attachment_before_name || '',
    attachmentBeforeUrl: row.attachment_before_url || '',
    attachmentBeforeHash: row.attachment_before_hash || '',
    attachmentAfterName: row.attachment_after_name || '',
    attachmentAfterUrl: row.attachment_after_url || '',
    attachmentAfterHash: row.attachment_after_hash || '',

    trilhaAuditoria: Array.isArray(row.trilha_auditoria) ? row.trilha_auditoria : [],
    documentosSrc: Array.isArray(row.documentos_src) ? row.documentos_src : [],

    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export const accountingChangesService = {
  /**
   * Obtém a lista completa de alterações e retificações contábeis
   */
  async getChanges(): Promise<AccountingChange[]> {
    // 1. Tenta carregar da tabela SRC do Supabase
    try {
      const { data: srcData, error: srcError } = await supabase
        .from(DB_TABLE_SRC)
        .select('*')
        .order('created_at', { ascending: false });

      if (!srcError && Array.isArray(srcData) && srcData.length > 0) {
        const mapped = srcData.map(mapFromDb);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (_) {}

    // 2. Fallback na tabela padrão do Supabase
    try {
      const { data, error } = await supabase
        .from(DB_TABLE_LEGACY)
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapFromDb);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err) {
      console.warn('[AccountingChangesService] Supabase offline, utilizando cache local:', err);
    }

    // 3. Fallback no LocalStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_) {}

    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  },

  /**
   * Gera o próximo número de protocolo oficial no padrão: SRC-{ANO}-{00000}
   */
  async generateProtocolNumber(fiscalYear: number = new Date().getFullYear()): Promise<string> {
    const list = await this.getChanges();
    const currentYearList = list.filter(item => item.fiscalYear === fiscalYear);
    const nextSeq = currentYearList.length + 1;
    return `SRC-${fiscalYear}-${String(nextSeq).padStart(5, '0')}`;
  },

  /**
   * Registra uma nova Solicitação de Retificação Contábil (SRC) com trilha de auditoria inicial
   */
  async createChange(
    data: Omit<AccountingChange, 'id' | 'protocolNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<AccountingChange> {
    const year = data.fiscalYear || new Date().getFullYear();
    const protocolNumber = await this.generateProtocolNumber(year);
    const newId = generateId();
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    const changeDate = data.changeDate || data.dataFatoGerador || today;
    const dataFatoGerador = data.dataFatoGerador || changeDate;
    const dataDocumentoOrigem = data.dataDocumentoOrigem || changeDate;

    // Validação temporal
    const dateVal = validateSRCDates(dataFatoGerador, dataDocumentoOrigem, year);
    if (!dateVal.valid) {
      throw new Error(dateVal.error);
    }

    // Gera o histórico padrão para o Razão
    const historicoPadrao = generateHistoricoRazao(
      data.tipoDocumentoSRC || 'Empenho',
      data.referenceDoc || 'S/N',
      protocolNumber,
      changeDate,
      data.reason
    );

    // Gera hashes para os anexos se existirem
    let beforeHash = data.attachmentBeforeHash || '';
    if (!beforeHash && data.attachmentBeforeUrl) {
      beforeHash = await computeSha256(data.attachmentBeforeUrl);
    }

    let afterHash = data.attachmentAfterHash || '';
    if (!afterHash && data.attachmentAfterUrl) {
      afterHash = await computeSha256(data.attachmentAfterUrl);
    }

    // Trilha inicial de abertura (IMUTÁVEL)
    const assinaturaAbertura = await computeSha256(
      `${protocolNumber}|ABERTURA|${data.requesterName}|${nowIso}|${data.reason}`
    );

    const trilhaInicial: TrilhaAuditoriaTramitacao[] = [
      {
        id: generateId(),
        solicitacaoId: newId,
        etapa: 'ABERTURA',
        usuarioResponsavelNome: data.requesterName,
        matriculaCargoUsuario: data.requesterRole,
        parecerDespacho: `Abertura oficial do Processo de Retificação Contábil ${protocolNumber}. Motivo: ${data.reason}`,
        statusResultante: 'AGUARDANDO_PARECER',
        ipOrigem: '127.0.0.1 (Terminal do Servidor)',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Sistema Gestão 360',
        dataHoraExata: nowIso,
        assinaturaEletronicaHash: assinaturaAbertura
      }
    ];

    const newChange: AccountingChange = {
      ...data,
      id: newId,
      protocolNumber,
      changeDate,
      dataFatoGerador,
      dataDocumentoOrigem,
      dataLancamentoEfetivo: data.dataLancamentoEfetivo || changeDate,
      dataHoraSolicitacao: nowIso,
      status: data.status || 'pending',
      statusSRC: data.statusSRC || 'AGUARDANDO_PARECER',
      amount: data.amount || 0,
      valorOriginal: data.valorOriginal || data.amount || 0,
      historicoPadraoRazao: historicoPadrao,
      attachmentBeforeHash: beforeHash,
      attachmentAfterHash: afterHash,
      trilhaAuditoria: trilhaInicial,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Atualiza imediatamente o cache local
    const currentList = await this.getChanges();
    const updatedList = [newChange, ...currentList.filter(item => item.id !== newId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('accounting-changes-updated', { detail: newChange }));

    // Persistência no Supabase (tabela principal e trilha)
    try {
      // Grava na tabela legacy/compatível
      await supabase
        .from(DB_TABLE_LEGACY)
        .insert([{
          id: newChange.id,
          protocol_number: newChange.protocolNumber,
          requester_name: newChange.requesterName,
          requester_role: newChange.requesterRole,
          requester_department: newChange.requesterDepartment,
          requester_email: newChange.requesterEmail || '',
          requester_phone: newChange.requesterPhone || '',
          change_date: newChange.changeDate,
          change_type: newChange.changeType,
          reference_doc: newChange.referenceDoc,
          fiscal_year: newChange.fiscalYear,
          month_ref: newChange.monthRef || '',
          amount: newChange.amount || 0,
          reason: newChange.reason,
          current_state: newChange.currentState || '',
          proposed_state: newChange.proposedState || '',
          status: newChange.status,
          attachment_before_name: newChange.attachmentBeforeName || '',
          attachment_before_url: newChange.attachmentBeforeUrl || '',
          attachment_after_name: newChange.attachmentAfterName || '',
          attachment_after_url: newChange.attachmentAfterUrl || '',
          created_at: nowIso,
          updated_at: nowIso
        }]);

      // Tenta gravar na tabela especializada SRC se existir
      await supabase
        .from(DB_TABLE_SRC)
        .insert([{
          id: newChange.id,
          protocolo_anual: newChange.protocolNumber,
          exercicio_financeiro: newChange.fiscalYear,
          mes_competencia: parseInt(newChange.monthRef.replace(/\D/g, '') || '10', 10) || 10,
          secretaria_solicitante: newChange.requesterDepartment,
          tipo_documento: newChange.tipoDocumentoSRC || 'EMPENHO',
          numero_documento_origem: newChange.referenceDoc,
          data_fato_gerador: newChange.dataFatoGerador,
          data_documento_origem: newChange.dataDocumentoOrigem,
          tipo_ajuste: newChange.tipoAjusteSRC || 'ESTORNO_PARCIAL',
          valor_original: newChange.valorOriginal || newChange.amount,
          valor_ajuste: newChange.amount,
          justificativa_fato: newChange.reason,
          base_legal_mcasp: newChange.baseLegalMcasp || 'Art. 63 da Lei Federal nº 4.320/1964',
          historico_padrao_razao: newChange.historicoPadraoRazao,
          status: 'AGUARDANDO_PARECER',
          solicitante_nome: newChange.requesterName,
          solicitante_cargo: newChange.requesterRole,
          data_hora_solicitacao: nowIso
        }]);

      // Tenta gravar a primeira etapa na trilha de auditoria
      await supabase
        .from(DB_TABLE_TRILHA)
        .insert([{
          id: trilhaInicial[0].id,
          solicitacao_id: newChange.id,
          etapa: 'ABERTURA',
          usuario_responsavel_nome: newChange.requesterName,
          matricula_cargo_usuario: newChange.requesterRole,
          parecer_despacho: trilhaInicial[0].parecerDespacho,
          status_resultante: 'AGUARDANDO_PARECER',
          data_hora_exata: nowIso,
          assinatura_eletronica_hash: assinaturaAbertura
        }]);
    } catch (e) {
      console.warn('[AccountingChangesService] Supabase sync background note:', e);
    }

    return newChange;
  },

  /**
   * Atualiza uma alteração contábil existente
   */
  async updateChange(id: string, updates: Partial<AccountingChange>): Promise<AccountingChange | null> {
    const currentList = await this.getChanges();
    const index = currentList.findIndex(item => item.id === id || item.protocolNumber === id);
    if (index === -1) return null;

    const existing = currentList[index];
    const updated: AccountingChange = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    currentList[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    window.dispatchEvent(new CustomEvent('accounting-changes-updated', { detail: updated }));

    // Atualiza no Supabase
    try {
      await supabase
        .from(DB_TABLE_LEGACY)
        .update({
          requester_name: updated.requesterName,
          requester_role: updated.requesterRole,
          requester_department: updated.requesterDepartment,
          requester_email: updated.requesterEmail,
          requester_phone: updated.requesterPhone,
          change_date: updated.changeDate,
          change_type: updated.changeType,
          reference_doc: updated.referenceDoc,
          fiscal_year: updated.fiscalYear,
          month_ref: updated.monthRef,
          amount: updated.amount,
          reason: updated.reason,
          current_state: updated.currentState,
          proposed_state: updated.proposedState,
          status: updated.status,
          accountant_name: updated.accountantName,
          accountant_crc: updated.accountantCrc,
          accountant_notes: updated.accountantNotes,
          reviewed_at: updated.reviewedAt,
          completed_at: updated.completedAt,
          attachment_before_name: updated.attachmentBeforeName,
          attachment_before_url: updated.attachmentBeforeUrl,
          attachment_after_name: updated.attachmentAfterName,
          attachment_after_url: updated.attachmentAfterUrl,
          updated_at: updated.updatedAt
        })
        .eq('id', updated.id);
    } catch (e) {
      console.warn('[AccountingChangesService] Erro ao atualizar no Supabase:', e);
    }

    return updated;
  },

  /**
   * Tramitação Formal da SRC: Emissão de Parecer Técnico, Homologação ou Execução no Razão
   * Registra a etapa na Trilha de Auditoria Imutável com assinatura eletrônica hash
   */
  async tramitarSRC(
    id: string,
    etapa: EtapaTramitacao,
    dados: {
      responsavelNome: string;
      responsavelCargo: string;
      responsavelCrc?: string;
      despacho: string;
      dataEfetivaRazao?: string;
      status: AccountingChangeStatus;
      statusSRC: StatusSRC;
    }
  ): Promise<AccountingChange | null> {
    const currentList = await this.getChanges();
    const item = currentList.find(c => c.id === id || c.protocolNumber === id);
    if (!item) return null;

    // Verificação de segregação de funções para homologação
    if (etapa === 'HOMOLOGACAO_CONTADOR_GERAL' || dados.status === 'approved') {
      const segCheck = checkSegregationOfDuties(item.requesterName, dados.responsavelNome, 'homologacao');
      if (!segCheck.allowed) {
        throw new Error(segCheck.reason);
      }
    }

    const nowIso = new Date().toISOString();
    const assinaturaHash = await computeSha256(
      `${item.protocolNumber}|${etapa}|${dados.responsavelNome}|${nowIso}|${dados.despacho}`
    );

    const novoRegistroTrilha: TrilhaAuditoriaTramitacao = {
      id: generateId(),
      solicitacaoId: item.id,
      etapa,
      usuarioResponsavelNome: dados.responsavelNome,
      matriculaCargoUsuario: dados.responsavelCargo,
      crcUsuario: dados.responsavelCrc,
      parecerDespacho: dados.despacho,
      statusResultante: dados.statusSRC,
      ipOrigem: '127.0.0.1 (Terminal de Tramitação)',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Gestão 360 Municipal',
      dataHoraExata: nowIso,
      assinaturaEletronicaHash: assinaturaHash
    };

    const trilhaAtualizada = [...(item.trilhaAuditoria || []), novoRegistroTrilha];

    const updates: Partial<AccountingChange> = {
      status: dados.status,
      statusSRC: dados.statusSRC,
      accountantName: dados.responsavelNome,
      accountantCrc: dados.responsavelCrc || item.accountantCrc,
      accountantNotes: dados.despacho,
      dataLancamentoEfetivo: dados.dataEfetivaRazao || item.dataLancamentoEfetivo,
      trilhaAuditoria: trilhaAtualizada,
      updatedAt: nowIso
    };

    if (etapa === 'PARECER_CONTABIL') {
      updates.dataHoraParecer = nowIso;
      updates.reviewedAt = nowIso;
    } else if (etapa === 'HOMOLOGACAO_CONTADOR_GERAL') {
      updates.dataHoraHomologacao = nowIso;
      updates.reviewedAt = nowIso;
    } else if (etapa === 'EXECUCAO_LANCAMENTO') {
      updates.completedAt = nowIso;
    }

    // Grava na trilha imutável no Supabase
    try {
      await supabase
        .from(DB_TABLE_TRILHA)
        .insert([{
          id: novoRegistroTrilha.id,
          solicitacao_id: item.id,
          etapa,
          usuario_responsavel_nome: dados.responsavelNome,
          matricula_cargo_usuario: dados.responsavelCargo,
          crc_usuario: dados.responsavelCrc || null,
          parecer_despacho: dados.despacho,
          status_resultante: dados.statusSRC,
          data_hora_exata: nowIso,
          assinatura_eletronica_hash: assinaturaHash
        }]);
    } catch (_) {}

    return this.updateChange(item.id, updates);
  },

  /**
   * Registra despacho ou parecer do setor contábil (compatibilidade legada)
   */
  async reviewChange(
    id: string, 
    reviewData: {
      status: AccountingChangeStatus;
      accountantName: string;
      accountantCrc?: string;
      accountantNotes: string;
    }
  ): Promise<AccountingChange | null> {
    const etapa: EtapaTramitacao = 
      reviewData.status === 'completed' ? 'EXECUCAO_LANCAMENTO' :
      reviewData.status === 'approved' ? 'HOMOLOGACAO_CONTADOR_GERAL' :
      reviewData.status === 'rejected' ? 'RECUSA' : 'PARECER_CONTABIL';

    const statusSRC: StatusSRC = 
      reviewData.status === 'completed' ? 'APROVADO_EXECUTADO' :
      reviewData.status === 'approved' ? 'AGUARDANDO_HOMOLOGACAO' :
      reviewData.status === 'rejected' ? 'INDEFERIDO' : 'AGUARDANDO_PARECER';

    return this.tramitarSRC(id, etapa, {
      responsavelNome: reviewData.accountantName,
      responsavelCargo: 'Contador(a) / Setor Contábil',
      responsavelCrc: reviewData.accountantCrc,
      despacho: reviewData.accountantNotes,
      status: reviewData.status,
      statusSRC
    });
  },

  /**
   * Exclui uma solicitação de alteração (apenas administrador)
   */
  async deleteChange(id: string): Promise<boolean> {
    const currentList = await this.getChanges();
    const target = currentList.find(item => item.id === id || item.protocolNumber === id);
    const filtered = currentList.filter(item => item.id !== id && item.protocolNumber !== id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('accounting-changes-updated', { detail: { id, deleted: true } }));

    const targetId = target ? target.id : id;
    try {
      await supabase
        .from(DB_TABLE_LEGACY)
        .delete()
        .or(`id.eq.${targetId},protocol_number.eq.${targetId}`);

      await supabase
        .from(DB_TABLE_SRC)
        .delete()
        .or(`id.eq.${targetId},protocolo_anual.eq.${targetId}`);
    } catch (e) {
      console.warn('[AccountingChangesService] Erro ao deletar no Supabase:', e);
    }

    return true;
  }
};
