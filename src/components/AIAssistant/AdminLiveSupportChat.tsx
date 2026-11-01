import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageCircle, Headphones, Send, CheckCircle2, User, Clock, 
  AlertCircle, CheckCheck, Paperclip, Smile, MoreVertical, Search, 
  Filter, ShieldCheck, Zap, ArrowLeft, RefreshCw, Sparkles, Building2,
  PhoneCall, ExternalLink, ChevronRight, Copy, Check, Mail, Info,
  PanelRightClose, PanelRightOpen, Terminal, HelpCircle, Shield, Briefcase,
  Trash2
} from 'lucide-react';
import { 
  fetchLiveTickets, 
  claimLiveTicket, 
  resolveLiveTicket, 
  deleteLiveTicket,
  fetchLiveMessages, 
  sendLiveMessage, 
  subscribeToLiveChat,
  LiveChatTicket,
  LiveChatMessage
} from '../../services/liveChatService';
import { AdminUser, Institution } from '../../types';
import { FormattedText } from './FormattedText';

export interface SlashCommand {
  command: string;
  title: string;
  description: string;
  category: 'Atendimento' | 'Suporte' | 'Módulos' | 'Encerramento';
  generateText: (vars: { nome: string; municipio: string; modulo: string; protocolo: string }) => string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/ola',
    title: '👋 Saudação Inicial',
    description: 'Apresenta o suporte e saúda o servidor pelo nome',
    category: 'Atendimento',
    generateText: ({ nome, municipio }) =>
      `Olá, ${nome}! Sou da equipe de suporte técnico do Gestão 360. Como posso auxiliar você e a ${municipio} hoje?`
  },
  {
    command: '/aguardar',
    title: '⏳ Em Análise no Banco de Dados',
    description: 'Informa que os registros do município estão sendo consultados',
    category: 'Atendimento',
    generateText: ({ nome, municipio }) =>
      `Compreendido, ${nome}! Já localizei os registros da ${municipio} e estou verificando junto à nossa base de dados. Por gentileza, aguarde um instante.`
  },
  {
    command: '/limparcache',
    title: '🔄 Recarregar e Limpar Cache',
    description: 'Instruções de recarga forçada no navegador (Ctrl + F5)',
    category: 'Suporte',
    generateText: () =>
      'Por gentileza, pressione Ctrl + F5 no teclado do seu navegador para recarregar as diretrizes mais recentes do sistema Gestão 360 e limpar o cache local.'
  },
  {
    command: '/senha',
    title: '🔑 Redefinição de Senha de Servidor',
    description: 'Procedimento para redefinição ou desbloqueio de acesso',
    category: 'Suporte',
    generateText: ({ municipio }) =>
      `Para redefinir sua senha de acesso, acesse a tela de login inicial do Gestão 360 e utilize a opção "Esqueci minha senha" ou solicite a atualização pelo Administrador de TI da ${municipio}.`
  },
  {
    command: '/pntp',
    title: '🏛️ Transparência Radar PNTP',
    description: 'Conformidade com os critérios Atricon do Radar PNTP',
    category: 'Módulos',
    generateText: ({ municipio }) =>
      `Para atendimento aos critérios do Radar Nacional da Transparência Pública (PNTP - Atricon), verifique os requisitos obrigatórios no módulo "Radar PNTP" e certifique-se de que as publicações e relatórios da ${municipio} estão no prazo regulamentar.`
  },
  {
    command: '/sus',
    title: '🩺 Prontuário SUS / PEP SOAP',
    description: 'Diretrizes do prontuário médico e dispensação RENAME/FEFO',
    category: 'Módulos',
    generateText: () =>
      'O prontuário eletrônico do paciente (PEP) opera em conformidade com o padrão SOAP do Ministério da Saúde, controle FEFO de validade de medicamentos e as regras de sigilo e mascaramento de dados da LGPD Sensível.'
  },
  {
    command: '/educacao',
    title: '📚 Gestão Escolar & SAEB',
    description: 'Frequência mínima de 75% LDB e diário eletrônico',
    category: 'Módulos',
    generateText: () =>
      'No diário escolar, a frequência segue a exigência legal de 75% da LDB e a avaliação por competências da BNCC/SAEB com regulação da fila da creche.'
  },
  {
    command: '/frotas',
    title: '⛽ Controle de Frotas & Trava de Tanque',
    description: 'Regras de abastecimento, trava de tanque e Top-Off',
    category: 'Módulos',
    generateText: () =>
      'Para liberação de abastecimento com trava física de tanque ou protocolo Top-Off para socorro contínuo, informe a quilometragem/horímetro atual do veículo e a justificativa operacional.'
  },
  {
    command: '/transferir',
    title: '➡️ Transferência para Especialista',
    description: 'Encaminhamento para a equipe de engenharia do módulo',
    category: 'Suporte',
    generateText: ({ modulo }) =>
      `Estou encaminhando sua solicitação para o engenheiro especialista do módulo ${modulo} da nossa equipe de produto para análise pontual.`
  },
  {
    command: '/resolvido',
    title: '✅ Encerramento de Atendimento',
    description: 'Finalização cordial com confirmação de protocolo',
    category: 'Encerramento',
    generateText: ({ nome, protocolo, municipio }) =>
      `Fico muito feliz em ter ajudado, ${nome}! O seu chamado (${protocolo}) foi concluído com sucesso. O assistente virtual Copilot 360 continuará disponível caso precise de qualquer nova orientação. Tenha um excelente trabalho na ${municipio}!`
  }
];

