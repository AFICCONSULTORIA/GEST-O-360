import { supabase } from '../../../lib/supabase';
import { RegistroAlteracaoContabil } from '../types/livroContadora';

const STORAGE_KEY = 'gestao360_livro_contadora_registros';
const DB_TABLE = 'registros_alteracao_contabil';

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

function mapFromDb(row: any): RegistroAlteracaoContabil {
  return {
    id: row.id,
    dataHoraRegistro: row.data_hora_registro || row.created_at || new Date().toISOString(),
    dataPedido: row.data_pedido,
    solicitanteNome: row.solicitante_nome,
    solicitanteSetorCargo: row.solicitante_setor_cargo,
    canalSolicitacao: row.canal_solicitacao || 'WhatsApp',
    documentoAfetado: row.documento_afetado,
    valorEnvolvido: Number(row.valor_envolvido) || 0,
    oQueFoiPedido: row.o_que_foi_pedido,
    justificativaAlegada: row.justificativa_alegada || '',
    acaoDaContadora: row.acao_da_contadora || 'Aprovado e Feito',
    dataHoraExecucao: row.data_hora_execucao || undefined,
    observacaoTecnicaContadora: row.observacao_tecnica_contadora || '',
    comprovanteNome: row.comprovante_nome || '',
    comprovanteUrl: row.comprovante_url || '',
    comprovanteTipo: row.comprovante_tipo || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapToDb(item: Partial<RegistroAlteracaoContabil>): any {
  return {
    data_hora_registro: item.dataHoraRegistro || new Date().toISOString(),
    data_pedido: item.dataPedido,
    solicitante_nome: item.solicitanteNome,
    solicitante_setor_cargo: item.solicitanteSetorCargo,
    canal_solicitacao: item.canalSolicitacao || 'WhatsApp',
    documento_afetado: item.documentoAfetado,
    valor_envolvido: item.valorEnvolvido || 0,
    o_que_foi_pedido: item.oQueFoiPedido,
    justificativa_alegada: item.justificativaAlegada || '',
    acao_da_contadora: item.acaoDaContadora || 'Aprovado e Feito',
    data_hora_execucao: item.dataHoraExecucao || null,
    observacao_tecnica_contadora: item.observacaoTecnicaContadora || '',
    comprovante_nome: item.comprovanteNome || null,
    comprovante_url: item.comprovanteUrl || null,
    comprovante_tipo: item.comprovanteTipo || null,
    updated_at: new Date().toISOString()
  };
}

export const livroContadoraService = {
  /**
   * Obtém todos os registros cadastrados pela contadora
   */
  async getRegistros(): Promise<RegistroAlteracaoContabil[]> {
    // 1. Tentar carregar do Supabase
    try {
      const { data, error } = await supabase
        .from(DB_TABLE)
        .select('*')
        .order('data_pedido', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapFromDb);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err) {
      console.warn('[LivroContadora] Supabase indisponível, usando cache local:', err);
    }

    // 2. Fallback localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.sort((a, b) => new Date(b.dataPedido).getTime() - new Date(a.dataPedido).getTime());
        }
      }
    } catch (e) {
      console.error('[LivroContadora] Erro ao carregar localStorage:', e);
    }

    return [];
  },

  /**
   * Cria um novo registro rápido no livro
   */
  async createRegistro(item: Omit<RegistroAlteracaoContabil, 'id' | 'dataHoraRegistro' | 'createdAt' | 'updatedAt'>): Promise<RegistroAlteracaoContabil> {
    const id = generateId();
    const nowIso = new Date().toISOString();

    const novoRegistro: RegistroAlteracaoContabil = {
      ...item,
      id,
      dataHoraRegistro: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 1. Salvar no Supabase
    try {
      const dbPayload = {
        id,
        ...mapToDb(novoRegistro),
        created_at: nowIso
      };

      const { data, error } = await supabase
        .from(DB_TABLE)
        .insert(dbPayload)
        .select()
        .single();

      if (!error && data) {
        const criado = mapFromDb(data);
        await this.syncLocalRecord(criado);
        return criado;
      }
    } catch (err) {
      console.warn('[LivroContadora] Falha ao gravar no Supabase, mantendo no cache:', err);
    }

    // 2. Gravar no LocalStorage
    await this.syncLocalRecord(novoRegistro);
    return novoRegistro;
  },

  /**
   * Atualiza um registro existente
   */
  async updateRegistro(id: string, updates: Partial<RegistroAlteracaoContabil>): Promise<RegistroAlteracaoContabil> {
    const nowIso = new Date().toISOString();

    // 1. Atualizar no Supabase
    try {
      const dbPayload = mapToDb(updates);
      const { data, error } = await supabase
        .from(DB_TABLE)
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const atualizado = mapFromDb(data);
        await this.updateLocalRecord(atualizado);
        return atualizado;
      }
    } catch (err) {
      console.warn('[LivroContadora] Falha no Supabase ao atualizar:', err);
    }

    // 2. Atualizar no LocalStorage
    const registros = await this.getRegistros();
    const idx = registros.findIndex(r => r.id === id);
    if (idx !== -1) {
      const atualizado: RegistroAlteracaoContabil = {
        ...registros[idx],
        ...updates,
        updatedAt: nowIso
      };
      registros[idx] = atualizado;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
      return atualizado;
    }

    throw new Error('Registro não encontrado para atualização.');
  },

  /**
   * Exclui um registro
   */
  async deleteRegistro(id: string): Promise<void> {
    try {
      await supabase.from(DB_TABLE).delete().eq('id', id);
    } catch (err) {
      console.warn('[LivroContadora] Falha ao excluir no Supabase:', err);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list: RegistroAlteracaoContabil[] = JSON.parse(raw);
        const filtered = list.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('[LivroContadora] Erro ao deletar do localStorage:', e);
    }
  },

  /**
   * Auxiliar de sincronização local
   */
  async syncLocalRecord(item: RegistroAlteracaoContabil): Promise<void> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: RegistroAlteracaoContabil[] = raw ? JSON.parse(raw) : [];
      const updated = [item, ...list.filter(r => r.id !== item.id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[LivroContadora] Erro ao sincronizar localmente:', e);
    }
  },

  async updateLocalRecord(item: RegistroAlteracaoContabil): Promise<void> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: RegistroAlteracaoContabil[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(r => r.id === item.id);
      if (idx !== -1) {
        list[idx] = item;
      } else {
        list.unshift(item);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[LivroContadora] Erro ao atualizar localmente:', e);
    }
  }
};
