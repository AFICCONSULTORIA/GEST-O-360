import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import {
  Briefcase,
  Plus,
  Search,
  Edit3,
  Trash2,
  Phone,
  Mail,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  Users
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCPF, formatPhone, validateCPF } from '../../../lib/masks';
import { showToast } from '../../../components/ui/Toast';

interface EducationEmployeesManagerProps {
  institutionId?: string;
}

export type ContractModality =
  | 'Efetivo'
  | 'Contrato Temporário'
  | 'Comissionado'
  | 'Terceirizado'
  | 'Estagiário'
  | 'Cedido';

export interface EducationEmployeeRecord {
  id: string;
  institution_id: string;
  full_name: string;
  cpf: string;
  role_title: string;
  contract_modality: ContractModality;
  phone: string;
  email: string;
  workplace: string;
  status: 'ativo' | 'afastado' | 'desligado';
}

const CONTRACT_MODALITIES: ContractModality[] = [
  'Efetivo',
  'Contrato Temporário',
  'Comissionado',
  'Terceirizado',
  'Estagiário',
  'Cedido'
];

const SUGGESTED_ROLES = [
  'Professor(a)',
  'Diretor(a) Escolar',
  'Coordenador(a) Pedagógico(a)',
  'Secretário(a) Escolar',
  'Auxiliar de Sala / Creche',
  'Merendeira / Nutricionista',
  'Zelador(a) / Serviços Gerais',
  'Motorista Escolar',
  'Monitor(a) de Transporte',
  'Técnico Administrativo'
];

