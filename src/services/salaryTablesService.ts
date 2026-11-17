import { supabase } from '../lib/supabase';
import { ExtractedSalaryLaw, SalaryClassMeta } from '../lib/geminiPdfExtractor';

export interface SalaryEntryRecord {
  id: string;
  salary_table_id: string;
  level_code: string;
  level_order: number;
  level_percent: string;
  class_a: number | null;
  class_b: number | null;
  class_c: number | null;
  class_d: number | null;
  class_e: number | null;
  class_f: number | null;
  class_g: number | null;
  class_h: number | null;
  extra_classes?: Record<string, number | null>;
}

export interface SalaryTableRecord {
  id: string;
  institution_id: string;
  law_id: string;
  table_roman: string;
  table_order: number;
  role_name: string;
  base_salary: number | null;
  classes_metadata: SalaryClassMeta[];
  entries: SalaryEntryRecord[];
}

export interface SalaryLawRecord {
  id: string;
  institution_id: string;
  law_number: string;
  annex_name: string | null;
  title: string;
  effective_date: string | null;
  source_file_name: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

const LOCAL_CACHE_PREFIX = 'gestao360_salary_tables_v1_';

function getLocalCacheKey(institutionId: string) {
  return `${LOCAL_CACHE_PREFIX}${institutionId}`;
}

interface LocalCachePayload {
  laws: SalaryLawRecord[];
  tablesByLaw: Record<string, SalaryTableRecord[]>;
}

function readLocalCache(institutionId: string): LocalCachePayload {
  try {
    const raw = localStorage.getItem(getLocalCacheKey(institutionId));
    if (!raw) return { laws: [], tablesByLaw: {} };
    return JSON.parse(raw) as LocalCachePayload;
  } catch {
    return { laws: [], tablesByLaw: {} };
  }
}

function writeLocalCache(institutionId: string, payload: LocalCachePayload) {
  try {
    localStorage.setItem(getLocalCacheKey(institutionId), JSON.stringify(payload));
  } catch {
    // Ignore quota errors
  }
}

export async function fetchSalaryLaws(institutionId: string): Promise<{ laws: SalaryLawRecord[]; fromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from('municipal_salary_laws')
      .select('id, institution_id, law_number, annex_name, title, effective_date, source_file_name, is_active, created_by, created_at')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    const laws = (data || []) as SalaryLawRecord[];
    const cache = readLocalCache(institutionId);
    writeLocalCache(institutionId, { ...cache, laws });
    return { laws, fromSupabase: true };
  } catch (err) {
    console.warn('Fallback local para municipal_salary_laws:', err);
    const cache = readLocalCache(institutionId);
    return { laws: cache.laws, fromSupabase: false };
  }
}

export async function fetchSalaryTablesByLaw(
  institutionId: string,
  lawId: string
): Promise<{ tables: SalaryTableRecord[]; fromSupabase: boolean }> {
  try {
    const { data: tablesData, error: tablesError } = await supabase
      .from('municipal_salary_tables')
      .select('id, institution_id, law_id, table_roman, table_order, role_name, base_salary, classes_metadata')
      .eq('institution_id', institutionId)
      .eq('law_id', lawId)
      .order('table_order', { ascending: true })
      .limit(200);

    if (tablesError) throw tablesError;

    const tableRows = tablesData || [];
    if (tableRows.length === 0) {
      return { tables: [], fromSupabase: true };
    }

    const tableIds = tableRows.map(t => t.id);
    const { data: entriesData, error: entriesError } = await supabase
      .from('municipal_salary_entries')
      .select('id, salary_table_id, level_code, level_order, level_percent, class_a, class_b, class_c, class_d, class_e, class_f, class_g, class_h, extra_classes')
      .eq('institution_id', institutionId)
      .in('salary_table_id', tableIds)
      .order('level_order', { ascending: true });

    if (entriesError) throw entriesError;

    const entriesByTable = new Map<string, SalaryEntryRecord[]>();
    (entriesData || []).forEach((e: any) => {
      const list = entriesByTable.get(e.salary_table_id) || [];
      list.push(e as SalaryEntryRecord);
      entriesByTable.set(e.salary_table_id, list);
    });

    const tables: SalaryTableRecord[] = tableRows.map((t: any) => ({
      id: t.id,
      institution_id: t.institution_id,
      law_id: t.law_id,
      table_roman: t.table_roman,
      table_order: t.table_order,
      role_name: t.role_name,
      base_salary: t.base_salary !== null ? Number(t.base_salary) : null,
      classes_metadata: Array.isArray(t.classes_metadata) ? t.classes_metadata : [],
      entries: entriesByTable.get(t.id) || []
    }));

    const cache = readLocalCache(institutionId);
    cache.tablesByLaw[lawId] = tables;
    writeLocalCache(institutionId, cache);

    return { tables, fromSupabase: true };
  } catch (err) {
    console.warn('Fallback local para municipal_salary_tables:', err);
    const cache = readLocalCache(institutionId);
    return { tables: cache.tablesByLaw[lawId] || [], fromSupabase: false };
  }
}

