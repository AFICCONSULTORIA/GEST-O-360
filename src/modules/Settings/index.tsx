import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, X, Shield,
  ClipboardCheck, ShieldAlert, Compass, Landmark, BookText, PieChart,
  FileText, Briefcase, Package, ShoppingCart, Calculator, FileBadge,
  BookOpen, Calendar, Building2, HeartPulse, GraduationCap, Wrench,
  HardHat, Leaf, Tractor, HeartHandshake, Trophy, Map, Home, Settings
} from 'lucide-react';
import { supabase, signUpNewUser } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { AdminUser, Institution, View, Department } from '../../types';

const AVAILABLE_PERMISSIONS: { id: View; label: string }[] = [
  { id: 'home', label: 'Início (Dashboard)' },
  { id: 'controls', label: 'Controles Internos' },
  { id: 'calendar', label: 'Calendário Oficial' },
  { id: 'norms', label: 'Atos Normativos' },
  { id: 'risk', label: 'Gestão de Riscos' },
  { id: 'pntp', label: 'PNTP' },
  { id: 'protocol', label: 'Protocolo' },
  { id: 'contracts', label: 'Contratos e Licitações' },
  { id: 'education', label: 'Educação' },
  { id: 'orders', label: 'Pedidos (Obras/Veículos)' },
  { id: 'doc_numbers', label: 'Controle de Numeração' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'certificates', label: 'Certidões' },
  { id: 'obras', label: 'Obras e Inf.' },
  { id: 'admin_financas', label: 'Administração/Finanças' },
  { id: 'saude', label: 'Saúde' },
  { id: 'servicos_publicos', label: 'Serviços Públicos' },
  { id: 'meio_ambiente', label: 'Meio Ambiente' },
  { id: 'tributos', label: 'Tributos' },
  { id: 'agricultura', label: 'Agricultura' },
  { id: 'assistencia_social', label: 'Assistência Social' },
  { id: 'esporte', label: 'Esporte' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'settings', label: 'Configurações' },
  { id: 'patrimonio', label: 'Patrimônio' },
  { id: 'templates', label: 'Modelos de Documentos' },
  { id: 'camara', label: 'Câmara Municipal' }
];

interface PermissionDef {
  id: View;
  label: string;
  desc: string;
  icon: React.ComponentType<any>;
}

