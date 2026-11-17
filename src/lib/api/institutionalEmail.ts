import { supabase } from '../supabase';
import { Institution } from '../../types';
import {
  EmailFolder,
  EmailProviderConfig,
  EmailProviderType,
  InstitutionalEmailAccount,
  InstitutionalEmailDomain,
  InstitutionalEmailMessage,
  SendEmailPayload,
} from '../../modules/EmailInstitucional/types';

const STORAGE_DOMAINS_PREFIX = '@gestao360:inst_email_domains_';
const STORAGE_ACCOUNTS_PREFIX = '@gestao360:inst_email_accounts_';
const STORAGE_MESSAGES_PREFIX = '@gestao360:inst_email_messages_';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `em_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugifyMunicipalityDomain(institution?: Institution | null, customDomain?: string | null): string {
  const cleanedCustom = (customDomain || institution?.custom_domain || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
  if (cleanedCustom && cleanedCustom.includes('.')) {
    return cleanedCustom;
  }

  const rawName = (institution?.name || 'municipio')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/prefeitura\s*(municipal\s*)?(de\s*)?/gi, '')
    .replace(/\/[a-z]{2}$/i, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

  const slug = rawName || 'municipio';
  return `${slug}.gov.br`;
}

export function slugifyLocalPart(label: string): string {
  const cleaned = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/secretaria\s*(municipal\s*)?(de\s*)?/gi, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
  return cleaned || 'setor';
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function buildSeedState(
  institution: Institution,
  domainName: string,
  secretariatNames: string[],
  contactEmail?: string
): {
  domain: InstitutionalEmailDomain;
  accounts: InstitutionalEmailAccount[];
  messages: InstitutionalEmailMessage[];
} {
  const now = new Date().toISOString();
  const domainId = generateId();

  const domain: InstitutionalEmailDomain = {
    id: domainId,
    institution_id: institution.id,
    domain: domainName,
    is_primary: true,
    mx_verified: false,
    spf_verified: false,
    dkim_verified: false,
    dmarc_verified: false,
    dkim_selector: 'gestao360._domainkey',
    dkim_public_key: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgestao360PublicKeyPlaceholder',
    provider_type: 'simulated',
    provider_config: {
      default_from_name: institution.name,
      edge_function_name: 'institutional-email-send',
      use_tls: true,
    },
    created_at: now,
    updated_at: now,
  };

  const baseAccounts: Array<{
    local: string;
    display: string;
    type: InstitutionalEmailAccount['account_type'];
    dept: string;
  }> = [
    { local: 'gabinete', display: `Gabinete do Prefeito - ${institution.name}`, type: 'secretariat', dept: 'Gabinete do Prefeito' },
    { local: 'contato', display: `Atendimento Oficial - ${institution.name}`, type: 'alias', dept: 'Comunicação Social' },
    { local: 'ouvidoria', display: `Ouvidoria Municipal / e-SIC`, type: 'secretariat', dept: 'Ouvidoria' },
  ];

  const seenLocals = new Set(baseAccounts.map((a) => a.local));
  for (const sec of secretariatNames.slice(0, 6)) {
    const local = slugifyLocalPart(sec);
    if (!seenLocals.has(local)) {
      seenLocals.add(local);
      baseAccounts.push({
        local,
        display: sec,
        type: 'secretariat',
        dept: sec,
      });
    }
  }

  if (contactEmail && contactEmail.includes('@')) {
    const [localPart, emailDomain] = contactEmail.split('@');
    if (emailDomain === domainName && localPart && !seenLocals.has(localPart)) {
      seenLocals.add(localPart);
      baseAccounts.unshift({
        local: localPart,
        display: `Portal Institucional - ${institution.name}`,
        type: 'mailbox',
        dept: 'Administração',
      });
    }
  }

  const accounts: InstitutionalEmailAccount[] = baseAccounts.map((item) => ({
    id: generateId(),
    institution_id: institution.id,
    domain_id: domainId,
    email_address: `${item.local}@${domainName}`,
    display_name: item.display,
    account_type: item.type,
    department_name: item.dept,
    quota_mb: 5120,
    used_mb: item.local === 'gabinete' ? 142.5 : 18.2,
    signature_html: `<p><strong>${item.display}</strong><br/>${institution.name}<br/><em>E-mail Oficial Integrado ao Gestão 360</em></p>`,
    status: 'active',
    created_at: now,
    updated_at: now,
  }));

  const primaryAccount = accounts[0];
  const messages: InstitutionalEmailMessage[] = primaryAccount
    ? [
        {
          id: generateId(),
          institution_id: institution.id,
          account_id: primaryAccount.id,
          folder: 'inbox',
          from_address: `suporte@gestao360.gov.br`,
          from_name: 'Gestão 360 - Implantação Institucional',
          to_addresses: [primaryAccount.email_address],
          cc_addresses: [],
          subject: `Bem-vindo ao E-mail Institucional de ${institution.name}`,
          body_text:
            `Olá!\n\nO módulo de E-mail Institucional de ${institution.name} foi integrado ao domínio ${domainName} configurado no Site Institucional.\n\nPróximos passos:\n1. Revise as caixas postais criadas automaticamente para as secretarias.\n2. Configure os registros DNS (MX, SPF, DKIM e DMARC) na aba Domínio & DNS.\n3. Conecte seu provedor (Resend, Edge Function ou servidor SMTP/IMAP) quando desejar disparar para domínios externos.\n\nAtenciosamente,\nEquipe Gestão 360`,
          is_read: false,
          is_starred: true,
          delivery_status: 'delivered',
          delivery_provider: 'simulated',
          sent_at: now,
          created_at: now,
          updated_at: now,
        },
      ]
    : [];

  return { domain, accounts, messages };
}

export async function loadInstitutionalEmailState(
  institution: Institution,
  options?: { siteDomain?: string | null; secretariatNames?: string[]; contactEmail?: string }
): Promise<{
  domains: InstitutionalEmailDomain[];
  accounts: InstitutionalEmailAccount[];
  messages: InstitutionalEmailMessage[];
  source: 'supabase' | 'local';
}> {
  const instId = institution.id;
  const resolvedDomain = slugifyMunicipalityDomain(institution, options?.siteDomain);

  try {
    const [domRes, accRes, msgRes] = await Promise.all([
      supabase
        .from('institutional_email_domains')
        .select('*')
        .eq('institution_id', instId)
        .order('is_primary', { ascending: false }),
      supabase
        .from('institutional_email_accounts')
        .select('*')
        .eq('institution_id', instId)
        .order('created_at', { ascending: true }),
      supabase
        .from('institutional_email_messages')
        .select('*')
        .eq('institution_id', instId)
        .order('sent_at', { ascending: false })
        .limit(100),
    ]);

    if (!domRes.error && !accRes.error && !msgRes.error) {
      let domains = (domRes.data || []) as InstitutionalEmailDomain[];
      let accounts = (accRes.data || []) as InstitutionalEmailAccount[];
      let messages = (msgRes.data || []) as InstitutionalEmailMessage[];

      if (domains.length === 0) {
        const seed = buildSeedState(
          institution,
          resolvedDomain,
          options?.secretariatNames || [],
          options?.contactEmail
        );
        const { data: insertedDom } = await supabase
          .from('institutional_email_domains')
          .insert(seed.domain)
          .select()
          .single();

        if (insertedDom) {
          domains = [insertedDom as InstitutionalEmailDomain];
          const accountsToInsert = seed.accounts.map((a) => ({ ...a, domain_id: insertedDom.id }));
          const { data: insertedAccs } = await supabase
            .from('institutional_email_accounts')
            .insert(accountsToInsert)
            .select();
          if (insertedAccs && insertedAccs.length > 0) {
            accounts = insertedAccs as InstitutionalEmailAccount[];
            const msgsToInsert = seed.messages.map((m) => ({
              ...m,
              account_id: accounts[0].id,
            }));
            const { data: insertedMsgs } = await supabase
              .from('institutional_email_messages')
              .insert(msgsToInsert)
              .select();
            if (insertedMsgs) messages = insertedMsgs as InstitutionalEmailMessage[];
          }
        }
      }

      writeLocal(`${STORAGE_DOMAINS_PREFIX}${instId}`, domains);
      writeLocal(`${STORAGE_ACCOUNTS_PREFIX}${instId}`, accounts);
      writeLocal(`${STORAGE_MESSAGES_PREFIX}${instId}`, messages);

      return { domains, accounts, messages, source: 'supabase' };
    }
  } catch {
    // Fallback gracefully to local storage
  }

  let domains = readLocal<InstitutionalEmailDomain[]>(`${STORAGE_DOMAINS_PREFIX}${instId}`, []);
  let accounts = readLocal<InstitutionalEmailAccount[]>(`${STORAGE_ACCOUNTS_PREFIX}${instId}`, []);
  let messages = readLocal<InstitutionalEmailMessage[]>(`${STORAGE_MESSAGES_PREFIX}${instId}`, []);

  if (domains.length === 0) {
    const seed = buildSeedState(
      institution,
      resolvedDomain,
      options?.secretariatNames || [],
      options?.contactEmail
    );
    domains = [seed.domain];
    accounts = seed.accounts;
    messages = seed.messages;
    writeLocal(`${STORAGE_DOMAINS_PREFIX}${instId}`, domains);
    writeLocal(`${STORAGE_ACCOUNTS_PREFIX}${instId}`, accounts);
    writeLocal(`${STORAGE_MESSAGES_PREFIX}${instId}`, messages);
  }

  return { domains, accounts, messages, source: 'local' };
}

export async function saveEmailDomainConfig(
  domain: InstitutionalEmailDomain
): Promise<InstitutionalEmailDomain> {
  const updated: InstitutionalEmailDomain = {
    ...domain,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('institutional_email_domains')
      .upsert(updated)
      .select()
      .single();
    if (!error && data) {
      const saved = data as InstitutionalEmailDomain;
      const list = readLocal<InstitutionalEmailDomain[]>(
        `${STORAGE_DOMAINS_PREFIX}${domain.institution_id}`,
        []
      );
      const next = list.some((d) => d.id === saved.id)
        ? list.map((d) => (d.id === saved.id ? saved : d))
        : [saved, ...list];
      writeLocal(`${STORAGE_DOMAINS_PREFIX}${domain.institution_id}`, next);
      return saved;
    }
  } catch {
    // local fallback
  }

  const list = readLocal<InstitutionalEmailDomain[]>(
    `${STORAGE_DOMAINS_PREFIX}${domain.institution_id}`,
    []
  );
  const next = list.some((d) => d.id === updated.id)
    ? list.map((d) => (d.id === updated.id ? updated : d))
    : [updated, ...list];
  writeLocal(`${STORAGE_DOMAINS_PREFIX}${domain.institution_id}`, next);
  return updated;
}

export async function upsertEmailAccount(
  account: Omit<InstitutionalEmailAccount, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<InstitutionalEmailAccount> {
  const now = new Date().toISOString();
  const payload: InstitutionalEmailAccount = {
    ...account,
    id: account.id || generateId(),
    email_address: account.email_address.trim().toLowerCase(),
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from('institutional_email_accounts')
      .upsert(payload)
      .select()
      .single();
    if (!error && data) {
      const saved = data as InstitutionalEmailAccount;
      const list = readLocal<InstitutionalEmailAccount[]>(
        `${STORAGE_ACCOUNTS_PREFIX}${saved.institution_id}`,
        []
      );
      const next = list.some((a) => a.id === saved.id)
        ? list.map((a) => (a.id === saved.id ? saved : a))
        : [...list, saved];
      writeLocal(`${STORAGE_ACCOUNTS_PREFIX}${saved.institution_id}`, next);
      return saved;
    }
  } catch {
    // local fallback
  }

  const list = readLocal<InstitutionalEmailAccount[]>(
    `${STORAGE_ACCOUNTS_PREFIX}${payload.institution_id}`,
    []
  );
  const next = list.some((a) => a.id === payload.id)
    ? list.map((a) => (a.id === payload.id ? { ...a, ...payload, updated_at: now } : a))
    : [...list, payload];
  writeLocal(`${STORAGE_ACCOUNTS_PREFIX}${payload.institution_id}`, next);
  return payload;
}

export async function deleteEmailAccount(institutionId: string, accountId: string): Promise<void> {
  try {
    await supabase
      .from('institutional_email_accounts')
      .delete()
      .eq('institution_id', institutionId)
      .eq('id', accountId);
  } catch {
    // ignore
  }
  const list = readLocal<InstitutionalEmailAccount[]>(
    `${STORAGE_ACCOUNTS_PREFIX}${institutionId}`,
    []
  );
  writeLocal(
    `${STORAGE_ACCOUNTS_PREFIX}${institutionId}`,
    list.filter((a) => a.id !== accountId)
  );
}

export async function sendInstitutionalEmail(params: {
  institutionId: string;
  senderAccount: InstitutionalEmailAccount;
  domain?: InstitutionalEmailDomain | null;
  allAccounts: InstitutionalEmailAccount[];
  payload: SendEmailPayload;
}): Promise<{
  sentMessage: InstitutionalEmailMessage;
  deliveredInternallyCount: number;
  providerUsed: EmailProviderType;
  deliveryError?: string;
}> {
  const { institutionId, senderAccount, domain, allAccounts, payload } = params;
  const now = new Date().toISOString();
  const providerType: EmailProviderType = domain?.provider_type || 'simulated';
  const providerConfig: EmailProviderConfig = domain?.provider_config || {};

  let deliveryStatus: InstitutionalEmailMessage['delivery_status'] = payload.isDraft
    ? 'queued'
    : 'simulated';
  let externalId: string | undefined;
  let deliveryError: string | undefined;

  if (!payload.isDraft && (providerType === 'supabase_edge' || providerType === 'resend')) {
    try {
      const fnName = providerConfig.edge_function_name || 'institutional-email-send';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          institution_id: institutionId,
          provider: providerType,
          from: `${senderAccount.display_name} <${senderAccount.email_address}>`,
          to: payload.to,
          cc: payload.cc || [],
          subject: payload.subject,
          text: payload.bodyText,
          html: payload.bodyHtml,
        },
      });
      const respObj = data as { ok?: boolean; id?: string; error?: string } | null;
      if (!error && respObj?.ok !== false) {
        deliveryStatus = 'sent';
        externalId = respObj?.id;
      } else {
        deliveryStatus = 'failed';
        deliveryError = respObj?.error || error?.message || 'Falha ao chamar Edge Function de envio.';
      }
    } catch (err: unknown) {
      deliveryStatus = 'failed';
      deliveryError = err instanceof Error ? err.message : 'Edge Function não acessível.';
    }
  } else if (!payload.isDraft && providerType === 'smtp_imap' && providerConfig.webhook_url) {
    try {
      const resp = await fetch(providerConfig.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: institutionId,
          from: senderAccount.email_address,
          from_name: senderAccount.display_name,
          to: payload.to,
          cc: payload.cc || [],
          subject: payload.subject,
          text: payload.bodyText,
          html: payload.bodyHtml,
        }),
      });
      if (resp.ok) {
        deliveryStatus = 'sent';
      } else {
        deliveryStatus = 'failed';
        deliveryError = `Webhook SMTP retornou HTTP ${resp.status}`;
      }
    } catch (err: unknown) {
      deliveryStatus = 'failed';
      deliveryError = err instanceof Error ? err.message : 'Erro ao conectar ao webhook SMTP.';
    }
  }

  const sentMessage: InstitutionalEmailMessage = {
    id: generateId(),
    institution_id: institutionId,
    account_id: senderAccount.id,
    folder: payload.isDraft ? 'drafts' : 'sent',
    from_address: senderAccount.email_address,
    from_name: senderAccount.display_name,
    to_addresses: payload.to,
    cc_addresses: payload.cc || [],
    subject: payload.subject || '(Sem assunto)',
    body_text: payload.bodyText,
    body_html: payload.bodyHtml || null,
    is_read: true,
    is_starred: false,
    thread_id: payload.threadId || generateId(),
    external_message_id: externalId || null,
    delivery_status: deliveryStatus,
    delivery_provider: providerType,
    sent_at: now,
    created_at: now,
    updated_at: now,
  };

  // Deliver directly to matching internal @municipio mailboxes
  const internalMessages: InstitutionalEmailMessage[] = [];
  if (!payload.isDraft) {
    const targets = new Set([...payload.to, ...(payload.cc || [])].map((e) => e.trim().toLowerCase()));
    for (const acc of allAccounts) {
      if (targets.has(acc.email_address.toLowerCase()) && acc.id !== senderAccount.id) {
        internalMessages.push({
          ...sentMessage,
          id: generateId(),
          account_id: acc.id,
          folder: 'inbox',
          is_read: false,
          delivery_status: 'delivered',
        });
      }
    }
  }

  const toPersist = [sentMessage, ...internalMessages];
  try {
    await supabase.from('institutional_email_messages').insert(toPersist);
  } catch {
    // local fallback below
  }

  const currentLocal = readLocal<InstitutionalEmailMessage[]>(
    `${STORAGE_MESSAGES_PREFIX}${institutionId}`,
    []
  );
  writeLocal(`${STORAGE_MESSAGES_PREFIX}${institutionId}`, [...toPersist, ...currentLocal]);

  return {
    sentMessage,
    deliveredInternallyCount: internalMessages.length,
    providerUsed: providerType,
    deliveryError,
  };
}

export async function updateEmailMessageFlags(
  institutionId: string,
  messageId: string,
  patch: Partial<Pick<InstitutionalEmailMessage, 'is_read' | 'is_starred' | 'folder'>>
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await supabase
      .from('institutional_email_messages')
      .update({ ...patch, updated_at: now })
      .eq('institution_id', institutionId)
      .eq('id', messageId);
  } catch {
    // ignore
  }

  const list = readLocal<InstitutionalEmailMessage[]>(
    `${STORAGE_MESSAGES_PREFIX}${institutionId}`,
    []
  );
  writeLocal(
    `${STORAGE_MESSAGES_PREFIX}${institutionId}`,
    list.map((m) => (m.id === messageId ? { ...m, ...patch, updated_at: now } : m))
  );
}

export async function deleteEmailMessagePermanently(
  institutionId: string,
  messageId: string
): Promise<void> {
  try {
    await supabase
      .from('institutional_email_messages')
      .delete()
      .eq('institution_id', institutionId)
      .eq('id', messageId);
  } catch {
    // ignore
  }

  const list = readLocal<InstitutionalEmailMessage[]>(
    `${STORAGE_MESSAGES_PREFIX}${institutionId}`,
    []
  );
  writeLocal(
    `${STORAGE_MESSAGES_PREFIX}${institutionId}`,
    list.filter((m) => m.id !== messageId)
  );
}

export function getDnsRecordsForDomain(domain: InstitutionalEmailDomain) {
  return [
    {
      type: 'MX',
      host: '@',
      value:
        domain.provider_type === 'resend'
          ? '10 feedback-smtp.sa-east-1.amazonses.com'
          : `10 mail.${domain.domain}`,
      priority: '10',
      verified: domain.mx_verified,
      key: 'mx_verified' as const,
      purpose: 'Roteamento de entrada de e-mails para o domínio oficial',
    },
    {
      type: 'TXT (SPF)',
      host: '@',
      value:
        domain.provider_type === 'resend'
          ? 'v=spf1 include:amazonses.com ~all'
          : `v=spf1 mx a include:_spf.gestao360.gov.br ~all`,
      priority: '-',
      verified: domain.spf_verified,
      key: 'spf_verified' as const,
      purpose: 'Autoriza os servidores do Gestão 360 a enviar em nome da Prefeitura',
    },
    {
      type: 'TXT (DKIM)',
      host: domain.dkim_selector || 'gestao360._domainkey',
      value: domain.dkim_public_key,
      priority: '-',
      verified: domain.dkim_verified,
      key: 'dkim_verified' as const,
      purpose: 'Assinatura criptográfica garantindo autenticidade institucional',
    },
    {
      type: 'TXT (DMARC)',
      host: '_dmarc',
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain.domain}`,
      priority: '-',
      verified: domain.dmarc_verified,
      key: 'dmarc_verified' as const,
      purpose: 'Proteção contra spoofing e falsificação de e-mails oficiais',
    },
  ];
}

