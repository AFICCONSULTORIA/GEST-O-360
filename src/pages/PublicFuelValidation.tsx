/**
 * Portal Público e Mobile de Validação de Abastecimento de Frotas
 * Arquivo: src/pages/PublicFuelValidation.tsx
 * Sistema GESTÃO 360 - Acessível via leitura de QR Code no Canhoto
 * Permite ao Fiscal/Frentista conferir dados contratuais e registrar baixa com foto
 */

import React, { useState, useEffect } from 'react';
import { 
  Fuel, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Search, 
  Camera, Upload, FileText, ArrowLeft, Building2, Sun, Moon, Gauge, 
  Car, Clock, AlertCircle, Ban, Check, RefreshCw
} from 'lucide-react';
import { 
  TwoWayFuelOrder, 
  getFuelAuthorizationByNumber, 
  validateAndCompleteFuelOrder, 
  calculateRealtimeMetrics, 
  uploadFuelDocumentPhoto,
  ConsumptionAuditCalculation 
} from '../lib/api/fleetFuelAudit';
import { formatFuelLabel } from '../modules/Controls/components/FuelAuthorizationVoucherPDF';
import { Institution } from '../types';
import { showToast } from '../components/ui/Toast';

interface PublicFuelValidationProps {
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  currentInstitution?: Institution | null;
}

