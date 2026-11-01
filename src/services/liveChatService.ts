import { supabase } from '../lib/supabase';

export interface LiveChatMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'bot' | 'admin' | 'system';
  sender_name: string;
  content: string;
  created_at: string;
}

export interface LiveChatTicket {
  id: string;
  protocol?: string;
  requester_name: string;
  requester_email?: string;
  requester_role?: string;
  requester_phone?: string;
  institution_id?: string;
  institution_name?: string;
  institution_subdomain?: string;
  subject?: string;
  description?: string;
  category?: string;
  module?: string;
  priority?: string;
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
  chat_mode: 'bot' | 'waiting_human' | 'human_active' | 'closed';
  attendant_id?: string;
  attendant_name?: string;
  created_at?: string;
  updated_at?: string;
}

export const CLIENT_SESSION_ID =
  typeof window !== 'undefined'
    ? ((window as any).__gestao360_client_id =
        (window as any).__gestao360_client_id || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
    : 'server';

const BROADCAST_CHANNEL_NAME = 'gestao360_live_chat_sync';
const LOCAL_STORAGE_TICKETS_KEY = 'gestao360_live_tickets_cache';
const LOCAL_STORAGE_MESSAGES_KEY = 'gestao360_live_messages_cache';

// Fallback em memória para quando localStorage não estiver disponível (SSR, Node, Testes, Janela Anônima)
let inMemoryTickets: LiveChatTicket[] = [];
let inMemoryMessages: LiveChatMessage[] = [];

// Inicialização segura de BroadcastChannel para comunicação instantânea entre abas
const getBroadcastChannel = (): BroadcastChannel | null => {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return null;
};

// Funções utilitárias de cache local para resiliência offline/demo
const getLocalTickets = (): LiveChatTicket[] => {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [...inMemoryTickets];
};

const saveLocalTickets = (tickets: LiveChatTicket[]) => {
  inMemoryTickets = [...tickets];
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(tickets));
    }
  } catch {}
};

const getLocalMessages = (ticketId?: string): LiveChatMessage[] => {
  let msgs: LiveChatMessage[] = [];
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
      if (raw) msgs = JSON.parse(raw);
    }
  } catch {}
  if (msgs.length === 0) {
    msgs = inMemoryMessages;
  }
  if (ticketId) {
    return msgs.filter((m) => m.ticket_id === ticketId);
  }
  return msgs;
};

const appendLocalMessage = (msg: LiveChatMessage) => {
  if (!inMemoryMessages.some((m) => m.id === msg.id)) {
    inMemoryMessages.push(msg);
  }
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const msgs = getLocalMessages();
      if (!msgs.some((m) => m.id === msg.id)) {
        msgs.push(msg);
        localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(msgs));
      }
    }
  } catch {}
};

/**
 * Cria ou recupera chamado de transbordo humano
 */
