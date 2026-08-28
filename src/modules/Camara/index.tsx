import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, FileText, Vote, Users, Calendar, Plus, 
  MessageSquare, ShieldCheck, Printer, HeartHandshake, 
  Layers, Search, Globe, ChevronRight, Activity, ArrowRightLeft
} from 'lucide-react';
import { CamaraService } from './services/camaraService';
import { 
  MateriaLegislativa, SessaoPlenaria, Vereador, Comissao, 
  Indicacao, Tramitacao, Parecer 
} from './types';
import { CamaraDashboard } from './components/CamaraDashboard';
import { MateriasLegislativas } from './components/MateriasLegislativas';
import { PlenarioSessao } from './components/PlenarioSessao';
import { ComissoesLegislativas } from './components/ComissoesLegislativas';
import { VereadoresGabinetes } from './components/VereadoresGabinetes';
import { IndicacoesRastreamento } from './components/IndicacoesRastreamento';
import { RadarPNTPCamara } from './components/RadarPNTPCamara';
import { DocumentosOficiais } from './components/DocumentosOficiais';
import { PortalCidadaoCamara } from './components/PortalCidadaoCamara';
import { MateriaFormModal } from './components/MateriaFormModal';
import { showToast } from '../../components/ui/Toast';

export type CamaraTab = 
  | 'dashboard' 
  | 'materias' 
  | 'plenario' 
  | 'comissoes' 
  | 'vereadores' 
  | 'indicacoes' 
  | 'pntp' 
  | 'documentos' 
  | 'portal';

interface TabItem {
  id: CamaraTab;
  label: string;
  icon: any;
  badge?: string | number;
}

