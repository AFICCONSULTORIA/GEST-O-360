import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Send,
  FileText,
  Archive,
  Trash2,
  Star,
  Search,
  PenSquare,
  Reply,
  Forward,
  MailOpen,
  Mail,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Menu,
  Building2,
} from 'lucide-react';
import {
  EmailFolder,
  InstitutionalEmailAccount,
  InstitutionalEmailMessage,
  SendEmailPayload,
} from '../types';
import { Institution } from '../../../types';

interface WebmailInboxProps {
  institution?: Institution | null;
  accounts: InstitutionalEmailAccount[];
  directoryAccounts?: InstitutionalEmailAccount[];
  activeAccount: InstitutionalEmailAccount | null;
  onSelectAccount: (id: string) => void;
  hideAccountSwitcher?: boolean;
  activeFolder: EmailFolder;
  onSelectFolder: (folder: EmailFolder) => void;
  messages: InstitutionalEmailMessage[];
  unreadCountByFolder: Record<EmailFolder, number>;
  onSendEmail: (payload: SendEmailPayload) => Promise<unknown>;
  onToggleFlag: (
    id: string,
    patch: Partial<Pick<InstitutionalEmailMessage, 'is_read' | 'is_starred' | 'folder'>>
  ) => Promise<void>;
  onDeleteMessage: (msg: InstitutionalEmailMessage) => Promise<void>;
  accentHex: string;
  fullHeight?: boolean;
}

const FOLDERS: Array<{ id: EmailFolder; label: string; icon: React.ComponentType<any> }> = [
  { id: 'inbox', label: 'Caixa de Entrada', icon: Inbox },
  { id: 'sent', label: 'Enviados', icon: Send },
  { id: 'drafts', label: 'Rascunhos', icon: FileText },
  { id: 'archive', label: 'Arquivo', icon: Archive },
  { id: 'trash', label: 'Lixeira', icon: Trash2 },
];

type MessageFilter = 'all' | 'unread' | 'starred';

