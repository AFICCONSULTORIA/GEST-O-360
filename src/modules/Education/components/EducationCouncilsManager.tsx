import React, { useEffect, useMemo, useState } from 'react';
import {
  Landmark,
  Users,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCPF, formatPhone } from '../../../lib/masks';
import { showToast } from '../../../components/ui/Toast';

interface EducationCouncilsManagerProps {
  institutionId?: string;
}

interface CouncilRecord {
  id: string;
  institution_id: string;
  code: string;
  name: string;
  decree_number?: string;
  mandate_start?: string;
  mandate_end?: string;
  status: 'ativo' | 'vencido' | 'em_renovacao';
  notes?: string;
}

interface CouncilMemberRecord {
  id: string;
  institution_id: string;
  council_id: string;
  full_name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  segment: string;
  council_role: string;
  active: boolean;
}

interface CouncilMeetingRecord {
  id: string;
  institution_id: string;
  council_id: string;
  meeting_date: string;
  ata_number?: string;
  agenda: string;
  decisions?: string;
}

const DEFAULT_COUNCILS: CouncilRecord[] = [
  {
    id: '00000000-0000-0000-0000-00000000c001',
    institution_id: 'inst_1',
    code: 'CME',
    name: 'Conselho Municipal de Educação (CME)',
    decree_number: 'Decreto Municipal nº 012/2025',
    mandate_start: '2025-01-15',
    mandate_end: '2027-01-15',
    status: 'ativo'
  },
  {
    id: '00000000-0000-0000-0000-00000000c002',
    institution_id: 'inst_1',
    code: 'CACS-FUNDEB',
    name: 'Conselho do FUNDEB (CACS-FUNDEB)',
    decree_number: 'Portaria nº 044/2025',
    mandate_start: '2025-02-01',
    mandate_end: '2028-12-31',
    status: 'ativo'
  },
  {
    id: '00000000-0000-0000-0000-00000000c003',
    institution_id: 'inst_1',
    code: 'CAE',
    name: 'Conselho de Alimentação Escolar (CAE / PNAE)',
    decree_number: 'Decreto Municipal nº 028/2025',
    mandate_start: '2025-03-01',
    mandate_end: '2029-03-01',
    status: 'ativo'
  }
];

const SEGMENT_OPTIONS = [
  'Poder Executivo Municipal',
  'Professores da Rede Pública',
  'Diretores de Escolas Públicas',
  'Servidores Técnico-Administrativos',
  'Pais de Alunos',
  'Estudantes',
  'Conselho Tutelar / Sociedade Civil'
];

const ROLE_OPTIONS = [
  'Presidente',
  'Vice-Presidente',
  'Secretário(a)',
  'Conselheiro(a) Titular',
  'Conselheiro(a) Suplente'
];