export const PublicFuelValidation: React.FC<PublicFuelValidationProps> = ({
  darkMode = false,
  setDarkMode,
  currentInstitution
}) => {
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TwoWayFuelOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formulário de Baixa na Bomba
  const [currentOdometerInput, setCurrentOdometerInput] = useState<string>('');
  const [litersSuppliedInput, setLitersSuppliedInput] = useState<string>('');
  const [couponNumberInput, setCouponNumberInput] = useState<string>('');
  const [justificationInput, setJustificationInput] = useState<string>('');
  const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [odometerPreview, setOdometerPreview] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ order: TwoWayFuelOrder; audit: ConsumptionAuditCalculation } | null>(null);

  // Leitura automática da URL ao carregar
  useEffect(() => {
    let searchStr = window.location.search;
    if (!searchStr && window.location.hash.includes('?')) {
      searchStr = window.location.hash.slice(window.location.hash.indexOf('?'));
    }

    const params = new URLSearchParams(searchStr);
    const orderParam = params.get('order') || params.get('codigo') || params.get('cod') || params.get('id');

    if (orderParam) {
      const clean = orderParam.trim();
      setSearchCode(clean);
      handleSearch(clean);
      return;
    }

    // Leitura por path: /validar-abastecimento/AUT-2026-XXXX
    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && (lastPart.toUpperCase().startsWith('AUT-') || lastPart.toUpperCase().startsWith('ABAST-') || lastPart.length > 5)) {
      const clean = lastPart.trim();
      setSearchCode(clean);
      handleSearch(clean);
    }
  }, []);

  const handleSearch = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSearched(true);
    setSuccessResult(null);

    try {
      const result = await getFuelAuthorizationByNumber(codeToSearch);
      if (result) {
        setOrder(result);
        setLitersSuppliedInput(String(result.liters_authorized));
        if (result.current_odometer) {
          setCurrentOdometerInput(String(result.current_odometer));
        }
      } else {
        setOrder(null);
        setErrorMsg(`A autorização "${codeToSearch}" não foi encontrada no banco de dados do município.`);
      }
    } catch (err: unknown) {
      console.error('Erro ao consultar autorização:', err);
      const message = err instanceof Error ? err.message : 'Falha na consulta ao servidor.';
      setErrorMsg(message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // Cálculo em tempo real conforme o frentista/fiscal digita o KM atual
  const realtimeAudit: ConsumptionAuditCalculation | null = React.useMemo(() => {
    if (!order) return null;
    const currentKm = parseFloat(currentOdometerInput);
    const liters = parseFloat(litersSuppliedInput) || order.liters_authorized;
    const previousKm = order.previous_odometer;
    const expectedCons = order.vehicle?.expected_consumption || 10;
    const tankCap = order.vehicle?.tank_capacity || 80;

    if (isNaN(currentKm) || currentKm <= 0) return null;

    return calculateRealtimeMetrics(previousKm, currentKm, liters, expectedCons, tankCap);
  }, [order, currentOdometerInput, litersSuppliedInput]);

  // Upload e preview das fotos
  const handleOdometerFile = (file: File) => {
    setOdometerPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setOdometerPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleReceiptFile = (file: File) => {
    setReceiptPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Concluir baixa
  const handleCompleteOrder = async () => {
    if (!order) return;
    const currentKm = parseFloat(currentOdometerInput);
    if (isNaN(currentKm) || currentKm <= 0) {
      showToast('Por favor, informe o odômetro atual do painel do veículo.', 'error');
      return;
    }

    const liters = parseFloat(litersSuppliedInput) || order.liters_authorized;

    // Se estiver em alerta amarelo e não tiver justificativa
    if (realtimeAudit?.anomaly_level === 'alerta_amarelo' && !justificationInput.trim()) {
      showToast('O consumo apresentou desvio moderado. É obrigatório registrar a justificativa operacional.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      let odometerPhotoUrl = order.odometer_photo_url;
      let receiptPhotoUrl = order.receipt_photo_url;

      if (odometerPhoto) {
        odometerPhotoUrl = await uploadFuelDocumentPhoto(odometerPhoto, 'odometers');
      }
      if (receiptPhoto) {
        receiptPhotoUrl = await uploadFuelDocumentPhoto(receiptPhoto, 'receipts');
      }

      const result = await validateAndCompleteFuelOrder(order.id, {
        current_odometer: currentKm,
        liters_supplied: liters,
        invoice_coupon_number: couponNumberInput,
        odometer_photo_url: odometerPhotoUrl,
        receipt_photo_url: receiptPhotoUrl,
        audit_justification: justificationInput.trim() || undefined
      });

      setOrder(result.order);
      setSuccessResult(result);
      showToast('Abastecimento registrado com sucesso!', 'success');
    } catch (err: unknown) {
      console.error('Erro ao registrar baixa:', err);
      const message = err instanceof Error ? err.message : 'Falha ao processar a validação.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const institutionName = currentInstitution?.name || 'Prefeitura Municipal de Torixoréu';

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'} font-sans flex flex-col transition-colors duration-200`}>
      {/* CABEÇALHO */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-neutral-900/90 border-b border-neutral-200 dark:border-neutral-800 shadow-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a 
              href="/"
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Voltar ao Início"
            >
              <ArrowLeft size={18} />
            </a>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Fuel size={20} />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight leading-tight">
                  Validador de Combustível
                </h1>
                <p className="text-[10px] text-neutral-500 font-medium">
                  {institutionName} • Gestão 360
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {setDarkMode && (
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* BARRA DE PESQUISA / SCANNER */}
        <section className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <label className="block text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
            Consultar Autorização de Combustível
          </label>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchCode);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Ex: AUT-2026-0001 ou código da ordem..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchCode.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
              Localizar
            </button>
          </form>
        </section>

        {/* FEEDBACK DE ERRO */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
            <XCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-xs font-black text-rose-800 dark:text-rose-300">
                Autorização Não Localizada
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                {errorMsg}
              </p>
            </div>
          </div>
        )}

        {/* SUCESSO APÓS BAIXA */}
        {successResult && (
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={24} />
              <h2 className="text-base font-black">
                {successResult.audit.anomaly_level === 'bloqueio_critico'
                  ? 'Abastecimento Registrado com Bloqueio de Auditoria'
                  : 'Fornecimento Concluído com Sucesso!'}
              </h2>
            </div>
            <p className="text-xs leading-relaxed">
              A baixa da autorização <span className="font-mono font-bold">{successResult.order.order_number}</span> foi registrada com segurança no sistema central de frotas.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="bg-white/80 dark:bg-neutral-900/80 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] text-neutral-500 block font-bold">KM Percorrido</span>
                <span className="text-sm font-black font-mono">{successResult.audit.delta_km} km</span>
              </div>
              <div className="bg-white/80 dark:bg-neutral-900/80 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] text-neutral-500 block font-bold">Consumo Apurado</span>
                <span className="text-sm font-black font-mono">{successResult.audit.calculated_km_per_liter} km/l</span>
              </div>
              <div className="bg-white/80 dark:bg-neutral-900/80 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] text-neutral-500 block font-bold">Desvio da Média</span>
                <span className={`text-sm font-black font-mono ${successResult.audit.deviation_percent < -15 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {successResult.audit.deviation_percent}%
                </span>
              </div>
              <div className="bg-white/80 dark:bg-neutral-900/80 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] text-neutral-500 block font-bold">Status Atual</span>
                <span className="text-sm font-black uppercase">{successResult.order.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* DETALHES DA ORDEM ENCONTRADA */}
        {order && (
          <div className="space-y-6">
            {/* CARD PRINCIPAL DE AUTORIZAÇÃO */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              {/* STATUS BANNER */}
              <div className={`p-4 flex items-center justify-between ${
                order.status === 'autorizado_pendente' 
                  ? 'bg-amber-500 text-white' 
                  : order.status === 'abastecido' || order.status === 'auditado'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                <div className="flex items-center gap-2">
                  {order.status === 'autorizado_pendente' ? (
                    <Clock size={20} className="animate-pulse" />
                  ) : order.status === 'abastecido' || order.status === 'auditado' ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Ban size={20} />
                  )}
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      {order.status === 'autorizado_pendente'
                        ? '🟢 AUTORIZAÇÃO VÁLIDA • PENDENTE DE ABASTECIMENTO'
                        : order.status === 'abastecido'
                        ? '🟡 JÁ FORNECIDO / LIQUIDADO NA BOMBA'
                        : order.status === 'auditado'
                        ? '🟢 AUDITADO E CONFORME PELO CONTROLE INTERNO'
                        : '🔴 AUTORIZAÇÃO GLOSADA / BLOQUEADA'}
                    </span>
                    <span className="text-[11px] opacity-90 font-mono">
                      Ordem nº {order.order_number}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold block opacity-90">Posto Credenciado</span>
                  <span className="text-xs font-black">{order.station_name}</span>
                </div>
              </div>

              {/* DADOS CONTRATUAIS TRAVADOS */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
                    1. Dados Oficiais do Veículo e Condutor
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block font-bold uppercase">Placa / Prefixo</span>
                      <span className="text-sm font-black font-mono text-neutral-900 dark:text-white">
                        {order.vehicle?.plate || 'SEM PLACA'} {order.vehicle?.prefix_code ? `(${order.vehicle.prefix_code})` : ''}
                      </span>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block font-bold uppercase">Marca / Modelo</span>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        {order.vehicle?.model || 'Veículo Municipal'}
                      </span>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block font-bold uppercase">Motorista Oficial</span>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        {order.driver_name} {order.driver_document ? `(${order.driver_document})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QUADRO FINANCEIRO E VOLUMÉTRICO TRAVADO */}
                <div>
                  <h3 className="text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
                    2. Parâmetros Contratuais Licitação Homologada (Preenchimento Travado)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                    <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 rounded-2xl">
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold block uppercase">Combustível</span>
                      <span className="text-xs font-black text-blue-900 dark:text-blue-200">
                        {formatFuelLabel(order.fuel_type)}
                      </span>
                    </div>
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 rounded-2xl">
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">Litragem Aut.</span>
                      <span className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200">
                        {Number(order.liters_authorized).toFixed(2)} L
                      </span>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl">
                      <span className="text-[9px] text-neutral-500 font-bold block uppercase">Preço Licitado</span>
                      <span className="text-sm font-black font-mono text-neutral-900 dark:text-white">
                        R$ {Number(order.bidded_unit_price).toFixed(3)}
                      </span>
                    </div>
                    <div className="bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 p-3 rounded-2xl">
                      <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold block uppercase">Total Travado</span>
                      <span className="text-sm font-black font-mono text-emerald-800 dark:text-emerald-100">
                        R$ {Number(order.total_authorized_value).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl col-span-2 sm:col-span-1">
                      <span className="text-[9px] text-neutral-500 font-bold block uppercase">KM Anterior</span>
                      <span className="text-sm font-black font-mono text-neutral-900 dark:text-white">
                        {Number(order.previous_odometer).toLocaleString('pt-BR')} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* FORMULÁRIO DE CONFIRMAÇÃO NA BOMBA (SE PENDENTE) */}
                {order.status === 'autorizado_pendente' && (
                  <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Gauge className="text-emerald-600 dark:text-emerald-400" size={20} />
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                        3. Lançamento Presencial no Ato do Abastecimento
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Odômetro Atual no Painel (KM) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={`Maior que ${order.previous_odometer} km`}
                          value={currentOdometerInput}
                          onChange={(e) => setCurrentOdometerInput(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Litros Abastecidos (L) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={litersSuppliedInput}
                          onChange={(e) => setLitersSuppliedInput(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          Máx autorizado: {order.liters_authorized}L
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Nº do Cupom Fiscal / NFC-e
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Cupom 12489..."
                          value={couponNumberInput}
                          onChange={(e) => setCouponNumberInput(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* SEMÁFORO ANTIFRAUDE EM TEMPO REAL */}
                    {realtimeAudit && (
                      <div className={`p-4 rounded-2xl border transition-all ${
                        realtimeAudit.anomaly_level === 'bloqueio_critico'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          : realtimeAudit.anomaly_level === 'alerta_amarelo'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      }`}>
                        <div className="flex items-start gap-2.5">
                          {realtimeAudit.anomaly_level === 'bloqueio_critico' ? (
                            <Ban className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
                          ) : realtimeAudit.anomaly_level === 'alerta_amarelo' ? (
                            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                          ) : (
                            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
                          )}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider">
                                {realtimeAudit.anomaly_level === 'bloqueio_critico'
                                  ? '🔴 BLOQUEIO CRÍTICO DE AUDITORIA'
                                  : realtimeAudit.anomaly_level === 'alerta_amarelo'
                                  ? '🟡 ALERTA DE CONSUMO MODERADO'
                                  : '🟢 CONSUMO CONFORME E DENTRO DA META'}
                              </span>
                              <span className="text-xs font-mono font-bold">
                                {realtimeAudit.calculated_km_per_liter} km/l (Meta: {realtimeAudit.expected_consumption} km/l)
                              </span>
                            </div>
                            <p className="text-xs">
                              {realtimeAudit.anomaly_reason || `Distância percorrida de ${realtimeAudit.delta_km} km com variação aceitável de ${realtimeAudit.deviation_percent}%.`}
                            </p>
                          </div>
                        </div>

                        {/* Justificativa caso amarelo */}
                        {realtimeAudit.anomaly_level === 'alerta_amarelo' && (
                          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                            <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                              Justificativa Operacional do Fiscal (Obrigatória):
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Trecho rural de serra com barro / transporte de carga pesada..."
                              value={justificationInput}
                              onChange={(e) => setJustificationInput(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 text-xs font-medium text-neutral-900 dark:text-white"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* COMPROVAÇÃO COM FOTOS (CÂMERA DO SMARTPHONE) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* FOTO DO PAINEL */}
                      <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-4 text-center hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                        <Camera className="mx-auto text-neutral-400 mb-2" size={24} />
                        <span className="text-xs font-bold block text-neutral-700 dark:text-neutral-300">
                          Foto do Odômetro no Painel
                        </span>
                        <span className="text-[10px] text-neutral-500 block mb-3">
                          Tire uma foto nítida do KM atual
                        </span>
                        {odometerPreview ? (
                          <div className="relative inline-block">
                            <img src={odometerPreview} alt="Preview Painel" className="h-28 rounded-lg object-cover mx-auto" />
                            <button
                              type="button"
                              onClick={() => { setOdometerPhoto(null); setOdometerPreview(null); }}
                              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 dark:bg-neutral-700 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-neutral-900">
                            <Camera size={14} />
                            Capturar Foto do Painel
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleOdometerFile(e.target.files[0])}
                            />
                          </label>
                        )}
                      </div>

                      {/* FOTO DO CANHOTO ASSINADO */}
                      <div className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-4 text-center hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                        <FileText className="mx-auto text-neutral-400 mb-2" size={24} />
                        <span className="text-xs font-bold block text-neutral-700 dark:text-neutral-300">
                          Foto do Canhoto Assinado
                        </span>
                        <span className="text-[10px] text-neutral-500 block mb-3">
                          Foto do papel físico assinado por ambos
                        </span>
                        {receiptPreview ? (
                          <div className="relative inline-block">
                            <img src={receiptPreview} alt="Preview Canhoto" className="h-28 rounded-lg object-cover mx-auto" />
                            <button
                              type="button"
                              onClick={() => { setReceiptPhoto(null); setReceiptPreview(null); }}
                              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 dark:bg-neutral-700 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-neutral-900">
                            <Upload size={14} />
                            Fotografar Canhoto Assinado
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleReceiptFile(e.target.files[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* BOTÃO FINAL DE CONFIRMAÇÃO */}
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={handleCompleteOrder}
                        disabled={submitting || !currentOdometerInput}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer ${
                          realtimeAudit?.anomaly_level === 'bloqueio_critico'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        } disabled:opacity-50`}
                      >
                        {submitting ? (
                          <RefreshCw className="animate-spin" size={18} />
                        ) : (
                          <Check size={18} />
                        )}
                        {realtimeAudit?.anomaly_level === 'bloqueio_critico'
                          ? 'Confirmar Baixa com Bloqueio de Pagamento (Glosa)'
                          : 'Confirmar Fornecimento & Registrar Baixa Digital'}
                      </button>
                    </div>
                  </div>
                )}

                {/* VISUALIZAÇÃO SE JÁ FORNECIDO / FINALIZADO */}
                {order.status !== 'autorizado_pendente' && (
                  <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6 space-y-4">
                    <h3 className="text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      Dados do Fornecimento Concluído
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <span className="text-[10px] text-neutral-500 block font-bold">KM Registrado</span>
                        <span className="text-sm font-black font-mono">{order.current_odometer} km</span>
                      </div>
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <span className="text-[10px] text-neutral-500 block font-bold">Consumo Apurado</span>
                        <span className="text-sm font-black font-mono">{order.calculated_km_per_liter || '-'} km/l</span>
                      </div>
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <span className="text-[10px] text-neutral-500 block font-bold">Litragem Fornecida</span>
                        <span className="text-sm font-black font-mono">{order.liters_supplied} L</span>
                      </div>
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <span className="text-[10px] text-neutral-500 block font-bold">Cupom Fiscal</span>
                        <span className="text-sm font-black font-mono">{order.invoice_coupon_number || 'Sem cupom'}</span>
                      </div>
                    </div>

                    {/* Exibição de comprovantes se existirem */}
                    {(order.odometer_photo_url || order.receipt_photo_url) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {order.odometer_photo_url && (
                          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-center">
                            <span className="text-[10px] font-bold text-neutral-500 block mb-2">Comprovante do Odômetro</span>
                            <img src={order.odometer_photo_url} alt="Odômetro" className="h-40 rounded-lg object-cover mx-auto" />
                          </div>
                        )}
                        {order.receipt_photo_url && (
                          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-center">
                            <span className="text-[10px] font-bold text-neutral-500 block mb-2">Canhoto Assinado</span>
                            <img src={order.receipt_photo_url} alt="Canhoto" className="h-40 rounded-lg object-cover mx-auto" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

