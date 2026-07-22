import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Send,
  Users,
  Activity,
  Plus,
  RefreshCw,
  Search,
  CheckCheck,
  Bot,
  X,
  Edit2,
  Trash2,
  Settings,
  Save
} from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';

const mockChartData = [
  { name: 'Seg', enviadas: 400, lidas: 320 },
  { name: 'Ter', enviadas: 800, lidas: 650 },
  { name: 'Qua', enviadas: 1200, lidas: 1050 },
  { name: 'Qui', enviadas: 900, lidas: 820 },
  { name: 'Sex', enviadas: 1500, lidas: 1300 },
  { name: 'Sáb', enviadas: 300, lidas: 250 },
  { name: 'Dom', enviadas: 150, lidas: 100 },
];

const mockLogs = [
  { id: 1, to: '(11) 98765-4321', type: 'Saúde', status: 'read', time: '10:45', msg: 'Olá Maria, sua consulta está agendada...' },
  { id: 2, to: '(11) 91234-5678', type: 'Protocolo', status: 'delivered', time: '10:40', msg: 'Seu protocolo #4459 foi atualizado...' },
  { id: 3, to: '(11) 99999-8888', type: 'Saúde', status: 'sent', time: '10:35', msg: 'Olá João, confirme sua presença...' },
];

export interface MessageTemplate {
  id: string;
  category: string;
  categoryColor: string;
  name: string;
  content: string;
}

const initialTemplates: MessageTemplate[] = [
  {
    id: '1',
    category: 'Saúde',
    categoryColor: 'blue',
    name: 'Lembrete Consulta',
    content: 'Olá {{"{{nome_paciente}}"}}, tudo bem? \n\nEste é um lembrete da sua consulta na especialidade {{"{{especialidade}}"}} no dia {{"{{data}}"}} às {{"{{hora}}"}}. \n\nPara confirmar, responda SIM. Para cancelar, responda CANCELAR.'
  },
  {
    id: '2',
    category: 'Protocolo',
    categoryColor: 'amber',
    name: 'Atualização de Status',
    content: 'Olá {{"{{nome_cidadao}}"}}!\n\nSeu protocolo Nº {{"{{num_protocolo}}"}} teve uma atualização de status para: *{{"{{novo_status}}"}}*.\n\nVocê pode acompanhar os detalhes no Portal do Cidadão.'
  }
];

