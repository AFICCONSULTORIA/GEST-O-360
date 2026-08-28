import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, Search, Filter, Eye, Edit2, 
  Calendar, User, Clock, CheckCircle2, AlertTriangle, 
  Layers, Tag, Printer, Sparkles, ChevronRight
} from 'lucide-react';
import { MateriaLegislativa, TipoMateria, StatusMateria, Comissao, Vereador } from '../types';
import { MateriaDetailModal } from './MateriaDetailModal';
import { MateriaFormModal } from './MateriaFormModal';

interface MateriasLegislativasProps {
  materias: MateriaLegislativa[];
  comissoes: Comissao[];
  vereadores: Vereador[];
  onSaveMateria: (materia: MateriaLegislativa) => void;
  onAddTramitacao: (materiaId: string, tramitacao: any) => void;
  onAddParecer: (materiaId: string, parecer: any) => void;
  onPrintDocumento?: (materia: MateriaLegislativa, tipoDoc: string) => void;
  selectedMateriaFromOutside?: MateriaLegislativa | null;
  onClearSelectedMateria?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Protocolado': 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  'Lido no Expediente': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
  'Em Comissão': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  'Apto para Ordem do Dia': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  '1ª Votação Aprovada': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  '2ª Votação Aprovada': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  'Aprovado em Redação Final': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
  'Enviado ao Executivo': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  'Sancionado': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  'Promulgado': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  'Vetado': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  'Rejeitado': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  'Arquivado': 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
};

