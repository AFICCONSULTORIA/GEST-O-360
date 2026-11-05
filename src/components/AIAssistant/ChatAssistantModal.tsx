import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Sparkles, Send, X, Trash2, Check, Compass, 
  MessageSquare, ShieldCheck, HeartPulse, 
  GraduationCap, Fuel, FileCheck, LifeBuoy, Layers, ExternalLink,
  Headphones, Bot, User, AlertCircle,
  CheckCheck, Paperclip, Smile, MoreVertical, Minimize2,
  RefreshCw, CheckCircle2, Zap, ArrowRight, CornerDownLeft,
  Terminal, HelpCircle, ChevronRight, BookOpen, Building2, Shield,
  Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChatMessage, 
  streamMessageFromAgent, 
  parseAgentActions,
  AssistantActionPayload,
  normalizeTargetRoute
} from '../../services/aiAssistantService';
import { 
  requestHumanTicket, 
  sendLiveMessage, 
  subscribeToLiveChat,
  fetchLiveMessages,
  LiveChatTicket,
  LiveChatMessage,
  CLIENT_SESSION_ID
} from '../../services/liveChatService';
import { assistantActionBus } from './actionBus';
import { ContextualShortcut, ChatAssistantProps } from './types';
import { FormattedText } from './FormattedText';
import { showToast } from '../ui/Toast';

const VIEW_LABEL_MAP: Record<string, string> = {
  home: 'Painel Geral',
  mayor: 'Gabinete do Prefeito',
  controls: 'Controles Internos & Compliance',
  accounting_changes: 'Alterações Contábeis (SRC)',
  fleet_fuel: 'Controle & Auditoria de Frotas',
  risk: 'Matriz de Riscos',
  pntp: 'Transparência PNTP',
  contracts: 'Contratos & Licitações',
  orders: 'Pedidos & Requisições',
  protocol: 'Protocolo Digital',
  saude: 'Saúde & Farmácia Básica',
  consultorio_medico: 'Consultório PEP SOAP',
  education: 'Educação Municipal',
  reports: 'Central de Relatórios',
  certificates: 'Banco de Certidões',
  course_certificates: 'Emissor de Certificados',
  ouvidoria: 'Ouvidoria Geral',
  admin_financas: 'Finanças & LRF',
  financas: 'Tesouraria',
  patrimonio: 'Patrimônio',
  servicos_publicos: 'Serviços Públicos',
  laws: 'Legislação Municipal',
  norms: 'Atos Normativos & Decretos',
  camara: 'Câmara Municipal',
  support: 'Suporte Técnico',
  notafiscal: 'Validador de Nota Fiscal'
};

const formatTime = (date?: Date | string) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

interface FridayCapability {
  category: string;
  icon: any;
  color: string;
  items: {
    title: string;
    description: string;
    prompt: string;
  }[];
}