export function folderLabel(folder: EmailFolder): string {
  switch (folder) {
    case 'inbox':
      return 'Caixa de Entrada';
    case 'sent':
      return 'Enviados';
    case 'drafts':
      return 'Rascunhos';
    case 'archive':
      return 'Arquivo';
    case 'trash':
      return 'Lixeira';
  }
}

export async function hashEmailPassword(password: string): Promise<string> {
  const salted = `g360_mail_v1:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(salted);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    const bytes = Array.from(new Uint8Array(digest));
    return `sha256:${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  // Fallback determinístico caso crypto.subtle não esteja disponível (HTTP não-localhost)
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    hash = (hash << 5) - hash + salted.charCodeAt(i);
    hash |= 0;
  }
  return `fb:${Math.abs(hash).toString(16)}`;
}

export async function setEmailAccountPassword(
  institutionId: string,
  accountId: string,
  newPassword: string
): Promise<string> {
  const passwordHash = await hashEmailPassword(newPassword);
  const now = new Date().toISOString();

  try {
    await supabase
      .from('institutional_email_accounts')
      .update({ password_hash: passwordHash, updated_at: now })
      .eq('institution_id', institutionId)
      .eq('id', accountId);
  } catch {
    // local fallback below
  }

  const list = readLocal<InstitutionalEmailAccount[]>(
    `${STORAGE_ACCOUNTS_PREFIX}${institutionId}`,
    []
  );
  writeLocal(
    `${STORAGE_ACCOUNTS_PREFIX}${institutionId}`,
    list.map((a) => (a.id === accountId ? { ...a, password_hash: passwordHash, updated_at: now } : a))
  );

  return passwordHash;
}