function getInitials(nameOrEmail: string): string {
  const clean = (nameOrEmail || 'M').replace(/<.*>/, '').trim();
  const parts = clean.split(/[\s.@]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export const WebmailInbox: React.FC<WebmailInboxProps> = ({
  institution,
  accounts,
  directoryAccounts,
  activeAccount,
  onSelectAccount,
  hideAccountSwitcher = false,
  activeFolder,
  onSelectFolder,
  messages,
  unreadCountByFolder,
  onSendEmail,
  onToggleFlag,
  onDeleteMessage,
  accentHex,
  fullHeight = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<MessageFilter>('all');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [replyThreadId, setReplyThreadId] = useState<string | undefined>(undefined);

  const contactsList = useMemo(
    () => (directoryAccounts && directoryAccounts.length > 0 ? directoryAccounts : accounts),
    [directoryAccounts, accounts]
  );

  const filteredMessages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return messages.filter((m) => {
      if (filterMode === 'unread' && m.is_read) return false;
      if (filterMode === 'starred' && !m.is_starred) return false;
      if (!q) return true;
      return (
        m.subject.toLowerCase().includes(q) ||
        m.from_address.toLowerCase().includes(q) ||
        m.from_name.toLowerCase().includes(q) ||
        m.body_text.toLowerCase().includes(q) ||
        m.to_addresses.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [messages, searchTerm, filterMode]);

  const selectedMessage = useMemo(
    () => filteredMessages.find((m) => m.id === selectedMessageId) || null,
    [filteredMessages, selectedMessageId]
  );

  const openMessage = async (msg: InstitutionalEmailMessage) => {
    setSelectedMessageId(msg.id);
    if (!msg.is_read) {
      await onToggleFlag(msg.id, { is_read: true });
    }
  };

  const openComposeNew = (prefillTo = '') => {
    setComposeTo(prefillTo);
    setComposeCc('');
    setComposeSubject('');
    setComposeBody(
      `\n\n--\n${activeAccount?.display_name || 'Servidor Municipal'}\n${institution?.name || 'Prefeitura Municipal'}\nE-mail Institucional: ${activeAccount?.email_address || ''}`
    );
    setReplyThreadId(undefined);
    setIsComposeOpen(true);
    setMobileDrawerOpen(false);
  };

  const openReply = (msg: InstitutionalEmailMessage, isForward = false) => {
    setComposeTo(isForward ? '' : msg.from_address);
    setComposeCc('');
    setComposeSubject(
      isForward ? `Fwd: ${msg.subject}` : msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`
    );
    setComposeBody(
      `\n\n--- Mensagem original ---\nDe: ${msg.from_name} <${msg.from_address}>\nAssunto: ${msg.subject}\n\n${msg.body_text}`
    );
    setReplyThreadId(msg.thread_id || msg.id);
    setIsComposeOpen(true);
  };

  const handleSubmitSend = async (isDraft = false) => {
    if (!activeAccount) return;
    const toList = composeTo
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes('@'));
    const ccList = composeCc
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes('@'));

    if (!isDraft && toList.length === 0) return;

    setSending(true);
    try {
      await onSendEmail({
        accountId: activeAccount.id,
        to: toList,
        cc: ccList,
        subject: composeSubject.trim() || '(Sem assunto)',
        bodyText: composeBody,
        isDraft,
        threadId: replyThreadId,
      });
      setIsComposeOpen(false);
    } finally {
      setSending(false);
    }
  };

  const renderDeliveryBadge = (status: InstitutionalEmailMessage['delivery_status']) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={10} /> {status === 'delivered' ? 'Entregue' : 'Enviado'}
          </span>
        );
      case 'simulated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Sparkles size={10} /> Rede Interna / MVP
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock size={10} /> Rascunho / Fila
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle size={10} /> Falha
          </span>
        );
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full gap-4">
      <button
        onClick={() => openComposeNew('')}
        disabled={!activeAccount}
        style={{ backgroundColor: accentHex }}
        className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition cursor-pointer disabled:opacity-50"
      >
        <PenSquare size={15} />
        Escrever E-mail
      </button>

      {!hideAccountSwitcher && (
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">
            Caixa Postal Ativa
          </label>
          <select
            value={activeAccount?.id || ''}
            onChange={(e) => {
              onSelectAccount(e.target.value);
              setSelectedMessageId(null);
            }}
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-100 outline-none"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.email_address}
              </option>
            ))}
          </select>
          {activeAccount && (
            <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {activeAccount.display_name}
            </p>
          )}
        </div>
      )}

      <nav className="space-y-1">
        {FOLDERS.map((folder) => {
          const Icon = folder.icon;
          const isActive = activeFolder === folder.id;
          const unread = unreadCountByFolder[folder.id] || 0;
          return (
            <button
              key={folder.id}
              onClick={() => {
                onSelectFolder(folder.id);
                setSelectedMessageId(null);
                setMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={15} />
                {folder.label}
              </span>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Catálogo rápido de Secretarias */}
      {contactsList.filter((c) => c.id !== activeAccount?.id).length > 0 && (
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1">
            <Building2 size={11} /> Secretarias & Setores
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {contactsList
              .filter((c) => c.id !== activeAccount?.id)
              .slice(0, 6)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openComposeNew(c.email_address)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex items-center justify-between gap-2"
                  title={`Escrever para ${c.email_address}`}
                >
                  <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                    {c.department_name || c.display_name}
                  </span>
                  <PenSquare size={11} className="text-neutral-400 shrink-0" />
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400">
        <div className="flex justify-between mb-1">
          <span>Armazenamento</span>
          <span className="font-bold text-neutral-700 dark:text-neutral-200">
            {activeAccount
              ? `${activeAccount.used_mb.toFixed(1)} MB / ${(activeAccount.quota_mb / 1024).toFixed(0)} GB`
              : '—'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: activeAccount
                ? `${Math.min(100, Math.max(3, (activeAccount.used_mb / activeAccount.quota_mb) * 100))}%`
                : '0%',
              backgroundColor: accentHex,
            }}
          />
        </div>
      </div>
    </div>
  );

  const activeFolderLabel = FOLDERS.find((f) => f.id === activeFolder)?.label || 'Caixa de Entrada';

  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col lg:flex-row shadow-xs ${
        fullHeight ? 'h-full min-h-[540px]' : 'min-h-[580px] lg:h-[640px]'
      }`}
    >
      {/* Barra Mobile Superior (Pastas + Novo E-mail) */}
      <div className="lg:hidden px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 bg-neutral-50/70 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-100 cursor-pointer"
        >
          <Menu size={15} />
          {activeFolderLabel}
          {(unreadCountByFolder[activeFolder] || 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white">
              {unreadCountByFolder[activeFolder]}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => openComposeNew('')}
          disabled={!activeAccount}
          style={{ backgroundColor: accentHex }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
        >
          <PenSquare size={14} />
          Escrever
        </button>
      </div>

      {/* Drawer Mobile de Pastas */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/50 backdrop-blur-xs flex">
          <div className="w-72 max-w-[85vw] bg-white dark:bg-neutral-900 h-full p-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
                Pastas & Setores
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </div>
          <div className="flex-1" onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 border-r border-neutral-100 dark:border-neutral-800 p-4 flex-col bg-neutral-50/40 dark:bg-neutral-900/60 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Lista de Mensagens (oculta no mobile quando há mensagem aberta) */}
      <section
        className={`${
          selectedMessage ? 'hidden lg:flex' : 'flex'
        } w-full lg:w-80 xl:w-96 shrink-0 border-r border-neutral-100 dark:border-neutral-800 flex-col min-h-0`}
      >
        <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 space-y-2.5">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar assunto, remetente ou texto..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-100 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'Todas' },
                { id: 'unread', label: 'Não lidas' },
                { id: 'starred', label: 'Favoritas' },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterMode(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  filterMode === pill.id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 space-y-3">
              <MailOpen size={30} className="mx-auto opacity-40" />
              <div>
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  Nenhuma mensagem em {activeFolderLabel}
                </p>
                <p className="text-[11px] mt-1">
                  Envie uma mensagem para outra secretaria ou destinatário externo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openComposeNew('')}
                style={{ backgroundColor: accentHex }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer hover:opacity-95"
              >
                <PenSquare size={13} /> Escrever E-mail
              </button>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSelected = selectedMessage?.id === msg.id;
              const senderDisplay =
                activeFolder === 'sent'
                  ? `Para: ${msg.to_addresses.join(', ')}`
                  : msg.from_name || msg.from_address;
              return (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={`w-full text-left p-3.5 transition cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: accentHex }}
                  >
                    {getInitials(senderDisplay)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs truncate flex items-center gap-1.5 ${
                          !msg.is_read
                            ? 'font-black text-neutral-900 dark:text-white'
                            : 'font-semibold text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {!msg.is_read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        <span className="truncate">{senderDisplay}</span>
                      </span>
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        {new Date(msg.sent_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs truncate ${
                          !msg.is_read
                            ? 'font-bold text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {msg.subject}
                      </span>
                      <Star
                        size={12}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFlag(msg.id, { is_starred: !msg.is_starred });
                        }}
                        className={
                          msg.is_starred
                            ? 'text-amber-400 fill-amber-400 shrink-0'
                            : 'text-neutral-300 dark:text-neutral-600 shrink-0'
                        }
                      />
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                      {msg.body_text}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Painel de Leitura */}
      <section
        className={`${
          selectedMessage ? 'flex' : 'hidden lg:flex'
        } flex-1 flex-col min-w-0 min-h-0 p-4 sm:p-6`}
      >
        {selectedMessage ? (
          <>
            {/* Botão Voltar no Mobile */}
            <div className="lg:hidden pb-3 mb-3 border-b border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setSelectedMessageId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
              >
                <ArrowLeft size={14} /> Voltar para {activeFolderLabel}
              </button>
            </div>

            <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  {renderDeliveryBadge(selectedMessage.delivery_status)}
                  <span className="text-[10px] text-neutral-400">
                    {new Date(selectedMessage.sent_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white leading-snug">
                  {selectedMessage.subject}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                  De:{' '}
                  <strong className="text-neutral-800 dark:text-neutral-200">
                    {selectedMessage.from_name}
                  </strong>{' '}
                  &lt;{selectedMessage.from_address}&gt;
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Para: {selectedMessage.to_addresses.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  title={selectedMessage.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                  onClick={() =>
                    onToggleFlag(selectedMessage.id, { is_read: !selectedMessage.is_read })
                  }
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                >
                  {selectedMessage.is_read ? <Mail size={15} /> : <MailOpen size={15} />}
                </button>
                <button
                  title="Arquivar"
                  onClick={() => {
                    onToggleFlag(selectedMessage.id, { folder: 'archive' });
                    setSelectedMessageId(null);
                  }}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                >
                  <Archive size={15} />
                </button>
                <button
                  title="Excluir"
                  onClick={() => {
                    onDeleteMessage(selectedMessage);
                    setSelectedMessageId(null);
                  }}
                  className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="py-5 flex-1 overflow-y-auto whitespace-pre-wrap text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
              {selectedMessage.body_text}
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => openReply(selectedMessage, false)}
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer"
              >
                <Reply size={14} /> Responder
              </button>
              <button
                onClick={() => openReply(selectedMessage, true)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <Forward size={14} /> Encaminhar
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-400 p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Mail size={28} className="opacity-40" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">
                Selecione uma mensagem para ler
              </p>
              <p className="text-xs max-w-sm mt-1">
                Todas as mensagens enviadas entre secretarias e caixas da prefeitura ficam registradas com trilha institucional.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openComposeNew('')}
              style={{ backgroundColor: accentHex }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs hover:opacity-95 cursor-pointer"
            >
              <PenSquare size={14} /> Nova Mensagem Oficial
            </button>
          </div>
        )}
      </section>

      {/* Modal Escrever E-mail */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                  Nova Mensagem Oficial
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Remetente: {activeAccount?.email_address}
                </p>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                  Para (separe múltiplos por vírgula)
                </label>
                <input
                  type="text"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="ex: ouvidoria@municipio.gov.br"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none"
                />
                {contactsList.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {contactsList
                      .filter((a) => a.id !== activeAccount?.id)
                      .slice(0, 6)
                      .map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() =>
                            setComposeTo((prev) =>
                              prev ? `${prev}, ${acc.email_address}` : acc.email_address
                            )
                          }
                          className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-500/10 hover:text-emerald-600 transition cursor-pointer"
                        >
                          + {acc.email_address}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                    Cc (Opcional)
                  </label>
                  <input
                    type="text"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    placeholder="copia@municipio.gov.br"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                    Assunto
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Ofício / Comunicado Institucional"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                  Mensagem
                </label>
                <textarea
                  rows={8}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none resize-y"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => handleSubmitSend(true)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Salvar Rascunho
              </button>
              <button
                type="button"
                disabled={sending || !composeTo.includes('@')}
                onClick={() => handleSubmitSend(false)}
                style={{ backgroundColor: accentHex }}
                className="px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-95 transition cursor-pointer disabled:opacity-50"
              >
                <Send size={13} />
                {sending ? 'Enviando...' : 'Enviar E-mail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