const PERMISSION_GROUPS: {
  title: string;
  desc: string;
  items: PermissionDef[];
}[] = [
  {
    title: 'Governança & Transparência',
    desc: 'Controle de conformidade, riscos e atividades legislativas.',
    items: [
      { id: 'controls', label: 'Controles Internos', desc: 'Monitoramento de procedimentos e prazos', icon: ClipboardCheck },
      { id: 'risk', label: 'Gestão de Riscos', desc: 'Identificação e tratamento de riscos', icon: ShieldAlert },
      { id: 'pntp', label: 'PNTP', desc: 'Evidências do PNTP e portal de transparência', icon: Compass },
      { id: 'camara', label: 'Câmara Municipal', desc: 'Atividades legislativas, projetos de lei e indicações', icon: Landmark },
      { id: 'norms', label: 'Atos Normativos', desc: 'Publicação de decretos, portarias e resoluções', icon: BookText },
      { id: 'reports', label: 'Relatórios', desc: 'Relatórios e análises de desempenho municipal', icon: PieChart },
    ]
  },
  {
    title: 'Administração & Gestão',
    desc: 'Operações administrativas fundamentais e logística.',
    items: [
      { id: 'protocol', label: 'Protocolo Digital', desc: 'Processos digitais, memorandos e trâmites', icon: FileText },
      { id: 'contracts', label: 'Contratos & Licitações', desc: 'Contratos administrativos e licitações', icon: Briefcase },
      { id: 'patrimonio', label: 'Patrimônio', desc: 'Controle de bens móveis, imóveis e frotas', icon: Package },
      { id: 'orders', label: 'Pedidos (Obras/Veículos)', desc: 'Solicitações de veículos e materiais de obras', icon: ShoppingCart },
      { id: 'doc_numbers', label: 'Controle de Numeração', desc: 'Reserva e emissão de numeração oficial', icon: Calculator },
      { id: 'certificates', label: 'Banco de Certidões', desc: 'Certidões negativas de empresas e pessoas físicas', icon: FileBadge },
      { id: 'templates', label: 'Modelos de Documentos', desc: 'Repositório de minutas e arquivos modelo', icon: BookOpen },
      { id: 'calendar', label: 'Calendário Oficial', desc: 'Calendário de obrigações e eventos municipais', icon: Calendar },
    ]
  },
  {
    title: 'Secretarias Temáticas',
    desc: 'Módulos operacionais de secretarias específicas.',
    items: [
      { id: 'admin_financas', label: 'Administração & Finanças', desc: 'Portal administrativo e financeiro', icon: Building2 },
      { id: 'saude', label: 'Saúde', desc: 'Gestão de atendimentos, escalas e medicamentos', icon: HeartPulse },
      { id: 'education', label: 'Educação', desc: 'Controle de matrículas, transporte e merenda', icon: GraduationCap },
      { id: 'servicos_publicos', label: 'Serviços Públicos', desc: 'Ouvidoria de reclamações e manutenção urbana', icon: Wrench },
      { id: 'obras', label: 'Obras e Infraestrutura', desc: 'Acompanhamento físico e financeiro de obras', icon: HardHat },
      { id: 'meio_ambiente', label: 'Meio Ambiente', desc: 'Licenciamento ambiental e denúncias', icon: Leaf },
      { id: 'tributos', label: 'Tributos e Arrecadação', desc: 'Acompanhamento fiscal e impostos municipais', icon: Calculator },
      { id: 'agricultura', label: 'Agricultura', desc: 'Apoio ao produtor rural e frotas agrícolas', icon: Tractor },
      { id: 'assistencia_social', label: 'Assistência Social', desc: 'Cadastro único e programas assistenciais', icon: HeartHandshake },
      { id: 'esporte', label: 'Esportes e Lazer', desc: 'Eventos esportivos e praças de esportes', icon: Trophy },
      { id: 'planejamento', label: 'Planejamento Urbano', desc: 'Plano diretor, zoneamento e diretrizes', icon: Map },
    ]
  },
  {
    title: 'Sistema',
    desc: 'Acesso às configurações globais e tela de início.',
    items: [
      { id: 'home', label: 'Painel Principal (Início)', desc: 'Dashboard geral e acesso rápido', icon: Home },
      { id: 'settings', label: 'Configurações do Sistema', desc: 'Gerenciamento de usuários e permissões', icon: Settings },
    ]
  }
];


