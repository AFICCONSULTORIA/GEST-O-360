import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://gestao360sistema.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, svix-id, svix-timestamp, svix-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function extractDisplayName(raw: string): string {
  const match = raw.match(/^([^<]+)</);
  return match ? match[1].replace(/["']/g, '').trim() : '';
}

function normalizeEmailArray(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((item) => (typeof item === 'string' ? extractEmailAddress(item) : ''))
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((s) => extractEmailAddress(s))
      .filter(Boolean);
  }
  return [];
}

async function verifyResendSignature(
  rawBodyText: string,
  headers: Headers,
  signingSecret: string
): Promise<boolean> {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Evita replay attacks (> 5 minutos)
  const tsNum = Number(svixTimestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false;
  }

  const secretBase64 = signingSecret.startsWith('whsec_')
    ? signingSecret.slice(6)
    : signingSecret;
  const secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signedContent = new TextEncoder().encode(`${svixId}.${svixTimestamp}.${rawBodyText}`);
  const sigBuf = await crypto.subtle.sign('HMAC', key, signedContent);
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  const candidates = svixSignature
    .split(' ')
    .map((part) => part.split(',')[1])
    .filter(Boolean);

  return candidates.some((c) => c === expectedSig);
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
    const rawBodyText = await req.text();

    const resendWebhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    const configuredSecret = Deno.env.get('EMAIL_INBOUND_SECRET');

    // Fail-closed: exige ao menos um mecanismo de verificação configurado
    if (!resendWebhookSecret && !configuredSecret) {
      return new Response(JSON.stringify({ ok: false, error: 'Webhook secrets not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (resendWebhookSecret) {
      const validSig = await verifyResendSignature(rawBodyText, req.headers, resendWebhookSecret);
      if (!validSig) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid Resend webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (configuredSecret) {
      const provided = req.headers.get('x-webhook-secret') || '';
      if (!provided || !timingSafeEqualStrings(provided, configuredSecret)) {
        return new Response(JSON.stringify({ ok: false, error: 'Unauthorized webhook secret' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Supabase env vars missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = JSON.parse(rawBodyText);
    // Suporta formato Resend Webhook (`{ type: 'email.received', data: { ... } }`) ou JSON direto
    const payload = rawBody?.type === 'email.received' && rawBody?.data ? rawBody.data : rawBody;

    let fromRaw = String(payload?.from || '');
    let toList = normalizeEmailArray(payload?.to);
    let ccList = normalizeEmailArray(payload?.cc);
    let subject = String(payload?.subject || '(Sem assunto)');
    let textBody = String(payload?.text || payload?.body_text || '');
    let htmlBody: string | null = payload?.html || payload?.body_html || null;
    const externalMessageId = String(payload?.message_id || payload?.email_id || payload?.id || '');

    // Se veio de webhook Resend sem corpo completo, busca conteúdo completo na Receiving API do Resend
    if (!textBody && !htmlBody && payload?.email_id) {
      const safeEmailId = String(payload.email_id).trim();
      if (!/^[a-zA-Z0-9_-]{8,128}$/.test(safeEmailId)) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid email_id format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        const detailResp = await fetch(`https://api.resend.com/emails/receiving/${safeEmailId}`, {
          headers: { Authorization: `Bearer ${resendApiKey}` },
        });
        if (detailResp.ok) {
          const detail = await detailResp.json();
          fromRaw = String(detail?.from || fromRaw);
          if (detail?.to) toList = normalizeEmailArray(detail.to);
          if (detail?.cc) ccList = normalizeEmailArray(detail.cc);
          subject = String(detail?.subject || subject);
          textBody = String(detail?.text || '');
          htmlBody = detail?.html || null;
        }
      }
    }

    const fromAddress = extractEmailAddress(fromRaw);
    const fromName = String(payload?.from_name || extractDisplayName(fromRaw) || fromAddress);
    const allTargets = Array.from(new Set([...toList, ...ccList]));

    if (!fromAddress || allTargets.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Payload sem remetente ou destinatários válidos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: matchedAccounts, error: accErr } = await adminClient
      .from('institutional_email_accounts')
      .select('id, institution_id, email_address, account_type, forward_to, status')
      .in('email_address', allTargets)
      .eq('status', 'active');

    if (accErr) {
      return new Response(JSON.stringify({ ok: false, error: accErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!matchedAccounts || matchedAccounts.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, delivered: 0, reason: 'Nenhuma caixa ativa corresponde aos destinatários.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve aliases com forward_to para entregar também na caixa principal
    const deliveryTargets = new Map<string, { id: string; institution_id: string }>();
    for (const acc of matchedAccounts) {
      deliveryTargets.set(acc.id, { id: acc.id, institution_id: acc.institution_id });
      if (acc.account_type === 'alias' && acc.forward_to) {
        const fwdAddr = extractEmailAddress(acc.forward_to);
        const { data: fwdAcc } = await adminClient
          .from('institutional_email_accounts')
          .select('id, institution_id')
          .eq('institution_id', acc.institution_id)
          .eq('email_address', fwdAddr)
          .eq('status', 'active')
          .maybeSingle();
        if (fwdAcc) {
          deliveryTargets.set(fwdAcc.id, fwdAcc);
        }
      }
    }

    const now = new Date().toISOString();
    const rowsToInsert = Array.from(deliveryTargets.values()).map((target) => ({
      institution_id: target.institution_id,
      account_id: target.id,
      folder: 'inbox',
      from_address: fromAddress,
      from_name: fromName,
      to_addresses: toList,
      cc_addresses: ccList,
      subject,
      body_text: textBody || (htmlBody ? htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
      body_html: htmlBody,
      is_read: false,
      is_starred: false,
      thread_id: crypto.randomUUID(),
      external_message_id: externalMessageId || null,
      delivery_status: 'delivered',
      delivery_provider: 'resend',
      sent_at: now,
    }));

    const { error: insertErr } = await adminClient
      .from('institutional_email_messages')
      .insert(rowsToInsert);

    if (insertErr) {
      return new Response(JSON.stringify({ ok: false, error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, delivered: rowsToInsert.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno no webhook inbound.';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
