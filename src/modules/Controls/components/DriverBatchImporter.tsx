import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Trash2, 
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { formatCPF } from '../../../lib/masks';
import { createDriversBatch, NewDriverPayload } from '../../../lib/api/fleetFuel';

interface DriverBatchImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  institutionId?: string;
}

interface ParsedDriverRow {
  index: number;
  fullName: string;
  cpf: string;
  cnhNumber: string;
  cnhCategory: string;
  department: string;
  birthDate?: string;
  isValid: boolean;
  errorReason?: string;
}

export const DriverBatchImporter: React.FC<DriverBatchImporterProps> = ({
  isOpen,
  onClose,
  onSuccess,
  institutionId = 'inst_1'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedDriverRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Gerar e baixar planilha modelo oficial
  const handleDownloadTemplate = () => {
    const wsData = [
      ['Nome Completo', 'CPF', 'CNH', 'Categoria', 'Secretaria / Departamento'],
      ['João Carlos da Silva', '123.456.789-00', '12345678901', 'D', 'Transporte Escolar'],
      ['Maria Eduarda Oliveira', '987.654.321-11', '98765432100', 'B', 'Saúde - PSF'],
      ['Antônio Marcos Pereira', '555.444.333-22', '45678912300', 'E', 'Secretaria de Viação e Obras'],
      ['Roberto Alves Santos', '333.222.111-00', '78912345600', 'C', 'Serviços de Limpeza Urbana']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 32 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 32 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo Motoristas');
    XLSX.writeFile(wb, 'Modelo_Importacao_Motoristas_Gestao360.xlsx');
  };

  // Normalizar chave para mapeamento agnóstico de colunas
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawJson || rawJson.length === 0) {
        alert('A planilha fornecida está vazia ou não possui linhas de dados.');
        setIsProcessing(false);
        return;
      }

      const rows: ParsedDriverRow[] = rawJson.map((row, idx) => {
        let fullName = '';
        let cpf = '';
        let cnhNumber = '';
        let cnhCategory = 'B';
        let department = 'Secretaria Geral';
        let birthDate = '';

        for (const [key, value] of Object.entries(row)) {
          const norm = normalizeKey(key);
          const strVal = String(value || '').trim();

          if (norm.includes('nome') || norm.includes('motorista') || norm.includes('condutor')) {
            fullName = strVal;
          } else if (norm.includes('cpf') || norm.includes('documento') || norm.includes('doc')) {
            cpf = strVal;
          } else if (norm.includes('cnh') && !norm.includes('cat')) {
            cnhNumber = strVal;
          } else if (norm.includes('cat') || norm.includes('categoriacnh')) {
            cnhCategory = strVal.toUpperCase() || 'B';
          } else if (norm.includes('sec') || norm.includes('dep') || norm.includes('lotac') || norm.includes('orgao') || norm.includes('secretaria')) {
            department = strVal || 'Secretaria Geral';
          } else if (norm.includes('nasc') || norm.includes('data')) {
            birthDate = strVal;
          }
        }

        // Formatar CPF
        const cleanCpfDigits = cpf.replace(/\D/g, '');
        const formattedCpf = cleanCpfDigits.length === 11 ? formatCPF(cleanCpfDigits) : cpf;

        // Validação
        let isValid = true;
        let errorReason = '';

        if (!fullName || fullName.length < 3) {
          isValid = false;
          errorReason = 'Nome incompleto ou não informado';
        } else if (cpf.trim() !== '' && cleanCpfDigits.length !== 11) {
          isValid = false;
          errorReason = 'CPF deve conter 11 dígitos ou ficar em branco';
        }

        return {
          index: idx + 1,
          fullName,
          cpf: formattedCpf,
          cnhNumber,
          cnhCategory: cnhCategory || 'B',
          department: department || 'Frota Municipal',
          birthDate,
          isValid,
          errorReason
        };
      });

      setParsedRows(rows);
    } catch (err) {
      console.error('Erro ao ler planilha:', err);
      alert('Falha ao processar o arquivo. Verifique se o formato é válido (.xlsx, .xls ou .csv).');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows(prev => prev.filter(r => r.index !== index));
  };

  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      alert('Não há registros válidos para importar.');
      return;
    }

    setImporting(true);
    try {
      const payload: NewDriverPayload[] = validRows.map(r => ({
        institution_id: institutionId,
        full_name: r.fullName,
        cpf: r.cpf.replace(/\D/g, ''),
        department: r.department,
        cnh_number: r.cnhNumber || undefined,
        cnh_category: r.cnhCategory || 'B',
        birth_date: r.birthDate || undefined,
        status: 'ativo'
      }));

      const res = await createDriversBatch(payload, institutionId);
      onSuccess(res.count);
      onClose();
    } catch (err) {
      console.error('Erro na importação em lote:', err);
      alert('Ocorreu um erro ao gravar os motoristas no banco de dados.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Importação em Lote de Motoristas
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium border border-emerald-300 dark:border-emerald-800">
                  Planilha Excel / CSV
                </span>
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Cadastre em massa os condutores oficiais com cruzamento de CPF, CNH e secretaria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Área de Ações e Download de Modelo */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60">
            <div className="flex items-center gap-3 text-left">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Modelo Oficial de Importação
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Baixe o modelo com as colunas pré-formatadas para preenchimento
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 shadow-sm transition"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Baixar Planilha Modelo (.xlsx)
            </button>
          </div>

          {/* Drag & Drop Upload */}
          {parsedRows.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-500/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                  {isProcessing ? 'Lendo e validando planilha...' : 'Arraste a planilha de motoristas aqui'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou CSV (.csv)
                </p>
              </div>
              <button
                type="button"
                className="mt-2 px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800"
              >
                Selecionar Arquivo no Computador
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumo do Arquivo e Estatísticas */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-xs">
                    {fileName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {validRows.length} Válidos
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {invalidRows.length} Inválidos
                    </span>
                  )}
                  <button
                    onClick={() => { setParsedRows([]); setFileName(null); }}
                    className="ml-2 p-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition"
                    title="Substituir arquivo"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabela de Pré-visualização */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Nome do Condutor</th>
                      <th className="p-3">CPF</th>
                      <th className="p-3">CNH / Cat</th>
                      <th className="p-3">Secretaria</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {parsedRows.map((row) => (
                      <tr 
                        key={row.index}
                        className={row.isValid ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40' : 'bg-red-50/50 dark:bg-red-950/20'}
                      >
                        <td className="p-3 text-center text-neutral-400 font-mono">{row.index}</td>
                        <td className="p-3 font-medium text-neutral-900 dark:text-white">
                          {row.fullName || <span className="text-red-500 italic">Não informado</span>}
                        </td>
                        <td className="p-3 font-mono text-neutral-700 dark:text-neutral-300">
                          {row.cpf || <span className="text-neutral-400 italic font-sans">Não informado</span>}
                        </td>
                        <td className="p-3 text-neutral-600 dark:text-neutral-400">
                          {row.cnhNumber || '—'} <span className="font-semibold text-emerald-600 dark:text-emerald-400">({row.cnhCategory})</span>
                        </td>
                        <td className="p-3 text-neutral-600 dark:text-neutral-400 truncate max-w-[160px]">
                          {row.department}
                        </td>
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pronto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium" title={row.errorReason}>
                              <AlertTriangle className="w-3.5 h-3.5" /> {row.errorReason}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveRow(row.index)}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded transition"
                            title="Remover linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidRows.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Linhas com erro serão desconsideradas automaticamente. Apenas as {validRows.length} linhas válidas serão salvas.
                </p>
              )}
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            disabled={validRows.length === 0 || importing}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            {importing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importando motoristas...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Importação ({validRows.length})
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