export const CommunicationCenter = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'devices' | 'templates' | 'settings'>('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  // Templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Settings state
  const [apiSettings, setApiSettings] = useState({ apiUrl: '', apiKey: '' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('whatsapp_settings').select('*').eq('id', 'global').maybeSingle();
      if (!error && data) {
        setApiSettings({ apiUrl: data.api_url || '', apiKey: data.global_api_key || '' });
      }
    } catch (e) {
      console.log('Error fetching settings', e);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase.from('whatsapp_settings').upsert({
        id: 'global',
        api_url: apiSettings.apiUrl,
        global_api_key: apiSettings.apiKey
      });
      if (error) throw error;
      showToast('Configurações salvas com sucesso!', 'success');
    } catch (e) {
      showToast('Erro ao salvar configurações', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase.from('whatsapp_templates').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        setTemplates(data.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          categoryColor: t.category_color,
          content: t.content
        })));
      } else {
        setTemplates(initialTemplates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Fallback
      setTemplates(initialTemplates);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      if (id.length > 10) { // Probably UUID from db
        await supabase.from('whatsapp_templates').delete().eq('id', id);
      }
      setTemplates(templates.filter(t => t.id !== id));
      setIsTemplateModalOpen(false);
      showToast('Template excluído', 'success');
    } catch (e) {
      showToast('Erro ao excluir template', 'error');
    }
  };

  const handleSaveTemplate = async () => {
    const name = (document.getElementById('tpl-name') as HTMLInputElement).value;
    const category = (document.getElementById('tpl-cat') as HTMLInputElement).value;
    const categoryColor = (document.getElementById('tpl-color') as HTMLSelectElement).value;
    const content = (document.getElementById('tpl-content') as HTMLTextAreaElement).value;

    const newTpl = {
      name,
      category,
      category_color: categoryColor,
      content
    };

    try {
      if (editingTemplate && editingTemplate.id.length > 10) {
        // Update
        await supabase.from('whatsapp_templates').update(newTpl).eq('id', editingTemplate.id);
      } else {
        // Insert
        await supabase.from('whatsapp_templates').insert([newTpl]);
      }
      await fetchTemplates();
      setIsTemplateModalOpen(false);
      showToast('Template salvo!', 'success');
    } catch (e) {
      showToast('Erro ao salvar template', 'error');
      // Update local state anyway for demo if error
      const tempId = editingTemplate ? editingTemplate.id : Date.now().toString();
      const newLocalTpl: MessageTemplate = { id: tempId, name, category, categoryColor, content };
      if (editingTemplate) {
        setTemplates(templates.map(t => t.id === newLocalTpl.id ? newLocalTpl : t));
      } else {
        setTemplates([...templates, newLocalTpl]);
      }
      setIsTemplateModalOpen(false);
    }
  };

  const simulateConnection = () => {
    setIsScanning(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        setIsConnected(true);
      }
    }, 300);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-600 to-teal-700 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <MessageSquare size={200} className="-mr-10 -mt-10" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <MessageSquare size={24} className="text-emerald-100" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Central de Notificações</h1>
          </div>
          <p className="text-emerald-100 max-w-xl">
            Gerencie disparos em massa, conecte o número oficial da prefeitura e automatize a comunicação com os cidadãos via WhatsApp.
          </p>
        </div>

        <div className="relative z-10 flex gap-3">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex flex-col items-center">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1">Status API</span>
            {isConnected ? (
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                Conectado
              </div>
            ) : (
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                Desconectado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'dashboard', label: 'Painel de Envios', icon: Activity },
          { id: 'devices', label: 'Dispositivos', icon: Smartphone },
          { id: 'templates', label: 'Templates de Mensagem', icon: Bot },
          { id: 'settings', label: 'Configurações API', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-emerald-50 dark:hover:bg-neutral-800'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <Send size={24} />
                  </div>
                </div>
                <p className="text-3xl font-black text-neutral-900 dark:text-white mt-4">5.250</p>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-1">Enviadas (Este Mês)</p>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <CheckCheck size={24} />
                  </div>
                </div>
                <p className="text-3xl font-black text-neutral-900 dark:text-white mt-4">89%</p>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-1">Taxa de Leitura</p>
              </div>

              <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 p-6 rounded-3xl shadow-sm relative overflow-hidden text-white">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-3 bg-white/10 backdrop-blur-md text-emerald-400 rounded-2xl border border-white/10">
                    <Users size={24} />
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-emerald-500/30">Saúde em Alta</span>
                </div>
                <p className="text-3xl font-black mt-4">3.400</p>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-1">Lembretes de Consulta</p>
              </div>
            </div>

            {/* Chart & Logs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-6">Volume de Disparos</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                    <BarChart data={mockChartData}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="enviadas" fill="#10b981" radius={[4, 4, 4, 4]} barSize={20} />
                      <Bar dataKey="lidas" fill="#0f766e" radius={[4, 4, 4, 4]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-4 justify-center">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div><span className="text-xs font-bold text-neutral-500">Enviadas</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0f766e]"></div><span className="text-xs font-bold text-neutral-500">Lidas</span></div>
                </div>
              </div>

              {/* Live Logs */}
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">Live Logs</h3>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Real-time
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {mockLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
                          {log.type}
                        </span>
                        <span className="text-xs text-neutral-400 font-medium">{log.time}</span>
                      </div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1">{log.to}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{log.msg}</p>
                      <div className="mt-2 flex justify-end">
                        {log.status === 'read' && <CheckCheck size={14} className="text-sky-500" />}
                        {log.status === 'delivered' && <CheckCheck size={14} className="text-neutral-400" />}
                        {log.status === 'sent' && <CheckCircle2 size={14} className="text-neutral-400" />}
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="mt-4 w-full py-2 text-xs font-bold text-neutral-500 hover:text-emerald-600 transition-colors uppercase tracking-widest">
                  Ver Todo o Histórico
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: DEVICES */}
        {activeTab === 'devices' && (
          <motion.div 
            key="devices"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-center items-center py-10"
          >
            <div className="bg-white dark:bg-neutral-900 p-8 md:p-12 rounded-[40px] border border-neutral-100 dark:border-neutral-800 shadow-2xl max-w-md w-full text-center">
              
              {!isConnected ? (
                <>
                  <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl flex items-center justify-center mb-6">
                    <QrCode size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Conectar WhatsApp</h2>
                  <p className="text-neutral-500 text-sm mb-8">
                    Abra o WhatsApp no celular que fará os disparos oficiais da prefeitura e escaneie o código abaixo.
                  </p>

                  {isScanning ? (
                    <div className="space-y-4">
                      <div className="w-48 h-48 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-3xl flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/20" style={{ height: `${scanProgress}%`, top: `${100 - scanProgress}%`, transition: 'all 0.3s' }}></div>
                        <QrCode size={80} className="text-neutral-300 dark:text-neutral-600" />
                      </div>
                      <p className="text-sm font-bold text-emerald-600 animate-pulse">Conectando... {scanProgress}%</p>
                    </div>
                  ) : (
                    <div className="w-48 h-48 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-3xl flex items-center justify-center p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 transition-colors cursor-pointer" onClick={simulateConnection}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MockConnectionCode123`} alt="QR Code Mock" className="w-full h-full opacity-80" />
                    </div>
                  )}

                  {!isScanning && (
                    <button onClick={simulateConnection} className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/30">
                      Simular Leitura
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Dispositivo Conectado!</h2>
                  <p className="text-neutral-500 text-sm mb-8">
                    A API está conectada com sucesso e pronta para fazer disparos.
                  </p>

                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl text-left border border-neutral-100 dark:border-neutral-700 mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Smartphone className="text-neutral-400" size={20} />
                      <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">Prefeitura Oficial (Saúde)</p>
                        <p className="text-xs text-neutral-500">+55 (11) 98888-7777</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Status: Online</span>
                    </div>
                  </div>

                  <button onClick={() => setIsConnected(false)} className="w-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold py-4 rounded-2xl transition-all">
                    Desconectar Aparelho
                  </button>
                </>
              )}

            </div>
          </motion.div>
        )}

        {/* TAB: TEMPLATES */}
        {activeTab === 'templates' && (
          <motion.div 
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {templates.map(template => (
              <div key={template.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative group cursor-pointer hover:border-emerald-500 transition-colors flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 bg-${template.categoryColor}-100 text-${template.categoryColor}-700 dark:bg-${template.categoryColor}-900/30 dark:text-${template.categoryColor}-400 text-xs font-bold uppercase tracking-widest rounded-lg`}>
                    {template.category}
                  </span>
                  <span className="text-xs text-neutral-400 font-bold">{template.name}</span>
                </div>
                <div className="bg-[#e5ddd5] dark:bg-neutral-800 p-4 rounded-2xl mb-4 relative before:content-[''] before:absolute before:top-4 before:-left-2 before:border-[8px] before:border-transparent before:border-r-[#e5ddd5] dark:before:border-r-neutral-800 flex-1">
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-line">
                    {template.content}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsTemplateModalOpen(true);
                  }}
                  className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                >
                  <Edit2 size={16} /> Editar Template
                </button>
              </div>
            ))}

            {/* ADD Template */}
            <div 
              onClick={() => {
                setEditingTemplate(null);
                setIsTemplateModalOpen(true);
              }}
              className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-3xl flex flex-col items-center justify-center p-6 text-neutral-400 hover:text-emerald-500 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-all min-h-[300px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                <Plus size={32} />
              </div>
              <h3 className="font-black text-lg text-neutral-900 dark:text-white mb-1">Novo Template</h3>
              <p className="text-sm text-center">Criar nova mensagem automatizada.</p>
            </div>
          </motion.div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[40px] border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                  <Settings size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">Configurações da Evolution API</h3>
                  <p className="text-sm text-neutral-500">Conecte sua infraestrutura de disparos oficial.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">URL da API (Webhook)</label>
                  <input 
                    type="text" 
                    placeholder="ex: https://api.suaprefeitura.gov.br"
                    value={apiSettings.apiUrl}
                    onChange={(e) => setApiSettings({ ...apiSettings, apiUrl: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-500 font-medium ml-1">Endpoint base onde a Evolution API está hospedada.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Global API Key</label>
                  <input 
                    type="password" 
                    placeholder="Sua chave de autenticação..."
                    value={apiSettings.apiKey}
                    onChange={(e) => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-500 font-medium ml-1">Usada para autenticar as requisições de criação de instância e disparo.</p>
                </div>

                <button 
                  onClick={saveSettings}
                  disabled={isSavingSettings}
                  className="w-full flex items-center justify-center gap-2 py-4 mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/30"
                >
                  {isSavingSettings ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={20} /> Salvar Configurações
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-8 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                  {editingTemplate ? 'Editar Template' : 'Novo Template'}
                </h3>
                <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nome do Template</label>
                  <input 
                    id="tpl-name"
                    type="text" 
                    defaultValue={editingTemplate?.name || ''}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Categoria</label>
                    <input 
                      id="tpl-cat"
                      type="text" 
                      defaultValue={editingTemplate?.category || ''}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Cor da Label</label>
                    <select 
                      id="tpl-color"
                      defaultValue={editingTemplate?.categoryColor || 'emerald'}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                    >
                      <option value="emerald">Verde (Saúde/Sucesso)</option>
                      <option value="blue">Azul (Informação)</option>
                      <option value="amber">Laranja (Protocolo/Alerta)</option>
                      <option value="rose">Vermelho (Urgente)</option>
                      <option value="indigo">Roxo (Geral)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Conteúdo da Mensagem</label>
                  <textarea 
                    id="tpl-content"
                    defaultValue={editingTemplate?.content || ''}
                    rows={6}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none dark:text-white"
                  />
                  <p className="text-[10px] text-neutral-500 font-medium">Use chaves para criar variáveis, ex: {"{{"}nome_paciente{"}}"}</p>
                </div>
              </div>

              <div className="pt-6 mt-auto flex gap-3">
                {editingTemplate && (
                  <button 
                    onClick={() => handleDeleteTemplate(editingTemplate.id)}
                    className="px-6 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-colors"
                  >
                    Excluir
                  </button>
                )}
                <button 
                  onClick={handleSaveTemplate}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/30"
                >
                  Salvar Template
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
