import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SupportTicket, SupportTicketMessage, Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';
import { LifeBuoy, Search, MessageSquare, Bug, Lightbulb, Clock, CheckCircle2, XCircle, Send, ShieldAlert, ArrowLeft, ChevronRight, Paperclip, X } from 'lucide-react';

export const SaaSControlCenterSupport = ({ institutions, currentUser }: { institutions: Institution[], currentUser: any }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      showToast('Erro ao buscar chamados globais.', 'error');
    } else {
      setTickets(data as SupportTicket[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    institutions.find(i => i.id === t.institution_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Aberto': return <span className="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 rounded-md text-xs font-bold uppercase tracking-wider"><Clock size={12}/> Aberto</span>;
      case 'Em Análise': return <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 rounded-md text-xs font-bold uppercase tracking-wider"><Search size={12}/> Em Análise</span>;
      case 'Respondido': return <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 rounded-md text-xs font-bold uppercase tracking-wider"><MessageSquare size={12}/> Respondido</span>;
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
        institution={institutions.find(i => i.id === selectedTicket.institution_id)} 
        currentUser={currentUser} 
        onBack={() => { setSelectedTicket(null); fetchTickets(); }} 
      />
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar chamado global..." 
            className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Chamado</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Prefeitura Origem</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
               <tr><td colSpan={4} className="p-6 text-center text-sm font-medium text-neutral-500">Carregando chamados...</td></tr>
            ) : filteredTickets.length === 0 ? (
               <tr><td colSpan={4} className="p-6 text-center text-sm font-medium text-neutral-500">Nenhum chamado encontrado.</td></tr>
            ) : (
               filteredTickets.map(ticket => {
                 const inst = institutions.find(i => i.id === ticket.institution_id);
                 return (
                  <tr key={ticket.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          {getTypeIcon(ticket.type)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{ticket.title}</p>
                          <p className="text-xs font-bold text-neutral-400 mt-0.5">Protocolo: {ticket.id.split('-')[0].toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {inst ? inst.name.replace('Prefeitura Municipal de ', 'Prefeitura de ') : 'Desconhecido'}
                      </p>
                      <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Por {ticket.user_name || 'Usuário'}
                      </p>
                    </td>
                    <td className="p-6">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="p-6 text-right">
                      <button className="text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-900/10 dark:hover:bg-purple-900/20 px-3 py-1.5 rounded-full font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1">
                        Responder <ChevronRight size={12}/>
                      </button>
                    </td>
                  </tr>
                 )
               })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TicketChatView = ({ ticket, institution, currentUser, onBack }: { ticket: SupportTicket, institution?: Institution, currentUser: any, onBack: () => void }) => {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(ticket.status);
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
      user_name: currentUser.name || 'SaaS Admin',
      message: newMessage || 'Imagem anexada',
      attachment_url,
      is_admin: true
    });

    if (error) {
      showToast('Erro ao enviar mensagem.', 'error');
    } else {
      setNewMessage('');
      setAttachment(null);
      fetchMessages();
      
      // Auto update status to "Respondido" if it was Open or Analysis
      if (ticketStatus !== 'Respondido' && ticketStatus !== 'Fechado') {
        handleStatusChange('Respondido');
      }
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

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', ticket.id);
    if (!error) {
      setTicketStatus(newStatus as any);
      showToast('Status do chamado atualizado.', 'success');
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
              <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest">{ticket.type}</span>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <span className="text-[10px] font-bold text-neutral-400">{institution?.name || 'Prefeitura Desconhecida'}</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{ticket.title}</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Alterar Status:</span>
          <select 
            value={ticketStatus} 
            onChange={e => handleStatusChange(e.target.value)}
            className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="Aberto">Aberto</option>
            <option value="Em Análise">Em Análise</option>
            <option value="Respondido">Respondido</option>
            <option value="Fechado">Fechado</option>
          </select>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/30 dark:bg-neutral-900/50 custom-scrollbar">
        {/* Original Ticket Description */}
        <div className="flex gap-4 max-w-3xl">
          <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center shrink-0 font-bold text-sm text-neutral-600 dark:text-neutral-400">
            {ticket.user_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{ticket.user_name || 'Usuário'}</span>
              <span className="text-xs text-neutral-400 font-medium">{new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>
        </div>

        {/* Messages */}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.is_admin ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${msg.is_admin ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
              {msg.is_admin ? <ShieldAlert size={16} /> : msg.user_name?.charAt(0) || 'U'}
            </div>
            <div className={`flex flex-col ${msg.is_admin ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{msg.is_admin ? 'Suporte GESTÃO 360' : msg.user_name}</span>
                <span className="text-xs text-neutral-400 font-medium">{new Date(msg.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <div className={`p-4 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${msg.is_admin ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-tl-none'}`}>
                {msg.attachment_url && (
                  <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block mb-3">
                    <img src={msg.attachment_url} alt="Anexo" className="max-w-xs md:max-w-md rounded-xl shadow-md border border-black/10 dark:border-white/10" />
                  </a>
                )}
                {msg.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        
        {attachment && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl w-fit">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
               <img src={URL.createObjectURL(attachment)} alt="Preview" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-700 dark:text-purple-400">Imagem Anexada</p>
              <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70">{(attachment.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={() => setAttachment(null)} className="p-1.5 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full text-purple-600 dark:text-purple-400 transition-colors ml-2">
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
            placeholder="Digite sua resposta para o usuário, ou cole (Ctrl+V) um print..."
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
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-6 flex items-center justify-center transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
