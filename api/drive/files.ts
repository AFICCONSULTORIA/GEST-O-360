import { checkRateLimitAsync, isPayloadTooLarge, resolveAllowedOrigin, verifySupabaseAuthHeader } from '../_utils/security.js';

interface NodeRequest {
  method?: string;
  headers?: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
}

interface NodeResponse {
  setHeader: (name: string, value: string) => NodeResponse;
  status: (code: number) => NodeResponse;
  json: (payload: unknown) => NodeResponse;
  send: (payload: Buffer) => NodeResponse;
  end: () => NodeResponse;
}

export const config = {
  maxDuration: 60,
};

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface DriveFileItem {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
}

async function getGoogleDriveAccessToken(): Promise<{ token?: string; missingConfig?: boolean; error?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      missingConfig: true,
      error:
        'Credenciais OAuth do Google Drive não configuradas no servidor (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_DRIVE_REFRESH_TOKEN).',
    };
  }

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const json = (await resp.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!resp.ok || !json.access_token) {
    return {
      error: json.error_description || json.error || `Falha ao autenticar no Google OAuth (${resp.status}).`,
    };
  }

  return { token: json.access_token };
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function ensureDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  const cleanName = folderName.trim() || 'Geral';
  const parentFilter = parentId ? ` and '${escapeDriveQueryValue(parentId)}' in parents` : '';
  const q = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${escapeDriveQueryValue(cleanName)}'${parentFilter}`;

  const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
  searchUrl.searchParams.set('q', q);
  searchUrl.searchParams.set('fields', 'files(id, name)');
  searchUrl.searchParams.set('pageSize', '1');

  const searchResp = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (searchResp.ok) {
    const searchJson = (await searchResp.json()) as { files?: Array<{ id: string }> };
    if (searchJson.files && searchJson.files.length > 0) {
      return searchJson.files[0].id;
    }
  }

  const createResp = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: cleanName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    throw new Error(`Erro ao criar pasta "${cleanName}" no Google Drive: ${errText}`);
  }

  const created = (await createResp.json()) as { id: string };
  return created.id;
}

async function resolveTenantCategoryFolder(
  accessToken: string,
  institutionName: string,
  category: string
): Promise<string> {
  const configuredRootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  const rootFolderId =
    configuredRootId || (await ensureDriveFolder(accessToken, 'GESTAO_360_ARQUIVOS'));
  const instFolderId = await ensureDriveFolder(
    accessToken,
    institutionName.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'Prefeitura',
    rootFolderId
  );
  return ensureDriveFolder(
    accessToken,
    category.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60) || 'Geral',
    instFolderId
  );
}

