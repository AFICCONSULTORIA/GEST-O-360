/**
 * Serviço de Controle de Alterações na Contabilidade Municipal
 * Persistência Híbrida: Supabase (Nuvem em Tempo Real) + LocalStorage (Cache Ultra-Rápido)
 * Trilha de Auditoria: Quem solicitou, quando, motivo, aprovação contábil e impacto orçamentário.
 */

import { supabase } from '../../../lib/supabase';
import { AccountingChange, AccountingChangeStatus } from '../types/accountingChanges';

const STORAGE_KEY = 'gestao360_accounting_changes';
const DB_TABLE = 'control_accounting_changes';

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

function mapFromDb(row: any): AccountingChange {
  return {
    id: String(row.id),
    protocolNumber: row.protocol_number || `ALT-${new Date().getFullYear()}-0001`,
    requesterName: row.requester_name,
    requesterRole: row.requester_role || 'Servidor(a)',
    requesterDepartment: row.requester_department || 'Secretaria Municipal',
    requesterEmail: row.requester_email || '',
    requesterPhone: row.requester_phone || '',
    changeDate: row.change_date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    changeType: row.change_type || 'outros',
    referenceDoc: row.reference_doc || '',
    fiscalYear: Number(row.fiscal_year) || new Date().getFullYear(),
    monthRef: row.month_ref || '',
    amount: row.amount ? Number(row.amount) : 0,
    reason: row.reason || '',
    currentState: row.current_state || '',
    proposedState: row.proposed_state || '',
    status: (row.status || 'pending') as AccountingChangeStatus,
    accountantName: row.accountant_name || '',
    accountantCrc: row.accountant_crc || '',
    accountantNotes: row.accountant_notes || '',
    reviewedAt: row.reviewed_at || undefined,
    completedAt: row.completed_at || undefined,
    attachmentName: row.attachment_name || '',
    attachmentUrl: row.attachment_url || '',
    attachmentBeforeName: row.attachment_before_name || '',
    attachmentBeforeUrl: row.attachment_before_url || '',
    attachmentAfterName: row.attachment_after_name || '',
    attachmentAfterUrl: row.attachment_after_url || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

export const accountingChangesService = {
  /**
   * Obtém a lista de alterações contábeis registradas
   */
  async getChanges(): Promise<AccountingChange[]> {
    // 1. Tenta carregar do Supabase
    try {
      const { data, error } = await supabase
        .from(DB_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapFromDb);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err) {
      console.warn('[AccountingChangesService] Supabase indisponível, usando cache local:', err);
    }

    // 2. Fallback no LocalStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_) {}

    // 3. Vazio por padrão (estritamente dados reais cadastrados pelos usuários)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  },

  /**
   * Gera o próximo número de protocolo para o exercício
   */
  async generateProtocolNumber(fiscalYear: number = new Date().getFullYear()): Promise<string> {
    const list = await this.getChanges();
    const currentYearList = list.filter(item => item.fiscalYear === fiscalYear);
    const nextSeq = currentYearList.length + 1;
    return `ALT-${fiscalYear}-${String(nextSeq).padStart(4, '0')}`;
  },

  /**
   * Registra uma nova solicitação de alteração contábil
   */
  async createChange(
    data: Omit<AccountingChange, 'id' | 'protocolNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<AccountingChange> {
    const year = data.fiscalYear || new Date().getFullYear();
    const protocolNumber = await this.generateProtocolNumber(year);
    const newId = generateId();

    const newChange: AccountingChange = {
      ...data,
      id: newId,
      protocolNumber,
      status: data.status || 'pending',
      amount: data.amount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Atualiza imediatamente o cache local
    const currentList = await this.getChanges();
    const updatedList = [newChange, ...currentList.filter(item => item.id !== newId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('accounting-changes-updated', { detail: newChange }));

    // Tenta persistir no Supabase em segundo plano
    try {
      const { data: dbData, error } = await supabase
        .from(DB_TABLE)
        .insert([{
          id: newChange.id,
          protocol_number: newChange.protocolNumber,
          requester_name: newChange.requesterName,
          requester_role: newChange.requesterRole,
          requester_department: newChange.requesterDepartment,
          requester_email: newChange.requesterEmail || '',
          requester_phone: newChange.requesterPhone || '',
          change_date: newChange.changeDate || new Date().toISOString().slice(0, 10),
          change_type: newChange.changeType,
          reference_doc: newChange.referenceDoc,
          fiscal_year: newChange.fiscalYear,
          month_ref: newChange.monthRef || '',
          amount: newChange.amount || 0,
          reason: newChange.reason,
          current_state: newChange.currentState || '',
          proposed_state: newChange.proposedState || '',
          status: newChange.status,
          accountant_name: newChange.accountantName || '',
          accountant_crc: newChange.accountantCrc || '',
          accountant_notes: newChange.accountantNotes || '',
          reviewed_at: newChange.reviewedAt || null,
          completed_at: newChange.completedAt || null,
          attachment_name: newChange.attachmentName || '',
          attachment_url: newChange.attachmentUrl || '',
          attachment_before_name: newChange.attachmentBeforeName || '',
          attachment_before_url: newChange.attachmentBeforeUrl || '',
          attachment_after_name: newChange.attachmentAfterName || '',
          attachment_after_url: newChange.attachmentAfterUrl || ''
        }])
        .select()
        .single();

      if (!error && dbData) {
        newChange.id = String(dbData.id);
        const refreshed = updatedList.map(item => item.protocolNumber === newChange.protocolNumber ? newChange : item);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
      } else if (error) {
        console.warn('[AccountingChangesService] Erro ao gravar no Supabase:', error.message);
      }
    } catch (e) {
      console.warn('[AccountingChangesService] Falha de conexão Supabase:', e);
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

    const updated: AccountingChange = {
      ...currentList[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    currentList[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    window.dispatchEvent(new CustomEvent('accounting-changes-updated', { detail: updated }));

    // Atualiza no Supabase
    try {
      await supabase
        .from(DB_TABLE)
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
          attachment_name: updated.attachmentName,
          attachment_url: updated.attachmentUrl,
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
   * Registra despacho ou parecer do setor contábil
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
    const isCompleted = reviewData.status === 'completed';
    const isReviewed = reviewData.status === 'approved' || reviewData.status === 'rejected' || reviewData.status === 'in_review';
    
    return this.updateChange(id, {
      status: reviewData.status,
      accountantName: reviewData.accountantName,
      accountantCrc: reviewData.accountantCrc || '',
      accountantNotes: reviewData.accountantNotes,
      reviewedAt: isReviewed ? new Date().toISOString() : undefined,
      completedAt: isCompleted ? new Date().toISOString() : undefined
    });
  },

  /**
   * Exclui uma solicitação de alteração
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
        .from(DB_TABLE)
        .delete()
        .or(`id.eq.${targetId},protocol_number.eq.${targetId}`);
    } catch (e) {
      console.warn('[AccountingChangesService] Erro ao deletar no Supabase:', e);
    }

    return true;
  }
};
