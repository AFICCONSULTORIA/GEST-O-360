import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Shield } from 'lucide-react';
import { supabase, signUpNewUser } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { AdminUser, Institution, View } from '../../types';

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
  { id: 'templates', label: 'Modelos de Documentos' }
];

export const SettingsModule = ({ users, setUsers, institutions, setInstitutions }: { users: AdminUser[], setUsers: (u: AdminUser[]) => void, institutions: Institution[], setInstitutions: (i: Institution[]) => void }) => {
  const [activeTab, setActiveTab] = React.useState<'users' | 'institutions'>('users');
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
    institution_id: ''
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
        institution_id: updatedUser.institution_id || null
      }).eq('id', updatedUser.id);
      
      if (error) {
        showToast('Erro ao salvar nível de acesso no banco de dados: ' + error.message, 'error');
        console.error("Update error:", error);
      }
    } else {
      let finalUserId = Math.random().toString(36).substr(2, 9);
      
      try {
        const { data, error } = await signUpNewUser(formData.email, formData.password);
        if (error) {
          showToast('Erro ao criar usuário no Supabase: ' + error.message, 'error');
          return;
        }
        if (data.user) {
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
        institution_id: newUser.institution_id || null
      });
    }
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleEdit = (u: AdminUser) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, role: u.role, status: u.status, password: '', permissions: u.permissions || [], institution_id: u.institution_id || '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário permanentemente?')) {
      setUsers(users.filter(u => u.id !== id));
      await supabase.from('admin_users').delete().eq('id', id);
    }
  };

  const [isInstModalOpen, setIsInstModalOpen] = React.useState(false);
  const [editingInstitution, setEditingInstitution] = React.useState<Institution | null>(null);
  const [instFormData, setInstFormData] = React.useState({ name: '' });

  const handleInstSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInstitution) {
      const updated = { ...editingInstitution, ...instFormData };
      setInstitutions(institutions.map(i => i.id === editingInstitution.id ? updated : i));
      await supabase.from('institutions').update({ name: updated.name }).eq('id', updated.id).then(({ error }) => { if (error) console.error(error) });
    } else {
      const newInst: Institution = {
        ...instFormData,
        id: Math.random().toString(36).substr(2, 9)
      };
      setInstitutions([...institutions, newInst]);
      await supabase.from('institutions').insert({ id: newInst.id, name: newInst.name }).then(({ error }) => { if (error) console.error(error) });
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
            onClick={() => setActiveTab('institutions')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'institutions' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            Instituições
          </button>
        </div>
        <button 
          onClick={() => {
            if (activeTab === 'users') {
              setEditingUser(null);
              setFormData({ name: '', email: '', role: 'Visualizador', status: 'Ativo', password: '', permissions: [], institution_id: '' });
              setIsModalOpen(true);
            } else {
              setEditingInstitution(null);
              setInstFormData({ name: '' });
              setIsInstModalOpen(true);
            }
          }}
          className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-neutral-900/20"
        >
          <span className="flex items-center gap-2"><Plus size={16} /> {activeTab === 'users' ? 'Novo Usuário' : 'Nova Instituição'}</span>
        </button>
      </div>

      {activeTab === 'users' && (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Usuário</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Nível de Acesso</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Último Acesso</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {users.map(u => (
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
              ))}
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
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {institutions.map(inst => (
                <tr key={inst.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="p-6">
                    <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{inst.name}</p>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingInstitution(inst); setInstFormData({ name: inst.name }); setIsInstModalOpen(true); }} className="p-2 text-neutral-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all">
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

      <AnimatePresence>
        {isInstModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setIsInstModalOpen(false)}
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
                      onChange={e => setInstFormData({ name: e.target.value })}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
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
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
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
                  {!editingUser && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Senha Temporária</label>
                      <input 
                        required={!editingUser}
                        type="password" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Instituição</label>
                    <select 
                      value={formData.institution_id}
                      onChange={e => setFormData({...formData, institution_id: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white"
                    >
                      <option value="">Sem Instituição</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
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
        {managingPermissionsUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setManagingPermissionsUser(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[40px] p-10 shadow-2xl space-y-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Permissões de Acesso</h3>
                  <p className="text-sm text-neutral-500 mt-1">Gerencie os módulos que <strong>{managingPermissionsUser.name}</strong> pode visualizar.</p>
                </div>
                <button onClick={() => setManagingPermissionsUser(null)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Módulos do Sistema</label>
                  <button 
                    type="button" 
                    onClick={() => setPermissionsData(permissionsData.length === AVAILABLE_PERMISSIONS.length ? [] : AVAILABLE_PERMISSIONS.map(p => p.id))}
                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-wider"
                  >
                    {permissionsData.length === AVAILABLE_PERMISSIONS.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 p-2 rounded-lg transition-colors">
                      <input 
                        type="checkbox"
                        checked={permissionsData.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPermissionsData(prev => [...prev, perm.id]);
                          } else {
                            setPermissionsData(prev => prev.filter(p => p !== perm.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-neutral-900 bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700"
                      />
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{perm.label}</span>
                    </label>
                  ))}
                </div>

                <div className="pt-4 flex gap-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button type="button" onClick={() => setManagingPermissionsUser(null)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
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
                        showToast('Permissões salvas com sucesso!', 'success');
                      }
                      setManagingPermissionsUser(null);
                    }}
                    className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all"
                  >
                    Salvar Permissões
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
