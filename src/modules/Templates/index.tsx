import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DocumentTemplate, AdminUser, Institution } from '../../types';
import { WebDocument, TimbreData } from './types';
import { DocumentEditor } from './DocumentEditor';
import { TimbreModal } from './TimbreModal';
import { OFFICIAL_DEFAULT_TEMPLATES } from './defaultTemplates';
import { createDefaultTimbreData, generateHeaderHtml, generateFooterHtml } from './timbrePresets';
import { showToast } from '../../components/ui/Toast';

const { 
  Plus, Search, Edit2, Trash2, FileText, Download, Clock, FileBadge, X, ChevronLeft,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Heading1, Heading2, Printer, Save, Send, Undo, Redo, Indent, Outdent,
  TableProperties, ArrowUpDown, Minus, Image: ImageIcon, Scissors, Copy, ClipboardPaste,
  Type, Highlighter, Palette, Check, Search: SearchIcon, Replace, ZoomIn, ZoomOut, 
  ChevronDown, ChevronUp, XCircle, LayoutTemplate, Link: LinkIcon, Wand2, PenTool, Workflow,
  Shield, Sparkles, CopyPlus, Eye, Filter
} = LucideIcons;

// -------------------------------------------------------------
// CONFIRM MODAL
// -------------------------------------------------------------
const ConfirmModal = ({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', isDestructive = false, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel} />
      <div className="relative bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-white transition-all shadow-xl hover:scale-105 ${isDestructive ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MAIN TEMPLATES MODULE
// -------------------------------------------------------------
export const TemplatesModule = ({ 
  currentUser, 
  currentInstitution 
}: { 
  currentUser?: AdminUser | null, 
  currentInstitution?: Institution | null 
}) => {
  const [activeTab, setActiveTab] = React.useState<'Meus' | 'Oficiais' | 'Timbres'>('Meus');
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('Todos');
  const [statusFilter, setStatusFilter] = React.useState<'Todos' | 'Rascunho' | 'Finalizado'>('Todos');

  // Timbre State
  const [institutionTimbre, setInstitutionTimbre] = React.useState<TimbreData>(() => {
    const saved = localStorage.getItem('@gestao360:timbre_config');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return createDefaultTimbreData(currentInstitution);
  });
  const [isTimbreModalOpen, setIsTimbreModalOpen] = React.useState(false);

  // Modelos Oficiais State
  const [templates, setTemplates] = React.useState<DocumentTemplate[]>(() => {
    const saved = localStorage.getItem('@gestao360:official_templates');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return OFFICIAL_DEFAULT_TEMPLATES;
  });

  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = React.useState(false);
  const [templateFormData, setTemplateFormData] = React.useState<Partial<DocumentTemplate>>({
    title: '', description: '', category: 'Geral', format: 'Editor Web', fileUrl: ''
  });

  // Meus Documentos State
  const [webDocs, setWebDocs] = React.useState<WebDocument[]>(() => {
    const saved = localStorage.getItem('@gestao360:web_documents');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'doc-demo-1',
        title: 'Ofício de Solicitação de Repasse - SMS',
        content: '<p style="text-align: right;">Cuiabá, 01 de setembro de 2026.</p><br><p><b>OFÍCIO Nº 142/2026/GAB</b></p><br><p>A Sua Senhoria o Senhor Secretário Municipal de Fazenda,</p><p style="text-align: justify; text-indent: 2.5cm; line-height: 1.5;">Cumprimentando-o cordialmente, sirvo-me do presente para solicitar a liberação do repasse orçamentário referente à execução do programa de atenção básica em saúde.</p><br><p>Atenciosamente,</p><br><div style="text-align: center; margin-top: 40px;"><div style="width: 250px; border-top: 1px solid black; margin: 0 auto 6px auto;"></div><p style="margin:0; font-weight:bold;">Secretário Municipal de Saúde</p></div>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'Rascunho',
        authorName: currentUser?.name || 'Gestor'
      }
    ];
  });

  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingWebDoc, setEditingWebDoc] = React.useState<WebDocument | undefined>(undefined);
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = React.useState<any>(null);

  // Sync to LocalStorage
  React.useEffect(() => {
    localStorage.setItem('@gestao360:web_documents', JSON.stringify(webDocs));
  }, [webDocs]);

  React.useEffect(() => {
    localStorage.setItem('@gestao360:official_templates', JSON.stringify(templates));
  }, [templates]);

  // -----------------------------------
  // ACTIONS: MEUS DOCUMENTOS
  // -----------------------------------
  const handleSaveWebDoc = (doc: WebDocument, silent?: boolean) => {
    if (editingTemplateId) {
      setTemplates(templates.map(t => t.id === editingTemplateId ? { ...t, content: doc.content, header: doc.header, footer: doc.footer } as DocumentTemplate : t));
      if (!silent) {
        setIsEditorOpen(false);
        setEditingTemplateId(null);
        showToast('Conteúdo do modelo oficial atualizado!', 'success');
      }
      return;
    }

    setWebDocs(prev => {
      const exists = prev.find(d => d.id === doc.id);
      if (exists) return prev.map(d => d.id === doc.id ? doc : d);
      return [doc, ...prev];
    });
    
    if (!silent) {
      setIsEditorOpen(false);
      showToast(`Documento ${doc.status === 'Rascunho' ? 'salvo' : 'finalizado'} com sucesso!`, 'success');
    }
  };

  const handleDeleteWebDoc = (id: string) => {
    setConfirmConfig({
      title: 'Excluir documento?',
      message: 'Esta ação não pode ser desfeita. O documento será permanentemente excluído.',
      confirmText: 'Excluir',
      isDestructive: true,
      onConfirm: () => {
        setWebDocs(webDocs.filter(d => d.id !== id));
        showToast('Documento excluído.');
        setConfirmConfig(null);
      }
    });
  };

  const handleDuplicateWebDoc = (doc: WebDocument) => {
    const newDoc: WebDocument = {
      ...doc,
      id: Math.random().toString(36).substring(2, 9),
      title: `${doc.title} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Rascunho'
    };
    setWebDocs([newDoc, ...webDocs]);
    showToast('Cópia do documento criada com sucesso!', 'success');
  };

  // -----------------------------------
  // ACTIONS: MODELOS OFICIAIS
  // -----------------------------------
  const handleUseTemplate = (template: DocumentTemplate) => {
    const newDoc: WebDocument = {
      id: Math.random().toString(36).substring(2, 9),
      title: `${template.title} — ${new Date().toLocaleDateString('pt-BR')}`,
      header: (template as any).header || generateHeaderHtml(institutionTimbre),
      content: (template as any).content || '<p><br></p>',
      footer: (template as any).footer || generateFooterHtml(institutionTimbre),
      timbreConfig: institutionTimbre,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Rascunho',
      templateId: template.id,
      authorName: currentUser?.name
    };
    setEditingWebDoc(newDoc);
    setEditingTemplateId(null);
    setIsEditorOpen(true);
  };

  const handleCreateNewBlankDoc = () => {
    setEditingWebDoc({
      id: Math.random().toString(36).substring(2, 9),
      title: 'Novo Documento Oficial',
      header: generateHeaderHtml(institutionTimbre),
      content: '<p style="font-family: Times New Roman, serif; font-size: 12pt; line-height: 1.5;"><br></p>',
      footer: generateFooterHtml(institutionTimbre),
      timbreConfig: institutionTimbre,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Rascunho',
      authorName: currentUser?.name
    });
    setEditingTemplateId(null);
    setIsEditorOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    setConfirmConfig({
      title: 'Excluir modelo oficial?',
      message: 'Esta ação não pode ser desfeita. O modelo será removido da biblioteca.',
      confirmText: 'Excluir',
      isDestructive: true,
      onConfirm: () => {
        setTemplates(templates.filter(t => t.id !== id));
        showToast('Modelo excluído com sucesso.', 'success');
        setConfirmConfig(null);
      }
    });
  };

  const handleSaveNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = templateFormData.id || Math.random().toString(36).substring(2, 9);
    const newTemplate = { 
      ...templateFormData, 
      id: newId, 
      updatedAt: new Date().toISOString() 
    } as DocumentTemplate;

    if (templateFormData.id) {
      setTemplates(templates.map(t => t.id === templateFormData.id ? newTemplate : t));
      showToast('Modelo atualizado com sucesso.');
    } else {
      setTemplates([newTemplate, ...templates]);
      showToast('Novo modelo adicionado com sucesso.');
    }
    
    setIsNewTemplateModalOpen(false);
    setTemplateFormData({ title: '', description: '', category: 'Geral', format: 'Editor Web', fileUrl: '' });
  };

  // Filtered lists
  const filteredWebDocs = webDocs.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || 
      d.content.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
      t.description.toLowerCase().includes(search.toLowerCase()) || 
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'Todos' || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = ['Todos', 'Ofícios', 'RH', 'Licitações', 'Geral'];

  // If Editor is Open
  if (isEditorOpen) {
    return (
      <div className="animate-in fade-in duration-300 pb-20">
        <DocumentEditor 
          doc={editingWebDoc} 
          onClose={() => { setIsEditorOpen(false); setEditingTemplateId(null); }}
          onSave={handleSaveWebDoc}
          currentUser={currentUser}
          currentInstitution={currentInstitution}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* HERO / HEADER CARD */}
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
        
        {/* Top bar with stats & quick actions */}
        <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 p-4 rounded-3xl flex items-center justify-center font-bold shrink-0">
              <FileBadge size={34} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Editor & Modelos Oficiais</h2>
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {institutionTimbre.style === 'nenhum' ? 'Sem Timbre' : `Timbre: ${institutionTimbre.name}`}
                </span>
              </div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">
                Crie e protocole documentos oficiais em papel timbrado ou use as minutas padrão.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Timbre config button */}
            <button 
              onClick={() => setIsTimbreModalOpen(true)}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border border-blue-200 dark:border-blue-800/60 shrink-0"
            >
              <Shield size={16} /> Configurar Timbre
            </button>

            {/* New Doc Button */}
            <button 
              onClick={handleCreateNewBlankDoc}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-xs hover:scale-105 transition-all shadow-xl shadow-blue-600/20 shrink-0"
            >
              <Plus size={16} /> Novo Documento
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-8 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800 overflow-x-auto gap-4">
          <button 
            onClick={() => setActiveTab('Meus')}
            className={`py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'Meus' 
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <FileText size={16} />
            Meus Documentos ({webDocs.length})
          </button>
          <button 
            onClick={() => setActiveTab('Oficiais')}
            className={`py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'Oficiais' 
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Sparkles size={16} />
            Biblioteca de Modelos & Minutas ({templates.length})
          </button>
          <button 
            onClick={() => setActiveTab('Timbres')}
            className={`py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'Timbres' 
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Shield size={16} />
            Papéis Timbrados & Identidade
          </button>
        </div>

        {/* Filters & Search Row */}
        <div className="p-6 bg-white dark:bg-neutral-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder={activeTab === 'Meus' ? "Buscar nos meus documentos..." : "Buscar modelos por título, assunto ou categoria..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 pl-11 pr-4 py-2.5 rounded-2xl text-xs font-semibold outline-none focus:border-blue-500 transition-all dark:text-white"
            />
          </div>

          {activeTab === 'Meus' ? (
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 shrink-0">Status:</span>
              {(['Todos', 'Rascunho', 'Finalizado'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                    statusFilter === st 
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 shrink-0">Categoria:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                    categoryFilter === cat 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* TAB 1: MEUS DOCUMENTOS                                    */}
      {/* ========================================================= */}
      {activeTab === 'Meus' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-3 duration-300">
          {filteredWebDocs.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-3xl flex items-center justify-center mb-4 font-bold">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Nenhum documento encontrado</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mb-6">
                Clique no botão abaixo para redigir seu primeiro documento oficial no editor com papel timbrado.
              </p>
              <button 
                onClick={handleCreateNewBlankDoc}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
              >
                + Criar Primeiro Documento
              </button>
            </div>
          ) : (
            filteredWebDocs.map(doc => (
              <div 
                key={doc.id} 
                className="bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-neutral-700 transition-all flex flex-col relative group cursor-pointer"
                onClick={() => { setEditingWebDoc(doc); setIsEditorOpen(true); }}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                    doc.status === 'Rascunho' 
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' 
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  }`}>
                    {doc.status}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleDuplicateWebDoc(doc)}
                      title="Duplicar Documento"
                      className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                    >
                      <CopyPlus size={15} />
                    </button>
                    <button 
                      onClick={() => handleDeleteWebDoc(doc.id)}
                      title="Excluir Documento"
                      className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-2 line-clamp-2">{doc.title}</h3>

                {/* Preview text stripped from HTML */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 line-clamp-3 flex-1 leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800/60 font-serif">
                  {doc.content.replace(/<[^>]*>?/gm, ' ').trim() || "Documento sem conteúdo digitado."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                  
                  <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-black group-hover:translate-x-0.5 transition-transform">
                    <Edit2 size={12} /> Abrir Editor
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MODELOS OFICIAIS (MINUTAS)                         */}
      {/* ========================================================= */}
      {activeTab === 'Oficiais' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">Minutas Oficiais Prontas</h3>
              <p className="text-xs text-neutral-500">Clique em qualquer modelo para abrir no editor com o timbre da sua prefeitura.</p>
            </div>

            <button 
              onClick={() => {
                setTemplateFormData({ title: '', description: '', category: 'Geral', format: 'Editor Web', fileUrl: '' });
                setIsNewTemplateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-xs font-black uppercase tracking-wider hover:scale-105 transition-all shadow-md"
            >
              <Plus size={15} /> Adicionar Minuta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-3 duration-300">
            {filteredTemplates.map(template => (
              <div 
                key={template.id} 
                className="bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => handleUseTemplate(template)}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-900/40">
                      {template.category}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-neutral-900 dark:text-white mb-2 line-clamp-2">{template.title}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 line-clamp-3 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {template.format}
                  </span>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleUseTemplate(template); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Usar Modelo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PAPÉIS TIMBRADOS & IDENTIDADE                     */}
      {/* ========================================================= */}
      {activeTab === 'Timbres' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-3 duration-300">
          <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                Timbre Padrão Atual
              </span>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                {institutionTimbre.prefeitura || 'Prefeitura Municipal'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
                Este timbre oficial é aplicado automaticamente no cabeçalho e rodapé de todos os novos ofícios, memorandos, portarias e termos gerados na plataforma.
              </p>
            </div>

            <button 
              onClick={() => setIsTimbreModalOpen(true)}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-blue-600/25 hover:scale-105 transition-all flex items-center gap-2 shrink-0"
            >
              <Shield size={16} /> Personalizar / Trocar Imagem do Timbre
            </button>
          </div>

          {/* Timbre Visual Preview */}
          <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col items-center">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-6">Prévia do Papel Timbrado Atual</h4>
            
            <div className="w-full max-w-[650px] min-h-[400px] bg-white border border-neutral-200 rounded-2xl shadow-xl p-8 flex flex-col justify-between select-none relative overflow-hidden">
              {institutionTimbre.backgroundImageUrl && (
                <div 
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none"
                  style={{ 
                    backgroundImage: `url(${institutionTimbre.backgroundImageUrl})`,
                    opacity: institutionTimbre.backgroundOpacity ?? 1
                  }}
                />
              )}

              <div 
                className="w-full relative z-10"
                dangerouslySetInnerHTML={{ __html: generateHeaderHtml(institutionTimbre) }}
              />

              <div className="my-8 text-center text-neutral-300 text-xs italic font-serif relative z-10">
                [Corpo do Documento Oficial]
              </div>

              <div 
                className="w-full relative z-10"
                dangerouslySetInnerHTML={{ __html: generateFooterHtml(institutionTimbre) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TIMBRE MODAL */}
      <TimbreModal
        isOpen={isTimbreModalOpen}
        onClose={() => setIsTimbreModalOpen(false)}
        currentTimbre={institutionTimbre}
        onApplyTimbre={(newTimbre) => {
          setInstitutionTimbre(newTimbre);
          localStorage.setItem('@gestao360:timbre_config', JSON.stringify(newTimbre));
        }}
      />

      {/* NEW TEMPLATE MODAL */}
      <AnimatePresence>
        {isNewTemplateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl border border-neutral-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">Adicionar Minuta Oficial</h3>
                  <p className="text-xs text-neutral-500 mt-1">Crie um novo modelo para disponibilizar para toda a equipe.</p>
                </div>
                <button onClick={() => setIsNewTemplateModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-full">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveNewTemplate} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Título da Minuta</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Ofício de Solicitação de Diárias" 
                    value={templateFormData.title} 
                    onChange={e => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Descrição</label>
                  <textarea 
                    required 
                    rows={2} 
                    placeholder="Explique a finalidade desta minuta..." 
                    value={templateFormData.description} 
                    onChange={e => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Categoria</label>
                    <select 
                      value={templateFormData.category} 
                      onChange={e => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="Geral">Geral</option>
                      <option value="Ofícios">Ofícios</option>
                      <option value="RH">RH</option>
                      <option value="Licitações">Licitações</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Formato</label>
                    <select 
                      value={templateFormData.format} 
                      onChange={e => setTemplateFormData({ ...templateFormData, format: e.target.value as any })}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="Editor Web">Editor Web (Doc Nativo)</option>
                      <option value="Word">Word</option>
                      <option value="PDF">PDF</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsNewTemplateModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-500 hover:bg-neutral-100">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">Adicionar Modelo</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={!!confirmConfig} onCancel={() => setConfirmConfig(null)} {...confirmConfig} />
    </div>
  );
};
