import { getApiAuthHeaders } from '../supabase';

export interface DriveFolderRecord {
  id: string;
  institution_id: string;
  name: string;
  parent_id?: string | null;
  color: string;
  drive_folder_id?: string | null;
  created_by_id?: string | null;
  created_by_name: string;
  created_at: string;
  updated_at?: string;
}

export interface DriveFileRecord {
  id: string;
  institution_id: string;
  drive_file_id: string;
  drive_folder_id?: string | null;
  folder_id?: string | null;
  file_name: string;
  mime_type?: string | null;
  size_bytes: number;
  folder_category: string;
  description?: string | null;
  is_starred?: boolean;
  tags?: string[] | null;
  web_view_link?: string | null;
  web_content_link?: string | null;
  uploaded_by_name: string;
  created_at: string;
  updated_at?: string;
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
  foldersTableMissing?: boolean;
  folders: DriveFolderRecord[];
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
    foldersTableMissing: Boolean(json?.foldersTableMissing),
    folders: Array.isArray(json?.folders) ? json.folders : [],
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
  folderId?: string | null;
  targetDriveFolderId?: string | null;
  tags?: string[];
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
      action: 'upload',
      institutionId: params.institutionId || 'inst_1',
      institutionName: params.institutionName || 'Prefeitura Municipal',
      category: params.category || 'Geral',
      folderId: params.folderId || null,
      targetDriveFolderId: params.targetDriveFolderId || null,
      tags: params.tags || [],
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

export async function createDriveFolder(params: {
  institutionId: string;
  institutionName: string;
  name: string;
  parentId?: string | null;
  parentDriveFolderId?: string | null;
  color?: string;
  createdByName?: string;
}): Promise<DriveFolderRecord> {
  const headers = await getApiAuthHeaders();
  const resp = await fetch('/api/drive/files', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'create_folder',
      institutionId: params.institutionId || 'inst_1',
      institutionName: params.institutionName || 'Prefeitura Municipal',
      name: params.name.trim(),
      parentId: params.parentId || null,
      parentDriveFolderId: params.parentDriveFolderId || null,
      color: params.color || 'blue',
      createdByName: params.createdByName || 'Servidor Público',
    }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.folder) {
    throw new Error(json?.error || `Não foi possível criar a pasta (${resp.status}).`);
  }
  return json.folder as DriveFolderRecord;
}

export async function updateDriveFolder(params: {
  id: string;
  name?: string;
  color?: string;
  parentId?: string | null;
}): Promise<DriveFolderRecord> {
  const headers = await getApiAuthHeaders();
  const resp = await fetch('/api/drive/files', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      resource: 'folder',
      id: params.id,
      ...(params.name !== undefined ? { name: params.name } : {}),
      ...(params.color !== undefined ? { color: params.color } : {}),
      ...(params.parentId !== undefined ? { parentId: params.parentId } : {}),
    }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.folder) {
    throw new Error(json?.error || `Não foi possível atualizar a pasta (${resp.status}).`);
  }
  return json.folder as DriveFolderRecord;
}

export async function deleteDriveFolder(id: string): Promise<void> {
  const url = new URL('/api/drive/files', window.location.origin);
  url.searchParams.set('resource', 'folder');
  url.searchParams.set('id', id);
  const headers = await getApiAuthHeaders();

  const resp = await fetch(url.toString(), { method: 'DELETE', headers });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(json?.error || 'Não foi possível excluir a pasta.');
  }
}

export async function updateDriveFile(params: {
  id: string;
  driveFileId?: string;
  fileName?: string;
  description?: string | null;
  folderCategory?: string;
  folderId?: string | null;
  targetDriveFolderId?: string | null;
  previousDriveFolderId?: string | null;
  isStarred?: boolean;
  tags?: string[];
}): Promise<DriveFileRecord> {
  const headers = await getApiAuthHeaders();
  const resp = await fetch('/api/drive/files', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      resource: 'file',
      ...params,
    }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json?.file) {
    throw new Error(json?.error || `Não foi possível atualizar o arquivo (${resp.status}).`);
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