const FRIDAY_CAPABILITIES: FridayCapability[] = [
  {
    category: 'Gabinete & Governança',
    icon: Building2,
    color: 'amber',
    items: [
      {
        title: 'Consultar Legislação Municipal',
        description: 'Pesquisar leis, decretos municipais e atos normativos oficiais',
        prompt: 'Sexta-Feira, como consulto os decretos municipais e leis vigentes no sistema?'
      },
      {
        title: 'Contratos da Lei 14.133',
        description: 'Verificar contratos vigentes, aditivos e certidões necessárias',
        prompt: 'Onde verifico os contratos vigentes e os prazos de aditivos pela Nova Lei de Licitações?'
      }
    ]
  },
  {
    category: 'Saúde Pública (SUS / PEP)',
    icon: HeartPulse,
    color: 'emerald',
    items: [
      {
        title: 'Regras da Farmácia (FEFO)',
        description: 'Critério First Expire, First Out para medicamentos',
        prompt: 'Como funciona a saída de medicamentos na farmácia pela regra FEFO?'
      },
      {
        title: 'Sigilo de Prontuário (LGPD)',
        description: 'Proteção legal de prontuários clínicos e exames',
        prompt: 'Quais os cuidados com dados clínicos e prontuários de pacientes no sistema?'
      },
      {
        title: 'Fila de Regulação e Exames',
        description: 'Critérios de gravidade para consultas especializadas',
        prompt: 'Como funciona a prioridade da fila de exames e consultas especializadas?'
      }
    ]
  },
  {
    category: 'Educação & Diário Escolar',
    icon: GraduationCap,
    color: 'sky',
    items: [
      {
        title: 'Escala de Proficiência SAEB',
        description: 'Avaliação descritiva por competências BNCC/SAEB',
        prompt: 'Não acho onde coloco a nota do aluno no boletim escolar.'
      },
      {
        title: 'Frequência de 75% da LDB',
        description: 'Cálculo de presença obrigatória e alerta de infrequência',
        prompt: 'Como o sistema calcula os 75% de presença obrigatória da LDB?'
      },
      {
        title: 'Triagem na Fila da Creche',
        description: 'Critérios de pontuação social e TAC do Ministério Público',
        prompt: 'Como funciona a fila de espera para triagem e matrícula na creche?'
      }
    ]
  },
  {
    category: 'Frotas & Combustível',
    icon: Fuel,
    color: 'amber',
    items: [
      {
        title: 'Trava Física do Tanque',
        description: 'Bloqueio automático de litragem acima da capacidade do veículo',
        prompt: 'O sistema travou e não deixou eu lançar 70 litros na ambulância.'
      },
      {
        title: 'Regime Top-Off (Socorro Contínuo)',
        description: 'Autorização emergencial para viaturas e ambulâncias',
        prompt: 'Como funciona a autorização de tanque cheio para veículos de socorro contínuo?'
      },
      {
        title: 'Prestação de Contas de Abastecimento',
        description: 'Fotos do hodômetro e canhoto assinado pelo condutor',
        prompt: 'Quais comprovantes e fotos preciso anexar para liquidar o abastecimento?'
      }
    ]
  },
  {
    category: 'Transparência PNTP & Fiscal',
    icon: ShieldCheck,
    color: 'purple',
    items: [
      {
        title: 'Critérios do Radar PNTP (Atricon)',
        description: 'Matriz de conformidade da Lei de Responsabilidade Fiscal',
        prompt: 'Quais são os itens obrigatórios que precisamos cumprir no Radar Nacional PNTP?'
      },
      {
        title: 'Validação de Notas Fiscais (Reforma)',
        description: 'Conferência de IBS e CBS em notas fiscais',
        prompt: 'Quais os erros mais comuns na validação de IBS e CBS em notas fiscais?'
      }
    ]
  },
  {
    category: 'Atendimento & Suporte Humano',
    icon: Headphones,
    color: 'rose',
    items: [
      {
        title: 'Falar com Suporte Humano ao Vivo',
        description: 'Transferir esta conversa para a equipe técnica no Gestão SaaS',
        prompt: 'Quero falar com um atendente humano do suporte agora por favor.'
      },
      {
        title: 'Como Redefinir Senha de Acesso',
        description: 'Instruções para recuperação de credenciais institucionais',
        prompt: 'Como faço para redefinir minha senha de acesso institucional?'
      }
    ]
  }
];

const USER_SLASH_COMMANDS = [
  { command: '/ajuda', label: '⚡ O que a Sexta-Feira pode fazer?', action: 'OPEN_HELP' },
  { command: '/humano', label: '🎧 Chamar Atendente Humano', action: 'REQUEST_HUMAN' },
  { command: '/suporte', label: '🎧 Suporte Técnico no Gestão SaaS', action: 'REQUEST_HUMAN' },
  { command: '/tela', label: '🧭 Explicar Tela e Módulo Atual', prompt: 'Sexta-Feira, explique as funções e objetivos desta tela em que estou trabalhando agora.' },
  { command: '/pntp', label: '🏛️ Consultar Critérios do Radar PNTP', prompt: 'Quais os requisitos obrigatórios do Radar Nacional PNTP para nosso município?' },
  { command: '/limpar', label: '🧹 Limpar Histórico de Mensagens', action: 'CLEAR_CHAT' }
];

