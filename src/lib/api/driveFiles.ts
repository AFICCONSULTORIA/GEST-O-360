import { getApiAuthHeaders } from '../supabase';

export interface DriveFileRecord {
  id: string;
  institution_id: string;
  drive_file_id: string;
  drive_folder_id?: string | null;
  file_name: string;
  mime_type?: string | null;
  size_bytes: number;
  folder_category: string;
  description?: string | null;
  web_view_link?: string | null;
  web_content_link?: string | null;
  uploaded_by_name: string;
  created_at: string;
}

export interface DriveQuotaInfo {
  limitBytes: number;
  usageBytes: number;
  usageInDriveBytes?: number;
  usageInDriveTrashBytes?: number;
}

export interface DriveAccountInfo {
  email: string;
  displayName: string;
}

export interface DriveListResponse {
  configured: boolean;
  quota?: DriveQuotaInfo | null;
  driveAccount?: DriveAccountInfo | null;
  dbTableMissing?: boolean;
  dbError?: string | null;
  files: DriveFileRecord[];
  message?: string;
}

export const MAX_DIRECT_UPLOAD_MB = 3;
export const MAX_DIRECT_UPLOAD_BYTES = MAX_DIRECT_UPLOAD_MB * 1024 * 1024;

export async function listDriveFiles(params: {
  institutionId: string;
  category?: string;
  search?: string;
}): Promise<DriveListResponse> {
  const url = new URL('/api/drive/files', window.location.origin);
  url.searchParams.set('institutionId', params.institutionId || 'inst_1');
  if (params.category && params.category !== 'Todas') {
    url.searchParams.set('category', params.category);
  }
  if (params.search?.trim()) {
    url.searchParams.set('search', params.search.trim());
  }

  const headers = await getApiAuthHeaders();
  const resp = await fetch(url.toString(), { method: 'GET', headers });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(json?.error || `Falha ao listar arquivos do Drive (${resp.status}).`);
  }
  return {
    configured: Boolean(json?.configured),
    quota: json?.quota || null,
    driveAccount: json?.driveAccount || null,
    dbTableMissing: Boolean(json?.dbTableMissing),
    dbError: json?.dbError || null,
    files: Array.isArray(json?.files) ? json.files : [],
    message: json?.message,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadDriveFile(params: {
  file: File;
  institutionId: string;
  institutionName: string;
  category: string;
  description?: string;
  uploadedByName?: string;
}): Promise<DriveFileRecord> {
    if (params.file.size > MAX_DIRECT_UPLOAD_BYTES) {
      throw new Error(
        `O arquivo "${params.file.name}" excede o limite de ${MAX_DIRECT_UPLOAD_MB} MB por envio direto (limite do servidor Vercel).`
      );
    }

    const base64Data = await fileToBase64(params.file);
    const headers = await getApiAuthHeaders();

    const resp = await fetch('/api/drive/files', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        institutionId: params.institutionId || 'inst_1',
        institutionName: params.institutionName || 'Prefeitura Municipal',
        category: params.category || 'Geral',
        fileName: params.file.name,
        mimeType: params.file.type || 'application/octet-stream',
        base64Data,
        description: params.description || '',
        uploadedByName: params.uploadedByName || 'Servidor Público',
      }),
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json?.file) {
      throw new Error(json?.error || `Falha ao enviar arquivo ao Google Drive (${resp.status}).`);
    }
    return json.file as DriveFileRecord;
  }

  export async function fetchDriveFilePreviewUrl(driveFileId: string): Promise<string> {
    const url = new URL('/api/drive/files', window.location.origin);
    url.searchParams.set('downloadId', driveFileId);
    url.searchParams.set('inline', '1');
    const headers = await getApiAuthHeaders();

    const resp = await fetch(url.toString(), { method: 'GET', headers });
    if (!resp.ok) {
      const json = await resp.json().catch(() => ({}));
      throw new Error(json?.error || 'Não foi possível carregar a pré-visualização do arquivo.');
    }

    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  }

  export async function downloadDriveFile(driveFileId: string, fileName: string): Promise<void> {
    const url = new URL('/api/drive/files', window.location.origin);
    url.searchParams.set('downloadId', driveFileId);
    const headers = await getApiAuthHeaders();

    const resp = await fetch(url.toString(), { method: 'GET', headers });
    if (!resp.ok) {
      const json = await resp.json().catch(() => ({}));
      throw new Error(json?.error || 'Não foi possível baixar o arquivo do Google Drive.');
    }

    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName || 'arquivo';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }

  export async function deleteDriveFile(id: string, driveFileId: string): Promise<void> {
    const url = new URL('/api/drive/files', window.location.origin);
    url.searchParams.set('id', id);
    url.searchParams.set('driveFileId', driveFileId);
    const headers = await getApiAuthHeaders();

    const resp = await fetch(url.toString(), { method: 'DELETE', headers });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(json?.error || 'Não foi possível excluir o arquivo.');
    }
  }
