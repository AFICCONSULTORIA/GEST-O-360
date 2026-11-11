/**
 * Serviço Centralizado de Secretarias / Órgãos Municipais (`public.departments`)
 * Fonte única da verdade para secretarias por município (`institution_id`) em toda a arquitetura.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, supabaseAnon } from '../supabase';

export interface MunicipalDepartment {
  id: string;
  name: string;
  institution_id: string;
  created_at?: string;
}

export const DEPARTMENTS_UPDATED_EVENT = 'gestao360:departments-updated';

const storageKey = (institutionId: string) => `gestao360_municipal_departments_${institutionId}`;

function resolveInstitutionId(institutionId?: string | null): string {
  const trimmed = (institutionId || '').trim();
  if (!trimmed || trimmed === 'default') return 'inst_1';
  return trimmed;
}

function getLocalDepartments(institutionId: string): MunicipalDepartment[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(storageKey(institutionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalDepartments(institutionId: string, list: MunicipalDepartment[]) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey(institutionId), JSON.stringify(list));
  } catch {}
}

export function dispatchDepartmentsUpdated(institutionId?: string) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DEPARTMENTS_UPDATED_EVENT, {
        detail: { institutionId: resolveInstitutionId(institutionId) }
      }));
    }
  } catch {}
}

function isRlsOrAuthError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return (
    code === '42501' ||
    code === 'PGRST301' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('jwt')
  );
}

/**
 * Busca as secretarias oficiais cadastradas para o município no Supabase.
 */
