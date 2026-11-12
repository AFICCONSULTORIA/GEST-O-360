import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, X, Search, Filter, Sparkles, Copy, Check, CheckCircle2, 
  Lock, Eye, Edit3, SlidersHorizontal, Layers, Stethoscope, HeartPulse, 
  Fuel, Scale, Building2, Landmark, Compass, BookText, PieChart, 
  FileText, Briefcase, Package, ShoppingCart, Calculator, FileBadge, 
  BookOpen, Calendar, GraduationCap, Wrench, HardHat, Leaf, Tractor, 
  HeartHandshake, Trophy, Map, Home, Settings, ClipboardList, Headphones, 
  Users2, RefreshCw, AlertCircle, ArrowRight, Pill, UserCheck,
  Globe, Newspaper, MessageSquare, Receipt, Award, LifeBuoy, Wallet
} from 'lucide-react';
import { AdminUser, View } from '../../../types';
import { showToast } from '../../../components/ui/Toast';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export interface PermissionDef {
  id: View;
  label: string;
  desc: string;
  icon: React.ComponentType<any>;
  badge?: string;
  highlight?: boolean;
}

export interface PermissionGroup {
  id: string;
  title: string;
  shortTitle: string;
  desc: string;
  icon: React.ComponentType<any>;
  items: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'secretarias',
    title: 'Secretarias Temáticas & Atendimento',
    shortTitle: 'Secretarias',
    desc: 'Módulos operacionais de secretarias específicas e atendimento ao cidadão.',
    icon: Building2,
    items: [
      { 
        id: 'saude', 
        label: 'Saúde: Regulação & Farmácia', 
        desc: 'Fila SUS, agendamentos, controle de exames anti-duplicidade e farmácia básica.', 
        icon: HeartPulse,
        badge: 'Regulação SUS',
        highlight: true
      },
      { 
        id: 'consultorio_medico', 
        label: 'Saúde: Consultório Médico & Triagem (PEP)', 
        desc: 'Atendimento médico SOAP, triagem de enfermagem com sinais vitais e prescrição conectada.', 
        icon: Stethoscope,
        badge: 'Área Clínica',
        highlight: true
      },
      { id: 'education', label: 'Educação Municipal', desc: 'Controle de matrículas, transporte escolar, diários e SAEB.', icon: GraduationCap },
      { id: 'assistencia_social', label: 'Assistência Social', desc: 'Cadastro único e programas assistenciais.', icon: HeartHandshake },
      { id: 'obras', label: 'Obras e Infraestrutura', desc: 'Acompanhamento físico e financeiro de obras públicas.', icon: HardHat },
      { id: 'servicos_publicos', label: 'Serviços Públicos', desc: 'Ouvidoria de reclamações e manutenção urbana.', icon: Wrench },
      { id: 'meio_ambiente', label: 'Meio Ambiente', desc: 'Licenciamento ambiental, denúncias e fiscalização.', icon: Leaf },
      { id: 'agricultura', label: 'Agricultura & Apoio Rural', desc: 'Apoio ao produtor rural e frotas agrícolas.', icon: Tractor },
      { id: 'esporte', label: 'Esportes e Lazer', desc: 'Eventos esportivos e praças de esportes.', icon: Trophy },
      { id: 'planejamento', label: 'Planejamento Urbano', desc: 'Plano diretor, zoneamento e diretrizes urbanas.', icon: Map },
      { id: 'administracao', label: 'Administração Geral', desc: 'Portal administrativo de RH e gestão interna.', icon: Building2 },
      { id: 'financas', label: 'Finanças & Orçamento', desc: 'Orçamentário, despesas e arrecadação municipal.', icon: Landmark },
      { id: 'tributos', label: 'Tributos e Arrecadação', desc: 'Acompanhamento fiscal e impostos municipais.', icon: Calculator },
      { id: 'ouvidoria', label: 'Ouvidoria Municipal', desc: 'Gestão, triagem e resposta de manifestações dos cidadãos.', icon: Headphones },
    ]
  },
  {
    id: 'governanca',
    title: 'Governança, Controle & Legislativo',
    shortTitle: 'Governança & Controle',
    desc: 'Controle de conformidade, riscos, frotas, auditoria e atividades legislativas.',
    icon: Shield,
    items: [
      { id: 'controls', label: 'Controles Internos', desc: 'Monitoramento de procedimentos, prazos e apontamentos TCE.', icon: ClipboardList },
      { id: 'fleet_fuel', label: 'Frotas & Abastecimento', desc: 'Ordens digitais de combustível, adiantamentos, conferência e auditoria TCE.', icon: Fuel, badge: 'Frotas', highlight: true },
      { id: 'accounting_changes', label: 'Alterações na Contabilidade', desc: 'Controle de solicitações, trilha de auditoria contábil e pareceres.', icon: Scale },
      { id: 'risk', label: 'Gestão de Riscos', desc: 'Identificação e matriz de tratamento de riscos da gestão.', icon: Shield },
      { id: 'pntp', label: 'Radar PNTP', desc: 'Evidências do PNTP e conformidade do portal de transparência.', icon: Compass },
      { id: 'camara', label: 'Câmara Municipal (Poder Legislativo)', desc: 'Atividades legislativas, projetos de lei e indicações.', icon: Landmark },
      { id: 'norms', label: 'Atos Normativos', desc: 'Publicação de decretos, portarias e resoluções municipais.', icon: BookText },
      { id: 'laws', label: 'Banco de Leis', desc: 'Repositório de leis municipais, decretos e portarias.', icon: Scale },
      { id: 'reports', label: 'Relatórios Gerenciais', desc: 'Relatórios e análises de desempenho municipal.', icon: PieChart },
    ]
  },
  {
    id: 'administracao',
    title: 'Operações Centrais, Contratos & Fiscal',
    shortTitle: 'Operações & Fiscal',
    desc: 'Operações administrativas centrais, protocolo, patrimônio e emissão fiscal.',
    icon: Briefcase,
    items: [
      { id: 'mayor', label: 'Visão do Prefeito', desc: 'Painel gerencial executivo e indicadores estratégicos.', icon: Sparkles },
      { id: 'admin_financas', label: 'Administração & Finanças Integradas', desc: 'Painel integrado administrativo, financeiro e de execução orçamentária.', icon: Wallet },
      { id: 'contracts', label: 'Contratos & Licitações', desc: 'Contratos administrativos e processos licitatórios (Lei 14.133).', icon: Briefcase },
      { id: 'notafiscal', label: 'Nota Fiscal Eletrônica (NFS-e)', desc: 'Emissão, consulta e acompanhamento fiscal de notas de serviço.', icon: Receipt },
      { id: 'patrimonio', label: 'Patrimônio Municipal', desc: 'Controle de bens móveis, imóveis e inventários.', icon: Package },
      { id: 'orders', label: 'Pedidos (Obras/Veículos)', desc: 'Solicitações internas de veículos e materiais de obras.', icon: ShoppingCart },
      { id: 'protocol', label: 'Protocolo Digital', desc: 'Processos digitais, memorandos e trâmites oficiais.', icon: FileText },
      { id: 'doc_numbers', label: 'Controle de Numeração', desc: 'Reserva e emissão de numeração oficial de documentos.', icon: Calculator },
      { id: 'certificates', label: 'Banco de Certidões', desc: 'Certidões negativas de empresas e pessoas físicas.', icon: FileBadge },
      { id: 'course_certificates', label: 'Certificados de Cursos & Eventos', desc: 'Emissão e validação de certificados de capacitações e eventos.', icon: Award },
    ]
  },
  {
    id: 'comunicacao',
    title: 'Comunicação, Portal & Publicações',
    shortTitle: 'Portal & Imprensa',
    desc: 'Diário Oficial, Site Institucional, Notícias, Comunicação e Consultas Públicas.',
    icon: Globe,
    items: [
      { id: 'diario_oficial', label: 'Diário Oficial Eletrônico', desc: 'Publicação de edições oficiais, decretos, leis e editais municipais.', icon: BookOpen, badge: 'Imprensa Oficial', highlight: true },
      { id: 'institutional_site', label: 'Site Institucional Oficial', desc: 'Gestão do portal oficial do município, secretarias, links e identidade visual.', icon: Globe, badge: 'Portal Público' },
      { id: 'noticias', label: 'Portal de Notícias', desc: 'Redação, edição e publicação de notícias e comunicados oficiais.', icon: Newspaper },
      { id: 'communication', label: 'Comunicação Interna & Avisos', desc: 'Murais, circulares e comunicados entre setores da prefeitura.', icon: MessageSquare },
      { id: 'forms', label: 'Formulários & Consultas', desc: 'Criação e divulgação de pesquisas e formulários para a população.', icon: ClipboardList },
      { id: 'templates', label: 'Modelos de Documentos', desc: 'Repositório de minutas e arquivos modelo oficiais.', icon: BookOpen },
    ]
  },
  {
    id: 'sistema',
    title: 'Sistema, Agenda & Suporte',
    shortTitle: 'Sistema & Suporte',
    desc: 'Tela inicial, calendário oficial, suporte técnico e configurações globais.',
    icon: Settings,
    items: [
      { id: 'home', label: 'Painel Principal (Início)', desc: 'Dashboard geral, avisos rápidos e atalhos.', icon: Home },
      { id: 'calendar', label: 'Calendário Oficial', desc: 'Calendário de obrigações e eventos municipais.', icon: Calendar },
      { id: 'support', label: 'Suporte & Chamados Técnicos', desc: 'Abertura e acompanhamento de chamados de atendimento do sistema.', icon: LifeBuoy },
      { id: 'settings', label: 'Configurações do Sistema', desc: 'Gerenciamento de usuários, instituições e permissões.', icon: Settings },
    ]
  }
];

