import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, X, CheckSquare } from 'lucide-react';
import { FuelSupplyOrder } from '../../../../lib/api/fleetFuel';
import { formatFuelLabel } from '../FuelAuthorizationVoucherPDF';

export interface FleetLinkInvoiceModalProps {
  isOpen: boolean;
  order: (FuelSupplyOrder & { total_authorized_value?: number }) | null;
  invoiceLinkNumber: string;
  onInvoiceLinkNumberChange: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const FleetLinkInvoiceModal: React.FC<FleetLinkInvoiceModalProps> = ({
  isOpen,
  order,
  invoiceLinkNumber,
  onInvoiceLinkNumberChange,
  onClose,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden"
          >
            <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    Vincular Nota Fiscal à Requisição
                  </h3>
                  <p className="text-neutral-400 text-xs">Controle Interno & Conciliação Faturada</p>
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
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Ordem de Fornecimento:</span>
                  <span className="font-mono font-bold text-amber-600">{order.order_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Veículo Oficial:</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    {order.vehicle?.model || 'Veículo Municipal'} ({order.vehicle?.plate})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Motorista:</span>
                  <span className="font-medium">{order.driver_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Combustível & Litros:</span>
                  <span className="font-bold text-blue-600">
                    {order.liters_supplied || order.liters_authorized} L ({formatFuelLabel(order.fuel_type)})
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500">Valor Homologado:</span>
                  <strong className="text-emerald-600 font-bold">
                    R${' '}
                    {Number(order.total_authorized_value || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Número da Nota Fiscal / Fatura Eletrônica (NF-e) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NF-e 004821 ou Fatura Mensal 2026/089"
                  value={invoiceLinkNumber}
                  onChange={(e) => onInvoiceLinkNumberChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Insira o número da nota fiscal enviada posteriormente pelo posto conveniado para liquidar a despesa.
                </p>
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
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare size={14} />
                  <span>Vincular Nota Fiscal</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
