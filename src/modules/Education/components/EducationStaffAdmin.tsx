import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Award, 
  School, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Key, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  Share2, 
  Mail, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Filter,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { staffService, StaffMember, StaffRole, StaffStatus, generateStaffRegistration } from '../services/staffService';
import { EducationAvatar } from './EducationAvatar';
import { VotingService } from '../services/votingService';

interface EducationStaffAdminProps {
  schoolFilter?: string;
  isTeacherPortal?: boolean;
}

export const EducationStaffAdmin: React.FC<EducationStaffAdminProps> = ({ 
  schoolFilter,
  isTeacherPortal = false
}) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'coordinator'>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>(schoolFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'leave' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<StaffMember | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<StaffRole>('teacher');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('123');
  const [formRegistration, setFormRegistration] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formSchool, setFormSchool] = useState(schoolFilter || '');
  const [formWorkload, setFormWorkload] = useState(40);
  const [formClasses, setFormClasses] = useState('');
  const [formStatus, setFormStatus] = useState<StaffStatus>('active');

  // Escolas reais cadastradas no sistema
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const staff = await staffService.getStaff();
      setStaffList(staff);

      // Carregar exclusivamente escolas reais cadastradas no sistema
      const schools = VotingService.getSchools();
      const schoolNames = Array.from(new Set([
        ...schools.map(s => s.name),
        ...staff.map(st => st.school).filter(Boolean)
      ])).filter(Boolean);

      if (schoolNames.length === 0) {
        schoolNames.push('Secretaria Municipal de Educação');
      }
      setAvailableSchools(schoolNames);
      setFormSchool(prev => prev || schoolNames[0]);
    } catch (e) {
      console.error('Erro ao carregar corpo docente:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleStaffUpdated = () => {
      loadData();
    };

    window.addEventListener('staff-updated', handleStaffUpdated);
    return () => window.removeEventListener('staff-updated', handleStaffUpdated);
  }, []);

  const openNewModal = (defaultRole: StaffRole = 'teacher') => {
    setEditingStaff(null);
    setFormRole(defaultRole);
    setFormName('');
    setFormEmail('');
    setFormPassword('123');
    setFormRegistration(generateStaffRegistration(defaultRole, '', staffList.filter(s => s.role === defaultRole).length + 1));
    setFormCpf('');
    setFormPhone('');
    setFormSubject(defaultRole === 'coordinator' ? 'Coordenação Pedagógica' : 'Polivalente / Geral');
    setFormSchool(schoolFilter || (availableSchools[0] || 'EMEF Prof. Darcy Ribeiro'));
    setFormWorkload(40);
    setFormClasses('');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormRole(staff.role);
    setFormEmail(staff.email);
    setFormPassword(staff.password || '123');
    setFormRegistration(staff.registration);
    setFormCpf(staff.cpf || '');
    setFormPhone(staff.phone || '');
    setFormSubject(staff.subject);
    setFormSchool(staff.school);
    setFormWorkload(staff.workloadHours || 40);
    setFormClasses((staff.classes || []).join(', '));
    setFormStatus(staff.status);
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      showToast('Por favor, preencha o nome e o e-mail!', 'error');
      return;
    }

    const classesArray = formClasses
      ? formClasses.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    if (editingStaff) {
      await staffService.updateStaff(editingStaff.id, {
        name: formName.trim(),
        role: formRole,
        email: formEmail.trim().toLowerCase(),
        password: formPassword.trim() || '123',
        registration: formRegistration.trim(),
        cpf: formCpf.trim(),
        phone: formPhone.trim(),
        subject: formSubject.trim() || (formRole === 'coordinator' ? 'Coordenação Pedagógica' : 'Geral'),
        school: formSchool.trim(),
        workloadHours: Number(formWorkload) || 40,
        classes: classesArray,
        status: formStatus
      });
      showToast('Educador atualizado com sucesso!');
      setIsModalOpen(false);
      loadData();
    } else {
      const created = await staffService.createStaff({
        name: formName.trim(),
        role: formRole,
        email: formEmail.trim().toLowerCase(),
        password: formPassword.trim() || '123',
        registration: formRegistration.trim() || generateStaffRegistration(formRole, formName, staffList.length + 1),
        cpf: formCpf.trim(),
        phone: formPhone.trim(),
        subject: formSubject.trim() || (formRole === 'coordinator' ? 'Coordenação Pedagógica' : 'Geral'),
        school: formSchool.trim(),
        workloadHours: Number(formWorkload) || 40,
        classes: classesArray,
        status: formStatus
      });
      showToast('Educador cadastrado com sucesso!');
      setIsModalOpen(false);
      setCredentialsModal(created);
      loadData();
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    const roleLabel = staff.role === 'coordinator' ? 'o(a) coordenador(a)' : 'o(a) professor(a)';
    if (window.confirm(`Tem certeza que deseja excluir ${roleLabel} "${staff.name}" da rede?`)) {
      await staffService.deleteStaff(staff.id);
      showToast('Educador removido com sucesso!');
      loadData();
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    const nextStatus: StaffStatus = staff.status === 'active' ? 'inactive' : 'active';
    await staffService.updateStaff(staff.id, { status: nextStatus });
    showToast(nextStatus === 'active' ? 'Educador ativado!' : 'Educador desativado!');
    loadData();
  };

  // Filtragem
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.school.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || staff.role === roleFilter;
    const matchesSchool = selectedSchool === 'all' || staff.school === selectedSchool;
    const matchesStatus = statusFilter === 'all' || staff.status === statusFilter;

    return matchesSearch && matchesRole && matchesSchool && matchesStatus;
  });

  // Estatísticas
  const totalCount = staffList.length;
  const teacherCount = staffList.filter(s => s.role === 'teacher').length;
  const coordinatorCount = staffList.filter(s => s.role === 'coordinator').length;
  const activeCount = staffList.filter(s => s.status === 'active').length;
  const uniqueSchoolsCount = new Set(staffList.map(s => s.school).filter(Boolean)).size;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notificação */}
      {toastMessage && (
        <div className={`fixed top-8 right-8 z-[200] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold text-white transition-all animate-in slide-in-from-top-4 ${
          toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          <CheckCircle2 size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 rounded-[32px] p-8 md:p-10 text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest text-indigo-100">
            <Sparkles size={12} />
            Gestão da Equipe Escolar
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            Professores & Coordenadores
          </h2>
          <p className="text-indigo-100 text-sm md:text-base font-medium opacity-90 leading-relaxed">
            Cadastre os educadores da rede municipal, configure suas credenciais de login no <strong>/educacao</strong> e vincule disciplinas e turmas escolares.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3">
          <button 
            onClick={() => openNewModal('teacher')}
            className="px-5 py-3.5 bg-white text-indigo-700 hover:bg-neutral-50 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <GraduationCap size={16} />
            + Novo Professor
          </button>
          <button 
            onClick={() => openNewModal('coordinator')}
            className="px-5 py-3.5 bg-indigo-950/40 hover:bg-indigo-950/60 border border-white/30 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
          >
            <Award size={16} />
            + Novo Coordenador
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Educadores</p>
            <h3 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white mt-1">{totalCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center shrink-0">
            <GraduationCap size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Professores</p>
            <h3 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white mt-1">{teacherCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shrink-0">
            <Award size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Coordenadores</p>
            <h3 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white mt-1">{coordinatorCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
            <UserCheck size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ativos no Sistema</p>
            <h3 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white mt-1">{activeCount}</h3>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail, matrícula ou disciplina..."
              className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
            />
          </div>

          {/* Abas de Cargo */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl gap-1 shrink-0">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                roleFilter === 'all' 
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setRoleFilter('teacher')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'teacher' 
                  ? 'bg-white dark:bg-neutral-700 text-sky-600 dark:text-sky-400 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap size={14} />
              Professores ({teacherCount})
            </button>
            <button
              onClick={() => setRoleFilter('coordinator')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === 'coordinator' 
                  ? 'bg-white dark:bg-neutral-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Award size={14} />
              Coordenadores ({coordinatorCount})
            </button>
          </div>
        </div>

        {/* Filtro por Escola e Status */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-neutral-400" />
            <span className="font-bold text-neutral-500">Escola:</span>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none"
            >
              <option value="all">Todas as Escolas</option>
              {availableSchools.map(sch => (
                <option key={sch} value={sch}>{sch}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Apenas Ativos</option>
              <option value="leave">Em Licença</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Educadores */}
      {isLoading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm p-8">
          <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={36} />
          </div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white">Nenhum educador encontrado</h3>
          <p className="text-neutral-500 text-sm mt-1 max-w-md mx-auto">
            {searchQuery ? 'Tente ajustar os termos de busca ou remover os filtros aplicados.' : 'Comece cadastrando os primeiros professores e coordenadores pedagógicos da rede.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button 
              onClick={() => openNewModal('teacher')} 
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-indigo-700"
            >
              + Cadastrar Professor
            </button>
            <button 
              onClick={() => openNewModal('coordinator')} 
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-purple-700"
            >
              + Cadastrar Coordenador
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(staff => {
            const isCoord = staff.role === 'coordinator';

            return (
              <div 
                key={staff.id}
                className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-100 dark:border-neutral-800 p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Cargo e Status */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isCoord 
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                        : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
                    }`}>
                      {isCoord ? <Award size={12} /> : <GraduationCap size={12} />}
                      {isCoord ? 'Coordenador(a)' : 'Professor(a)'}
                    </span>

                    <button
                      onClick={() => handleToggleStatus(staff)}
                      title="Clique para alternar o status do educador"
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        staff.status === 'active' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100' 
                          : staff.status === 'leave'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-200'
                      }`}
                    >
                      {staff.status === 'active' ? '● Ativo' : staff.status === 'leave' ? '● Licença' : '● Inativo'}
                    </button>
                  </div>

                  {/* Header do Card com Avatar e Nome */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <EducationAvatar 
                      src={staff.avatar} 
                      name={staff.name} 
                      role="teacher" 
                      size="lg" 
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-base text-neutral-900 dark:text-white truncate">
                        {staff.name}
                      </h4>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                        {staff.subject}
                      </p>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        Matrícula: {staff.registration}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes de Lotação */}
                  <div className="space-y-2 py-3 border-y border-neutral-100 dark:border-neutral-800/60 text-xs">
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                      <School size={14} className="text-neutral-400 shrink-0" />
                      <span className="truncate font-medium">{staff.school}</span>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                      <Mail size={14} className="text-neutral-400 shrink-0" />
                      <span className="truncate font-mono">{staff.email}</span>
                    </div>

                    {staff.classes && staff.classes.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {staff.classes.map((cls, idx) => (
                          <span key={idx} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            {cls}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="mt-4 pt-2 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => setCredentialsModal(staff)}
                    className="flex-1 py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Ver dados de acesso para entrar em /educacao"
                  >
                    <Key size={13} />
                    <span>Acesso</span>
                  </button>

                  <button 
                    onClick={() => openEditModal(staff)}
                    className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                    title="Editar informações"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button 
                    onClick={() => handleDeleteStaff(staff)}
                    className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                    title="Excluir educador"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 w-full max-w-xl relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                  {editingStaff ? 'Editar Educador' : 'Cadastrar Novo Educador'}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Configure os dados e credenciais de acesso ao Portal da Educação.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              {/* Seleção de Cargo */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">Cargo / Função</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormRole('teacher')}
                    className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                      formRole === 'teacher'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    <GraduationCap size={18} />
                    Professor(a)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormRole('coordinator')}
                    className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                      formRole === 'coordinator'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    <Award size={18} />
                    Coordenador(a) Pedagógico(a)
                  </button>
                </div>
              </div>

              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">Nome Completo *</label>
                <input 
                  type="text" 
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Profa. Mariana Albuquerque"
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* E-mail de Login e Senha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">E-mail de Acesso *</label>
                  <input 
                    type="email" 
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="mariana@escola.gov.br"
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">Senha de Acesso ao /educacao</label>
                  <input 
                    type="text" 
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="123"
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Matrícula e Telefone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">Matrícula Funcional</label>
                  <input 
                    type="text" 
                    value={formRegistration}
                    onChange={(e) => setFormRegistration(e.target.value)}
                    placeholder="Ex: PROF015 ou COORD005"
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">WhatsApp / Telefone</label>
                  <input 
                    type="text" 
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(66) 99999-0000"
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Disciplina e Escola */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">Disciplina / Especialidade</label>
                  <input 
                    type="text" 
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder={formRole === 'coordinator' ? 'Ex: Coordenação Fundamental' : 'Ex: Matemática, Ciências...'}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">Escola de Lotação</label>
                  <input 
                    type="text" 
                    list="school-options"
                    value={formSchool}
                    onChange={(e) => setFormSchool(e.target.value)}
                    placeholder="Selecione ou digite a escola..."
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="school-options">
                    {availableSchools.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Turmas e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">Turmas Atendidas (separar por vírgula)</label>
                  <input 
                    type="text" 
                    value={formClasses}
                    onChange={(e) => setFormClasses(e.target.value)}
                    placeholder="Ex: Turma 4A, Turma 5B"
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-wider pl-1">Status</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Ativo(a)</option>
                    <option value="leave">Em Licença</option>
                    <option value="inactive">Inativo(a)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-2xl text-sm cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-sm shadow-lg shadow-indigo-500/20 cursor-pointer transition-all"
                >
                  {editingStaff ? 'Salvar Alterações' : 'Concluir Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Comprovante / Cartão de Credenciais de Acesso */}
      {credentialsModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/70 backdrop-blur-md" onClick={() => setCredentialsModal(null)}></div>
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl border-2 border-indigo-500/30 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-2xl font-black text-neutral-900 dark:text-white">Credenciais Geradas!</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-6">
              Envie estes dados para o educador acessar o Portal do Educador em <strong>/educacao</strong>:
            </p>

            {/* Cartão de Credenciais estilo Crachá */}
            <div className="p-6 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 text-left space-y-4 shadow-inner mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Educador</span>
                <p className="text-base font-black text-neutral-900 dark:text-white">{credentialsModal.name}</p>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {credentialsModal.role === 'coordinator' ? 'Coordenador(a) Pedagógico(a)' : 'Professor(a)'} • {credentialsModal.school}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">📧 E-mail</span>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{credentialsModal.email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">🔑 Senha</span>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono">{credentialsModal.password || '123'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-500">Link de Acesso:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">/educacao</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const message = `*PORTAL DA EDUCAÇÃO 360*\nOlá, ${credentialsModal.name}!\nSeu acesso de ${credentialsModal.role === 'coordinator' ? 'Coordenador(a)' : 'Professor(a)'} foi configurado:\nE-mail: ${credentialsModal.email}\nSenha: ${credentialsModal.password || '123'}\nAcesse o portal em: ${window.location.origin}/educacao`;
                  navigator.clipboard.writeText(message);
                  setCopiedCredentials(true);
                  showToast('Dados de acesso copiados!');
                  setTimeout(() => setCopiedCredentials(false), 2500);
                }}
                className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                {copiedCredentials ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                <span>{copiedCredentials ? 'Copiado!' : 'Copiar Acesso'}</span>
              </button>

              <button 
                onClick={() => {
                  const message = encodeURIComponent(`*PORTAL DA EDUCAÇÃO 360*\nOlá, ${credentialsModal.name}!\nSeu acesso de ${credentialsModal.role === 'coordinator' ? 'Coordenador(a)' : 'Professor(a)'} foi configurado:\nE-mail: ${credentialsModal.email}\nSenha: ${credentialsModal.password || '123'}\nAcesse o portal em: ${window.location.origin}/educacao`);
                  const cleanPhone = (credentialsModal.phone || '').replace(/\D/g, '');
                  const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
                  window.open(url, '_blank');
                }}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                title="Enviar por WhatsApp"
              >
                <Share2 size={16} />
                <span>WhatsApp</span>
              </button>

              <button 
                onClick={() => setCredentialsModal(null)}
                className="py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
