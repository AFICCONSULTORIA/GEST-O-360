import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, FileSpreadsheet, Download, Upload, CheckCircle2,
  AlertTriangle, Calendar, User, Gauge, Fuel, Check, RefreshCw,
  Search, ShieldCheck, Car, HelpCircle, ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  FleetVehicle, FuelType, FleetDriver, FleetFuelStation
} from '../../../lib/api/fleetFuel';
import {
  BiddedPricesMap,
  DEFAULT_BIDDED_PRICES,
  LegacyVoucherPayload,
  registerLegacyFuelOrder,
  registerLegacyFuelOrdersBatch,
  generateLegacyVouchersExcelTemplate,
  uploadFuelDocumentPhoto,
  parseExcelDate
} from '../../../lib/api/fleetFuelAudit';
import { formatThousands } from '../../../lib/masks';
import { showToast } from '../../../components/ui/Toast';

interface LegacyVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: FleetVehicle[];
  drivers: FleetDriver[];
  stations: FleetFuelStation[];
  biddedPrices: BiddedPricesMap;
  onSuccess: () => void;
  institutionId?: string;
}

interface ParsedSpreadsheetRow {
  customOrderNumber?: string;
  plate: string;
  vehicleMatched?: FleetVehicle;
  fuelType?: FuelType;
  dateStr: string;
  odometer: number;
  liters: number;
  unitPrice: number;
  driverName: string;
  stationName: string;
  voucherNumber: string;
  notes: string;
  isValid: boolean;
  validationError?: string;
}

const FUEL_OPTIONS: { type: FuelType; label: string; shortLabel: string }[] = [
  { type: 'diesel_s10', label: 'Diesel S-10 Especial', shortLabel: 'Diesel S-10' },
  { type: 'diesel_s500', label: 'Diesel S-500 Comum', shortLabel: 'Diesel S-500' },
  { type: 'gasolina', label: 'Gasolina Comum', shortLabel: 'Gasolina' },
  { type: 'etanol', label: 'Etanol Hidratado', shortLabel: 'Etanol' },
  { type: 'arla32', label: 'Arla 32 Redutor de Emissões', shortLabel: 'Arla 32' }
];