export const EducationCouncilsManager: React.FC<EducationCouncilsManagerProps> = ({
  institutionId = 'inst_1'
}) => {
  const storageKey = `gestao360_edu_councils_${institutionId}`;
  const membersKey = `gestao360_edu_council_members_${institutionId}`;
  const meetingsKey = `gestao360_edu_council_meetings_${institutionId}`;

  const [councils, setCouncils] = useState<CouncilRecord[]>([]);
  const [members, setMembers] = useState<CouncilMemberRecord[]>([]);
  const [meetings, setMeetings] = useState<CouncilMeetingRecord[]>([]);
  const [selectedCouncilId, setSelectedCouncilId] = useState<string>('');
  const [subTab, setSubTab] = useState<'membros' | 'atas'>('membros');

  // Modais
  const [isCouncilModalOpen, setIsCouncilModalOpen] = useState(false);
  const [editingCouncil, setEditingCouncil] = useState<CouncilRecord | null>(null);
  const [councilForm, setCouncilForm] = useState({
    code: 'CME',
    name: '',
    decree_number: '',
    mandate_start: '',
    mandate_end: '',
    status: 'ativo' as CouncilRecord['status']
  });

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    cpf: '',
    phone: '',
    email: '',
    segment: SEGMENT_OPTIONS[0],
    council_role: ROLE_OPTIONS[3]
  });

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    meeting_date: new Date().toISOString().slice(0, 10),
    ata_number: '',
    agenda: '',
    decisions: ''
  });

  const loadAll = async () => {
    let loadedCouncils: CouncilRecord[] = [];
    let loadedMembers: CouncilMemberRecord[] = [];
    let loadedMeetings: CouncilMeetingRecord[] = [];

    try {
      const [cRes, mRes, aRes] = await Promise.all([
        supabase.from('education_councils').select('*').eq('institution_id', institutionId).order('name'),
        supabase.from('education_council_members').select('*').eq('institution_id', institutionId).order('full_name'),
        supabase.from('education_council_meetings').select('*').eq('institution_id', institutionId).order('meeting_date', { ascending: false })
      ]);
      if (!cRes.error && Array.isArray(cRes.data) && cRes.data.length > 0) loadedCouncils = cRes.data as CouncilRecord[];
      if (!mRes.error && Array.isArray(mRes.data)) loadedMembers = mRes.data as CouncilMemberRecord[];
      if (!aRes.error && Array.isArray(aRes.data)) loadedMeetings = aRes.data as CouncilMeetingRecord[];
    } catch {
      // fallback local
    }

    if (loadedCouncils.length === 0) {
      try {
        const raw = localStorage.getItem(storageKey);
        loadedCouncils = raw ? JSON.parse(raw) : DEFAULT_COUNCILS.map((c) => ({ ...c, institution_id: institutionId }));
      } catch {
        loadedCouncils = DEFAULT_COUNCILS.map((c) => ({ ...c, institution_id: institutionId }));
      }
    }

    if (loadedMembers.length === 0) {
      try {
        const raw = localStorage.getItem(membersKey);
        loadedMembers = raw ? JSON.parse(raw) : [];
      } catch {
        loadedMembers = [];
      }
    }

    if (loadedMeetings.length === 0) {
      try {
        const raw = localStorage.getItem(meetingsKey);
        loadedMeetings = raw ? JSON.parse(raw) : [];
      } catch {
        loadedMeetings = [];
      }
    }

    setCouncils(loadedCouncils);
    setMembers(loadedMembers);
    setMeetings(loadedMeetings);
    setSelectedCouncilId((prev) =>
      loadedCouncils.some((c) => c.id === prev) ? prev : loadedCouncils[0]?.id || ''
    );
  };

  useEffect(() => {
    loadAll();
  }, [institutionId]);

  const activeCouncil = useMemo(
    () => councils.find((c) => c.id === selectedCouncilId) || councils[0] || null,
    [councils, selectedCouncilId]
  );

  const councilMembers = useMemo(
    () => members.filter((m) => m.council_id === activeCouncil?.id),
    [members, activeCouncil?.id]
  );

  const councilMeetings = useMemo(
    () => meetings.filter((a) => a.council_id === activeCouncil?.id),
    [meetings, activeCouncil?.id]
  );

  const persistLocal = (c: CouncilRecord[], m: CouncilMemberRecord[], a: CouncilMeetingRecord[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(c));
      localStorage.setItem(membersKey, JSON.stringify(m));
      localStorage.setItem(meetingsKey, JSON.stringify(a));
    } catch {
      // ignore
    }
  };

  const handleSaveCouncil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!councilForm.name.trim()) return;

    const record: CouncilRecord = {
      id: editingCouncil?.id || crypto.randomUUID(),
      institution_id: institutionId,
      code: councilForm.code.trim().toUpperCase(),
      name: councilForm.name.trim(),
      decree_number: councilForm.decree_number.trim() || undefined,
      mandate_start: councilForm.mandate_start || undefined,
      mandate_end: councilForm.mandate_end || undefined,
      status: councilForm.status
    };

    const next = editingCouncil
      ? councils.map((c) => (c.id === record.id ? record : c))
      : [...councils, record];
    setCouncils(next);
    setSelectedCouncilId(record.id);
    persistLocal(next, members, meetings);
    setIsCouncilModalOpen(false);
    setEditingCouncil(null);

    try {
      await supabase.from('education_councils').upsert(record, { onConflict: 'id' });
    } catch {
      // ok
    }
    showToast('Conselho salvo com sucesso!', 'success');
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCouncil || !memberForm.full_name.trim()) return;

    const record: CouncilMemberRecord = {
      id: crypto.randomUUID(),
      institution_id: institutionId,
      council_id: activeCouncil.id,
      full_name: memberForm.full_name.trim(),
      cpf: memberForm.cpf.replace(/\D/g, '') || undefined,
      phone: memberForm.phone.trim() || undefined,
      email: memberForm.email.trim() || undefined,
      segment: memberForm.segment,
      council_role: memberForm.council_role,
      active: true
    };

    const next = [...members, record];
    setMembers(next);
    persistLocal(councils, next, meetings);
    setIsMemberModalOpen(false);
    setMemberForm({
      full_name: '',
      cpf: '',
      phone: '',
      email: '',
      segment: SEGMENT_OPTIONS[0],
      council_role: ROLE_OPTIONS[3]
    });

    try {
      await supabase.from('education_council_members').insert(record);
    } catch {
      // ok
    }
    showToast('Conselheiro(a) cadastrado(a)!', 'success');
  };

  const handleDeleteMember = async (id: string) => {
    const next = members.filter((m) => m.id !== id);
    setMembers(next);
    persistLocal(councils, next, meetings);
    try {
      await supabase.from('education_council_members').delete().eq('id', id);
    } catch {
      // ok
    }
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCouncil || !meetingForm.agenda.trim()) return;

    const record: CouncilMeetingRecord = {
      id: crypto.randomUUID(),
      institution_id: institutionId,
      council_id: activeCouncil.id,
      meeting_date: meetingForm.meeting_date,
      ata_number: meetingForm.ata_number.trim() || undefined,
      agenda: meetingForm.agenda.trim(),
      decisions: meetingForm.decisions.trim() || undefined
    };

    const next = [record, ...meetings];
    setMeetings(next);
    persistLocal(councils, members, next);
    setIsMeetingModalOpen(false);
    setMeetingForm({
      meeting_date: new Date().toISOString().slice(0, 10),
      ata_number: '',
      agenda: '',
      decisions: ''
    });

    try {
      await supabase.from('education_council_meetings').insert(record);
    } catch {
      // ok
    }
    showToast('Ata / reunião registrada!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Landmark size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white">
              Conselhos da Educação (CME · FUNDEB · CAE)
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Controle de decretos, vigência de mandatos, membros conselheiros e registro de reuniões/atas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCouncil(null);
            setCouncilForm({
              code: 'CME',
              name: '',
              decree_number: '',
              mandate_start: '',
              mandate_end: '',
              status: 'ativo'
            });
            setIsCouncilModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Novo Conselho</span>
        </button>
      </div>

      {/* Cards de Seleção dos Conselhos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {councils.map((c) => {
          const isSelected = activeCouncil?.id === c.id;
          const mCount = members.filter((m) => m.council_id === c.id).length;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCouncilId(c.id)}
              className={`rounded-3xl p-5 border-2 transition-all cursor-pointer space-y-3 ${
                isSelected
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200/70 dark:border-neutral-800 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase">
                  {c.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      c.status === 'ativo'
                        ? 'bg-emerald-100 text-emerald-700'
                        : c.status === 'em_renovacao'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {c.status === 'ativo' ? 'Ativo' : c.status === 'em_renovacao' ? 'Em Renovação' : 'Vencido'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCouncil(c);
                      setCouncilForm({
                        code: c.code,
                        name: c.name,
                        decree_number: c.decree_number || '',
                        mandate_start: c.mandate_start || '',
                        mandate_end: c.mandate_end || '',
                        status: c.status
                      });
                      setIsCouncilModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-white cursor-pointer"
                    title="Editar Conselho"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              </div>

              <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-snug">
                {c.name}
              </h4>

              <div className="text-[11px] text-neutral-500 space-y-1">
                {c.decree_number && <div>Ato: <strong>{c.decree_number}</strong></div>}
                {c.mandate_end && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>
                      Mandato até{' '}
                      <strong>{new Date(`${c.mandate_end}T12:00:00`).toLocaleDateString('pt-BR')}</strong>
                    </span>
                  </div>
                )}
                <div className="font-bold text-indigo-600 dark:text-indigo-400 pt-1">
                  {mCount} conselheiro(s) cadastrado(s)
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalhes do Conselho Selecionado: Conselheiros ou Reuniões */}
      {activeCouncil && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubTab('membros')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                  subTab === 'membros'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <Users size={14} />
                <span>Conselheiros ({councilMembers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('atas')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                  subTab === 'atas'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <FileText size={14} />
                <span>Reuniões &amp; Atas ({councilMeetings.length})</span>
              </button>
            </div>

            {subTab === 'membros' ? (
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Adicionar Conselheiro</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsMeetingModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Registrar Reunião / Ata</span>
              </button>
            )}
          </div>

          {subTab === 'membros' ? (
            councilMembers.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-400">
                Nenhum conselheiro cadastrado no <strong>{activeCouncil.code}</strong> ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-400 uppercase font-black border-b border-neutral-100 dark:border-neutral-800">
                    <tr>
                      <th className="py-3 px-4">Conselheiro(a)</th>
                      <th className="py-3 px-4">Função / Segmento</th>
                      <th className="py-3 px-4">CPF</th>
                      <th className="py-3 px-4">Contato</th>
                      <th className="py-3 px-4 text-right">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {councilMembers.map((m) => (
                      <tr key={m.id}>
                        <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white">
                          {m.full_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
                            {m.council_role}
                          </span>
                          <div className="text-[11px] text-neutral-500 mt-0.5">{m.segment}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-600 dark:text-neutral-300">
                          {m.cpf ? formatCPF(m.cpf) : '—'}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 space-y-0.5">
                          {m.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={11} /> {m.phone}
                            </div>
                          )}
                          {m.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={11} /> {m.email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : councilMeetings.length === 0 ? (
            <div className="py-10 text-center text-sm text-neutral-400">
              Nenhuma reunião ou ata registrada para o <strong>{activeCouncil.code}</strong>.
            </div>
          ) : (
            <div className="space-y-3">
              {councilMeetings.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-indigo-600 dark:text-indigo-400">
                      {a.ata_number || 'Reunião Ordinária'}
                    </span>
                    <span className="font-semibold text-neutral-400">
                      {new Date(`${a.meeting_date}T12:00:00`).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">{a.agenda}</p>
                  {a.decisions && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">{a.decisions}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Conselho */}
      {isCouncilModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCouncil}
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-neutral-900 dark:text-white">
                {editingCouncil ? 'Editar Conselho' : 'Novo Conselho da Educação'}
              </h4>
              <button type="button" onClick={() => setIsCouncilModalOpen(false)}>
                <X size={18} className="text-neutral-400" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Sigla *</label>
                <input
                  required
                  value={councilForm.code}
                  onChange={(e) => setCouncilForm({ ...councilForm, code: e.target.value })}
                  placeholder="CME"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Status</label>
                <select
                  value={councilForm.status}
                  onChange={(e) => setCouncilForm({ ...councilForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                >
                  <option value="ativo">Ativo</option>
                  <option value="em_renovacao">Em Renovação</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Nome do Conselho *</label>
              <input
                required
                value={councilForm.name}
                onChange={(e) => setCouncilForm({ ...councilForm, name: e.target.value })}
                placeholder="Ex: Conselho Municipal de Educação"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Decreto / Portaria</label>
              <input
                value={councilForm.decree_number}
                onChange={(e) => setCouncilForm({ ...councilForm, decree_number: e.target.value })}
                placeholder="Ex: Decreto nº 012/2025"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Início Mandato</label>
                <input
                  type="date"
                  value={councilForm.mandate_start}
                  onChange={(e) => setCouncilForm({ ...councilForm, mandate_start: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Fim Mandato</label>
                <input
                  type="date"
                  value={councilForm.mandate_end}
                  onChange={(e) => setCouncilForm({ ...councilForm, mandate_end: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Salvar Conselho
            </button>
          </form>
        </div>
      )}

      {/* Modal: Novo Conselheiro */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMember}
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-neutral-900 dark:text-white">
                Adicionar Conselheiro ({activeCouncil?.code})
              </h4>
              <button type="button" onClick={() => setIsMemberModalOpen(false)}>
                <X size={18} className="text-neutral-400" />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Nome Completo *</label>
              <input
                required
                value={memberForm.full_name}
                onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">CPF</label>
                <input
                  value={memberForm.cpf}
                  onChange={(e) => setMemberForm({ ...memberForm, cpf: formatCPF(e.target.value) })}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Telefone</label>
                <input
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">E-mail</label>
              <input
                type="email"
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Função</label>
                <select
                  value={memberForm.council_role}
                  onChange={(e) => setMemberForm({ ...memberForm, council_role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Representação</label>
                <select
                  value={memberForm.segment}
                  onChange={(e) => setMemberForm({ ...memberForm, segment: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold"
                >
                  {SEGMENT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Salvar Conselheiro
            </button>
          </form>
        </div>
      )}

      {/* Modal: Nova Ata */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMeeting}
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-neutral-900 dark:text-white">
                Registrar Reunião / Ata ({activeCouncil?.code})
              </h4>
              <button type="button" onClick={() => setIsMeetingModalOpen(false)}>
                <X size={18} className="text-neutral-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={meetingForm.meeting_date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Nº da Ata</label>
                <input
                  value={meetingForm.ata_number}
                  onChange={(e) => setMeetingForm({ ...meetingForm, ata_number: e.target.value })}
                  placeholder="Ata nº 001/2026"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Pauta *</label>
              <input
                required
                value={meetingForm.agenda}
                onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                placeholder="Ex: Aprovação de prestação de contas PNAE"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">Deliberações / Resumo</label>
              <textarea
                rows={3}
                value={meetingForm.decisions}
                onChange={(e) => setMeetingForm({ ...meetingForm, decisions: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Salvar Ata
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
