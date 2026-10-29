import { PatrimonioItem, PatrimonioTransferEntry } from '../types';

const META_MARKER_START = '\n<!--G360_PAT_META:';
const META_MARKER_END = '-->';

interface PatrimonioEmbeddedMeta {
  acquisitionValue?: number;
  acquisitionDate?: string;
  invoiceNumber?: string;
  responsiblePerson?: string;
  transferHistory?: PatrimonioTransferEntry[];
}

export function stripPatrimonioMetaFromDescription(rawDescription?: string | null): {
  cleanDescription: string;
  meta: PatrimonioEmbeddedMeta;
} {
  if (!rawDescription) {
    return { cleanDescription: '', meta: {} };
  }

  const startIdx = rawDescription.indexOf(META_MARKER_START);
  if (startIdx === -1) {
    return { cleanDescription: rawDescription, meta: {} };
  }

  const cleanDescription = rawDescription.slice(0, startIdx).trimEnd();
  const jsonStart = startIdx + META_MARKER_START.length;
  const endIdx = rawDescription.indexOf(META_MARKER_END, jsonStart);

  if (endIdx === -1) {
    return { cleanDescription, meta: {} };
  }

  try {
    const jsonStr = rawDescription.slice(jsonStart, endIdx);
    const meta = JSON.parse(jsonStr) as PatrimonioEmbeddedMeta;
    return { cleanDescription, meta: meta || {} };
  } catch {
    return { cleanDescription, meta: {} };
  }
}

export function packPatrimonioDescription(item: Partial<PatrimonioItem>): string {
  const { cleanDescription } = stripPatrimonioMetaFromDescription(item.description);
  const meta: PatrimonioEmbeddedMeta = {};

  if (item.acquisitionValue !== undefined && item.acquisitionValue !== null && !Number.isNaN(Number(item.acquisitionValue))) {
    meta.acquisitionValue = Number(item.acquisitionValue);
  }
  if (item.acquisitionDate) {
    meta.acquisitionDate = item.acquisitionDate;
  }
  if (item.invoiceNumber) {
    meta.invoiceNumber = item.invoiceNumber;
  }
  if (item.responsiblePerson) {
    meta.responsiblePerson = item.responsiblePerson;
  }
  if (item.transferHistory && item.transferHistory.length > 0) {
    meta.transferHistory = item.transferHistory;
  }

  if (Object.keys(meta).length === 0) {
    return cleanDescription;
  }

  return `${cleanDescription}${META_MARKER_START}${JSON.stringify(meta)}${META_MARKER_END}`;
}

export function mapDbRowToPatrimonioItem(row: any): PatrimonioItem {
  const { cleanDescription, meta } = stripPatrimonioMetaFromDescription(row.description);

  return {
    ...row,
    itemType: row.item_type || row.itemType || 'Geral',
    objectName: row.object_name || row.objectName || '',
    imageUrls: row.image_urls || row.imageUrls || [],
    description: cleanDescription,
    createdByName: row.created_by_name || row.createdByName,
    createdAt: row.created_at || row.createdAt,
    acquisitionValue: row.acquisition_value ?? row.acquisitionValue ?? meta.acquisitionValue,
    acquisitionDate: row.acquisition_date ?? row.acquisitionDate ?? meta.acquisitionDate,
    invoiceNumber: row.invoice_number ?? row.invoiceNumber ?? meta.invoiceNumber,
    responsiblePerson: row.responsible_person ?? row.responsiblePerson ?? meta.responsiblePerson,
    transferHistory: row.transfer_history ?? row.transferHistory ?? meta.transferHistory ?? []
  } as PatrimonioItem;
}

