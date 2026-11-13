import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Building2, User, LifeBuoy, Activity, Bell, 
  UploadCloud, GraduationCap, FileSpreadsheet, FileText, 
  Sparkles, X, ArrowRight, CornerDownLeft, ShieldCheck,
  Bot
} from 'lucide-react';
import { Institution, AdminUser, SupportTicket } from '../../types';
import { SaaSActiveTab, CommandPaletteItem } from './types';

interface SaaSCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: SaaSActiveTab) => void;
  institutions: Institution[];
  adminUsers: AdminUser[];
  onSelectTenant?: (tenant: Institution) => void;
  onOpenCreateTenant?: () => void;
  onOpenCreateUser?: () => void;
  onOpenCreateAnnouncement?: () => void;
}

export const SaaSCommandPalette: React.FC<SaaSCommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  institutions,
  adminUsers,
  onSelectTenant,
  onOpenCreateTenant,
  onOpenCreateUser,
  onOpenCreateAnnouncement
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Tecla de atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // abre
          onClose(); // disparador externo
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Construção de itens pesquisáveis
  const allItems: CommandPaletteItem[] = [
    // Ações Rápidas
    {
      id: 'act-new-tenant',
      title: 'Cadastrar Novo Município',
      subtitle: 'Provisionar nova prefeitura e definir módulos',
      category: 'Ações Rápidas',
      icon: Building2,
      action: () => {
        onNavigateTab('tenants');
        onClose();
        if (onOpenCreateTenant) onOpenCreateTenant();
      }
    },
    {
      id: 'act-new-user',
      title: 'Cadastrar Novo Servidor',
      subtitle: 'Criar acesso com Auth real e permissões',
      category: 'Ações Rápidas',
      icon: User,
      action: () => {
        onNavigateTab('users');
        onClose();
        if (onOpenCreateUser) onOpenCreateUser();
      }
    },
    {
      id: 'act-new-announcement',
      title: 'Publicar Comunicado Oficial',
      subtitle: 'Enviar alerta para os painéis municipais',
      category: 'Ações Rápidas',
      icon: Bell,
      action: () => {
        onNavigateTab('announcements');
        onClose();
        if (onOpenCreateAnnouncement) onOpenCreateAnnouncement();
      }
    },

    // Módulos e Telas
    {
      id: 'nav-agent-office',
      title: 'Escritório dos Agentes (Ao Vivo)',
      subtitle: 'Simulador isométrico em tempo real dos agentes especialistas',
      category: 'Módulos',
      icon: Bot,
      action: () => { onNavigateTab('agent-office'); onClose(); }
    },
    {
      id: 'nav-tenants',
      title: 'Municípios & Redes Parceiras',
      subtitle: 'Painel com todos os tenants municipais',
      category: 'Módulos',
      icon: Building2,
      action: () => { onNavigateTab('tenants'); onClose(); }
    },
    {
      id: 'nav-support',
      title: 'Central de Suporte & Chat ao Vivo',
      subtitle: 'Atendimento em tempo real com transbordo humano',
      category: 'Módulos',
      icon: LifeBuoy,
      action: () => { onNavigateTab('support'); onClose(); }
    },
    {
      id: 'nav-users',
      title: 'Acessos & Permissões Granulares',
      subtitle: 'Gestão de servidores municipais e senhas',
      category: 'Módulos',
      icon: ShieldCheck,
      action: () => { onNavigateTab('users'); onClose(); }
    },
    {
      id: 'nav-health',
      title: 'Diagnóstico & Trilha de Auditoria',
      subtitle: 'Monitoramento de integridade e logs globais',
      category: 'Módulos',
      icon: Activity,
      action: () => { onNavigateTab('health'); onClose(); }
    },
    {
      id: 'nav-announcements',
      title: 'Comunicados Oficiais',
      subtitle: 'Alertas prioritários para prefeituras',
      category: 'Módulos',
      icon: Bell,
      action: () => { onNavigateTab('announcements'); onClose(); }
    },
    {
      id: 'nav-education',
      title: 'Gestão Escolar Integrada (SAEB)',
      subtitle: 'Visão consolidada das escolas municipais',
      category: 'Módulos',
      icon: GraduationCap,
      action: () => { onNavigateTab('education'); onClose(); }
    },
    {
      id: 'nav-import',
      title: 'Migração & Importação em Lote',
      subtitle: 'Carga de servidores, patrimônio e alunos',
      category: 'Módulos',
      icon: UploadCloud,
      action: () => { onNavigateTab('import'); onClose(); }
    },
    {
      id: 'nav-pdf',
      title: 'Extrator Fiscal Inteligente (PDF)',
      subtitle: 'Análise de notas fiscais com IA',
      category: 'Módulos',
      icon: FileSpreadsheet,
      action: () => { onNavigateTab('pdf-extractor'); onClose(); }
    },
    {
      id: 'nav-proposal',
      title: 'Gerador de Propostas Comerciais & TR',
      subtitle: 'Modelos de termos de referência para prefeituras',
      category: 'Módulos',
      icon: FileText,
      action: () => { onNavigateTab('proposal'); onClose(); }
    },

    // Municípios
    ...institutions.map(inst => ({
      id: `inst-${inst.id}`,
      title: inst.name,
      subtitle: `Slug: ${inst.subdomain || 'sem slug'} · Status: ${inst.status || 'ativo'}`,
      category: 'Municípios' as const,
      icon: Building2,
      action: () => {
        onNavigateTab('tenants');
        onClose();
        if (onSelectTenant) onSelectTenant(inst);
      }
    })),

    // Servidores Principais
    ...adminUsers.slice(0, 30).map(u => ({
      id: `user-${u.id}`,
      title: u.name,
      subtitle: `${u.email} · Perfil: ${u.role}`,
      category: 'Servidores' as const,
      icon: User,
      action: () => {
        onNavigateTab('users');
        onClose();
      }
    }))
  ];

  // Filtragem
  const filtered = allItems.filter(item => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  }).slice(0, 20);

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col font-sans select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de Pesquisa */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite para buscar prefeituras, servidores, chamados ou ferramentas... (Esc para sair)"
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-neutral-100 dark:divide-neutral-800/40">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;

            return (
              <div
                key={item.id}
                onClick={() => item.action()}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition text-xs ${
                  isSelected
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 text-neutral-900 dark:text-white border border-amber-500/30'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isSelected ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate flex items-center gap-2">
                      <span className="truncate">{item.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0">
                        {item.category}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-neutral-400">
                  {isSelected && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-neutral-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Nenhum resultado encontrado</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Tente buscar por nome de prefeitura, e-mail ou módulo.</p>
            </div>
          )}
        </div>

        {/* Footer com Dicas de Atalhos */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950/80 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ para navegar</span>
            <span>↵ para selecionar</span>
            <span>Esc para fechar</span>
          </div>
          <span className="text-amber-500 font-bold">Gestão 360 SaaS Cockpit</span>
        </div>
      </div>
    </div>
  );
};

export default SaaSCommandPalette;