export async function saveExtractedSalaryLaw(
  institutionId: string,
  extracted: ExtractedSalaryLaw,
  createdBy?: string
): Promise<{ law: SalaryLawRecord; tables: SalaryTableRecord[]; savedToSupabase: boolean }> {
  try {
    const { data: lawData, error: lawError } = await supabase
      .from('municipal_salary_laws')
      .insert({
        institution_id: institutionId,
        law_number: extracted.lawNumber,
        annex_name: extracted.annexName || null,
        title: extracted.title,
        source_file_name: extracted.sourceFileName,
        is_active: true,
        created_by: createdBy || null
      })
      .select()
      .single();

    if (lawError) throw lawError;
    const savedLaw = lawData as SalaryLawRecord;

    const savedTables: SalaryTableRecord[] = [];

    for (let i = 0; i < extracted.tables.length; i++) {
      const t = extracted.tables[i];
      const refRow = t.rows.find(r => r.levelCode.toUpperCase().startsWith('REF')) || t.rows[0];
      const baseSalary = refRow?.values?.A ?? null;

      const { data: tableData, error: tableError } = await supabase
        .from('municipal_salary_tables')
        .insert({
          institution_id: institutionId,
          law_id: savedLaw.id,
          table_roman: t.tableRoman,
          table_order: i + 1,
          role_name: t.roleName,
          base_salary: baseSalary,
          classes_metadata: t.classes,
          created_by: createdBy || null
        })
        .select()
        .single();

      if (tableError) throw tableError;

      const entriesPayload = t.rows.map((r, rowIdx) => {
        const extraClasses: Record<string, number | null> = {};
        Object.entries(r.values).forEach(([k, v]) => {
          if (!['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(k)) {
            extraClasses[k] = v;
          }
        });
        return {
          institution_id: institutionId,
          salary_table_id: tableData.id,
          level_code: r.levelCode,
          level_order: rowIdx,
          level_percent: r.levelPercent,
          class_a: r.values.A ?? null,
          class_b: r.values.B ?? null,
          class_c: r.values.C ?? null,
          class_d: r.values.D ?? null,
          class_e: r.values.E ?? null,
          class_f: r.values.F ?? null,
          class_g: r.values.G ?? null,
          class_h: r.values.H ?? null,
          extra_classes: extraClasses
        };
      });

      let savedEntries: SalaryEntryRecord[] = [];
      if (entriesPayload.length > 0) {
        const { data: insertedEntries, error: entriesError } = await supabase
          .from('municipal_salary_entries')
          .insert(entriesPayload)
          .select();

        if (entriesError) throw entriesError;
        savedEntries = (insertedEntries || []) as SalaryEntryRecord[];
      }

      savedTables.push({
        id: tableData.id,
        institution_id: tableData.institution_id,
        law_id: tableData.law_id,
        table_roman: tableData.table_roman,
        table_order: tableData.table_order,
        role_name: tableData.role_name,
        base_salary: tableData.base_salary !== null ? Number(tableData.base_salary) : null,
        classes_metadata: Array.isArray(tableData.classes_metadata) ? tableData.classes_metadata : [],
        entries: savedEntries
      });
    }

    const cache = readLocalCache(institutionId);
    cache.laws = [savedLaw, ...cache.laws];
    cache.tablesByLaw[savedLaw.id] = savedTables;
    writeLocalCache(institutionId, cache);

    return { law: savedLaw, tables: savedTables, savedToSupabase: true };
  } catch (err) {
    console.warn('Salvando tabelas de vencimentos em cache local (Supabase indisponível ou migração pendente):', err);
    const lawId = crypto.randomUUID();
    const localLaw: SalaryLawRecord = {
      id: lawId,
      institution_id: institutionId,
      law_number: extracted.lawNumber,
      annex_name: extracted.annexName || null,
      title: extracted.title,
      effective_date: null,
      source_file_name: extracted.sourceFileName,
      is_active: true,
      created_by: createdBy || null,
      created_at: new Date().toISOString()
    };

    const localTables: SalaryTableRecord[] = extracted.tables.map((t, idx) => {
      const tableId = crypto.randomUUID();
      const refRow = t.rows.find(r => r.levelCode.toUpperCase().startsWith('REF')) || t.rows[0];
      return {
        id: tableId,
        institution_id: institutionId,
        law_id: lawId,
        table_roman: t.tableRoman,
        table_order: idx + 1,
        role_name: t.roleName,
        base_salary: refRow?.values?.A ?? null,
        classes_metadata: t.classes,
        entries: t.rows.map((r, rIdx) => ({
          id: crypto.randomUUID(),
          salary_table_id: tableId,
          level_code: r.levelCode,
          level_order: rIdx,
          level_percent: r.levelPercent,
          class_a: r.values.A ?? null,
          class_b: r.values.B ?? null,
          class_c: r.values.C ?? null,
          class_d: r.values.D ?? null,
          class_e: r.values.E ?? null,
          class_f: r.values.F ?? null,
          class_g: r.values.G ?? null,
          class_h: r.values.H ?? null
        }))
      };
    });

    const cache = readLocalCache(institutionId);
    cache.laws = [localLaw, ...cache.laws];
    cache.tablesByLaw[lawId] = localTables;
    writeLocalCache(institutionId, cache);

    return { law: localLaw, tables: localTables, savedToSupabase: false };
  }
}

export async function deleteSalaryLaw(institutionId: string, lawId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('municipal_salary_laws')
      .delete()
      .eq('institution_id', institutionId)
      .eq('id', lawId);
    if (error) throw error;
  } catch (err) {
    console.warn('Erro ao remover lei no Supabase, removendo do cache local:', err);
  }

  const cache = readLocalCache(institutionId);
  cache.laws = cache.laws.filter(l => l.id !== lawId);
  delete cache.tablesByLaw[lawId];
  writeLocalCache(institutionId, cache);
}

