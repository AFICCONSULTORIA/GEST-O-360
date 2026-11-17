import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: SendRequestBody = await req.json();
    const { from, to, cc, subject, text, html, reply_to, attachments } = body;

    const effectiveFrom =
      (from && from.trim()) ||
      Deno.env.get('RESEND_FROM_EMAIL') ||
      'Gestão 360 <noreply@gestao360sistema.com.br>';

    if (!Array.isArray(to) || to.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Campo "to" é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
