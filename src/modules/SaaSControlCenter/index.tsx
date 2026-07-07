import React, { useMemo } from 'react';
import { 
  Building2, Users, ClipboardCheck, ArrowRight, Plus, Edit2, Trash2, X, Lock, LogOut, LayoutDashboard, Globe, Activity, CheckCircle2, AlertTriangle, Settings, Home, Sun, Moon, LifeBuoy, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { supabase, signUpNewUser } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { AdminUser, Institution, Department, View } from '../../types';
import { SaaSControlCenterSupport } from './SaaSControlCenterSupport';
import { SaaSControlCenterEducation } from './SaaSControlCenterEducation';

interface SaaSControlCenterProps {
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  currentUser: AdminUser | null;
  adminUsers: AdminUser[];
  setAdminUsers: (users: AdminUser[]) => void;
  institutions: Institution[];
  setInstitutions: (inst: Institution[]) => void;
  departments: Department[];
  setDepartments: (depts: Department[]) => void;
  controls: any[];
  patrimonioItems: any[];
  orders: any[];
}

export const SaaSControlCenter = ({
  darkMode,
  setDarkMode,
  currentUser,
  adminUsers,
  setAdminUsers,
  institutions,
  setInstitutions,
  departments,
  setDepartments,
  controls,
  patrimonioItems,
  orders
}: SaaSControlCenterProps) => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'institutions' | 'users' | 'departments' | 'support' | 'education'>('overview');
  
  // Modal de Resultado Demo
  const [demoResultModal, setDemoResultModal] = React.useState<{isOpen: boolean, success: boolean, message: string}>({isOpen: false, success: true, message: ''});

  // Notificações de Suporte
  const [openTicketsCount, setOpenTicketsCount] = React.useState(0);

  React.useEffect(() => {
    let lastCount = 0;
    
    const fetchTickets = async () => {
      const { data, error } = await supabase.from('support_tickets').select('id').eq('status', 'Aberto');
      if (!error && data) {
        const currentCount = data.length;
        if (currentCount > lastCount && lastCount !== 0) {
          showToast('🔔 Novo chamado de suporte recebido!', 'info');
        }
        lastCount = currentCount;
        setOpenTicketsCount(currentCount);
      }
    };

    fetchTickets();
    const interval = setInterval(fetchTickets, 30000); // A cada 30 segundos
    return () => clearInterval(interval);
  }, []);
  
  // Modals state
  const [isInstModalOpen, setIsInstModalOpen] = React.useState(false);
  const [editingInstitution, setEditingInstitution] = React.useState<Institution | null>(null);
  const [instFormData, setInstFormData] = React.useState({ name: '', subdomain: '', logo_url: '' });

  const [isUserModalOpen, setIsUserModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null);
  const [userFormData, setUserFormData] = React.useState({
    name: '',
    email: '',
    role: 'Admin' as AdminUser['role'],
    status: 'Ativo' as AdminUser['status'],
    password: '',
    permissions: [] as View[],
    institution_id: '',
    department_id: ''
  });

  const [isDeptModalOpen, setIsDeptModalOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<Department | null>(null);
  const [deptFormData, setDeptFormData] = React.useState({ name: '', institution_id: '' });

  // 1. Overview Statistics
  const stats = useMemo(() => {
    return {
      totalMunicipalities: institutions.length,
      totalUsers: adminUsers.length,
      totalDepartments: departments.length,
      globalCompliance: 88, // Média SaaS simulada
    };
  }, [institutions, adminUsers, departments]);

  // Users per municipality data for chart
  const chartData = useMemo(() => {
    return institutions.map(inst => {
      const count = adminUsers.filter(u => u.institution_id === inst.id).length;
      return {
        name: inst.name.replace('Prefeitura Municipal de ', '').replace('Prefeitura de ', ''),
        servidores: count
      };
    });
  }, [institutions, adminUsers]);

  const COLORS = ['#8B5CF6', '#10B981', '#06B6D4', '#F59E0B', '#EF4444'];

  // 2. CRUD Handlers: Institutions
  const handleInstSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInstitution) {
      const updated = { ...editingInstitution, ...instFormData };
      setInstitutions(institutions.map(i => i.id === editingInstitution.id ? updated : i));
      const { error } = await supabase.from('institutions').update({ name: updated.name, subdomain: updated.subdomain, logo_url: updated.logo_url }).eq('id', updated.id);
      if (error) showToast('Erro ao atualizar prefeitura: ' + error.message, 'error');
      else showToast('Prefeitura atualizada com sucesso!', 'success');
    } else {
      const newInst: Institution = {
        ...instFormData,
        id: crypto.randomUUID()
      };
      setInstitutions([...institutions, newInst]);
      const { error } = await supabase.from('institutions').insert({ id: newInst.id, name: newInst.name, subdomain: newInst.subdomain, logo_url: newInst.logo_url });
      if (error) showToast('Erro ao criar prefeitura: ' + error.message, 'error');
      else showToast('Prefeitura criada com sucesso!', 'success');
    }
    setIsInstModalOpen(false);
    setEditingInstitution(null);
  };

  const handleInstDelete = async (id: string) => {
    if (confirm('Atenção: A remoção de um município excluirá permanentemente todas as secretarias, servidores e dados associados (ON DELETE CASCADE). Confirmar exclusão?')) {
      const { error } = await supabase.from('institutions').delete().eq('id', id);
      if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
      } else {
        setInstitutions(institutions.filter(i => i.id !== id));
        showToast('Município e todos os seus dados cascateados removidos!', 'success');
      }
    }
  };

  // 3. CRUD Handlers: Users
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updatedUser = { ...editingUser, ...userFormData };
      setAdminUsers(adminUsers.map(u => u.id === editingUser.id ? updatedUser : u));
      
      const { error } = await supabase.from('admin_users').update({
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        permissions: updatedUser.permissions,
        institution_id: updatedUser.institution_id || null,
        department_id: updatedUser.department_id || null
      }).eq('id', updatedUser.id);
      
      if (error) showToast('Erro ao salvar no banco de dados: ' + error.message, 'error');
      else showToast('Usuário atualizado!', 'success');
    } else {
      let finalUserId: string = crypto.randomUUID();
      
      try {
        const { data, error } = await signUpNewUser(userFormData.email, userFormData.password);
        
        if (error) {
          // Se o usuário já existir no Auth, prosseguimos para cadastrá-lo na admin_users.
          if (error.message.toLowerCase().includes('already registered')) {
            console.log('Usuário já existe no Auth. Prosseguindo para vinculação na admin_users.');
          } else {
            showToast('Aviso Supabase Auth: ' + error.message, 'error');
            return;
          }
        } else if (data?.user) {
          finalUserId = data.user.id;
        }
      } catch (err) {
        console.error('Erro na criação de usuário no Auth:', err);
      }

      const newUser: AdminUser = {
        ...userFormData,
        id: finalUserId,
        lastLogin: 'Nunca'
      };
      setAdminUsers([...adminUsers, newUser]);
      
      const { error } = await supabase.from('admin_users').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        last_login: newUser.lastLogin,
        permissions: newUser.permissions || ['home', 'controls', 'calendar', 'norms', 'risk', 'pntp', 'protocol', 'contracts', 'education', 'orders', 'doc_numbers', 'reports', 'certificates', 'obras', 'administracao', 'financas', 'saude', 'servicos_publicos', 'meio_ambiente', 'tributos', 'agricultura', 'assistencia_social', 'esporte', 'planejamento', 'settings', 'patrimonio'],
        institution_id: newUser.institution_id || null,
        department_id: newUser.department_id || null
      });
      if (error) showToast('Erro Supabase Insert: ' + error.message, 'error');
      else showToast('Usuário cadastrado com sucesso!', 'success');
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleUserDelete = async (id: string) => {
    if (confirm('Remover servidor permanentemente do sistema?')) {
      setAdminUsers(adminUsers.filter(u => u.id !== id));
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) showToast('Erro ao excluir: ' + error.message, 'error');
      else showToast('Servidor removido com sucesso!', 'success');
    }
  };

  // 4. CRUD Handlers: Departments
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      const updated = { ...editingDept, ...deptFormData };
      setDepartments(departments.map(d => d.id === editingDept.id ? updated : d));
      const { error } = await supabase.from('departments').update({ name: updated.name, institution_id: updated.institution_id }).eq('id', updated.id);
      if (error) showToast('Erro ao atualizar: ' + error.message, 'error');
      else showToast('Secretaria atualizada!', 'success');
    } else {
      const newDept: Department = {
        ...deptFormData,
        id: crypto.randomUUID()
      };
      setDepartments([...departments, newDept]);
      const { error } = await supabase.from('departments').insert({ id: newDept.id, name: newDept.name, institution_id: newDept.institution_id });
      if (error) showToast('Erro ao criar: ' + error.message, 'error');
      else showToast('Secretaria criada!', 'success');
    }
    setIsDeptModalOpen(false);
    setEditingDept(null);
  };

  const handleDeptDelete = async (id: string) => {
    if (confirm('Remover secretaria? Servidores lotados nela perderão o vínculo.')) {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
      } else {
        setDepartments(departments.filter(d => d.id !== id));
        showToast('Secretaria removida!', 'success');
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-neutral-950 text-white' : 'bg-[#F9F9F8] text-neutral-900'}`}>
      
      {/* Sidebar Navigation */}
      <aside className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800/60 z-30 flex flex-col p-8 transition-colors">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-purple-50 dark:bg-purple-900/10 p-2.5 rounded-2xl border border-purple-100 dark:border-purple-900/30 text-purple-600">
            <Building2 size={24} />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight italic">
              Gestão <span className="text-purple-600">SaaS</span>
            </span>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mt-0.5">Control Center</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-550/10' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}
          >
            <LayoutDashboard size={18} />
            Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('institutions')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'institutions' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-550/10' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}
          >
            <Building2 size={18} />
            Prefeituras
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-550/10' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}
          >
            <Users size={18} />
            Servidores
          </button>
          <button 
            onClick={() => setActiveTab('departments')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'departments' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-550/10' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}
          >
            <Settings size={18} />
            Secretarias
          </button>
          <button 
            onClick={() => setActiveTab('education')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'education' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-550/10' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}
          >
            <GraduationCap size={18} />
            Gestão Educacional
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'support' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-550/10' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}
          >
            <div className="flex items-center gap-4">
              <LifeBuoy size={18} />
              Help Desk
            </div>
            {openTicketsCount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30">
                {openTicketsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Sidebar Footer with Session Control */}
        <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-850 rounded-full flex items-center justify-center font-bold text-sm text-neutral-600 dark:text-neutral-300">
              {currentUser?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <p className="text-sm font-bold truncate max-w-[180px]">{currentUser?.name || 'Super Admin'}</p>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">{currentUser?.role}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-2xl flex-1 flex justify-center transition-all"
              title="Alternar Tema"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={handleSignOut}
              className="p-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 rounded-2xl flex-1 flex justify-center transition-all border border-transparent hover:border-rose-200/50"
              title="Sair do Sistema"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Body */}
      <main className="pl-80 min-h-screen">
        <header className="px-12 py-8 flex justify-between items-center bg-white/40 dark:bg-neutral-900/20 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-850/40 sticky top-0 z-20">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white leading-none tracking-tight">
              {activeTab === 'overview' && 'Painel Consolidado'}
              {activeTab === 'institutions' && 'Gerenciar Prefeituras'}
              {activeTab === 'users' && 'Diretório Global de Servidores'}
              {activeTab === 'departments' && 'Estrutura de Secretarias'}
              {activeTab === 'education' && 'Ambiente de Educação'}
              {activeTab === 'support' && 'Central de Help Desk'}
            </h1>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1.5">
              {activeTab === 'overview' && 'Métricas SaaS e Saúde do Ecossistema'}
              {activeTab === 'institutions' && 'Controle de Organizações e Subdomínios'}
              {activeTab === 'users' && 'Usuários e permissões de acesso centralizados'}
              {activeTab === 'departments' && 'Pastas e departamentos governamentais do SaaS'}
              {activeTab === 'education' && 'Gerenciamento de Escolas, Professores e Alunos'}
              {activeTab === 'support' && 'Chamados e suporte técnico global'}
            </p>
          </div>

          {activeTab !== 'overview' && activeTab !== 'support' && activeTab !== 'education' && (
            <button 
              onClick={() => {
                if (activeTab === 'institutions') {
                  setEditingInstitution(null);
                  setInstFormData({ name: '', subdomain: '', logo_url: '' });
                  setIsInstModalOpen(true);
                } else if (activeTab === 'users') {
                  setEditingUser(null);
                  setUserFormData({ name: '', email: '', role: 'Admin', status: 'Ativo', password: '', permissions: [], institution_id: '', department_id: '' });
                  setIsUserModalOpen(true);
                } else if (activeTab === 'departments') {
                  setEditingDept(null);
                  setDeptFormData({ name: '', institution_id: institutions.length > 0 ? institutions[0].id : '' });
                  setIsDeptModalOpen(true);
                }
              }}
              className="px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
            >
              <Plus size={14} />
              Adicionar
            </button>
          )}
        </header>

        {/* Content Tabs */}
        <div className="p-12 space-y-8 max-w-[1500px]">
          
          {/* Tab 1: Overview Dashboard */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Prefeituras */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 flex items-center justify-between shadow-sm">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Municípios Ativos</p>
                    <h3 className="text-4xl font-black">{stats.totalMunicipalities}</h3>
                  </div>
                  <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/10 rounded-2xl flex items-center justify-center text-purple-600">
                    <Building2 size={24} />
                  </div>
                </div>

                {/* Servidores */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 flex items-center justify-between shadow-sm">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Servidores Globais</p>
                    <h3 className="text-4xl font-black">{stats.totalUsers}</h3>
                  </div>
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Users size={24} />
                  </div>
                </div>

                {/* Secretarias */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 flex items-center justify-between shadow-sm">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Secretarias</p>
                    <h3 className="text-4xl font-black">{stats.totalDepartments}</h3>
                  </div>
                  <div className="w-14 h-14 bg-cyan-50 dark:bg-cyan-900/10 rounded-2xl flex items-center justify-center text-cyan-600">
                    <Settings size={24} />
                  </div>
                </div>

                {/* Conformidade */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 flex items-center justify-between shadow-sm">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Índice Compliance</p>
                    <h3 className="text-4xl font-black">{stats.globalCompliance}%</h3>
                  </div>
                  <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex items-center justify-center text-amber-600">
                    <ClipboardCheck size={24} />
                  </div>
                </div>
              </div>

              {/* Graphic analytics chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Bar chart */}
                <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-bold">Servidores por Município</h3>
                    <p className="text-xs text-neutral-400 mt-1">Comparativo de contas de servidores alocados por prefeitura ativa.</p>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:opacity-10" />
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} contentStyle={{ border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }} />
                        <Bar dataKey="servidores" fill="#8B5CF6" radius={[8, 8, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Health & Monitoring */}
                <div className="lg:col-span-4 flex flex-col gap-8">
                  {/* Health & Monitoring */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Status do Ecossistema</h3>
                      <p className="text-xs text-neutral-400 mt-1">Monitoramento em tempo real dos serviços conectados ao SaaS.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-850 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold">Supabase Database</span>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">online</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-850 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold">Vercel Web Hosting</span>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">online</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-850 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold">Gemini IA API</span>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">online</span>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <div className="p-4 bg-purple-50/50 dark:bg-purple-950/10 rounded-2xl border border-purple-100/50 dark:border-purple-950/20 text-center">
                        <p className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider mb-1">Versão do Sistema</p>
                        <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">v1.4.0 SaaS Multitenant</p>
                      </div>
                    </div>
                  </div>

                  {/* Supabase Usage Display */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Uso do Servidor (Supabase)</h3>
                      <p className="text-xs text-neutral-400 mt-1">Métricas estimadas de consumo do plano atual.</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs font-bold">Database (Tabelas)</p>
                            <p className="text-[10px] text-neutral-400">Plano Gratuito</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-purple-600">~12 MB</p>
                            <p className="text-[10px] text-neutral-400">de 500 MB</p>
                          </div>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: '2.4%' }}></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs font-bold">Storage (Fotos e Mídia)</p>
                            <p className="text-[10px] text-neutral-400">Plano Gratuito</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-sky-600">~145 MB</p>
                            <p className="text-[10px] text-neutral-400">de 1024 MB</p>
                          </div>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                          <div className="bg-sky-500 h-2 rounded-full" style={{ width: '14.1%' }}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 text-center">
                       <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="inline-block text-[10px] uppercase font-black tracking-widest text-neutral-400 hover:text-purple-600 transition-colors">
                         Acessar Dashboard Real
                       </a>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Tab 2: Institutions CRUD */}
          {activeTab === 'institutions' && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Prefeitura / Município</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Subdomínio</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Ambiente Online</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {institutions.map(inst => (
                      <tr key={inst.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="p-6">
                          <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{inst.name}</p>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-mono font-bold text-purple-600 dark:text-purple-450">{inst.subdomain || '-'}</p>
                        </td>
                        <td className="p-6">
                          {inst.subdomain ? (
                            <a 
                              href={window.location.hostname.endsWith('localhost') ? `http://${inst.subdomain}.localhost:${window.location.port}` : `https://${inst.subdomain}.gestao360sistema.com.br`}
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-black text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/10 dark:hover:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 px-3 py-1.5 rounded-full uppercase tracking-wider transition-all"
                            >
                              <Globe size={11} />
                              Ir para portal
                              <ArrowRight size={10} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Inativo</span>
                          )}
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={async () => {
                                const { seedDemoInstitution } = await import('../../lib/demoSeeder');
                                showToast('Iniciando geração de dados...', 'info');
                                const success = await seedDemoInstitution(inst.id);
                                if (success) {
                                  showToast('Dados de demonstração gerados com sucesso!', 'success');
                                  setDemoResultModal({
                                    isOpen: true,
                                    success: true,
                                    message: 'Os dados de demonstração foram gerados e inseridos no sistema. Acesse os módulos da prefeitura para conferir!'
                                  });
                                } else {
                                  showToast('Erro ao gerar dados. Verifique o console.', 'error');
                                  setDemoResultModal({
                                    isOpen: true,
                                    success: false,
                                    message: 'Ocorreu um erro ao gerar os dados. Verifique sua conexão ou o console do navegador.'
                                  });
                                }
                              }}
                              className="p-2 text-neutral-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl transition-all"
                              title="Popular Dados de Teste"
                            >
                              <Activity size={16} />
                            </button>
                            <button 
                              onClick={() => { setEditingInstitution(inst); setInstFormData({ name: inst.name, subdomain: inst.subdomain || '', logo_url: inst.logo_url || '' }); setIsInstModalOpen(true); }}
                              className="p-2 text-neutral-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleInstDelete(inst.id)} 
                              className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Global Users CRUD */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Usuário</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Prefeitura / Lotação</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Nível de Acesso</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {adminUsers.map(u => {
                      const userInst = institutions.find(i => i.id === u.institution_id);
                      const userDept = departments.find(d => d.id === u.department_id);
                      return (
                        <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 font-bold text-sm">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{u.name}</p>
                                <p className="text-xs text-neutral-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div>
                              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                {userInst ? userInst.name.replace('Prefeitura Municipal de ', 'Prefeitura de ') : 'Global (Super)'}
                              </p>
                              <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {userDept ? userDept.name : 'Sem Lotação'}
                              </p>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              u.role === 'Super Admin' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' :
                              u.role === 'Admin' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                              u.role === 'Editor' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' :
                              'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-405'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center w-max gap-1.5 ${
                              u.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Ativo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {u.status}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { 
                                  setEditingUser(u); 
                                  setUserFormData({ 
                                    name: u.name, 
                                    email: u.email, 
                                    role: u.role, 
                                    status: u.status, 
                                    password: '', 
                                    permissions: u.permissions || [], 
                                    institution_id: u.institution_id || '', 
                                    department_id: u.department_id || '' 
                                  }); 
                                  setIsUserModalOpen(true); 
                                }}
                                className="p-2 text-neutral-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleUserDelete(u.id)}
                                className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Global Departments CRUD */}
          {activeTab === 'departments' && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Secretaria</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Pertence à Prefeitura</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {departments.map(dept => {
                      const inst = institutions.find(i => i.id === dept.institution_id);
                      return (
                        <tr key={dept.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="p-6">
                            <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{dept.name}</p>
                          </td>
                          <td className="p-6">
                            <p className="text-xs text-neutral-500 font-bold">{inst ? inst.name : 'Desconhecido'}</p>
                          </td>
                          <td className="p-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { 
                                  setEditingDept(dept); 
                                  setDeptFormData({ name: dept.name, institution_id: dept.institution_id }); 
                                  setIsDeptModalOpen(true); 
                                }}
                                className="p-2 text-neutral-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeptDelete(dept.id)}
                                className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <SaaSControlCenterSupport institutions={institutions} currentUser={currentUser} />
          )}

          {activeTab === 'education' && (
            <SaaSControlCenterEducation institutions={institutions} currentUser={currentUser} />
          )}

        </div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        
        {/* Municipality Modal */}
        {isInstModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{editingInstitution ? 'Editar Prefeitura' : 'Nova Prefeitura'}</h3>
                  <p className="text-sm text-neutral-500 mt-1">Preencha os metadados do cliente SaaS.</p>
                </div>
                <button onClick={() => setIsInstModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleInstSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nome Oficial da Prefeitura</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Prefeitura Municipal de Torixoréu"
                      value={instFormData.name}
                      onChange={e => setInstFormData({ ...instFormData, name: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Subdomínio Identificador</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: torixoreu"
                      value={instFormData.subdomain}
                      onChange={e => setInstFormData({ ...instFormData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm font-mono outline-none focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">URL da Logo (Opcional)</label>
                    <input 
                      type="url" 
                      placeholder="Ex: https://site.com/logo.png"
                      value={instFormData.logo_url}
                      onChange={e => setInstFormData({ ...instFormData, logo_url: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600 dark:text-white"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsInstModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-600/20 hover:scale-105 transition-all">Salvar Cliente</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Global User Modal */}
        {isUserModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{editingUser ? 'Editar Servidor' : 'Novo Servidor'}</h3>
                  <p className="text-sm text-neutral-500 mt-1">Gerencie a conta do servidor público.</p>
                </div>
                <button onClick={() => setIsUserModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="space-y-6">
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={userFormData.name}
                      onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Email de Acesso</label>
                    <input 
                      required
                      type="email" 
                      value={userFormData.email}
                      onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Vincular à Prefeitura</label>
                    <select 
                      value={userFormData.institution_id}
                      onChange={e => setUserFormData({ ...userFormData, institution_id: e.target.value, department_id: '' })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none dark:text-white font-bold"
                    >
                      <option value="">Sem Prefeitura (Apenas Super Admin)</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Lotação (Secretaria)</label>
                    <select 
                      value={userFormData.department_id}
                      disabled={!userFormData.institution_id}
                      onChange={e => setUserFormData({ ...userFormData, department_id: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none dark:text-white disabled:opacity-50 font-bold"
                    >
                      <option value="">Sem Lotação</option>
                      {departments
                        .filter(d => d.institution_id === userFormData.institution_id)
                        .map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Perfil</label>
                      <select 
                        value={userFormData.role}
                        onChange={e => setUserFormData({ ...userFormData, role: e.target.value as any })}
                        className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none dark:text-white font-bold"
                      >
                        <option value="Super Admin">Super Admin</option>
                        <option value="Admin">Admin</option>
                        <option value="Editor">Editor</option>
                        <option value="Visualizador">Visualizador</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Status</label>
                      <select 
                        value={userFormData.status}
                        onChange={e => setUserFormData({ ...userFormData, status: e.target.value as any })}
                        className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none dark:text-white font-bold"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1 mb-2 block">Permissões de Acesso (Módulos)</label>
                    <div className="grid grid-cols-2 gap-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 max-h-48 overflow-y-auto custom-scrollbar">
                      {[
                        { id: 'home', label: 'Painel Inicial' },
                        { id: 'controls', label: 'Controle Interno' },
                        { id: 'protocol', label: 'Protocolo' },
                        { id: 'orders', label: 'Pedidos / Compras' },
                        { id: 'contracts', label: 'Contratos' },
                        { id: 'pntp', label: 'Transparência (PNTP)' },
                        { id: 'education', label: 'Educação' },
                        { id: 'saude', label: 'Saúde' },
                        { id: 'obras', label: 'Obras' },
                        { id: 'administracao', label: 'Administração' },
                        { id: 'financas', label: 'Finanças' },
                        { id: 'servicos_publicos', label: 'Serviços Públicos' },
                        { id: 'meio_ambiente', label: 'Meio Ambiente' },
                        { id: 'tributos', label: 'Tributos' },
                        { id: 'agricultura', label: 'Agricultura' },
                        { id: 'assistencia_social', label: 'Assist. Social' },
                        { id: 'esporte', label: 'Esporte' },
                        { id: 'planejamento', label: 'Planejamento' },
                        { id: 'camara', label: 'Câmara Municipal' },
                        { id: 'patrimonio', label: 'Patrimônio' },
                        { id: 'certificates', label: 'Certidões' },
                        { id: 'doc_numbers', label: 'Controle de Ofícios' },
                        { id: 'calendar', label: 'Agenda' },
                        { id: 'norms', label: 'Normas' },
                        { id: 'risk', label: 'Riscos' },
                        { id: 'reports', label: 'Relatórios' },
                        { id: 'templates', label: 'Templates' },
                        { id: 'settings', label: 'Configurações' },
                        { id: 'support', label: 'Suporte' }
                      ].map(mod => (
                        <label key={mod.id} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={userFormData.permissions.includes(mod.id as any)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserFormData({ ...userFormData, permissions: [...userFormData.permissions, mod.id as any] });
                              } else {
                                setUserFormData({ ...userFormData, permissions: userFormData.permissions.filter(p => p !== mod.id) });
                              }
                            }}
                            className="rounded border-neutral-300 dark:border-neutral-600 text-purple-600 focus:ring-purple-500 bg-white dark:bg-neutral-900"
                          />
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{mod.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2 ml-1">
                      <button 
                        type="button" 
                        onClick={() => setUserFormData({ ...userFormData, permissions: ['home', 'controls', 'protocol', 'orders', 'contracts', 'pntp', 'education', 'saude', 'obras', 'administracao', 'financas', 'servicos_publicos', 'meio_ambiente', 'tributos', 'agricultura', 'assistencia_social', 'esporte', 'planejamento', 'camara', 'patrimonio', 'certificates', 'doc_numbers', 'calendar', 'norms', 'risk', 'reports', 'templates', 'settings', 'support'] })} 
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 transition-colors"
                      >
                        Marcar Todos
                      </button>
                      <span className="text-[10px] text-neutral-300 dark:text-neutral-700">•</span>
                      <button 
                        type="button" 
                        onClick={() => setUserFormData({ ...userFormData, permissions: [] })} 
                        className="text-[10px] font-bold text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-600/20 hover:scale-105 transition-all">Salvar Servidor</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Global Department Modal */}
        {isDeptModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{editingDept ? 'Editar Secretaria' : 'Nova Secretaria'}</h3>
                  <p className="text-sm text-neutral-500 mt-1">Associe secretarias aos municípios.</p>
                </div>
                <button onClick={() => setIsDeptModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDeptSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nome da Secretaria</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Secretaria Municipal de Educação"
                      value={deptFormData.name}
                      onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Vincular ao Município</label>
                    <select 
                      required
                      value={deptFormData.institution_id}
                      onChange={e => setDeptFormData({ ...deptFormData, institution_id: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none dark:text-white font-bold"
                    >
                      <option value="">Selecione uma prefeitura</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsDeptModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-600/20 hover:scale-105 transition-all">Salvar Secretaria</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Demo Result Modal */}
      <AnimatePresence>
        {demoResultModal.isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setDemoResultModal({ ...demoResultModal, isOpen: false })} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl p-8 max-w-md w-full border border-neutral-100 dark:border-neutral-800 text-center"
            >
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${demoResultModal.success ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}>
                {demoResultModal.success ? (
                  <CheckCircle2 size={32} className="text-emerald-500" />
                ) : (
                  <AlertTriangle size={32} className="text-rose-500" />
                )}
              </div>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">
                {demoResultModal.success ? 'Sucesso!' : 'Ocorreu um erro'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8">
                {demoResultModal.message}
              </p>
              <button 
                onClick={() => setDemoResultModal({ ...demoResultModal, isOpen: false })}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg shadow-neutral-900/20 dark:shadow-white/10"
              >
                Entendi, continuar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