export async function updateSalaryTableWithEntries(
  institutionId: string,
  table: SalaryTableRecord
): Promise<{ savedToSupabase: boolean }> {
  const refRow = table.entries.find(e => e.level_code.toUpperCase().startsWith('REF')) || table.entries[0];
  const nextBaseSalary = refRow?.class_a ?? table.base_salary ?? null;
  const updatedTable: SalaryTableRecord = { ...table, base_salary: nextBaseSalary };

  let savedToSupabase = false;
  try {
    const { error: tableErr } = await supabase
      .from('municipal_salary_tables')
      .update({
        table_roman: updatedTable.table_roman,
        role_name: updatedTable.role_name,
        base_salary: nextBaseSalary,
        classes_metadata: updatedTable.classes_metadata,
        updated_at: new Date().toISOString()
      })
      .eq('institution_id', institutionId)
      .eq('id', updatedTable.id);

    if (tableErr) throw tableErr;

    // Substitui as linhas da tabela para manter ordem, adições e remoções sincronizadas
    const { error: delErr } = await supabase
      .from('municipal_salary_entries')
      .delete()
      .eq('institution_id', institutionId)
      .eq('salary_table_id', updatedTable.id);

    if (delErr) throw delErr;

    if (updatedTable.entries.length > 0) {
      const payload = updatedTable.entries.map((e, idx) => ({
        institution_id: institutionId,
        salary_table_id: updatedTable.id,
        level_code: e.level_code,
        level_order: idx,
        level_percent: e.level_percent,
        class_a: e.class_a,
        class_b: e.class_b,
        class_c: e.class_c,
        class_d: e.class_d,
        class_e: e.class_e,
        class_f: e.class_f,
        class_g: e.class_g,
        class_h: e.class_h,
        extra_classes: e.extra_classes || {}
      }));

      const { error: insErr } = await supabase
        .from('municipal_salary_entries')
        .insert(payload);

      if (insErr) throw insErr;
    }

    savedToSupabase = true;
  } catch (err) {
    console.warn('Atualizando tabela de vencimentos no cache local:', err);
  }

  const cache = readLocalCache(institutionId);
  const currentList = cache.tablesByLaw[updatedTable.law_id] || [];
  cache.tablesByLaw[updatedTable.law_id] = currentList.map(t =>
    t.id === updatedTable.id ? updatedTable : t
  );
  writeLocalCache(institutionId, cache);

  return { savedToSupabase };
}