export default async function handler(req: NodeRequest, res: NodeResponse) {
  const allowedOrigin = resolveAllowedOrigin(req.headers?.origin);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = await verifySupabaseAuthHeader(req.headers?.authorization);
  if (!auth.ok || !auth.userId) {
    return res.status(auth.status || 401).json({ error: auth.error });
  }

  if (!(await checkRateLimitAsync(`drive:${auth.userId}`, 40, 60_000))) {
    return res.status(429).json({ error: 'Limite de requisições ao Drive excedido. Aguarde um minuto.' });
  }

  const tokenRes = await getGoogleDriveAccessToken();
  if (tokenRes.missingConfig) {
    return res.status(200).json({
      configured: false,
      files: [],
      message: tokenRes.error,
    });
  }
  if (!tokenRes.token) {
    return res.status(502).json({ error: tokenRes.error || 'Falha na conexão OAuth com o Google Drive.' });
  }

  const accessToken = tokenRes.token;
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const userAuthHeader = String(req.headers?.authorization);

  try {
    // GET: Verifica status + lista arquivos do tenant (com cota de armazenamento do Drive 5TB)
    if (req.method === 'GET') {
      const institutionId = String(req.query?.institutionId || 'inst_1').trim() || 'inst_1';
      const category = String(req.query?.category || '').trim();
      const search = String(req.query?.search || '').trim();

      // 1. Consulta cota e conta conectada do Drive (About API)
      let quota: {
        limitBytes: number;
        usageBytes: number;
        usageInDriveBytes: number;
        usageInDriveTrashBytes: number;
      } | null = null;
      let driveAccount: { email: string; displayName: string } | null = null;
      try {
        const aboutResp = await fetch(
          'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(displayName,emailAddress)',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (aboutResp.ok) {
          const aboutJson = (await aboutResp.json()) as {
            storageQuota?: {
              limit?: string;
              usage?: string;
              usageInDrive?: string;
              usageInDriveTrash?: string;
            };
            user?: { displayName?: string; emailAddress?: string };
          };
          if (aboutJson.storageQuota) {
            quota = {
              limitBytes: Number(aboutJson.storageQuota.limit || 0),
              usageBytes: Number(aboutJson.storageQuota.usage || 0),
              usageInDriveBytes: Number(aboutJson.storageQuota.usageInDrive || 0),
              usageInDriveTrashBytes: Number(aboutJson.storageQuota.usageInDriveTrash || 0),
            };
          }
          if (aboutJson.user?.emailAddress || aboutJson.user?.displayName) {
            driveAccount = {
              email: aboutJson.user.emailAddress || '',
              displayName: aboutJson.user.displayName || '',
            };
          }
        }
      } catch {
        // Segue sem cota se falhar
      }

      // 2. Download ou Preview inline via proxy autenticado (?downloadId=...)
      const downloadId = String(req.query?.downloadId || '').trim();
      if (downloadId) {
        if (!/^[a-zA-Z0-9_-]{10,120}$/.test(downloadId)) {
          return res.status(400).json({ error: 'ID de arquivo inválido.' });
        }
        // Verifica no Supabase (com o JWT do usuário, respeitando RLS!) se o arquivo pertence ao tenant
        const checkResp = await fetch(
          `${supabaseUrl}/rest/v1/institutional_drive_files?drive_file_id=eq.${encodeURIComponent(downloadId)}&select=id,file_name,mime_type&limit=1`,
          {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: userAuthHeader,
            },
          }
        );
        const rows = (await checkResp.json().catch(() => [])) as Array<{ file_name?: string; mime_type?: string }>;
        if (!checkResp.ok || !Array.isArray(rows) || rows.length === 0) {
          return res.status(403).json({ error: 'Arquivo não encontrado ou sem permissão para esta instituição.' });
        }

        const fileResp = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(downloadId)}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!fileResp.ok) {
          return res.status(fileResp.status).json({ error: 'Não foi possível baixar o arquivo do Google Drive.' });
        }

        const arrayBuf = await fileResp.arrayBuffer();
        const safeName = (rows[0].file_name || 'arquivo').replace(/[^\w.\-() ]+/g, '_');
        const isInline = String(req.query?.inline || '') === '1';
        res.setHeader('Content-Type', rows[0].mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `${isInline ? 'inline' : 'attachment'}; filename="${safeName}"`);
        return res.status(200).send(Buffer.from(arrayBuf));
      }

      // 3. Lista metadados no Supabase (RLS garante isolamento estrito do tenant)
      const listUrl = new URL(`${supabaseUrl}/rest/v1/institutional_drive_files`);
      listUrl.searchParams.set('select', '*');
      listUrl.searchParams.set('institution_id', `eq.${institutionId}`);
      if (category && category !== 'Todas') {
        listUrl.searchParams.set('folder_category', `eq.${category}`);
      }
      if (search) {
        listUrl.searchParams.set('file_name', `ilike.*${search}*`);
      }
      listUrl.searchParams.set('order', 'created_at.desc');
      listUrl.searchParams.set('limit', '500');

      const listResp = await fetch(listUrl.toString(), {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: userAuthHeader,
        },
      });
      const listPayload = await listResp.json().catch(() => []);
      let dbTableMissing = false;
      let dbError: string | null = null;
      if (!listResp.ok) {
        const errCode = String(listPayload?.code || '');
        const errMsg = String(listPayload?.message || '');
        if (errCode === '42P01' || errCode === 'PGRST205' || errMsg.includes('institutional_drive_files')) {
          dbTableMissing = true;
          dbError = 'A tabela institutional_drive_files ainda não foi criada no Supabase. Execute a migração SQL correspondente.';
        } else {
          dbError = errMsg || `Erro ao consultar índice de arquivos (${listResp.status}).`;
        }
      }

      return res.status(200).json({
        configured: true,
        quota,
        driveAccount,
        dbTableMissing,
        dbError,
        files: Array.isArray(listPayload) ? listPayload : [],
      });
    }

    // POST: Upload de arquivo em Base64 para a pasta do município no Google Drive + grava índice no Supabase
    if (req.method === 'POST') {
      const {
        institutionId = 'inst_1',
        institutionName = 'Prefeitura Municipal',
        category = 'Geral',
        fileName,
        mimeType = 'application/octet-stream',
        base64Data,
        description = '',
        uploadedByName = 'Servidor Público',
      } = req.body || {};

      if (!fileName || typeof fileName !== 'string' || !base64Data || typeof base64Data !== 'string') {
        return res.status(400).json({ error: 'Nome do arquivo e conteúdo em Base64 são obrigatórios.' });
      }

      if (isPayloadTooLarge(base64Data, 4_400_000)) {
        return res.status(413).json({ error: 'Arquivo excede o limite máximo de envio direto (3 MB por arquivo).' });
      }

      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const fileBuffer = Buffer.from(cleanBase64, 'base64');

      const folderId = await resolveTenantCategoryFolder(
        accessToken,
        String(institutionName || institutionId),
        String(category || 'Geral')
      );

      // Multipart upload para Google Drive v3
      const boundary = `-------gestao360_${Date.now()}`;
      const metadataPart = JSON.stringify({
        name: fileName.trim(),
        parents: [folderId],
        description: String(description || '').slice(0, 500),
      });

      const preamble = Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
        'utf-8'
      );
      const epilogue = Buffer.from(`\r\n--${boundary}--`, 'utf-8');
      const multipartBody = Buffer.concat([preamble, fileBuffer, epilogue]);

      const uploadResp = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );

      if (!uploadResp.ok) {
        console.error('[drive/files] Falha no upload Google Drive:', uploadResp.status);
        return res.status(502).json({ error: 'Falha ao enviar arquivo ao Google Drive.' });
      }

      const driveFile = (await uploadResp.json()) as DriveFileItem;

      // Salva registro no Supabase respeitando RLS do usuário autenticado
      const insertResp = await fetch(`${supabaseUrl}/rest/v1/institutional_drive_files`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: userAuthHeader,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          institution_id: String(institutionId || 'inst_1'),
          drive_file_id: driveFile.id,
          drive_folder_id: folderId,
          file_name: driveFile.name || fileName.trim(),
          mime_type: driveFile.mimeType || mimeType,
          size_bytes: Number(driveFile.size || fileBuffer.length),
          folder_category: String(category || 'Geral'),
          description: String(description || '').slice(0, 500) || null,
          web_view_link: driveFile.webViewLink || null,
          web_content_link: driveFile.webContentLink || null,
          uploaded_by_id: auth.userId,
          uploaded_by_name: String(uploadedByName || 'Servidor Público').slice(0, 120),
        }),
      });

      const insertedRows = await insertResp.json().catch(() => []);
      if (!insertResp.ok) {
        return res.status(insertResp.status).json({
          error: 'Arquivo enviado ao Drive, mas falhou ao registrar índice no banco (verifique a migração SQL).',
          driveFile,
        });
      }

      return res.status(200).json({
        configured: true,
        file: Array.isArray(insertedRows) ? insertedRows[0] : insertedRows,
      });
    }

    // DELETE: Remove registro do Supabase (RLS) e move arquivo para a lixeira do Google Drive
    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      const driveFileId = String(req.query?.driveFileId || '').trim();
      if (!id || !driveFileId) {
        return res.status(400).json({ error: 'Parâmetros id e driveFileId são obrigatórios.' });
      }

      const delDbResp = await fetch(
        `${supabaseUrl}/rest/v1/institutional_drive_files?id=eq.${encodeURIComponent(id)}&drive_file_id=eq.${encodeURIComponent(driveFileId)}`,
        {
          method: 'DELETE',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: userAuthHeader,
            Prefer: 'return=representation',
          },
        }
      );

      const deleted = await delDbResp.json().catch(() => []);
      if (!delDbResp.ok || !Array.isArray(deleted) || deleted.length === 0) {
        return res.status(403).json({ error: 'Sem permissão ou arquivo não localizado para exclusão.' });
      }

      await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trashed: true }),
      }).catch((trashErr: unknown) => {
        console.warn('[drive/files] best-effort lixeira Drive:', trashErr instanceof Error ? trashErr.name : 'UnknownError');
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (internalErr: unknown) {
    console.error('[drive/files] Erro interno:', internalErr instanceof Error ? internalErr.name : 'UnknownError');
    return res.status(500).json({ error: 'Erro interno na integração com o Google Drive.' });
  }
}
