import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function resolveAllowedOrigin(originHeader: string | null): string {
  if (!originHeader) return 'https://gestao360sistema.com.br';
  const clean = originHeader.trim();
  const customOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (customOrigins.includes(clean)) return clean;

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'gestao360sistema.com.br' ||
      host.endsWith('.gestao360sistema.com.br') ||
      host.endsWith('.vercel.app') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
      return clean;
    }
  } catch {
    // Origem inválida
  }
  return 'https://gestao360sistema.com.br';
}

function extractDomain(rawEmailHeader: string): string {
  const match = rawEmailHeader.match(/<([^>]+)>/);
  const addr = (match ? match[1] : rawEmailHeader).trim().toLowerCase();
  const atIdx = addr.lastIndexOf('@');
  return atIdx >= 0 ? addr.slice(atIdx + 1) : '';
}

function isAllowedSenderDomain(domain: string, fallbackFrom: string): boolean {
  if (!domain) return false;
  if (domain === 'gestao360sistema.com.br' || domain.endsWith('.gestao360sistema.com.br')) {
    return true;
  }
  const fallbackDomain = extractDomain(fallbackFrom);
  if (fallbackDomain && domain === fallbackDomain) return true;

  const extraDomains = (Deno.env.get('RESEND_ALLOWED_DOMAINS') || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return extraDomains.includes(domain);
}

interface EmailAttachment {
  filename: string;
  content: string; // Base64
  content_type?: string;
}

interface SendRequestBody {
  institution_id?: string;
  provider?: string;
  from?: string;
  to: string[];
  cc?: string[];
  subject?: string;
  text?: string;
  html?: string;
  reply_to?: string;
  attachments?: EmailAttachment[];
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(req.headers.get('origin')),
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, error: 'Autenticação obrigatória para envio de e-mail.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Configuração de autenticação Supabase ausente.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.slice(7).trim();
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !userData?.user) {
    return new Response(JSON.stringify({ ok: false, error: 'Sessão inválida ou expirada.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: SendRequestBody = await req.json();
    const { from, to, cc, subject, text, html, reply_to, attachments } = body;

    const serverDefaultFrom =
      Deno.env.get('RESEND_FROM_EMAIL') ||
      'Gestão 360 <noreply@gestao360sistema.com.br>';

    const candidateFrom = from && from.trim() ? from.trim() : serverDefaultFrom;
    const candidateDomain = extractDomain(candidateFrom);
    const effectiveFrom = isAllowedSenderDomain(candidateDomain, serverDefaultFrom)
      ? candidateFrom
      : serverDefaultFrom;

    if (!Array.isArray(to) || to.length === 0 || to.length > 50) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Campo "to" deve conter entre 1 e 50 destinatários.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (Array.isArray(cc) && cc.length > 20) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Campo "cc" excede o limite de 20 destinatários.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (Array.isArray(attachments)) {
      if (attachments.length > 10) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Máximo de 10 anexos permitido.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const totalAttachmentSize = attachments.reduce((sum, a) => sum + String(a?.content || '').length, 0);
      if (totalAttachmentSize > 10_000_000) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Tamanho total dos anexos excede o limite de 10 MB.' }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Secret RESEND_API_KEY não configurada no Supabase Edge Functions.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendPayload: Record<string, unknown> = {
      from: effectiveFrom,
      to,
      subject: subject || '(Sem assunto)',
      text: text || '',
    };

    if (Array.isArray(cc) && cc.length > 0) {
      resendPayload.cc = cc;
    }
    if (html && html.trim()) {
      resendPayload.html = html;
    }
    if (reply_to) {
      resendPayload.reply_to = reply_to;
    }
    if (Array.isArray(attachments) && attachments.length > 0) {
      resendPayload.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        ...(att.content_type ? { content_type: att.content_type } : {}),
      }));
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const resendJson = await resendResp.json().catch(() => ({}));

    if (!resendResp.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: resendJson?.message || resendJson?.error || `Resend HTTP ${resendResp.status}`,
          details: resendJson,
        }),
        { status: resendResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, id: resendJson?.id || null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno ao enviar e-mail.';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
