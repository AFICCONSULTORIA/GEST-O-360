import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Sparkles, Send, X, Minimize2, Maximize2, Trash2, 
  Copy, Check, ShieldCheck, ChevronRight, MessageSquare, 
  Lightbulb, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChatMessage, 
  sendMessageToAgent, 
  getSuggestionsForModule 
} from '../../services/aiAssistantService';

interface Gestao360CopilotProps {
  activeView: string;
  institutionName?: string;
}

const VIEW_LABEL_MAP: Record<string, { name: string; category: string }> = {
  home: { name: 'Painel Geral', category: 'Visão 360' },
  mayor: { name: 'Gabinete do Prefeito', category: 'Gestão Executiva' },
  controls: { name: 'Controle Interno', category: 'Compliance & Auditoria' },
  accounting_changes: { name: 'Mudanças Contábeis', category: 'Contabilidade' },
  fleet_fuel: { name: 'Gestão de Frotas & Combustível', category: 'Logística' },
  risk: { name: 'Matriz de Riscos', category: 'Controle Interno' },
  pntp: { name: 'Transparência PNTP', category: 'Transparência Pública' },
  contracts: { name: 'Contratos & Aditivos', category: 'Lei 14.133/21' },
  orders: { name: 'Compras & Licitações', category: 'Suprimentos' },
  protocol: { name: 'Protocolo Geral', category: 'Atendimento' },
  saude: { name: 'Saúde Municipal', category: 'Políticas Públicas' },
  consultorio_medico: { name: 'Consultório Médico & PEP', category: 'Atendimento Clínico' },
  education: { name: 'Educação & Fundeb', category: 'Políticas Públicas' },
  ouvidoria: { name: 'Ouvidoria Geral', category: 'Participação Cidadã' },
  admin_financas: { name: 'Finanças & LRF', category: 'Orçamento' },
  financas: { name: 'Finanças & Tesouraria', category: 'Orçamento' },
  patrimonio: { name: 'Patrimônio & Almoxarifado', category: 'Administração' },
  laws: { name: 'Legislação Municipal', category: 'Atos Oficiais' },
  norms: { name: 'Normas & Resoluções', category: 'Atos Oficiais' },
  camara: { name: 'Câmara Municipal', category: 'Poder Legislativo' },
  support: { name: 'Suporte Técnico', category: 'Ajuda' }
};

