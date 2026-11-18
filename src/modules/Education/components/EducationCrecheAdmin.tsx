import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Baby,
  Save,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Users,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Phone,
  Bell
} from 'lucide-react';
import { showToast } from '../../../components/ui/Toast';
import { supabase, supabaseAnon } from '../../../lib/supabase';

export type CrecheStage = 'Berçário' | 'Maternal I' | 'Maternal II';
export type CrecheQueueStatus = 'aguardando' | 'convocado' | 'matriculado';

export interface CrecheQueueItem {
  id: string;
  position: number;
  child_name: string;
  guardian_name?: string;
  stage: CrecheStage;
  phone?: string;
  status: CrecheQueueStatus;
  created_at: string;
}

const LOCAL_QUEUE_KEY = 'gestao360_creche_waiting_queue';

export interface CrecheSettingsData {
  id?: string;
  bercarioTotal: number;
  bercarioOccupied: number;
  maternal1Total: number;
  maternal1Occupied: number;
  maternal2Total: number;
  maternal2Occupied: number;
  decretoUrl: string;
  decretoName: string;
  decretoDescription: string;
  isOpen: boolean;
  fichaUrl: string;
}

const DEFAULT_CRECHE_SETTINGS: CrecheSettingsData = {
  bercarioTotal: 20,
  bercarioOccupied: 0,
  maternal1Total: 35,
  maternal1Occupied: 0,
  maternal2Total: 45,
  maternal2Occupied: 0,
  decretoUrl: '',
  decretoName: 'Decreto Municipal nº 035/2024',
  decretoDescription: 'Regulamentação do Acesso à Educação Infantil e Fila Única dos CMEIs.',
  isOpen: true,
  fichaUrl: ''
};