export const ChatAssistantModal: React.FC<ChatAssistantProps> = ({ 
  isOpen: propIsOpen,
  onClose: propOnClose,
  activeView, 
  activeTab,
  institutionName,
  userData,
  currentPath,
  onExecuteAction,
  onNavigate,
  onSelectTab,
  onOpenModal,
  onOpenReport,
  onToggleTheme
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (propOnClose && !val) {
      propOnClose();
    }
    setInternalIsOpen(val);
  };

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [executedActionId, setExecutedActionId] = useState<string | null>(null);

  // Modal com o Guia de Capacidades da Sexta-Feira
  const [showCapabilitiesModal, setShowCapabilitiesModal] = useState(false);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  // Estados de Transbordo Humano
  const [activeTicket, setActiveTicket] = useState<LiveChatTicket | null>(null);
  const [chatMode, setChatMode] = useState<'bot' | 'waiting_human' | 'human_active'>('bot');
  const [attendantName, setAttendantName] = useState<string | null>(null);

  // Controle de visibilidade do Botão Flutuante (evitar obstruir navegação)
  const [isFabHidden, setIsFabHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gestao360_hide_ai_fab') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleFabHidden = (hidden: boolean) => {
    setIsFabHidden(hidden);
    try {
      localStorage.setItem('gestao360_hide_ai_fab', String(hidden));
    } catch (e) {
      console.error(e);
    }
    if (hidden) {
      showToast('Botão da IA recolhido na borda lateral para liberar a visão da tela.', 'info');
    }
  };

  const currentViewLabel = VIEW_LABEL_MAP[activeView] || 'Módulo Ativo';
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll e foco quando abrir
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  // Mensagem de boas-vindas inicial da Sexta-Feira
  useEffect(() => {
    if (messages.length === 0) {
      const userName = userData?.name ? userData.name.split(' ')[0] : 'Servidor';
      setMessages([
        {
          id: 'welcome-msg',
          role: 'model',
          sender: 'assistant',
          content: `Olá, **${userName}**! Sou a **Sexta-Feira**, sua inteligência artificial operacional integrada à prefeitura de **${institutionName || 'Torixoréu/MT'}**.\n\nComo posso ajudar você hoje no módulo **${currentViewLabel}**? Você pode clicar no botão **"⚡ O que posso fazer?"** abaixo para ver comandos rápidos, digitar **/** para atalhos ou solicitar apoio da equipe de suporte humano a qualquer momento.`,
          timestamp: new Date()
        }
      ]);
    }
  }, [institutionName, currentViewLabel, userData?.name]);

  // Solicitar Atendente Humano
  const handleRequestHuman = async (reason = 'Solicitação do servidor') => {
    setChatMode('waiting_human');
    
    try {
      const ticket = await requestHumanTicket({
        requester_name: userData?.name || 'Servidor Municipal',
        requester_email: userData?.email || 'servidor@gestao360.gov.br',
        requester_role: (userData as any)?.role || 'Servidor Público',
        institution_id: (userData as any)?.institution_id,
        institution_name: institutionName || 'Prefeitura Municipal',
        module: currentViewLabel,
        reason
      });

      setActiveTicket(ticket);

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'system',
          sender: 'system',
          content: `🔔 **Solicitação de Transbordo Humano Aberta** (Protocolo: **${ticket.protocol}**)\nUm operador da equipe de suporte no Gestão SaaS foi notificado e responderá aqui em tempo real. Você pode continuar enviando informações enquanto aguarda.`,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error('Erro ao conectar suporte humano:', err);
    }
  };

  // Escuta Realtime / Broadcast de mensagens com DEDUPLICAÇÃO ESTRITA
  useEffect(() => {
    if (!activeTicket) return;

    const unsubscribe = subscribeToLiveChat(activeTicket.id, {
      onNewMessage: (msg: LiveChatMessage) => {
        // Se a mensagem for do admin
        if (msg.sender_type === 'admin') {
          setMessages((prev) => {
            // 1. Verifica se já existe por ID
            if (prev.some((m) => m.id === msg.id)) return prev;

            // 2. Verifica se já existe por conteúdo recente (evita duplicatas entre broadcast e realtime)
            const duplicateIndex = prev.findIndex(
              (m) =>
                m.sender === 'admin' &&
                (m.content || '').trim() === (msg.content || '').trim() &&
                Math.abs(new Date(m.timestamp).getTime() - new Date(msg.created_at).getTime()) < 15000
            );

            if (duplicateIndex !== -1) {
              const updated = [...prev];
              updated[duplicateIndex] = {
                ...updated[duplicateIndex],
                id: msg.id
              };
              return updated;
            }

            return [
              ...prev,
              {
                id: msg.id,
                role: 'admin',
                sender: 'admin',
                attendantName: msg.sender_name,
                content: msg.content,
                timestamp: new Date(msg.created_at)
              }
            ];
          });
        }
      },
      onTicketUpdated: (payload) => {
        if (payload.chat_mode === 'human_active') {
          setChatMode('human_active');
          setAttendantName(payload.attendant_name || 'Suporte Técnico');
          setMessages((prev) => [
            ...prev,
            {
              id: `claim-${Date.now()}`,
              role: 'system',
              sender: 'system',
              content: `👨‍💼 **${payload.attendant_name || 'Operador de Suporte'}** assumiu este atendimento no Gestão SaaS.`,
              timestamp: new Date()
            }
          ]);
        } else if (payload.chat_mode === 'bot') {
          setChatMode('bot');
          setAttendantName(null);
          setMessages((prev) => [
            ...prev,
            {
              id: `bot-return-${Date.now()}`,
              role: 'system',
              sender: 'system',
              content: '✅ Atendimento com operador concluído. A **Sexta-Feira** continuará à sua disposição.',
              timestamp: new Date()
            }
          ]);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeTicket?.id]);

  // Atalhos contextuais inteligentes por módulo
  const contextualShortcuts: ContextualShortcut[] = useMemo(() => {
    switch (activeView) {
      case 'education':
        return [
          { id: 'edu-saeb', label: '📊 Lançar SAEB', prompt: 'Não acho onde coloco a nota do aluno no boletim escolar.' },
          { id: 'edu-creche', label: '👶 Fila da Creche', prompt: 'Como funciona a fila de espera para triagem e matrícula na creche?' },
          { id: 'edu-prof', label: '👩‍🏫 Cadastro de Docente', prompt: 'Um professor novo pode se cadastrar pela tela de login?' }
        ];
      case 'fleet_fuel':
      case 'controls':
        return [
          { id: 'fleet-trava', label: '🔒 Trava do Tanque', prompt: 'O sistema travou e não deixou eu lançar 70 litros na ambulância.' },
          { id: 'fleet-topoff', label: '🚑 Regime Top-Off', prompt: 'Como funciona a autorização de tanque cheio para veículos de socorro contínuo?' },
          { id: 'fleet-canhoto', label: '📸 Prestação de Contas', prompt: 'Quais comprovantes e fotos preciso anexar para liquidar o abastecimento?' }
        ];
      case 'saude':
      case 'consultorio_medico':
        return [
          { id: 'saude-fefo', label: '💊 Regra FEFO', prompt: 'Como funciona a saída de medicamentos na farmácia pela regra FEFO?' },
          { id: 'saude-sigilo', label: '🔒 Sigilo e LGPD', prompt: 'Quais os cuidados com dados clínicos e prontuários de pacientes no sistema?' },
          { id: 'saude-fila', label: '🏥 Fila de Regulação', prompt: 'Como funciona a prioridade da fila de exames e consultas especializadas?' }
        ];
      case 'notafiscal':
        return [
          { id: 'nf-reforma', label: '🏛️ Reforma Tributária', prompt: 'Quais os erros mais comuns na validação de IBS e CBS em notas fiscais?' },
          { id: 'nf-portal', label: '🔍 Conferência Prévia', prompt: 'Como usar o portal fiscal para validar notas fiscais antes do envio?' }
        ];
      case 'certificates':
        return [
          { id: 'cert-mesclar', label: '📑 Mesclar Certidões', prompt: 'Como compilar as certidões vigentes em um único PDF para empenho?' },
          { id: 'cert-regras', label: '🚦 Semáforo Lei 14.133', prompt: 'Quais são as certidões fiscais obrigatórias e os prazos de validade?' }
        ];
      default:
        return [
          { id: 'gen-pntp', label: '🏛️ Radar PNTP', prompt: 'Quais são os itens obrigatórios que precisamos cumprir no Radar Nacional PNTP?' },
          { id: 'gen-suporte', label: '🎧 Chamar Atendente', prompt: 'Quero falar com um atendente humano do suporte agora por favor.' },
          { id: 'gen-ajuda', label: '⚡ O que você faz?', prompt: 'Sexta-Feira, quais são as principais tarefas que você pode me ajudar no sistema?' }
        ];
    }
  }, [activeView]);

  // Executar Ação Estruturada
  const handleExecuteAction = (action: AssistantActionPayload) => {
    setExecutedActionId(action.type);

    if (action.type === 'REQUEST_HUMAN_ATTENDANT') {
      handleRequestHuman(action.params?.reason || 'Solicitado via ação');
      return;
    }

    if (onExecuteAction) {
      onExecuteAction(action);
    }

    let targetCandidate = action.targetRoute || action.route || '';
    const labelLower = (action.label || '').toLowerCase();
    if (
      labelLower.includes('certid') || 
      labelLower.includes('cnd') || 
      labelLower.includes('certific') ||
      labelLower.includes('banco de cert') ||
      (labelLower.includes('empresa') && (labelLower.includes('fiscal') || labelLower.includes('cert')))
    ) {
      targetCandidate = 'certificates';
    }

    const resolvedRoute = normalizeTargetRoute(targetCandidate);

    if (action.type === 'NAVIGATE') {
      if (resolvedRoute && onNavigate) {
        onNavigate(resolvedRoute);
      } else if (!resolvedRoute) {
        showToast('Módulo não disponível ou em atualização no sistema.', 'info');
      }
    } else if (action.type === 'NAVIGATE_TAB') {
      if (resolvedRoute && onNavigate) {
        onNavigate(resolvedRoute);
      } else if (!resolvedRoute) {
        showToast('Módulo não disponível ou em atualização no sistema.', 'info');
      }
      const targetTab = action.params?.tab || action.tab;
      if (targetTab && onSelectTab) onSelectTab(targetTab);
      const targetModal = action.params?.modalId || action.modalId;
      if (targetModal && onOpenModal) onOpenModal(targetModal, action.params?.formData || action.formData);
    } else if (action.type === 'TRIGGER_MODAL' || action.type === 'OPEN_MODAL') {
      if (resolvedRoute && onNavigate) onNavigate(resolvedRoute);
      const targetModal = action.params?.modalId || action.modalId;
      if (targetModal && onOpenModal) onOpenModal(targetModal, action.params?.formData || action.formData);
    } else if (action.type === 'SELECT_TAB') {
      const targetTab = action.params?.tab || action.tab;
      if (targetTab && onSelectTab) onSelectTab(targetTab);
    } else if (action.type === 'REPORT') {
      const repId = action.params?.reportId || action.reportId;
      if (repId && onOpenReport) onOpenReport(repId);
    } else if (action.type === 'THEME') {
      if (onToggleTheme) onToggleTheme();
    } else if (action.type === 'SUPPORT_TICKET') {
      if (onNavigate) onNavigate('support');
    }

    assistantActionBus.dispatch(action);
    setTimeout(() => setExecutedActionId(null), 3000);
  };

  // Comandos de barra / do usuário
  const slashQuery = inputMessage.startsWith('/') ? inputMessage.slice(1).toLowerCase() : '';
  const filteredUserSlash = useMemo(() => {
    if (!inputMessage.startsWith('/')) return USER_SLASH_COMMANDS;
    return USER_SLASH_COMMANDS.filter((cmd) =>
      cmd.command.toLowerCase().includes(slashQuery) ||
      cmd.label.toLowerCase().includes(slashQuery)
    );
  }, [inputMessage, slashQuery]);

  const handleApplyUserSlash = (cmd: typeof USER_SLASH_COMMANDS[0]) => {
    setIsSlashMenuOpen(false);
    setInputMessage('');

    if (cmd.action === 'OPEN_HELP') {
      setShowCapabilitiesModal(true);
      return;
    }
    if (cmd.action === 'REQUEST_HUMAN') {
      handleRequestHuman();
      return;
    }
    if (cmd.action === 'CLEAR_CHAT') {
      clearChatHistory();
      return;
    }
    if (cmd.prompt) {
      handleSendMessage(cmd.prompt);
    }
  };

  // Envio de Mensagem (Modo Atendente Humano ou Modo Sexta-Feira)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userText = text;
    setInputMessage('');
    setIsSlashMenuOpen(false);

    // SE FOR UM COMANDO DE / CONHECIDO
    if (userText.startsWith('/')) {
      const matched = USER_SLASH_COMMANDS.find(c => c.command === userText.toLowerCase());
      if (matched) {
        handleApplyUserSlash(matched);
        return;
      }
    }

    // Adiciona na interface do usuário com ID único
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', sender: 'user', content: userText, timestamp: new Date() }
    ]);

    // SE ESTIVER EM ATENDIMENTO COM SER HUMANO
    if (chatMode === 'human_active' || chatMode === 'waiting_human') {
      if (activeTicket) {
        try {
          await sendLiveMessage({
            ticket_id: activeTicket.id,
            sender_type: 'user',
            sender_name: userData?.name || 'Servidor Municipal',
            content: userText
          });
        } catch (err) {
          console.error('Erro ao enviar mensagem para chat ao vivo:', err);
        }
      }
      return;
    }

    // SE ESTIVER NO MODO SEXTA-FEIRA IA
    const assistantMsgId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'model', sender: 'assistant', content: '', actions: [], isStreaming: true, timestamp: new Date() }
    ]);
    setIsLoading(true);

    try {
      let streamSucceeded = false;

      // 1. Tenta rota Serverless Edge SSE (/api/chat-assistant)
      try {
        const response = await fetch('/api/chat-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            history: messages.map((m) => ({ 
              role: (m.role === 'user' || m.sender === 'user') ? 'user' : 'model', 
              content: m.content || '' 
            })),
            currentPath: currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/'),
            userData: { 
              name: userData?.name, 
              role: userData?.role, 
              municipio: userData?.municipio || institutionName 
            },
          }),
        });

        if (response.ok && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let actions: AssistantActionPayload[] = [];

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.replace('data: ', '').trim();
              if (!jsonStr) continue;

              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.type === 'text') {
                  fullText += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: fullText, isStreaming: true }
                        : m
                    )
                  );
                } else if (parsed.type === 'action') {
                  const act = parsed.action || parsed.actionPayload || parsed.content;
                  if (act && typeof act === 'object') {
                    actions.push(act);
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, actions: [...actions] }
                          : m
                      )
                    );
                  }
                } else if (parsed.type === 'done') {
                  streamSucceeded = true;
                }
              } catch {}
            }
          }

          if (fullText.trim().length > 0) {
            streamSucceeded = true;
            const humanAction = actions.find(a => a?.type === 'REQUEST_HUMAN_ATTENDANT');
            if (humanAction) {
              handleRequestHuman(humanAction.params?.reason || 'Solicitado pela IA');
            }
          }
        }
      } catch (err) {
        console.warn('Fallback para cliente direto após falha no endpoint SSE:', err);
      }

      // 2. Fallback client-side se o SSE não responder
      if (!streamSucceeded) {
        let clientAccumulated = '';
        await streamMessageFromAgent({
          message: userText,
          history: messages.map((m) => ({
            id: m.id,
            role: (m.role === 'user' || m.sender === 'user') ? 'user' : 'model',
            content: m.content || '',
            text: m.content || '',
            timestamp: m.timestamp || new Date()
          })),
          moduleContext: activeView,
          userData: {
            name: userData?.name,
            role: userData?.role,
            municipio: userData?.municipio || institutionName
          },
          currentPath: currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/'),
          onChunk: (accumulated) => {
            clientAccumulated = accumulated;
            const parsed = parseAgentActions(accumulated);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: parsed.cleanText, actions: parsed.actions, isStreaming: true }
                  : m
              )
            );
          }
        });

        const finalParsed = parseAgentActions(clientAccumulated);
        const humanAction = finalParsed.actions.find(a => a?.type === 'REQUEST_HUMAN_ATTENDANT');
        if (humanAction) {
          handleRequestHuman(humanAction.params?.reason || 'Solicitado pela IA');
        }
      }
    } catch (err: any) {
      console.error('Erro na resposta da Sexta-Feira:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: 'Desculpe, ocorreu uma instabilidade momentânea na conexão. Você gostaria de falar diretamente com um atendente humano da nossa equipe de suporte?',
                actions: [
                  {
                    type: 'REQUEST_HUMAN_ATTENDANT',
                    label: '🎧 Falar com Atendente Humano',
                    params: { reason: 'Falha de conexão com IA' }
                  }
                ],
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
      );
    }
  };

  const clearChatHistory = () => {
    setMessages([]);
    setChatMode('bot');
    setActiveTicket(null);
    setAttendantName(null);
  };

  return (
    <>
      {/* ========================================================
          BOTÃO FLUTUANTE (FAB) COM IDENTIDADE SEXTA-FEIRA
         ======================================================== */}
      {!isOpen && isFabHidden && (
        <motion.button
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 30, opacity: 0 }}
          onClick={() => {
            handleToggleFabHidden(false);
            setIsOpen(true);
          }}
          title="Abrir Assistente Sexta-Feira IA (Clique para reabrir)"
          className="fixed bottom-6 right-0 z-40 flex items-center gap-1.5 pl-3 pr-2 py-2 bg-gradient-to-l from-neutral-950 via-neutral-900 to-neutral-800 text-amber-400 border-l-2 border-y border-amber-500/50 rounded-l-2xl shadow-xl hover:pl-4 transition-all duration-300 cursor-pointer group select-none"
        >
          <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-black tracking-wide">IA</span>
        </motion.button>
      )}

      {!isOpen && !isFabHidden && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 select-none"
        >
          {/* Tooltip convidativo com ação de ocultar */}
          <div className="hidden md:flex items-center gap-2 bg-neutral-900/95 dark:bg-neutral-950/95 text-neutral-100 text-xs px-3.5 py-2 rounded-2xl border border-amber-500/30 shadow-2xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold text-amber-400">Sexta-Feira</span>
            <span className="text-neutral-400">• IA Operacional Gestão 360</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFabHidden(true);
              }}
              title="Ocultar botão flutuante para desobstruir a tela"
              className="ml-2 p-1 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative group">
            <button
              onClick={() => setIsOpen(true)}
              className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-800 text-amber-400 border-2 border-amber-500/40 hover:border-amber-400 shadow-2xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
              title="Abrir Sexta-Feira IA"
            >
              <div className="absolute inset-0 rounded-2xl border border-amber-400/20 animate-pulse pointer-events-none" />
              <Sparkles className="w-6 h-6 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-neutral-950" />
              </span>
            </button>

            {/* Mini botão de ocultar visível no hover e no mobile */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFabHidden(true);
              }}
              title="Ocultar botão da IA (liberar espaço)"
              className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-neutral-900 text-neutral-400 hover:text-white rounded-full border border-neutral-700 shadow-lg flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <EyeOff className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          MODAL DE CHAT DA SEXTA-FEIRA (GESTAO 360)
         ======================================================== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 w-full sm:w-[480px] md:w-[530px] h-[660px] max-h-[calc(100vh-40px)] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 font-sans"
          >
            {/* CABEÇALHO DA SEXTA-FEIRA */}
            <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-900 text-white px-5 py-4 border-b border-amber-500/20 flex items-center justify-between select-none shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-800 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                    <Compass className="w-6 h-6 animate-[spin_16s_linear_infinite]" />
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-neutral-950 ${
                    chatMode === 'human_active' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-white tracking-wide">Sexta-Feira</h2>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {chatMode === 'human_active' ? 'Atendente Humano' : 'IA Operacional'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 truncate max-w-[240px]">
                    <span className="text-amber-400/90 font-semibold">{institutionName || 'Prefeitura Municipal'}</span>
                    <span>•</span>
                    <span className="truncate">{currentViewLabel}</span>
                  </p>
                </div>
              </div>

              {/* Ações do Cabeçalho */}
              <div className="flex items-center gap-1.5 text-neutral-400">
                {chatMode === 'bot' && (
                  <button
                    onClick={() => handleRequestHuman()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition mr-1"
                    title="Transferir para suporte humano no SaaS"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Chamar Atendente</span>
                  </button>
                )}

                <button
                  onClick={clearChatHistory}
                  title="Limpar histórico"
                  className="p-2 hover:bg-neutral-800 hover:text-white rounded-xl transition text-neutral-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleToggleFabHidden(true);
                  }}
                  title="Ocultar botão flutuante para desobstruir a tela"
                  className="p-2 hover:bg-neutral-800 hover:text-amber-400 rounded-xl transition text-neutral-400 cursor-pointer"
                >
                  <EyeOff className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  title="Fechar"
                  className="p-2 hover:bg-neutral-800 hover:text-white rounded-xl transition text-neutral-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* STATUS DO ATENDIMENTO HUMANO SE ATIVO */}
            {chatMode !== 'bot' && (
              <div className={`px-4 py-2 border-b flex items-center justify-between text-xs select-none transition shrink-0 ${
                chatMode === 'waiting_human' 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${chatMode === 'waiting_human' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  <span className="font-semibold">
                    {chatMode === 'waiting_human' 
                      ? 'Aguardando operador no Gestão SaaS...' 
                      : `Conectado com ${attendantName || 'Suporte Técnico'}`}
                  </span>
                </div>
                {activeTicket?.protocol && (
                  <span className="font-mono text-[10px] bg-neutral-900/60 px-2 py-0.5 rounded border border-neutral-700">
                    {activeTicket.protocol}
                  </span>
                )}
              </div>
            )}

            {/* FEED DE MENSAGENS */}
            <div 
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-neutral-50 dark:bg-neutral-950/70 custom-scrollbar"
              style={{
                backgroundImage: 'radial-gradient(rgba(245, 158, 11, 0.04) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            >
              {/* Badge de Governança */}
              <div className="flex justify-center my-1 select-none">
                <div className="bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 text-[11px] px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ambiente Protegido • Sexta-Feira Operacional Gestão 360</span>
                </div>
              </div>

              {/* Mensagens com FormattedText (Sem asteriscos literais **) */}
              {messages.map((msg) => {
                const isUser = msg.role === 'user' || msg.sender === 'user';
                const isSystem = msg.role === 'system' || msg.sender === 'system';
                const isAdmin = msg.role === 'admin' || msg.sender === 'admin';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="max-w-[90%] bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-2xl p-3 text-xs leading-relaxed shadow-sm">
                        <FormattedText content={msg.content} />
                        <span className="block text-right text-[10px] opacity-75 mt-1 font-mono">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm transition ${
                        isUser
                          ? 'bg-neutral-900 dark:bg-neutral-800 text-white rounded-tr-sm border border-neutral-700/60'
                          : isAdmin
                          ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-tl-sm border-2 border-emerald-500/40 shadow-md'
                          : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-tl-sm border border-neutral-200 dark:border-neutral-800 shadow-sm'
                      }`}
                    >
                      {/* Identificação do Remetente */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                          {isAdmin ? (
                            <>
                              <div className="w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center font-bold text-[9px]">
                                OP
                              </div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                {msg.attendantName || 'Suporte Técnico Gestão 360'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                                Sexta-Feira
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* CONTEÚDO FORMATADO LIMPO */}
                      <FormattedText content={msg.content} />

                      {/* Ações Rápidas de 1 Clique */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Ações Rápidas:
                          </span>
                          {msg.actions
                            .filter((act): act is AssistantActionPayload => Boolean(act && typeof act === 'object'))
                            .map((act: AssistantActionPayload, actIdx: number) => {
                            const isExec = Boolean(act?.type && executedActionId?.includes(act.type));
                            return (
                              <button
                                key={actIdx}
                                onClick={() => handleExecuteAction(act)}
                                disabled={isExec}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                                  isExec
                                    ? 'bg-emerald-500 text-neutral-950 shadow'
                                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700'
                                }`}
                              >
                                <span className="truncate">{act?.label || 'Executar Ação'}</span>
                                {isExec ? (
                                  <CheckCircle2 className="w-4 h-4 shrink-0 text-neutral-950" />
                                ) : (
                                  <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Horário */}
                      <div className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] ${
                        isUser ? 'text-neutral-400' : 'text-neutral-400'
                      }`}>
                        <span>{formatTime(msg.timestamp)}</span>
                        {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-400" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* BOTÃO E ATALHOS: "O QUE A SEXTA-FEIRA PODE FAZER?" + CHIPS */}
            <div className="px-4 py-2 bg-neutral-100/90 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 overflow-x-auto select-none shrink-0 custom-scrollbar">
              {/* Botão de Capacidades Oficiais */}
              <button
                onClick={() => setShowCapabilitiesModal(true)}
                className="px-3 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>O que posso fazer?</span>
              </button>

              {/* Chips Contextuais do Módulo */}
              {contextualShortcuts.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleSendMessage(sc.prompt)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-white dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition shadow-2xs disabled:opacity-50"
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {/* MENU FLUTUANTE DE COMANDOS / NO INPUT DO USUÁRIO */}
            {isSlashMenuOpen && (
              <div className="px-3 py-2 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 space-y-1 max-h-48 overflow-y-auto custom-scrollbar shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 px-2 block mb-1">
                  Comandos da Sexta-Feira:
                </span>
                {filteredUserSlash.map((cmd) => (
                  <button
                    key={cmd.command}
                    onClick={() => handleApplyUserSlash(cmd)}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-amber-500/10 hover:text-amber-500 dark:hover:text-amber-400 flex items-center justify-between transition"
                  >
                    <span className="font-mono font-bold text-amber-500">{cmd.command}</span>
                    <span className="text-neutral-600 dark:text-neutral-400 text-[11px] truncate">{cmd.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* BARRA DE DIGITAÇÃO FOOTER */}
            <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0">
              <div className="flex-1 relative flex items-center">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputMessage(val);
                    if (val.startsWith('/')) {
                      setIsSlashMenuOpen(true);
                    } else {
                      setIsSlashMenuOpen(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={
                    chatMode === 'waiting_human'
                      ? 'Aguardando atendente... Digite para adiantar seu chamado'
                      : chatMode === 'human_active'
                      ? `Conversando com ${attendantName || 'Suporte Técnico'}...`
                      : 'Pergunte à Sexta-Feira ou digite / para comandos...'
                  }
                  className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none max-h-24"
                />
              </div>

              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="w-10 h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 disabled:opacity-40 disabled:hover:from-amber-500 flex items-center justify-center transition shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
                title="Enviar mensagem"
              >
                <Send className="w-4 h-4 text-neutral-950" />
              </button>
            </div>

            {/* ========================================================
                MODAL INTERNO: "O QUE A SEXTA-FEIRA PODE FAZER?"
               ======================================================== */}
            {showCapabilitiesModal && (
              <div className="absolute inset-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md flex flex-col p-5 animate-in fade-in duration-200 select-none">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                        O que a Sexta-Feira pode fazer?
                      </h3>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Clique em qualquer ação para enviar diretamente à IA
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCapabilitiesModal(false)}
                    className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
                  {FRIDAY_CAPABILITIES.map((group, gIdx) => {
                    const GroupIcon = group.icon;
                    return (
                      <div key={gIdx} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <GroupIcon className="w-4 h-4 text-amber-500" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                            {group.category}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {group.items.map((item, itemIdx) => (
                            <button
                              key={itemIdx}
                              onClick={() => {
                                setShowCapabilitiesModal(false);
                                handleSendMessage(item.prompt);
                              }}
                              className="w-full text-left p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 hover:bg-amber-500/10 hover:border-amber-500/40 border border-neutral-200/80 dark:border-neutral-800 transition flex items-center justify-between gap-3 group"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-amber-500 transition truncate">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                                  {item.description}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 shrink-0 transition" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end shrink-0">
                  <button
                    onClick={() => setShowCapabilitiesModal(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-bold text-xs"
                  >
                    Fechar Guia
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatAssistantModal;