export const ALL_PERMISSIONS_LIST: PermissionDef[] = PERMISSION_GROUPS.flatMap(g => g.items);

interface RolePreset {
  id: string;
  name: string;
  category: 'Saúde' | 'Governança' | 'Operacional' | 'Geral';
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  permissions: { id: View; level: PermissionLevel }[];
}

const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'medico',
    name: 'Médico Plantonista / Clínico',
    category: 'Saúde',
    description: 'Acesso direto e exclusivo ao Consultório Médico & Triagem (PEP)',
    icon: Stethoscope,
    color: 'from-cyan-500 to-blue-600',
    permissions: [
      { id: 'home', level: 'view' },
      { id: 'consultorio_medico', level: 'edit' },
      { id: 'saude', level: 'none' }
    ]
  },
  {
    id: 'enfermeiro',
    name: 'Enfermeiro(a) / Triagem',
    category: 'Saúde',
    description: 'Acolhimento com sinais vitais, fila clínica e triagem',
    icon: HeartPulse,
    color: 'from-emerald-500 to-teal-600',
    permissions: [
      { id: 'home', level: 'view' },
      { id: 'consultorio_medico', level: 'edit' },
      { id: 'saude', level: 'none' }
    ]
  },
  {
    id: 'farmaceutico',
    name: 'Farmacêutico(a) SUS',
    category: 'Saúde',
    description: 'Dispensação de receitas médicas, estoque e farmácia básica',
    icon: Pill,
    color: 'from-teal-500 to-emerald-600',
    permissions: [
      { id: 'home', level: 'view' },
      { id: 'saude', level: 'edit' },
      { id: 'consultorio_medico', level: 'none' }
    ]
  },
  {
    id: 'regulador',
    name: 'Atendente / Regulação SUS',
    category: 'Saúde',
    description: 'Agendamentos, fila de regulação, exames e recepção',
    icon: Calendar,
    color: 'from-blue-500 to-indigo-600',
    permissions: [
      { id: 'home', level: 'view' },
      { id: 'saude', level: 'edit' },
      { id: 'consultorio_medico', level: 'none' }
    ]
  },
  {
    id: 'secretario_saude',
    name: 'Secretário / Diretor de Saúde',
    category: 'Saúde',
    description: 'Acesso total e simultâneo à Regulação & Farmácia e ao Consultório',
    icon: Layers,
    color: 'from-teal-600 to-cyan-700',
    permissions: [
      { id: 'home', level: 'view' },
      { id: 'saude', level: 'admin' },
      { id: 'consultorio_medico', level: 'admin' }
    ]
  },
  {
    id: 'frotas',
    name: 'Gestor de Frotas & Posto',
    category: 'Operacional',
    description: 'Ordens digitais de abastecimento, canhotos e patrimônio',
    icon: Fuel,
    color: 'from-amber-500 to-orange-600',
    permissions: [
      { id: 'home', level: 'view' },
      { id: 'fleet_fuel', level: 'admin' },
      { id: 'patrimonio', level: 'edit' }
    ]
  },
  {
    id: 'auditor',
    name: 'Auditor / Controle Interno',
    category: 'Governança',
    description: 'Controles, riscos, alterações contábeis e transparência',
    icon: Scale,
    color: 'from-violet-500 to-purple-600',
    permissions: [
      { id: 'home', level: 'view' },
      { id: 'controls', level: 'admin' },
      { id: 'risk', level: 'admin' },
      { id: 'pntp', level: 'admin' },
      { id: 'accounting_changes', level: 'admin' },
      { id: 'reports', level: 'view' },
      { id: 'laws', level: 'view' }
    ]
  },
  {
    id: 'protocolo',
    name: 'Agente de Protocolo & Atos',
    category: 'Operacional',
    description: 'Processos digitais, numeração de atos e certidões',
    icon: FileText,
    color: 'from-indigo-500 to-blue-600',
    permissions: [
      { id: 'home', level: 'view' },
      { id: 'protocol', level: 'edit' },
      { id: 'doc_numbers', level: 'edit' },
      { id: 'templates', level: 'view' },
      { id: 'certificates', level: 'view' }
    ]
  },
  {
    id: 'admin_total',
    name: 'Administrador Total (Tudo)',
    category: 'Geral',
    description: 'Acesso irrestrito a todos os módulos do sistema como Administrador',
    icon: Sparkles,
    color: 'from-rose-500 to-pink-600',
    permissions: ALL_PERMISSIONS_LIST.map(p => ({ id: p.id, level: 'admin' as PermissionLevel }))
  },
  {
    id: 'limpar',
    name: 'Bloquear Todos (Reset)',
    category: 'Geral',
    description: 'Remove todas as permissões e bloqueia todos os módulos',
    icon: Lock,
    color: 'from-neutral-600 to-neutral-800',
    permissions: ALL_PERMISSIONS_LIST.map(p => ({ id: p.id, level: 'none' as PermissionLevel }))
  }
];

