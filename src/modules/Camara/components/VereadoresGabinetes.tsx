import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Plus, Edit2, Mail, Phone, MapPin, 
  FileText, MessageSquare, Award, CheckCircle2, 
  Wallet, Landmark, Shield 
} from 'lucide-react';
import { Vereador } from '../types';
import { VereadorFormModal } from './VereadorFormModal';

interface VereadoresGabinetesProps {
  vereadores: Vereador[];
  onSaveVereador: (vereador: Vereador) => void;
}

export const VereadoresGabinetes: React.FC<VereadoresGabinetesProps> = ({
  vereadores,
  onSaveVereador
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVereadorToEdit, setSelectedVereadorToEdit] = useState<Vereador | null>(null);

  // Mesa Diretora
  const mesaDiretora = vereadores.filter(v => v.cargo_mesa !== 'Vereador(a)' && v.cargo_mesa !== 'Líder de Bancada');

  const formatCurrency = (val?: number) => {
    if (!val) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat'] tracking-tight flex items-center gap-3">
            <Users className="text-[#003B6F] dark:text-sky-400" size={28} />
            Mesa Diretora & Gabinetes Parlamentares
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Gestão da legislatura, lideranças partidárias, presença e prestação de contas dos mandatos.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedVereadorToEdit(null);
            setIsFormOpen(true);
          }}
          className="px-6 py-3 bg-[#003B6F] hover:bg-[#002b52] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#003B6F]/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={16} /> Cadastrar Vereador
        </button>
      </div>

      {/* 2. MESA DIRETORA EM DESTAQUE */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="text-amber-500" size={20} />
          <h4 className="font-bold text-neutral-900 dark:text-white text-sm uppercase tracking-wider">
            Mesa Diretora da Câmara Municipal (Biênio 2025/2026)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mesaDiretora.map(membro => (
            <div 
              key={membro.id}
              className="bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src={membro.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                  alt={membro.nome_parlamentar}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#003B6F] dark:border-sky-400 shadow-md"
                />
                <div>
                  <span className="px-2 py-0.5 bg-[#003B6F] text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                    {membro.cargo_mesa}
                  </span>
                  <h5 className="text-xs font-bold text-neutral-900 dark:text-white mt-1">
                    {membro.nome_parlamentar}
                  </h5>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {membro.partido}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between">
                <span>{membro.gabinete || 'Presidência'}</span>
                <button
                  onClick={() => {
                    setSelectedVereadorToEdit(membro);
                    setIsFormOpen(true);
                  }}
                  className="text-[#003B6F] dark:text-sky-400 font-bold hover:underline"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. QUADRO GERAL DOS VEREADORES */}
      <div className="space-y-4">
        <h4 className="font-bold text-neutral-900 dark:text-white text-sm uppercase tracking-wider">
          Todos os Parlamentares em Exercício ({vereadores.length})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vereadores.map(ver => (
            <motion.div
              key={ver.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 group"
            >
              
              {/* Header do Card */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={ver.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                      alt={ver.nome_parlamentar}
                      className="w-14 h-14 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-700"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono font-black text-[10px] rounded-md">
                          {ver.partido}
                        </span>
                        {ver.cargo_mesa !== 'Vereador(a)' && (
                          <span className="px-2 py-0.5 bg-[#003B6F]/10 text-[#003B6F] dark:text-sky-400 font-bold text-[9px] rounded-md">
                            {ver.cargo_mesa}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                        {ver.nome_parlamentar}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        {ver.nome}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedVereadorToEdit(ver);
                      setIsFormOpen(true);
                    }}
                    className="p-2 text-neutral-400 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                    title="Editar Dados do Vereador"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                  {ver.biografia || 'Sem biografia cadastrada.'}
                </p>
              </div>

              {/* Métricas de Produtividade */}
              <div className="grid grid-cols-3 gap-2 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-center">
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 block">Projetos</span>
                  <strong className="text-xs font-mono text-[#003B6F] dark:text-sky-400">
                    {ver.estatisticas?.pls_apresentados || 0} PLs
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 block">Indicações</span>
                  <strong className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    {ver.estatisticas?.indicacoes_protocoladas || 0}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 block">Presença</span>
                  <strong className="text-xs font-mono text-neutral-800 dark:text-neutral-200">
                    {ver.estatisticas?.presenca_percent || 100}%
                  </strong>
                </div>
              </div>

              {/* Rodapé: Contatos */}
              <div className="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                {ver.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={13} className="text-neutral-400 shrink-0" />
                    <span className="truncate">{ver.email}</span>
                  </div>
                )}
                {ver.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-neutral-400 shrink-0" />
                    <span>{ver.telefone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="flex items-center gap-1 text-neutral-400">
                    <MapPin size={12} /> {ver.gabinete || 'Gabinete'}
                  </span>
                  <span className="text-neutral-400 font-mono">
                    Verba: <strong className="text-neutral-700 dark:text-neutral-300">{formatCurrency(ver.estatisticas?.verba_gabinete_utilizada)}</strong>
                  </span>
                </div>
              </div>

            </motion.div>
          ))}
        </div>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {isFormOpen && (
        <VereadorFormModal
          vereadorParaEditar={selectedVereadorToEdit}
          onClose={() => setIsFormOpen(false)}
          onSave={v => {
            onSaveVereador(v);
            setIsFormOpen(false);
          }}
        />
      )}

    </div>
  );
};
