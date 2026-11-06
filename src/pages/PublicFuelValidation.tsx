/**
 * Portal Público e Mobile de Validação de Abastecimento de Frotas
 * Arquivo: src/pages/PublicFuelValidation.tsx
 * Sistema GESTÃO 360 - Acessível via leitura de QR Code no Canhoto
 * Interface simples, resiliente e mobile-first para o motorista/frentista no ato do abastecimento na bomba.
 * Sem exigência de Nota Fiscal (apenas Foto da Bomba, Foto do Odômetro, KM e Litros).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Fuel, Camera, CheckCircle2, RefreshCw,
  Car, User, Gauge, ShieldCheck, Check, RotateCcw, AlertCircle,
  Sun, Moon, Search, X, Edit3, FileText
} from 'lucide-react';
import {
  TwoWayFuelOrder,
  getFuelAuthorizationByNumber,
  validateAndCompleteFuelOrder,
  uploadFuelDocumentPhoto,
  compressFuelPhoto,
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

interface PumpDraftData {
  driverName?: string;
  vehiclePlate?: string;
  currentKmFormatted?: string;
  litersSupplied?: string;
  pumpPhotoPreview?: string | null;
  odometerPhotoPreview?: string | null;
}

const DRAFT_PREFIX = 'gestao360_pump_draft_';

function dataUrlToJpegFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [isEditing, setIsEditing] = useState(false);
  const [customOrderNumber, setCustomOrderNumber] = useState('');

  // Campos do Formulário do Motorista
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [currentKmFormatted, setCurrentKmFormatted] = useState('');
  const [litersSupplied, setLitersSupplied] = useState<string>('');

  // Fotos compactadas em memória leve (evita estouro de memória em celulares Android/iOS)
  const [pumpPhoto, setPumpPhoto] = useState<File | null>(null);
  const [pumpPhotoPreview, setPumpPhotoPreview] = useState<string | null>(null);
  const [processingPump, setProcessingPump] = useState(false);

  const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
  const [odometerPhotoPreview, setOdometerPhotoPreview] = useState<string | null>(null);
  const [processingOdometer, setProcessingOdometer] = useState(false);

  // Câmera ao vivo integrada no navegador (fallback universal caso WebView bloqueie input file)
  const [liveCameraTarget, setLiveCameraTarget] = useState<'pump' | 'odometer' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string>('');
  const [successResult, setSuccessResult] = useState<{ order: TwoWayFuelOrder; audit: ConsumptionAuditCalculation } | null>(null);

  // Ordens recentes emitidas no dispositivo
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

  // Limpa câmera ao vivo ao desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Salva rascunho automático em sessionStorage para sobreviver a recarregamentos da câmera no celular
  useEffect(() => {
    if (!order || order.status === 'abastecido' || order.status === 'auditado') return;
    try {
      const draft: PumpDraftData = {
        driverName,
        vehiclePlate,
        currentKmFormatted,
        litersSupplied,
        pumpPhotoPreview,
        odometerPhotoPreview
      };
      sessionStorage.setItem(`${DRAFT_PREFIX}${order.order_number}`, JSON.stringify(draft));
    } catch {
      // Ignora caso sessionStorage esteja cheio
    }
  }, [order, driverName, vehiclePlate, currentKmFormatted, litersSupplied, pumpPhotoPreview, odometerPhotoPreview]);

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

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

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

    const ignoredRoutes = ['validar-abastecimento', 'validar-combustivel', 'valida-abastecimento', 'validar'];
    if (ignoredRoutes.includes(clean.toLowerCase())) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessResult(null);
    setIsEditing(false);

    try {
      const result = await getFuelAuthorizationByNumber(clean);
      if (result) {
        setOrder(result);
        setCustomOrderNumber(result.order_number || '');
        const isTopOff = result.supply_mode === 'encher_tanque' || !!result.is_full_tank_order;
        const defaultDriver = result.driver_name || '';
        const defaultPlate = result.vehicle?.plate || '';
        const defaultLiters = isTopOff ? '' : String(result.liters_authorized);
        const defaultKm =
          (result.status === 'abastecido' || result.status === 'auditado') && result.current_odometer
            ? formatThousands(result.current_odometer)
            : result.current_odometer && result.current_odometer > result.previous_odometer
              ? formatThousands(result.current_odometer)
              : '';

        // Tenta restaurar rascunho de fotos caso o Android/iOS tenha recarregado a aba ao abrir a câmera
        let restored = false;
        if (result.status !== 'abastecido' && result.status !== 'auditado') {
          try {
            const rawDraft = sessionStorage.getItem(`${DRAFT_PREFIX}${result.order_number}`);
            if (rawDraft) {
              const draft = JSON.parse(rawDraft) as PumpDraftData;
              setDriverName(draft.driverName || defaultDriver);
              setVehiclePlate(draft.vehiclePlate || defaultPlate);
              setLitersSupplied(draft.litersSupplied ?? defaultLiters);
              setCurrentKmFormatted(draft.currentKmFormatted ?? defaultKm);
              if (draft.pumpPhotoPreview) {
                setPumpPhotoPreview(draft.pumpPhotoPreview);
                setPumpPhoto(dataUrlToJpegFile(draft.pumpPhotoPreview, 'bomba.jpg'));
              }
              if (draft.odometerPhotoPreview) {
                setOdometerPhotoPreview(draft.odometerPhotoPreview);
                setOdometerPhoto(dataUrlToJpegFile(draft.odometerPhotoPreview, 'odometro.jpg'));
              }
              restored = true;
            }
          } catch {}
        }

        if (!restored) {
          setDriverName(defaultDriver);
          setVehiclePlate(defaultPlate);
          setLitersSupplied(defaultLiters);
          setCurrentKmFormatted(defaultKm);
          setPumpPhoto(null);
          setPumpPhotoPreview(null);
          setOdometerPhoto(null);
          setOdometerPhotoPreview(null);
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

  const isAcceptableImageFile = (file: File) => {
    if (!file.type) return true; // Câmeras mobile frequentemente enviam type=""
    if (file.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name || '');
  };

  const processCapturedFile = async (file: File, target: 'pump' | 'odometer') => {
    if (!isAcceptableImageFile(file)) {
      showToast('Formato inválido. Fotografe com a câmera ou selecione uma imagem.', 'error');
      return;
    }

    if (target === 'pump') setProcessingPump(true);
    else setProcessingOdometer(true);

    try {
      const compressed = await compressFuelPhoto(file);
      const previewUrl = await fileToDataUrl(compressed);

      if (target === 'pump') {
        setPumpPhoto(compressed);
        setPumpPhotoPreview(previewUrl);
        showToast('Foto da bomba registrada com sucesso!', 'success');
      } else {
        setOdometerPhoto(compressed);
        setOdometerPhotoPreview(previewUrl);
        showToast('Foto do painel/odômetro registrada com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      showToast('Não foi possível ler a foto. Tente novamente.', 'error');
    } finally {
      if (target === 'pump') setProcessingPump(false);
      else setProcessingOdometer(false);
    }
  };

  // Câmera ao vivo integrada na tela do navegador (WebRTC direto)
  const openLiveBrowserCamera = async (target: 'pump' | 'odometer') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Seu navegador não possui suporte para câmera ao vivo na tela.', 'error');
      return;
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
      streamRef.current = stream;
      setLiveCameraTarget(target);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: unknown) {
      console.warn('Permissão de câmera negada ou erro:', err);
      const isDenied = err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      if (isDenied) {
        showToast('Permissão de acesso à câmera negada. Autorize o uso da câmera nas configurações do navegador.', 'error');
      } else {
        showToast('Não foi possível iniciar a câmera na tela. Verifique as permissões do dispositivo.', 'error');
      }
    }
  };

  const closeLiveBrowserCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setLiveCameraTarget(null);
  };

  const snapLiveBrowserPhoto = async () => {
    if (!videoRef.current || !liveCameraTarget) return;
    const video = videoRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 960;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, w, h);

    const target = liveCameraTarget;
    closeLiveBrowserCamera();

    canvas.toBlob(async (blob) => {
      if (blob) {
        const snapFile = new File([blob], `${target}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await processCapturedFile(snapFile, target);
      }
    }, 'image/jpeg', 0.85);
  };

  const handleStartEditing = () => {
    if (!order) return;
    setCustomOrderNumber(order.order_number || '');
    setDriverName(order.driver_name || '');
    setVehiclePlate(order.vehicle?.plate || '');
    setCurrentKmFormatted(order.current_odometer ? formatThousands(order.current_odometer) : '');
    setLitersSupplied(order.liters_supplied ? String(order.liters_supplied) : '');
    setPumpPhotoPreview(order.pump_photo_url || null);
    setOdometerPhotoPreview(order.odometer_photo_url || null);
    setPumpPhoto(null);
    setOdometerPhoto(null);
    setIsEditing(true);
  };

  // Envio final para o Gestor de Frotas
  const handleSubmitSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    // 1. Validação da Foto da Bomba
    let effectivePumpFile: File | null = pumpPhoto;
    if (!effectivePumpFile && pumpPhotoPreview && pumpPhotoPreview.startsWith('data:')) {
      effectivePumpFile = dataUrlToJpegFile(pumpPhotoPreview, 'bomba.jpg');
    }
    if (!effectivePumpFile && !order.pump_photo_url && !pumpPhotoPreview) {
      showToast('A foto do visor da bomba de combustível é obrigatória!', 'warning');
      return;
    }

    // 2. Validação da Foto do Odômetro
    let effectiveOdometerFile: File | null = odometerPhoto;
    if (!effectiveOdometerFile && odometerPhotoPreview && odometerPhotoPreview.startsWith('data:')) {
      effectiveOdometerFile = dataUrlToJpegFile(odometerPhotoPreview, 'odometro.jpg');
    }
    if (!effectiveOdometerFile && !order.odometer_photo_url && !odometerPhotoPreview) {
      showToast('A foto do painel/odômetro do veículo é obrigatória!', 'warning');
      return;
    }

    // 3. Validação da Quilometragem / Horímetro
    const kmNumber = parseThousands(currentKmFormatted);
    if (isNaN(kmNumber) || kmNumber <= 0) {
      showToast('Informe a leitura atual do painel do veículo.', 'error');
      return;
    }

    if (kmNumber < order.previous_odometer) {
      showToast(`A leitura atual (${formatThousands(kmNumber)}) não pode ser menor que a leitura anterior (${formatThousands(order.previous_odometer)}).`, 'error');
      return;
    }

    // 4. Validação dos Litros
    const litersNumber = parseFloat(litersSupplied.replace(',', '.'));
    if (isNaN(litersNumber) || litersNumber <= 0) {
      showToast('Informe a quantidade de litros abastecidos no visor da bomba.', 'error');
      return;
    }

    if (order.vehicle?.tank_capacity && litersNumber > order.vehicle.tank_capacity * 1.15) {
      showToast(`A litragem informada (${litersNumber}L) excede a capacidade máxima do tanque (${order.vehicle.tank_capacity}L).`, 'error');
      return;
    }

    // 5. Validação do Nome do Motorista
    if (!driverName.trim()) {
      showToast('Informe o nome do motorista/condutor.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedPumpUrl = order.pump_photo_url;
      if (effectivePumpFile) {
        setSubmitStep('Enviando foto da bomba...');
        uploadedPumpUrl = await uploadFuelDocumentPhoto(effectivePumpFile, 'pumps');
      } else if (pumpPhotoPreview && pumpPhotoPreview.startsWith('http')) {
        uploadedPumpUrl = pumpPhotoPreview;
      }

      let uploadedOdometerUrl = order.odometer_photo_url;
      if (effectiveOdometerFile) {
        setSubmitStep('Enviando foto do odômetro...');
        uploadedOdometerUrl = await uploadFuelDocumentPhoto(effectiveOdometerFile, 'odometers');
      } else if (odometerPhotoPreview && odometerPhotoPreview.startsWith('http')) {
        uploadedOdometerUrl = odometerPhotoPreview;
      }

      setSubmitStep('Registrando abastecimento no painel do gestor...');
      const result = await validateAndCompleteFuelOrder(order.id, {
        current_odometer: kmNumber,
        liters_supplied: litersNumber,
        pump_photo_url: uploadedPumpUrl,
        odometer_photo_url: uploadedOdometerUrl,
        driver_name: driverName.trim(),
        vehicle_plate: vehiclePlate.trim().toUpperCase(),
        custom_order_number: customOrderNumber.trim() || undefined
      });

      setIsEditing(false);
      try {
        sessionStorage.removeItem(`${DRAFT_PREFIX}${order.order_number}`);
      } catch {}

      setOrder(result.order);
      setSuccessResult(result);
      showToast(isEditing ? 'Abastecimento corrigido e salvo com sucesso!' : 'Abastecimento e fotos enviados com sucesso! O gestor de frotas foi notificado.', 'success');
    } catch (err: unknown) {
      console.error('Erro ao registrar abastecimento:', err);
      const message = err instanceof Error ? err.message : 'Falha ao transmitir as fotos e dados.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
      setSubmitStep('');
    }
  };

  const institutionName = currentInstitution?.name || 'Prefeitura Municipal';
  const isHorimetro = order?.vehicle?.metric_type === 'horimetro';
  const metricUnit = isHorimetro ? 'h' : 'km';

  const hasPumpReady = Boolean(pumpPhotoPreview || order?.pump_photo_url);
  const hasOdoReady = Boolean(odometerPhotoPreview || order?.odometer_photo_url);
  const canSubmit = !submitting && !processingPump && !processingOdometer && hasPumpReady && hasOdoReady && Boolean(currentKmFormatted.trim()) && Boolean(litersSupplied.trim());

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
                className="p-2 rounded-xl text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Alternar tema"
              >
                {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MODAL DE CÂMERA AO VIVO NA TELA (DIRETO NO NAVEGADOR) */}
      {liveCameraTarget && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 safe-area-inset">
          <div className="flex items-center justify-between text-white pt-2">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                {liveCameraTarget === 'pump' ? '1. Foto do Visor da Bomba' : '2. Foto do Painel / Odômetro'}
              </span>
              <h3 className="text-sm font-bold text-neutral-100">
                {liveCameraTarget === 'pump'
                  ? 'Aponte para os litros e valor na bomba'
                  : `Aponte para a quilometragem (${metricUnit}) no painel`}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeLiveBrowserCamera}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="Fechar Câmera"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 my-3 rounded-3xl overflow-hidden bg-neutral-900 flex items-center justify-center border-2 border-white/20 relative shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Moldura guia para o enquadramento */}
            <div className="absolute inset-x-6 inset-y-12 border-2 border-dashed border-amber-400/60 rounded-2xl pointer-events-none flex items-end justify-center pb-3">
              <span className="text-[11px] text-amber-300 font-bold bg-black/60 backdrop-blur-sm px-3.5 py-1 rounded-full shadow">
                {liveCameraTarget === 'pump' ? 'Enquadre os litros e o valor' : 'Enquadre o odômetro no painel'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center pb-4 pt-1">
            <button
              type="button"
              onClick={snapLiveBrowserPhoto}
              className="px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 flex items-center gap-2.5 cursor-pointer transition-all"
            >
              <Camera size={22} />
              <span>Tirar Foto Agora</span>
            </button>
          </div>
        </div>
      )}

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
              As fotos da bomba e do painel do veículo da ordem <span className="font-mono font-bold">{successResult.order.order_number}</span> foram gravadas com sucesso e enviadas ao Gestor de Frotas. Não é necessário anexar nota fiscal.
            </p>

            {/* MINIATURAS DOS COMPROVANTES ENVIADOS */}
            {(successResult.order.pump_photo_url || successResult.order.odometer_photo_url) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {successResult.order.pump_photo_url && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 block">
                      Bomba Comprovada
                    </span>
                    <img
                      src={successResult.order.pump_photo_url}
                      alt="Bomba"
                      className="w-full h-28 object-cover rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm"
                    />
                  </div>
                )}
                {successResult.order.odometer_photo_url && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 block">
                      Odômetro Comprovado
                    </span>
                    <img
                      src={successResult.order.odometer_photo_url}
                      alt="Odômetro"
                      className="w-full h-28 object-cover rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-sm"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 dark:bg-neutral-900/80 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-slate-500 block font-bold">Leitura do Painel</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {formatThousands(successResult.order.current_odometer || 0)} {metricUnit}
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
              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  setOrder(null);
                  setSearchCode('');
                  window.history.replaceState({}, '', '/validar-abastecimento');
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Check size={16} /> Concluir e Validar Outra
              </button>
            </div>
          </div>
        )}

        {/* QUANDO A ORDEM FOI ENCONTRADA */}
        {order && !successResult && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              {/* STATUS BAR */}
              <div className={`p-4 flex items-center justify-between ${
                isEditing
                  ? 'bg-blue-600 text-white'
                  : order.status === 'abastecido' || order.status === 'auditado'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'
              }`}>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Edit3 size={18} />
                  ) : order.status === 'abastecido' || order.status === 'auditado' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Fuel size={18} />
                  )}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block leading-tight">
                      {isEditing
                        ? 'Modo de Edição / Correção'
                        : order.status === 'abastecido' || order.status === 'auditado'
                          ? 'Abastecimento Concluído'
                          : order.supply_mode === 'encher_tanque' || order.is_full_tank_order
                            ? 'Autorização Top-Off (Encher Tanque)'
                            : 'Autorização Válida para Abastecimento'}
                    </span>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold opacity-85">Nº:</span>
                        <input
                          type="text"
                          value={customOrderNumber}
                          onChange={(e) => setCustomOrderNumber(e.target.value.toUpperCase())}
                          placeholder={order.order_number}
                          className="bg-white/20 text-white font-mono font-black text-xs px-2 py-0.5 rounded border border-white/40 focus:bg-white focus:text-blue-900 focus:outline-none w-36 uppercase tracking-wider"
                          title="Alterar número da autorização para coincidir com o talão de papel"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-bold">
                        {order.order_number}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold block uppercase opacity-85">Combustível</span>
                  <span className="text-xs font-black">
                    {formatFuelLabel(order.fuel_type)}
                  </span>
                </div>
              </div>

              {/* POSTO E VEÍCULO */}
              <div className="p-4 bg-slate-50/70 dark:bg-neutral-800/40 border-b border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">Posto Credenciado:</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">{order.station_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-bold">Veículo:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    {order.vehicle?.plate || 'FROTA'}
                  </span>
                </div>
              </div>

              {/* SE JÁ ESTIVER ABASTECIDO ANTERIORMENTE */}
              {((order.status === 'abastecido' || order.status === 'auditado') && !isEditing) ? (
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
                      <span className="text-[10px] text-slate-500 block font-bold">Leitura Registrada</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{formatThousands(order.current_odometer || 0)} {metricUnit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">Litros Fornecidos</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{order.liters_supplied} L</span>
                    </div>
                  </div>

                  {/* COMPROVANTES FOTOGRÁFICOS (BOMBA E ODÔMETRO) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {order.pump_photo_url && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-black uppercase text-slate-500 block">
                          Foto da Bomba Comprovada:
                        </span>
                        <img
                          src={order.pump_photo_url}
                          alt="Comprovante Bomba"
                          className="w-full h-44 object-cover rounded-2xl border border-slate-200 dark:border-neutral-700 shadow-inner"
                        />
                      </div>
                    )}

                    {order.odometer_photo_url && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-black uppercase text-slate-500 block">
                          Foto do Odômetro / Painel:
                        </span>
                        <img
                          src={order.odometer_photo_url}
                          alt="Comprovante Odômetro"
                          className="w-full h-44 object-cover rounded-2xl border border-slate-200 dark:border-neutral-700 shadow-inner"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 space-y-2">
                    {order.status !== 'auditado' && (
                      <button
                        type="button"
                        onClick={handleStartEditing}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <Edit3 size={16} /> Corrigir Dados / Editar Abastecimento
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setOrder(null);
                        setSearchCode('');
                        setErrorMsg(null);
                        setIsEditing(false);
                        window.history.pushState({}, '', '/validar-abastecimento');
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <RotateCcw size={15} /> Consultar Outra Autorização
                    </button>
                  </div>
                </div>
              ) : (
                /* FORMULÁRIO DO MOTORISTA NA BOMBA (SEM EXIGÊNCIA DE NOTA FISCAL) */
                <form onSubmit={handleSubmitSupply} className="p-5 space-y-5">
                  {isEditing ? (
                    <>
                      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200">
                        <Edit3 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <div>
                          <strong className="block">Modo de Correção de Abastecimento</strong>
                          <span className="text-[11px] opacity-80">Ajuste os dados preenchidos incorretamente ou repita as fotos.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline px-2 py-1 cursor-pointer shrink-0"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* NÚMERO DA AUTORIZAÇÃO / TALÃO DE PAPEL (EDITÁVEL) */}
                    <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                          <FileText size={15} className="text-blue-600 dark:text-blue-400" />
                          Número da Autorização / Talão em Papel
                        </label>
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                          Talão Físico
                        </span>
                      </div>
                      <input
                        type="text"
                        value={customOrderNumber}
                        onChange={(e) => setCustomOrderNumber(e.target.value.toUpperCase())}
                        placeholder={order.order_number}
                        className="w-full px-3.5 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-900 text-sm font-mono font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-snug">
                        Altere aqui caso precise manter a sequência original do talão de requisições de papel da prefeitura.
                      </p>
                    </div>
                  </>
                  ) : (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start gap-2.5">
                      <ShieldCheck className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                      <p className="text-xs text-amber-900 dark:text-amber-200 leading-snug">
                        Fotografe apenas o <strong>visor da bomba</strong> e o <strong>painel do veículo</strong>, e informe a leitura e os litros. <strong>Não é necessário anexar nota fiscal.</strong>
                      </p>
                    </div>
                  )}

                  {/* 1. FOTO DO VISOR DA BOMBA */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                      1. Foto do Visor da Bomba *
                    </label>

                    {processingPump ? (
                      <div className="w-full py-8 rounded-3xl border-2 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="animate-spin text-amber-600" size={24} />
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-200">Otimizando foto da bomba...</span>
                      </div>
                    ) : pumpPhotoPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 dark:border-emerald-600 bg-black shadow-md">
                        <img
                          src={pumpPhotoPreview}
                          alt="Foto da Bomba"
                          className="w-full h-52 object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => openLiveBrowserCamera('pump')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-md shadow cursor-pointer transition-colors"
                          >
                            <RotateCcw size={14} /> Tirar Outra Foto
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                          <Check size={12} /> Visor da Bomba Registrado
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openLiveBrowserCamera('pump')}
                        className="w-full py-6 px-4 border-2 border-dashed border-amber-400 dark:border-amber-600 hover:border-amber-500 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 text-center flex flex-col items-center justify-center gap-2 transition-all hover:bg-amber-100/50 active:scale-[0.98] cursor-pointer group shadow-sm"
                      >
                        <div className="w-13 h-13 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                          <Camera size={26} />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase text-amber-900 dark:text-amber-200 block">
                            Abrir Câmera na Tela
                          </span>
                          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 block mt-0.5 font-medium">
                            Toque para fotografar os litros e o valor no visor da bomba
                          </span>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* 2. FOTO DO ODÔMETRO (PAINEL DO VEÍCULO) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                      2. Foto do {isHorimetro ? 'Horímetro' : 'Odômetro'} (Painel do Veículo) *
                    </label>

                    {processingOdometer ? (
                      <div className="w-full py-8 rounded-3xl border-2 border-sky-300 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="animate-spin text-sky-600" size={24} />
                        <span className="text-xs font-bold text-sky-800 dark:text-sky-200">Otimizando foto do painel...</span>
                      </div>
                    ) : odometerPhotoPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 dark:border-emerald-600 bg-black shadow-md">
                        <img
                          src={odometerPhotoPreview}
                          alt="Foto do Odômetro"
                          className="w-full h-52 object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => openLiveBrowserCamera('odometer')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-md shadow cursor-pointer transition-colors"
                          >
                            <RotateCcw size={14} /> Tirar Outra Foto
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                          <Check size={12} /> Painel do Veículo Registrado
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openLiveBrowserCamera('odometer')}
                        className="w-full py-6 px-4 border-2 border-dashed border-sky-400 dark:border-sky-600 hover:border-sky-500 rounded-3xl bg-sky-50/60 dark:bg-sky-950/20 text-center flex flex-col items-center justify-center gap-2 transition-all hover:bg-sky-100/50 active:scale-[0.98] cursor-pointer group shadow-sm"
                      >
                        <div className="w-13 h-13 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/30 group-hover:scale-105 transition-transform">
                          <Gauge size={26} />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase text-sky-900 dark:text-sky-200 block">
                            Abrir Câmera na Tela
                          </span>
                          <span className="text-[11px] text-sky-700/80 dark:text-sky-400/80 block mt-0.5 font-medium">
                            Toque para fotografar a leitura atual visível no painel ({metricUnit})
                          </span>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* 3. QUILOMETRAGEM / HORÍMETRO DIGITADO */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <Gauge size={14} className="text-amber-500" />
                        3. {isHorimetro ? 'Horímetro Atual' : 'Quilometragem Atual (Odômetro)'} *
                      </label>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                        Anterior: {formatThousands(order.previous_odometer)} {metricUnit}
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={`Ex: ${formatThousands((order.previous_odometer || 0) + (isHorimetro ? 10 : 150))}`}
                        value={currentKmFormatted}
                        onChange={(e) => {
                          const num = parseThousands(e.target.value);
                          if (!isNaN(num)) {
                            setCurrentKmFormatted(formatThousands(num));
                          } else {
                            setCurrentKmFormatted('');
                          }
                        }}
                        className="w-full pl-4 pr-14 py-3 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-base font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 font-mono uppercase">
                        {metricUnit}
                      </span>
                    </div>
                  </div>

                  {/* 4. PLACA E LITROS ABASTECIDOS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <Car size={14} className="text-amber-500" />
                        Placa do Veículo
                      </label>
                      <input
                        type="text"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                        placeholder="Ex: CAR-2026"
                        className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-mono font-bold uppercase text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                        <Fuel size={14} className="text-amber-500" />
                        4. Litros Abastecidos *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={litersSupplied}
                          onChange={(e) => setLitersSupplied(e.target.value)}
                          placeholder={order?.supply_mode === 'encher_tanque' || order?.is_full_tank_order ? 'Litros no visor da bomba' : 'Ex: 50.00'}
                          className="w-full pl-4 pr-10 py-2.5 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 font-mono">
                          L
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5. NOME DO MOTORISTA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <User size={14} className="text-amber-500" />
                      5. Nome do Motorista / Condutor *
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
                      disabled={!canSubmit}
                      className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="animate-spin" size={20} />
                          <span>{submitStep || 'Transmitindo ao Gestor...'}</span>
                        </>
                      ) : isEditing ? (
                        <>
                          <Check size={20} />
                          <span>Salvar Correções do Abastecimento</span>
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          <span>Confirmar e Enviar Fotos ao Gestor</span>
                        </>
                      )}
                    </button>

                    {!submitting && !canSubmit && (
                      <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-bold mt-2">
                        {!hasPumpReady
                          ? '* Tire ou escolha a 1ª foto (Visor da Bomba)'
                          : !hasOdoReady
                            ? '* Tire ou escolha a 2ª foto (Painel / Odômetro)'
                            : !currentKmFormatted.trim()
                              ? `* Informe a leitura atual (${metricUnit}) do painel`
                              : '* Informe os litros abastecidos na bomba'}
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
