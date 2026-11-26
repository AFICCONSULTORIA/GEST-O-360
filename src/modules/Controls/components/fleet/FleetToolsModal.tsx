import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, X, Layers, FileText, Fuel, FileSpreadsheet, ExternalLink, Trash2 } from 'lucide-react';

export interface FleetToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasOrders: boolean;
  onOpenPriceConfig: () => void;
  onOpenBudgetClassifications: () => void;
  onOpenLegacyVoucher: () => void;
  onOpenAdvanceFuel: () => void;
  onExportExcel: () => void;
  onOpenFuelValidator: () => void;
  onClearAllOrders: () => void;
}

export const FleetToolsModal: React.FC<FleetToolsModalProps> = ({
  isOpen,
  onClose,
  hasOrders,
  onOpenPriceConfig,
  onOpenBudgetClassifications,
  onOpenLegacyVoucher,
  onOpenAdvanceFuel,
  onExportExcel,
  onOpenFuelValidator,
  onClearAllOrders,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-xl w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    Opções & Ferramentas da Frota
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Tabelas contratuais, dotações orçamentárias, canhotos antigos e relatórios TCE
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPriceConfig();
                }}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-amber-400 dark:hover:border-amber-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
              >
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  <Sliders size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-900 dark:text-white">Preços Licitados</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Tabela de preços por litro e reequilíbrio contratual
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBudgetClassifications();
                }}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
              >
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  <Layers size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-900 dark:text-white">Fichas Orçamentárias</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Centros de custo, fontes de recurso e dotações
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLegacyVoucher();
                }}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-amber-400 dark:hover:border-amber-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
              >
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-900 dark:text-white">Lançar Canhoto Antigo</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Registrar ou importar talões de papel retroativos
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdvanceFuel();
                }}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-cyan-400 dark:hover:border-cyan-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
              >
                <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                  <Fuel size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                    Abastecimento de Adiantamento
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Lançar abastecimento de viagem com fotos do odômetro e bomba
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExportExcel();
                }}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 dark:hover:border-emerald-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
              >
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-900 dark:text-white">Exportar TCE (Excel)</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Baixar planilha auditada para prestação de contas
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFuelValidator();
                }}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-700 bg-neutral-50/70 dark:bg-neutral-800/40 text-left transition-all cursor-pointer flex items-start gap-3"
              >
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  <ExternalLink size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-900 dark:text-white">Validador de Abastecimento</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Abrir portal público do posto/motorista em nova aba
                  </p>
                </div>
              </button>
            </div>

            {hasOrders && (
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onClearAllOrders();
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Limpar Ordens de Teste</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
