import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  Eye,
  Upload,
  Image as ImageIcon,
  Link2,
  Calendar,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Power,
  AlertCircle,
} from 'lucide-react';
import {
  InstitutionalSiteConfig,
  SitePopupItem,
  MAX_SITE_POPUPS,
  DEFAULT_POPUP_DURATION_SECONDS,
  clampPopupDuration,
  clampPopupAutoClose,
  createEmptySitePopup,
  getPopupScheduleStatus,
  getActiveSitePopups,
} from '../lib/api/institutionalSite';
import { SitePopupCarouselModal } from './SitePopupCarouselModal';
import { showToast } from './ui/Toast';

interface SitePopupManagerPanelProps {
  config: InstitutionalSiteConfig;
  onChange: React.Dispatch<React.SetStateAction<InstitutionalSiteConfig>>;
  accentHex: string;
  institutionName?: string;
}

const BADGE_PRESETS = [
  'Aviso Oficial',
  'Utilidade Pública',
  'Saúde / Vacinação',
  'Tributos / IPTU',
  'Educação',
  'Obras & Serviços',
  'Eventos',
];

const DURATION_PRESETS = [5, 8, 10, 15, 20];

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo selecionado não é uma imagem válida.'));
      img.onload = () => {
        const maxW = 1200;
        const maxH = 1200;
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

const STATUS_BADGE_MAP: Record<
  ReturnType<typeof getPopupScheduleStatus>,
  { label: string; cls: string }
> = {
  active: {
    label: 'No ar',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  inactive: {
    label: 'Desativado',
    cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  },
  scheduled: {
    label: 'Agendado',
    cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  },
  expired: {
    label: 'Expirado',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  },
  empty: {
    label: 'Sem conteúdo',
    cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  },
};

export const SitePopupManagerPanel: React.FC<SitePopupManagerPanelProps> = ({
  config,
  onChange,
  accentHex,
  institutionName = 'Prefeitura Municipal',
}) => {
  const carousel = config.popupCarousel;
  const items = carousel.items || [];
  const [expandedId, setExpandedId] = useState<string | null>(() => items[0]?.id || null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeItems = getActiveSitePopups({ ...config, popupCarousel: { ...carousel, enabled: true } });

  const updateCarousel = (updater: (prev: InstitutionalSiteConfig['popupCarousel']) => InstitutionalSiteConfig['popupCarousel']) => {
    onChange((prev) => ({
      ...prev,
      popupCarousel: updater(prev.popupCarousel),
    }));
  };

  const handleAddPopup = () => {
    if (items.length >= MAX_SITE_POPUPS) {
      showToast(`Limite máximo de ${MAX_SITE_POPUPS} pop-ups no carrossel atingido.`, 'warning');
      return;
    }
    const newItem = createEmptySitePopup(items.length);
    updateCarousel((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setExpandedId(newItem.id);
  };

  const handleUpdateItem = (id: string, patch: Partial<SitePopupItem>) => {
    updateCarousel((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const handleRemoveItem = (id: string) => {
    updateCarousel((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    if (expandedId === id) setExpandedId(null);
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    updateCarousel((prev) => {
      const next = [...prev.items];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, items: next };
    });
  };

  const handleUploadImage = async (id: string, file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      handleUpdateItem(id, { imageUrl: dataUrl });
      showToast('Imagem adicionada e otimizada para o pop-up.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível carregar a imagem.', 'error');
    }
  };

  const applyDurationToAll = (sec: number) => {
    const safe = clampPopupDuration(sec);
    updateCarousel((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, durationSeconds: safe })),
    }));
    showToast(`Duração de ${safe}s aplicada a todos os pop-ups.`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Controle Global de Ativação & Carrossel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Megaphone size={16} className="text-emerald-600" />
              <h4 className="text-sm font-black">Ativar Carrossel de Pop-ups Informativos no Site</h4>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Exibe automaticamente até {MAX_SITE_POPUPS} comunicados em carrossel assim que o cidadão acessa o portal oficial.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={carousel.enabled}
              onChange={(e) =>
                updateCarousel((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-200/80 dark:border-neutral-700">
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 cursor-pointer">
            <div>
              <span className="block text-xs font-black">Troca Automática (Autoplay)</span>
              <span className="block text-[11px] text-neutral-500">
                Gira os slides conforme o tempo de cada pop-up
              </span>
            </div>
            <input
              type="checkbox"
              checked={carousel.autoplay}
              onChange={(e) =>
                updateCarousel((prev) => ({ ...prev, autoplay: e.target.checked }))
              }
              className="w-4 h-4 accent-emerald-600 rounded"
            />
          </label>

          <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
            <div>
              <span className="block text-xs font-black">Fechar Sozinho Após (seg)</span>
              <span className="block text-[11px] text-neutral-500">
                0 = fica aberto até o cidadão fechar
              </span>
            </div>
            <input
              type="number"
              min={0}
              max={600}
              value={carousel.autoCloseSeconds}
              onChange={(e) =>
                updateCarousel((prev) => ({
                  ...prev,
                  autoCloseSeconds: clampPopupAutoClose(e.target.value),
                }))
              }
              className="w-20 px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-black text-center"
            />
          </div>
        </div>
      </div>

      {/* Barra de Ações: Contador 0/10, Novo Pop-up e Prévia */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-black">
            {items.length} / {MAX_SITE_POPUPS} pop-ups cadastrados
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black">
            {activeItems.length} {activeItems.length === 1 ? 'ativo' : 'ativos'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeItems.length > 0 && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-black transition cursor-pointer"
            >
              <Eye size={14} />
              <span>Testar Carrossel ({activeItems.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddPopup}
            disabled={items.length >= MAX_SITE_POPUPS}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black shadow-sm transition cursor-pointer"
          >
            <Plus size={15} />
            <span>
              {items.length >= MAX_SITE_POPUPS
                ? `Limite de ${MAX_SITE_POPUPS} atingido`
                : 'Novo Pop-up'}
            </span>
          </button>
        </div>
      </div>

      {/* Lista de Pop-ups */}
      {items.length === 0 ? (
        <div className="p-8 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <Sparkles size={22} />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-black">Nenhum pop-up informativo cadastrado</h5>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Crie até {MAX_SITE_POPUPS} pop-ups para divulgar campanhas de saúde, prazos de tributos (IPTU/ISS), editais, feriados ou comunicados importantes para a população.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddPopup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Criar Primeiro Pop-up</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const status = getPopupScheduleStatus(item);
            const statusMeta = STATUS_BADGE_MAP[status];

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition overflow-hidden ${
                  item.enabled
                    ? 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                    : 'border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60 opacity-85'
                }`}
              >
                {/* Cabeçalho compacto do Card */}
                <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <span className="w-7 h-7 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-black flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center shrink-0">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black truncate">
                          {item.title.trim() || `Pop-up #${idx + 1} (sem título)`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-neutral-500 mt-0.5">
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Clock size={11} />
                          {item.durationSeconds}s no carrossel
                        </span>
                        {item.badge && <span>· {item.badge}</span>}
                        {(item.startDate || item.endDate) && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={11} />
                            {item.startDate || '...'} até {item.endDate || '...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Ações Rápidas: Ordem, Ativar/Desativar, Expandir, Excluir */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveItem(idx, -1)}
                      disabled={idx === 0}
                      title="Mover para cima"
                      className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveItem(idx, 1)}
                      disabled={idx === items.length - 1}
                      title="Mover para baixo"
                      className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateItem(item.id, { enabled: !item.enabled })}
                      title={item.enabled ? 'Desativar este pop-up' : 'Ativar este pop-up'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer ${
                        item.enabled
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300'
                      }`}
                    >
                      <Power size={12} />
                      <span>{item.enabled ? 'Ativo' : 'Inativo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      title={isExpanded ? 'Recolher edição' : 'Editar pop-up'}
                      className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Excluir pop-up"
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Formulário Expandido */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                          Título do Pop-up *
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                          placeholder="Ex: Campanha Nacional de Vacinação 2026"
                          className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                          Etiqueta / Categoria
                        </label>
                        <input
                          type="text"
                          list={`badge-presets-${item.id}`}
                          value={item.badge}
                          onChange={(e) => handleUpdateItem(item.id, { badge: e.target.value })}
                          placeholder="Aviso Oficial"
                          className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <datalist id={`badge-presets-${item.id}`}>
                          {BADGE_PRESETS.map((preset) => (
                            <option key={preset} value={preset} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                        Mensagem Informativa à População
                      </label>
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { description: e.target.value })
                        }
                        placeholder="Informe datas, horários, locais de atendimento ou orientações importantes ao cidadão..."
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Tempo de Duração + Vigência Opcional */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                          Duração no Carrossel (seg)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={2}
                            max={120}
                            value={item.durationSeconds}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                durationSeconds: clampPopupDuration(e.target.value),
                              })
                            }
                            className="w-20 px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-sm font-black text-center"
                          />
                          <div className="flex flex-wrap gap-1">
                            {DURATION_PRESETS.map((sec) => (
                              <button
                                key={sec}
                                type="button"
                                onClick={() =>
                                  handleUpdateItem(item.id, { durationSeconds: sec })
                                }
                                className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                  item.durationSeconds === sec
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                                }`}
                              >
                                {sec}s
                              </button>
                            ))}
                          </div>
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => applyDurationToAll(item.durationSeconds)}
                            className="mt-1.5 text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                          >
                            Aplicar {item.durationSeconds}s em todos os pop-ups
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                          Exibir a partir de (Opcional)
                        </label>
                        <input
                          type="date"
                          value={item.startDate}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { startDate: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                          Exibir até (Opcional)
                        </label>
                        <input
                          type="date"
                          value={item.endDate}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { endDate: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    {/* Arte / Imagem do Pop-up */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500">
                            Arte / Banner do Pop-up (Opcional)
                          </label>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                            Tamanho ideal para enquadramento perfeito: <strong>1200 × 675 px</strong> (ou <strong>1280 × 720 px</strong> · proporção <strong>16:9</strong> horizontal, JPG/PNG/WebP).
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-black hover:bg-emerald-100 transition cursor-pointer">
                            <Upload size={12} />
                            <span>Enviar Imagem</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                handleUploadImage(item.id, e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {item.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(item.id, { imageUrl: '' })}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
                            >
                              Remover imagem
                            </button>
                          )}
                        </div>
                      </div>

                      <input
                        type="url"
                        value={item.imageUrl.startsWith('data:') ? '' : item.imageUrl}
                        onChange={(e) => handleUpdateItem(item.id, { imageUrl: e.target.value })}
                        placeholder={
                          item.imageUrl.startsWith('data:')
                            ? 'Imagem carregada do computador (ou cole uma URL externa aqui para substituir)'
                            : 'Ou cole aqui o link (URL) da imagem do banner...'
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-mono"
                      />

                      {item.imageUrl && (
                        <div className="rounded-xl bg-neutral-100 dark:bg-neutral-950 overflow-hidden border border-neutral-200 dark:border-neutral-800 max-w-md aspect-video flex items-center justify-center">
                          <img
                            src={item.imageUrl}
                            alt={item.title || 'Prévia do pop-up'}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>

                    {/* Botão de Ação (CTA) Opcional */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                          Texto do Botão (Opcional)
                        </label>
                        <input
                          type="text"
                          value={item.actionLabel}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { actionLabel: e.target.value })
                          }
                          placeholder="Ex: Acessar Edital / Emitir Guia"
                          className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                          Link do Botão (Opcional)
                        </label>
                        <div className="relative">
                          <Link2
                            size={13}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                          />
                          <input
                            type="url"
                            value={item.actionUrl}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { actionUrl: e.target.value })
                            }
                            placeholder="https://... ou /servicos"
                            className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {status === 'empty' && item.enabled && (
                      <div className="flex items-center gap-2 text-xs text-rose-600 font-semibold">
                        <AlertCircle size={14} />
                        <span>
                          Preencha pelo menos um título, mensagem ou imagem para este pop-up aparecer no site.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Prévia ao Vivo no Admin */}
      <SitePopupCarouselModal
        open={previewOpen}
        items={activeItems}
        autoplay={carousel.autoplay}
        autoCloseSeconds={carousel.autoCloseSeconds}
        isMourning={Boolean(config.mourningMode?.enabled)}
        accentHex={accentHex}
        institutionName={institutionName}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
};

export default SitePopupManagerPanel;

