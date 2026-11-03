import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, XCircle, Search, Award, 
  Calendar, Clock, User, FileText, ArrowLeft, Printer, ExternalLink, Sparkles, Building2, Sun, Moon
} from 'lucide-react';
import { fetchCertificateByHash, syncLocalCertificatesToSupabase } from '../modules/Education/services/certificateService';
import { IssuedCertificate } from '../modules/Education/types/certificates';
import { Institution } from '../types';

interface PublicCertificateValidatorProps {
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  currentInstitution?: Institution | null;
}

export const PublicCertificateValidator: React.FC<PublicCertificateValidatorProps> = ({
  darkMode = false,
  setDarkMode,
  currentInstitution
}) => {
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState<IssuedCertificate | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincroniza cache local e lê código da URL (?codigo=... ou /validar-documento/CERT-...)
  useEffect(() => {
    // Sincroniza eventuais certificados emitidos em cache local
    syncLocalCertificatesToSupabase().catch(() => {});

    // Extrai parâmetros tanto da busca (?codigo=) quanto do hash (#...?)
    let searchStr = window.location.search;
    if (!searchStr && window.location.hash.includes('?')) {
      searchStr = window.location.hash.slice(window.location.hash.indexOf('?'));
    }

    const params = new URLSearchParams(searchStr);
    const codeParam = params.get('codigo') || params.get('hash') || params.get('code') || params.get('c');

    if (codeParam) {
      const clean = codeParam.trim();
      setSearchCode(clean);
      handleValidate(clean);
      return;
    }

    // Verifica se a URL tem /validar-documento/CERT-XXX ou /validar/CERT-XXX
    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && (lastPart.toUpperCase().startsWith('CERT-') || lastPart.length >= 6)) {
      const clean = lastPart.trim();
      setSearchCode(clean);
      handleValidate(clean);
      return;
    }

    // Verifica hash puro (ex: #CERT-2026-FLX6NX)
    if (window.location.hash) {
      const hashClean = window.location.hash.replace('#', '').split('?')[0].trim();
      if (hashClean.toUpperCase().startsWith('CERT-')) {
        setSearchCode(hashClean);
        handleValidate(hashClean);
      }
    }
  }, []);

  const handleValidate = async (codeToSearch?: string) => {
    const code = (codeToSearch || searchCode).trim();
    if (!code) return;

    setLoading(true);
    setErrorMsg(null);
    setSearched(true);

    try {
      const result = await fetchCertificateByHash(code);
      if (result) {
        setCertificate(result);
      } else {
        setCertificate(null);
        setErrorMsg('Documento não localizado com este código de autenticidade.');
      }
    } catch (err: any) {
      console.error('Erro ao validar certificado:', err);
      setCertificate(null);
      setErrorMsg('Ocorreu um erro ao consultar o servidor de validação.');
    } finally {
      setLoading(false);
    }
  };

  const maskDocument = (doc: string) => {
    const clean = doc.replace(/\D/g, '');
    if (clean.length === 11) {
      return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
    }
    if (clean.length > 4) {
      return `****${clean.slice(-4)}`;
    }
    return doc;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-800'} transition-colors duration-200`}>
      {/* Botão de Tema no Topo */}
      {setDarkMode && (
        <div className="absolute top-6 right-6 z-50 print:hidden">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:scale-105 transition-all cursor-pointer"
            title="Alternar tema"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      )}

      {/* Header Institucional */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-6 px-4 print:hidden">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <Award size={26} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                GESTÃO 360 <span className="text-amber-600 text-sm font-semibold ml-2">AUTENTICIDADE</span>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {currentInstitution?.name || 'Prefeitura Municipal'} · Portal Público de Validação de Certificados
              </p>
            </div>
          </div>

          <a 
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Voltar ao Início
          </a>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Caixa de Busca */}
        <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm print:hidden">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 mb-3">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
              Conferência de Autenticidade Digital
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-lg mx-auto">
              Digite o código de verificação impresso no certificado para checar a validade legal e os dados de registro oficial (Lei Federal 14.063/2020).
            </p>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); handleValidate(); }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Ex: CERT-2026-X8Y9Z1"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchCode.trim()}
              className="px-8 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Verificando...</>
              ) : (
                <>Verificar <ExternalLink size={14} /></>
              )}
            </button>
          </form>
        </div>

        {/* Resultado: Documento Válido */}
        {searched && certificate && (
          <div className="mt-8 bg-white dark:bg-neutral-900 rounded-3xl border-2 border-emerald-500/30 dark:border-emerald-500/20 p-6 sm:p-10 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black text-[10px] tracking-widest uppercase px-6 py-1.5 rounded-bl-2xl flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Autêntico & Válido
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Validação Oficial Confirmada
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100">
                  {certificate.recipient_name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Documento: <strong className="font-mono">{maskDocument(certificate.recipient_document)}</strong> · Perfil: <strong className="capitalize">{certificate.recipient_role || 'Participante'}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-y border-neutral-100 dark:border-neutral-800 text-sm">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Evento / Formação</span>
                <p className="font-bold text-neutral-900 dark:text-neutral-100">
                  {certificate.template?.title || 'Formação Continuada'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Carga Horária Registrada</span>
                <p className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-500" />
                  {certificate.template?.workload_hours || 0} horas certificadas
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Período de Realização</span>
                <p className="font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Calendar size={14} className="text-neutral-400" />
                  {certificate.template?.event_date_start 
                    ? new Date(certificate.template.event_date_start).toLocaleDateString('pt-BR') 
                    : 'Data do evento'}
                  {certificate.template?.event_date_end && ` até ${new Date(certificate.template.event_date_end).toLocaleDateString('pt-BR')}`}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Autoridade Emissora</span>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">
                  {certificate.template?.issuer_name} ({certificate.template?.issuer_role})
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Chave Criptográfica de Validação</span>
                <p className="font-mono text-sm font-black text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  {certificate.validation_hash}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-neutral-500">
                Emitido em: {new Date(certificate.created_at).toLocaleDateString('pt-BR')} · Vias baixadas: {certificate.download_count || 1}
              </div>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2 cursor-pointer print:hidden"
              >
                <Printer size={14} /> Imprimir Comprovante
              </button>
            </div>
          </div>
        )}

        {/* Resultado: Documento Não Localizado */}
        {searched && !loading && !certificate && (
          <div className="mt-8 bg-white dark:bg-neutral-900 rounded-3xl border-2 border-rose-500/30 p-8 text-center shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <XCircle size={36} />
            </div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
              Código Não Encontrado
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-4">
              {errorMsg || 'Não foi possível localizar nenhum certificado com a chave informada.'}
            </p>
            <p className="text-xs text-neutral-400">
              Certifique-se de que digitou o código exatamente como consta no rodapé do certificado (ex: CERT-2026-XXXXXX).
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

