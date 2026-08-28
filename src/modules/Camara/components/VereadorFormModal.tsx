import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, UserPlus, Send, Camera } from 'lucide-react';
import { Vereador } from '../types';

interface VereadorFormModalProps {
  vereadorParaEditar?: Vereador | null;
  onClose: () => void;
  onSave: (vereador: Vereador) => void;
}

export const VereadorFormModal: React.FC<VereadorFormModalProps> = ({
  vereadorParaEditar,
  onClose,
  onSave
}) => {
  const [nome, setNome] = useState(vereadorParaEditar?.nome || '');
  const [nomeParlamentar, setNomeParlamentar] = useState(vereadorParaEditar?.nome_parlamentar || '');
  const [partido, setPartido] = useState(vereadorParaEditar?.partido || 'PSD');
  const [numeroUrna, setNumeroUrna] = useState(vereadorParaEditar?.numero_urna || '');
  const [cargoMesa, setCargoMesa] = useState<any>(vereadorParaEditar?.cargo_mesa || 'Vereador(a)');
  const [bancada, setBancada] = useState(vereadorParaEditar?.bancada || '');
  const [fotoUrl, setFotoUrl] = useState(vereadorParaEditar?.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300');
  const [email, setEmail] = useState(vereadorParaEditar?.email || '');
  const [telefone, setTelefone] = useState(vereadorParaEditar?.telefone || '');
  const [gabinete, setGabinete] = useState(vereadorParaEditar?.gabinete || 'Gabinete 01');
  const [biografia, setBiografia] = useState(vereadorParaEditar?.biografia || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !nomeParlamentar || !partido) return;

    const data: Vereador = {
      id: vereadorParaEditar?.id || `ver-${Date.now()}`,
      nome,
      nome_parlamentar: nomeParlamentar,
      partido,
      numero_urna: numeroUrna,
      cargo_mesa: cargoMesa,
      bancada,
      foto_url: fotoUrl,
      email,
      telefone,
      gabinete,
      biografia,
      mandato_inicio: vereadorParaEditar?.mandato_inicio || '2025-01-01',
      mandato_fim: vereadorParaEditar?.mandato_fim || '2028-12-31',
      ativo: true,
      estatisticas: vereadorParaEditar?.estatisticas || {
        pls_apresentados: 0,
        indicacoes_protocoladas: 0,
        presenca_percent: 100,
        verba_gabinete_utilizada: 0
      }
    };

    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 md:p-8 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <UserPlus size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white font-['Montserrat']">
                {vereadorParaEditar ? 'Editar Parlamentar' : 'Cadastrar Novo Vereador'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Gabinete e Registro Parlamentar da Legislatura
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto flex-1 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">Nome Completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">Nome Parlamentar (Urna)</label>
              <input
                type="text"
                required
                value={nomeParlamentar}
                onChange={e => setNomeParlamentar(e.target.value)}
                className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">Partido</label>
              <input
                type="text"
                required
                value={partido}
                onChange={e => setPartido(e.target.value)}
                className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">Cargo na Mesa</label>
              <select
                value={cargoMesa}
                onChange={e => setCargoMesa(e.target.value)}
                className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              >
                <option value="Presidente">Presidente</option>
                <option value="Vice-Presidente">Vice-Presidente</option>
                <option value="1º Secretário">1º Secretário</option>
                <option value="2º Secretário">2º Secretário</option>
                <option value="Líder de Bancada">Líder de Bancada</option>
                <option value="Vereador(a)">Vereador(a)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">Gabinete</label>
              <input
                type="text"
                value={gabinete}
                onChange={e => setGabinete(e.target.value)}
                className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">E-mail Institucional</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">Telefone / WhatsApp</label>
              <input
                type="text"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">URL da Foto Oficial</label>
            <input
              type="text"
              value={fotoUrl}
              onChange={e => setFotoUrl(e.target.value)}
              className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase text-neutral-400 tracking-wider">Biografia / Histórico</label>
            <textarea
              rows={3}
              value={biografia}
              onChange={e => setBiografia(e.target.value)}
              className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-black uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/25 flex items-center gap-2"
            >
              <Send size={16} /> Salvar Parlamentar
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