export const EducationCrecheAdmin: React.FC = () => {
  const [settings, setSettings] = useState<CrecheSettingsData>(DEFAULT_CRECHE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decretoFile, setDecretoFile] = useState<File | null>(null);
  const [fichaFile, setFichaFile] = useState<File | null>(null);

  // Fila de Espera (Próximos da Fila)
  const [queue, setQueue] = useState<CrecheQueueItem[]>([]);
  const [queueFilterStage, setQueueFilterStage] = useState<'all' | CrecheStage>('all');
  const [addingQueue, setAddingQueue] = useState(false);
  const [newQueueForm, setNewQueueForm] = useState<{
    child_name: string;
    guardian_name: string;
    stage: CrecheStage;
    phone: string;
  }>({
    child_name: '',
    guardian_name: '',
    stage: 'Berçário',
    phone: '',
  });

  useEffect(() => {
    fetchSettings();
    fetchQueue();
  }, []);

  const persistQueueLocal = (items: CrecheQueueItem[]) => {
    try {
      localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  };

  const fetchQueue = async () => {
    try {
      let { data, error } = await supabase
        .from('creche_waiting_queue')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) {
        const retry = await supabaseAnon
          .from('creche_waiting_queue')
          .select('*')
          .order('position', { ascending: true })
          .order('created_at', { ascending: true });
        data = retry.data;
        error = retry.error;
      }
      if (!error && Array.isArray(data)) {
        const mapped: CrecheQueueItem[] = data.map((row: any) => ({
          id: row.id,
          position: Number(row.position) || 1,
          child_name: row.child_name || '',
          guardian_name: row.guardian_name || '',
          stage: (row.stage as CrecheStage) || 'Berçário',
          phone: row.phone || '',
          status: (row.status as CrecheQueueStatus) || 'aguardando',
          created_at: row.created_at || new Date().toISOString(),
        }));
        setQueue(mapped);
        persistQueueLocal(mapped);
        return;
      }
    } catch {
      // fallback to localStorage
    }
    try {
      const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
      if (raw) setQueue(JSON.parse(raw));
    } catch {
      // ignore
    }
  };

  const handleAddQueueItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newQueueForm.child_name.trim();
    if (!name) {
      showToast('Informe o nome da criança para adicionar à fila.', 'warning');
      return;
    }
    setAddingQueue(true);
    const nextPos = queue.length > 0 ? Math.max(...queue.map((q) => q.position)) + 1 : 1;
    const item: CrecheQueueItem = {
      id: crypto.randomUUID(),
      position: nextPos,
      child_name: name,
      guardian_name: newQueueForm.guardian_name.trim() || undefined,
      stage: newQueueForm.stage,
      phone: newQueueForm.phone.trim() || undefined,
      status: 'aguardando',
      created_at: new Date().toISOString(),
    };

    const nextList = [...queue, item].sort((a, b) => a.position - b.position);
    setQueue(nextList);
    persistQueueLocal(nextList);
    setNewQueueForm({ child_name: '', guardian_name: '', stage: newQueueForm.stage, phone: '' });

    try {
      let { error } = await supabase.from('creche_waiting_queue').insert({
        id: item.id,
        position: item.position,
        child_name: item.child_name,
        guardian_name: item.guardian_name || null,
        stage: item.stage,
        phone: item.phone || null,
        status: item.status,
        created_at: item.created_at,
      });
      if (error) {
        await supabaseAnon.from('creche_waiting_queue').insert({
          id: item.id,
          position: item.position,
          child_name: item.child_name,
          guardian_name: item.guardian_name || null,
          stage: item.stage,
          phone: item.phone || null,
          status: item.status,
          created_at: item.created_at,
        });
      }
    } catch {
      // already saved locally
    }
    setAddingQueue(false);
    showToast(`${name} adicionado(a) na posição #${nextPos} da fila!`, 'success');
  };

  const handleUpdateQueueStatus = async (id: string, status: CrecheQueueStatus) => {
    const nextList = queue.map((q) => (q.id === id ? { ...q, status } : q));
    setQueue(nextList);
    persistQueueLocal(nextList);
    try {
      const { error } = await supabase
        .from('creche_waiting_queue')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        await supabaseAnon
          .from('creche_waiting_queue')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);
      }
    } catch {
      // ignore
    }
    showToast('Status da criança na fila atualizado.', 'info');
  };

  const handleMoveQueuePosition = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...queue].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((q) => q.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const temp = sorted[idx];
    sorted[idx] = sorted[swapIdx];
    sorted[swapIdx] = temp;

    const reindexed = sorted.map((item, i) => ({ ...item, position: i + 1 }));
    setQueue(reindexed);
    persistQueueLocal(reindexed);

    try {
      for (const item of [reindexed[idx], reindexed[swapIdx]]) {
        const { error } = await supabase
          .from('creche_waiting_queue')
          .update({ position: item.position, updated_at: new Date().toISOString() })
          .eq('id', item.id);
        if (error) {
          await supabaseAnon
            .from('creche_waiting_queue')
            .update({ position: item.position, updated_at: new Date().toISOString() })
            .eq('id', item.id);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteQueueItem = async (id: string) => {
    const remaining = queue
      .filter((q) => q.id !== id)
      .sort((a, b) => a.position - b.position)
      .map((item, idx) => ({ ...item, position: idx + 1 }));
    setQueue(remaining);
    persistQueueLocal(remaining);
    try {
      const { error } = await supabase.from('creche_waiting_queue').delete().eq('id', id);
      if (error) {
        await supabaseAnon.from('creche_waiting_queue').delete().eq('id', id);
      }
    } catch {
      // ignore
    }
    showToast('Registro removido da fila.', 'info');
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('creche_settings').select('*').single();
      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          id: data.id,
          bercarioTotal: data.bercario_total,
          bercarioOccupied: data.bercario_occupied,
          maternal1Total: data.maternal1_total,
          maternal1Occupied: data.maternal1_occupied,
          maternal2Total: data.maternal2_total,
          maternal2Occupied: data.maternal2_occupied,
          decretoUrl: data.decreto_url || '',
          decretoName: data.decreto_name || '',
          decretoDescription: data.decreto_description || '',
          isOpen: data.is_open,
          fichaUrl: data.ficha_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching creche settings:', error);
      showToast('Erro ao carregar configurações do CMEI', 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${folder}/${Date.now()}_${safeName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('creche_documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('creche_documents')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error(`Error uploading ${folder}:`, error);
      showToast(`Erro ao fazer upload do arquivo ${folder}`, 'error');
      return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let currentDecretoUrl = settings.decretoUrl;
      let currentFichaUrl = settings.fichaUrl;

      if (decretoFile) {
        const url = await uploadFile(decretoFile, 'decreto');
        if (url) currentDecretoUrl = url;
      }

      if (fichaFile) {
        const url = await uploadFile(fichaFile, 'ficha');
        if (url) currentFichaUrl = url;
      }

      const updateData = {
        bercario_total: settings.bercarioTotal,
        bercario_occupied: settings.bercarioOccupied,
        maternal1_total: settings.maternal1Total,
        maternal1_occupied: settings.maternal1Occupied,
        maternal2_total: settings.maternal2Total,
        maternal2_occupied: settings.maternal2Occupied,
        decreto_url: currentDecretoUrl,
        decreto_name: settings.decretoName,
        decreto_description: settings.decretoDescription,
        is_open: settings.isOpen,
        ficha_url: currentFichaUrl,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        const { error } = await supabase.from('creche_settings').update(updateData).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('creche_settings').insert(updateData).select().single();
        if (error) throw error;
        if (data) settings.id = data.id;
      }

      setSettings({
        ...settings,
        decretoUrl: currentDecretoUrl,
        fichaUrl: currentFichaUrl
      });
      
      setDecretoFile(null);
      setFichaFile(null);

      showToast('Configurações do CMEI salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving creche settings:', error);
      showToast('Erro ao salvar configurações do CMEI', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Baby className="text-pink-500" /> Gestão de Vagas do CMEI (Creche)
            </h3>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">
              Configure a oferta de vagas, ocupação e os documentos disponibilizados aos cidadãos no portal público.
            </p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neutral-900/10 disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Status da Fila */}
          <div className="lg:col-span-3 bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-neutral-900 dark:text-white">Status do Sistema de Vagas</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Controla o banner exibido no portal público.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.isOpen}
                onChange={(e) => setSettings({...settings, isOpen: e.target.checked})}
              />
              <div className="w-14 h-7 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-neutral-600 peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100">
                {settings.isOpen ? 'Aberto' : 'Fila de Espera'}
              </span>
            </label>
          </div>

          {/* Berçário */}
          <div className="space-y-4 p-6 bg-sky-50/50 dark:bg-sky-900/10 rounded-3xl border border-sky-100 dark:border-sky-900/30">
            <h4 className="font-black text-sky-600 dark:text-sky-400">Berçário (0 a 1 ano)</h4>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Totais Ofertadas</label>
              <input 
                type="number" 
                value={settings.bercarioTotal}
                onChange={(e) => setSettings({...settings, bercarioTotal: parseInt(e.target.value) || 0})}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Ocupadas</label>
              <input 
                type="number" 
                value={settings.bercarioOccupied}
                onChange={(e) => setSettings({...settings, bercarioOccupied: parseInt(e.target.value) || 0})}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Maternal I */}
          <div className="space-y-4 p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30">
            <h4 className="font-black text-amber-600 dark:text-amber-400">Maternal I (1 a 2 anos)</h4>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Totais Ofertadas</label>
              <input 
                type="number" 
                value={settings.maternal1Total}
                onChange={(e) => setSettings({...settings, maternal1Total: parseInt(e.target.value) || 0})}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Ocupadas</label>
              <input 
                type="number" 
                value={settings.maternal1Occupied}
                onChange={(e) => setSettings({...settings, maternal1Occupied: parseInt(e.target.value) || 0})}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Maternal II */}
          <div className="space-y-4 p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
            <h4 className="font-black text-emerald-600 dark:text-emerald-400">Maternal II (2 a 3 anos)</h4>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Totais Ofertadas</label>
              <input 
                type="number" 
                value={settings.maternal2Total}
                onChange={(e) => setSettings({...settings, maternal2Total: parseInt(e.target.value) || 0})}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Vagas Ocupadas</label>
              <input 
                type="number" 
                value={settings.maternal2Occupied}
                onChange={(e) => setSettings({...settings, maternal2Occupied: parseInt(e.target.value) || 0})}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Documentos & Uploads */}
          <div className="lg:col-span-3 space-y-4 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-800 mt-4">
            <h4 className="font-black text-neutral-900 dark:text-white mb-4">Decreto & Ficha de Matrícula (PDFs)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Nome do Decreto Oficial</label>
                <input 
                  type="text" 
                  value={settings.decretoName}
                  onChange={(e) => setSettings({...settings, decretoName: e.target.value})}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Arquivo do Decreto (PDF)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setDecretoFile(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors relative">
                    <Upload size={16} /> 
                    {decretoFile ? decretoFile.name : (settings.decretoUrl ? 'Substituir Decreto Atual' : 'Fazer Upload do Decreto')}
                  </div>
                </div>
                {settings.decretoUrl && !decretoFile && (
                  <p className="text-[10px] font-bold text-emerald-500 mt-1">Documento atual salvo online.</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Descrição do Documento</label>
                <input 
                  type="text" 
                  value={settings.decretoDescription}
                  onChange={(e) => setSettings({...settings, decretoDescription: e.target.value})}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Ficha de Matrícula (PDF para Download do Munícipe)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFichaFile(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors relative">
                    <Upload size={16} /> 
                    {fichaFile ? fichaFile.name : (settings.fichaUrl ? 'Substituir Ficha de Matrícula' : 'Fazer Upload da Ficha de Matrícula')}
                  </div>
                </div>
                {settings.fichaUrl && !fichaFile && (
                  <p className="text-[10px] font-bold text-emerald-500 mt-1">Ficha atual salva online.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILA DE ESPERA — PRÓXIMOS DA FILA (CMEI) */}
      <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Users className="text-pink-500" size={20} />
              <span>Fila de Espera — Próximo da Fila (CMEI)</span>
            </h3>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">
              Adicione o nome das crianças na ordem da fila para controlar quem é o próximo a ser chamado para vaga.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'Berçário', 'Maternal I', 'Maternal II'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setQueueFilterStage(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  queueFilterStage === st
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
              >
                {st === 'all' ? `Todos (${queue.length})` : st}
              </button>
            ))}
          </div>
        </div>

        {/* Formulário: Adicionar Próximo da Fila */}
        <form onSubmit={handleAddQueueItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <div className="sm:col-span-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">
              Nome da Criança (Próximo da Fila) *
            </label>
            <input
              type="text"
              required
              value={newQueueForm.child_name}
              onChange={(e) => setNewQueueForm({ ...newQueueForm, child_name: e.target.value })}
              placeholder="Ex: Maria Clara da Silva"
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">
              Etapa / Turma
            </label>
            <select
              value={newQueueForm.stage}
              onChange={(e) => setNewQueueForm({ ...newQueueForm, stage: e.target.value as CrecheStage })}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="Berçário">Berçário</option>
              <option value="Maternal I">Maternal I</option>
              <option value="Maternal II">Maternal II</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">
              Responsável
            </label>
            <input
              type="text"
              value={newQueueForm.guardian_name}
              onChange={(e) => setNewQueueForm({ ...newQueueForm, guardian_name: e.target.value })}
              placeholder="Nome da mãe/pai"
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">
              Telefone / WhatsApp
            </label>
            <input
              type="text"
              value={newQueueForm.phone}
              onChange={(e) => setNewQueueForm({ ...newQueueForm, phone: e.target.value })}
              placeholder="(66) 99999-9999"
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div className="sm:col-span-1">
            <button
              type="submit"
              disabled={addingQueue}
              className="w-full flex items-center justify-center gap-1 px-3 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50"
              title="Adicionar à fila"
            >
              <Plus size={16} />
              <span className="sm:hidden">Adicionar</span>
            </button>
          </div>
        </form>

        {/* Lista da Fila */}
        {(() => {
          const filtered = queue
            .filter((q) => (queueFilterStage === 'all' ? true : q.stage === queueFilterStage))
            .sort((a, b) => a.position - b.position);
          const firstWaitingId = filtered.find((q) => q.status === 'aguardando')?.id;

          if (filtered.length === 0) {
            return (
              <div className="text-center py-8 text-xs font-medium text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                Nenhuma criança cadastrada na fila de espera ainda. Use o formulário acima para adicionar o próximo da fila.
              </div>
            );
          }

          return (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-100 dark:border-neutral-800 rounded-2xl overflow-hidden">
              {filtered.map((item) => {
                const isNext = item.id === firstWaitingId;
                return (
                  <div
                    key={item.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isNext
                        ? 'bg-pink-50/70 dark:bg-pink-950/20'
                        : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isNext
                            ? 'bg-pink-600 text-white shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                        }`}
                      >
                        #{item.position}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-neutral-900 dark:text-white">
                            {item.child_name}
                          </span>
                          {isNext && (
                            <span className="px-2 py-0.5 rounded-full bg-pink-600 text-white text-[10px] font-black uppercase tracking-wider">
                              Próximo da Fila
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                            {item.stage}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'convocado'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : item.status === 'matriculado'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}
                          >
                            {item.status === 'aguardando'
                              ? 'Aguardando'
                              : item.status === 'convocado'
                              ? 'Convocado'
                              : 'Matriculado'}
                          </span>
                        </div>
                        {(item.guardian_name || item.phone) && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex flex-wrap items-center gap-3">
                            {item.guardian_name && <span>Resp.: {item.guardian_name}</span>}
                            {item.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone size={11} /> {item.phone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveQueuePosition(item.id, 'up')}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                        title="Subir posição na fila"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQueuePosition(item.id, 'down')}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                        title="Descer posição na fila"
                      >
                        <ArrowDown size={14} />
                      </button>
                      {item.status === 'aguardando' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateQueueStatus(item.id, 'convocado')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold"
                          title="Chamar / Convocar para vaga"
                        >
                          <Bell size={12} />
                          <span>Convocar</span>
                        </button>
                      )}
                      {item.status === 'convocado' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateQueueStatus(item.id, 'matriculado')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold"
                          title="Confirmar matrícula"
                        >
                          <CheckCircle2 size={12} />
                          <span>Matricular</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteQueueItem(item.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Remover da fila"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default EducationCrecheAdmin;
