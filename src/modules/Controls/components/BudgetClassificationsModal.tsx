import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Plus, 
  Search, 
  X, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  FileText
} from 'lucide-react';
import { 
  FleetBudgetClassification, 
  getFleetBudgetClassifications,
  createFleetBudgetClassification,
  updateFleetBudgetClassification,
  deleteFleetBudgetClassification,
  NewBudgetClassificationPayload
} from '../../../lib/api/fleetFuel';
import { showToast } from '../../../components/ui/Toast';

interface BudgetClassificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (list: FleetBudgetClassification[]) => void;
  institutionId?: string;
}

export const BudgetClassificationsModal: React.FC<BudgetClassificationsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  institutionId = 'inst_1'
}) => {
  const [classifications, setClassifications] = useState<FleetBudgetClassification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'special' | 'active'>('all');

  // Estado do formulário de criação/edição
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewBudgetClassificationPayload>({
    department_local: '',
    invoice_sheet: '',
    funding_source: '1.1.500.0',
    budget_code: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  // Carregar classificações
  const loadClassifications = async () => {
    setLoading(true);
    try {
      const data = await getFleetBudgetClassifications(institutionId);
      setClassifications(data);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar classificações orçamentárias.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadClassifications();
      setIsEditing(false);
      setEditingId(null);
    }
  }, [isOpen, institutionId]);

  // Filtragem inteligente
  const filteredList = useMemo(() => {
    return classifications.filter(item => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        item.department_local.toLowerCase().includes(query) ||
        item.invoice_sheet.toLowerCase().includes(query) ||
        item.funding_source.toLowerCase().includes(query) ||
        (item.budget_code && item.budget_code.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      const isSpecialCredit = 
        item.department_local.toLowerCase().includes('crédito') ||
        item.department_local.toLowerCase().includes('credito') ||
        item.department_local.toLowerCase().includes('especial') ||
        item.department_local.toLowerCase().includes('suplementar') ||
        parseInt(item.invoice_sheet, 10) >= 800;

      if (filterType === 'special') return isSpecialCredit;
      if (filterType === 'active') return item.is_active !== false;
      return true;
    }).sort((a, b) => (parseInt(a.invoice_sheet, 10) || 0) - (parseInt(b.invoice_sheet, 10) || 0));
  }, [classifications, searchTerm, filterType]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      department_local: '',
      invoice_sheet: '',
      funding_source: '1.1.500.0',
      budget_code: '',
      is_active: true
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (item: FleetBudgetClassification) => {
    setEditingId(item.id);
    setFormData({
      department_local: item.department_local,
      invoice_sheet: item.invoice_sheet,
      funding_source: item.funding_source,
      budget_code: item.budget_code || '',
      is_active: item.is_active !== false
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department_local.trim() || !formData.invoice_sheet.trim() || !formData.funding_source.trim()) {
      showToast('Preencha os campos obrigatórios (Local, Ficha e Fonte).', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateFleetBudgetClassification(editingId, {
          department_local: formData.department_local,
          invoice_sheet: formData.invoice_sheet,
          funding_source: formData.funding_source,
          budget_code: formData.budget_code,
          is_active: formData.is_active
        });
        showToast('Classificação orçamentária atualizada com sucesso!', 'success');
      } else {
        await createFleetBudgetClassification({
          institution_id: institutionId,
          department_local: formData.department_local,
          invoice_sheet: formData.invoice_sheet,
          funding_source: formData.funding_source,
          budget_code: formData.budget_code,
          is_active: formData.is_active
        }, institutionId);
        showToast('Nova dotação/crédito orçamentário cadastrado com sucesso!', 'success');
      }

      const updated = await getFleetBudgetClassifications(institutionId);
      setClassifications(updated);
      onUpdated(updated);
      setIsEditing(false);
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao salvar classificação orçamentária.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, sheet: string) => {
    if (!window.confirm(`Deseja realmente excluir a Ficha nº ${sheet}?`)) {
      return;
    }

    try {
      await deleteFleetBudgetClassification(id);
      showToast(`Ficha nº ${sheet} removida com sucesso.`, 'info');
      const updated = await getFleetBudgetClassifications(institutionId);
      setClassifications(updated);
      onUpdated(updated);
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir classificação.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                Classificações Orçamentárias & Fichas Contábeis
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-800">
                  Lei 4.320/64
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Gerencie centros de custo, dotações ordinárias e créditos especiais para combustível
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {/* Modo de Edição / Formulário */}
          {isEditing ? (
            <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-800/40 pb-3">
                <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  {editingId ? 'Editar Ficha Orçamentária' : 'Nova Ficha Orçamentária / Crédito Especial'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  Cancelar Edição
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Local / Secretaria / Objeto */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Local / Secretaria / Objeto da Despesa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Transporte Escolar, Gabinete, Crédito Especial - Obras FINISA"
                      value={formData.department_local}
                      onChange={e => setFormData({ ...formData, department_local: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Identificação do centro de custo ou lei autorizadora do crédito especial
                    </p>
                  </div>

                  {/* Ficha Orçamentária */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Número da Ficha Orçamentária *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 57, 152, 905"
                      value={formData.invoice_sheet}
                      onChange={e => setFormData({ ...formData, invoice_sheet: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-black font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Ficha contábil do orçamento vigente
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fonte de Recursos */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Fonte de Recursos (Contábil) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1.1.500.0, 2.1.500.1001000, 1.7.500.0"
                      value={formData.funding_source}
                      onChange={e => setFormData({ ...formData, funding_source: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Código da Dotação */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Código da Dotação (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 18, 20, 28"
                      value={formData.budget_code || ''}
                      onChange={e => setFormData({ ...formData, budget_code: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Dotação Ativa (Disponível para emissão de combustível)
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition"
                    >
                      {saving ? 'Gravando...' : (editingId ? 'Atualizar Ficha' : 'Cadastrar Ficha')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* Barra de Ações: Busca + Filtros + Botão Criar */
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Buscar por ficha, local, fonte ou código..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-lg transition ${filterType === 'all' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500'}`}
                  >
                    Todas ({classifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('special')}
                    className={`px-3 py-1 rounded-lg transition ${filterType === 'special' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500'}`}
                  >
                    Créditos Especiais
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('active')}
                    className={`px-3 py-1 rounded-lg transition ${filterType === 'active' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500'}`}
                  >
                    Ativas
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>Nova Ficha / Crédito</span>
                </button>
              </div>
            </div>
          )}

          {/* Tabela de Classificações */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-[55vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="p-3 w-28">Ficha</th>
                  <th className="p-3">Local / Centro de Custo / Objeto</th>
                  <th className="p-3">Fonte de Recursos</th>
                  <th className="p-3">Cód. Dotação</th>
                  <th className="p-3 text-center">Tipo</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-neutral-400">
                      <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                      Carregando dotações contábeis...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-neutral-400">
                      <FileText size={32} className="mx-auto text-blue-500 mb-2 opacity-60" />
                      <p className="font-bold text-neutral-800 dark:text-white">Nenhuma ficha orçamentária encontrada</p>
                      <p className="text-xs mt-1 text-neutral-500">
                        {searchTerm ? 'Tente outros termos de busca.' : 'Clique em "Nova Ficha / Crédito" para cadastrar.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map(item => {
                    const isSpecial = 
                      item.department_local.toLowerCase().includes('crédito') ||
                      item.department_local.toLowerCase().includes('credito') ||
                      item.department_local.toLowerCase().includes('especial') ||
                      item.department_local.toLowerCase().includes('suplementar') ||
                      parseInt(item.invoice_sheet, 10) >= 800;

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition">
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-black text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                            {item.invoice_sheet}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-neutral-900 dark:text-white">
                          {item.department_local}
                        </td>
                        <td className="p-3 font-mono text-neutral-700 dark:text-neutral-300">
                          {item.funding_source}
                        </td>
                        <td className="p-3 font-mono text-neutral-600 dark:text-neutral-400">
                          {item.budget_code ? `Cód. ${item.budget_code}` : '—'}
                        </td>
                        <td className="p-3 text-center">
                          {isSpecial ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Crédito Especial
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800">
                              Ordinária
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={12} /> Ativa
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-neutral-400">
                              Inativa
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                              title="Editar Ficha"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.invoice_sheet)}
                              className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                              title="Excluir Ficha"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Rodapé */}
        <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/50">
          <span className="text-xs text-neutral-500">
            Total cadastrado: <strong>{classifications.length}</strong> dotações contábeis oficiais
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

