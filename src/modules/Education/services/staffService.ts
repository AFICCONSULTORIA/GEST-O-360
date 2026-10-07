/**
 * Serviço de Gestão e Autenticação de Professores e Coordenadores Pedagógicos
 * Persistência Híbrida: Supabase (Nuvem em Tempo Real) + LocalStorage (Cache & Modo Offline)
 */

import { supabase } from '../../../lib/supabase';

export type StaffRole = 'teacher' | 'coordinator';
export type StaffStatus = 'active' | 'leave' | 'inactive';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  email: string;
  password?: string;
  registration: string; // Matrícula funcional (ex: PROF001, COORD001)
  cpf?: string;
  phone?: string;
  subject: string;      // Disciplina ou Área de Atuação (ex: Matemática, Coordenação Pedagógica)
  school: string;       // Escola de Lotação
  classes?: string[];   // Turmas atendidas (ex: ['4º Ano A', '5º Ano B'])
  workloadHours?: number; // Carga horária semanal (ex: 40)
  status: StaffStatus;
  avatar?: string;
  createdAt: string;
}

const STORAGE_KEY = 'gestao360_staff';

// Lista de educadores padrão: Vazio para uso estrito de dados reais cadastrados pela gestão
export const DEFAULT_STAFF: StaffMember[] = [];

// Identificadores de contas demonstrativas / mock para purgação automática
const MOCK_STAFF_EMAILS = [
  'carlos@escola.gov.br',
  'sofia@escola.gov.br',
  'juliana@escola.gov.br',
  'roberto@escola.gov.br'
];

const MOCK_STAFF_IDS = ['staff-1', 'staff-2', 'staff-3', 'staff-4'];

function isMockStaff(s: any): boolean {
  if (!s) return false;
  const id = String(s.id || '').toLowerCase();
  const email = String(s.email || '').toLowerCase().trim();
  const name = String(s.name || '').toLowerCase().trim();

  if (MOCK_STAFF_IDS.includes(id)) return true;
  if (MOCK_STAFF_EMAILS.includes(email)) return true;
  if (
    name === 'prof. carlos da silva' ||
    name === 'profa. sofia lima' ||
    name === 'juliana mendes' ||
    name === 'roberto albuquerque'
  ) {
    return true;
  }
  return false;
}

