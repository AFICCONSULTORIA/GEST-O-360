import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, X, ShieldCheck, FileCheck, CheckSquare } from 'lucide-react';
import { BiddedPricesMap } from '../../../../lib/api/fleetFuelAudit';

export interface FleetBiddedPricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceEditForm: BiddedPricesMap;
  setPriceEditForm: React.Dispatch<React.SetStateAction<BiddedPricesMap>>;
  rebalanceTermInput: string;
  setRebalanceTermInput: (val: string) => void;
  rebalanceReasonInput: string;
  setRebalanceReasonInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const FleetBiddedPricesModal: React.FC<FleetBiddedPricesModalProps> = ({
  isOpen,
  onClose,
  priceEditForm,
  setPriceEditForm,
  rebalanceTermInput,
  setRebalanceTermInput,
  rebalanceReasonInput,
  setRebalanceReasonInput,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    Preços Licitados & Reequilíbrio Contratual
                  </h3>
                  <p className="text-neutral-400 text-xs">
                    Valores homologados por combustível e termos de aditivo (Lei 14.133/2021)
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">Parâmetros Licitatórios Travados na Emissão</strong>
                  <span>
                    Toda ordem de fornecimento emitida utilizará obrigatoriamente os preços unitários desta tabela. Havendo reajuste ou reequilíbrio econômico homologado, atualize os valores abaixo indicando o Termo Aditivo.
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 tracking-wider">
                  Valores Homologados por Combustível (R$ / Litro)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'arla32'] as const).map((fuel) => {
                    const item = priceEditForm[fuel] || { price: 6.0, name: fuel, contractNumber: '' };
                    return (
                      <div
                        key={fuel}
                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                            {item.name || fuel}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold">
                            {fuel.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-neutral-500 font-bold mb-0.5">
                              Preço Licitado (R$/L) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-xs font-bold text-neutral-400">R$</span>
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                required
                                value={item.price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setPriceEditForm((prev) => ({
                                    ...prev,
                                    [fuel]: {
                                      ...prev[fuel],
                                      price: val,
                                    },
                                  }));
                                }}
                                className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-xl text-xs font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-neutral-500 font-bold mb-0.5">
                              Ata / Lote Contratual
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: ATA 042/26 - Lote 01"
                              value={item.contractNumber || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPriceEditForm((prev) => ({
                                  ...prev,
                                  [fuel]: {
                                    ...prev[fuel],
                                    contractNumber: val,
                                  },
                                }));
                              }}
                              className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-xl text-[11px] font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <span className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <FileCheck size={14} className="text-amber-600" />
                  Registro de Reequilíbrio / Termo Aditivo
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Instrumento Jurídico / Termo Aditivo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Termo Aditivo nº 02/2026 - Reequilíbrio ANP"
                      value={rebalanceTermInput}
                      onChange={(e) => setRebalanceTermInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Motivação / Fundamentação Legal
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Variação de preços comprovada por nota fiscal de refinaria"
                      value={rebalanceReasonInput}
                      onChange={(e) => setRebalanceReasonInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare size={14} />
                  <span>Salvar e Atualizar Preços Licitados</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