export const LegacyVoucherModal: React.FC<LegacyVoucherModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  drivers,
  stations,
  biddedPrices,
  onSuccess,
  institutionId = 'inst_1'
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'spreadsheet'>('single');

  // FORMULÁRIO INDIVIDUAL
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [customOrderNumber, setCustomOrderNumber] = useState('');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [suppliedAt, setSuppliedAt] = useState(() => {
    // Data de ontem às 10:00 como sugestão padrão
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(10, 0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [driverName, setDriverName] = useState('');
  const [stationName, setStationName] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('diesel_s10');
  const [litersSupplied, setLitersSupplied] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>(() => {
    return String(biddedPrices['diesel_s10']?.price || DEFAULT_BIDDED_PRICES['diesel_s10']?.price || 6.19);
  });
  const [odometerReading, setOdometerReading] = useState<string>('');
  const [notes, setNotes] = useState('Abastecimento retroativo registrado a partir de canhoto de papel');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [savingSingle, setSavingSingle] = useState(false);

  // IMPORTAÇÃO POR PLANILHA
  const [parsedRows, setParsedRows] = useState<ParsedSpreadsheetRow[]>([]);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [importingBatch, setImportingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sincroniza motoristas ordenados alfabeticamente
  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));
  }, [drivers]);

  // Inicializa posto padrão caso exista
  React.useEffect(() => {
    if (stations.length > 0 && !stationName) {
      setStationName(stations[0].name);
    }
  }, [stations, stationName]);

  // Ao selecionar tipo de combustível manualmente, puxa o preço da licitação
  const handleFuelTypeChange = (newFuel: FuelType) => {
    setFuelType(newFuel);
    const defaultPrice = biddedPrices[newFuel]?.price || DEFAULT_BIDDED_PRICES[newFuel]?.price || 6.19;
    setUnitPrice(String(defaultPrice));
  };

  // Ao selecionar veículo no formulário individual
  const handleSelectVehicle = (v: FleetVehicle) => {
    setSelectedVehicle(v);
    setFuelType(v.fuel_type);
    const defaultPrice = biddedPrices[v.fuel_type]?.price || DEFAULT_BIDDED_PRICES[v.fuel_type]?.price || 6.19;
    setUnitPrice(String(defaultPrice));
    setVehicleSearch(`${v.plate} - ${v.model}`);
    if (v.current_odometer && !odometerReading) {
      setOdometerReading(String(v.current_odometer));
    }
  };

  // Veículos filtrados para o dropdown de busca
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return [];
    const q = vehicleSearch.toLowerCase().replace(/[^a-z0-9]/g, '');
    return vehicles.filter(v => {
      const cleanPlate = v.plate.toLowerCase().replace(/[^a-z0-9]/g, '');
      const model = v.model.toLowerCase();
      const dept = (v.department || '').toLowerCase();
      return cleanPlate.includes(q) || model.includes(q) || dept.includes(q);
    }).slice(0, 5);
  }, [vehicles, vehicleSearch]);

  // Cálculos do valor total no formulário individual
  const singleTotalValue = useMemo(() => {
    const l = parseFloat(litersSupplied.replace(',', '.')) || 0;
    const p = parseFloat(unitPrice.replace(',', '.')) || 0;
    return (l * p).toFixed(2);
  }, [litersSupplied, unitPrice]);

  // Envio do formulário individual
  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      showToast('Selecione o veículo correspondente ao canhoto.', 'warning');
      return;
    }

    const liters = parseFloat(litersSupplied.replace(',', '.'));
    if (isNaN(liters) || liters <= 0) {
      showToast('Informe a quantidade de litros abastecidos.', 'warning');
      return;
    }

    if (selectedVehicle.tank_capacity && liters > selectedVehicle.tank_capacity * 1.2) {
      showToast(`A litragem informada (${liters}L) excede a capacidade do tanque (${selectedVehicle.tank_capacity}L).`, 'error');
      return;
    }

    const price = parseFloat(unitPrice.replace(',', '.')) || 6.19;
    const odo = parseFloat(odometerReading.replace(/[^0-9]/g, '')) || 0;

    if (!driverName.trim()) {
      showToast('Informe o nome do motorista/condutor.', 'warning');
      return;
    }

    setSavingSingle(true);
    try {
      let uploadedReceiptUrl: string | undefined = undefined;
      if (receiptFile) {
        uploadedReceiptUrl = await uploadFuelDocumentPhoto(receiptFile, 'receipts');
      }

      await registerLegacyFuelOrder({
        institution_id: institutionId,
        vehicle_id: selectedVehicle.id,
        plate: selectedVehicle.plate,
        driver_name: driverName.trim(),
        station_name: stationName.trim() || 'Posto Credenciado',
        fuel_type: fuelType,
        voucher_number: voucherNumber.trim() || undefined,
        custom_order_number: customOrderNumber.trim() || undefined,
        supplied_at: suppliedAt,
        liters_supplied: liters,
        unit_price: price,
        odometer_reading: odo,
        receipt_photo_url: uploadedReceiptUrl,
        notes: notes.trim()
      });

      showToast('Canhoto antigo registrado com sucesso como abastecido!', 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Erro ao lançar canhoto:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao salvar canhoto antigo.';
      showToast(msg, 'error');
    } finally {
      setSavingSingle(false);
    }
  };

  // Upload e leitura da planilha Excel / CSV
  const handleSpreadsheetFile = async (file: File) => {
    setUploadFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        showToast('A planilha enviada está vazia ou corrompida.', 'error');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        showToast('Nenhuma linha de abastecimento encontrada na planilha.', 'warning');
        return;
      }

      const parsed: ParsedSpreadsheetRow[] = rawRows.map((r, index) => {
        // Encontra coluna de placa
        const plateRaw = String(
          r['Placa'] || r['PLACA'] || r['placa'] || r['Veículo'] || r['Veiculo'] || r['VEICULO'] || ''
        ).trim().toUpperCase();

        const cleanPlate = plateRaw.replace(/[^A-Za-z0-9]/g, '');
        const matchedVeh = vehicles.find(v => v.plate.replace(/[^A-Za-z0-9]/g, '') === cleanPlate);

        // Data
        const rawDate = r['Data_Abastecimento'] || r['Data'] || r['DATA'] || r['Data/Hora'] || r['Data Abastecimento'];
        const dateIso = parseExcelDate(rawDate);

        // Odometer
        const rawOdo = String(r['Km_Odometro'] || r['Odometro'] || r['KM'] || r['Km'] || r['Horimetro'] || 0);
        const odometer = parseFloat(rawOdo.replace(/[^0-9.]/g, '')) || 0;

        // Litros
        const rawLiters = String(r['Litros'] || r['LITROS'] || r['Qtd'] || r['Quantidade'] || 0);
        const liters = parseFloat(rawLiters.replace(',', '.')) || 0;

        // Combustível
        const rawFuel = String(r['Combustivel'] || r['Combustível'] || r['Tipo_Combustivel'] || r['TipoCombustivel'] || '').toLowerCase().trim();
        let rowFuelType: FuelType | undefined = undefined;
        if (rawFuel.includes('s500') || (rawFuel.includes('comum') && rawFuel.includes('diesel'))) rowFuelType = 'diesel_s500';
        else if (rawFuel.includes('s10') || rawFuel.includes('diesel')) rowFuelType = 'diesel_s10';
        else if (rawFuel.includes('gasolina')) rowFuelType = 'gasolina';
        else if (rawFuel.includes('etanol') || rawFuel.includes('alcool') || rawFuel.includes('álcool')) rowFuelType = 'etanol';
        else if (rawFuel.includes('arla')) rowFuelType = 'arla32';

        const effectiveFuelType: FuelType = rowFuelType || (matchedVeh ? matchedVeh.fuel_type : 'diesel_s10');

        // Preço Unitário
        const rawPrice = String(r['Preco_Unitario'] || r['Preco'] || r['Valor_Unitario'] || r['Unitario'] || '');
        const unitPrice = parseFloat(rawPrice.replace(',', '.')) || (biddedPrices[effectiveFuelType]?.price || 6.19);

        // Número da Autorização Personalizado (para seguir a numeração das requisições em papel)
        const customOrderNumber = String(
          r['Num_Autorizacao'] || r['Numero_Autorizacao'] || r['Num_Ordem'] || r['Ordem'] || r['Autorizacao'] || ''
        ).trim();

        // Motorista
        const driverName = String(r['Motorista'] || r['Condutor'] || r['MOTORISTA'] || 'Motorista Municipal').trim();

        // Posto
        const stationName = String(r['Posto'] || r['Posto_Credenciado'] || r['POSTO'] || (stations[0]?.name || 'Auto Posto Central')).trim();

        // Canhoto / Talão
        const voucherNumber = String(r['Num_Canhoto'] || r['Canhoto'] || r['Talao'] || r['Numero_Canhoto'] || '').trim();

        // Observações
        const notes = String(r['Observacoes'] || r['Obs'] || r['Notas'] || 'Importação em lote de talão antigo').trim();

        let isValid = true;
        let validationError: string | undefined;

        if (!plateRaw) {
          isValid = false;
          validationError = 'Placa não informada';
        } else if (!matchedVeh) {
          isValid = false;
          validationError = `Placa "${plateRaw}" não localizada na frota`;
        } else if (liters <= 0) {
          isValid = false;
          validationError = 'Litros inválidos ou zero';
        }

        return {
          customOrderNumber: customOrderNumber || undefined,
          plate: plateRaw,
          vehicleMatched: matchedVeh,
          fuelType: rowFuelType,
          dateStr: dateIso,
          odometer,
          liters,
          unitPrice,
          driverName,
          stationName,
          voucherNumber,
          notes,
          isValid,
          validationError
        };
      });

      setParsedRows(parsed);
      const validCount = parsed.filter(p => p.isValid).length;
      showToast(`${parsed.length} linhas lidas (${validCount} válidas para importação).`, 'success');
    } catch (err) {
      console.error('Erro ao ler planilha:', err);
      showToast('Falha ao processar arquivo. Verifique se o formato é .xlsx ou .csv válido.', 'error');
    }
  };

  // Execução da importação em lote
  const handleConfirmBatchImport = async () => {
    const validRows = parsedRows.filter(p => p.isValid && p.vehicleMatched);
    if (validRows.length === 0) {
      showToast('Não há linhas válidas para importar.', 'warning');
      return;
    }

    setImportingBatch(true);
    setBatchProgress(`Processando 0 de ${validRows.length}...`);

    try {
      const payloads: LegacyVoucherPayload[] = validRows.map(row => ({
        institution_id: institutionId,
        vehicle_id: row.vehicleMatched!.id,
        plate: row.vehicleMatched!.plate,
        driver_name: row.driverName,
        station_name: row.stationName,
        fuel_type: row.fuelType || row.vehicleMatched!.fuel_type,
        voucher_number: row.voucherNumber,
        custom_order_number: row.customOrderNumber,
        supplied_at: row.dateStr,
        liters_supplied: row.liters,
        unit_price: row.unitPrice,
        odometer_reading: row.odometer,
        notes: row.notes
      }));

      const res = await registerLegacyFuelOrdersBatch(payloads);

      if (res.errors.length > 0) {
        showToast(`Importados ${res.successCount} canhotos com ${res.errors.length} avisos.`, 'warning');
      } else {
        showToast(`${res.successCount} canhotos antigos importados com sucesso!`, 'success');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Erro na importação em lote:', err);
      const msg = err instanceof Error ? err.message : 'Falha na importação em lote.';
      showToast(msg, 'error');
    } finally {
      setImportingBatch(false);
      setBatchProgress('');
    }
  };

  if (!isOpen) return null;

  const validRowsCount = parsedRows.filter(r => r.isValid).length;
  const invalidRowsCount = parsedRows.length - validRowsCount;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-3xl w-full p-5 sm:p-6 overflow-hidden my-auto"
        >
          {/* CABEÇALHO */}
          <div className="flex justify-between items-start pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Histórico & Transição de Frota
              </span>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <FileText className="text-amber-500" size={20} />
                Lançar Canhotos Antigos (Talão de Papel)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Registre abastecimentos anteriores para atualizar o histórico de consumo e odômetro sem exigir validação ao vivo na bomba.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={savingSingle || importingBatch}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* ABAS: INDIVIDUAL VS PLANILHA */}
          <div className="flex gap-2 pt-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <FileText size={15} />
              <span>Lançamento Individual</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('spreadsheet')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'spreadsheet'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>Importar por Planilha (Excel / CSV)</span>
            </button>
          </div>

          {/* CONTEÚDO DA ABA 1: FORMULÁRIO INDIVIDUAL */}
          {activeTab === 'single' && (
            <form onSubmit={handleSubmitSingle} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <ShieldCheck className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={17} />
                <p>
                  O abastecimento será registrado como <strong>abastecido</strong> com data retroativa. Se o odômetro digitado for mais recente que o atual do veículo, a quilometragem da frota será atualizada automaticamente.
                </p>
              </div>

              {/* VEÍCULO */}
              <div className="space-y-1.5 relative">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Veículo da Frota *
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Digite a placa ou modelo do veículo..."
                    value={vehicleSearch}
                    onChange={(e) => {
                      setVehicleSearch(e.target.value);
                      if (selectedVehicle) setSelectedVehicle(null);
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* SUGESTÕES DE VEÍCULOS */}
                {!selectedVehicle && filteredVehicles.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-700">
                    {filteredVehicles.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectVehicle(v)}
                        className="w-full text-left p-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <span className="font-mono font-black text-neutral-900 dark:text-white mr-2">{v.plate}</span>
                          <span className="text-neutral-600 dark:text-neutral-300 font-medium">{v.model}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          Atual: {formatThousands(v.current_odometer || 0)} {v.metric_type === 'horimetro' ? 'h' : 'km'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedVehicle && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Car size={15} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="font-mono font-black text-emerald-900 dark:text-emerald-200">{selectedVehicle.plate}</span>
                      <span className="text-neutral-600 dark:text-neutral-300 font-medium">{selectedVehicle.model}</span>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                      Odômetro Atual: {formatThousands(selectedVehicle.current_odometer || 0)} km
                    </span>
                  </div>
                )}
              </div>

              {/* NÚMERO DA AUTORIZAÇÃO E DATA RETROATIVA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-amber-500" />
                      Número da Autorização / Requisição *
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      (Nº do Talão de Papel)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0452, REQ-0452 ou AUT-2026-0452"
                    value={customOrderNumber}
                    onChange={(e) => setCustomOrderNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    Deixe em branco para o sistema gerar automaticamente (AUT-2026-XXXX).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-500" />
                    Data & Hora do Abastecimento no Papel *
                  </label>
                  <input
                    type="datetime-local"
                    value={suppliedAt}
                    onChange={(e) => setSuppliedAt(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* NÚMERO DO TALÃO / BLOCO FÍSICO (OPCIONAL) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
                  <FileText size={13} className="text-amber-500" />
                  Identificação Adicional / Bloco Físico (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bloco A - Folha 12 ou Cupom 9812"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* MOTORISTA E POSTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <User size={13} className="text-amber-500" />
                      Nome do Motorista / Condutor *
                    </label>
                    <span className="text-[10px] text-neutral-400 font-semibold">
                      {drivers.length} cadastrado{drivers.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Dropdown nativo com todos os motoristas cadastrados */}
                  <select
                    value={drivers.find(d => d.full_name.toLowerCase().trim() === driverName.toLowerCase().trim())?.id || ''}
                    onChange={(e) => {
                      const selId = e.target.value;
                      if (!selId) {
                        setDriverName('');
                        return;
                      }
                      const found = drivers.find(d => d.id === selId);
                      if (found) {
                        setDriverName(found.full_name);
                      }
                    }}
                    className="w-full mb-1.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- Selecione o Motorista na Lista --</option>
                    {sortedDrivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} {d.cpf ? `• CPF: ${d.cpf}` : ''} ({d.department || 'Geral'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Ou digite o nome caso não esteja na lista"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    list="legacy-drivers-list"
                    className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <datalist id="legacy-drivers-list">
                    {sortedDrivers.map(d => (
                      <option key={d.id} value={d.full_name}>
                        {d.department ? `${d.department} • ` : ''}{d.cnh_category ? `CNH ${d.cnh_category}` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Fuel size={13} className="text-amber-500" />
                      Posto Credenciado
                    </label>
                    <span className="text-[10px] text-neutral-400 font-semibold">
                      {stations.length} posto{stations.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <select
                    value={stations.find(s => s.name.toLowerCase().trim() === stationName.toLowerCase().trim())?.id || ''}
                    onChange={(e) => {
                      const selId = e.target.value;
                      if (!selId) {
                        setStationName('');
                        return;
                      }
                      const found = stations.find(s => s.id === selId);
                      if (found) {
                        setStationName(found.name);
                      }
                    }}
                    className="w-full mb-1.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- Selecione o Posto Credenciado --</option>
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.cnpj ? `(${s.cnpj})` : ''}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Ou digite o nome do posto caso não esteja na lista"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    list="legacy-stations-list"
                    className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <datalist id="legacy-stations-list">
                    {stations.map(s => (
                      <option key={s.id} value={s.name}>{s.cnpj}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* SELECIONADOR DO TIPO DE COMBUSTÍVEL E PREÇO LICITADO */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Fuel size={14} className="text-amber-500" />
                    Tipo de Combustível *
                  </label>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Preço Licitado: R$ {parseFloat(unitPrice || '0').toFixed(3)}/L
                  </span>
                </div>

                {/* Botões rápidos de seleção de combustível */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {FUEL_OPTIONS.map((f) => {
                    const isSelected = fuelType === f.type;
                    const bPrice = biddedPrices[f.type]?.price || DEFAULT_BIDDED_PRICES[f.type]?.price || 6.19;
                    return (
                      <button
                        key={f.type}
                        type="button"
                        onClick={() => handleFuelTypeChange(f.type)}
                        className={`py-2 px-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500 border-amber-600 text-white shadow-sm shadow-amber-500/25 scale-[1.02]'
                            : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-amber-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-tight block truncate">
                          {f.shortLabel}
                        </span>
                        <span className={`text-[11px] font-mono font-black mt-1 ${
                          isSelected ? 'text-amber-100' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          R$ {bPrice.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Select dropdown alternativo */}
                <select
                  value={fuelType}
                  onChange={(e) => handleFuelTypeChange(e.target.value as FuelType)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {FUEL_OPTIONS.map(f => {
                    const bPrice = biddedPrices[f.type]?.price || DEFAULT_BIDDED_PRICES[f.type]?.price || 6.19;
                    return (
                      <option key={f.type} value={f.type}>
                        {f.label} — R$ {bPrice.toFixed(3)}/L
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* LITROS, PREÇO UNITÁRIO E ODÔMETRO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Litros Abastecidos *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 50.00"
                      value={litersSupplied}
                      onChange={(e) => setLitersSupplied(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">L</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Preço Unitário (R$/L)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 6.19"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">R$</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1">
                    <Gauge size={13} className="text-amber-500" />
                    Leitura do Odômetro *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 85200"
                      value={odometerReading}
                      onChange={(e) => setOdometerReading(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">km</span>
                  </div>
                </div>
              </div>

              {/* RESUMO DO VALOR TOTAL CALCULADO */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-between text-xs border border-neutral-100 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400 font-bold">Valor Total Calculado:</span>
                <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {parseFloat(singleTotalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              {/* ANEXO / FOTO DO CANHOTO FÍSICO (OPCIONAL) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Foto ou Digitalização do Canhoto de Papel (Opcional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 py-2.5 px-3 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload size={14} />
                    <span>{receiptFile ? receiptFile.name : 'Anexar Foto/PDF do Canhoto'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setReceiptFile(file);
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = () => setReceiptPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setReceiptPreview(null);
                          }
                        }
                      }}
                      className="sr-only"
                    />
                  </label>

                  {receiptFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                      title="Remover anexo"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {receiptPreview && (
                  <div className="mt-2 relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 max-w-xs">
                    <img src={receiptPreview} alt="Canhoto" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={savingSingle}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSingle || !selectedVehicle}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingSingle ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Salvando Canhoto...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Salvar Canhoto Antigo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* CONTEÚDO DA ABA 2: IMPORTAÇÃO POR PLANILHA */}
          {activeTab === 'spreadsheet' && (
            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* CARD DE INSTRUÇÕES E DOWNLOAD DO MODELO */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
                    Planilha Modelo de Importação
                  </h4>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                    Baixe o modelo com colunas prontas (Placa, Data, KM, Litros, etc.) e preencha os canhotos antigos para carregar de uma só vez.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateLegacyVouchersExcelTemplate}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0 transition-all active:scale-95"
                >
                  <Download size={14} />
                  <span>Baixar Modelo (.xlsx)</span>
                </button>
              </div>

              {/* ÁREA DE DRAG & DROP / UPLOAD */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 rounded-3xl bg-neutral-50 dark:bg-neutral-800/50 text-center flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload size={22} />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                    {uploadFileName ? uploadFileName : 'Clique para selecionar a planilha (.xlsx ou .csv)'}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                    ou arraste o arquivo diretamente para esta área
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSpreadsheetFile(f);
                  }}
                  className="sr-only"
                />
              </div>

              {/* PRÉVIA DOS DADOS LIDOS */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      Prévia dos Canhotos Detectados ({parsedRows.length} linhas):
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> {validRowsCount} válidos
                      </span>
                      {invalidRowsCount > 0 && (
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertTriangle size={13} /> {invalidRowsCount} erros
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase text-neutral-600 dark:text-neutral-400 sticky top-0">
                        <tr>
                          <th className="p-2">Nº Autorização</th>
                          <th className="p-2">Placa</th>
                          <th className="p-2">Data</th>
                          <th className="p-2">Odômetro</th>
                          <th className="p-2">Litros</th>
                          <th className="p-2">Motorista</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {parsedRows.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20'}>
                            <td className="p-2 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {row.customOrderNumber || 'Automático'}
                            </td>
                            <td className="p-2 font-mono font-bold text-neutral-900 dark:text-white">
                              {row.plate}
                            </td>
                            <td className="p-2 text-neutral-600 dark:text-neutral-300">
                              {new Date(row.dateStr).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-2 font-mono text-neutral-600 dark:text-neutral-300">
                              {formatThousands(row.odometer)} km
                            </td>
                            <td className="p-2 font-mono font-bold text-neutral-900 dark:text-white">
                              {row.liters.toFixed(2)} L
                            </td>
                            <td className="p-2 text-neutral-600 dark:text-neutral-300 truncate max-w-[120px]">
                              {row.driverName}
                            </td>
                            <td className="p-2">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                                  <Check size={10} /> Pronto
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full" title={row.validationError}>
                                  <AlertTriangle size={10} /> {row.validationError}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedRows.length > 50 && (
                    <p className="text-[10px] text-neutral-400 text-center">
                      Exibindo as primeiras 50 de {parsedRows.length} linhas encontradas.
                    </p>
                  )}
                </div>
              )}

              {/* BOTÕES DE AÇÃO NA ABA PLANILHA */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={importingBatch}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchImport}
                  disabled={importingBatch || validRowsCount === 0}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {importingBatch ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{batchProgress || 'Importando Canhotos...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Importar {validRowsCount} Canhotos Válidos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

