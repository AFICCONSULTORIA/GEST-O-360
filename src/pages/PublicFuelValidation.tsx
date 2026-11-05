/**
 * Portal Público e Mobile de Validação de Abastecimento de Frotas
 * Arquivo: src/pages/PublicFuelValidation.tsx
 * Sistema GESTÃO 360 - Acessível via leitura de QR Code no Canhoto
 * Interface simples e mobile-first para o motorista no ato do abastecimento na bomba
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Fuel, Camera, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, 
  Car, User, Gauge, ShieldCheck, Check, RotateCcw, AlertCircle,
  Building2, Sun, Moon, Search
} from 'lucide-react';
import { 
  TwoWayFuelOrder, 
  getFuelAuthorizationByNumber, 
  validateAndCompleteFuelOrder, 
  uploadFuelDocumentPhoto,
  ConsumptionAuditCalculation 
} from '../lib/api/fleetFuelAudit';
import { formatFuelLabel } from '../modules/Controls/components/FuelAuthorizationVoucherPDF';
import { formatThousands, parseThousands } from '../lib/masks';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos do Formulário do Motorista
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [currentKmFormatted, setCurrentKmFormatted] = useState('');
  const [litersSupplied, setLitersSupplied] = useState<string>('');
  
  // Foto da Bomba (Câmera ao vivo sem salvar no telefone)
  const [pumpPhoto, setPumpPhoto] = useState<File | null>(null);
  const [pumpPhotoPreview, setPumpPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ order: TwoWayFuelOrder; audit: ConsumptionAuditCalculation } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Ordens recentes emitidas no dispositivo (para teste rápido ou conferência)
  const recentOrders = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('gestao360_real_orders');
      if (raw) {
        const list = JSON.parse(raw) as TwoWayFuelOrder[];
        return list.filter(o => 
          o && 
          o.order_number !== 'AUT-2026-0001' && 
          o.anomaly_reason !== 'CANCELADO_EXCLUIDO' && 
          o.status !== 'cancelado'
        ).slice(0, 3);
      }
    } catch {}
    return [];
  }, []);

  // Leitura automática da URL ao carregar via QR Code (?order=AUT-2026-XXXX)
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
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    
    // Ignorar nomes de rotas para evitar buscas falsas na inicialização
    const ignoredRoutes = ['validar-abastecimento', 'validar-combustivel', 'valida-abastecimento', 'validar'];
    if (lastPart && !ignoredRoutes.includes(lastPart.toLowerCase())) {
      if (lastPart.toUpperCase().startsWith('AUT-') || lastPart.toUpperCase().startsWith('ABAST-') || lastPart.length >= 8) {
        const clean = lastPart.trim();
        setSearchCode(clean);
        handleSearch(clean);
      }
    }
  }, []);

  const handleSearch = async (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean) return;

    // Se for o próprio nome da rota, não executa busca
    const ignoredRoutes = ['validar-abastecimento', 'validar-combustivel', 'valida-abastecimento', 'validar'];
    if (ignoredRoutes.includes(clean.toLowerCase())) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessResult(null);

    try {
      const result = await getFuelAuthorizationByNumber(clean);
      if (result) {
        setOrder(result);
        setDriverName(result.driver_name || '');
        setVehiclePlate(result.vehicle?.plate || '');
        setLitersSupplied(String(result.liters_authorized));
        if (result.current_odometer && result.current_odometer > 0) {
          setCurrentKmFormatted(formatThousands(result.current_odometer));
        } else {
          setCurrentKmFormatted('');
        }
      } else {
        setOrder(null);
        setErrorMsg(`Autorização nº "${clean}" não foi encontrada no sistema. Verifique o número digitado ou a placa do veículo.`);
        if (typeof window !== 'undefined' && window.location.pathname.includes(clean)) {
          window.history.replaceState({}, '', '/validar-abastecimento');
        }
      }
    } catch (err: unknown) {
      console.error('Erro ao consultar autorização:', err);
      const message = err instanceof Error ? err.message : 'Falha na conexão com o servidor municipal.';
      setErrorMsg(message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // Captura direta da foto da bomba via câmera
  const handleCapturePumpPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, fotografe diretamente a bomba de combustível.', 'error');
      return;
    }

    setPumpPhoto(file);

    // Carrega em memória temporária (FileReader) para preview seguro sem salvar no telefone
    const reader = new FileReader();
    reader.onload = () => {
      setPumpPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRetakePhoto = () => {
    setPumpPhoto(null);
    setPumpPhotoPreview(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  // Envio final para o Gestor de Frotas
  const handleSubmitSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    // 1. Validação da Foto da Bomba
    if (!pumpPhoto && !order.pump_photo_url) {
      showToast('A foto da bomba de combustível é obrigatória!', 'warning');
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
      return;
    }

    // 2. Validação da Quilometragem
    const kmNumber = parseThousands(currentKmFormatted);
    if (isNaN(kmNumber) || kmNumber <= 0) {
      showToast('Informe a quilometragem atual do odômetro no painel.', 'error');
      return;
    }

    if (kmNumber < order.previous_odometer) {
      showToast(`O odômetro atual (${formatThousands(kmNumber)} km) não pode ser inferior ao odômetro anterior (${formatThousands(order.previous_odometer)} km).`, 'error');
      return;
    }

    // 3. Validação dos Litros
    const litersNumber = parseFloat(litersSupplied.replace(',', '.'));
    if (isNaN(litersNumber) || litersNumber <= 0) {
      showToast('Informe a quantidade de litros abastecidos.', 'error');
      return;
    }

    if (order.vehicle?.tank_capacity && litersNumber > order.vehicle.tank_capacity) {
      showToast(`A litragem informada (${litersNumber}L) excede a capacidade do tanque (${order.vehicle.tank_capacity}L).`, 'error');
      return;
    }

    // 4. Validação do Nome do Motorista e Placa
    if (!driverName.trim()) {
      showToast('Informe o nome do motorista.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedPumpUrl = order.pump_photo_url;
      if (pumpPhoto) {
        uploadedPumpUrl = await uploadFuelDocumentPhoto(pumpPhoto, 'pumps');
      }

      const result = await validateAndCompleteFuelOrder(order.id, {
        current_odometer: kmNumber,
        liters_supplied: litersNumber,
        pump_photo_url: uploadedPumpUrl,
        driver_name: driverName.trim(),
        vehicle_plate: vehiclePlate.trim().toUpperCase()
      });

      setOrder(result.order);
      setSuccessResult(result);
      showToast('Abastecimento registrado com sucesso! O gestor de frotas foi notificado.', 'success');
    } catch (err: unknown) {
      console.error('Erro ao registrar abastecimento:', err);
      const message = err instanceof Error ? err.message : 'Falha ao transmitir os dados.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const institutionName = currentInstitution?.name || 'Prefeitura Municipal';

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-900'} font-sans flex flex-col transition-colors duration-200`}>
      {/* CABEÇALHO COMPACTO E RESPONSIVO */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/95 dark:bg-neutral-900/95 border-b border-slate-200 dark:border-neutral-800 shadow-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20 font-black">
              <Fuel size={20} />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-tight leading-tight uppercase text-slate-900 dark:text-white">
                Abastecimento na Bomba
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium">
                {institutionName} • Gestão de Frotas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {setDarkMode && (
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                title="Alternar tema"
              >
                {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL MOBILE */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        {/* PESQUISA OU IDENTIFICAÇÃO MANUAL CASO NECESSÁRIO */}
        {!order && !loading && (
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-neutral-200">
              <Search size={18} className="text-amber-500" />
              <h2 className="text-xs font-black uppercase tracking-wider">
                Consultar Autorização Digital
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Aponte a câmera para o QR Code do canhoto ou digite o número da autorização:
            </p>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchCode);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Ex: AUT-2026-0001"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !searchCode.trim()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs uppercase rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                Localizar
              </button>
            </form>

            {recentOrders.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-neutral-500 block mb-1.5">
                  Ordens Recentes Emitidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recentOrders.map(ro => (
                    <button
                      key={ro.id}
                      type="button"
                      onClick={() => {
                        setSearchCode(ro.order_number);
                        handleSearch(ro.order_number);
                      }}
                      className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg cursor-pointer transition-colors"
                    >
                      {ro.order_number} {ro.vehicle?.plate ? `• ${ro.vehicle.plate}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-sm space-y-2">
            <RefreshCw className="animate-spin text-amber-500 mx-auto" size={28} />
            <p className="text-xs font-bold text-slate-600 dark:text-neutral-300">
              Carregando dados da autorização oficial...
            </p>
          </div>
        )}

        {/* FEEDBACK DE ERRO */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
            <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="text-xs font-black text-rose-800 dark:text-rose-300">
                Não Foi Possível Validar
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                {errorMsg}
              </p>
            </div>
          </div>
        )}

        {/* SUCESSO APÓS BAIXA ENVIADA AO GESTOR */}
        {successResult && (
          <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Confirmação em Tempo Real
                </span>
                <h2 className="text-base font-black leading-tight">
                  Abastecimento Transmitido!
                </h2>
              </div>
            </div>

            <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              Os dados e a foto da bomba da ordem <span className="font-mono font-bold">{successResult.order.order_number}</span> foram recebidos pelo Gestor de Frotas e liquidados com carimbo de autenticidade.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 dark:bg-neutral-900/80 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-slate-500 block font-bold">KM do Painel</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {formatThousands(successResult.order.current_odometer || 0)} km
                </span>
              </div>
              <div className="bg-white/80 dark:bg-neutral-900/80 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-slate-500 block font-bold">Litros Registrados</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {successResult.order.liters_supplied} L
                </span>
              </div>
              <div className="bg-white/80 dark:bg-neutral-900/80 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 col-span-2">
                <span className="text-[10px] text-slate-500 block font-bold">Motorista / Condutor</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {successResult.order.driver_name}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="/"
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm"
              >
                <Check size={16} /> Concluir e Sair
              </a>
            </div>
          </div>
        )}

        {/* QUANDO A ORDEM FOI ENCONTRADA */}
        {order && !successResult && (
          <div className="space-y-4">
            {/* CARTÃO RESUMO DA AUTORIZAÇÃO */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              {/* STATUS BAR */}
              <div className={`p-4 flex items-center justify-between ${
                order.status === 'abastecido' || order.status === 'auditado'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                <div className="flex items-center gap-2">
                  {order.status === 'abastecido' || order.status === 'auditado' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Fuel size={18} />
                  )}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block leading-tight">
                      {order.status === 'abastecido' || order.status === 'auditado'
                        ? 'Abastecimento Concluído'
                        : order.supply_mode === 'encher_tanque'
                        ? 'Autorização Top-Off (Encher Tanque)'
                        : 'Autorização Válida para Abastecimento'}
                    </span>
                    <span className="text-xs font-mono font-bold">
                      {order.order_number}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold block uppercase opacity-85">Combustível</span>
                  <span className="text-xs font-black">
                    {formatFuelLabel(order.fuel_type)}
                  </span>
                </div>
              </div>

              {/* POSTO E PREÇO CONTRATUAL */}
              <div className="p-4 bg-slate-50/70 dark:bg-neutral-800/40 border-b border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">Posto Credenciado:</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">{order.station_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-bold">Preço Contratual:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">R$ {Number(order.bidded_unit_price).toFixed(3)}/L</span>
                </div>
              </div>

              {/* SE JÁ ESTIVER ABASTECIDO ANTERIORMENTE */}
              {(order.status === 'abastecido' || order.status === 'auditado') ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Esta autorização já foi fornecida
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                      O lançamento na bomba já foi confirmado em {order.supplied_at ? new Date(order.supplied_at).toLocaleString('pt-BR') : 'data anterior'}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left bg-slate-50 dark:bg-neutral-800/60 p-4 rounded-2xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">Motorista</span>
                      <span className="font-bold text-slate-900 dark:text-white">{order.driver_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">Placa</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{order.vehicle?.plate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">Odômetro Registrado</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{formatThousands(order.current_odometer || 0)} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">Litros Fornecidos</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{order.liters_supplied} L</span>
                    </div>
                  </div>

                  {order.pump_photo_url && (
                    <div className="space-y-1.5 text-left">
                      <span className="text-[11px] font-black uppercase text-slate-500 block">
                        Foto da Bomba Comprovada:
                      </span>
                      <img 
                        src={order.pump_photo_url} 
                        alt="Comprovante Bomba" 
                        className="w-full h-48 object-cover rounded-2xl border border-slate-200 dark:border-neutral-700 shadow-inner"
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrder(null);
                        setSearchCode('');
                        setErrorMsg(null);
                        window.history.pushState({}, '', '/validar-abastecimento');
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <RotateCcw size={15} /> Consultar Outra Autorização
                    </button>
                  </div>
                </div>
              ) : (
                /* FORMULÁRIO DO MOTORISTA NA BOMBA */
                <form onSubmit={handleSubmitSupply} className="p-5 space-y-5">
                  {/* INSTRUÇÃO RÁPIDA */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start gap-2.5">
                    <ShieldCheck className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-snug">
                      Tire a foto da bomba no ato do abastecimento e confirme o odômetro atual. Os dados serão transmitidos instantaneamente para a fiscalização da Prefeitura.
                    </p>
                  </div>

                  {/* 1. FOTO DA BOMBA DE COMBUSTÍVEL (CÂMERA DIRETA) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                      1. Foto da Bomba de Combustível *
                    </label>

                    {/* Input nativo com capture="environment" que força a abertura da câmera no smartphone e não galeria */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleCapturePumpPhoto}
                    />

                    {pumpPhotoPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 dark:border-emerald-600 bg-black shadow-md">
                        <img
                          src={pumpPhotoPreview}
                          alt="Foto da Bomba"
                          className="w-full h-56 object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={handleRetakePhoto}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-md shadow cursor-pointer transition-colors"
                          >
                            <RotateCcw size={14} /> Tirar Outra
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                          <Check size={12} /> Foto Registrada na Bomba
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full py-8 px-4 border-2 border-dashed border-amber-400 dark:border-amber-600 hover:border-amber-500 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 text-center flex flex-col items-center justify-center gap-2.5 transition-all hover:bg-amber-100/50 active:scale-[0.98] cursor-pointer group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                          <Camera size={28} />
                        </div>
                        <div>
                          <span className="text-sm font-black uppercase text-amber-900 dark:text-amber-200 block">
                            Abrir Câmera e Fotografar Bomba
                          </span>
                          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 block mt-0.5">
                            Mostre no visor a litragem e o valor total
                          </span>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* 2. QUILOMETRAGEM (ODÔMETRO ATUAL DO PAINEL) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <Gauge size={14} className="text-amber-500" />
                        2. Quilometragem Atual (Painel) *
                      </label>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                        Último: {formatThousands(order.previous_odometer)} km
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Ex: 45.280"
                        value={currentKmFormatted}
                        onChange={(e) => {
                          const num = parseThousands(e.target.value);
                          if (!isNaN(num)) {
                            setCurrentKmFormatted(formatThousands(num));
                          } else {
                            setCurrentKmFormatted('');
                          }
                        }}
                        className="w-full pl-4 pr-12 py-3 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-base font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 font-mono">
                        KM
                      </span>
                    </div>
                  </div>

                  {/* 3. PLACA DO VEÍCULO E NOME DO MOTORISTA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* PLACA */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <Car size={14} className="text-amber-500" />
                        3. Placa do Veículo
                      </label>
                      <input
                        type="text"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                        placeholder="Ex: CAR-2026"
                        className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-mono font-bold uppercase text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* LITRAGEM FORNECIDA */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <Fuel size={14} className="text-amber-500" />
                        Litros Abastecidos *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={litersSupplied}
                          onChange={(e) => setLitersSupplied(e.target.value)}
                          placeholder="Ex: 50.00"
                          className="w-full pl-4 pr-10 py-2.5 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 font-mono">
                          L
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* NOME DO MOTORISTA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <User size={14} className="text-amber-500" />
                      4. Nome do Motorista / Condutor *
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Nome completo do condutor"
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* BOTÃO PRINCIPAL DE ENVIO */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={submitting || !pumpPhotoPreview || !currentKmFormatted.trim()}
                      className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="animate-spin" size={20} />
                          <span>Transmitindo ao Gestor de Frotas...</span>
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          <span>Confirmar e Enviar ao Gestor</span>
                        </>
                      )}
                    </button>
                    {!pumpPhotoPreview && (
                      <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-bold mt-2">
                        * Tire a foto da bomba para habilitar o envio
                      </p>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
