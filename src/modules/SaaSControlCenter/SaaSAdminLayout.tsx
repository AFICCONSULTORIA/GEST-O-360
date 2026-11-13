import React, { useState } from 'react';
import { 
  Building2, LifeBuoy, ShieldCheck, Activity, Bell, 
  HeartPulse, UploadCloud, GraduationCap, FileSpreadsheet, 
  FileText, Sun, Moon, LogOut, Search, Menu, X, 
  ChevronRight, ChevronLeft, Compass, ShieldAlert, Sparkles, CheckCircle2,
  Bot
} from 'lucide-react';
import { SaaSActiveTab, SaaSNavGroup } from './types';
import { Institution, AdminUser } from '../../types';

interface SaaSAdminLayoutProps {
  activeTab: SaaSActiveTab;
  onSelectTab: (tab: SaaSActiveTab) => void;
  onOpenCommandPalette: () => void;
  institutionsCount: number;
  usersCount: number;
  openTicketsCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignOut: () => void;
  currentUser: AdminUser | null;
  children: React.ReactNode;
}

export const SaaSAdminLayout: React.FC<SaaSAdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  onOpenCommandPalette,
  institutionsCount,
  usersCount,
  openTicketsCount,
  darkMode,
  onToggleDarkMode,
  onSignOut,
  currentUser,
  children
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Agrupamento estruturado das capacidades da plataforma
  const navGroups: SaaSNavGroup[] = [
    {
      id: 'core',
      title: 'Visão Executiva & Rede',
      items: [
        {
          id: 'tenants',
          label: 'Municípios (Tenants)',
          icon: Building2,
          badge: institutionsCount,
          badgeColor: 'emerald',
          description: 'Ciclo de vida e módulos contratados'
        },
        {
          id: 'agent-office',
          label: 'Escritório dos Agentes',
          icon: Bot,
          badge: 'Ao Vivo',
          badgeColor: 'emerald',
          description: 'Simulador isométrico e telemetria dos agentes'
        },
        {
          id: 'health',
          label: 'Diagnóstico & Auditoria',
          icon: Activity,
          description: 'Integridade de banco, IA e logs'
        }
      ]
    },
    {
      id: 'support_group',
      title: 'Atendimento em Tempo Real',
      items: [
        {
          id: 'support',
          label: 'Central de Suporte & Chat',
          icon: LifeBuoy,
          badge: openTicketsCount > 0 ? openTicketsCount : undefined,
          badgeColor: 'amber',
          description: 'Chat ao vivo e transbordo humano'
        }
      ]
    },
    {
      id: 'security_governance',
      title: 'Segurança & Servidores',
      items: [
        {
          id: 'users',
          label: 'Acessos & Permissões',
          icon: ShieldCheck,
          badge: usersCount,
          badgeColor: 'sky',
          description: 'Servidores municipais e senhas'
        },
        {
          id: 'announcements',
          label: 'Comunicados Oficiais',
          icon: Bell,
          description: 'Alertas prioritários para prefeituras'
        }
      ]
    },
    {
      id: 'specialists',
      title: 'Módulos Especialistas',
      items: [
        {
          id: 'saude',
          label: 'Saúde Pública (SUS/PEP)',
          icon: HeartPulse,
          description: 'Regulação, exames e farmácia FEFO'
        },
        {
          id: 'education',
          label: 'Gestão Escolar (SAEB)',
          icon: GraduationCap,
          description: 'Visão consolidada da rede de ensino'
        },
        {
          id: 'import',
          label: 'Migração & Carga em Lote',
          icon: UploadCloud,
          description: 'Carga de servidores, patrimônio e alunos'
        },
        {
          id: 'pdf-extractor',
          label: 'Extrator Fiscal (PDF)',
          icon: FileSpreadsheet,
          description: 'Análise de notas fiscais com IA'
        },
        {
          id: 'proposal',
          label: 'Propostas Comerciais & TR',
          icon: FileText,
          description: 'Minutas de TR e termos contratuais'
        }
      ]
    }
  ];

  const handleTabClick = (tab: SaaSActiveTab) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans select-none">
      
      {/* ========================================================
          SIDEBAR EXECUTIVA (GESTAO 360 COCKPIT)
         ======================================================== */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 shadow-xl lg:shadow-none ${
          isSidebarOpen ? 'w-72' : 'w-20'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Topo da Sidebar (Logo Compass 360) */}
        <div className={`h-16 flex items-center border-b border-neutral-200 dark:border-neutral-800 shrink-0 ${
          isSidebarOpen ? 'px-4 justify-between' : 'justify-center px-2'
        }`}>
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-2xl bg-neutral-950 dark:bg-neutral-800 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                  <Compass className="w-5 h-5 animate-[spin_16s_linear_infinite]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-black tracking-wide text-neutral-900 dark:text-white truncate">
                    Gestão 360 <span className="text-amber-500">SaaS</span>
                  </h1>
                  <p className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase truncate">
                    Superadmin Cockpit
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="hidden lg:flex p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                title="Recolher menu lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-12 h-12 rounded-2xl bg-neutral-950 dark:bg-neutral-800 border border-amber-500/40 hover:border-amber-500 flex items-center justify-center text-amber-400 hover:text-amber-300 shadow-md transition-all group"
              title="Expandir menu lateral"
            >
              <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            </button>
          )}
        </div>

        {/* Links de Navegação Agrupados */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {isSidebarOpen && (
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 block mb-1.5">
                  {group.title}
                </span>
              )}

              {group.items?.filter(Boolean).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`relative flex items-center transition-all ${
                      isSidebarOpen
                        ? `w-full gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold ${
                            isActive
                              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-black'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-white'
                          }`
                        : `w-12 h-12 mx-auto justify-center rounded-2xl ${
                            isActive
                              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-black'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-white'
                          }`
                    }`}
                    title={!isSidebarOpen ? (item?.label || '') : undefined}
                  >
                    {Icon && <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-neutral-950' : 'text-neutral-500 dark:text-neutral-400'}`} />}
                    
                    {isSidebarOpen && (
                      <span className="truncate flex-1 text-left">
                        {item?.label || ''}
                      </span>
                    )}

                    {isSidebarOpen && item.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                        isActive
                          ? 'bg-neutral-950 text-amber-400'
                          : item.badgeColor === 'amber'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {!isSidebarOpen && item.badge !== undefined && (
                      <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-neutral-900 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Perfil do Superadmin na Base da Sidebar */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0 bg-neutral-50/50 dark:bg-neutral-950/50">
          <div className={`flex items-center gap-2.5 ${!isSidebarOpen && 'justify-center'}`} title={currentUser?.name || 'Super Administrador'}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-neutral-950 flex items-center justify-center font-black text-xs shadow-md shrink-0">
              SA
            </div>
            {isSidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {currentUser?.name || 'Super Administrador'}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Super Admin Ativo
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================
          ÁREA PRINCIPAL DE CONTEÚDO (MAIN WORKSPACE)
         ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Bar Fixa Executiva */}
        <header className="h-16 px-4 sm:px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition"
              title="Abrir menu mobile"
            >
              <Menu className="w-5 h-5" />
            </button>

            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="hidden lg:flex p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                title="Expandir menu lateral"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {/* Botão de Busca Rápida (Command Palette Trigger) */}
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 text-xs text-neutral-500 dark:text-neutral-400 transition"
              title="Abrir busca global rápida (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Buscar na rede...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-[10px] font-mono text-neutral-600 dark:text-neutral-300">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Status e Ações do Topo */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Rede Operacional</span>
            </div>

            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition"
              title={darkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>

            <button
              onClick={onSignOut}
              className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 transition flex items-center gap-1.5 text-xs font-bold"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* Workspace Scrollável */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-neutral-50 dark:bg-neutral-950/60 custom-scrollbar">
          {children}
        </main>
      </div>

      {/* Overlay para fechar menu mobile */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}
    </div>
  );
};

export default SaaSAdminLayout;

