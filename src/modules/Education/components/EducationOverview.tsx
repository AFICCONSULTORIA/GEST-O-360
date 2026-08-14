import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Plus, Search, Filter, Edit2, Trash2, CheckCircle2, 
  AlertTriangle, Clock, Users, BookOpen, ChevronRight, X, Building2, 
  MapPin, Phone, User, ShieldCheck, Download, Calculator, TrendingUp
} from 'lucide-react';
import { showToast } from '../../../components/ui/Toast';

export interface SchoolUnit {
  id: string;
  name: string;
  type: 'CMEI' | 'Fundamental I' | 'Fundamental II' | 'Polo Rural' | 'Educação Especial';
  principal: string;
  phone: string;
  address: string;
  zone: 'Urbana' | 'Rural';
  studentsCount: number;
  capacity: number;
  compliance: number;
  status: 'regular' | 'warning' | 'critical';
  lastInspection: string;
}

const DEFAULT_SCHOOLS: SchoolUnit[] = [
  { 
    id: '1', 
    name: 'Escola Municipal Maria Quitéria', 
    type: 'Fundamental I',
    principal: 'Profª. Maria Clara Santos',
    phone: '(66) 3406-1122',
    address: 'Av. Brasil, 450 - Centro',
    zone: 'Urbana',
    studentsCount: 420,
    capacity: 480,
    compliance: 98, 
    status: 'regular', 
    lastInspection: '2024-05-01' 
  },
  { 
    id: '2', 
    name: 'CMEI Pequeno Príncipe', 
    type: 'CMEI',
    principal: 'Profª. Juliana Ferreira',
    phone: '(66) 3406-1355',
    address: 'Rua das Palmeiras, 120 - Setor Aeroporto',
    zone: 'Urbana',
    studentsCount: 180,
    capacity: 200,
    compliance: 88, 
    status: 'warning', 
    lastInspection: '2024-04-15' 
  },
  { 
    id: '3', 
    name: 'Escola Municipal Polo Rural Boa Vista', 
    type: 'Polo Rural',
    principal: 'Prof. Marcos Vinícius',
    phone: '(66) 99912-3344',
    address: 'Gleba Rio Bonito, KM 32 - Zona Rural',
    zone: 'Rural',
    studentsCount: 145,
    capacity: 160,
    compliance: 92, 
    status: 'regular', 
    lastInspection: '2024-05-10' 
  },
  { 
    id: '4', 
    name: 'CMEI Jardim das Flores', 
    type: 'CMEI',
    principal: 'Profª. Renata Albuquerque',
    phone: '(66) 3406-1890',
    address: 'Rua 15 de Novembro, 880 - Bairro Novo',
    zone: 'Urbana',
    studentsCount: 130,
    capacity: 150,
    compliance: 74, 
    status: 'critical', 
    lastInspection: '2024-03-20' 
  },
];

