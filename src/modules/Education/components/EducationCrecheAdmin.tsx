import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Baby, Save, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { showToast } from '../../../components/ui/Toast';

export interface CrecheSettingsData {
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
  decretoUrl: '#',
  decretoName: 'Decreto Municipal nº 035/2024',
  decretoDescription: 'Regulamentação do Acesso à Educação Infantil e Fila Única dos CMEIs.',
  isOpen: true,
  fichaUrl: ''
};

export const EducationCrecheAdmin: React.FC = () => {
  const [settings, setSettings] = useState<CrecheSettingsData>(() => {
    const saved = localStorage.getItem('@gestao360:creche_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CRECHE_SETTINGS, ...parsed };
      } catch (e) {}
    }
    return DEFAULT_CRECHE_SETTINGS;
  });

  const handleSave = () => {
    localStorage.setItem('@gestao360:creche_settings', JSON.stringify(settings));
    showToast('Configurações do CMEI salvas com sucesso!', 'success');
  };

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
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-neutral-900/10"
          >
            <Save size={16} /> Salvar Alterações
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
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setSettings({...settings, decretoUrl: event.target?.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors relative">
                    <Upload size={16} /> 
                    {settings.decretoUrl && settings.decretoUrl.length > 100 ? 'Arquivo Selecionado (Base64)' : 'Fazer Upload do Decreto'}
                  </div>
                </div>
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
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setSettings({...settings, fichaUrl: event.target?.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors relative">
                    <Upload size={16} /> 
                    {settings.fichaUrl && settings.fichaUrl.length > 100 ? 'Ficha de Matrícula Selecionada (Base64)' : 'Fazer Upload da Ficha de Matrícula'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
