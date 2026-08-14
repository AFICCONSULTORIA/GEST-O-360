import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users2, Plus, Search, Edit2, Trash2, CheckCircle2, 
  AlertTriangle, ShieldCheck, Download, FileText, 
  Upload, X, User, Calendar, Phone, Mail, FileBadge
} from 'lucide-react';
import { showToast } from '../../../components/ui/Toast';

export interface CouncilMember {
  id: string;
  name: string;
  segment: string;
  role: 'Presidente' | 'Vice-Presidente' | 'Secretário(a)' | 'Membro Titular' | 'Membro Suplente';
  mandateStart: string;
  mandateEnd: string;
  phone: string;
  email: string;
  status: 'Vigente' | 'Expirando' | 'Vencido';
}

export interface CouncilDoc {
  id: string;
  title: string;
  date: string;
  category: 'Ata de Reunião' | 'Decreto de Nomeação' | 'Regimento Interno' | 'Parecer Conclusivo';
  fileUrl: string;
}

export interface CouncilData {
  id: string;
  code: string;
  name: string;
  fullName: string;
  description: string;
  legalBasis: string;
  members: CouncilMember[];
  documents: CouncilDoc[];
}

const DEFAULT_COUNCILS: CouncilData[] = [
  {
    id: 'cacs',
    code: 'CACS-FUNDEB',
    name: 'Conselho do FUNDEB',
    fullName: 'Conselho Municipal de Acompanhamento e Controle Social do FUNDEB',
    description: 'Fiscaliza e acompanha a repartição, transferência e aplicação dos recursos do FUNDEB no município.',
    legalBasis: 'Lei Federal nº 14.113/2020 e Decreto Municipal nº 012/2023',
    members: [
      {
        id: '1',
        name: 'Profª. Ana Lúcia Silva',
        segment: 'Professores da Educação Básica',
        role: 'Presidente',
        mandateStart: '2023-01-01',
        mandateEnd: '2026-12-31',
        phone: '(66) 99988-1122',
        email: 'ana.silva@educacao.gov.br',
        status: 'Vigente'
      },
      {
        id: '2',
        name: 'João Souza Moreira',
        segment: 'Poder Executivo Municipal',
        role: 'Secretário(a)',
        mandateStart: '2023-01-01',
        mandateEnd: '2026-12-31',
        phone: '(66) 99933-4455',
        email: 'joao.moreira@torixoreu.mt.gov.br',
        status: 'Vigente'
      },
      {
        id: '3',
        name: 'Maria Oliveira Castro',
        segment: 'Pais de Alunos da Rede Pública',
        role: 'Membro Titular',
        mandateStart: '2023-01-01',
        mandateEnd: '2026-12-31',
        phone: '(66) 99911-2233',
        email: 'maria.castro@gmail.com',
        status: 'Vigente'
      },
      {
        id: '4',
        name: 'Carlos Eduardo Lima',
        segment: 'Conselho Tutelar',
        role: 'Membro Titular',
        mandateStart: '2023-01-01',
        mandateEnd: '2026-12-31',
        phone: '(66) 99977-8899',
        email: 'conselhotutelar@torixoreu.mt.gov.br',
        status: 'Vigente'
      }
    ],
    documents: [
      { id: '1', title: 'Regimento Interno do CACS-FUNDEB 2024.pdf', date: '2024-01-15', category: 'Regimento Interno', fileUrl: '#' },
      { id: '2', title: 'Ata de Posse e Eleição da Mesa Diretora.pdf', date: '2023-01-10', category: 'Ata de Reunião', fileUrl: '#' },
      { id: '3', title: 'Parecer Conclusivo Contas FUNDEB 2023.pdf', date: '2024-04-20', category: 'Parecer Conclusivo', fileUrl: '#' },
    ]
  },
  {
    id: 'cae',
    code: 'CAE',
    name: 'Conselho de Alimentação Escolar',
    fullName: 'Conselho Municipal de Alimentação Escolar (CAE)',
    description: 'Fiscaliza a qualidade da merenda escolar, as condições de armazenamento e a execução dos recursos do PNAE.',
    legalBasis: 'Lei Federal nº 11.947/2009',
    members: [
      {
        id: '1',
        name: 'Fernanda Rocha Santos',
        segment: 'Sociedade Civil Organizada',
        role: 'Presidente',
        mandateStart: '2022-06-01',
        mandateEnd: '2026-05-31',
        phone: '(66) 99944-5566',
        email: 'fernanda.rocha@hotmail.com',
        status: 'Vigente'
      },
      {
        id: '2',
        name: 'Marcos Vinícius Gomes',
        segment: 'Trabalhadores da Educação / Merendeiras',
        role: 'Secretário(a)',
        mandateStart: '2022-06-01',
        mandateEnd: '2026-05-31',
        phone: '(66) 99922-3344',
        email: 'marcos.gomes@educacao.gov.br',
        status: 'Vigente'
      }
    ],
    documents: [
      { id: '1', title: 'Ata de Vistoria às Cozinhas das Escolas Rurais.pdf', date: '2024-05-08', category: 'Ata de Reunião', fileUrl: '#' },
      { id: '2', title: 'Parecer do CAE sobre o Cardápio PNAE 2024.pdf', date: '2024-02-28', category: 'Parecer Conclusivo', fileUrl: '#' }
    ]
  },
  {
    id: 'cme',
    code: 'CME',
    name: 'Conselho Municipal de Educação',
    fullName: 'Conselho Municipal de Educação de Torixoréu (CME)',
    description: 'Órgão normativo, deliberativo e consultivo do Sistema Municipal de Ensino.',
    legalBasis: 'Lei Orgânica Municipal e Lei Municipal de Criação do CME',
    members: [
      {
        id: '1',
        name: 'Prof. Roberto Dias Pacheco',
        segment: 'Gestores Escolares',
        role: 'Presidente',
        mandateStart: '2023-03-01',
        mandateEnd: '2025-02-28',
        phone: '(66) 99900-1199',
        email: 'roberto.pacheco@cme.gov.br',
        status: 'Vigente'
      }
    ],
    documents: [
      { id: '1', title: 'Resolução CME nº 01-2024 - Calendário Escolar.pdf', date: '2024-01-20', category: 'Regimento Interno', fileUrl: '#' }
    ]
  }
];

