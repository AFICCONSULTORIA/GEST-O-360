import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';
import { Users, School, GraduationCap, Search, Edit2, Trash2, Plus, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Modals ---

const SchoolModal = ({ 
  isOpen, onClose, onSave, editingSchool, institutions 
}: { 
  isOpen: boolean, onClose: () => void, onSave: (school: any) => void, editingSchool: any, institutions: Institution[] 
}) => {
  const [formData, setFormData] = useState({ name: '', principal_name: '', institution_id: institutions[0]?.id || '' });

  useEffect(() => {
    if (editingSchool) {
      setFormData({ name: editingSchool.name || '', principal_name: editingSchool.principal_name || '', institution_id: editingSchool.institution_id || institutions[0]?.id || '' });
    } else {
      setFormData({ name: '', principal_name: '', institution_id: institutions[0]?.id || '' });
    }
  }, [editingSchool, isOpen, institutions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2 text-sky-600 dark:text-sky-400">
            <School size={24} /> {editingSchool ? 'Editar Escola' : 'Nova Escola'}
          </h3>
          <button onClick={onClose} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Município (Prefeitura)</label>
            <select 
              value={formData.institution_id} 
              onChange={e => setFormData({ ...formData, institution_id: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
            >
              {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Nome da Escola</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
              placeholder="Ex: E.M. João da Silva"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Nome do Diretor(a)</label>
            <input 
              type="text" 
              value={formData.principal_name} 
              onChange={e => setFormData({ ...formData, principal_name: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
              placeholder="Ex: Maria Antonieta"
            />
          </div>
        </div>

        <button 
          onClick={() => onSave(formData)}
          className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Save size={16} /> Salvar Escola
        </button>
      </div>
    </div>
  );
};

const TeacherModal = ({ 
  isOpen, onClose, onSave, editingTeacher, institutions, schools 
}: { 
  isOpen: boolean, onClose: () => void, onSave: (t: any) => void, editingTeacher: any, institutions: Institution[], schools: any[] 
}) => {
  const [formData, setFormData] = useState({ name: '', status: 'Ativo', school_id: '', institution_id: institutions[0]?.id || '' });

  useEffect(() => {
    if (editingTeacher) {
      setFormData({ 
        name: editingTeacher.name || '', 
        status: editingTeacher.status || 'Ativo', 
        school_id: editingTeacher.school_id || '', 
        institution_id: editingTeacher.institution_id || institutions[0]?.id || '' 
      });
    } else {
      setFormData({ name: '', status: 'Ativo', school_id: '', institution_id: institutions[0]?.id || '' });
    }
  }, [editingTeacher, isOpen, institutions]);

  if (!isOpen) return null;

  const filteredSchools = schools.filter(s => s.institution_id === formData.institution_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Users size={24} /> {editingTeacher ? 'Editar Professor' : 'Novo Professor'}
          </h3>
          <button onClick={onClose} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Município (Prefeitura)</label>
            <select 
              value={formData.institution_id} 
              onChange={e => setFormData({ ...formData, institution_id: e.target.value, school_id: '' })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
            >
              {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Escola Vinculada</label>
            <select 
              value={formData.school_id} 
              onChange={e => setFormData({ ...formData, school_id: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
            >
              <option value="">Selecione uma escola...</option>
              {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Nome do Professor</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
              placeholder="Ex: Carlos Eduardo"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
            >
              <option value="Ativo">Ativo</option>
              <option value="Afastado">Afastado</option>
              <option value="Férias">Férias</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => onSave(formData)}
          className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Save size={16} /> Salvar Professor
        </button>
      </div>
    </div>
  );
};

const StudentModal = ({ 
  isOpen, onClose, onSave, editingStudent, institutions, schools 
}: { 
  isOpen: boolean, onClose: () => void, onSave: (s: any) => void, editingStudent: any, institutions: Institution[], schools: any[] 
}) => {
  const [formData, setFormData] = useState({ name: '', title: 'Iniciante', level: 1, xp: 0, school_id: '', institution_id: institutions[0]?.id || '' });

  useEffect(() => {
    if (editingStudent) {
      setFormData({ 
        name: editingStudent.name || '', 
        title: editingStudent.title || 'Iniciante', 
        level: editingStudent.level || 1, 
        xp: editingStudent.xp || 0,
        school_id: editingStudent.school_id || '', 
        institution_id: editingStudent.institution_id || institutions[0]?.id || '' 
      });
    } else {
      setFormData({ name: '', title: 'Iniciante', level: 1, xp: 0, school_id: '', institution_id: institutions[0]?.id || '' });
    }
  }, [editingStudent, isOpen, institutions]);

  if (!isOpen) return null;

  const filteredSchools = schools.filter(s => s.institution_id === formData.institution_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <GraduationCap size={24} /> {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
          </h3>
          <button onClick={onClose} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Município (Prefeitura)</label>
            <select 
              value={formData.institution_id} 
              onChange={e => setFormData({ ...formData, institution_id: e.target.value, school_id: '' })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
            >
              {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Escola Vinculada</label>
            <select 
              value={formData.school_id} 
              onChange={e => setFormData({ ...formData, school_id: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
            >
              <option value="">Selecione uma escola...</option>
              {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1">Nome do Aluno</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
              placeholder="Ex: Enzo Gabriel"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Nível</label>
              <input 
                type="number" 
                value={formData.level} 
                onChange={e => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">XP</label>
              <input 
                type="number" 
                value={formData.xp} 
                onChange={e => setFormData({ ...formData, xp: parseInt(e.target.value) || 0 })}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm font-bold outline-none"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={() => onSave(formData)}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Save size={16} /> Salvar Aluno
        </button>
      </div>
    </div>
  );
};

// --- Main Component ---

export const SaaSControlCenterEducation = ({ institutions }: { institutions: Institution[], currentUser: any }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'schools'>('schools');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('all');
  
  // Data States
  const [schools, setSchools] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    
    const { data: schoolsData } = await supabase.from('edu_schools').select('*');
    if (schoolsData) setSchools(schoolsData);

    const { data: teachersData } = await supabase.from('edu_teachers').select('*');
    if (teachersData) setTeachers(teachersData);

    const { data: studentsData } = await supabase.from('edu_students').select('*');
    if (studentsData) setStudents(studentsData);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers ---
  
  const handleSaveSchool = async (formData: any) => {
    if (!formData.name) return showToast('Preencha o nome da escola.', 'warning');
    if (!formData.institution_id) return showToast('Selecione o município.', 'warning');

    const loadingToast = showToast('Salvando escola...', 'info');
    try {
      if (editingSchool) {
        const { error } = await supabase.from('edu_schools').update(formData).eq('id', editingSchool.id);
        if (error) throw error;
        setSchools(schools.map(s => s.id === editingSchool.id ? { ...s, ...formData } : s));
        showToast('Escola atualizada com sucesso!', 'success');
      } else {
        const { data, error } = await supabase.from('edu_schools').insert([formData]).select().single();
        if (error) throw error;
        if (data) setSchools([...schools, data]);
        showToast('Escola criada com sucesso!', 'success');
      }
      setIsSchoolModalOpen(false);
      setEditingSchool(null);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('relation "public.edu_schools" does not exist')) {
         showToast('Erro: A tabela no banco de dados não foi criada. Por favor, execute o script SQL.', 'error');
      } else {
         showToast('Erro ao salvar escola.', 'error');
      }
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta escola? Todos os professores e alunos vinculados a ela ficarão sem escola.')) return;
    try {
      const { error } = await supabase.from('edu_schools').delete().eq('id', id);
      if (error) throw error;
      setSchools(schools.filter(s => s.id !== id));
      // Update local teachers and students that belonged to this school
      setTeachers(teachers.map(t => t.school_id === id ? { ...t, school_id: null } : t));
      setStudents(students.map(s => s.school_id === id ? { ...s, school_id: null } : s));
      showToast('Escola excluída.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao excluir escola.', 'error');
    }
  };

  const handleSaveTeacher = async (formData: any) => {
    if (!formData.name) return showToast('Preencha o nome do professor.', 'warning');
    if (!formData.institution_id) return showToast('Selecione o município.', 'warning');

    const loadingToast = showToast('Salvando professor...', 'info');
    try {
      const payload = { ...formData, school_id: formData.school_id || null };
      if (editingTeacher) {
        const { error } = await supabase.from('edu_teachers').update(payload).eq('id', editingTeacher.id);
        if (error) throw error;
        setTeachers(teachers.map(t => t.id === editingTeacher.id ? { ...t, ...payload } : t));
        showToast('Professor atualizado com sucesso!', 'success');
      } else {
        const { data, error } = await supabase.from('edu_teachers').insert([payload]).select().single();
        if (error) throw error;
        if (data) setTeachers([...teachers, data]);
        showToast('Professor cadastrado com sucesso!', 'success');
      }
      setIsTeacherModalOpen(false);
      setEditingTeacher(null);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('relation "public.edu_teachers" does not exist')) {
         showToast('Erro: Tabela não existe. Rode o script SQL.', 'error');
      } else {
         showToast('Erro ao salvar professor.', 'error');
      }
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este professor?')) return;
    try {
      const { error } = await supabase.from('edu_teachers').delete().eq('id', id);
      if (error) throw error;
      setTeachers(teachers.filter(t => t.id !== id));
      showToast('Professor excluído.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao excluir professor.', 'error');
    }
  };

  const handleSaveStudent = async (formData: any) => {
    if (!formData.name) return showToast('Preencha o nome do aluno.', 'warning');
    if (!formData.institution_id) return showToast('Selecione o município.', 'warning');

    const loadingToast = showToast('Salvando aluno...', 'info');
    try {
      const payload = { ...formData, school_id: formData.school_id || null };
      if (editingStudent) {
        const { error } = await supabase.from('edu_students').update(payload).eq('id', editingStudent.id);
        if (error) throw error;
        setStudents(students.map(s => s.id === editingStudent.id ? { ...s, ...payload } : s));
        showToast('Aluno atualizado com sucesso!', 'success');
      } else {
        const { data, error } = await supabase.from('edu_students').insert([payload]).select().single();
        if (error) throw error;
        if (data) setStudents([...students, data]);
        showToast('Aluno matriculado com sucesso!', 'success');
      }
      setIsStudentModalOpen(false);
      setEditingStudent(null);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('relation "public.edu_students" does not exist')) {
         showToast('Erro: Tabela não existe. Rode o script SQL.', 'error');
      } else {
         showToast('Erro ao salvar aluno.', 'error');
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
    try {
      const { error } = await supabase.from('edu_students').delete().eq('id', id);
      if (error) throw error;
      setStudents(students.filter(s => s.id !== id));
      showToast('Aluno excluído.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao excluir aluno.', 'error');
    }
  };

  // --- Renders ---

  const renderSchoolsTab = () => (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <School size={20} /> Unidades Escolares
        </h2>
        <button 
          onClick={() => { setEditingSchool(null); setIsSchoolModalOpen(true); }}
          className="px-4 py-2 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <Plus size={14} /> Nova Escola
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome da Unidade</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Prefeitura</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Diretor</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
               <tr><td colSpan={4} className="p-6 text-center text-sm text-neutral-500">Carregando...</td></tr>
            ) : schools.length === 0 ? (
               <tr><td colSpan={4} className="p-6 text-center text-sm text-neutral-500">Nenhuma escola cadastrada ou aguardando script do banco.</td></tr>
            ) : schools.filter(s => (selectedInstitutionId === 'all' || s.institution_id === selectedInstitutionId) && s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(school => (
               <tr key={school.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50">
                 <td className="p-6 font-bold text-sm">{school.name}</td>
                 <td className="p-6 text-xs text-neutral-500">{institutions.find(i => i.id === school.institution_id)?.name || 'Sem vínculo'}</td>
                 <td className="p-6 text-xs text-neutral-500">{school.principal_name || '-'}</td>
                 <td className="p-6 text-right">
                   <button onClick={() => { setEditingSchool(school); setIsSchoolModalOpen(true); }} className="p-2 text-neutral-400 hover:text-sky-500"><Edit2 size={16}/></button>
                   <button onClick={() => handleDeleteSchool(school.id)} className="p-2 text-neutral-400 hover:text-rose-500"><Trash2 size={16}/></button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTeachersTab = () => (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Users size={20} /> Professores
        </h2>
        <button 
          onClick={() => { setEditingTeacher(null); setIsTeacherModalOpen(true); }}
          className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <Plus size={14} /> Novo Professor
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome do Professor</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Escola Vinculada</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
               <tr><td colSpan={4} className="p-6 text-center text-sm text-neutral-500">Carregando...</td></tr>
            ) : teachers.length === 0 ? (
               <tr><td colSpan={4} className="p-6 text-center text-sm text-neutral-500">Nenhum professor cadastrado.</td></tr>
            ) : teachers.filter(t => (selectedInstitutionId === 'all' || t.institution_id === selectedInstitutionId) && t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(teacher => (
               <tr key={teacher.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50">
                 <td className="p-6 font-bold text-sm">{teacher.name}</td>
                 <td className="p-6 text-xs text-neutral-500">{schools.find(s => s.id === teacher.school_id)?.name || 'Sem vínculo'}</td>
                 <td className="p-6 text-xs">
                   <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase">{teacher.status}</span>
                 </td>
                 <td className="p-6 text-right">
                   <button onClick={() => { setEditingTeacher(teacher); setIsTeacherModalOpen(true); }} className="p-2 text-neutral-400 hover:text-indigo-500"><Edit2 size={16}/></button>
                   <button onClick={() => handleDeleteTeacher(teacher.id)} className="p-2 text-neutral-400 hover:text-rose-500"><Trash2 size={16}/></button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStudentsTab = () => (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <GraduationCap size={20} /> Alunos Matriculados
        </h2>
        <button 
          onClick={() => { setEditingStudent(null); setIsStudentModalOpen(true); }}
          className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <Plus size={14} /> Novo Aluno
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Aluno</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Escola</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Nível / XP</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
               <tr><td colSpan={4} className="p-6 text-center text-sm text-neutral-500">Carregando...</td></tr>
            ) : students.length === 0 ? (
               <tr><td colSpan={4} className="p-6 text-center text-sm text-neutral-500">Nenhum aluno cadastrado.</td></tr>
            ) : students.filter(s => (selectedInstitutionId === 'all' || s.institution_id === selectedInstitutionId) && s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(student => (
               <tr key={student.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50">
                 <td className="p-6">
                   <p className="font-bold text-sm">{student.name}</p>
                   <p className="text-[10px] text-amber-500 font-bold">{student.title}</p>
                 </td>
                 <td className="p-6 text-xs text-neutral-500">{schools.find(s => s.id === student.school_id)?.name || 'Sem vínculo'}</td>
                 <td className="p-6 text-xs">
                   Lvl {student.level} • {student.xp} XP
                 </td>
                 <td className="p-6 text-right">
                   <button onClick={() => { setEditingStudent(student); setIsStudentModalOpen(true); }} className="p-2 text-neutral-400 hover:text-amber-500"><Edit2 size={16}/></button>
                   <button onClick={() => handleDeleteStudent(student.id)} className="p-2 text-neutral-400 hover:text-rose-500"><Trash2 size={16}/></button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('schools')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'schools' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
          >
            <School size={16} /> Escolas
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'teachers' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
          >
            <Users size={16} /> Professores
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'students' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
          >
            <GraduationCap size={16} /> Alunos
          </button>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <select
            value={selectedInstitutionId}
            onChange={(e) => setSelectedInstitutionId(e.target.value)}
            className="w-full md:w-48 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs outline-none font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
          >
            <option value="all">Todos os Municípios</option>
            {institutions.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar registros..." 
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {activeTab === 'schools' && renderSchoolsTab()}
          {activeTab === 'teachers' && renderTeachersTab()}
          {activeTab === 'students' && renderStudentsTab()}
        </motion.div>
      </AnimatePresence>

      <SchoolModal 
        isOpen={isSchoolModalOpen} 
        onClose={() => { setIsSchoolModalOpen(false); setEditingSchool(null); }} 
        onSave={handleSaveSchool} 
        editingSchool={editingSchool} 
        institutions={institutions} 
      />

      <TeacherModal 
        isOpen={isTeacherModalOpen} 
        onClose={() => { setIsTeacherModalOpen(false); setEditingTeacher(null); }} 
        onSave={handleSaveTeacher} 
        editingTeacher={editingTeacher} 
        institutions={institutions} 
        schools={schools} 
      />

      <StudentModal 
        isOpen={isStudentModalOpen} 
        onClose={() => { setIsStudentModalOpen(false); setEditingStudent(null); }} 
        onSave={handleSaveStudent} 
        editingStudent={editingStudent} 
        institutions={institutions} 
        schools={schools} 
      />
    </div>
  );
};
