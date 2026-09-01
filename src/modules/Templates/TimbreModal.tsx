import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Image as ImageIcon, Shield, Building2, Layout, FileText, Check, 
  Upload, Trash2, Sliders, Palette, RefreshCw, Eye
} from 'lucide-react';
import { TimbreData, TimbreStyle, WatermarkConfig, WatermarkType } from './types';
import { BUILTIN_TIMBRE_PRESETS, generateHeaderHtml, generateFooterHtml, DEFAULT_BRASAO_SVG } from './timbrePresets';
import { showToast } from '../../components/ui/Toast';

interface TimbreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimbre: TimbreData;
  currentWatermark?: WatermarkConfig;
  onApplyTimbre: (timbre: TimbreData, watermark?: WatermarkConfig) => void;
}

export const TimbreModal: React.FC<TimbreModalProps> = ({
  isOpen,
  onClose,
  currentTimbre,
  currentWatermark,
  onApplyTimbre,
}) => {
  const [activeTab, setActiveTab] = React.useState<'presets' | 'imagem' | 'dados' | 'marca_dagua'>('presets');
  const [timbre, setTimbre] = React.useState<TimbreData>({ ...currentTimbre });
  const [watermark, setWatermark] = React.useState<WatermarkConfig>(
    currentWatermark || { type: 'none', opacity: 0.1 }
  );

  const headerFileInputRef = React.useRef<HTMLInputElement>(null);
  const footerFileInputRef = React.useRef<HTMLInputElement>(null);
  const bgFileInputRef = React.useRef<HTMLInputElement>(null);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTimbre({ ...currentTimbre });
    setWatermark(currentWatermark || { type: 'none', opacity: 0.1 });
  }, [currentTimbre, currentWatermark, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'headerImageUrl' | 'footerImageUrl' | 'backgroundImageUrl' | 'logoUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('A imagem deve ter no máximo 5MB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setTimbre(prev => ({
          ...prev,
          [field]: base64,
          style: field === 'backgroundImageUrl' ? 'fundo_completo' : field === 'headerImageUrl' ? 'imagem_cabecalho' : prev.style
        }));
        showToast('Imagem carregada com sucesso!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndApply = () => {
    // Salva nas configurações locais como preferência da prefeitura
    try {
      localStorage.setItem('@gestao360:timbre_config', JSON.stringify(timbre));
    } catch {}

    onApplyTimbre(timbre, watermark);
    showToast('Timbre e papel timbrado aplicados!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh] z-10"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">Timbre & Papel Timbrado Oficial</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Personalize a identidade visual, cabeçalho, rodapé e marcas d'água das folhas.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-2xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-8 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30 gap-2 overflow-x-auto">
          {[
            { id: 'presets', label: 'Estilos de Timbre', icon: Layout },
            { id: 'imagem', label: 'Usar Imagem como Timbre', icon: ImageIcon },
            { id: 'dados', label: 'Dados da Instituição', icon: Building2 },
            { id: 'marca_dagua', label: 'Marca d\'Água', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                  active 
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                    : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body with Preview & Options */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 custom-scrollbar">
          
          {/* Controls Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* TAB 1: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Escolha o modelo oficial</span>
                  <button
                    onClick={() => setTimbre(prev => ({ ...prev, style: 'nenhum' }))}
                    className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${timbre.style === 'nenhum' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'text-neutral-400 hover:text-neutral-700'}`}
                  >
                    Sem Timbre (Folha Limpa)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BUILTIN_TIMBRE_PRESETS.map(preset => {
                    const isSelected = timbre.style === preset.style;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setTimbre(prev => ({ ...prev, style: preset.style }))}
                        className={`p-4 rounded-2xl border text-left transition-all relative group flex flex-col justify-between ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                            <Check size={14} />
                          </div>
                        )}
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="text-xl">{preset.thumbnail}</span>
                          <h4 className="font-bold text-sm text-neutral-900 dark:text-white">{preset.name}</h4>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">{preset.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Accent Color picker */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette size={16} className="text-neutral-400" />
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Cor de Destaque Institucional:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['#1e3a8a', '#0284c7', '#059669', '#dc2626', '#7c3aed', '#000000'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTimbre(prev => ({ ...prev, accentColor: c }))}
                        className={`w-6 h-6 rounded-full transition-transform ${timbre.accentColor === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USAR IMAGEM COMO TIMBRE */}
            {activeTab === 'imagem' && (
              <div className="space-y-6">
                
                {/* Opção A: Imagem do Cabeçalho */}
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                        <ImageIcon size={16} className="text-blue-600" />
                        Imagem do Cabeçalho Oficial
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Faixa retangular com o brasão e textos da prefeitura.</p>
                    </div>
                    {timbre.headerImageUrl && (
                      <button 
                        onClick={() => setTimbre(prev => ({ ...prev, headerImageUrl: undefined }))}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Remover
                      </button>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={headerFileInputRef} 
                    accept="image/png,image/jpeg,image/svg+xml,image/webp" 
                    className="hidden" 
                    onChange={e => handleFileUpload(e, 'headerImageUrl')} 
                  />

                  {timbre.headerImageUrl ? (
                    <div className="relative group rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white p-2 text-center">
                      <img src={timbre.headerImageUrl} alt="Header Preview" className="max-h-24 mx-auto object-contain" />
                      <button 
                        onClick={() => headerFileInputRef.current?.click()}
                        className="mt-2 w-full py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 text-xs font-bold rounded-xl transition-colors text-neutral-700 dark:text-neutral-200"
                      >
                        Substituir Imagem do Cabeçalho
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => headerFileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-blue-600 transition-all bg-white dark:bg-neutral-800/40"
                    >
                      <Upload size={22} />
                      <span className="text-xs font-bold">Clique para carregar imagem do Cabeçalho</span>
                      <span className="text-[10px] text-neutral-400">Recomendado: PNG transparente ou JPEG (largura ~1200px)</span>
                    </button>
                  )}
                </div>

                {/* Opção B: Imagem do Rodapé */}
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                        <ImageIcon size={16} className="text-blue-600" />
                        Imagem do Rodapé Oficial
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Faixa inferior com endereço, telefones e links.</p>
                    </div>
                    {timbre.footerImageUrl && (
                      <button 
                        onClick={() => setTimbre(prev => ({ ...prev, footerImageUrl: undefined }))}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Remover
                      </button>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={footerFileInputRef} 
                    accept="image/png,image/jpeg,image/svg+xml,image/webp" 
                    className="hidden" 
                    onChange={e => handleFileUpload(e, 'footerImageUrl')} 
                  />

                  {timbre.footerImageUrl ? (
                    <div className="relative group rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white p-2 text-center">
                      <img src={timbre.footerImageUrl} alt="Footer Preview" className="max-h-20 mx-auto object-contain" />
                      <button 
                        onClick={() => footerFileInputRef.current?.click()}
                        className="mt-2 w-full py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 text-xs font-bold rounded-xl transition-colors text-neutral-700 dark:text-neutral-200"
                      >
                        Substituir Imagem do Rodapé
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => footerFileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-1 text-neutral-500 hover:text-blue-600 transition-all bg-white dark:bg-neutral-800/40"
                    >
                      <Upload size={18} />
                      <span className="text-xs font-bold">Carregar imagem do Rodapé (Opcional)</span>
                    </button>
                  )}
                </div>

                {/* Opção C: Papel Timbrado Completo em Fundo A4 */}
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        Papel Timbrado Completo (Fundo da Folha A4)
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Arte gráfica completa da folha A4 produzida por gráfica ou designer.</p>
                    </div>
                    {timbre.backgroundImageUrl && (
                      <button 
                        onClick={() => setTimbre(prev => ({ ...prev, backgroundImageUrl: undefined }))}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Remover
                      </button>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={bgFileInputRef} 
                    accept="image/png,image/jpeg,image/webp" 
                    className="hidden" 
                    onChange={e => handleFileUpload(e, 'backgroundImageUrl')} 
                  />

                  {timbre.backgroundImageUrl ? (
                    <div className="space-y-3">
                      <div className="relative group rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white p-2 text-center">
                        <img src={timbre.backgroundImageUrl} alt="Background Preview" className="max-h-32 mx-auto object-contain" />
                        <button 
                          onClick={() => bgFileInputRef.current?.click()}
                          className="mt-2 w-full py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 text-xs font-bold rounded-xl transition-colors text-neutral-700 dark:text-neutral-200"
                        >
                          Substituir Imagem de Fundo A4
                        </button>
                      </div>

                      {/* Opacity slider */}
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-300">
                        <span>Opacidade do Papel Timbrado:</span>
                        <span>{Math.round((timbre.backgroundOpacity ?? 1) * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1" 
                        step="0.05"
                        value={timbre.backgroundOpacity ?? 1}
                        onChange={e => setTimbre(prev => ({ ...prev, backgroundOpacity: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => bgFileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-blue-600 transition-all bg-white dark:bg-neutral-800/40"
                    >
                      <Upload size={22} />
                      <span className="text-xs font-bold">Carregar Papel Timbrado Completo (Imagem A4)</span>
                      <span className="text-[10px] text-neutral-400">Proporção A4 (2480 × 3508 px ou 1240 × 1754 px)</span>
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: DADOS DA INSTITUIÇÃO */}
            {activeTab === 'dados' && (
              <div className="space-y-4">
                {/* Logo / Brasão Upload */}
                <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  <div className="w-16 h-16 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                    <img src={timbre.logoUrl || DEFAULT_BRASAO_SVG} alt="Brasão" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white mb-0.5">Brasão / Logotipo Oficial</h4>
                    <p className="text-[11px] text-neutral-500">Usado no topo dos modelos com cabeçalho oficial.</p>
                  </div>
                  <input 
                    type="file" 
                    ref={logoFileInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={e => handleFileUpload(e, 'logoUrl')} 
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm shrink-0"
                  >
                    Alterar Logo
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Prefeitura / Órgão</label>
                    <input 
                      type="text"
                      value={timbre.prefeitura || ''}
                      onChange={e => setTimbre({ ...timbre, prefeitura: e.target.value })}
                      placeholder="Ex: PREFEITURA MUNICIPAL DE CUIABÁ"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Estado</label>
                    <input 
                      type="text"
                      value={timbre.estado || ''}
                      onChange={e => setTimbre({ ...timbre, estado: e.target.value })}
                      placeholder="Ex: MATO GROSSO"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Secretaria / Setor</label>
                    <input 
                      type="text"
                      value={timbre.secretaria || ''}
                      onChange={e => setTimbre({ ...timbre, secretaria: e.target.value })}
                      placeholder="Ex: SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Departamento</label>
                    <input 
                      type="text"
                      value={timbre.departamento || ''}
                      onChange={e => setTimbre({ ...timbre, departamento: e.target.value })}
                      placeholder="Ex: COORDENADORIA DE LICITAÇÕES"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Endereço Completo</label>
                    <input 
                      type="text"
                      value={timbre.endereco || ''}
                      onChange={e => setTimbre({ ...timbre, endereco: e.target.value })}
                      placeholder="Ex: Av. Brasil, nº 1.000 - Centro"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">CNPJ</label>
                    <input 
                      type="text"
                      value={timbre.cnpj || ''}
                      onChange={e => setTimbre({ ...timbre, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Telefone de Contato</label>
                    <input 
                      type="text"
                      value={timbre.telefone || ''}
                      onChange={e => setTimbre({ ...timbre, telefone: e.target.value })}
                      placeholder="(66) 3000-0000"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">E-mail Institucional</label>
                    <input 
                      type="text"
                      value={timbre.email || ''}
                      onChange={e => setTimbre({ ...timbre, email: e.target.value })}
                      placeholder="contato@municipio.mt.gov.br"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MARCA D'ÁGUA */}
            {activeTab === 'marca_dagua' && (
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block mb-3">Tipo de Marca d'Água</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'none', label: 'Nenhuma' },
                      { id: 'minuta', label: 'MINUTA' },
                      { id: 'confidencial', label: 'CONFIDENCIAL' },
                      { id: 'copia', label: 'CÓPIA' },
                      { id: 'urgente', label: 'URGENTE' },
                      { id: 'custom', label: 'Texto Personalizado' },
                    ].map(w => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setWatermark(prev => ({ ...prev, type: w.id as WatermarkType }))}
                        className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                          watermark.type === w.id 
                            ? 'border-blue-600 bg-blue-50/50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-500' 
                            : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {watermark.type === 'custom' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">Texto da Marca d'Água</label>
                    <input 
                      type="text"
                      value={watermark.customText || ''}
                      onChange={e => setWatermark({ ...watermark, customText: e.target.value })}
                      placeholder="Ex: NÃO OFICIAL / RASCUNHO"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {watermark.type !== 'none' && (
                  <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-300">
                      <span>Transparência da Marca d'Água:</span>
                      <span>{Math.round(watermark.opacity * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.04" 
                      max="0.30" 
                      step="0.02"
                      value={watermark.opacity}
                      onChange={e => setWatermark({ ...watermark, opacity: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Mini Preview Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Eye size={13} /> Prévia da Folha A4
              </span>
              <span className="text-[10px] font-bold text-neutral-400">Escala 35%</span>
            </div>

            {/* Mini A4 Sheet */}
            <div className="w-[240px] h-[339px] bg-white rounded-xl shadow-2xl border border-neutral-300 relative overflow-hidden flex flex-col justify-between p-3 select-none text-[6px]">
              
              {/* Background Full Page Letterhead if active */}
              {timbre.backgroundImageUrl && (
                <div 
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none"
                  style={{ 
                    backgroundImage: `url(${timbre.backgroundImageUrl})`,
                    opacity: timbre.backgroundOpacity ?? 1
                  }}
                />
              )}

              {/* Watermark in preview */}
              {watermark.type !== 'none' && (
                <div 
                  className="absolute inset-0 flex items-center justify-center font-black uppercase pointer-events-none tracking-widest text-center"
                  style={{
                    transform: 'rotate(-35deg)',
                    color: '#000',
                    opacity: watermark.opacity,
                    fontSize: '18px',
                    lineHeight: 1
                  }}
                >
                  {watermark.type === 'custom' ? watermark.customText || 'MARCA' : watermark.type.toUpperCase()}
                </div>
              )}

              {/* Header Preview */}
              <div 
                className="w-full relative z-10"
                dangerouslySetInnerHTML={{ __html: generateHeaderHtml(timbre) }}
              />

              {/* Dummy Document Body */}
              <div className="my-auto space-y-1.5 text-neutral-300 relative z-10 px-1">
                <div className="h-1 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-1 bg-neutral-200 rounded w-full"></div>
                <div className="h-1 bg-neutral-200 rounded w-5/6"></div>
                <div className="h-1 bg-neutral-200 rounded w-2/3"></div>
              </div>

              {/* Footer Preview */}
              <div 
                className="w-full relative z-10"
                dangerouslySetInnerHTML={{ __html: generateFooterHtml(timbre) }}
              />
            </div>
            
            <p className="text-[11px] text-neutral-400 text-center mt-3 max-w-[220px]">
              O cabeçalho e o rodapé serão repetidos perfeitamente em todas as páginas impressas.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-8 py-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSaveAndApply}
            className="px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/25 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Check size={16} /> Aplicar no Documento
          </button>
        </div>
      </motion.div>
    </div>
  );
};
