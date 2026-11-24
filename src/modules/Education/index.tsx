import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Baby,
  Users,
  FileText,
  HeartHandshake,
  Bell,
  Vote,
  Bus,
  QrCode,
  BookOpen,
  ShieldAlert,
  Database,
  LayoutGrid,
  Search,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ArrowLeft,
  Landmark,
  Briefcase
} from 'lucide-react';
import { EducationCrecheAdmin } from './components/EducationCrecheAdmin';
import { EducationStaffAdmin } from './components/EducationStaffAdmin';
import { EducationEnrollmentManager } from './components/EducationEnrollmentManager';
import { FamilyPortalView } from './components/FamilyPortalView';
import { FamilyAppQrModal } from './components/FamilyAppQrModal';
import { SchoolAnnouncementsManager } from './components/SchoolAnnouncementsManager';
import { EducationVotingAdmin } from './components/EducationVotingAdmin';
import { EducationTransportManager } from './components/TransporteEscolar/components/EducationTransportManager';
import { EducationClassDiaryManager } from './components/EducationClassDiaryManager';
import { EducationBuscaAtivaPanel } from './components/EducationBuscaAtivaPanel';
import { EducationEducacensoExport } from './components/EducationEducacensoExport';
import { EducationCouncilsManager } from './components/EducationCouncilsManager';
import { EducationEmployeesManager } from './components/EducationEmployeesManager';

interface EducationModuleProps {
  currentInstitution?: { id: string; name?: string; subdomain?: string } | null;
  currentUser?: any;
}

type EducationViewId =
  | 'home'
  | 'matriculas'
  | 'diario'
  | 'staff'
  | 'funcionarios'
  | 'conselhos'
  | 'busca_ativa'
  | 'educacenso'
  | 'creche'
  | 'transporte'
  | 'eleicao'
  | 'familia'
  | 'avisos';

interface EduMenuItem {
  id: Exclude<EducationViewId, 'home'>;
  label: string;
  shortDesc: string;
  icon: React.FC<{ size?: number; className?: string }>;
  group: 'gestao' | 'legal' | 'operacao' | 'familia';
  badge?: string;
  accentBg: string;
  accentText: string;
}

const EDU_GROUPS: Array<{
  id: 'gestao' | 'legal' | 'operacao' | 'familia';
  title: string;
  subtitle: string;
}> = [
  { id: 'gestao', title: 'Gestão Escolar & Pedagógica', subtitle: 'Rotina diária de secretaria, turmas e docentes' },
  { id: 'legal', title: 'Controle Legal & Censo', subtitle: 'Frequência LDB, INEP e transparência de vagas' },
  { id: 'operacao', title: 'Operação & Democracia', subtitle: 'Transporte escolar ao vivo e eleições diretas' },
  { id: 'familia', title: 'Família & Comunicação', subtitle: 'App dos pais, boletim digital e comunicados' }
];

const EDU_ITEMS: EduMenuItem[] = [
  {
    id: 'matriculas',
    label: 'Secretaria & Matrículas',
    shortDesc: 'Matrículas, boletins em PDF e declarações em 1 clique',
    icon: FileText,
    group: 'gestao',
    accentBg: 'bg-indigo-50 dark:bg-indigo-500/15',
    accentText: 'text-indigo-600 dark:text-indigo-400'
  },
  {
    id: 'diario',
    label: 'Diário de Classe',
    shortDesc: 'Chamada diária, conteúdo BNCC e modo offline rural',
    icon: BookOpen,
    group: 'gestao',
    badge: 'BNCC',
    accentBg: 'bg-blue-50 dark:bg-blue-500/15',
    accentText: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'staff',
    label: 'Professores & Equipe',
    shortDesc: 'Cadastro autorizado de docentes e equipe pedagógica',
    icon: Users,
    group: 'gestao',
    accentBg: 'bg-sky-50 dark:bg-sky-500/15',
    accentText: 'text-sky-600 dark:text-sky-400'
  },
  {
    id: 'funcionarios',
    label: 'Funcionários & Contratos',
    shortDesc: 'Quadro geral: cargo, modalidade de contratação, CPF, telefone e e-mail',
    icon: Briefcase,
    group: 'gestao',
    accentBg: 'bg-cyan-50 dark:bg-cyan-500/15',
    accentText: 'text-cyan-600 dark:text-cyan-400'
  },
  {
    id: 'conselhos',
    label: 'Conselhos da Educação',
    shortDesc: 'CME, FUNDEB e CAE: decretos, mandatos, conselheiros e atas',
    icon: Landmark,
    group: 'legal',
    accentBg: 'bg-indigo-50 dark:bg-indigo-500/15',
    accentText: 'text-indigo-600 dark:text-indigo-400'
  },
  {
    id: 'busca_ativa',
    label: 'Busca Ativa LDB',
    shortDesc: 'Alertas de faltas (75%/60%) e ofício ao Conselho Tutelar',
    icon: ShieldAlert,
    group: 'legal',
    accentBg: 'bg-rose-50 dark:bg-rose-500/15',
    accentText: 'text-rose-600 dark:text-rose-400'
  },
  {
    id: 'educacenso',
    label: 'Educacenso INEP',
    shortDesc: 'Conferência cadastral e exportação TXT oficial do censo',
    icon: Database,
    group: 'legal',
    accentBg: 'bg-amber-50 dark:bg-amber-500/15',
    accentText: 'text-amber-600 dark:text-amber-400'
  },
  {
    id: 'creche',
    label: 'Fila Única CMEI',
    shortDesc: 'Gestão transparente da fila de creche (compliance TAC-MP)',
    icon: Baby,
    group: 'legal',
    accentBg: 'bg-pink-50 dark:bg-pink-500/15',
    accentText: 'text-pink-600 dark:text-pink-400'
  },
  {
    id: 'transporte',
    label: 'Transporte Escolar',
    shortDesc: 'Rotas, veículos, app do monitor e rastreamento GPS ao vivo',
    icon: Bus,
    group: 'operacao',
    badge: 'GPS',
    accentBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    accentText: 'text-emerald-600 dark:text-emerald-400'
  },
  {
    id: 'eleicao',
    label: 'Eleição Escolar',
    shortDesc: 'Urna Diretor & Coordenador (SIM/NÃO), planilha e auditoria',
    icon: Vote,
    group: 'operacao',
    accentBg: 'bg-teal-50 dark:bg-teal-500/15',
    accentText: 'text-teal-600 dark:text-teal-400'
  },
  {
    id: 'familia',
    label: 'Portal da Família',
    shortDesc: 'Visualização do boletim qualitativo e vida escolar dos pais',
    icon: HeartHandshake,
    group: 'familia',
    accentBg: 'bg-purple-50 dark:bg-purple-500/15',
    accentText: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'avisos',
    label: 'Mural de Avisos',
    shortDesc: 'Comunicados oficiais para turmas com confirmação de ciência',
    icon: Bell,
    group: 'familia',
    accentBg: 'bg-violet-50 dark:bg-violet-500/15',
    accentText: 'text-violet-600 dark:text-violet-400'
  }
];