export const Gestao360Copilot: React.FC<Gestao360CopilotProps> = ({ 
  activeView, 
  institutionName 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const moduleInfo = VIEW_LABEL_MAP[activeView] || { name: 'Gestão 360', category: 'Geral' };

  // Histórico de mensagens
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'agent',
      text: `Olá! Sou o **Agente Gestão 360**, seu copiloto de inteligência artificial em gestão pública municipal.\n\nEstou pronto para orientar procedimentos, fundamentar decisões na legislação (**Lei 14.133/21**, **LRF**, **PNTP**) e analisar dados no módulo de **${moduleInfo.name}**.\n\nComo posso ajudar você agora?`,
      timestamp: new Date()
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  // Sugestões contextuais baseadas na view ativa
  const suggestions = getSuggestionsForModule(
    activeView === 'contracts' ? 'Contracts' :
    activeView === 'orders' ? 'Orders' :
    activeView === 'controls' ? 'Controls' :
    activeView === 'risk' ? 'Risk' :
    activeView === 'pntp' ? 'PNTP' :
    activeView === 'saude' ? 'Saude' :
    activeView === 'consultorio_medico' ? 'ConsultorioMedico' :
    activeView === 'education' ? 'Education' :
    activeView === 'ouvidoria' ? 'Ouvidoria' :
    activeView === 'patrimonio' ? 'Patrimonio' :
    (activeView === 'admin_financas' || activeView === 'financas') ? 'AdminFinancas' : 'Geral'
  );

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const reply = await sendMessageToAgent({
        message: text,
        history: messages,
        moduleContext: `${moduleInfo.name} (${moduleInfo.category})`
      });

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'agent',
        text: `⚠️ **Aviso:** Não foi possível consultar o agente neste momento.\n\n*Detalhes:* ${error?.message || 'Verifique sua conexão ou a configuração da chave da API Gemini.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'agent',
        text: `Conversa reiniciada. Em que posso te orientar no módulo de **${moduleInfo.name}**?`,
        timestamp: new Date()
      }
    ]);
  };

  // Formatação simples de Markdown
  const renderFormattedText = (rawText: string) => {
    // Processamento de linhas e listas
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      // Título ou cabeçalho
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-sm text-neutral-900 dark:text-neutral-100 mt-2 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-base text-neutral-900 dark:text-neutral-100 mt-2.5 mb-1.5">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="font-bold text-lg text-neutral-900 dark:text-neutral-100 mt-3 mb-2">{line.replace('# ', '')}</h2>;
      }

      // Lista com marcadores
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      let content = isBullet ? line.trim().substring(2) : line;

      // Parsing de negrito simples **texto**
      const parts = content.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-neutral-900 dark:text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed my-0.5 text-neutral-700 dark:text-neutral-300">
            {renderedParts}
          </li>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed my-1 text-neutral-700 dark:text-neutral-300">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Botão Flutuante (Trigger) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
          >
            <button
              id="copilot-trigger-btn"
              onClick={() => setIsOpen(true)}
              className="group relative flex items-center gap-2.5 px-4 py-3.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full shadow-2xl hover:shadow-indigo-500/25 dark:hover:shadow-indigo-400/25 hover:scale-105 active:scale-95 transition-all duration-300 border border-neutral-700/50 dark:border-neutral-300"
              title="Abrir Copiloto IA do Gestão 360"
            >
              {/* Indicador de pulso de IA */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>

              <div className="flex items-center gap-1.5 font-bold text-xs tracking-wide">
                <Sparkles size={16} className="text-amber-400 animate-pulse" />
                <span>Agente Gestão 360</span>
              </div>

              {/* Tag de módulo atual */}
              <span className="hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/15 dark:bg-neutral-900/15 text-neutral-200 dark:text-neutral-700">
                {moduleInfo.name}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Janela do Copiloto */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            id="copilot-window"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '64px' : '620px'
            }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[460px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 flex flex-col overflow-hidden transition-all duration-300`}
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-50/90 dark:bg-neutral-800/60 border-b border-neutral-200/70 dark:border-neutral-800 select-none">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-500 p-[1.5px] shadow-sm">
                  <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-[14px] flex items-center justify-center">
                    <Bot size={18} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs tracking-wide text-neutral-900 dark:text-white">
                      Agente Gestão 360
                    </h3>
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 truncate max-w-[210px]">
                    <ShieldCheck size={11} className="text-indigo-500 flex-shrink-0" />
                    <span>Módulo: <strong>{moduleInfo.name}</strong></span>
                  </p>
                </div>
              </div>

              {/* Botões de Ação do Header */}
              <div className="flex items-center gap-1">
                <button
                  id="copilot-clear-btn"
                  onClick={handleClearChat}
                  title="Limpar histórico"
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  id="copilot-minimize-btn"
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? "Expandir" : "Minimizar"}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
                </button>
                <button
                  id="copilot-close-btn"
                  onClick={() => setIsOpen(false)}
                  title="Fechar Copiloto"
                  className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Conteúdo Expansível (Mensagens + Input) */}
            {!isMinimized && (
              <>
                {/* Lista de Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scroll-smooth">
                  {/* Banner de Contexto Municipal */}
                  <div className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-neutral-50 dark:from-indigo-950/30 dark:to-neutral-900 border border-indigo-100/80 dark:border-indigo-900/30 flex items-start gap-2.5">
                    <Lightbulb size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-tight">
                      Pronto para esclarecer prazos, redações de pareceres e normas da <strong>Lei 14.133</strong>, <strong>LRF</strong> e <strong>PNTP</strong> para {institutionName || 'o Município'}.
                    </p>
                  </div>

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'agent' && (
                        <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot size={15} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}

                      <div
                        className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 rounded-br-xs'
                            : 'bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 rounded-bl-xs border border-neutral-200/50 dark:border-neutral-700/50'
                        }`}
                      >
                        {msg.sender === 'agent' ? (
                          <>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              {renderFormattedText(msg.text)}
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-neutral-200/40 dark:border-neutral-700/40 flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500">
                              <span>Agente Gestão 360</span>
                              <button
                                onClick={() => handleCopy(msg.text, msg.id)}
                                className="flex items-center gap-1 opacity-80 hover:opacity-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity"
                                title="Copiar resposta"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check size={11} className="text-emerald-500" />
                                    <span className="text-emerald-500 font-medium">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>Copiar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Indicador de Carregamento */}
                  {isLoading && (
                    <div className="flex gap-2.5 justify-start">
                      <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center flex-shrink-0">
                        <Bot size={15} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
                      </div>
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3 border border-neutral-200/50 dark:border-neutral-700/50 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></div>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 ml-1">Analisando diretrizes...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Sugestões Rápidas */}
                <div className="px-4 py-2 bg-neutral-50/60 dark:bg-neutral-850/60 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                    <Sparkles size={11} className="text-amber-500" />
                    <span>Sugestões para {moduleInfo.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {suggestions.map((suggestion, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSend(suggestion)}
                        disabled={isLoading}
                        className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-xl bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-neutral-200 dark:border-neutral-700 transition-colors disabled:opacity-50 text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input de Mensagem */}
                <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200/80 dark:border-neutral-800">
                  <div className="flex items-end gap-2 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-2xl p-2 border border-neutral-200 dark:border-neutral-700 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <textarea
                      id="copilot-input"
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Pergunte ao Agente sobre ${moduleInfo.name}...`}
                      rows={1}
                      className="w-full bg-transparent resize-none outline-none text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 max-h-24 py-1 px-1 leading-relaxed"
                    />
                    <button
                      id="copilot-send-btn"
                      onClick={() => handleSend()}
                      disabled={isLoading || !inputMessage.trim()}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all flex-shrink-0 shadow-sm"
                      title="Enviar (Enter)"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] text-neutral-400 dark:text-neutral-500">
                    <span>Pressione <strong>Enter</strong> para enviar</span>
                    <span>Fundamentado em Legislação & LRF</span>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