export const SettingsModule = ({ 
  users, 
  setUsers, 
  institutions, 
  setInstitutions,
  departments,
  setDepartments,
  currentUser
}: { 
  users: AdminUser[], 
  setUsers: (u: AdminUser[]) => void, 
  institutions: Institution[], 
  setInstitutions: (i: Institution[]) => void,
  departments: Department[],
  setDepartments: (d: Department[]) => void,
  currentUser?: AdminUser | null
}) => {
  const [activeTab, setActiveTab] = React.useState<'users' | 'institutions' | 'departments'>('users');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null);
  const [managingPermissionsUser, setManagingPermissionsUser] = React.useState<AdminUser | null>(null);
  const [permissionsData, setPermissionsData] = React.useState<string[]>([]);
  
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    role: 'Visualizador' as AdminUser['role'],
    status: 'Ativo' as AdminUser['status'],
    password: '',
    permissions: [] as View[],
    institution_id: '',
    department_id: '',
    subject: '',
    classes: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updatedUser = { ...editingUser, ...formData };
      setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      
      const { error } = await supabase.from('admin_users').update({
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        permissions: updatedUser.permissions,
        institution_id: updatedUser.institution_id || null,
        department_id: updatedUser.department_id || null
        // TODO: Migrar banco para adicionar subject e classes
        // subject: updatedUser.subject || null,
        // classes: updatedUser.classes || null
      }).eq('id', updatedUser.id);
      
      if (error) {
        showToast('Erro ao salvar nível de acesso no banco de dados: ' + error.message, 'error');
        console.error("Update error:", error);
      }
    } else {
      let finalUserId: string = crypto.randomUUID ? crypto.randomUUID() : crypto.randomUUID();
      
      try {
        const { data, error } = await signUpNewUser(formData.email, formData.password);
        if (error) {
          if (error.status === 422 || error.message.toLowerCase().includes('already registered')) {
            showToast('Usuário já registrado no Auth. Vinculando...', 'info');
            // Mantém o finalUserId gerado para a tabela admin_users
          } else {
            showToast('Erro ao criar usuário no Supabase: ' + error.message, 'error');
            return;
          }
        } else if (data?.user) {
          finalUserId = data.user.id;
        }
      } catch (err) {
        console.error("Erro no signUp:", err);
      }

      const newUser: AdminUser = {
        ...formData,
        id: finalUserId,
        lastLogin: 'Nunca'
      };
      setUsers([...users, newUser]);
      
      await supabase.from('admin_users').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        last_login: newUser.lastLogin,
        permissions: newUser.permissions,
        institution_id: newUser.institution_id || null,
        department_id: newUser.department_id || null
        // TODO: Migrar banco para adicionar subject e classes
        // subject: newUser.subject || null,
        // classes: newUser.classes || null
      });
    }
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleEdit = (u: AdminUser) => {
    setEditingUser(u);
    setFormData({ 
      name: u.name, 
      email: u.email, 
      role: u.role, 
      status: u.status, 
      password: '', 
      permissions: u.permissions || [], 
      institution_id: u.institution_id || '',
      department_id: u.department_id || '',
      subject: u.subject || '',
      classes: u.classes || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário permanentemente?')) {
      setUsers(users.filter(u => u.id !== id));
      await supabase.from('admin_users').delete().eq('id', id);
    }
  };

  const [isDeptModalOpen, setIsDeptModalOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<Department | null>(null);
  const [deptFormData, setDeptFormData] = React.useState({ name: '', institution_id: '' });

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      const updated = { ...editingDept, ...deptFormData };
      setDepartments(departments.map(d => d.id === editingDept.id ? updated : d));
      await supabase.from('departments').update({ name: updated.name, institution_id: updated.institution_id }).eq('id', updated.id).then(({ error }) => { if (error) console.error(error) });
    } else {
      const newDept: Department = {
        ...deptFormData,
        id: crypto.randomUUID()
      };
      setDepartments([...departments, newDept]);
      await supabase.from('departments').insert({ id: newDept.id, name: newDept.name, institution_id: newDept.institution_id }).then(({ error }) => { if (error) console.error(error) });
    }
    setIsDeptModalOpen(false);
    setEditingDept(null);
  };

  const handleDeptDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta secretaria? Todos os servidores lotados nela ficarão sem lotação.')) {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) {
        showToast(`Erro ao excluir secretaria: ${error.message}`, 'error');
        console.error(error);
      } else {
        setDepartments(departments.filter(d => d.id !== id));
        showToast('Secretaria removida com sucesso!', 'success');
      }
    }
  };

  const [isInstModalOpen, setIsInstModalOpen] = React.useState(false);
  const [editingInstitution, setEditingInstitution] = React.useState<Institution | null>(null);
  const [instFormData, setInstFormData] = React.useState({ name: '', subdomain: '' });

  const handleInstSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInstitution) {
      const updated = { ...editingInstitution, ...instFormData };
      setInstitutions(institutions.map(i => i.id === editingInstitution.id ? updated : i));
      await supabase.from('institutions').update({ name: updated.name, subdomain: updated.subdomain }).eq('id', updated.id).then(({ error }) => { if (error) console.error(error) });
    } else {
      const newInst: Institution = {
        ...instFormData,
        id: crypto.randomUUID()
      };
      setInstitutions([...institutions, newInst]);
      await supabase.from('institutions').insert({ id: newInst.id, name: newInst.name, subdomain: newInst.subdomain }).then(({ error }) => { if (error) console.error(error) });
    }
    setIsInstModalOpen(false);
    setEditingInstitution(null);
  };

  const handleInstDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta instituição?')) {
      const { error } = await supabase.from('institutions').delete().eq('id', id);
      if (error) {
        showToast(`Erro ao excluir instituição: ${error.message}`, 'error');
        console.error(error);
      } else {
        setInstitutions(institutions.filter(i => i.id !== id));
        showToast('Instituição removida com sucesso!', 'success');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Configurações</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Gerencie os usuários, instituições e permissões.</p>
        </div>
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            Usuários
          </button>
          <button 
            onClick={() => setActiveTab('departments')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'departments' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            Secretarias
          </button>
          {currentUser?.role === 'Super Admin' && (
            <button 
              onClick={() => setActiveTab('institutions')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'institutions' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Instituições
            </button>
          )}
        </div>
        <button 
          onClick={() => {
            if (activeTab === 'users') {
              setEditingUser(null);
              setFormData({ name: '', email: '', role: 'Visualizador', status: 'Ativo', password: '', permissions: [], institution_id: currentUser?.institution_id || '', department_id: '', subject: '', classes: [] });
              setIsModalOpen(true);
            } else if (activeTab === 'departments') {
              setEditingDept(null);
              setDeptFormData({ name: '', institution_id: currentUser?.institution_id || (institutions.length > 0 ? institutions[0].id : '') });
              setIsDeptModalOpen(true);
            } else {
              setEditingInstitution(null);
              setInstFormData({ name: '', subdomain: '' });
              setIsInstModalOpen(true);
            }
          }}
          className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-neutral-900/20"
        >
          <span className="flex items-center gap-2">
            <Plus size={16} /> 
            {activeTab === 'users' ? 'Novo Usuário' : activeTab === 'departments' ? 'Nova Secretaria' : 'Nova Instituição'}
          </span>
        </button>
      </div>

      {activeTab === 'users' && (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Usuário</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Lotação / Prefeitura</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Nível de Acesso</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Último Acesso</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {users.map(u => {
                const userInst = institutions.find(i => i.id === u.institution_id);
                const userDept = departments.find(d => d.id === u.department_id);
                
                return (
                  <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 font-black">
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
                          {userInst ? userInst.name.replace('Prefeitura Municipal de ', 'Prefeitura de ') : 'Global'}
                        </p>
                        <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {userDept ? userDept.name : 'Sem Secretaria'}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        u.role === 'Super Admin' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' :
                        u.role === 'Admin' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                        u.role === 'Editor' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' :
                        'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
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
                    <td className="p-6">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{u.lastLogin}</p>
                    </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setManagingPermissionsUser(u);
                          setPermissionsData(u.permissions || []);
                        }} 
                        className="p-2 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                        title="Permissões"
                      >
                        <Shield size={16} />
                      </button>
                      <button onClick={() => handleEdit(u)} className="p-2 text-neutral-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
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

      {activeTab === 'institutions' && (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Instituição</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Subdomínio</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {institutions.map(inst => (
                <tr key={inst.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="p-6">
                    <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{inst.name}</p>
                  </td>
                  <td className="p-6">
                    <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{inst.subdomain || '-'}</p>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingInstitution(inst); setInstFormData({ name: inst.name, subdomain: inst.subdomain || '' }); setIsInstModalOpen(true); }} className="p-2 text-neutral-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleInstDelete(inst.id)} className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
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

      {activeTab === 'departments' && (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Secretaria</th>
                {currentUser?.role === 'Super Admin' && (
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Instituição</th>
                )}
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {departments
                .filter(dept => currentUser?.role === 'Super Admin' ? true : dept.institution_id === currentUser?.institution_id)
                .map(dept => {
                  const inst = institutions.find(i => i.id === dept.institution_id);
                  return (
                    <tr key={dept.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{dept.name}</p>
                      </td>
                      {currentUser?.role === 'Super Admin' && (
                        <td className="p-6">
                          <p className="text-xs text-neutral-500">{inst ? inst.name : 'Nenhum'}</p>
                        </td>
                      )}
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
                          <button onClick={() => handleDeptDelete(dept.id)} className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
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

      <AnimatePresence>
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
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{editingInstitution ? 'Editar Instituição' : 'Nova Instituição'}</h3>
                  <p className="text-sm text-neutral-500 mt-1">Preencha o nome da instituição.</p>
                </div>
                <button onClick={() => setIsInstModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleInstSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Nome da Instituição</label>
                    <input 
                      required
                      type="text" 
                      value={instFormData.name}
                      onChange={e => setInstFormData({ ...instFormData, name: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Subdomínio (ex: torixoreu)</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Apenas letras minúsculas"
                      value={instFormData.subdomain}
                      onChange={e => setInstFormData({ ...instFormData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm font-mono outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsInstModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 hover:scale-105 transition-all">Salvar Instituição</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

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
                  <p className="text-sm text-neutral-500 mt-1">Preencha os dados da secretaria.</p>
                </div>
                <button onClick={() => setIsDeptModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDeptSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Nome da Secretaria</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Secretaria Municipal de Educação"
                      value={deptFormData.name}
                      onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                    />
                  </div>
                  {currentUser?.role === 'Super Admin' && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Instituição</label>
                      <select 
                        required
                        value={deptFormData.institution_id}
                        onChange={e => setDeptFormData({ ...deptFormData, institution_id: e.target.value })}
                        className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                      >
                        <option value="">Selecione uma instituição</option>
                        {institutions.map(inst => (
                          <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsDeptModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 hover:scale-105 transition-all">Salvar Secretaria</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
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
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                  <p className="text-sm text-neutral-500 mt-1">Preencha os dados do usuário.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Email (Login)</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Instituição</label>
                    <select 
                      value={formData.institution_id}
                      onChange={e => setFormData({...formData, institution_id: e.target.value, department_id: ''})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                    >
                      <option value="">Sem Instituição</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Secretaria (Lotação)</label>
                    <select 
                      value={formData.department_id}
                      disabled={!formData.institution_id}
                      onChange={e => setFormData({...formData, department_id: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Sem Secretaria / Lotação</option>
                      {departments
                        .filter(dept => dept.institution_id === formData.institution_id)
                        .map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Nível de Acesso</label>
                      <select 
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as any})}
                        className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                      >
                        <option value="Super Admin">Super Admin (Global)</option>
                        <option value="Admin">Admin</option>
                        <option value="Editor">Editor</option>
                        <option value="Visualizador">Visualizador</option>
                        <option value="Professor">Professor</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Status</label>
                      <select 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                  
                  {formData.role === 'Professor' && (
                    <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-2">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Disciplina</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Matemática"
                          value={formData.subject}
                          onChange={e => setFormData({...formData, subject: e.target.value})}
                          className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Turmas (separadas por vírgula)</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 4A, 5B"
                          value={formData.classes.join(', ')}
                          onChange={e => setFormData({...formData, classes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                          className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 hover:scale-105 transition-all">Salvar Usuário</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {managingPermissionsUser && (() => {
          const getLevel = (moduleId: View): 'none' | 'view' | 'edit' | 'admin' => {
            const adminPattern = `${moduleId}:admin`;
            const editPattern = `${moduleId}:edit`;
            const viewPattern = `${moduleId}:view`;

            if (permissionsData.includes(adminPattern)) return 'admin';
            if (permissionsData.includes(editPattern)) return 'edit';
            if (permissionsData.includes(viewPattern)) return 'view';
            
            if (permissionsData.includes(moduleId)) {
              const role = managingPermissionsUser.role;
              if (role === 'Admin' || role === 'Super Admin') return 'admin';
              if (role === 'Editor') return 'edit';
              return 'view';
            }
            return 'none';
          };

          const setLevel = (moduleId: View, level: 'none' | 'view' | 'edit' | 'admin') => {
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

          const hasAnyActive = AVAILABLE_PERMISSIONS.some(p => getLevel(p.id) !== 'none');

          const handleMarkAll = () => {
            if (hasAnyActive) {
              setPermissionsData([]);
            } else {
              const defaultLvl = managingPermissionsUser.role === 'Admin' ? 'admin' : managingPermissionsUser.role === 'Editor' ? 'edit' : 'view';
              setPermissionsData(AVAILABLE_PERMISSIONS.map(p => `${p.id}:${defaultLvl}`));
            }
          };

          return (
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
                className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-[40px] p-8 md:p-10 shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-6 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Shield size={20} />
                      </div>
                      <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">Permissões de Acesso Granulares</h3>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
                      Configure o nível exato de acesso para <strong>{managingPermissionsUser.name}</strong> por módulo.
                    </p>
                  </div>
                  <button onClick={() => setManagingPermissionsUser(null)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                    <X size={20} />
                  </button>
                </div>

                {/* Info Box */}
                <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 mb-6 grid grid-cols-4 gap-4 text-xs shrink-0">
                  <div className="space-y-1">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                      Bloqueado
                    </span>
                    <p className="text-neutral-500 text-[10px]">Sem qualquer acesso ao módulo.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Visualizar
                    </span>
                    <p className="text-neutral-500 text-[10px]">Apenas leitura e visualização de dados.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Editar
                    </span>
                    <p className="text-neutral-500 text-[10px]">Leitura, cadastro e edições padrão.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      Administrar
                    </span>
                    <p className="text-neutral-500 text-[10px]">Controle completo (excluir, configurar).</p>
                  </div>
                </div>

                {/* Subheader Toolbar */}
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Módulos do Sistema por Categoria</label>
                  <button 
                    type="button" 
                    onClick={handleMarkAll}
                    className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest"
                  >
                    {hasAnyActive ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-8 custom-scrollbar mb-6">
                  {PERMISSION_GROUPS.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-4">
                      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">{group.title}</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{group.desc}</p>
                      </div>
                      
                      <div className="space-y-3">
                        {group.items.map((perm) => {
                          const currentLevel = getLevel(perm.id);
                          const IconComp = perm.icon;
                          
                          return (
                            <div 
                              key={perm.id} 
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-neutral-50/55 dark:bg-neutral-800/20 border border-neutral-100/50 dark:border-neutral-800/50 rounded-2xl hover:border-neutral-200/80 dark:hover:border-neutral-700/80 transition-colors gap-3"
                            >
                              {/* Left Side Info */}
                              <div className="flex items-center gap-3.5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                                  currentLevel === 'none' 
                                    ? 'bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-100 dark:border-neutral-800' 
                                    : currentLevel === 'view'
                                    ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-500 border-blue-100/50 dark:border-blue-900/50'
                                    : currentLevel === 'edit'
                                    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500 border-amber-100/50 dark:border-amber-900/50'
                                    : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-100/50 dark:border-indigo-900/50'
                                }`}>
                                  <IconComp size={18} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{perm.label}</p>
                                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{perm.desc}</p>
                                </div>
                              </div>

                              {/* Right Side Segmented Control */}
                              <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/20 dark:border-neutral-700/20 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => setLevel(perm.id, 'none')}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    currentLevel === 'none' 
                                      ? 'bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-300 shadow-sm' 
                                      : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                                  }`}
                                >
                                  Nenhum
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLevel(perm.id, 'view')}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    currentLevel === 'view' 
                                      ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20' 
                                      : 'text-neutral-400 hover:text-blue-500'
                                  }`}
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLevel(perm.id, 'edit')}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    currentLevel === 'edit' 
                                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20' 
                                      : 'text-neutral-400 hover:text-amber-500'
                                  }`}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLevel(perm.id, 'admin')}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    currentLevel === 'admin' 
                                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' 
                                      : 'text-neutral-400 hover:text-indigo-500'
                                  }`}
                                >
                                  Admin
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 flex gap-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setManagingPermissionsUser(null)} 
                    className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all border border-neutral-100 dark:border-neutral-800"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      const updatedUser = { ...managingPermissionsUser, permissions: permissionsData as View[] };
                      setUsers(users.map(u => u.id === managingPermissionsUser.id ? updatedUser : u));
                      const { error } = await supabase.from('admin_users').update({ permissions: permissionsData }).eq('id', managingPermissionsUser.id);
                      if (error) {
                        showToast('Erro ao salvar permissões no banco de dados: ' + error.message, 'error');
                        console.error("Update permissions error:", error);
                      } else {
                        showToast('Permissões granulares salvas com sucesso!', 'success');
                      }
                      setManagingPermissionsUser(null);
                    }}
                    className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 dark:shadow-black/40 hover:scale-105 transition-all"
                  >
                    Confirmar Permissões
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};