export const EducationOverview: React.FC = () => {
  const [schools, setSchools] = useState<SchoolUnit[]>(() => {
    const saved = localStorage.getItem('@gestao360:education_schools');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_SCHOOLS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolUnit | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<SchoolUnit['type']>('Fundamental I');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formZone, setFormZone] = useState<'Urbana' | 'Rural'>('Urbana');
  const [formStudentsCount, setFormStudentsCount] = useState<number>(100);
  const [formCapacity, setFormCapacity] = useState<number>(150);
  const [formCompliance, setFormCompliance] = useState<number>(90);
  const [formStatus, setFormStatus] = useState<'regular' | 'warning' | 'critical'>('regular');

  const saveSchoolsToStorage = (updated: SchoolUnit[]) => {
    setSchools(updated);
    localStorage.setItem('@gestao360:education_schools', JSON.stringify(updated));
  };

  const handleOpenModal = (school?: SchoolUnit) => {
    if (school) {
      setEditingSchool(school);
      setFormName(school.name);
      setFormType(school.type);
      setFormPrincipal(school.principal);
      setFormPhone(school.phone);
      setFormAddress(school.address);
      setFormZone(school.zone);
      setFormStudentsCount(school.studentsCount);
      setFormCapacity(school.capacity);
      setFormCompliance(school.compliance);
      setFormStatus(school.status);
    } else {
      setEditingSchool(null);
      setFormName('');
      setFormType('Fundamental I');
      setFormPrincipal('');
      setFormPhone('');
      setFormAddress('');
      setFormZone('Urbana');
      setFormStudentsCount(100);
      setFormCapacity(150);
      setFormCompliance(95);
      setFormStatus('regular');
    }
    setIsModalOpen(true);
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Por favor, informe o nome da unidade escolar.', 'error');
      return;
    }

    if (editingSchool) {
      const updated = schools.map(s => s.id === editingSchool.id ? {
        ...s,
        name: formName,
        type: formType,
        principal: formPrincipal,
        phone: formPhone,
        address: formAddress,
        zone: formZone,
        studentsCount: Number(formStudentsCount) || 0,
        capacity: Number(formCapacity) || 0,
        compliance: Number(formCompliance) || 0,
        status: formStatus,
      } : s);
      saveSchoolsToStorage(updated);
      showToast('Unidade escolar atualizada com sucesso!', 'success');
    } else {
      const newSchool: SchoolUnit = {
        id: Date.now().toString(),
        name: formName,
        type: formType,
        principal: formPrincipal,
        phone: formPhone,
        address: formAddress,
        zone: formZone,
        studentsCount: Number(formStudentsCount) || 0,
        capacity: Number(formCapacity) || 0,
        compliance: Number(formCompliance) || 0,
        status: formStatus,
        lastInspection: new Date().toISOString().split('T')[0]
      };
      saveSchoolsToStorage([newSchool, ...schools]);
      showToast('Nova unidade escolar cadastrada com sucesso!', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteSchool = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente remover a unidade "${name}"?`)) {
      const updated = schools.filter(s => s.id !== id);
      saveSchoolsToStorage(updated);
      showToast('Unidade escolar removida com sucesso.', 'info');
    }
  };

  const filteredSchools = schools.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.principal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || s.type === selectedType;
    const matchesZone = selectedZone === 'all' || s.zone === selectedZone;
    return matchesSearch && matchesType && matchesZone;
  });

  const totalStudents = schools.reduce((acc, s) => acc + s.studentsCount, 0);
  const totalCapacity = schools.reduce((acc, s) => acc + s.capacity, 0);
  const avgCompliance = schools.length > 0 
    ? Math.round(schools.reduce((acc, s) => acc + s.compliance, 0) / schools.length) 
    : 0;

  return (
    <div className="space-y-8">
      {/* 4 Cards de Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">MDE (Art. 212 CF)</p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">26.4%</h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tight mt-1 flex items-center gap-1">
                <ShieldCheck size={12} /> Mínimo Legal: 25% (Atingido)
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">FUNDEB Magistério</p>
              <h3 className="text-3xl font-black text-sky-600 dark:text-sky-400">72.8%</h3>
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-tight mt-1 flex items-center gap-1">
                <ShieldCheck size={12} /> Mínimo Legal: 70% (Regular)
              </p>
            </div>
            <div className="p-3 bg-sky-50 dark:bg-sky-500/10 text-sky-600 rounded-2xl">
              <Calculator size={20} />
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">PNAE (Merenda Escolar)</p>
              <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400">R$ 1.2M</h3>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tight mt-1">
                34% Agricultura Familiar (Min 30%)
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '85%' }} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Matrículas Ativas</p>
              <h3 className="text-3xl font-black text-neutral-900 dark:text-white">{totalStudents.toLocaleString()}</h3>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-tight mt-1">
                Capacidade: {totalCapacity.toLocaleString()} ({Math.round((totalStudents/totalCapacity)*100 || 0)}% ocupado)
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-2xl">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, Math.round((totalStudents/totalCapacity)*100 || 0))}%` }} />
          </div>
        </div>
      </div>

      {/* Grid Principal: Lista de Escolas e Painel Lateral de Alertas/Censo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lista e Gerenciamento de Unidades Escolares */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
            
            {/* Cabeçalho da Seção de Escolas */}
            <div className="p-6 sm:p-8 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Building2 size={20} className="text-emerald-500" />
                  Rede Municipal de Ensino ({filteredSchools.length})
                </h3>
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1">
                  Conformidade, diretorias, infraestrutura e alunos matriculados.
                </p>
              </div>
              <button 
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md shadow-neutral-900/10"
              >
                <Plus size={16} /> Nova Unidade
              </button>
            </div>

            {/* Filtros e Busca */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Buscar escola, diretora ou bairro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todos os Tipos</option>
                <option value="CMEI">CMEI (Infantil)</option>
                <option value="Fundamental I">Ensino Fundamental I</option>
                <option value="Fundamental II">Ensino Fundamental II</option>
                <option value="Polo Rural">Polo Rural</option>
              </select>
              <select 
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todas as Zonas</option>
                <option value="Urbana">Zona Urbana</option>
                <option value="Rural">Zona Rural</option>
              </select>
            </div>

            {/* Lista de Unidades */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredSchools.length === 0 ? (
                <div className="p-12 text-center text-neutral-400 font-bold text-xs uppercase tracking-widest">
                  Nenhuma unidade escolar encontrada com os filtros selecionados.
                </div>
              ) : (
                filteredSchools.map((school) => (
                  <div key={school.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        school.type === 'CMEI' ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400' :
                        school.zone === 'Rural' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <GraduationCap size={24} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-neutral-900 dark:text-white">{school.name}</h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            school.type === 'CMEI' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                            school.zone === 'Rural' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                            'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}>
                            {school.type} · {school.zone}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-medium">
                          <User size={12} /> {school.principal} · <Phone size={12} /> {school.phone}
                        </p>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                          <MapPin size={12} /> {school.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100 dark:border-neutral-800">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Matrículas</p>
                        <p className="text-xs font-black text-neutral-900 dark:text-white">
                          {school.studentsCount} <span className="text-[9px] text-neutral-400 font-normal">/ {school.capacity}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Score</p>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                          school.compliance >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          school.compliance >= 80 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}>
                          {school.compliance}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleOpenModal(school)}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl transition-all"
                          title="Editar Unidade"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSchool(school.id, school.name)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-neutral-400 hover:text-rose-600 rounded-xl transition-all"
                          title="Excluir Unidade"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Censo Escolar e Validação de Dados */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white italic">
                  Censo Escolar / <span className="text-neutral-400 font-normal">Educacenso</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Acompanhamento do fechamento de matrículas e dados declarados ao INEP.
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => showToast('Exportando arquivo consolidado do Educacenso...', 'success')}
                  className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  <Download size={14} /> Exportar INEP
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase">100% Preenchido</span>
                </div>
                <h4 className="text-xl font-black text-neutral-900 dark:text-white">{schools.length} de {schools.length}</h4>
                <p className="text-[10px] font-bold text-neutral-500 uppercase mt-0.5">Escolas Coletadas</p>
              </div>

              <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <span className="text-[10px] font-black text-amber-600 uppercase">Em Análise</span>
                </div>
                <h4 className="text-xl font-black text-neutral-900 dark:text-white">02</h4>
                <p className="text-[10px] font-bold text-neutral-500 uppercase mt-0.5">Pendências de CPF de Alunos</p>
              </div>

              <div className="p-4 bg-sky-50/50 dark:bg-sky-900/10 rounded-2xl border border-sky-100 dark:border-sky-900/20">
                <div className="flex items-center justify-between mb-2">
                  <Clock size={18} className="text-sky-500" />
                  <span className="text-[10px] font-black text-sky-600 uppercase">Prazo Legal</span>
                </div>
                <h4 className="text-xl font-black text-neutral-900 dark:text-white">31 de Julho</h4>
                <p className="text-[10px] font-bold text-neutral-500 uppercase mt-0.5">Fechamento 1ª Etapa</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Alertas Críticos, Prazos Fiscais e Resumo */}
        <div className="space-y-6">
          <div className="bg-neutral-900 dark:bg-neutral-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <AlertTriangle size={100} />
            </div>
            <h3 className="text-lg font-black italic mb-6 text-white flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-400" />
              Alertas & <span className="text-neutral-400 font-normal">Prazos Fiscais</span>
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">SIOPE Bimestral</p>
                <p className="text-xs font-bold leading-relaxed">Envio dos dados do 2º Bimestre ao FNDE. Prazo final em 18 dias.</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Chamada Pública PNAE</p>
                <p className="text-xs font-bold leading-relaxed">34% executado da Agricultura Familiar. Meta legal de 30% já superada.</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Vistorias PNATE</p>
                <p className="text-xs font-bold leading-relaxed">2 veículos da frota escolar com vistoria semestral a vencer no próximo mês.</p>
              </div>
            </div>

            <button 
              onClick={() => showToast('Todos os alertas foram consolidados e notificados aos setores responsáveis.', 'success')}
              className="w-full mt-6 bg-white text-neutral-950 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-md"
            >
              Consolidar Notificações
            </button>
          </div>

          <div className="bg-emerald-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-emerald-600/20">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <h4 className="text-xl font-black italic">Compliance da Educação</h4>
              <p className="text-emerald-100 text-xs font-medium leading-relaxed">
                A aplicação dos recursos de MDE (26.4%) e FUNDEB (72.8%) atende a todos os índices estabelecidos pela Lei de Responsabilidade Fiscal e Tribunal de Contas.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Modal de Cadastro / Edição de Unidade Escolar */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="text-emerald-500" />
                  {editingSchool ? 'Editar Unidade Escolar' : 'Nova Unidade Escolar'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSchool} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Nome da Escola / CMEI *</label>
                    <input 
                      type="text" 
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Escola Municipal Maria Quitéria"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Etapa / Tipo *</label>
                    <select 
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="CMEI">CMEI (Creche / Educação Infantil)</option>
                      <option value="Fundamental I">Ensino Fundamental I (1º ao 5º ano)</option>
                      <option value="Fundamental II">Ensino Fundamental II (6º ao 9º ano)</option>
                      <option value="Polo Rural">Polo Escolar Rural</option>
                      <option value="Educação Especial">Educação Especial / AEE</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Localização / Zona *</label>
                    <select 
                      value={formZone}
                      onChange={(e) => setFormZone(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Urbana">Zona Urbana</option>
                      <option value="Rural">Zona Rural</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Diretor(a) Responsável</label>
                    <input 
                      type="text" 
                      value={formPrincipal}
                      onChange={(e) => setFormPrincipal(e.target.value)}
                      placeholder="Ex: Profª. Maria Clara"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Telefone / Contato</label>
                    <input 
                      type="text" 
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="Ex: (66) 3406-0000"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Endereço Completo</label>
                    <input 
                      type="text" 
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Ex: Rua 15 de Novembro, 100 - Setor Centro"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Alunos Matriculados</label>
                    <input 
                      type="number" 
                      value={formStudentsCount}
                      onChange={(e) => setFormStudentsCount(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Capacidade Total</label>
                    <input 
                      type="number" 
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Índice de Conformidade (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      value={formCompliance}
                      onChange={(e) => setFormCompliance(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Status Operacional</label>
                    <select 
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="regular">Regular (Sem Pendências)</option>
                      <option value="warning">Alerta / Adequação</option>
                      <option value="critical">Crítico / Vistoria Urgente</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {editingSchool ? 'Salvar Alterações' : 'Cadastrar Unidade'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
