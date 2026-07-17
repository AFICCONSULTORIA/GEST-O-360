import React, { useState } from 'react';
import { UploadCloud, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Play, RefreshCw, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase, signUpNewUser } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { Institution, Department } from '../../types';
import { AVAILABLE_PERMISSIONS } from '../../lib/mockData';

interface SaaSControlCenterImportProps {
  institutions: Institution[];
  departments: Department[];
  onImportComplete?: () => void;
}

export const SaaSControlCenterImport: React.FC<SaaSControlCenterImportProps> = ({
  institutions,
  departments,
  onImportComplete
}) => {
  const [selectedInst, setSelectedInst] = useState<string>('');
  const [importType, setImportType] = useState<'departments' | 'users' | 'patrimonio' | 'students'>('departments');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    
    let sheetName = 'Secretarias';
    if (importType === 'users') sheetName = 'Servidores';
    if (importType === 'patrimonio') sheetName = 'Patrimonio';
    if (importType === 'students') sheetName = 'Alunos';

    const sheet = workbook.addWorksheet(sheetName);
    
    if (importType === 'departments') {
      sheet.columns = [
        { header: 'Nome da Secretaria', key: 'name', width: 40 }
      ];
      sheet.addRow({ name: 'Secretaria Municipal de Saúde' });
    } else if (importType === 'users') {
      sheet.columns = [
        { header: 'Nome', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Senha Temporaria', key: 'password', width: 20 },
        { header: 'Nivel de Acesso', key: 'role', width: 25 },
        { header: 'Secretaria Lotacao', key: 'department', width: 35 }
      ];
      sheet.addRow({ name: 'João Silva', email: 'joao.silva@prefeitura.gov.br', password: 'mudar123', role: 'Editor', department: 'Secretaria Municipal de Saúde' });
    } else if (importType === 'patrimonio') {
      sheet.columns = [
        { header: 'Código/Tombamento', key: 'code', width: 20 },
        { header: 'Tipo (Geral / Veículo)', key: 'itemType', width: 20 },
        { header: 'Objeto/Veículo', key: 'objectName', width: 35 },
        { header: 'Localização', key: 'location', width: 30 },
        { header: 'Secretaria', key: 'department', width: 35 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Condição', key: 'condition', width: 20 },
        { header: 'Ano', key: 'year', width: 15 }
      ];
      sheet.addRow({ code: 'PAT-001', itemType: 'Geral', objectName: 'Mesa de Escritório', location: 'Sala 2', department: 'Secretaria Municipal de Obras', status: 'Servível', condition: 'Bom', year: 2022 });
      sheet.addRow({ code: 'V-001', itemType: 'Veículo', objectName: 'Fiat Uno 2018', location: 'Pátio Central', department: 'Secretaria de Saúde', status: 'Servível', condition: 'Excelente', year: 2018 });
    } else if (importType === 'students') {
      sheet.columns = [
        { header: 'Nome do Aluno', key: 'name', width: 35 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Senha', key: 'password', width: 20 },
        { header: 'Série/Nível (ex: 5)', key: 'level', width: 20 }
      ];
      sheet.addRow({ name: 'Enzo Gabriel', email: 'enzo@escola.gov.br', password: 'aluno123', level: 5 });
    }

    // Estilizando cabeçalho
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Template_Importacao_${importType === 'departments' ? 'Secretarias' : 'Servidores'}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setParsing(true);

    try {
      const workbook = new ExcelJS.Workbook();
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) return;
        
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        
        const parsedData: any[] = [];
        
        if (importType === 'departments') {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text?.trim();
            if (name) parsedData.push({ name, status: 'Pronto' });
          });
        } else if (importType === 'users') {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text?.trim();
            if (name) {
              parsedData.push({
                name,
                email: row.getCell(2).text?.trim(),
                password: row.getCell(3).text?.trim() || 'gestao123',
                role: row.getCell(4).text?.trim() || 'Visualizador',
                department: row.getCell(5).text?.trim() || '',
                status: 'Pronto'
              });
            }
          });
        } else if (importType === 'patrimonio') {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const code = row.getCell(1).text?.trim();
            if (code) {
              parsedData.push({
                name: row.getCell(3).text?.trim() || 'Bens ' + code, // Para o campo Genérico 'name' da preview
                code,
                itemType: row.getCell(2).text?.trim() || 'Geral',
                objectName: row.getCell(3).text?.trim() || '',
                location: row.getCell(4).text?.trim() || '',
                department: row.getCell(5).text?.trim() || '',
                patrimonioStatus: row.getCell(6).text?.trim() || 'Servível',
                condition: row.getCell(7).text?.trim() || 'Bom',
                year: parseInt(row.getCell(8).text?.trim() || '2024'),
                status: 'Pronto'
              });
            }
          });
        } else if (importType === 'students') {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const name = row.getCell(1).text?.trim();
            if (name) {
              parsedData.push({
                name,
                email: row.getCell(2).text?.trim() || '',
                password: row.getCell(3).text?.trim() || 'aluno123',
                level: parseInt(row.getCell(4).text?.trim() || '1'),
                status: 'Pronto'
              });
            }
          });
        }
        
        setPreviewData(parsedData);
        setParsing(false);
      };
      reader.readAsArrayBuffer(uploadedFile);
    } catch (error) {
      showToast('Erro ao processar planilha. Certifique-se de ser um arquivo .xlsx', 'error');
      setParsing(false);
    }
  };

  const processImport = async () => {
    if (!selectedInst || previewData.length === 0) return;
    
    if (window.confirm(`Você está prestes a importar ${previewData.length} registros. Deseja continuar?`)) {
      setProcessing(true);
      
      const updatedPreview = [...previewData];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < previewData.length; i++) {
        const item = previewData[i];
        if (item.status === 'Sucesso') continue;

        updatedPreview[i] = { ...updatedPreview[i], status: 'Processando...' };
        setPreviewData([...updatedPreview]);
        
        if (importType === 'departments') {
          const { error } = await supabase.from('departments').insert({
            id: crypto.randomUUID(),
            institution_id: selectedInst,
            name: item.name
          });
          
          if (error) {
            updatedPreview[i].status = 'Erro';
            updatedPreview[i].error = error.message;
            errorCount++;
          } else {
            updatedPreview[i].status = 'Sucesso';
            successCount++;
          }
        } else if (importType === 'patrimonio') {
          const { error } = await supabase.from('patrimonio').insert({
            id: crypto.randomUUID(),
            institution_id: selectedInst,
            code: item.code,
            item_type: item.itemType,
            object_name: item.objectName,
            location: item.location,
            status: item.patrimonioStatus,
            condition: item.condition,
            department: item.department,
            year: item.year,
            created_by_name: 'Importação em Massa'
          });
          
          if (error) {
            updatedPreview[i].status = 'Erro';
            updatedPreview[i].error = error.message;
            errorCount++;
          } else {
            updatedPreview[i].status = 'Sucesso';
            successCount++;
          }
        } else if (importType === 'students') {
          let authId: any = crypto.randomUUID();
          let signUpError = null;
          
          if (item.email) {
            try {
              const { data, error } = await signUpNewUser(item.email, item.password);
              if (error && !error.message.toLowerCase().includes('already registered')) {
                signUpError = error;
              } else if (data?.user) {
                authId = data.user.id;
              }
            } catch (err: any) {
              signUpError = err;
            }
          }

          if (signUpError) {
            updatedPreview[i].status = 'Erro';
            updatedPreview[i].error = signUpError.message;
            errorCount++;
          } else {
            const { error } = await supabase.from('edu_students').insert({
              id: crypto.randomUUID(),
              user_id: authId,
              name: item.name,
              level: item.level || 1,
              institution_id: selectedInst
            });

            if (error) {
              updatedPreview[i].status = 'Erro';
              updatedPreview[i].error = error.message;
              errorCount++;
            } else {
              updatedPreview[i].status = 'Sucesso';
              successCount++;
            }
          }
        } else {
          let deptId = null;
          if (item.department) {
            const { data: deptData } = await supabase.from('departments')
                .select('id')
                .ilike('name', `%${item.department}%`)
                .eq('institution_id', selectedInst)
                .limit(1)
                .maybeSingle();
            if (deptData) deptId = deptData.id;
          }
          
          let authId: any = crypto.randomUUID();
          let signUpError = null;
          
          try {
            const { data, error } = await signUpNewUser(item.email, item.password);
            if (error) {
              if (error.message.toLowerCase().includes('already registered')) {
                console.log('Usuário já existe no Auth');
              } else {
                signUpError = error;
              }
            } else if (data?.user) {
              authId = data.user.id;
            }
          } catch (err: any) {
            signUpError = err;
          }
          
          if (signUpError) {
            updatedPreview[i].status = 'Erro';
            updatedPreview[i].error = signUpError.message;
            errorCount++;
          } else {
            const validRoles = ['Super Admin', 'Admin', 'Editor', 'Visualizador', 'Professor'];
            const assignedRole = validRoles.includes(item.role) ? item.role : 'Visualizador';

            const { error } = await supabase.from('admin_users').insert({
                id: authId,
                name: item.name,
                email: item.email,
                role: assignedRole,
                status: 'Ativo',
                last_login: 'Nunca',
                institution_id: selectedInst,
                department_id: deptId,
                permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
            });

            if (error) {
              updatedPreview[i].status = 'Erro';
              updatedPreview[i].error = error.message;
              errorCount++;
            } else {
              updatedPreview[i].status = 'Sucesso';
              successCount++;
            }
          }
        }
        
        setPreviewData([...updatedPreview]);
        await new Promise(r => setTimeout(r, 100));
      }
      
      setProcessing(false);
      showToast(`Importação concluída: ${successCount} salvos, ${errorCount} erros.`, successCount > 0 ? 'success' : 'error');
      if (onImportComplete && successCount > 0) onImportComplete();
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewData([]);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm animate-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800/60">
        <div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/10 text-purple-600 rounded-xl">
              <UploadCloud size={20} />
            </div>
            Central de Migração de Dados
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-xl">
            Acelere a implantação das prefeituras importando Servidores, Secretarias e Alunos em massa através de planilhas Excel (.xlsx).
          </p>
        </div>
        
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all"
        >
          <Download size={16} />
          Baixar Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
              1. Selecione a Prefeitura
            </label>
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-purple-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors text-sm font-bold text-neutral-900 dark:text-white"
            >
              <option value="">Selecione uma instituição...</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
              2. Tipo de Importação
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => { setImportType('departments'); clearFile(); }}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-2 ${
                  importType === 'departments' 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 text-purple-600' 
                    : 'border-neutral-100 dark:border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-200'
                }`}
              >
                Secretarias
              </button>
              <button
                onClick={() => { setImportType('users'); clearFile(); }}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-2 ${
                  importType === 'users' 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 text-purple-600' 
                    : 'border-neutral-100 dark:border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-200'
                }`}
              >
                Servidores
              </button>
              <button
                onClick={() => { setImportType('patrimonio'); clearFile(); }}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-2 ${
                  importType === 'patrimonio' 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 text-purple-600' 
                    : 'border-neutral-100 dark:border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-200'
                }`}
              >
                Patrimônio
              </button>
              <button
                onClick={() => { setImportType('students'); clearFile(); }}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-2 ${
                  importType === 'students' 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10 text-purple-600' 
                    : 'border-neutral-100 dark:border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-200'
                }`}
              >
                Alunos (Edu)
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
            3. Enviar Planilha (.xlsx)
          </label>
          <div className="relative h-[132px]">
            {!file ? (
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-300 dark:hover:border-purple-800/50 transition-all cursor-pointer group">
                {parsing ? (
                  <RefreshCw size={32} className="text-purple-400 mb-2 animate-spin" />
                ) : (
                  <FileSpreadsheet size={32} className="text-neutral-400 group-hover:text-purple-500 transition-colors mb-2" />
                )}
                <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400 group-hover:text-purple-600">
                  {parsing ? 'Lendo arquivo...' : 'Clique para selecionar ou arraste'}
                </span>
                <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" disabled={parsing} />
              </label>
            ) : (
              <div className="absolute inset-0 flex items-center justify-between p-6 bg-purple-50 dark:bg-purple-900/10 border-2 border-purple-200 dark:border-purple-800/50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl text-purple-600 shadow-sm">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-purple-900 dark:text-purple-100">{file.name}</p>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400">{previewData.length} registros lidos</p>
                  </div>
                </div>
                <button onClick={clearFile} disabled={processing} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-white dark:hover:bg-neutral-900 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800/60 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Pré-visualização dos Dados
                <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {previewData.length} linhas
                </span>
              </h3>
            </div>
            
            <button
              onClick={processImport}
              disabled={!selectedInst || processing}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 ${
                !selectedInst || processing 
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105'
              }`}
            >
              {processing ? (
                <><RefreshCw size={18} className="animate-spin" /> Importando...</>
              ) : (
                <><Play size={18} fill="currentColor" /> Iniciar Importação</>
              )}
            </button>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-white dark:bg-neutral-900 shadow-sm z-10">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">Status</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">Nome</th>
                    {importType === 'users' && (
                      <>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">Email</th>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">Lotação</th>
                      </>
                    )}
                    {importType === 'patrimonio' && (
                      <>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">Cód/Tipo</th>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">Situação</th>
                      </>
                    )}
                    {importType === 'students' && (
                      <>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">Email</th>
                        <th className="p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">Nível</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white dark:hover:bg-neutral-900 transition-colors">
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          row.status === 'Pronto' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' :
                          row.status === 'Processando...' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                          row.status === 'Sucesso' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                        }`}>
                          {row.status === 'Sucesso' && <CheckCircle2 size={12} />}
                          {row.status === 'Erro' && <AlertTriangle size={12} />}
                          {row.status === 'Processando...' && <RefreshCw size={12} className="animate-spin" />}
                          {row.status}
                        </span>
                        {row.error && <p className="text-[10px] text-rose-500 mt-1 max-w-[150px] truncate" title={row.error}>{row.error}</p>}
                      </td>
                      <td className="p-4 font-bold text-neutral-700 dark:text-neutral-300">{row.name}</td>
                      {importType === 'users' && (
                        <>
                          <td className="p-4 text-neutral-500">{row.email}</td>
                          <td className="p-4 text-neutral-500 truncate max-w-[150px]">{row.department || '-'}</td>
                        </>
                      )}
                      {importType === 'patrimonio' && (
                        <>
                          <td className="p-4 text-neutral-500"><span className="font-mono text-purple-500">{row.code}</span> / {row.itemType}</td>
                          <td className="p-4 text-neutral-500">{row.patrimonioStatus} / {row.condition}</td>
                        </>
                      )}
                      {importType === 'students' && (
                        <>
                          <td className="p-4 text-neutral-500">{row.email}</td>
                          <td className="p-4 text-neutral-500 text-center"><span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-bold">{row.level}</span></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