export const EducationCouncils: React.FC = () => {
  const [councils, setCouncils] = useState<CouncilData[]>(() => {
    const saved = localStorage.getItem('@gestao360:education_councils');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_COUNCILS;
  });

  const [activeCouncilId, setActiveCouncilId] = useState<string>('cacs');
  
  // Member modal state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CouncilMember | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberSegment, setMemberSegment] = useState('Professores da Educação Básica');
  const [memberRole, setMemberRole] = useState<CouncilMember['role']>('Membro Titular');
  const [memberStart, setMemberStart] = useState('2023-01-01');
  const [memberEnd, setMemberEnd] = useState('2026-12-31');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  // Doc modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<CouncilDoc['category']>('Ata de Reunião');
  const [docFileUrl, setDocFileUrl] = useState('');

  const saveCouncils = (updated: CouncilData[]) => {
    setCouncils(updated);
    localStorage.setItem('@gestao360:education_councils', JSON.stringify(updated));
  };

  const currentCouncil = councils.find(c => c.id === activeCouncilId) || councils[0];

  const handleOpenMemberModal = (member?: CouncilMember) => {
    if (member) {
      setEditingMember(member);
      setMemberName(member.name);
      setMemberSegment(member.segment);
      setMemberRole(member.role);
      setMemberStart(member.mandateStart);
      setMemberEnd(member.mandateEnd);
      setMemberPhone(member.phone);
      setMemberEmail(member.email);
    } else {
      setEditingMember(null);
      setMemberName('');
      setMemberSegment('Professores da Educação Básica');
      setMemberRole('Membro Titular');
      setMemberStart('2023-01-01');
      setMemberEnd('2026-12-31');
      setMemberPhone('');
      setMemberEmail('');
    }
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      showToast('Preencha o nome do conselheiro.', 'error');
      return;
    }

    const updatedCouncils = councils.map(c => {
      if (c.id === currentCouncil.id) {
        let updatedMembers: CouncilMember[];
        if (editingMember) {
          updatedMembers = c.members.map(m => m.id === editingMember.id ? {
            ...m,
            name: memberName,
            segment: memberSegment,
            role: memberRole,
            mandateStart: memberStart,
            mandateEnd: memberEnd,
            phone: memberPhone,
            email: memberEmail,
          } : m);
        } else {
          const newMember: CouncilMember = {
            id: Date.now().toString(),
            name: memberName,
            segment: memberSegment,
            role: memberRole,
            mandateStart: memberStart,
            mandateEnd: memberEnd,
            phone: memberPhone,
            email: memberEmail,
            status: 'Vigente'
          };
          updatedMembers = [...c.members, newMember];
        }
        return { ...c, members: updatedMembers };
      }
      return c;
    });

    saveCouncils(updatedCouncils);
    showToast(editingMember ? 'Conselheiro atualizado!' : 'Novo conselheiro cadastrado!', 'success');
    setIsMemberModalOpen(false);
  };

  const handleDeleteMember = (memberId: string) => {
    if (window.confirm('Deseja realmente remover este conselheiro do colegiado?')) {
      const updatedCouncils = councils.map(c => {
        if (c.id === currentCouncil.id) {
          return {
            ...c,
            members: c.members.filter(m => m.id !== memberId)
          };
        }
        return c;
      });
      saveCouncils(updatedCouncils);
      showToast('Conselheiro removido.', 'info');
    }
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      showToast('Preencha o título do documento.', 'error');
      return;
    }

    const newDoc: CouncilDoc = {
      id: Date.now().toString(),
      title: docTitle.endsWith('.pdf') ? docTitle : `${docTitle}.pdf`,
      date: new Date().toISOString().split('T')[0],
      category: docCategory,
      fileUrl: docFileUrl || '#'
    };

    const updatedCouncils = councils.map(c => {
      if (c.id === currentCouncil.id) {
        return {
          ...c,
          documents: [newDoc, ...c.documents]
        };
      }
      return c;
    });

    saveCouncils(updatedCouncils);
    showToast('Documento anexado ao repositório do conselho!', 'success');
    setIsDocModalOpen(false);
  };

  const handleDeleteDoc = (docId: string) => {
    if (window.confirm('Deseja excluir este documento?')) {
      const updatedCouncils = councils.map(c => {
        if (c.id === currentCouncil.id) {
          return {
            ...c,
            documents: c.documents.filter(d => d.id !== docId)
          };
        }
        return c;
      });
      saveCouncils(updatedCouncils);
      showToast('Documento removido.', 'info');
    }
  };

  return (
    <div className="space-y-8">
      {/* Navegação entre Conselhos */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
          {councils.map((council) => (
            <button
              key={council.id}
              onClick={() => setActiveCouncilId(council.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeCouncilId === council.id
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-lg shadow-neutral-900/10'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Users2 size={16} /> {council.code}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button 
            onClick={() => {
              setDocTitle('');
              setDocFileUrl('');
              setIsDocModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-200 transition-colors"
          >
            <Upload size={14} /> Anexar Ata / Decreto
          </button>
          <button 
            onClick={() => handleOpenMemberModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus size={16} /> Novo Conselheiro
          </button>
        </div>
      </div>

      {/* Cartão de Apresentação do Conselho Atual */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest">
            <FileBadge size={14} /> {currentCouncil.legalBasis}
          </div>
          <h2 className="text-3xl font-black italic tracking-tight">
            {currentCouncil.fullName}
          </h2>
          <p className="text-emerald-50 text-sm font-medium leading-relaxed opacity-90">
            {currentCouncil.description}
          </p>
          <div className="flex gap-6 pt-2 text-xs font-bold">
            <div>
              <span className="opacity-75 block text-[10px] uppercase">Conselheiros Ativos</span>
              <span className="text-xl font-black">{currentCouncil.members.length} Membros</span>
            </div>
            <div>
              <span className="opacity-75 block text-[10px] uppercase">Documentos & Atas</span>
              <span className="text-xl font-black">{currentCouncil.documents.length} Arquivos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Membros do Colegiado e Repositório de Atas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lista de Membros */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
            <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
              <Users2 size={20} className="text-emerald-500" />
              Membros e Composição do Colegiado ({currentCouncil.members.length})
            </h3>

            <div className="space-y-3">
              {currentCouncil.members.map((member) => (
                <div 
                  key={member.id} 
                  className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-neutral-200 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-black text-neutral-900 dark:text-white text-base shadow-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-neutral-900 dark:text-white">{member.name}</h4>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          member.role === 'Presidente' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          member.role === 'Vice-Presidente' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                          'bg-neutral-200/70 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                        }`}>
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">{member.segment}</p>
                      <p className="text-[11px] text-neutral-400 flex items-center gap-2 pt-1">
                        <span><Calendar size={11} className="inline mr-1" /> Mandato: {member.mandateStart} a {member.mandateEnd}</span>
                        {member.phone && <span>· <Phone size={11} className="inline mr-1" /> {member.phone}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-center">
                    <button 
                      onClick={() => handleOpenMemberModal(member)}
                      className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-neutral-400 hover:text-rose-600 rounded-xl transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Repositório de Documentos do Conselho */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
            <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
              <FileText size={20} className="text-sky-500" />
              Atas & Documentos ({currentCouncil.documents.length})
            </h3>

            <div className="space-y-3">
              {currentCouncil.documents.length === 0 ? (
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest text-center py-8">
                  Nenhum documento anexado ainda.
                </p>
              ) : (
                currentCouncil.documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-black text-neutral-900 dark:text-white truncate">{doc.title}</p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{doc.category} · {doc.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a 
                        href={doc.fileUrl} 
                        download={doc.title}
                        onClick={(e) => {
                          if (doc.fileUrl === '#') {
                            e.preventDefault();
                            showToast(`Baixando cópia oficial de "${doc.title}"...`, 'info');
                          }
                        }}
                        className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl transition-all"
                        title="Download"
                      >
                        <Download size={16} />
                      </a>
                      <button 
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-neutral-400 hover:text-rose-600 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modal Adicionar / Editar Conselheiro */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users2 className="text-emerald-500" />
                  {editingMember ? 'Editar Conselheiro' : `Novo Membro · ${currentCouncil.code}`}
                </h3>
                <button 
                  onClick={() => setIsMemberModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveMember} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Nome Completo *</label>
                  <input 
                    type="text" 
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Ex: Profª. Ana Lúcia Silva"
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Segmento Representativo *</label>
                    <input 
                      type="text" 
                      required
                      value={memberSegment}
                      onChange={(e) => setMemberSegment(e.target.value)}
                      placeholder="Ex: Pais de Alunos / Professores"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Cargo no Conselho *</label>
                    <select 
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Presidente">Presidente</option>
                      <option value="Vice-Presidente">Vice-Presidente</option>
                      <option value="Secretário(a)">Secretário(a)</option>
                      <option value="Membro Titular">Membro Titular</option>
                      <option value="Membro Suplente">Membro Suplente</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Início do Mandato</label>
                    <input 
                      type="date" 
                      value={memberStart}
                      onChange={(e) => setMemberStart(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Término do Mandato</label>
                    <input 
                      type="date" 
                      value={memberEnd}
                      onChange={(e) => setMemberEnd(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                      placeholder="(66) 99999-0000"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">E-mail</label>
                    <input 
                      type="email" 
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <button 
                    type="button"
                    onClick={() => setIsMemberModalOpen(false)}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {editingMember ? 'Salvar Alterações' : 'Cadastrar Membro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Upload Documento / Ata */}
      <AnimatePresence>
        {isDocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-sky-500" />
                  Anexar Documento ao {currentCouncil.code}
                </h3>
                <button 
                  onClick={() => setIsDocModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveDoc} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Título do Documento *</label>
                  <input 
                    type="text" 
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Ex: Ata da 12ª Reunião Ordinária 2024"
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Categoria</label>
                  <select 
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Ata de Reunião">Ata de Reunião</option>
                    <option value="Decreto de Nomeação">Decreto de Nomeação</option>
                    <option value="Regimento Interno">Regimento Interno</option>
                    <option value="Parecer Conclusivo">Parecer Conclusivo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Arquivo PDF</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setDocFileUrl(event.target?.result as string);
                            if (!docTitle) setDocTitle(file.name.replace('.pdf', ''));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors">
                      <Upload size={16} /> 
                      {docFileUrl ? 'Arquivo PDF Selecionado' : 'Selecionar Arquivo PDF'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <button 
                    type="button"
                    onClick={() => setIsDocModalOpen(false)}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-sky-600/20"
                  >
                    Salvar Documento
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