function generateStaffId(): string {
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
 * Converte registro do banco Supabase para interface da aplicação
 */
function mapFromDb(row: any): StaffMember {
  return {
    id: String(row.id),
    name: row.name,
    role: (row.role === 'coordinator' ? 'coordinator' : 'teacher') as StaffRole,
    email: row.email,
    password: row.password || '123',
    registration: row.registration || 'PROF000',
    cpf: row.cpf || '',
    phone: row.phone || '',
    subject: row.subject || 'Geral',
    school: row.school || 'Rede Municipal',
    classes: Array.isArray(row.classes) ? row.classes : [],
    workloadHours: row.workload_hours || 40,
    status: (row.status || 'active') as StaffStatus,
    avatar: row.avatar || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

/**
 * Gera código de matrícula funcional sequencial
 */
export function generateStaffRegistration(role: StaffRole, name: string, sequenceNumber: number = 1): string {
  const prefix = role === 'coordinator' ? 'COORD' : 'PROF';
  return `${prefix}${String(Math.max(1, sequenceNumber)).padStart(3, '0')}`;
}

export const staffService = {
  /**
   * Remove educadores demonstrativos e fictícios mantendo estritamente os cadastros reais
   */
  async purgeMockStaff(): Promise<{ removed: number }> {
    let removed = 0;

    // 1. Limpeza no cache local
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(s => !isMockStaff(s));
          removed = parsed.length - clean.length;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        }
      }
    } catch (_) {}

    // 2. Limpeza no Supabase
    try {
      for (const email of MOCK_STAFF_EMAILS) {
        await supabase.from('edu_staff').delete().eq('email', email);
      }
      for (const mockId of MOCK_STAFF_IDS) {
        await supabase.from('edu_staff').delete().eq('id', mockId);
      }
    } catch (e) {
      console.warn('Erro ao purgar dados mock no Supabase:', e);
    }

    return { removed };
  },

  /**
   * Obtém a lista de educadores (Professores e Coordenadores) - Apenas dados reais
   */
  async getStaff(): Promise<StaffMember[]> {
    // 1. Tenta carregar do Supabase
    try {
      const { data, error } = await supabase
        .from('edu_staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const cleanData = data.filter(s => !isMockStaff(s));
        const mapped = cleanData.map(mapFromDb);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err) {
      console.warn('Supabase edu_staff não disponível, usando fallback local:', err);
    }

    // 2. Fallback no LocalStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(s => !isMockStaff(s));
          if (clean.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
          }
          return clean; // Retorna a lista real, mesmo que vazia!
        }
      }
    } catch (e) {}

    // 3. Caso inicial sem dados cadastrados
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  },

  /**
   * Cadastra um novo educador (Professor ou Coordenador)
   */
  async createStaff(data: Omit<StaffMember, 'id' | 'createdAt'>): Promise<StaffMember> {
    const currentList = await this.getStaff();
    const newSeq = currentList.filter(s => s.role === data.role).length + 1;
    const finalReg = data.registration || generateStaffRegistration(data.role, data.name, newSeq);
    const newId = generateStaffId();

    const newStaff: StaffMember = {
      ...data,
      id: newId,
      registration: finalReg,
      password: data.password?.trim() || '123',
      createdAt: new Date().toISOString()
    };

    // Salva localmente primeiro (garantia instantânea)
    const updatedList = [newStaff, ...currentList.filter(s => s.id !== newStaff.id && s.email !== newStaff.email)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('staff-updated', { detail: newStaff }));

    // Persiste no Supabase em segundo plano
    try {
      const { data: dbData, error } = await supabase
        .from('edu_staff')
        .insert([{
          id: newStaff.id,
          name: newStaff.name,
          role: newStaff.role,
          email: newStaff.email.trim().toLowerCase(),
          password: newStaff.password,
          registration: newStaff.registration,
          cpf: newStaff.cpf || '',
          phone: newStaff.phone || '',
          subject: newStaff.subject,
          school: newStaff.school,
          classes: newStaff.classes || [],
          workload_hours: newStaff.workloadHours || 40,
          status: newStaff.status,
          avatar: newStaff.avatar || ''
        }])
        .select()
        .single();

      if (!error && dbData) {
        newStaff.id = String(dbData.id);
        const refreshed = updatedList.map(s => s.email === newStaff.email ? newStaff : s);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
      } else if (error) {
        console.warn('Supabase edu_staff insert error:', error.message);
      }
    } catch (e) {
      console.warn('Erro ao salvar edu_staff no Supabase:', e);
    }

    return newStaff;
  },

  /**
   * Atualiza dados de um educador
   */
  async updateStaff(id: string, updates: Partial<StaffMember>): Promise<StaffMember | null> {
    const currentList = await this.getStaff();
    const index = currentList.findIndex(s => s.id === id || s.registration === id || s.email === id);
    if (index === -1) return null;

    const updated: StaffMember = {
      ...currentList[index],
      ...updates
    };

    currentList[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    window.dispatchEvent(new CustomEvent('staff-updated', { detail: updated }));

    // Atualiza no Supabase
    try {
      if (updated.email) {
        await supabase
          .from('edu_staff')
          .update({
            name: updated.name,
            role: updated.role,
            email: updated.email.trim().toLowerCase(),
            password: updated.password,
            registration: updated.registration,
            cpf: updated.cpf,
            phone: updated.phone,
            subject: updated.subject,
            school: updated.school,
            classes: updated.classes || [],
            workload_hours: updated.workloadHours || 40,
            status: updated.status,
            avatar: updated.avatar || ''
          })
          .eq('email', updated.email.trim().toLowerCase());
      }
      if (id) {
        await supabase
          .from('edu_staff')
          .update({
            name: updated.name,
            role: updated.role,
            password: updated.password,
            registration: updated.registration,
            cpf: updated.cpf,
            phone: updated.phone,
            subject: updated.subject,
            school: updated.school,
            classes: updated.classes || [],
            workload_hours: updated.workloadHours || 40,
            status: updated.status,
            avatar: updated.avatar || ''
          })
          .eq('id', id);
      }
    } catch (e) {
      console.warn('Erro ao atualizar edu_staff no Supabase:', e);
    }

    return updated;
  },

  /**
   * Exclui um educador de forma permanente
   */
  async deleteStaff(id: string): Promise<boolean> {
    const currentList = await this.getStaff();
    const target = currentList.find(s => s.id === id || s.email === id);
    const filtered = currentList.filter(s => s.id !== id && s.email !== id);

    // 1. Atualiza imediatamente o cache local
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('staff-updated', { detail: { id, deleted: true } }));

    // 2. Remove permanentemente do Supabase
    try {
      if (target?.email) {
        await supabase
          .from('edu_staff')
          .delete()
          .eq('email', target.email.trim().toLowerCase());
      }
      if (id) {
        await supabase
          .from('edu_staff')
          .delete()
          .eq('id', id);
      }
    } catch (e) {
      console.warn('Erro ao deletar edu_staff no Supabase:', e);
    }

    return true;
  },

  /**
   * Autentica um educador no /educacao usando email e senha
   */
  async authenticateStaff(email: string, password?: string): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
    if (!email) return { success: false, error: 'EMAIL_REQUIRED' };

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password?.trim() || '';

    const list = await this.getStaff();
    const found = list.find(s => s.email.toLowerCase() === cleanEmail);

    if (!found) {
      return { success: false, error: 'NOT_FOUND' };
    }

    if (found.status === 'inactive') {
      return { success: false, error: 'INACTIVE' };
    }

    const expectedPassword = found.password || '123';
    if (cleanPass && cleanPass !== expectedPassword) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }

    return { success: true, staff: found };
  }
};

// Purga dados mock na inicialização do serviço no navegador
if (typeof window !== 'undefined') {
  staffService.purgeMockStaff().catch(err => {
    console.warn('[StaffService] Falha na limpeza de dados mock:', err);
  });
}
