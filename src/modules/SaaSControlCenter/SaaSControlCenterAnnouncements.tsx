import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, Plus, Send, AlertTriangle, CheckCircle2, Clock, 
  Trash2, Building2, ShieldAlert, X, Sparkles, Filter, 
  Edit3, Eye, Power, Search, RefreshCw, ExternalLink, Globe, LayoutTemplate
} from 'lucide-react';
import { Institution, PlatformAnnouncement, AdminUser } from '../../types';
import { 
  fetchAnnouncements, 
  publishAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement, 
  toggleAnnouncementActive 
} from '../../services/platformAdminService';
import { showToast } from '../../components/ui/Toast';
import { OfficialAnnouncementBanner } from '../../components/OfficialAnnouncementBanner';

interface SaaSControlCenterAnnouncementsProps {
  institutions: Institution[];
  currentUser: AdminUser | null;
}

export const SaaSControlCenterAnnouncements: React.FC<SaaSControlCenterAnnouncementsProps> = ({
  institutions,
  currentUser
}) => {
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlatformAnnouncement | null>(null);
  const [deletingItem, setDeletingItem] = useState<PlatformAnnouncement | null>(null);
  const [previewItem, setPreviewItem] = useState<PlatformAnnouncement | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critica' | 'alta' | 'normal' | 'baixa'>('all');

  // Estado do Formulário
  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    priority: 'baixa' | 'normal' | 'alta' | 'critica';
    target_institutions: string[];
    valid_days: number;
    show_login_banner: boolean;
    logo_url: string;
    action_label: string;
    action_url: string;
  }>({
    title: '',
    message: '',
    priority: 'normal',
    target_institutions: [],
    valid_days: 7,
    show_login_banner: true,
    logo_url: '/logo-gestao360.png',
    action_label: '',
    action_url: ''
  });

  const loadAnnouncements = async () => {
    setIsLoading(true);
    const data = await fetchAnnouncements();
    setAnnouncements(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      message: '',
      priority: 'normal',
      target_institutions: [],
      valid_days: 7,
      show_login_banner: true,
      logo_url: '/logo-gestao360.png',
      action_label: '',
      action_url: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: PlatformAnnouncement) => {
    setEditingItem(item);
    
    // Calcula dias restantes aproximados se houver valid_until
    let days = 7;
    if (item.valid_until) {
      const diffMs = new Date(item.valid_until).getTime() - new Date().getTime();
      const calcDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (calcDays > 0) days = calcDays;
    }

    setFormData({
      title: item.title,
      message: item.message,
      priority: item.priority,
      target_institutions: item.target_institutions || [],
      valid_days: days,
      show_login_banner: item.show_login_banner ?? true,
      logo_url: item.logo_url || '/logo-gestao360.png',
      action_label: item.action_label || '',
      action_url: item.action_url || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      showToast('Preencha o título e o conteúdo do comunicado.', 'error');
      return;
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + Number(formData.valid_days));

    if (editingItem) {
      // UPDATE
      const res = await updateAnnouncement(
        editingItem.id,
        {
          title: formData.title.trim(),
          message: formData.message.trim(),
          priority: formData.priority,
          target_institutions: formData.target_institutions,
          valid_until: validUntil.toISOString(),
          show_login_banner: formData.show_login_banner,
          logo_url: formData.logo_url,
          action_label: formData.action_label,
          action_url: formData.action_url
        },
        currentUser
      );

      if (res.success && res.data) {
        setAnnouncements(prev => prev.map(a => a.id === editingItem.id ? res.data! : a));
        showToast('Comunicado atualizado com sucesso!', 'success');
        setIsModalOpen(false);
      } else {
        showToast('Erro ao atualizar comunicado: ' + (res.error || 'Erro desconhecido'), 'error');
      }
    } else {
      // CREATE
      const res = await publishAnnouncement(
        {
          title: formData.title.trim(),
          message: formData.message.trim(),
          priority: formData.priority,
          target_institutions: formData.target_institutions,
          valid_until: validUntil.toISOString(),
          show_login_banner: formData.show_login_banner,
          logo_url: formData.logo_url,
          action_label: formData.action_label,
          action_url: formData.action_url
        },
        currentUser
      );

      if (res.success && res.data) {
        setAnnouncements(prev => [res.data!, ...prev]);
        showToast('Comunicado publicado com sucesso para as prefeituras!', 'success');
        setIsModalOpen(false);
      } else {
        showToast('Erro ao publicar comunicado: ' + (res.error || 'Erro desconhecido'), 'error');
      }
    }
  };

  const handleToggleStatus = async (item: PlatformAnnouncement) => {
    const res = await toggleAnnouncementActive(item.id, item.is_active, item.title, currentUser);
    if (res.success) {
      setAnnouncements(prev => prev.map(a => a.id === item.id ? { ...a, is_active: !a.is_active } : a));
      showToast(`Comunicado ${!item.is_active ? 'ativado' : 'pausado'} com sucesso!`, 'success');
    } else {
      showToast('Erro ao alterar status: ' + (res.error || 'Erro desconhecido'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    const res = await deleteAnnouncement(deletingItem.id, deletingItem.title, currentUser);
    if (res.success) {
      setAnnouncements(prev => prev.filter(a => a.id !== deletingItem.id));
      showToast('Comunicado excluído definitivamente.', 'success');
      setDeletingItem(null);
    } else {
      showToast('Erro ao excluir: ' + (res.error || 'Erro desconhecido'), 'error');
    }
  };

  // Filtragem
  const filteredAnnouncements = useMemo(() => {
    const now = new Date();
    return announcements.filter(item => {
      // Busca texto
      const matchesSearch = 
        !searchTerm.trim() || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status
      const isExpired = item.valid_until && new Date(item.valid_until) < now;
      if (statusFilter === 'active' && (!item.is_active || isExpired)) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;
      if (statusFilter === 'expired' && !isExpired) return false;

      // Prioridade
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;

      return true;
    });
  }, [announcements, searchTerm, statusFilter, priorityFilter]);

  const getPriorityBadge = (priority: PlatformAnnouncement['priority']) => {
    switch (priority) {
      case 'critica':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse">Crítica</span>;
      case 'alta':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">Alta</span>;
      case 'baixa':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-neutral-500/20 text-neutral-400 border border-neutral-500/30">Informativo</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">Normal</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Comunicados Oficiais & Banners no Login
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Gerencie avisos institucionais e pop-ups com a marca AFIC exibidos no login dos servidores municipais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAnnouncements}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
            title="Recarregar comunicados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Comunicado
          </button>
        </div>
      </div>

      {/* Barra de Filtros & Busca */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Somente Ativos</option>
            <option value="inactive">Pausados / Inativos</option>
            <option value="expired">Expirados</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="critica">Crítica (Vermelho)</option>
            <option value="alta">Alta (Âmbar)</option>
            <option value="normal">Normal</option>
            <option value="baixa">Informativo</option>
          </select>
        </div>
      </div>

      {/* Lista de Comunicados (CRUD Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAnnouncements.map((item) => {
          const isExpired = item.valid_until && new Date(item.valid_until) < new Date();
          const targetNames = item.target_institutions && item.target_institutions.length > 0
            ? institutions.filter(i => item.target_institutions?.includes(i.id)).map(i => i.name).join(', ')
            : 'Todos os Municípios da Rede';

          return (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border transition shadow-sm bg-white dark:bg-neutral-900 flex flex-col justify-between ${
                !item.is_active 
                  ? 'opacity-60 border-dashed border-neutral-300 dark:border-neutral-800' 
                  : isExpired 
                  ? 'border-neutral-200 dark:border-neutral-800 opacity-75' 
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-amber-500/40'
              }`}
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(item.priority)}
                    
                    {/* Status Ativo / Inativo */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      item.is_active 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                        : 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'
                    }`}>
                      {item.is_active ? 'Ativo' : 'Pausado'}
                    </span>

                    {/* Badge se abre no Login */}
                    {item.show_login_banner !== false && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
                        <LayoutTemplate className="w-2.5 h-2.5" /> Banner no Login
                      </span>
                    )}

                    {isExpired && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/15 text-rose-500 border border-rose-500/30">
                        Expirado
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Título & Mensagem */}
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-2 leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed mb-4 line-clamp-4">
                  {item.message}
                </p>

                {/* Ação ou Link Externo se houver */}
                {item.action_url && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                      <ExternalLink className="w-3 h-3 text-amber-500" />
                      {item.action_label || 'Ação Vinculada'}: <span className="font-mono text-neutral-400 truncate max-w-[200px]">{item.action_url}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Rodapé e Ações do CRUD */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
                <div className="space-y-0.5 min-w-0">
                  <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 truncate max-w-[280px]">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{targetNames}</span>
                  </span>
                  {item.valid_until && (
                    <span className="flex items-center gap-1 font-mono text-[10px] text-neutral-400">
                      <Clock className="w-3 h-3" />
                      Vigência: {new Date(item.valid_until).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                {/* Botões de Ação do CRUD */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                  {/* Prévia do Banner de Login */}
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="p-2 rounded-xl text-neutral-500 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Ver Prévia do Banner (como o servidor verá ao logar)"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Ativar/Desativar */}
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      item.is_active
                        ? 'text-emerald-500 hover:bg-emerald-500/10'
                        : 'text-neutral-400 hover:text-emerald-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                    title={item.is_active ? 'Pausar comunicado' : 'Ativar comunicado'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  {/* Editar */}
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-xl text-neutral-500 hover:text-sky-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Editar comunicado"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Excluir */}
                  <button
                    onClick={() => setDeletingItem(item)}
                    className="p-2 rounded-xl text-neutral-500 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Excluir comunicado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAnnouncements.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-400">
            <Bell className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Nenhum comunicado encontrado com os filtros aplicados'
                : 'Nenhum comunicado cadastrado'}
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              Clique no botão "+ Novo Comunicado" para criar alertas institucionais.
            </p>
          </div>
        )}
      </div>

      {/* Modal Unificado de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white p-2 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
              {editingItem ? 'Editar Comunicado Oficial' : 'Publicar Novo Comunicado Oficial'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
              Defina a mensagem oficial da AFIC Consultoria e selecione se ela deve surgir em banner no login dos servidores.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Título do Comunicado</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Atualização do Módulo de Frotas & Reforma Tributária"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Mensagem / Conteúdo Oficial</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva o comunicado oficial, orientações para os servidores e prazos..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none font-medium leading-relaxed"
                />
              </div>

              {/* Opções de Prioridade e Vigência */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Nível de Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="normal">Normal (Oficial)</option>
                    <option value="baixa">Informativo</option>
                    <option value="alta">Alta Prioridade</option>
                    <option value="critica">Crítica (Alerta Vermelho)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Período de Exibição</label>
                  <select
                    value={formData.valid_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_days: Number(e.target.value) }))}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value={1}>1 Dia</option>
                    <option value={3}>3 Dias</option>
                    <option value={7}>7 Dias (1 Semana)</option>
                    <option value={15}>15 Dias</option>
                    <option value={30}>30 Dias</option>
                    <option value={90}>90 Dias</option>
                  </select>
                </div>
              </div>

              {/* Switch de Banner no Login */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block">
                    Exibir Banner Pop-up ao Logar
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    O servidor verá este comunicado em destaque com a marca AFIC logo após fazer login.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.show_login_banner}
                  onChange={(e) => setFormData(prev => ({ ...prev, show_login_banner: e.target.checked }))}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Botão de Ação / Link Externo (Opcional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Texto do Botão de Ação (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Baixar Manual / Acessar"
                    value={formData.action_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, action_label: e.target.value }))}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">URL / Link da Ação (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.action_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, action_url: e.target.value }))}
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* Municípios Alvo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block">Público-Alvo (Municípios)</label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, target_institutions: [] }))}
                    className="text-[10px] text-amber-500 hover:underline font-bold cursor-pointer"
                  >
                    Enviar para Todos
                  </button>
                </div>
                <select
                  multiple
                  value={formData.target_institutions}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o: HTMLOptionElement) => o.value);
                    setFormData(prev => ({ ...prev, target_institutions: selected }));
                  }}
                  className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 h-24 font-medium"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id} className="p-1">
                      {inst.name} ({inst.subdomain || 'sem slug'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {formData.target_institutions.length === 0
                    ? '✓ Configurado para TODOS os municípios cadastrados.'
                    : `Configurado para ${formData.target_institutions.length} município(s) selecionado(s). (Segure Ctrl para selecionar múltiplos)`}
                </p>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> {editingItem ? 'Salvar Alterações' : 'Publicar Comunicado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
              Excluir Comunicado Oficial?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Você está prestes a remover o comunicado <strong className="text-neutral-800 dark:text-neutral-200">"{deletingItem.title}"</strong>. Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prévia do Banner (como o servidor verá ao logar) */}
      {previewItem && (
        <OfficialAnnouncementBanner
          currentUser={currentUser}
          currentInstitution={null}
          forceOpenAnnouncement={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
};

export default SaaSControlCenterAnnouncements;