export async function requestHumanTicket(params: {
  requester_name: string;
  requester_email?: string;
  requester_role?: string;
  requester_phone?: string;
  institution_id?: string;
  institution_name?: string;
  module?: string;
  reason?: string;
}): Promise<LiveChatTicket> {
  const protocol = `SUP-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();
  const ticketData: LiveChatTicket = {
    id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    protocol,
    requester_name: params.requester_name || 'Servidor Municipal',
    requester_email: params.requester_email || 'servidor@gestao360.gov.br',
    requester_role: params.requester_role || 'Servidor Municipal',
    requester_phone: params.requester_phone,
    institution_id: params.institution_id,
    institution_name: params.institution_name || 'Prefeitura Municipal',
    subject: 'Atendimento ao Vivo via Copilot 360',
    description: params.reason || 'Dúvida operacional transferida para o suporte humano.',
    category: 'suporte_geral',
    module: params.module || 'Geral',
    priority: 'alta',
    status: 'aberto',
    chat_mode: 'waiting_human',
    created_at: now,
    updated_at: now,
  };

  // Salva no cache local
  const localList = getLocalTickets();
  localList.unshift(ticketData);
  saveLocalTickets(localList);

  // Tenta persistir no Supabase
  try {
    const { data, error } = await supabase
      .from('saas_support_tickets')
      .insert([
        {
          protocol: ticketData.protocol,
          requester_name: ticketData.requester_name,
          requester_email: ticketData.requester_email,
          institution_name: ticketData.institution_name,
          subject: ticketData.subject,
          description: ticketData.description,
          category: ticketData.category,
          module: ticketData.module,
          priority: ticketData.priority,
          status: ticketData.status,
          chat_mode: ticketData.chat_mode,
        },
      ])
      .select()
      .single();

    if (data && !error) {
      ticketData.id = data.id;
      // Atualiza id no cache local
      saveLocalTickets(localList.map((t) => (t.protocol === protocol ? (data as LiveChatTicket) : t)));
    }
  } catch (err) {
    console.warn('[LiveChatService] Fallback local ativado para abertura de ticket:', err);
  }

  // Notifica via canal broadcast (outras abas abertas no navegador)
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({
      type: 'TICKET_CREATED',
      ticket: ticketData,
    });
  }

  return ticketData;
}

/**
 * Busca fila de chamados de transbordo (para o SaaS)
 */
export async function fetchLiveTickets(): Promise<LiveChatTicket[]> {
  try {
    const { data, error } = await supabase
      .from('saas_support_tickets')
      .select('*')
      .in('chat_mode', ['waiting_human', 'human_active'])
      .order('updated_at', { ascending: false });

    if (data && !error) {
      const merged = [...(data as LiveChatTicket[])];
      // Inclui eventuais do cache local que ainda não foram sincronizados
      const local = getLocalTickets();
      local.forEach((loc) => {
        if (!merged.some((m) => m.id === loc.id || m.protocol === loc.protocol)) {
          merged.push(loc);
        }
      });
      return merged;
    }
  } catch (err) {
    console.warn('[LiveChatService] Usando lista local de tickets:', err);
  }

  return getLocalTickets().filter((t) => t.chat_mode === 'waiting_human' || t.chat_mode === 'human_active');
}

/**
 * Atendente assume o chamado
 */
export async function claimLiveTicket(ticketId: string, attendantName: string): Promise<LiveChatTicket | null> {
  const now = new Date().toISOString();

  // Atualiza no cache local
  const localList = getLocalTickets();
  const ticket = localList.find((t) => t.id === ticketId);
  if (ticket) {
    ticket.chat_mode = 'human_active';
    ticket.attendant_name = attendantName;
    ticket.status = 'em_andamento';
    ticket.updated_at = now;
    saveLocalTickets(localList);
  }

  try {
    await supabase
      .from('saas_support_tickets')
      .update({
        chat_mode: 'human_active',
        attendant_name: attendantName,
        status: 'em_andamento',
        updated_at: now,
      })
      .eq('id', ticketId);
  } catch (err) {
    console.warn('[LiveChatService] Erro ao sincronizar claim no Supabase:', err);
  }

  // Notifica broadcast
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({
      type: 'TICKET_UPDATED',
      ticketId,
      chat_mode: 'human_active',
      attendant_name: attendantName,
    });
  }

  return ticket || null;
}

/**
 * Finaliza o atendimento ao vivo e devolve para o bot
 */
export async function resolveLiveTicket(ticketId: string): Promise<void> {
  const now = new Date().toISOString();

  const localList = getLocalTickets();
  const ticket = localList.find((t) => t.id === ticketId);
  if (ticket) {
    ticket.chat_mode = 'bot';
    ticket.status = 'resolvido';
    ticket.updated_at = now;
    saveLocalTickets(localList);
  }

  try {
    await supabase
      .from('saas_support_tickets')
      .update({
        chat_mode: 'bot',
        status: 'resolvido',
        updated_at: now,
      })
      .eq('id', ticketId);
  } catch (err) {
    console.warn('[LiveChatService] Erro ao finalizar no Supabase:', err);
  }

  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({
      type: 'TICKET_UPDATED',
      ticketId,
      chat_mode: 'bot',
      status: 'resolvido',
    });
  }
}

/**
 * Exclui definitivamente um chamado e seu histórico de mensagens (Super Admin)
 */
export async function deleteLiveTicket(ticketId: string): Promise<boolean> {
  // 1. Remove do cache local de chamados
  const localList = getLocalTickets().filter((t) => t.id !== ticketId && t.protocol !== ticketId);
  saveLocalTickets(localList);

  // 2. Remove do cache local de mensagens
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
      if (raw) {
        const msgs = JSON.parse(raw);
        const filtered = msgs.filter((m: LiveChatMessage) => m.ticket_id !== ticketId);
        localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(filtered));
      }
    }
  } catch {}

  // 3. Exclui do banco de dados Supabase
  try {
    await supabase.from('saas_live_messages').delete().eq('ticket_id', ticketId);
    await supabase.from('saas_support_tickets').delete().eq('id', ticketId);
  } catch (err) {
    console.warn('[LiveChatService] Erro ao excluir chamado no Supabase:', err);
  }

  // 4. Dispara broadcast para todas as abas
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({
      type: 'TICKET_DELETED',
      ticketId,
      senderSessionId: CLIENT_SESSION_ID
    });
  }

  return true;
}

/**
 * Busca histórico de mensagens de um ticket
 */
export async function fetchLiveMessages(ticketId: string): Promise<LiveChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('saas_live_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (data && !error) {
      const merged = [...(data as LiveChatMessage[])];
      const local = getLocalMessages(ticketId);
      local.forEach((loc) => {
        if (!merged.some((m) => m.id === loc.id)) {
          merged.push(loc);
        }
      });
      return merged;
    }
  } catch (err) {
    console.warn('[LiveChatService] Usando mensagens locais para o ticket:', err);
  }

  return getLocalMessages(ticketId);
}

/**
 * Envia uma mensagem no chat ao vivo (seja do servidor ou do atendente)
 */
export async function sendLiveMessage(params: {
  ticket_id: string;
  sender_type: 'user' | 'bot' | 'admin' | 'system';
  sender_name: string;
  content: string;
}): Promise<LiveChatMessage> {
  const msg: LiveChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ticket_id: params.ticket_id,
    sender_type: params.sender_type,
    sender_name: params.sender_name,
    content: params.content,
    created_at: new Date().toISOString(),
  };

  // Salva no cache local imediatamente
  appendLocalMessage(msg);

  // Envia no Supabase
  try {
    const { data, error } = await supabase
      .from('saas_live_messages')
      .insert([
        {
          ticket_id: msg.ticket_id,
          sender_type: msg.sender_type,
          sender_name: msg.sender_name,
          content: msg.content,
        },
      ])
      .select()
      .single();

    if (data && !error) {
      msg.id = data.id;
    }
  } catch (err) {
    console.warn('[LiveChatService] Mensagem salva em fallback local:', err);
  }

  // Dispara no BroadcastChannel para recebimento instantâneo em qualquer outra aba
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({
      type: 'MESSAGE_SENT',
      message: msg,
      senderSessionId: CLIENT_SESSION_ID,
    });
  }

  return msg;
}

/**
 * Ouvinte unificado de eventos de chat ao vivo
 */
export function subscribeToLiveChat(
  ticketId: string | null,
  callbacks: {
    onNewMessage?: (msg: LiveChatMessage) => void;
    onTicketUpdated?: (payload: Partial<LiveChatTicket>) => void;
    onTicketDeleted?: (ticketId: string) => void;
  }
) {
  const cleanups: (() => void)[] = [];

  // 1. Escuta via BroadcastChannel (latência zero entre abas abertas)
  const channel = getBroadcastChannel();
  if (channel) {
    const handleBroadcast = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      // Ignora mensagens originadas nesta mesma aba para evitar duplicação do estado otimista
      if (data.senderSessionId === CLIENT_SESSION_ID) {
        return;
      }

      if (data.type === 'MESSAGE_SENT' && callbacks.onNewMessage) {
        if (!ticketId || data.message.ticket_id === ticketId) {
          callbacks.onNewMessage(data.message);
        }
      } else if (data.type === 'TICKET_UPDATED' && callbacks.onTicketUpdated) {
        if (!ticketId || data.ticketId === ticketId) {
          callbacks.onTicketUpdated(data);
        }
      } else if (data.type === 'TICKET_DELETED') {
        if (callbacks.onTicketDeleted) {
          callbacks.onTicketDeleted(data.ticketId);
        } else if (callbacks.onTicketUpdated) {
          callbacks.onTicketUpdated({ id: data.ticketId, status: 'fechado' } as any);
        }
      }
    };

    channel.addEventListener('message', handleBroadcast);
    cleanups.push(() => {
      channel.removeEventListener('message', handleBroadcast);
      channel.close();
    });
  }

  // 2. Escuta via Supabase Realtime
  if (ticketId) {
    try {
      const msgSub = supabase
        .channel(`live-chat-${ticketId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'saas_live_messages', filter: `ticket_id=eq.${ticketId}` },
          (payload) => {
            if (callbacks.onNewMessage && payload.new) {
              callbacks.onNewMessage(payload.new as LiveChatMessage);
            }
          }
        )
        .subscribe();

      const ticketSub = supabase
        .channel(`live-ticket-${ticketId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'saas_support_tickets', filter: `id=eq.${ticketId}` },
          (payload) => {
            if (callbacks.onTicketUpdated && payload.new) {
              callbacks.onTicketUpdated(payload.new as Partial<LiveChatTicket>);
            }
          }
        )
        .subscribe();

      cleanups.push(() => {
        supabase.removeChannel(msgSub);
        supabase.removeChannel(ticketSub);
      });
    } catch (err) {
      console.warn('[LiveChatService] Erro ao registrar listeners do Supabase:', err);
    }
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