export const EducationModule: React.FC<EducationModuleProps> = ({
  currentInstitution,
  currentUser
}) => {
  const [educationView, setEducationView] = useState<EducationViewId>('home');
  const [searchMenu, setSearchMenu] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFamilyQrOpen, setIsFamilyQrOpen] = useState(false);

  const activeItem = useMemo(
    () => EDU_ITEMS.find((item) => item.id === educationView) || null,
    [educationView]
  );

  const filteredItems = useMemo(() => {
    const q = searchMenu.trim().toLowerCase();
    if (!q) return EDU_ITEMS;
    return EDU_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.shortDesc.toLowerCase().includes(q)
    );
  }, [searchMenu]);

  const handleSelectView = (view: EducationViewId) => {
    setEducationView(view);
    setMobileMenuOpen(false);
  };

  const renderSidebarNav = () => (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => handleSelectView('home')}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
          educationView === 'home'
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
            : 'bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-neutral-800'
        }`}
      >
        <LayoutGrid size={16} />
        <span>Central da Educação</span>
      </button>

      {EDU_GROUPS.map((group) => {
        const items = EDU_ITEMS.filter((i) => i.group === group.id);
        return (
          <div key={group.id} className="space-y-1">
            <div className="px-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = educationView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectView(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-black shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : `${item.accentBg} ${item.accentText}`
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="text-xs truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[9px] font-black text-neutral-500 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            setIsFamilyQrOpen(true);
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 text-xs font-black transition-colors cursor-pointer"
        >
          <QrCode size={15} className="shrink-0" />
          <span className="truncate">QR Code App dos Pais</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="pb-20 animate-in fade-in duration-300">
      {/* VISÃO 1: CENTRAL DA EDUCAÇÃO (HUB LIMPO EM CARDS POR EIXO) */}
      {educationView === 'home' ? (
        <div className="space-y-8">
          {/* Banner Superior Acolhedor + Busca Rápida */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/70 dark:border-neutral-800 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                  <GraduationCap size={30} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                    Secretaria de Educação
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Escolha uma área abaixo para começar — tudo organizado por rotina escolar.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchMenu}
                    onChange={(e) => setSearchMenu(e.target.value)}
                    placeholder="Buscar função (ex: diário, creche, urna)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsFamilyQrOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black hover:opacity-90 transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  <QrCode size={15} />
                  <span>QR Code App dos Pais</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grade Organizada nos 4 Eixos */}
          <div className="space-y-8">
            {EDU_GROUPS.map((group) => {
              const groupItems = filteredItems.filter((i) => i.group === group.id);
              if (groupItems.length === 0) return null;

              return (
                <section key={group.id} className="space-y-3.5">
                  <div className="px-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                      {group.title}
                    </h3>
                    <p className="text-xs text-neutral-500">{group.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectView(item.id)}
                          className="group bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/70 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs hover:shadow-md transition-all text-left flex items-start gap-4 cursor-pointer active:scale-[0.99]"
                        >
                          <div
                            className={`w-12 h-12 rounded-2xl ${item.accentBg} ${item.accentText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                          >
                            <Icon size={23} />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-sm sm:text-base text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                {item.label}
                              </span>
                              <ChevronRight
                                size={16}
                                className="text-neutral-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0"
                              />
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
                              {item.shortDesc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-10 text-center border border-neutral-200/70 dark:border-neutral-800 space-y-2">
                <p className="text-sm font-black text-neutral-700 dark:text-neutral-200">
                  Nenhuma funcionalidade encontrada para &ldquo;{searchMenu}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setSearchMenu('')}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Limpar busca
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VISÃO 2: AMBIENTE DE TRABALHO COM SIDEBAR LATERAL LIMPA + BREADCRUMB */
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar Lateral Desktop (Recolhível) */}
          {!sidebarCollapsed && (
            <aside className="hidden lg:block w-64 shrink-0 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/70 dark:border-neutral-800 p-4 shadow-xs sticky top-4">
              {renderSidebarNav()}
            </aside>
          )}

          {/* Drawer Mobile/Tablet */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs lg:hidden flex"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                className="w-72 max-w-[85vw] bg-white dark:bg-neutral-900 h-full p-5 overflow-y-auto shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 font-black text-sm text-neutral-900 dark:text-white">
                    <GraduationCap size={18} className="text-indigo-600" />
                    <span>Educação</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <X size={18} />
                  </button>
                </div>
                {renderSidebarNav()}
              </div>
            </div>
          )}

          {/* Área de Conteúdo Principal */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Barra Contextual Limpa (Breadcrumb + Voltar + Expandir Tela) */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/70 dark:border-neutral-800 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                  title="Abrir menu da Educação"
                >
                  <Menu size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  className="hidden lg:inline-flex p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  title={sidebarCollapsed ? 'Mostrar menu lateral' : 'Expandir tela (recolher menu)'}
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectView('home')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                >
                  <ArrowLeft size={14} />
                  <span className="hidden sm:inline">Central</span>
                </button>

                <span className="text-neutral-300 dark:text-neutral-700">/</span>

                {activeItem && (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-7 h-7 rounded-lg ${activeItem.accentBg} ${activeItem.accentText} flex items-center justify-center shrink-0`}>
                      <activeItem.icon size={15} />
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white truncate">
                      {activeItem.label}
                    </h2>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFamilyQrOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/70 dark:border-indigo-800 cursor-pointer"
              >
                <QrCode size={14} />
                <span className="hidden sm:inline">QR Code App dos Pais</span>
                <span className="sm:hidden">QR Pais</span>
              </button>
            </div>

            {/* Submódulo Ativo */}
            <AnimatePresence mode="wait">
              {educationView === 'staff' && (
                <motion.div
                  key="staff"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationStaffAdmin />
                </motion.div>
              )}

              {educationView === 'funcionarios' && (
                <motion.div
                  key="funcionarios"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationEmployeesManager
                    institutionId={currentInstitution?.id || 'inst_1'}
                  />
                </motion.div>
              )}

              {educationView === 'conselhos' && (
                <motion.div
                  key="conselhos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationCouncilsManager
                    institutionId={currentInstitution?.id || 'inst_1'}
                  />
                </motion.div>
              )}

              {educationView === 'matriculas' && (
                <motion.div
                  key="matriculas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationEnrollmentManager />
                </motion.div>
              )}

              {educationView === 'diario' && (
                <motion.div
                  key="diario"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationClassDiaryManager
                    institutionId={currentInstitution?.id || 'inst_1'}
                    teacherName={currentUser?.name}
                  />
                </motion.div>
              )}

              {educationView === 'busca_ativa' && (
                <motion.div
                  key="busca_ativa"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationBuscaAtivaPanel
                    institutionId={currentInstitution?.id || 'inst_1'}
                    municipalityName={currentInstitution?.name}
                  />
                </motion.div>
              )}

              {educationView === 'educacenso' && (
                <motion.div
                  key="educacenso"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationEducacensoExport
                    institutionId={currentInstitution?.id || 'inst_1'}
                    municipalityName={currentInstitution?.name}
                  />
                </motion.div>
              )}

              {educationView === 'creche' && (
                <motion.div
                  key="creche"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationCrecheAdmin />
                </motion.div>
              )}

              {educationView === 'transporte' && (
                <motion.div
                  key="transporte"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationTransportManager
                    institutionId={currentInstitution?.id || 'inst_1'}
                    currentUserName={currentUser?.name}
                  />
                </motion.div>
              )}

              {educationView === 'eleicao' && (
                <motion.div
                  key="eleicao"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <EducationVotingAdmin />
                </motion.div>
              )}

              {educationView === 'familia' && (
                <motion.div
                  key="familia"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <FamilyPortalView
                    institutionId={currentInstitution?.id || 'inst_1'}
                  />
                </motion.div>
              )}

              {educationView === 'avisos' && (
                <motion.div
                  key="avisos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <SchoolAnnouncementsManager />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <FamilyAppQrModal
        isOpen={isFamilyQrOpen}
        onClose={() => setIsFamilyQrOpen(false)}
        institutionName={currentInstitution?.name || 'Rede Municipal de Ensino'}
      />
    </div>
  );
};