export const EducationEmployeesManager: React.FC<EducationEmployeesManagerProps> = ({
  institutionId = 'inst_1'
}) => {
  const storageKey = `gestao360_edu_employees_${institutionId}`;

  const [employees, setEmployees] = useState<EducationEmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('Todas');
  const [roleFilter, setRoleFilter] = useState<string>('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EducationEmployeeRecord | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: '',
    cpf: '',
    role_title: 'Professor(a)',
    contract_modality: 'Efetivo' as ContractModality,
    phone: '',
    email: '',
    workplace: 'Secretaria / Rede Municipal',
    status: 'ativo' as EducationEmployeeRecord['status']
  });

  const loadEmployees = async () => {
    setIsLoading(true);
    let loaded: EducationEmployeeRecord[] = [];
    try {
      const { data, error } = await supabase
        .from('education_employees')
        .select('*')
        .eq('institution_id', institutionId)
        .order('full_name');
      if (!error && Array.isArray(data)) {
        loaded = data as EducationEmployeeRecord[];
      }
    } catch {
      // fallback local
    }

    if (loaded.length === 0) {
      try {
        const raw = localStorage.getItem(storageKey);
        loaded = raw ? JSON.parse(raw) : [];
      } catch {
        loaded = [];
      }
    }

    setEmployees(loaded);
    setIsLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, [institutionId]);

  const persistLocal = (list: EducationEmployeeRecord[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>(employees.map((e) => e.role_title).filter(Boolean));
    return ['Todos', ...Array.from(set).sort()];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return employees.filter((emp) => {
      if (modalityFilter !== 'Todas' && emp.contract_modality !== modalityFilter) return false;
      if (roleFilter !== 'Todos' && emp.role_title !== roleFilter) return false;
      if (!q) return true;
      return (
        emp.full_name.toLowerCase().includes(q) ||
        emp.role_title.toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (digits.length > 0 && emp.cpf.replace(/\D/g, '').includes(digits))
      );
    });
  }, [employees, searchQuery, modalityFilter, roleFilter]);

  const stats = useMemo(() => {
    const efetivos = employees.filter((e) => e.contract_modality === 'Efetivo').length;
    const contratos = employees.filter((e) => e.contract_modality === 'Contrato Temporário').length;
    const outros = employees.length - efetivos - contratos;
    return { total: employees.length, efetivos, contratos, outros };
  }, [employees]);

  const openNewModal = () => {
    setEditingEmployee(null);
    setForm({
      full_name: '',
      cpf: '',
      role_title: 'Professor(a)',
      contract_modality: 'Efetivo',
      phone: '',
      email: '',
      workplace: 'Secretaria / Rede Municipal',
      status: 'ativo'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: EducationEmployeeRecord) => {
    setEditingEmployee(emp);
    setForm({
      full_name: emp.full_name,
      cpf: formatCPF(emp.cpf),
      role_title: emp.role_title,
      contract_modality: emp.contract_modality,
      phone: emp.phone || '',
      email: emp.email || '',
      workplace: emp.workplace || 'Secretaria / Rede Municipal',
      status: emp.status
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = form.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11 || !validateCPF(form.cpf)) {
      showToast('Informe um CPF válido (11 dígitos).', 'warning');
      return;
    }
    if (!form.full_name.trim() || !form.role_title.trim()) {
      showToast('Nome completo e Cargo são obrigatórios.', 'warning');
      return;
    }

    const record: EducationEmployeeRecord = {
      id: editingEmployee?.id || crypto.randomUUID(),
      institution_id: institutionId,
      full_name: form.full_name.trim(),
      cpf: cleanCpf,
      role_title: form.role_title.trim(),
      contract_modality: form.contract_modality,
      phone: form.phone.trim(),
      email: form.email.trim(),
      workplace: form.workplace.trim() || 'Secretaria / Rede Municipal',
      status: form.status
    };

    const next = editingEmployee
      ? employees.map((x) => (x.id === record.id ? record : x))
      : [...employees, record].sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));

    setEmployees(next);
    persistLocal(next);
    setIsModalOpen(false);

    try {
      await supabase.from('education_employees').upsert(record, { onConflict: 'id' });
    } catch {
      // ok
    }
    showToast(
      editingEmployee ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!',
      'success'
    );
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este funcionário do cadastro?')) return;
    const next = employees.filter((e) => e.id !== id);
    setEmployees(next);
    persistLocal(next);
    try {
      await supabase.from('education_employees').delete().eq('id', id);
    } catch {
      // ok
    }
  };

  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Funcionários Educação');
    ws.columns = [
      { header: 'Nome Completo', key: 'nome', width: 34 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Cargo', key: 'cargo', width: 26 },
      { header: 'Modalidade de Contratação', key: 'modalidade', width: 24 },
      { header: 'Telefone', key: 'telefone', width: 18 },
      { header: 'E-mail', key: 'email', width: 30 },
      { header: 'Lotação', key: 'lotacao', width: 26 },
      { header: 'Status', key: 'status', width: 12 }
    ];
    filteredEmployees.forEach((emp) => {
      ws.addRow({
        nome: emp.full_name,
        cpf: formatCPF(emp.cpf),
        cargo: emp.role_title,
        modalidade: emp.contract_modality,
        telefone: emp.phone,
        email: emp.email,
        lotacao: emp.workplace,
        status: emp.status
      });
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funcionarios_educacao_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const normalizeModality = (raw?: unknown): ContractModality => {
    const s = String(raw || '').toLowerCase();
    if (s.includes('contrat') || s.includes('temp')) return 'Contrato Temporário';
    if (s.includes('comiss')) return 'Comissionado';
    if (s.includes('terceir')) return 'Terceirizado';
    if (s.includes('estag')) return 'Estagiário';
    if (s.includes('cedid')) return 'Cedido';
    return 'Efetivo';
  };

  const handleDownloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Modelo Funcionários');
    ws.columns = [
      { header: 'Nome Completo', key: 'nome', width: 34 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Cargo', key: 'cargo', width: 24 },
      { header: 'Modalidade de Contratação', key: 'modalidade', width: 24 },
      { header: 'Telefone', key: 'telefone', width: 18 },
      { header: 'E-mail', key: 'email', width: 30 },
      { header: 'Lotação', key: 'lotacao', width: 26 }
    ];
    ws.addRow({
      nome: 'Maria Aparecida da Silva',
      cpf: '123.456.789-01',
      cargo: 'Professor(a)',
      modalidade: 'Efetivo',
      telefone: '(66) 99999-0000',
      email: 'maria@municipio.gov.br',
      lotacao: 'Escola Municipal Monteiro Lobato'
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_funcionarios_educacao.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Planilha modelo baixada!', 'success');
  };

  const handleImportSpreadsheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const incoming: EducationEmployeeRecord[] = [];
      const existingByCpf = new Map<string, EducationEmployeeRecord>(
        employees.map((emp) => [emp.cpf.replace(/\D/g, ''), emp])
      );

      const pushRow = (
        rawName: unknown,
        rawCpf: unknown,
        rawRole: unknown,
        rawModality: unknown,
        rawPhone: unknown,
        rawEmail: unknown,
        rawWorkplace: unknown
      ) => {
        const fullName = String(rawName ?? '').trim();
        const digits = String(rawCpf ?? '').replace(/\D/g, '');
        const cleanCpf = digits.length > 0 && digits.length < 11 ? digits.padStart(11, '0') : digits;
        if (fullName.length < 3 || cleanCpf.length !== 11) return;

        const existing = existingByCpf.get(cleanCpf);
        const rec: EducationEmployeeRecord = {
          id: existing?.id || crypto.randomUUID(),
          institution_id: institutionId,
          full_name: fullName,
          cpf: cleanCpf,
          role_title: String(rawRole ?? '').trim() || existing?.role_title || 'Servidor(a)',
          contract_modality: normalizeModality(rawModality ?? existing?.contract_modality),
          phone: String(rawPhone ?? '').trim() || existing?.phone || '',
          email: String(rawEmail ?? '').trim() || existing?.email || '',
          workplace:
            String(rawWorkplace ?? '').trim() ||
            existing?.workplace ||
            'Secretaria / Rede Municipal',
          status: existing?.status || 'ativo'
        };
        existingByCpf.set(cleanCpf, rec);
        incoming.push(rec);
      };

      const ext = file.name.toLowerCase();
      if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 0) {
          const sep = lines[0].includes(';') ? ';' : ',';
          const headers = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
          const idxName = Math.max(0, headers.findIndex((h) => /nome|servidor|funcion/.test(h)));
          const idxCpf = Math.max(1, headers.findIndex((h) => /cpf|doc/.test(h)));
          const idxRole = headers.findIndex((h) => /cargo|fun[cç][aã]o/.test(h));
          const idxMod = headers.findIndex((h) => /modalidade|v[ií]nculo|contrat/.test(h));
          const idxPhone = headers.findIndex((h) => /tel|cel|fone|whats/.test(h));
          const idxEmail = headers.findIndex((h) => /mail/.test(h));
          const idxWork = headers.findIndex((h) => /lota|escola|unidade/.test(h));
          const start = /nome|cpf/.test(lines[0].toLowerCase()) ? 1 : 0;

          for (let i = start; i < lines.length; i++) {
            const cols = lines[i].split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
            pushRow(
              cols[idxName],
              cols[idxCpf],
              idxRole >= 0 ? cols[idxRole] : 'Servidor(a)',
              idxMod >= 0 ? cols[idxMod] : 'Efetivo',
              idxPhone >= 0 ? cols[idxPhone] : '',
              idxEmail >= 0 ? cols[idxEmail] : '',
              idxWork >= 0 ? cols[idxWork] : ''
            );
          }
        }
      } else {
        const buffer = await file.arrayBuffer();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const ws = wb.worksheets[0];
        if (ws) {
          let cName = 1;
          let cCpf = 2;
          let cRole = 3;
          let cMod = 4;
          let cPhone = 5;
          let cEmail = 6;
          let cWork = 7;
          let hasHeader = false;

          ws.getRow(1).eachCell((cell, colNum) => {
            const h = String(cell.value ?? '').toLowerCase();
            if (/nome|servidor|funcion/.test(h)) {
              cName = colNum;
              hasHeader = true;
            } else if (/cpf|doc/.test(h)) {
              cCpf = colNum;
              hasHeader = true;
            } else if (/cargo|fun[cç][aã]o/.test(h)) {
              cRole = colNum;
            } else if (/modalidade|v[ií]nculo|contrat/.test(h)) {
              cMod = colNum;
            } else if (/tel|cel|fone|whats/.test(h)) {
              cPhone = colNum;
            } else if (/mail/.test(h)) {
              cEmail = colNum;
            } else if (/lota|escola|unidade/.test(h)) {
              cWork = colNum;
            }
          });

          ws.eachRow((row, rowNumber) => {
            if (hasHeader && rowNumber === 1) return;
            const val = (col: number) => row.getCell(col).text || row.getCell(col).value;
            pushRow(val(cName), val(cCpf), val(cRole), val(cMod), val(cPhone), val(cEmail), val(cWork));
          });
        }
      }

      if (incoming.length === 0) {
        showToast('Nenhum funcionário válido (Nome + CPF) encontrado na planilha.', 'warning');
        return;
      }

      const merged = Array.from(existingByCpf.values()).sort((a, b) =>
        a.full_name.localeCompare(b.full_name, 'pt-BR')
      );
      setEmployees(merged);
      persistLocal(merged);

      try {
        await supabase.from('education_employees').upsert(incoming, { onConflict: 'id' });
      } catch {
        // ok
      }

      showToast(`${incoming.length} funcionário(s) importado(s) com sucesso!`, 'success');
    } catch (err: any) {
      showToast('Erro ao importar planilha: ' + (err?.message || 'arquivo inválido'), 'error');
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Briefcase size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white">
              Controle de Funcionários da Educação
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Cadastro completo de servidores por cargo, modalidade de contratação, CPF, telefone e e-mail.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={handleImportSpreadsheet}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <FileSpreadsheet size={14} />
            <span>Planilha Modelo</span>
          </button>

          <button
            type="button"
            disabled={isImporting}
            onClick={() => importInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} />
            <span>{isImporting ? 'Importando...' : 'Importar Planilha'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Funcionário</span>
          </button>
        </div>
      </div>

      {/* KPIs por Modalidade */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Total de Servidores</div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Efetivos</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.efetivos}</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Contratos Temporários</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.contratos}</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Comissionados / Outros</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats.outros}</div>
        </div>
      </div>

      {/* Filtros + Tabela */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, CPF, cargo ou e-mail..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
            >
              <option value="Todas">Modalidade: Todas</option>
              {CONTRACT_MODALITIES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
            >
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {r === 'Todos' ? 'Cargo: Todos' : r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-400 uppercase font-black border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4">Nome / CPF</th>
                <th className="py-3 px-4">Cargo</th>
                <th className="py-3 px-4">Modalidade</th>
                <th className="py-3 px-4">Telefone / E-mail</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    Carregando quadro de funcionários...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-neutral-400">
                    <Users size={28} className="mx-auto mb-2 text-neutral-300" />
                    Nenhum funcionário encontrado. Clique em <strong>Novo Funcionário</strong> para cadastrar.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900 dark:text-white">{emp.full_name}</div>
                      <div className="text-[11px] font-mono text-neutral-500">{formatCPF(emp.cpf)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-800 dark:text-neutral-200">{emp.role_title}</div>
                      <div className="text-[11px] text-neutral-400">{emp.workplace}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          emp.contract_modality === 'Efetivo'
                            ? 'bg-emerald-100 text-emerald-700'
                            : emp.contract_modality === 'Contrato Temporário'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {emp.contract_modality}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300 space-y-0.5">
                      {emp.phone && (
                        <div className="flex items-center gap-1">
                          <Phone size={11} /> {emp.phone}
                        </div>
                      )}
                      {emp.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={11} /> {emp.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(emp.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Cadastrar / Editar Funcionário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-neutral-900 dark:text-white">
                {editingEmployee ? 'Editar Funcionário' : 'Cadastrar Funcionário da Educação'}
              </h4>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X size={18} className="text-neutral-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  Nome Completo *
                </label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Nome completo do servidor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  CPF *
                </label>
                <input
                  required
                  inputMode="numeric"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  Número de Telefone
                </label>
                <input
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  Cargo *
                </label>
                <input
                  required
                  list="edu-employee-roles"
                  value={form.role_title}
                  onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                  placeholder="Ex: Professor(a), Merendeira..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
                <datalist id="edu-employee-roles">
                  {SUGGESTED_ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  Modalidade de Contratação *
                </label>
                <select
                  value={form.contract_modality}
                  onChange={(e) =>
                    setForm({ ...form, contract_modality: e.target.value as ContractModality })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                >
                  {CONTRACT_MODALITIES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="servidor@municipio.gov.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  Lotação / Escola
                </label>
                <input
                  value={form.workplace}
                  onChange={(e) => setForm({ ...form, workplace: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              {editingEmployee ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