const formatTime = (isoString?: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getRelativeTime = (isoString?: string) => {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes === 1) return 'Há 1 minuto';
  if (diffMinutes < 60) return `Há ${diffMinutes} minutos`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return 'Há 1 hora';
  return `Há ${diffHours} horas`;
};

interface AdminLiveSupportChatProps {
  currentUser?: AdminUser | null;
  institutions?: Institution[];
}

export const AdminLiveSupportChat: React.FC<AdminLiveSupportChatProps> = ({ 
  currentUser, 
  institutions = [] 
}) => {
  const [tickets, setTickets] = useState<LiveChatTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<LiveChatTicket | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'waiting' | 'active'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(true);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<{ id: string; protocol: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados dos comandos de barra /
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);

  const attendantName = currentUser?.name 
    ? `${currentUser.name} (Suporte Gestão 360)` 
    : 'Carlos (Suporte Gestão 360)';

  // Informações da instituição vinculada ao ticket ativo
  const activeInstitution = useMemo(() => {
    if (!activeTicket) return null;
    return institutions.find(
      (inst) => 
        inst.id === activeTicket.institution_id || 
        inst.name.toLowerCase() === (activeTicket.institution_name || '').toLowerCase()
    ) || null;
  }, [activeTicket, institutions]);

  // 1. Carregar fila de chamados
  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLiveTickets();
      setTickets(data);
      if (activeTicket) {
        const current = data.find((t) => t.id === activeTicket.id);
        if (current) setActiveTicket(current);
      }
    } catch (err) {
      console.warn('Erro ao buscar chamados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 4000);
    return () => clearInterval(interval);
  }, []);

  // 2. Escutar eventos globais de novos chamados e mensagens com deduplicação
  useEffect(() => {
    const unsubscribe = subscribeToLiveChat(activeTicket?.id || null, {
      onNewMessage: (newMsg) => {
        if (activeTicket && newMsg.ticket_id === activeTicket.id) {
          setMessages((prev) => {
            // 1. Verifica se já existe por ID
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            // 2. Se existe mensagem otimista recente com o mesmo conteúdo e tipo de remetente
            const dupIndex = prev.findIndex(
              (m) =>
                (m.id.startsWith('temp_') || m.id.startsWith('msg_')) &&
                (m.content || '').trim() === (newMsg.content || '').trim() &&
                m.sender_type === newMsg.sender_type
            );

            if (dupIndex !== -1) {
              const updated = [...prev];
              updated[dupIndex] = {
                ...updated[dupIndex],
                id: newMsg.id,
                created_at: newMsg.created_at || updated[dupIndex].created_at
              };
              return updated;
            }

            return [...prev, newMsg];
          });
        }
      },
      onTicketUpdated: () => {
        loadTickets();
      },
      onTicketDeleted: (deletedId) => {
        setTickets((prev) => prev.filter((t) => t.id !== deletedId));
        if (activeTicket?.id === deletedId) {
          setActiveTicket(null);
          setMessages([]);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeTicket?.id]);

  // 3. Ao selecionar um chamado, carregar histórico de mensagens
  useEffect(() => {
    if (!activeTicket) return;

    const loadMsgs = async () => {
      const history = await fetchLiveMessages(activeTicket.id);
      setMessages(history);
    };

    loadMsgs();
  }, [activeTicket?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Assumir chamado
  const handleClaimChat = async (ticket: LiveChatTicket) => {
    const updated = await claimLiveTicket(ticket.id, attendantName);

    // Envia mensagem automática avisando o servidor
    await sendLiveMessage({
      ticket_id: ticket.id,
      sender_type: 'admin',
      sender_name: attendantName,
      content: `👋 Olá, ${ticket.requester_name}! Sou ${attendantName.split(' ')[0]} da equipe de suporte do Gestão 360 e assumi o seu chamado. Como posso te auxiliar agora?`
    });

    if (updated) {
      setActiveTicket(updated);
    } else {
      setActiveTicket({ ...ticket, chat_mode: 'human_active', attendant_name: attendantName });
    }

    loadTickets();
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  // 5. Enviar mensagem do Atendente
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || replyText).trim();
    if (!textToSend || !activeTicket) return;

    setReplyText('');
    setShowQuickReplies(false);
    setIsSlashMenuOpen(false);

    const optimisticMsg: LiveChatMessage = {
      id: `temp_${Date.now()}`,
      ticket_id: activeTicket.id,
      sender_type: 'admin',
      sender_name: attendantName,
      content: textToSend,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await sendLiveMessage({
        ticket_id: activeTicket.id,
        sender_type: 'admin',
        sender_name: attendantName,
        content: textToSend
      });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  };

  // 6. Finalizar chamado e devolver para o Bot Copilot
  const handleResolveChat = async () => {
    if (!activeTicket) return;

    const servName = (activeTicket.requester_name || 'Servidor').split(' ')[0];
    await sendLiveMessage({
      ticket_id: activeTicket.id,
      sender_type: 'admin',
      sender_name: attendantName,
      content: `✅ Atendimento finalizado com sucesso pela equipe técnica. ${servName}, você continuará com o Copilot 360 para outras orientações.`
    });

    await resolveLiveTicket(activeTicket.id);
    setActiveTicket(null);
    loadTickets();
  };

  // 7. Excluir chamado definitivamente (Super Admin)
  const handleDeleteTicket = (ticketId: string, protocol?: string) => {
    setTicketToDelete({ id: ticketId, protocol: protocol || `SUP-${ticketId.slice(0, 6)}` });
  };

  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    setIsDeleting(true);
    const { id } = ticketToDelete;

    try {
      await deleteLiveTicket(id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      if (activeTicket?.id === id) {
        setActiveTicket(null);
        setMessages([]);
      }
      setTicketToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir chamado:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copiar dados com feedback visual
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Variáveis para interpolação nos templates de comando
  const templateVars = useMemo(() => {
    const nome = activeTicket?.requester_name 
      ? activeTicket.requester_name.split(' ')[0] 
      : 'Servidor';
    const municipio = activeTicket?.institution_name || 'Prefeitura Municipal';
    const modulo = activeTicket?.module || 'Geral';
    const protocolo = activeTicket?.protocol || (activeTicket?.id ? `SUP-${activeTicket.id.slice(0, 6)}` : 'SUP-000000');
    return { nome, municipio, modulo, protocolo };
  }, [activeTicket]);

  // Filtro de comandos de barra /
  const slashQuery = replyText.startsWith('/') ? replyText.slice(1).toLowerCase() : '';
  const filteredSlashCommands = useMemo(() => {
    if (!replyText.startsWith('/')) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((cmd) =>
      cmd.command.toLowerCase().includes(slashQuery) ||
      cmd.title.toLowerCase().includes(slashQuery) ||
      cmd.description.toLowerCase().includes(slashQuery)
    );
  }, [replyText, slashQuery]);

  // Aplicar comando selecionado
  const applySlashCommand = (cmd: SlashCommand) => {
    const generated = cmd.generateText(templateVars);
    setReplyText(generated);
    setIsSlashMenuOpen(false);
    inputRef.current?.focus();
  };

  // Manipulação de teclas no input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSlashMenuOpen && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredSlashCommands[selectedSlashIndex];
        if (selected) {
          applySlashCommand(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSlashMenuOpen(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Detecção de / no input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReplyText(val);

    if (val.startsWith('/')) {
      setIsSlashMenuOpen(true);
      setSelectedSlashIndex(0);
    } else {
      setIsSlashMenuOpen(false);
    }
  };

  // Filtros de fila
  const filteredTickets = tickets.filter((t) => {
    const query = searchFilter.toLowerCase();
    const matchesSearch =
      (t.requester_name || '').toLowerCase().includes(query) ||
      (t.protocol || '').toLowerCase().includes(query) ||
      (t.institution_name || '').toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (tabFilter === 'waiting') return t.chat_mode === 'waiting_human';
    if (tabFilter === 'active') return t.chat_mode === 'human_active';
    return true;
  });

  const waitingCount = tickets.filter((t) => t.chat_mode === 'waiting_human').length;
  const activeCount = tickets.filter((t) => t.chat_mode === 'human_active').length;

  return (
    <div className="flex flex-col lg:flex-row h-[740px] max-h-[calc(100vh-200px)] rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl overflow-hidden font-sans select-none">
      
      {/* ========================================================
          COLUNA 1: FILA DE CHAMADOS MUNICIPAIS (SIDEBAR ESQUERDA)
         ======================================================== */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 shrink-0">
        
        {/* Topo da Sidebar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-neutral-950 flex items-center justify-center font-black text-sm shadow-md">
                360
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-neutral-900 rounded-full" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                Suporte em Tempo Real
              </h2>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Atendentes Online
              </p>
            </div>
          </div>

          <button
            onClick={loadTickets}
            title="Atualizar fila de chamados"
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Busca e Abas */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2 bg-neutral-50 dark:bg-neutral-950/40">
          <div className="flex items-center bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Search className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar por servidor, prefeitura ou protocolo..."
              className="bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 w-full focus:outline-none text-xs"
            />
          </div>

          {/* Abas com a identidade Gestão 360 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTabFilter('all')}
              className={`flex-1 py-1 rounded-xl text-[11px] font-bold transition text-center ${
                tabFilter === 'all'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
              }`}
            >
              Todos ({tickets.length})
            </button>
            <button
              onClick={() => setTabFilter('waiting')}
              className={`flex-1 py-1 rounded-xl text-[11px] font-bold transition text-center flex items-center justify-center gap-1.5 ${
                tabFilter === 'waiting'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
              }`}
            >
              <span>Fila</span>
              {waitingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black animate-pulse">
                  {waitingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTabFilter('active')}
              className={`flex-1 py-1 rounded-xl text-[11px] font-bold transition text-center flex items-center justify-center gap-1.5 ${
                tabFilter === 'active'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800'
              }`}
            >
              <span>Ativos</span>
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Lista de Chamados */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-200/60 dark:divide-neutral-800/60 custom-scrollbar">
          {filteredTickets.map((t) => {
            const isSelected = activeTicket?.id === t.id;
            const isWaiting = t.chat_mode === 'waiting_human';

            return (
              <div
                key={t.id}
                onClick={() => setActiveTicket(t)}
                className={`p-3.5 cursor-pointer transition flex items-start gap-3 group relative ${
                  isSelected
                    ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500'
                    : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-900/70'
                }`}
              >
                {/* Avatar com inicial */}
                <div className="relative shrink-0 mt-0.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                    isWaiting 
                      ? 'bg-amber-500 text-neutral-950' 
                      : 'bg-emerald-500 text-neutral-950'
                  }`}>
                    {(t.requester_name || 'S')[0].toUpperCase()}
                  </div>
                  {isWaiting && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-white dark:border-neutral-900 rounded-full animate-ping" />
                  )}
                </div>

                {/* Dados do chamado */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {t.requester_name || 'Servidor Municipal'}
                    </h3>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {formatTime(t.updated_at || t.created_at)}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mb-1.5">
                    {t.description || t.subject || 'Atendimento ao vivo solicitado'}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {t.protocol || `SUP-${t.id.slice(0, 6)}`}
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-neutral-400" />
                      {t.institution_name || 'Prefeitura'}
                    </span>
                  </div>
                </div>

                {/* Badge de Status e Ação de Exclusão rápida */}
                <div className="shrink-0 self-center flex items-center gap-1.5">
                  {isWaiting ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                      Fila
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Ativo
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTicket(t.id, t.protocol);
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                    title="Excluir chamado"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredTickets.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center p-8 text-neutral-400 h-64">
              <Headphones className="w-10 h-10 mb-3 opacity-30 text-amber-500" />
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Fila Vazia</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-[200px]">
                Quando servidores municipais solicitarem transbordo no Copilot 360, os chamados surgirão aqui em tempo real.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          COLUNA 2: ÁREA DE CHAT AO VIVO (CENTRAL)
         ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-950 relative">
        {activeTicket ? (
          <>
            {/* CABEÇALHO DO CHAT */}
            <div className="p-3.5 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center font-black text-sm shrink-0">
                  {(activeTicket.requester_name || 'S')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {activeTicket.requester_name || 'Servidor Municipal'}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                      {activeTicket.protocol || `SUP-${activeTicket.id.slice(0, 6)}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                      {activeTicket.institution_name || 'Prefeitura Municipal'}
                    </span>
                    <span>•</span>
                    <span className="truncate">{activeTicket.module || 'Geral'}</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-semibold flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> conectado
                    </span>
                  </p>
                </div>
              </div>

              {/* Ações do Atendente */}
              <div className="flex items-center gap-2 shrink-0">
                {activeTicket.chat_mode === 'waiting_human' ? (
                  <button
                    onClick={() => handleClaimChat(activeTicket)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95 animate-pulse"
                  >
                    <Headphones className="w-4 h-4" /> Assumir Chamado
                  </button>
                ) : (
                  <button
                    onClick={handleResolveChat}
                    className="px-3 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-bold flex items-center gap-1.5 transition"
                    title="Finalizar atendimento e devolver para o Copilot"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="hidden sm:inline">Finalizar</span>
                  </button>
                )}

                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={`p-2 rounded-xl border transition ${
                    showQuickReplies 
                      ? 'bg-amber-500 text-neutral-950 border-amber-500 font-bold' 
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                  title="Respostas Rápidas em Chips"
                >
                  <Zap className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className={`p-2 rounded-xl border transition ${
                    showUserInfo 
                      ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 border-neutral-900 dark:border-neutral-100' 
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                  title={showUserInfo ? 'Ocultar Ficha do Usuário' : 'Exibir Ficha do Usuário'}
                >
                  {showUserInfo ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => handleDeleteTicket(activeTicket.id, activeTicket.protocol)}
                  className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-rose-500 hover:border-rose-500/40 hover:bg-rose-500/10 transition"
                  title="Excluir Chamado Definitivamente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BARRA DE CHIPS DE RESPOSTAS RÁPIDAS */}
            {showQuickReplies && (
              <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 overflow-x-auto select-none shrink-0 custom-scrollbar">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Chips Rápidos:
                </span>
                {SLASH_COMMANDS.slice(0, 5).map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => applySlashCommand(cmd)}
                    disabled={activeTicket.chat_mode === 'waiting_human'}
                    className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-white dark:bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition shadow-2xs disabled:opacity-50"
                  >
                    {cmd.title}
                  </button>
                ))}
              </div>
            )}

            {/* FEED DE MENSAGENS */}
            <div 
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-neutral-50/70 dark:bg-neutral-950/70 custom-scrollbar"
              style={{
                backgroundImage: 'radial-gradient(rgba(245, 158, 11, 0.04) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            >
              {/* Banner de Sessão */}
              <div className="flex justify-center my-1 select-none">
                <div className="bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 text-[11px] px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sessão de Atendimento Criptografada • Gestão 360 SaaS</span>
                </div>
              </div>

              {/* Dúvida / Motivo de Abertura */}
              {activeTicket.description && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] sm:max-w-[75%] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl rounded-tl-sm p-3.5 text-xs shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                      📋 Motivo do Transbordo Informado:
                    </span>
                    <FormattedText content={activeTicket.description} />
                    <span className="block text-right text-[10px] text-neutral-400 mt-1 font-mono">
                      {formatTime(activeTicket.created_at)}
                    </span>
                  </div>
                </div>
              )}

              {/* Mensagens do Histórico */}
              {messages.map((msg, idx) => {
                const isAdmin = msg.sender_type === 'admin';
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm transition ${
                        isAdmin
                          ? 'bg-neutral-900 dark:bg-neutral-800 text-white rounded-tr-sm border border-neutral-700/60'
                          : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-tl-sm border border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className={`text-[10px] font-black tracking-wider uppercase ${
                          isAdmin ? 'text-amber-400' : 'text-emerald-500'
                        }`}>
                          {msg.sender_name}
                        </span>
                      </div>
                      <FormattedText content={msg.content} />

                      <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isAdmin ? 'text-neutral-400' : 'text-neutral-400'
                      }`}>
                        <span>{formatTime(msg.created_at)}</span>
                        {isAdmin && <CheckCheck className="w-3.5 h-3.5 text-sky-400" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* POPOVER FLUTUANTE DE COMANDOS DE BARRA / (SLASH COMMANDS) */}
            {isSlashMenuOpen && (
              <div 
                ref={slashMenuRef}
                className="absolute bottom-16 left-4 right-4 sm:left-6 sm:right-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-72 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                      Comandos Rápidos (Digite <span className="text-amber-500">/</span> para filtrar)
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Use ↑ ↓ e Enter para selecionar
                  </span>
                </div>

                <div className="overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                  {filteredSlashCommands.map((cmd, idx) => {
                    const isSelected = idx === selectedSlashIndex;
                    return (
                      <div
                        key={cmd.command}
                        onClick={() => applySlashCommand(cmd)}
                        className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-500/15 border border-amber-500/30 text-neutral-900 dark:text-white'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              {cmd.command}
                            </span>
                            <span className="font-bold text-xs truncate">
                              {cmd.title}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                              {cmd.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                            {cmd.description}
                          </p>
                        </div>

                        <div className="shrink-0 text-amber-500">
                          {isSelected && <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}

                  {filteredSlashCommands.length === 0 && (
                    <div className="p-4 text-center text-xs text-neutral-400">
                      Nenhum comando correspondente a "{slashQuery}".
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BARRA DE DIGITAÇÃO COM BOTÃO DE COMANDOS / */}
            <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0">
              {/* Botão de Atalho para Comandos Rápidos */}
              <button
                onClick={() => {
                  if (activeTicket.chat_mode !== 'waiting_human') {
                    setIsSlashMenuOpen(!isSlashMenuOpen);
                    inputRef.current?.focus();
                  }
                }}
                disabled={activeTicket.chat_mode === 'waiting_human'}
                className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shrink-0 ${
                  isSlashMenuOpen
                    ? 'bg-amber-500 text-neutral-950 border-amber-500'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                } disabled:opacity-40`}
                title="Abrir menu de comandos rápidos (/)"
              >
                <Terminal className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline font-mono">/ Comandos</span>
              </button>

              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  disabled={activeTicket.chat_mode === 'waiting_human'}
                  placeholder={
                    activeTicket.chat_mode === 'waiting_human'
                      ? 'Clique no botão "Assumir Chamado" acima para responder ao servidor...'
                      : 'Digite sua mensagem técnica ou / para respostas prontas...'
                  }
                  className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                />
              </div>

              <button
                onClick={() => handleSendMessage()}
                disabled={activeTicket.chat_mode === 'waiting_human' || !replyText.trim()}
                className="w-10 h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 disabled:opacity-40 disabled:hover:from-amber-500 flex items-center justify-center transition shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
                title="Enviar mensagem (Enter)"
              >
                <Send className="w-4 h-4 text-neutral-950" />
              </button>
            </div>
          </>
        ) : (
          /* ESTADO VAZIO QUANDO NENHUM CHAMADO ESTÁ SELECIONADO */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              Atendimento em Tempo Real Gestão 360
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed mb-4">
              Selecione um chamado na coluna lateral para iniciar o atendimento ao vivo com o servidor público municipal.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span>Sincronizado via Supabase Realtime & BroadcastChannel</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          COLUNA 3: FICHA DE IDENTIFICAÇÃO DO USUÁRIO & MUNICÍPIO
         ======================================================== */}
      {activeTicket && showUserInfo && (
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/95 flex flex-col shrink-0 animate-in fade-in duration-200 overflow-y-auto custom-scrollbar">
          
          {/* Header da Ficha do Solicitante */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                Identificação do Solicitante
              </h3>
            </div>
            <button
              onClick={() => setShowUserInfo(false)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
              title="Fechar painel"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* Bloco 1: Avatar e Dados Pessoais do Servidor */}
            <div className="text-center p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-600 text-neutral-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 mb-3">
                {(activeTicket.requester_name || 'S')[0].toUpperCase()}
              </div>
              <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                {activeTicket.requester_name || 'Servidor Municipal'}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center justify-center gap-1.5">
                <Briefcase className="w-3 h-3 text-amber-500" />
                <span>{activeTicket.requester_role || 'Servidor Público'}</span>
              </p>

              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sessão Ativa no Navegador
              </div>
            </div>

            {/* Bloco 2: Contato e Acesso */}
            <div className="space-y-3">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Contato & Acesso
              </h5>

              {/* E-mail Institucional */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-neutral-400">E-mail Institucional</p>
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {activeTicket.requester_email || 'Não informado'}
                    </p>
                  </div>
                </div>
                {activeTicket.requester_email && (
                  <button
                    onClick={() => copyToClipboard(activeTicket.requester_email!, 'email')}
                    className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition shrink-0"
                    title="Copiar e-mail"
                  >
                    {copiedItem === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Protocolo do Chamado */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-neutral-400">Protocolo SUP</p>
                    <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 truncate">
                      {activeTicket.protocol || `SUP-${activeTicket.id.slice(0, 6)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(activeTicket.protocol || activeTicket.id, 'protocol')}
                  className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition shrink-0"
                  title="Copiar protocolo"
                >
                  {copiedItem === 'protocol' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Tempo de Espera / Abertura */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-neutral-400">Tempo de Atendimento</p>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {getRelativeTime(activeTicket.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 3: Município Parceiro & Módulo */}
            <div className="space-y-3">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Prefeitura & Módulo
              </h5>

              <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <h6 className="text-xs font-black text-neutral-900 dark:text-white truncate">
                    {activeTicket.institution_name || 'Prefeitura Municipal'}
                  </h6>
                </div>

                <div className="text-[11px] space-y-1 text-neutral-600 dark:text-neutral-400">
                  <p className="flex items-center justify-between">
                    <span>Módulo Navegado:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-200">
                      {activeTicket.module || 'Geral'}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Status do Contrato:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {activeInstitution?.status ? activeInstitution.status.toUpperCase() : 'ATIVO'}
                    </span>
                  </p>
                  {activeInstitution?.subdomain && (
                    <p className="flex items-center justify-between font-mono text-[10px]">
                      <span>Domínio:</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        {activeInstitution.subdomain}.gestao360.app
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 4: Ações Rápidas */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  const resumo = `[CHAMADO ${activeTicket.protocol || activeTicket.id}]\nServidor: ${activeTicket.requester_name}\nPrefeitura: ${activeTicket.institution_name}\nMódulo: ${activeTicket.module}\nDúvida: ${activeTicket.description || 'Não especificada'}`;
                  copyToClipboard(resumo, 'resumo');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                {copiedItem === 'resumo' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedItem === 'resumo' ? 'Copiado!' : 'Copiar Resumo do Chamado'}</span>
              </button>

              {activeTicket.chat_mode === 'human_active' && (
                <button
                  onClick={handleResolveChat}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-neutral-950 text-xs font-black transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir e Devolver para Bot</span>
                </button>
              )}

              <button
                onClick={() => handleDeleteTicket(activeTicket.id, activeTicket.protocol)}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Chamado Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (SUPER ADMIN)
         ======================================================== */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              Excluir Chamado Definitivamente?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
              Você está prestes a excluir permanentemente o chamado <span className="font-mono font-bold text-amber-500">{ticketToDelete.protocol}</span>. Todo o histórico de mensagens deste atendimento será apagado da base de dados.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setTicketToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteTicket}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, Excluir Chamado</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLiveSupportChat;