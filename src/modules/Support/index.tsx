import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { SupportTicket } from '../../types';
import { showToast } from '../../components/ui/Toast';
import { LifeBuoy, Plus, Search, MessageSquare, Bug, Lightbulb, Clock, CheckCircle2, XCircle, ArrowLeft, ShieldAlert, Send, ChevronRight, Paperclip, X } from 'lucide-react';
import { SupportTicketMessage } from '../../types';

export const SupportModule = ({ currentUser, institution }: { currentUser: any, institution: any }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    
    // Filtro por instituição
    if (institution) {
      query = query.eq('institution_id', institution.id);
    }
    
    // Usuários com permissão menor só veem os próprios chamados
    if (currentUser?.role === 'Visualizador' || currentUser?.role === 'Editor') {
       query = query.eq('user_id', currentUser.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      showToast('Erro ao buscar chamados.', 'error');
    } else {
      setTickets(data as SupportTicket[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [institution, currentUser]);

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Aberto': return <span className="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 rounded-md text-xs font-bold uppercase tracking-wider"><Clock size={12}/> Aberto</span>;
      case 'Em Análise': return <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 rounded-md text-xs font-bold uppercase tracking-wider"><Search size={12}/> Em Análise</span>;
      case 'Fechado': return <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-md text-xs font-bold uppercase tracking-wider"><CheckCircle2 size={12}/> Fechado</span>;
      default: return <span className="flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 rounded-md text-xs font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'Bug': return <Bug size={18} className="text-rose-500" />;
      case 'Dúvida': return <MessageSquare size={18} className="text-sky-500" />;
      case 'Sugestão': return <Lightbulb size={18} className="text-amber-500" />;
      default: return <LifeBuoy size={18} className="text-emerald-500" />;
    }
  };

  if (selectedTicket) {
    return (
      <TicketChatView 
        ticket={selectedTicket} 
        currentUser={currentUser} 
        onBack={() => { setSelectedTicket(null); fetchTickets(); }} 
      />
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
            <LifeBuoy size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Central de <span className="text-neutral-400 font-normal">Suporte</span></h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Abra chamados, relate problemas ou envie sugestões para a nossa equipe.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsNewTicketModalOpen(true)}
          className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 shadow-xl shadow-neutral-900/10 dark:shadow-neutral-950/10"
        >
          <Plus size={16} /> Novo Chamado
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar chamado por título ou protocolo..." 
            className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="py-10 text-center text-sm font-medium text-neutral-500">Carregando chamados...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-10 text-center text-sm font-medium text-neutral-500">Nenhum chamado encontrado.</div>
          ) : (
            filteredTickets.map(ticket => (
              <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl gap-4 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    {getTypeIcon(ticket.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{ticket.title}</h4>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs font-bold text-neutral-400">
                      <span>Protocolo: {ticket.id.split('-')[0].toUpperCase()}</span>
                      <span>•</span>
                      <span>Em {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                      {ticket.user_name && (
                        <>
                          <span>•</span>
                          <span>Por {ticket.user_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button className="text-[10px] shrink-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20 px-3 py-1.5 rounded-full font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 self-end md:self-auto">
                  Acompanhar <ChevronRight size={12}/>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {isNewTicketModalOpen && (
          <NewTicketModal 
            currentUser={currentUser}
            institution={institution}
            onClose={() => setIsNewTicketModalOpen(false)}
            onSuccess={() => {
              setIsNewTicketModalOpen(false);
              fetchTickets();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NewTicketModal = ({ currentUser, institution, onClose, onSuccess }: { currentUser: any, institution: any, onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({ title: '', description: '', type: 'Dúvida' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      showToast('Preencha título e descrição do chamado.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const id = crypto.randomUUID();
    const { error } = await supabase.from('support_tickets').insert({
      id,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      status: 'Aberto',
      user_id: currentUser?.id || 'unknown',
      user_name: currentUser?.name || 'Usuário Desconhecido',
      institution_id: institution?.id
    });

    if (error) {
      console.error(error);
      showToast('Erro ao abrir chamado. Verifique a conexão com o banco.', 'error');
    } else {
      showToast('Chamado aberto com sucesso!', 'success');
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[40px] p-10 shadow-2xl space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2"><LifeBuoy size={24} className="text-emerald-500" /> Novo Chamado</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">Nossa equipe responderá o mais rápido possível.</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Tipo de Chamado</label>
            <div className="grid grid-cols-3 gap-3">
              {['Dúvida', 'Bug', 'Sugestão'].map(type => (
                <button
                  key={type}
                  onClick={() => setFormData({ ...formData, type })}
                  className={`py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors ${formData.type === type ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-md' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Título do Chamado</label>
            <input 
              type="text" 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Como cadastro um novo usuário?"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Descrição Detalhada</label>
            <textarea 
              rows={4}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold custom-scrollbar"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva sua dúvida, problema ou sugestão com o máximo de detalhes possível..."
            />
          </div>
        </div>

        <div className="pt-2">
          <button 
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all text-center disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Chamado'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const TicketChatView = ({ ticket, currentUser, onBack }: { ticket: SupportTicket, currentUser: any, onBack: () => void }) => {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    const { data, error } = await supabase.from('support_ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(data as SupportTicketMessage[]);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [ticket.id]);

  const handleSend = async () => {
    if (!newMessage.trim() && !attachment) return;
    setIsSending(true);

    let attachment_url = null;

    if (attachment) {
      const fileExt = attachment.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('support_attachments').upload(fileName, attachment);
      
      if (!uploadError) {
        const { data } = supabase.storage.from('support_attachments').getPublicUrl(fileName);
        attachment_url = data.publicUrl;
      } else {
        showToast('Erro ao fazer upload do anexo.', 'error');
        setIsSending(false);
        return;
      }
    }

    const msgId = crypto.randomUUID();
    const { error } = await supabase.from('support_ticket_messages').insert({
      id: msgId,
      ticket_id: ticket.id,
      user_id: currentUser.id,
      user_name: currentUser.name || 'Usuário',
      message: newMessage || 'Imagem anexada',
      attachment_url,
      is_admin: false
    });

    if (error) {
      showToast('Erro ao enviar mensagem.', 'error');
    } else {
      setNewMessage('');
      setAttachment(null);
      fetchMessages();
    }
    setIsSending(false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setAttachment(file);
          showToast('Imagem colada com sucesso!', 'info');
        }
      }
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm flex flex-col h-[700px] animate-in slide-in-from-right-8 duration-500">
      
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors">
            <ArrowLeft size={18} className="text-neutral-600 dark:text-neutral-300" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">{ticket.type}</span>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <span className="text-[10px] font-bold text-neutral-400">Protocolo {ticket.id.split('-')[0].toUpperCase()}</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{ticket.title}</h2>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/30 dark:bg-neutral-900/50 custom-scrollbar">
        {/* Original Ticket Description */}
        <div className="flex gap-4 max-w-3xl ml-auto flex-row-reverse">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center justify-center shrink-0 font-bold text-sm">
            {ticket.user_name?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Você</span>
              <span className="text-xs text-neutral-400 font-medium">{new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <div className="bg-emerald-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm text-sm whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>
        </div>

        {/* Messages */}
        {messages.map(msg => {
           const isMe = msg.user_id === currentUser.id;
           return (
            <div key={msg.id} className={`flex gap-4 max-w-3xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${isMe ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                {msg.is_admin ? <ShieldAlert size={16} /> : msg.user_name?.charAt(0) || 'U'}
              </div>
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{msg.is_admin ? 'Suporte GESTÃO 360' : (isMe ? 'Você' : msg.user_name)}</span>
                  <span className="text-xs text-neutral-400 font-medium">{new Date(msg.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div className={`p-4 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-tl-none'}`}>
                  {msg.attachment_url && (
                    <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block mb-3">
                      <img src={msg.attachment_url} alt="Anexo" className="max-w-xs md:max-w-md rounded-xl shadow-md border border-black/10 dark:border-white/10" />
                    </a>
                  )}
                  {msg.message}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reply Input */}
      {ticket.status === 'Fechado' ? (
        <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/80 text-center">
          <p className="text-sm font-bold text-neutral-500 flex items-center justify-center gap-2">
            <CheckCircle2 size={16}/> Este chamado foi encerrado pela equipe de suporte.
          </p>
        </div>
      ) : (
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          
          {attachment && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl w-fit">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                 <img src={URL.createObjectURL(attachment)} alt="Preview" className="w-full h-full object-cover rounded-xl" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Imagem Anexada</p>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{(attachment.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => setAttachment(null)} className="p-1.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full text-emerald-600 dark:text-emerald-400 transition-colors ml-2">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,.pdf" 
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setAttachment(e.target.files[0]);
                }
              }} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-2xl transition-colors border border-neutral-200 dark:border-neutral-700"
              title="Anexar arquivo"
            >
              <Paperclip size={20} />
            </button>
            <textarea 
              rows={2}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onPaste={handlePaste}
              placeholder="Digite sua resposta, ou cole (Ctrl+V) um print..."
              className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 text-sm outline-none resize-none custom-scrollbar"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              onClick={handleSend}
              disabled={isSending || (!newMessage.trim() && !attachment)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 flex items-center justify-center transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