export const MateriasLegislativas: React.FC<MateriasLegislativasProps> = ({
  materias,
  comissoes,
  vereadores,
  onSaveMateria,
  onAddTramitacao,
  onAddParecer,
  onPrintDocumento,
  selectedMateriaFromOutside,
  onClearSelectedMateria
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedAno, setSelectedAno] = useState<string>('2026');

  const [activeMateriaDetail, setActiveMateriaDetail] = useState<MateriaLegislativa | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [materiaToEdit, setMateriaToEdit] = useState<MateriaLegislativa | null>(null);

  // Efeito para abrir matéria quando selecionada pelo dashboard
  React.useEffect(() => {
    if (selectedMateriaFromOutside) {
      setActiveMateriaDetail(selectedMateriaFromOutside);
    }
  }, [selectedMateriaFromOutside]);

  const handleCloseDetail = () => {
    setActiveMateriaDetail(null);
    if (onClearSelectedMateria) onClearSelectedMateria();
  };

  // Filtros
  const filteredMaterias = useMemo(() => {
    return materias.filter(m => {
      const matchSearch = 
        m.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.ementa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.autor_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchTipo = selectedTipo === 'todos' || m.tipo === selectedTipo;
      const matchStatus = selectedStatus === 'todos' || m.status === selectedStatus;
      const matchAno = selectedAno === 'todos' || m.ano.toString() === selectedAno;

      return matchSearch && matchTipo && matchStatus && matchAno;
    });
  }, [materias, searchQuery, selectedTipo, selectedStatus, selectedAno]);

  const countEmTramitacao = materias.filter(m => !['Sancionado', 'Promulgado', 'Arquivado', 'Rejeitado'].includes(m.status)).length;
  const countAprovados = materias.filter(m => ['Sancionado', 'Promulgado'].includes(m.status)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* 1. TOPO: TÍTULO, STATS RÁPIDOS & BOTÃO NOVO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white font-['Montserrat'] tracking-tight flex items-center gap-3">
            <FileText className="text-[#003B6F] dark:text-sky-400" size={28} />
            Processo Legislativo Eletrônico (SAPL)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Tramitação, relatorias de comissões, redação final e autógrafos de lei.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setMateriaToEdit(null);
              setIsFormOpen(true);
            }}
            className="px-6 py-3 bg-[#003B6F] hover:bg-[#002b52] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-[#003B6F]/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={16} /> Protocolar Proposição
          </button>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS & PESQUISA */}
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-100 dark:border-neutral-800 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Busca Textual */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por ementa, autor, número ou palavra-chave..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-[#003B6F]/20 dark:text-white"
            />
          </div>

          {/* Tipo de Proposição */}
          <div>
            <select
              value={selectedTipo}
              onChange={e => setSelectedTipo(e.target.value)}
              className="w-full py-2.5 px-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-medium outline-none dark:text-white"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="Projeto de Lei Ordinária">Projeto de Lei Ordinária (PLO)</option>
              <option value="Projeto de Lei Complementar">Projeto de Lei Complementar (PLC)</option>
              <option value="Decreto Legislativo">Decreto Legislativo (PDL)</option>
              <option value="Projeto de Resolução">Projeto de Resolução (PR)</option>
              <option value="Emenda à LOM">Emenda à Lei Orgânica</option>
              <option value="Moção">Moção</option>
              <option value="Pedido de Informação">Pedido de Informação</option>
              <option value="Requerimento">Requerimento</option>
            </select>
          </div>

          {/* Status da Tramitação */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full py-2.5 px-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-medium outline-none dark:text-white"
            >
              <option value="todos">Todos os Status</option>
              <option value="Protocolado">Protocolado</option>
              <option value="Lido no Expediente">Lido no Expediente</option>
              <option value="Em Comissão">Em Comissão</option>
              <option value="Apto para Ordem do Dia">Apto para Ordem do Dia</option>
              <option value="1ª Votação Aprovada">1ª Votação Aprovada</option>
              <option value="Enviado ao Executivo">Enviado ao Executivo</option>
              <option value="Sancionado">Sancionado</option>
              <option value="Promulgado">Promulgado</option>
              <option value="Vetado">Vetado</option>
            </select>
          </div>

        </div>

        {/* Badges de Resumo */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <span className="font-bold text-neutral-400 text-[11px] uppercase tracking-wider mr-2">Filtros rápidos:</span>
          <button 
            onClick={() => { setSelectedStatus('todos'); setSelectedTipo('todos'); }}
            className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              selectedStatus === 'todos' && selectedTipo === 'todos'
                ? 'bg-[#003B6F] text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            Todas ({materias.length})
          </button>
          <button 
            onClick={() => setSelectedStatus('Em Comissão')}
            className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              selectedStatus === 'Em Comissão'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
            }`}
          >
            Em Análise nas Comissões
          </button>
          <button 
            onClick={() => setSelectedStatus('Apto para Ordem do Dia')}
            className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              selectedStatus === 'Apto para Ordem do Dia'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
            }`}
          >
            Apto para Votação em Plenário
          </button>
          <button 
            onClick={() => setSelectedStatus('Sancionado')}
            className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              selectedStatus === 'Sancionado'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            Sancionadas / Leis em Vigor
          </button>
        </div>
      </div>

      {/* 3. LISTAGEM DAS MATÉRIAS */}
      <div className="space-y-3">
        {filteredMaterias.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 text-neutral-400 space-y-2">
            <FileText size={48} className="mx-auto opacity-40" />
            <h4 className="font-bold text-base text-neutral-700 dark:text-neutral-300">Nenhuma matéria encontrada</h4>
            <p className="text-xs">Tente ajustar seus termos de busca ou filtros.</p>
          </div>
        ) : (
          filteredMaterias.map(materia => (
            <motion.div
              key={materia.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group"
            >
              
              {/* Lado Esquerdo: Identificação & Ementa */}
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1 w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-[#003B6F] dark:text-sky-400 shrink-0">
                  <FileText size={24} />
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-[#003B6F] text-white text-[11px] font-black font-mono rounded-lg">
                      {materia.numero}
                    </span>
                    <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold rounded-md">
                      {materia.tipo}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[materia.status] || STATUS_COLORS['Protocolado']}`}>
                      {materia.status}
                    </span>
                    {materia.regime !== 'Ordinário' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                        {materia.regime}
                      </span>
                    )}
                  </div>

                  <h4 
                    onClick={() => setActiveMateriaDetail(materia)}
                    className="text-sm font-bold text-neutral-900 dark:text-white hover:text-[#003B6F] dark:hover:text-sky-400 transition-colors cursor-pointer line-clamp-2"
                  >
                    {materia.ementa}
                  </h4>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>Autor: <strong className="text-neutral-700 dark:text-neutral-300">{materia.autor_nome}</strong></span>
                    <span>Protocolo: {materia.data_protocolo}</span>
                    {materia.comissao_atual_nome && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <Layers size={12} /> {materia.comissao_atual_nome}
                      </span>
                    )}
                    {materia.pareceres && materia.pareceres.length > 0 && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 size={12} /> {materia.pareceres.length} Parecer(es)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lado Direito: Botões de Ação */}
              <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100 dark:border-neutral-800 shrink-0">
                <button
                  onClick={() => setActiveMateriaDetail(materia)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye size={14} /> Detalhes & Timeline
                </button>
                <button
                  onClick={() => {
                    setMateriaToEdit(materia);
                    setIsFormOpen(true);
                  }}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-amber-500 rounded-xl transition-colors cursor-pointer"
                  title="Editar Proposição"
                >
                  <Edit2 size={16} />
                </button>
                {onPrintDocumento && (
                  <button
                    onClick={() => onPrintDocumento(materia, 'autografo')}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-[#003B6F] dark:hover:text-sky-400 rounded-xl transition-colors cursor-pointer"
                    title="Emitir Autógrafo"
                  >
                    <Printer size={16} />
                  </button>
                )}
              </div>

            </motion.div>
          ))
        )}
      </div>

      {/* MODAL DE DETALHES & TIMELINE */}
      {activeMateriaDetail && (
        <MateriaDetailModal
          materia={activeMateriaDetail}
          comissoes={comissoes}
          vereadores={vereadores}
          onClose={handleCloseDetail}
          onAddTramitacao={onAddTramitacao}
          onAddParecer={onAddParecer}
          onPrintDocumento={onPrintDocumento}
        />
      )}

      {/* MODAL DE FORMULÁRIO (CRIAR/EDITAR) */}
      {isFormOpen && (
        <MateriaFormModal
          vereadores={vereadores}
          comissoes={comissoes}
          materiaParaEditar={materiaToEdit}
          onClose={() => setIsFormOpen(false)}
          onSave={m => {
            onSaveMateria(m);
            setIsFormOpen(false);
          }}
        />
      )}

    </div>
  );
};