export async function getMunicipalDepartments(institutionId?: string | null): Promise<MunicipalDepartment[]> {
  const instId = resolveInstitutionId(institutionId);

  try {
    let { data, error } = await supabase
      .from('departments')
      .select('id, name, institution_id, created_at')
      .eq('institution_id', instId)
      .order('name', { ascending: true });

    if (error && isRlsOrAuthError(error)) {
      const retry = await supabaseAnon
        .from('departments')
        .select('id, name, institution_id, created_at')
        .eq('institution_id', instId)
        .order('name', { ascending: true });
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      const normalized = (data as MunicipalDepartment[])
        .filter(d => d && d.name && d.name.trim() !== '')
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      saveLocalDepartments(instId, normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('[Departments] Erro ao carregar secretarias no Supabase:', err);
  }

  return getLocalDepartments(instId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Cadastra uma nova secretaria oficial para o município e notifica todos os módulos.
 */
export async function createMunicipalDepartment(
  name: string,
  institutionId?: string | null
): Promise<MunicipalDepartment> {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error('Informe o nome da secretaria.');
  }
  const instId = resolveInstitutionId(institutionId);

  const existingList = await getMunicipalDepartments(instId);
  const duplicate = existingList.find(
    d => normalizeCompareKey(d.name) === normalizeCompareKey(cleanName)
  );
  if (duplicate) {
    throw new Error(`A secretaria "${duplicate.name}" já está cadastrada neste município.`);
  }

  const newId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const payload: MunicipalDepartment = {
    id: newId,
    name: cleanName,
    institution_id: instId
  };

  let { data, error } = await supabase
    .from('departments')
    .insert([payload])
    .select('id, name, institution_id, created_at')
    .single();

  if (error && isRlsOrAuthError(error)) {
    const retry = await supabaseAnon
      .from('departments')
      .insert([payload])
      .select('id, name, institution_id, created_at')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(`Falha ao cadastrar secretaria: ${error.message}`);
  }

  const saved = (data || payload) as MunicipalDepartment;
  const updated = [...existingList, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  saveLocalDepartments(instId, updated);
  dispatchDepartmentsUpdated(instId);
  return saved;
}

/**
 * Exclui uma secretaria oficial do município e notifica todos os módulos.
 */
export async function deleteMunicipalDepartment(
  id: string,
  institutionId?: string | null
): Promise<void> {
  const instId = resolveInstitutionId(institutionId);

  let { error } = await supabase.from('departments').delete().eq('id', id);
  if (error && isRlsOrAuthError(error)) {
    const retry = await supabaseAnon.from('departments').delete().eq('id', id);
    error = retry.error;
  }

  if (error) {
    throw new Error(`Não foi possível excluir a secretaria: ${error.message}`);
  }

  const updated = getLocalDepartments(instId).filter(d => d.id !== id);
  saveLocalDepartments(instId, updated);
  dispatchDepartmentsUpdated(instId);
}

function normalizeCompareKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDepartmentPrefixes(value: string): string {
  return normalizeCompareKey(value)
    .replace(/\b(secretaria|sec|municipal|mun|de|da|do|dos|das|e)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mapeia abreviações ou nomes legados (ex: "SEC. MUN. DE SAÚDE", "Saúde", "VIAÇÃO")
 * para o nome oficial padronizado da secretaria do município quando houver correspondência clara.
 */
export function matchOfficialDepartmentName(
  rawName: string | undefined | null,
  officialNames: string[]
): string | null {
  if (!rawName || !rawName.trim() || officialNames.length === 0) return null;
  const key = normalizeCompareKey(rawName);
  const exact = officialNames.find(n => normalizeCompareKey(n) === key);
  if (exact) return exact;

  const core = stripDepartmentPrefixes(rawName);
  if (!core) return null;

  // Correspondência exata sem prefixos ("Saúde" -> "Secretaria Municipal de Saúde")
  const coreExact = officialNames.find(n => stripDepartmentPrefixes(n) === core);
  if (coreExact) return coreExact;

  // Correspondência parcial inequívoca ("VIAÇÃO" -> "Secretaria Municipal de Viação e Obras")
  const partialMatches = officialNames.filter(n => {
    const nCore = stripDepartmentPrefixes(n);
    return nCore.includes(core) || core.includes(nCore);
  });
  if (partialMatches.length === 1) return partialMatches[0];

  // Regras comuns de abreviação administrativa
  if (core.includes('administracao') || core.includes('compras') || core.includes('financas')) {
    const adminMatch = officialNames.find(n => {
      const k = stripDepartmentPrefixes(n);
      return k.includes('administracao') || k.includes('financas');
    });
    if (adminMatch) return adminMatch;
  }

  return null;
}

/**
 * Hook reativo para manter qualquer módulo sincronizado com as secretarias oficiais do município.
 */
export function useMunicipalDepartments(institutionId?: string | null) {
  const instId = resolveInstitutionId(institutionId);
  const [departments, setDepartments] = useState<MunicipalDepartment[]>(() => getLocalDepartments(instId));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMunicipalDepartments(instId);
      setDepartments(list);
    } finally {
      setLoading(false);
    }
  }, [instId]);

  useEffect(() => {
    refreshDepartments();

    const handleUpdated = () => {
      refreshDepartments();
    };

    window.addEventListener(DEPARTMENTS_UPDATED_EVENT, handleUpdated);
    window.addEventListener('gestao360:reload-module', handleUpdated);
    return () => {
      window.removeEventListener(DEPARTMENTS_UPDATED_EVENT, handleUpdated);
      window.removeEventListener('gestao360:reload-module', handleUpdated);
    };
  }, [refreshDepartments]);

  const addDepartment = useCallback(
    async (name: string) => {
      const created = await createMunicipalDepartment(name, instId);
      await refreshDepartments();
      return created;
    },
    [instId, refreshDepartments]
  );

  const removeDepartment = useCallback(
    async (id: string) => {
      await deleteMunicipalDepartment(id, instId);
      await refreshDepartments();
    },
    [instId, refreshDepartments]
  );

  const departmentNames = useMemo(() => departments.map(d => d.name), [departments]);

  return {
    departments,
    departmentNames,
    loading,
    refreshDepartments,
    addDepartment,
    removeDepartment
  };
}

