import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import {
  FileSpreadsheet,
  Upload,
  Download,
  UserPlus,
  Search,
  Trash2,
  CheckCircle2,
  Users,
  AlertTriangle
} from 'lucide-react';
import { VotingService } from '../services/votingService';
import { VoterRegistryEntry } from '../types/voting';
import { formatCPF, validateCPF } from '../../../lib/masks';
import { showToast } from '../../../components/ui/Toast';

interface DuplicateImportInfo {
  cpfClean: string;
  names: string[];
  count: number;
}

export const VotingVotersRegistryTab: React.FC = () => {
  const [voters, setVoters] = useState<VoterRegistryEntry[]>(() =>
    VotingService.getVotersRegistry()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'duplicates'>('all');
  const [duplicateImports, setDuplicateImports] = useState<Record<string, DuplicateImportInfo>>({});
  const [manualCpf, setManualCpf] = useState('');
  const [manualName, setManualName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    VotingService.syncVotersRegistryFromSupabase().then(setVoters);
  }, []);

  // Conta ocorrências de cada CPF na base cadastrada + CPFs duplicados detectados na planilha importada
  const cpfCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    voters.forEach((v) => {
      counts[v.cpfClean] = (counts[v.cpfClean] || 0) + 1;
    });
    return counts;
  }, [voters]);

  const duplicateVotersCount = useMemo(() => {
    return voters.filter(
      (v) => (cpfCounts[v.cpfClean] || 0) > 1 || Boolean(duplicateImports[v.cpfClean])
    ).length;
  }, [voters, cpfCounts, duplicateImports]);

  const filteredVoters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return voters.filter((v) => {
      const isDuplicate = (cpfCounts[v.cpfClean] || 0) > 1 || Boolean(duplicateImports[v.cpfClean]);
      if (filterMode === 'duplicates' && !isDuplicate) return false;
      if (!q) return true;
      return (
        v.fullName.toLowerCase().includes(q) ||
        (digits.length > 0 && v.cpfClean.includes(digits))
      );
    });
  }, [voters, searchQuery, filterMode, cpfCounts, duplicateImports]);

  const handleDownloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Eleitores');
    ws.columns = [
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Nome Completo', key: 'nome', width: 42 }
    ];
    ws.addRow({
      cpf: '064.872.941-95',
      nome: 'Carlos Eduardo Freitas Barbosa'
    });
    ws.addRow({
      cpf: '123.456.789-01',
      nome: 'Maria Aparecida da Silva'
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_planilha_eleitores_votacao.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Planilha modelo baixada! Preencha e importe aqui.', 'success');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const parsedEntries: Array<{ cpf: string; fullName: string }> = [];
      const ext = file.name.toLowerCase();

      const pushNormalized = (rawCpfVal: unknown, rawNameVal: unknown) => {
        const rawCpf = String(rawCpfVal ?? '').replace(/\D/g, '');
        const cpfClean = rawCpf.length > 0 && rawCpf.length < 11 ? rawCpf.padStart(11, '0') : rawCpf;
        const fullName = String(rawNameVal ?? '').trim();
        if (cpfClean.length === 11 && fullName.length >= 3) {
          parsedEntries.push({ cpf: cpfClean, fullName });
        }
      };

      if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 0) {
          const sep = lines[0].includes(';') ? ';' : ',';
          const headers = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, '').trim());
          const cpfIdx = Math.max(0, headers.findIndex((h) => /cpf|documento/i.test(h)));
          const nameIdx = Math.max(
            1,
            headers.findIndex((h) => /nome|funcionario|funcionário|servidor|eleitor|responsavel|responsável/i.test(h))
          );
          const startRow = /cpf|nome/i.test(lines[0]) ? 1 : 0;
          for (let i = startRow; i < lines.length; i++) {
            const cols = lines[i].split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
            pushNormalized(cols[cpfIdx], cols[nameIdx]);
          }
        }
      } else {
        const buffer = await file.arrayBuffer();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const ws = wb.worksheets[0];
        if (ws) {
          let cpfCol = 1;
          let nameCol = 2;
          let hasHeader = false;

          const headerRow = ws.getRow(1);
          headerRow.eachCell((cell, colNum) => {
            const txt = String(cell.value ?? '').toLowerCase();
            if (/cpf|documento/.test(txt)) {
              cpfCol = colNum;
              hasHeader = true;
            } else if (/nome|funcionario|funcionário|servidor|eleitor|responsavel|responsável/.test(txt)) {
              nameCol = colNum;
              hasHeader = true;
            }
          });

          ws.eachRow((row, rowNumber) => {
            if (hasHeader && rowNumber === 1) return;
            const cpfVal = row.getCell(cpfCol).text || row.getCell(cpfCol).value;
            const nameVal = row.getCell(nameCol).text || row.getCell(nameCol).value;
            pushNormalized(cpfVal, nameVal);
          });
        }
      }

      if (parsedEntries.length === 0) {
        showToast(
          'Nenhum CPF + Nome válido encontrado. Use as colunas "CPF" e "Nome Completo" (.xlsx ou .csv).',
          'warning'
        );
        return;
      }

      // Detecta CPFs repetidos dentro da própria planilha ou já cadastrados com nome diferente
      const existingByCpf = new Map<string, string>(voters.map((v) => [v.cpfClean, v.fullName]));
      const seenInFile = new Map<string, string[]>();
      parsedEntries.forEach((item) => {
        const list = seenInFile.get(item.cpf) || [];
        list.push(item.fullName);
        seenInFile.set(item.cpf, list);
      });

      const foundDuplicates: Record<string, DuplicateImportInfo> = { ...duplicateImports };
      seenInFile.forEach((names, cpfClean) => {
        const prevName = existingByCpf.get(cpfClean);
        if (names.length > 1 || (prevName && prevName.toLowerCase() !== names[0].toLowerCase())) {
          const allNames: string[] = Array.from(new Set<string>(prevName ? [prevName, ...names] : names));
          foundDuplicates[cpfClean] = {
            cpfClean,
            names: allNames,
            count: names.length + (prevName ? 1 : 0)
          };
        }
      });
      setDuplicateImports(foundDuplicates);

      const res = await VotingService.importVotersRegistry(parsedEntries);
      setVoters(VotingService.getVotersRegistry());
      const dupCount = Object.keys(foundDuplicates).length;
      showToast(
        `${res.imported} registro(s) importado(s)${
          dupCount > 0 ? ` (${dupCount} CPF(s) duplicado(s) sinalizado(s) no filtro)` : '!'
        }`,
        dupCount > 0 ? 'warning' : 'success'
      );
    } catch (err: any) {
      showToast('Erro ao ler planilha: ' + (err?.message || 'arquivo inválido'), 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCpf.replace(/\D/g, '');
    if (clean.length !== 11 || !validateCPF(manualCpf)) {
      showToast('Informe um CPF válido com 11 dígitos.', 'warning');
      return;
    }
    if (manualName.trim().length < 3) {
      showToast('Informe o nome completo.', 'warning');
      return;
    }

    const existing = voters.find((v) => v.cpfClean === clean);
    if (existing) {
      setDuplicateImports((prev) => ({
        ...prev,
        [clean]: {
          cpfClean: clean,
          names: Array.from(new Set([existing.fullName, manualName.trim()])),
          count: (prev[clean]?.count || 1) + 1
        }
      }));
      showToast(
        `Atenção: CPF ${formatCPF(clean)} já estava cadastrado (${existing.fullName}) e foi marcado no filtro de duplicados.`,
        'warning'
      );
    }

    await VotingService.importVotersRegistry([
      { cpf: clean, fullName: manualName.trim() }
    ]);
    setVoters(VotingService.getVotersRegistry());
    setManualCpf('');
    setManualName('');
    if (!existing) {
      showToast('Eleitor cadastrado na base automática da urna!', 'success');
    }
  };

  const handleDelete = async (id: string) => {
    await VotingService.deleteVoterFromRegistry(id);
    setVoters(VotingService.getVotersRegistry());
  };

  const handleClearAll = async () => {
    if (!window.confirm('Deseja limpar toda a lista importada de funcionários/eleitores?')) return;
    await VotingService.clearVotersRegistry();
    setVoters([]);
    setDuplicateImports({});
    setFilterMode('all');
    showToast('Lista limpa.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho & Importação de Planilha */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h4 className="text-lg font-black text-neutral-900 dark:text-white">
              Planilha de Funcionários &amp; Eleitores (Auto-CPF)
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Importe sua planilha Excel/CSV com <strong>CPF</strong> e <strong>Nome Completo</strong>. Na hora da votação, ao digitar o CPF, o nome aparece automaticamente.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-black flex items-center gap-1.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <Download size={14} />
            <span>Baixar Planilha Modelo</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} />
            <span>{isImporting ? 'Importando...' : 'Importar Planilha (Excel/CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Cadastro Rápido Individual */}
      <form
        onSubmit={handleAddManual}
        className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-100 dark:border-neutral-800 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-4">
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
            CPF
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={manualCpf}
            onChange={(e) => setManualCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white"
          />
        </div>

        <div className="md:col-span-6">
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
            Nome Completo
          </label>
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Ex: Carlos Eduardo Freitas Barbosa"
            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Adicionar</span>
          </button>
        </div>
      </form>

      {/* Tabela da Base Carregada + Filtro de CPFs Duplicados */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            <span className="text-sm font-black text-neutral-900 dark:text-white mr-2">
              Eleitores Cadastrados
            </span>

            <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500'
                }`}
              >
                Todos ({voters.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('duplicates')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  filterMode === 'duplicates'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : duplicateVotersCount > 0
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-neutral-500'
                }`}
              >
                <AlertTriangle size={13} />
                <span>CPFs Duplicados ({duplicateVotersCount})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou CPF..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              />
            </div>

            {voters.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-black cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-400 uppercase font-black border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4">CPF</th>
                <th className="py-3 px-4">Nome Completo</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Remover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredVoters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-400">
                    {filterMode === 'duplicates'
                      ? 'Nenhum CPF duplicado encontrado na base.'
                      : 'Nenhum funcionário/eleitor na base ainda. Importe uma planilha Excel/CSV acima.'}
                  </td>
                </tr>
              ) : (
                filteredVoters.slice(0, 200).map((v) => {
                  const dupInfo = duplicateImports[v.cpfClean];
                  const isDup = (cpfCounts[v.cpfClean] || 0) > 1 || Boolean(dupInfo);
                  return (
                    <tr
                      key={v.id}
                      className={
                        isDup
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30'
                      }
                    >
                      <td className="py-2.5 px-4 font-mono font-black text-neutral-900 dark:text-white">
                        {formatCPF(v.cpfClean)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-neutral-800 dark:text-neutral-200">
                        <div>{v.fullName}</div>
                        {dupInfo && dupInfo.names.length > 1 && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                            Nomes encontrados para este CPF: {dupInfo.names.join(' / ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isDup ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px]">
                            <AlertTriangle size={11} /> CPF Duplicado ({dupInfo?.count || cpfCounts[v.cpfClean]}x)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px]">
                            <CheckCircle2 size={11} /> Ativo na Urna
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