export async function authenticateWebmailAccount(
  institution: Institution,
  emailAddress: string,
  password: string,
  options?: { siteDomain?: string | null; secretariatNames?: string[]; contactEmail?: string }
): Promise<{
  ok: boolean;
  account?: InstitutionalEmailAccount;
  error?: string;
}> {
  const cleanEmail = emailAddress.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { ok: false, error: 'Informe seu e-mail institucional e senha.' };
  }

  const state = await loadInstitutionalEmailState(institution, options);
  const account = state.accounts.find((a) => a.email_address.toLowerCase() === cleanEmail);

  if (!account) {
    return { ok: false, error: 'Conta institucional não encontrada neste município.' };
  }

  if (account.status !== 'active') {
    return { ok: false, error: 'Esta caixa postal está suspensa. Procure o TI da Prefeitura.' };
  }

  if (!account.password_hash) {
    return {
      ok: false,
      error:
        'Esta conta ainda não possui senha definida. Solicite ao administrador no painel Gestão 360 (E-mail Institucional > Contas).',
    };
  }

  const candidateHash = await hashEmailPassword(password);
  if (candidateHash !== account.password_hash) {
    return { ok: false, error: 'E-mail ou senha inválidos.' };
  }

  const now = new Date().toISOString();
  try {
    await supabase
      .from('institutional_email_accounts')
      .update({ last_login_at: now })
      .eq('institution_id', institution.id)
      .eq('id', account.id);
  } catch {
    // ignore
  }

  const updatedAccount: InstitutionalEmailAccount = { ...account, last_login_at: now };
  const list = readLocal<InstitutionalEmailAccount[]>(
    `${STORAGE_ACCOUNTS_PREFIX}${institution.id}`,
    []
  );
  writeLocal(
    `${STORAGE_ACCOUNTS_PREFIX}${institution.id}`,
    list.map((a) => (a.id === account.id ? updatedAccount : a))
  );

  return { ok: true, account: updatedAccount };
}
