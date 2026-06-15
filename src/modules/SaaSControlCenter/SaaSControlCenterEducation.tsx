import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';
import { Users, School, GraduationCap, Search, Edit2, Trash2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SaaSControlCenterEducation = ({ institutions }: { institutions: Institution[], currentUser: any }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'schools'>('schools');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('all');
  
  // Data States
  const [schools, setSchools] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Attempt to fetch schools
    const { data: schoolsData } = await supabase.from('edu_schools').select('*');
    if (schoolsData) setSchools(schoolsData);

    // Attempt to fetch teachers
    const { data: teachersData } = await supabase.from('edu_teachers').select('*');
    if (teachersData) setTeachers(teachersData);

    // Attempt to fetch students
    const { data: studentsData } = await supabase.from('edu_students').select('*');
    if (studentsData) setStudents(studentsData);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderSchoolsTab = () => (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center gap-2 text-sky-600 dark:text-sky-400">
          <School size={20} /> Unidades Escolares
        </h2>
        <button className="px-4 py-2 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2">
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
                   <button className="p-2 text-neutral-400 hover:text-sky-500"><Edit2 size={16}/></button>
                   <button className="p-2 text-neutral-400 hover:text-rose-500"><Trash2 size={16}/></button>
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
        <button className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2">
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
                   <button className="p-2 text-neutral-400 hover:text-indigo-500"><Edit2 size={16}/></button>
                   <button className="p-2 text-neutral-400 hover:text-rose-500"><Trash2 size={16}/></button>
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
        <button className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2">
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
                   <button className="p-2 text-neutral-400 hover:text-amber-500"><Edit2 size={16}/></button>
                   <button className="p-2 text-neutral-400 hover:text-rose-500"><Trash2 size={16}/></button>
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
    </div>
  );
};