export const CamaraModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CamaraTab>('dashboard');
  const [loading, setLoading] = useState(true);

  // Estados dos Dados Centrais
  const [materias, setMaterias] = useState<MateriaLegislativa[]>([]);
  const [sessoes, setSessoes] = useState<SessaoPlenaria[]>([]);
  const [vereadores, setVereadores] = useState<Vereador[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);

  // Modais e navegações cruzadas
  const [isNovaMateriaModalOpen, setIsNovaMateriaModalOpen] = useState(false);
  const [selectedMateriaForDetail, setSelectedMateriaForDetail] = useState<MateriaLegislativa | null>(null);
  const [selectedMateriaForPrint, setSelectedMateriaForPrint] = useState<MateriaLegislativa | null>(null);
  const [printDocTipo, setPrintDocTipo] = useState<string>('autografo');

  // Carregamento inicial de dados
  const loadData = async () => {
    try {
      const [ver, com, mat, ses, ind] = await Promise.all([
        CamaraService.getVereadores(),
        CamaraService.getComissoes(),
        CamaraService.getMaterias(),
        CamaraService.getSessoes(),
        CamaraService.getIndicacoes()
      ]);
      setVereadores(ver);
      setComissoes(com);
      setMaterias(mat);
      setSessoes(ses);
      setIndicacoes(ind);
    } catch (e) {
      console.error('Erro ao carregar dados da câmara:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers de Salvamento e Atualização
  const handleSaveMateria = async (materia: MateriaLegislativa) => {
    const saved = await CamaraService.saveMateria(materia);
    setMaterias(prev => {
      const idx = prev.findIndex(m => m.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    showToast(`Matéria ${saved.numero} atualizada com sucesso!`, 'success');
  };

  const handleAddTramitacao = async (materiaId: string, tramitacao: Omit<Tramitacao, 'id' | 'materia_id'>) => {
    const updated = await CamaraService.addTramitacao(materiaId, tramitacao);
    if (updated) {
      setMaterias(prev => prev.map(m => m.id === materiaId ? updated : m));
      showToast('Nova fase da tramitação registrada!', 'success');
    }
  };

  const handleAddParecer = async (materiaId: string, parecer: Omit<Parecer, 'id' | 'materia_id'>) => {
    const updated = await CamaraService.addParecer(materiaId, parecer);
    if (updated) {
      setMaterias(prev => prev.map(m => m.id === materiaId ? updated : m));
      showToast('Parecer da Comissão registrado com sucesso!', 'success');
    }
  };

  const handleSaveVereador = async (vereador: Vereador) => {
    const saved = await CamaraService.saveVereador(vereador);
    setVereadores(prev => {
      const idx = prev.findIndex(v => v.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    showToast(`Vereador(a) ${saved.nome_parlamentar} salvo com sucesso!`, 'success');
  };

  const handleSaveSessao = async (sessao: SessaoPlenaria) => {
    const saved = await CamaraService.saveSessao(sessao);
    setSessoes(prev => {
      const idx = prev.findIndex(s => s.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  const handleSaveIndicacao = async (indicacao: Indicacao) => {
    const saved = await CamaraService.saveIndicacao(indicacao);
    setIndicacoes(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  const handlePrintDocumento = (materia: MateriaLegislativa, tipoDoc: string) => {
    setSelectedMateriaForPrint(materia);
    setPrintDocTipo(tipoDoc);
    setActiveTab('documentos');
  };

  // Sessão ativa no Plenário
  const sessaoAtiva = sessoes.find(s => s.status === 'Em Andamento') || sessoes[0];

  const countMateriasTramitando = materias.filter(m => !['Sancionado', 'Promulgado', 'Arquivado', 'Rejeitado'].includes(m.status)).length;
  const countIndicacoesPendentes = indicacoes.filter(i => ['Encaminhado', 'Em Análise', 'Vencido'].includes(i.status)).length;

  const TABS: TabItem[] = [
    { id: 'dashboard', label: 'Painel Geral', icon: Activity },
    { id: 'materias', label: 'Processo Legislativo', icon: FileText, badge: countMateriasTramitando },
    { id: 'plenario', label: 'Plenário & Votação', icon: Vote, badge: sessaoAtiva?.status === 'Em Andamento' ? 'AO VIVO' : undefined },
    { id: 'comissoes', label: 'Comissões', icon: Layers },
    { id: 'vereadores', label: 'Vereadores & Mesa', icon: Users },
    { id: 'indicacoes', label: 'Indicações Prefeitura', icon: MessageSquare, badge: countIndicacoesPendentes > 0 ? countIndicacoesPendentes : undefined },
    { id: 'pntp', label: 'Radar PNTP', icon: ShieldCheck },
    { id: 'documentos', label: 'Documentos Oficiais', icon: Printer },
    { id: 'portal', label: 'Portal do Cidadão', icon: HeartHandshake },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-[#003B6F] border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-neutral-500">Carregando Câmara 360...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-['Inter']">
      
      {/* 1. CABEÇALHO DA CÂMARA 360 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-[#003B6F]/10 dark:bg-sky-500/10 text-[#003B6F] dark:text-sky-400 text-[10px] font-black uppercase tracking-wider rounded-md">
              Poder Legislativo Municipal
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Gestão 360 Legislativa
            </span>
          </div>

          <h2 className="text-3xl font-black text-[#003B6F] dark:text-white tracking-tight flex items-center gap-3 font-['Montserrat']">
            <Landmark className="text-[#003B6F] dark:text-sky-400" size={32} />
            Câmara 360
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
            Plataforma Integrada: SAPL Eletrônico, Painel de Plenário com Telão, Comissões, Vereadores e Transparência ATRICON.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsNovaMateriaModalOpen(true)}
            className="px-6 py-3 bg-[#003B6F] hover:bg-[#002b52] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-[#003B6F]/20 cursor-pointer"
          >
            <Plus size={16} /> Protocolar Matéria
          </button>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO POR ABAS HORIZONTAIS */}
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden print:hidden">
        <div className="flex overflow-x-auto hide-scrollbar p-2 gap-1.5 border-b border-neutral-100 dark:border-neutral-800">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-[#003B6F] text-white shadow-md shadow-[#003B6F]/20' 
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : tab.badge === 'AO VIVO'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL DAS ABAS */}
      <div className="min-h-[50vh]">
        <AnimatePresence mode="wait">
          
          {/* ABA: PAINEL GERAL (DASHBOARD) */}
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <CamaraDashboard
                materias={materias}
                sessoes={sessoes}
                indicacoes={indicacoes}
                vereadores={vereadores}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenNovaMateria={() => setIsNovaMateriaModalOpen(true)}
                onOpenNovaIndicacao={() => setActiveTab('indicacoes')}
                onSelectMateria={(mat) => {
                  setSelectedMateriaForDetail(mat);
                  setActiveTab('materias');
                }}
                onStartSessao={() => setActiveTab('plenario')}
              />
            </motion.div>
          )}

          {/* ABA: PROCESSO LEGISLATIVO (SAPL) */}
          {activeTab === 'materias' && (
            <motion.div key="materias" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <MateriasLegislativas
                materias={materias}
                comissoes={comissoes}
                vereadores={vereadores}
                onSaveMateria={handleSaveMateria}
                onAddTramitacao={handleAddTramitacao}
                onAddParecer={handleAddParecer}
                onPrintDocumento={handlePrintDocumento}
                selectedMateriaFromOutside={selectedMateriaForDetail}
                onClearSelectedMateria={() => setSelectedMateriaForDetail(null)}
              />
            </motion.div>
          )}

          {/* ABA: PLENÁRIO & VOTAÇÃO AO VIVO */}
          {activeTab === 'plenario' && sessaoAtiva && (
            <motion.div key="plenario" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <PlenarioSessao
                sessao={sessaoAtiva}
                materias={materias}
                vereadores={vereadores}
                onSaveSessao={handleSaveSessao}
                onSaveMateria={handleSaveMateria}
                onPrintAta={() => {
                  setPrintDocTipo('ata');
                  setActiveTab('documentos');
                }}
              />
            </motion.div>
          )}

          {/* ABA: COMISSÕES PERMANENTES */}
          {activeTab === 'comissoes' && (
            <motion.div key="comissoes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ComissoesLegislativas
                comissoes={comissoes}
                materias={materias}
                vereadores={vereadores}
                onSelectMateria={(mat) => {
                  setSelectedMateriaForDetail(mat);
                  setActiveTab('materias');
                }}
                onOpenNovaMateria={() => setIsNovaMateriaModalOpen(true)}
              />
            </motion.div>
          )}

          {/* ABA: VEREADORES & MESA DIRETORA */}
          {activeTab === 'vereadores' && (
            <motion.div key="vereadores" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <VereadoresGabinetes
                vereadores={vereadores}
                onSaveVereador={handleSaveVereador}
              />
            </motion.div>
          )}

          {/* ABA: INDICAÇÕES & RASTREAMENTO PREFEITURA */}
          {activeTab === 'indicacoes' && (
            <motion.div key="indicacoes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <IndicacoesRastreamento
                indicacoes={indicacoes}
                vereadores={vereadores}
                onSaveIndicacao={handleSaveIndicacao}
              />
            </motion.div>
          )}

          {/* ABA: RADAR PNTP (ATRICON) */}
          {activeTab === 'pntp' && (
            <motion.div key="pntp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <RadarPNTPCamara />
            </motion.div>
          )}

          {/* ABA: DOCUMENTOS OFICIAIS & AUTÓGRAFOS */}
          {activeTab === 'documentos' && (
            <motion.div key="documentos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <DocumentosOficiais
                materias={materias}
                sessoes={sessoes}
                vereadores={vereadores}
                indicacoes={indicacoes}
                preSelectedMateria={selectedMateriaForPrint}
                preSelectedTipo={printDocTipo}
              />
            </motion.div>
          )}

          {/* ABA: PORTAL DO CIDADÃO */}
          {activeTab === 'portal' && (
            <motion.div key="portal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <PortalCidadaoCamara
                vereadores={vereadores}
                materias={materias}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL GLOBAL DE NOVA MATÉRIA */}
      {isNovaMateriaModalOpen && (
        <MateriaFormModal
          vereadores={vereadores}
          comissoes={comissoes}
          onClose={() => setIsNovaMateriaModalOpen(false)}
          onSave={mat => {
            handleSaveMateria(mat);
            setIsNovaMateriaModalOpen(false);
          }}
        />
      )}

    </div>
  );
};
