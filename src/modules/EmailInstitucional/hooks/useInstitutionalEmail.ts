import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminUser, Institution } from '../../../types';
import { supabase } from '../../../lib/supabase';
import {
  useInstitutionalSiteConfig,
  resolveSiteAccentHex,
} from '../../../lib/api/institutionalSite';
import { useMunicipalDepartments } from '../../../lib/api/departments';
import {
  deleteEmailAccount,
  deleteEmailMessagePermanently,
  loadInstitutionalEmailState,
  saveEmailDomainConfig,
  sendInstitutionalEmail,
  slugifyLocalPart,
  updateEmailMessageFlags,
  upsertEmailAccount,
} from '../../../lib/api/institutionalEmail';
import {
  EmailFolder,
  InstitutionalEmailAccount,
  InstitutionalEmailDomain,
  InstitutionalEmailMessage,
  SendEmailPayload,
} from '../types';
import { showToast } from '../../../components/ui/Toast';

export function useInstitutionalEmail(
  currentInstitution?: Institution | null,
  currentUser?: AdminUser | null
) {
  const { config: siteConfig } = useInstitutionalSiteConfig(currentInstitution);
  const { departmentNames } = useMunicipalDepartments(currentInstitution?.id);
  const accentHex = resolveSiteAccentHex(siteConfig);

  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
  const [domains, setDomains] = useState<InstitutionalEmailDomain[]>([]);
  const [accounts, setAccounts] = useState<InstitutionalEmailAccount[]>([]);
  const [messages, setMessages] = useState<InstitutionalEmailMessage[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [activeFolder, setActiveFolder] = useState<EmailFolder>('inbox');

  const secretariatNames = useMemo(() => {
    const fromSite = (siteConfig.secretariats || [])
      .map((s) => s.title || s.slug)
      .filter(Boolean);
    const merged = new Set([...fromSite, ...departmentNames]);
    return Array.from(merged);
  }, [siteConfig.secretariats, departmentNames]);

  const reload = useCallback(async () => {
    if (!currentInstitution?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const state = await loadInstitutionalEmailState(currentInstitution, {
        siteDomain: siteConfig.customDomain || currentInstitution.custom_domain,
        secretariatNames,
        contactEmail: siteConfig.contact?.email,
      });
      setDomains(state.domains);
      setAccounts(state.accounts);
      setMessages(state.messages);
      setDataSource(state.source);
      setSelectedAccountId((prev) =>
        prev && state.accounts.some((a) => a.id === prev)
          ? prev
          : state.accounts[0]?.id || ''
      );
    } catch {
      showToast('Erro ao carregar dados do E-mail Institucional.', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    currentInstitution,
    siteConfig.customDomain,
    siteConfig.contact?.email,
    secretariatNames,
  ]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Recebimento automático em tempo real (e-mails internos e externos via webhook inbound)
  useEffect(() => {
    if (!currentInstitution?.id) return;
    const channel = supabase
      .channel(`inst-email-inbox-${currentInstitution.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'institutional_email_messages',
          filter: `institution_id=eq.${currentInstitution.id}`,
        },
        (payload) => {
          const newMsg = payload.new as InstitutionalEmailMessage | undefined;
          if (!newMsg || !newMsg.id) return;
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [newMsg, ...prev]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentInstitution?.id]);

  const primaryDomain = useMemo(
    () => domains.find((d) => d.is_primary) || domains[0] || null,
    [domains]
  );

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null,
    [accounts, selectedAccountId]
  );

  const accountMessages = useMemo(() => {
    if (!activeAccount) return [];
    return messages.filter(
      (m) => m.account_id === activeAccount.id && m.folder === activeFolder
    );
  }, [messages, activeAccount, activeFolder]);

  const unreadCountByFolder = useMemo(() => {
    const counts: Record<EmailFolder, number> = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      archive: 0,
      trash: 0,
    };
    if (!activeAccount) return counts;
    for (const m of messages) {
      if (m.account_id === activeAccount.id && !m.is_read) {
        counts[m.folder] = (counts[m.folder] || 0) + 1;
      }
    }
    return counts;
  }, [messages, activeAccount]);

  const handleSaveDomain = useCallback(
    async (updated: InstitutionalEmailDomain) => {
      const saved = await saveEmailDomainConfig(updated);
      setDomains((prev) =>
        prev.some((d) => d.id === saved.id)
          ? prev.map((d) => (d.id === saved.id ? saved : d))
          : [saved, ...prev]
      );
      showToast('Configurações de domínio e provedor atualizadas.', 'success');
      return saved;
    },
    []
  );

  const handleUpsertAccount = useCallback(
    async (
      input: Omit<InstitutionalEmailAccount, 'id' | 'created_at' | 'updated_at'> & {
        id?: string;
      }
    ) => {
      const saved = await upsertEmailAccount({
        ...input,
        created_by: input.created_by || currentUser?.name || 'Gestor',
      });
      setAccounts((prev) =>
        prev.some((a) => a.id === saved.id)
          ? prev.map((a) => (a.id === saved.id ? saved : a))
          : [...prev, saved]
      );
      showToast(`Conta ${saved.email_address} salva com sucesso.`, 'success');
      return saved;
    },
    [currentUser?.name]
  );

  const handleDeleteAccount = useCallback(
    async (accountId: string) => {
      if (!currentInstitution?.id) return;
      await deleteEmailAccount(currentInstitution.id, accountId);
      setAccounts((prev) => {
        const next = prev.filter((a) => a.id !== accountId);
        if (selectedAccountId === accountId) {
          setSelectedAccountId(next[0]?.id || '');
        }
        return next;
      });
      showToast('Conta de e-mail removida.', 'info');
    },
    [currentInstitution?.id, selectedAccountId]
  );

  const handleSyncWithSiteSecretariats = useCallback(async () => {
    if (!currentInstitution?.id || !primaryDomain) return 0;
    const existing = new Set(accounts.map((a) => a.email_address.toLowerCase()));
    let createdCount = 0;

    for (const secName of secretariatNames) {
      const local = slugifyLocalPart(secName);
      const email = `${local}@${primaryDomain.domain}`.toLowerCase();
      if (!existing.has(email)) {
        existing.add(email);
        const created = await upsertEmailAccount({
          institution_id: currentInstitution.id,
          domain_id: primaryDomain.id,
          email_address: email,
          display_name: secName,
          account_type: 'secretariat',
          department_name: secName,
          quota_mb: 5120,
          used_mb: 0,
          signature_html: `<p><strong>${secName}</strong><br/>${currentInstitution.name}</p>`,
          status: 'active',
          created_by: currentUser?.name || 'Sincronização Site Institucional',
        });
        setAccounts((prev) => [...prev, created]);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      showToast(
        `${createdCount} caixa(s) sincronizada(s) com o Site Institucional.`,
        'success'
      );
    } else {
      showToast('Todas as secretarias do Site Institucional já possuem e-mail.', 'info');
    }
    return createdCount;
  }, [currentInstitution, primaryDomain, accounts, secretariatNames, currentUser?.name]);

  const handleSendEmail = useCallback(
    async (payload: SendEmailPayload) => {
      if (!currentInstitution?.id) return null;
      const sender = accounts.find((a) => a.id === payload.accountId) || activeAccount;
      if (!sender) return null;

      const result = await sendInstitutionalEmail({
        institutionId: currentInstitution.id,
        senderAccount: sender,
        domain: primaryDomain,
        allAccounts: accounts,
        payload,
      });

      await reload();

      if (payload.isDraft) {
        showToast('Rascunho salvo.', 'info');
      } else if (result.sentMessage.delivery_status === 'sent') {
        showToast('E-mail oficial enviado com sucesso!', 'success');
      } else if (result.sentMessage.delivery_status === 'failed') {
        showToast(
          `Falha no disparo externo: ${result.deliveryError || 'Verifique a Edge Function e RESEND_API_KEY.'}`,
          'error'
        );
      } else if (result.deliveredInternallyCount > 0) {
        showToast(
          `E-mail entregue internamente para ${result.deliveredInternallyCount} caixa(s) da prefeitura.`,
          'success'
        );
      } else {
        showToast(
          'E-mail salvo apenas localmente (provedor em modo Simulado). Selecione Resend API em Domínio & DNS para enviar para fora.',
          'warning'
        );
      }
      return result;
    },
    [currentInstitution?.id, accounts, activeAccount, primaryDomain, reload]
  );

  const handleToggleFlag = useCallback(
    async (
      messageId: string,
      patch: Partial<Pick<InstitutionalEmailMessage, 'is_read' | 'is_starred' | 'folder'>>
    ) => {
      if (!currentInstitution?.id) return;
      await updateEmailMessageFlags(currentInstitution.id, messageId, patch);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m))
      );
    },
    [currentInstitution?.id]
  );

  const handleDeleteMessage = useCallback(
    async (message: InstitutionalEmailMessage) => {
      if (!currentInstitution?.id) return;
      if (message.folder !== 'trash') {
        await handleToggleFlag(message.id, { folder: 'trash' });
        showToast('Mensagem movida para a lixeira.', 'info');
      } else {
        await deleteEmailMessagePermanently(currentInstitution.id, message.id);
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
        showToast('Mensagem excluída permanentemente.', 'info');
      }
    },
    [currentInstitution?.id, handleToggleFlag]
  );

  return {
    loading,
    dataSource,
    siteConfig,
    accentHex,
    secretariatNames,
    domains,
    primaryDomain,
    accounts,
    activeAccount,
    selectedAccountId,
    setSelectedAccountId,
    activeFolder,
    setActiveFolder,
    accountMessages,
    unreadCountByFolder,
    reload,
    handleSaveDomain,
    handleUpsertAccount,
    handleDeleteAccount,
    handleSyncWithSiteSecretariats,
    handleSendEmail,
    handleToggleFlag,
    handleDeleteMessage,
  };
}