interface GranularPermissionsModalProps {
  user: AdminUser;
  allUsers: AdminUser[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPermissions: string[]) => Promise<void>;
}

export const GranularPermissionsModal: React.FC<GranularPermissionsModalProps> = ({
  user,
  allUsers,
  isOpen,
  onClose,
  onSave
}) => {
  // Estado local das permissões (array de strings no formato "modulo:nivel" ou "modulo")
  const [permissionsData, setPermissionsData] = useState<string[]>(() => {
    return (user.permissions as unknown as string[]) || [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [copyFromUserId, setCopyFromUserId] = useState<string>('');
  const [showPresetsBar, setShowPresetsBar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermissionsData((user.permissions as unknown as string[]) || []);
      setSearchTerm('');
      setCopyFromUserId('');
    }
  }, [isOpen, user.id]);

  // Retorna o nível de permissão de um determinado módulo
  const getLevel = (moduleId: View): PermissionLevel => {
    if (permissionsData.includes(`${moduleId}:admin`)) return 'admin';
    if (permissionsData.includes(`${moduleId}:edit`)) return 'edit';
    if (permissionsData.includes(`${moduleId}:view`)) return 'view';

    // Suporte ao formato clássico legado
    if (permissionsData.includes(moduleId)) {
      if (user.role === 'Admin') return 'admin';
      if (user.role === 'Editor') return 'edit';
      return 'view';
    }
    return 'none';
  };

  // Define o nível de permissão de um módulo
  const setLevel = (moduleId: View, level: PermissionLevel) => {
    const filtered = permissionsData.filter(p => 
      p !== moduleId && 
      p !== `${moduleId}:view` && 
      p !== `${moduleId}:edit` && 
      p !== `${moduleId}:admin`
    );
    
    if (level === 'none') {
      setPermissionsData(filtered);
    } else {
      setPermissionsData([...filtered, `${moduleId}:${level}`]);
    }
  };

  // Ações em lote por grupo
  const setGroupLevel = (groupItems: PermissionDef[], level: PermissionLevel) => {
    const itemIds = groupItems.map(i => i.id);
    let filtered = permissionsData.filter(p => {
      const pMod = p.split(':')[0] as View;
      return !itemIds.includes(pMod);
    });

    if (level !== 'none') {
      const toAdd = groupItems.map(i => `${i.id}:${level}`);
      filtered = [...filtered, ...toAdd];
    }
    setPermissionsData(filtered);
    showToast(`Grupo atualizado para "${level === 'none' ? 'Bloqueado' : level}" com sucesso!`, 'info');
  };

  // Aplicação de Preset com 1 clique
  const applyPreset = (preset: RolePreset) => {
    if (preset.id === 'limpar') {
      setPermissionsData([]);
      showToast('Todas as permissões foram redefinidas para Bloqueado.', 'info');
      return;
    }
    if (preset.id === 'admin_total') {
      setPermissionsData(ALL_PERMISSIONS_LIST.map(p => `${p.id}:admin`));
      showToast('Acesso Total como Administrador concedido em todos os módulos!', 'success');
      return;
    }

    // Para presets focados (ex: médico, farmacêutico, auditor), aplicamos as permissões do preset
    let updated = [...permissionsData];
    preset.permissions.forEach(p => {
      updated = updated.filter(curr => curr !== p.id && !curr.startsWith(`${p.id}:`));
      if (p.level !== 'none') {
        updated.push(`${p.id}:${p.level}`);
      }
    });

    setPermissionsData(updated);
    showToast(`Modelo "${preset.name}" aplicado com sucesso!`, 'success');
  };

  // Copiar permissões de outro usuário existente
  const handleCopyFromUser = (targetUserId: string) => {
    if (!targetUserId) return;
    const sourceUser = allUsers.find(u => u.id === targetUserId);
    if (!sourceUser) return;

    const sourcePerms = (sourceUser.permissions as unknown as string[]) || [];
    setPermissionsData([...sourcePerms]);
    setCopyFromUserId('');
    showToast(`Permissões copiadas com sucesso de ${sourceUser.name || sourceUser.email}!`, 'success');
  };

  // Contadores em tempo real
  const stats = useMemo(() => {
    let admin = 0;
    let edit = 0;
    let view = 0;
    let none = 0;

    ALL_PERMISSIONS_LIST.forEach(perm => {
      const lvl = getLevel(perm.id);
      if (lvl === 'admin') admin++;
      else if (lvl === 'edit') edit++;
      else if (lvl === 'view') view++;
      else none++;
    });

    return { total: ALL_PERMISSIONS_LIST.length, admin, edit, view, none };
  }, [permissionsData]);

  // Filtragem dos grupos e módulos
  const filteredGroups = useMemo(() => {
    return PERMISSION_GROUPS.map(group => {
      // Filtro de aba de grupo
      if (selectedGroupTab !== 'all' && group.id !== selectedGroupTab) {
        return null;
      }

      // Filtro de busca e status nos itens
      const filteredItems = group.items.filter(item => {
        // Busca textual
        const matchSearch = searchTerm === '' || 
          item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchSearch) return false;

        // Filtro por status
        const lvl = getLevel(item.id);
        if (statusFilter === 'active' && lvl === 'none') return false;
        if (statusFilter === 'blocked' && lvl !== 'none') return false;

        return true;
      });

      if (filteredItems.length === 0) return null;

      return {
        ...group,
        items: filteredItems
      };
    }).filter(Boolean) as PermissionGroup[];
  }, [searchTerm, selectedGroupTab, statusFilter, permissionsData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(permissionsData);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar permissões:', err);
      showToast('Erro ao salvar permissões: ' + (err?.message || 'Erro inesperado'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-neutral-950/70 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.94, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-6xl rounded-[32px] sm:rounded-[40px] shadow-2xl flex flex-col max-h-[92vh] border border-neutral-200/80 dark:border-neutral-800 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Superior Executivo */}
          <div className="p-6 md:p-8 bg-neutral-50/80 dark:bg-neutral-900/90 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
                      Painel de Permissões Granulares
                    </h3>
                    <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                      {user.role}
                    </span>
                    {user.department_id && (
                      <span className="bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {user.department_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Definindo acessos para <strong className="text-neutral-800 dark:text-neutral-200">{user.name || user.email}</strong> • ({user.email})
                  </p>
                </div>
              </div>

              {/* Botão Fechar */}
              <button 
                onClick={onClose} 
                className="self-end lg:self-center p-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Badges de Contadores em Tempo Real */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5">
              <div className="bg-white dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-700/60 shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-black text-xs shrink-0">
                  {stats.total}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-neutral-400">Total Módulos</p>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200">Disponíveis</p>
                </div>
              </div>

              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                  {stats.admin}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-indigo-600 dark:text-indigo-400">Administrar</p>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Controle Total</p>
                </div>
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-100/60 dark:border-amber-900/40 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                  {stats.edit}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-amber-600 dark:text-amber-400">Editar</p>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Operacional</p>
                </div>
              </div>

              <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-100/60 dark:border-blue-900/40 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                  {stats.view}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-blue-600 dark:text-blue-400">Visualizar</p>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Apenas Leitura</p>
                </div>
              </div>

              <div className="bg-neutral-100/70 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/40 flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="w-8 h-8 rounded-xl bg-neutral-300 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200 flex items-center justify-center font-black text-xs shrink-0">
                  {stats.none}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-neutral-500">Bloqueados</p>
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-400">Sem Acesso</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barra Compacta de Ações Rápidas, Presets e Clonagem */}
          <div className="px-6 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 shrink-0 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Busca Rápida */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar módulo (ex: diário, frotas, saúde, nota fiscal)..."
                  className="w-full pl-9 pr-8 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filtro por Ativo / Bloqueado */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none"
                >
                  <option value="all">Status: Todos</option>
                  <option value="active">Com Acesso ({stats.admin + stats.edit + stats.view})</option>
                  <option value="blocked">Bloqueados ({stats.none})</option>
                </select>

                {/* Clonagem de Outro Usuário */}
                <select
                  value={copyFromUserId}
                  onChange={(e) => handleCopyFromUser(e.target.value)}
                  className="bg-neutral-50 dark:bg-neutral-800 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[210px]"
                >
                  <option value="">Copiar de outro usuário...</option>
                  {allUsers
                    .filter(u => u.id !== user.id)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email} ({u.role})
                      </option>
                    ))
                  }
                </select>

                <button
                  type="button"
                  onClick={() => setShowPresetsBar(v => !v)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 border transition-all cursor-pointer ${
                    showPresetsBar
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60 hover:bg-indigo-100'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Modelos Prontos</span>
                </button>
              </div>
            </div>

            {showPresetsBar && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none custom-scrollbar">
                {ROLE_PRESETS.map(preset => {
                  const IconComp = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100/80 dark:bg-neutral-800 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-all shrink-0 border border-neutral-200/50 dark:border-neutral-700/50 cursor-pointer"
                      title={preset.description}
                    >
                      <div className={`w-5 h-5 rounded-md bg-gradient-to-tr ${preset.color} text-white flex items-center justify-center shrink-0`}>
                        <IconComp size={12} />
                      </div>
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navegação por Categorias (Mobile/Tablet horizontal + Desktop Sidebar lateral) */}
          <div className="lg:hidden px-4 py-2.5 bg-neutral-50/80 dark:bg-neutral-900/80 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setSelectedGroupTab('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedGroupTab === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
              }`}
            >
              Todos ({ALL_PERMISSIONS_LIST.length})
            </button>
            {PERMISSION_GROUPS.map(g => {
              const activeInGroup = g.items.filter(i => getLevel(i.id) !== 'none').length;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupTab(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedGroupTab === g.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <span>{g.shortTitle}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    selectedGroupTab === g.id ? 'bg-white/25 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                  }`}>
                    {activeInGroup}/{g.items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Corpo Principal em 2 Colunas (Sidebar de Categorias + Lista de Módulos) */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-4 gap-1.5 overflow-y-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-2 mb-1">
                Categorias de Módulos
              </p>
              <button
                type="button"
                onClick={() => setSelectedGroupTab('all')}
                className={`w-full px-3 py-2.5 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  selectedGroupTab === 'all'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/70'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers size={15} />
                  <span>Todos os Módulos</span>
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedGroupTab === 'all' ? 'bg-white/20 text-white dark:bg-neutral-900/15 dark:text-neutral-900' : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}>
                  {stats.admin + stats.edit + stats.view}/{ALL_PERMISSIONS_LIST.length}
                </span>
              </button>

              {PERMISSION_GROUPS.map(g => {
                const GroupIcon = g.icon;
                const activeInGroup = g.items.filter(i => getLevel(i.id) !== 'none').length;
                const isSelected = selectedGroupTab === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroupTab(g.id)}
                    className={`w-full px-3 py-2.5 rounded-2xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <GroupIcon size={15} className="shrink-0" />
                      <span className="truncate">{g.shortTitle}</span>
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : activeInGroup > 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500'
                    }`}>
                      {activeInGroup}/{g.items.length}
                    </span>
                  </button>
                );
              })}

              <div className="mt-auto pt-4 border-t border-neutral-200/70 dark:border-neutral-800 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-2">
                  Ação Global Rápida
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPermissionsData(ALL_PERMISSIONS_LIST.map(p => `${p.id}:view`));
                    showToast('Visualização liberada em todos os módulos!', 'info');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors cursor-pointer text-left flex items-center gap-2"
                >
                  <Eye size={13} /> Liberar Ver em Tudo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPermissionsData([]);
                    showToast('Todas as permissões foram bloqueadas.', 'info');
                  }}
                  className="w-full px-3 py-2 rounded-xl text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors cursor-pointer text-left flex items-center gap-2"
                >
                  <Lock size={13} /> Bloquear Tudo
                </button>
              </div>
            </aside>

            <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-8 custom-scrollbar">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle size={32} className="mx-auto text-neutral-400 mb-2" />
                <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Nenhum módulo encontrado</p>
                <p className="text-xs text-neutral-400 mt-1">Tente ajustar seus termos de busca ou filtros.</p>
              </div>
            ) : (
              filteredGroups.map(group => (
                <div key={group.id} className="space-y-4">
                  {/* Cabeçalho do Grupo com Ações em Lote */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                          {group.title}
                        </h4>
                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                          {group.items.length} módulos
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{group.desc}</p>
                    </div>

                    {/* Ações Rápidas por Grupo */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                      <span className="text-[9px] font-black uppercase text-neutral-400 mr-1">Grupo:</span>
                      <button
                        onClick={() => setGroupLevel(group.items, 'view')}
                        className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 transition-all border border-blue-200/50"
                        title="Liberar apenas visualização para todos deste grupo"
                      >
                        Tudo Ver
                      </button>
                      <button
                        onClick={() => setGroupLevel(group.items, 'edit')}
                        className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 transition-all border border-amber-200/50"
                        title="Liberar permissão de edição para todos deste grupo"
                      >
                        Tudo Editar
                      </button>
                      <button
                        onClick={() => setGroupLevel(group.items, 'none')}
                        className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 transition-all border border-neutral-200/50"
                        title="Bloquear todos deste grupo"
                      >
                        Bloquear
                      </button>
                    </div>
                  </div>

                  {/* Grid de Cards de Permissão */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {group.items.map(perm => {
                      const currentLevel = getLevel(perm.id);
                      const IconComp = perm.icon;

                      return (
                        <div 
                          key={perm.id} 
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            perm.highlight
                              ? 'bg-gradient-to-br from-white to-emerald-50/20 dark:from-neutral-900 dark:to-emerald-950/10 border-emerald-500/30 shadow-sm'
                              : 'bg-neutral-50/60 dark:bg-neutral-800/25 border-neutral-200/60 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          {/* Info do Módulo */}
                          <div className="flex items-start gap-3.5">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                              currentLevel === 'none' 
                                ? 'bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800' 
                                : currentLevel === 'view'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200/60 dark:border-blue-800/60 shadow-sm'
                                : currentLevel === 'edit'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200/60 dark:border-amber-800/60 shadow-sm'
                                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border-indigo-200/60 dark:border-indigo-800/60 shadow-sm'
                            }`}>
                              <IconComp size={20} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-black text-neutral-900 dark:text-neutral-100 truncate">
                                  {perm.label}
                                </p>
                                {perm.badge && (
                                  <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    {perm.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                                {perm.desc}
                              </p>
                            </div>
                          </div>

                          {/* Segmented Control de Nível */}
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                            <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                              Status: 
                              <strong className={`font-black uppercase tracking-wider ${
                                currentLevel === 'admin' ? 'text-indigo-600 dark:text-indigo-400' :
                                currentLevel === 'edit' ? 'text-amber-600 dark:text-amber-400' :
                                currentLevel === 'view' ? 'text-blue-600 dark:text-blue-400' :
                                'text-neutral-400'
                              }`}>
                                {currentLevel === 'none' ? 'Bloqueado' : currentLevel}
                              </strong>
                            </span>

                            <div className="flex bg-neutral-200/70 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
                              <button
                                type="button"
                                onClick={() => setLevel(perm.id, 'none')}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                  currentLevel === 'none' 
                                    ? 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 shadow-sm' 
                                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                                }`}
                              >
                                Bloq
                              </button>
                              <button
                                type="button"
                                onClick={() => setLevel(perm.id, 'view')}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                  currentLevel === 'view' 
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                                    : 'text-neutral-400 hover:text-blue-600'
                                }`}
                              >
                                Ver
                              </button>
                              <button
                                type="button"
                                onClick={() => setLevel(perm.id, 'edit')}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                  currentLevel === 'edit' 
                                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20' 
                                    : 'text-neutral-400 hover:text-amber-600'
                                }`}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setLevel(perm.id, 'admin')}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                  currentLevel === 'admin' 
                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' 
                                    : 'text-neutral-400 hover:text-indigo-600'
                                }`}
                              >
                                Admin
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
            </div>
          </div>

          {/* Footer com Ações */}
          <div className="p-4 sm:p-6 bg-neutral-50/80 dark:bg-neutral-900/90 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center sm:text-left">
              <span>{stats.admin + stats.edit + stats.view} de {stats.total} módulos habilitados para este usuário.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                type="button" 
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-all border border-neutral-200/50 dark:border-neutral-700/50"
              >
                Cancelar
              </button>
              
              <button 
                type="button" 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Salvar Permissões
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
