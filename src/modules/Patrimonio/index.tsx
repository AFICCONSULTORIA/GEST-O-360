import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PatrimonioPrintLayout } from '../Reports';
import { 
  PatrimonioItem, PatrimonioTransferEntry, Institution
} from '../../types';
import { showToast } from '../../components/ui/Toast';
import { WhatsNewBanner } from '../../components/ui/WhatsNewBanner';
import { DemoFillButton } from '../../components/DemoFillButton';

const { 
  Plus, Search, Edit2, Trash2, FileText, ChevronRight, ChevronDown, Download, History, Package, FileSignature, ArrowRight, ChevronLeft, Building2, CircleDollarSign, Home, Truck, X, LayoutGrid, List, Copy, RotateCw, Loader2, ImageOff, ChevronsLeft, ChevronsRight, CheckSquare, Square, QrCode, Printer, UserCheck, ArrowLeftRight
} = LucideIcons;

const compressImage = async (file: File): Promise<File> => {
  try {
    const bitmap = await createImageBitmap(file);
    const MAX_WIDTH = 1280;
    const MAX_HEIGHT = 1280;
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > height) {
      if (width > MAX_WIDTH) {
        height = Math.round(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width = Math.round(width * (MAX_HEIGHT / height));
        height = MAX_HEIGHT;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(bitmap, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          if (blob.type === 'image/png') {
            canvas.toBlob((jpegBlob) => {
              if (jpegBlob) {
                const compressedFile = new File([jpegBlob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            }, 'image/jpeg', 0.8);
          } else {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }
        } else {
          resolve(file);
        }
      }, 'image/webp', 0.8);
    });
  } catch (err) {
    console.error('Erro ao comprimir imagem, enviando original:', err);
    return file;
  }
};

const removePatrimonioStorageFile = async (url?: string) => {
  if (!url) return;
  try {
    const marker = '/certidoes/';
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const storagePath = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
      if (storagePath) {
        await supabase.storage.from('certidoes').remove([storagePath]);
      }
    }
  } catch (err) {
    console.warn('Falha ao remover foto antiga do Storage:', err);
  }
};

const formatCurrencyBRL = (val?: number) => {
  if (val === undefined || val === null || Number.isNaN(Number(val))) return 'Não informado';
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Gera e abre para impressão o Termo Oficial de Guarda e Responsabilidade de Bens Patrimoniais (Padrão TCE)
const openTermoDeGuardaPrint = (
  itemsToPrint: PatrimonioItem[],
  institution?: Institution | null,
  customResponsible?: string
) => {
  if (!itemsToPrint.length) {
    showToast('Selecione pelo menos um bem para emitir o Termo de Guarda.', 'warning');
    return;
  }

  const instName = institution?.name || 'Prefeitura Municipal';
  const instLogo = institution?.logo_url || '';
  const firstItem = itemsToPrint[0];
  const dept = firstItem.department || 'Secretaria Municipal';
  const location = firstItem.location || 'Sede Administrativa';
  const responsible = customResponsible || firstItem.responsiblePerson || '__________________________________________';
  const totalValue = itemsToPrint.reduce((acc, i) => acc + (Number(i.acquisitionValue) || 0), 0);
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const termNumber = `${new Date().getFullYear()}.${String(Math.floor(1000 + Math.random() * 9000))}`;

  const rowsHtml = itemsToPrint.map((item, idx) => `
    <tr>
      <td style="text-align:center; font-family: monospace; font-weight: bold;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold;">${item.code || '-'}</td>
      <td>
        <strong>${item.objectName}</strong>
        ${item.itemType === 'Veículo' ? `<br/><small>Placa: ${item.plate || '-'} | Modelo: ${item.model || '-'} | Chassi: ${item.chassis || '-'}</small>` : ''}
        ${item.invoiceNumber ? `<br/><small>NF/Empenho: ${item.invoiceNumber}</small>` : ''}
      </td>
      <td>${item.department}<br/><small>${item.location}</small></td>
      <td style="text-align:center;">${item.condition} / ${item.status}</td>
      <td style="text-align:right; font-family: monospace;">${item.acquisitionValue ? formatCurrencyBRL(item.acquisitionValue) : '-'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Termo de Guarda e Responsabilidade - ${instName}</title>
      <style>
        @page { size: A4; margin: 18mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; line-height: 1.5; font-size: 12px; margin: 0; padding: 0; }
        .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 20px; }
        .header img { width: 64px; height: 64px; object-fit: contain; }
        .header-text h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
        .header-text p { margin: 2px 0 0; font-size: 11px; color: #4b5563; font-weight: 600; text-transform: uppercase; }
        .doc-title { text-align: center; background: #f3f4f6; border: 1px solid #d1d5db; padding: 10px; border-radius: 6px; margin-bottom: 18px; }
        .doc-title h2 { margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.8px; }
        .doc-title span { font-size: 11px; color: #4b5563; }
        .meta-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; margin-bottom: 18px; }
        .meta-item { font-size: 11px; }
        .meta-item strong { display: block; font-size: 10px; text-transform: uppercase; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .clauses { font-size: 11px; text-align: justify; background: #fff; border: 1px solid #e5e7eb; padding: 14px; border-radius: 6px; margin-bottom: 28px; }
        .clauses ol { margin: 6px 0 0 18px; padding: 0; }
        .clauses li { margin-bottom: 6px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; text-align: center; }
        .sig-line { border-top: 1px solid #111827; padding-top: 8px; font-size: 11px; }
        .footer { margin-top: 36px; border-top: 1px dashed #d1d5db; padding-top: 8px; font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="header">
        ${instLogo ? `<img src="${instLogo}" alt="Brasão" />` : ''}
        <div class="header-text">
          <h1>${instName}</h1>
          <p>Coordenadoria de Controle Patrimonial e Almoxarifado Central</p>
          <p>Sistema Integrado de Governança Pública — Gestão 360</p>
        </div>
      </div>

      <div class="doc-title">
        <h2>Termo de Responsabilidade e Guarda de Bens Patrimoniais</h2>
        <span>Controle Interno / Conformidade TCE • Termo Nº ${termNumber}</span>
      </div>

      <div class="meta-box">
        <div class="meta-item">
          <strong>Unidade / Secretaria de Lotação</strong>
          ${dept}
        </div>
        <div class="meta-item">
          <strong>Localização Física Principal</strong>
          ${location}
        </div>
        <div class="meta-item">
          <strong>Servidor Responsável pela Guarda</strong>
          ${responsible}
        </div>
        <div class="meta-item">
          <strong>Quantidade de Bens / Valor Contábil Total</strong>
          ${itemsToPrint.length} item(ns) • ${totalValue > 0 ? formatCurrencyBRL(totalValue) : 'Valor em conciliação'}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 32px; text-align:center;">#</th>
            <th style="width: 90px;">Tombamento</th>
            <th>Especificação do Bem Patrimonial</th>
            <th style="width: 150px;">Secretaria / Local</th>
            <th style="width: 110px; text-align:center;">Conservação</th>
            <th style="width: 95px; text-align:right;">Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="clauses">
        <strong>DECLARAÇÃO DE RECEBIMENTO E COMPROMISSO DE GUARDA:</strong>
        <ol>
          <li>Declaro, para os devidos fins de direito e auditoria junto ao Controle Interno e ao Tribunal de Contas do Estado (TCE), que recebi os bens patrimoniais acima discriminados em perfeitas condições de identificação e nas condições de conservação indicadas.</li>
          <li>Comprometo-me a zelar pela guarda, conservação e bom uso dos referidos bens públicos, destinando-os exclusivamente ao interesse do serviço público municipal.</li>
          <li>Qualquer movimentação, transferência entre setores, necessidade de manutenção, extravio, furto ou inservibilidade deverá ser comunicada formalmente e de imediato ao Setor de Patrimônio para atualização cadastral e emissão de novo Termo.</li>
          <li>Na hipótese de desligamento, exoneração ou transferência de lotação, comprometo-me a solicitar a conferência e baixa de responsabilidade junto ao Setor de Patrimônio.</li>
        </ol>
      </div>

      <p style="text-align: right; font-weight: bold; margin-bottom: 40px;">
        Emitido em ${dateStr}.
      </p>

      <div class="signatures">
        <div class="sig-line">
          <strong>${responsible}</strong><br/>
          Servidor(a) Responsável pela Guarda<br/>
          <small>Matrícula / CPF: _________________________</small>
        </div>
        <div class="sig-line">
          <strong>Responsável pelo Setor de Patrimônio</strong><br/>
          Conferência e Registro Patrimonial<br/>
          <small>${instName}</small>
        </div>
      </div>

      <div class="footer">
        <span>Documento gerado eletronicamente pelo Sistema Gestão 360</span>
        <span>Data/Hora: ${new Date().toLocaleString('pt-BR')}</span>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 350);
        };
      </script>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  } else {
    showToast('Permita pop-ups no navegador para visualizar e imprimir o Termo de Guarda.', 'warning');
  }
};

// Abre janela de impressão de Etiquetas com QR Code (Térmica ou Folha A4)
const openQrLabelsPrint = (
  itemsToPrint: PatrimonioItem[],
  institution?: Institution | null,
  layout: 'a4' | 'thermal' = 'a4'
) => {
  if (!itemsToPrint.length) {
    showToast('Selecione pelo menos um item para gerar etiquetas.', 'warning');
    return;
  }

  const instName = institution?.name || 'Prefeitura Municipal';

  const cardsHtml = itemsToPrint.map(item => {
    const qrPayload = encodeURIComponent(
      `PATRIMONIO:${item.code}|BEM:${item.objectName}|SEC:${item.department}|ORG:${instName}`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${qrPayload}`;

    return `
      <div class="label-card">
        <div class="qr-box">
          <img src="${qrUrl}" alt="QR ${item.code}" />
        </div>
        <div class="info-box">
          <div class="inst-name">${instName}</div>
          <div class="pat-title">PATRIMÔNIO PÚBLICO</div>
          <div class="pat-code">${item.code || 'S/N'}</div>
          <div class="pat-obj">${item.objectName}</div>
          <div class="pat-dept">${item.department} • ${item.year}</div>
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Etiquetas de Patrimônio QR Code - ${instName}</title>
      <style>
        ${layout === 'a4' ? `
          @page { size: A4; margin: 10mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
          .label-card { border: 1.5px solid #111; border-radius: 4px; padding: 3mm; display: flex; align-items: center; gap: 3mm; height: 28mm; box-sizing: border-box; page-break-inside: avoid; }
          .qr-box img { width: 22mm; height: 22mm; display: block; }
        ` : `
          @page { size: 60mm 40mm; margin: 2mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .grid { display: flex; flex-direction: column; gap: 2mm; }
          .label-card { border: 1.5px solid #111; border-radius: 4px; padding: 2.5mm; display: flex; align-items: center; gap: 3mm; width: 56mm; height: 36mm; box-sizing: border-box; page-break-after: always; }
          .qr-box img { width: 24mm; height: 24mm; display: block; }
        `}
        .info-box { flex: 1; overflow: hidden; }
        .inst-name { font-size: 7px; font-weight: bold; text-transform: uppercase; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pat-title { font-size: 6px; letter-spacing: 0.8px; font-weight: 900; color: #000; margin-top: 1px; }
        .pat-code { font-family: monospace; font-size: 13px; font-weight: 900; color: #000; background: #eee; padding: 1px 4px; border-radius: 2px; display: inline-block; margin: 2px 0; border: 1px solid #999; }
        .pat-obj { font-size: 8px; font-weight: bold; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111; }
        .pat-dept { font-size: 7px; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
      </style>
    </head>
    <body>
      <div class="grid">
        ${cardsHtml}
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 600);
        };
      </script>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    showToast('Permita pop-ups para imprimir as etiquetas QR Code.', 'warning');
  }
};

const PatrimonioModule = ({ 
  items, 
  onAdd, 
  onEdit, 
  onDelete, 
  onDeleteMultiple, 
  canDelete, 
  canEdit = true, 
  userDepartment, 
  availableDepartments = [], 
  currentUserName,
  currentInstitution
}: { 
  items: PatrimonioItem[], 
  onAdd: (item: PatrimonioItem) => void | Promise<void>, 
  onEdit?: (item: PatrimonioItem) => void, 
  onDelete?: (id: string) => void, 
  onDeleteMultiple?: (ids: string[]) => void, 
  canDelete?: boolean, 
  canEdit?: boolean, 
  userDepartment?: string, 
  availableDepartments?: string[], 
  currentUserName?: string,
  currentInstitution?: Institution | null
}) => {
  const [search, setSearch] = React.useState('');
  const [filterDept, setFilterDept] = React.useState('Todos');
  const [filterCond, setFilterCond] = React.useState('Todos');
  const [filterStatus, setFilterStatus] = React.useState('Todos');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [imageModalItem, setImageModalItem] = React.useState<PatrimonioItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [expandedDescId, setExpandedDescId] = React.useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<PatrimonioItem | null>(null);
  const [duplicateModalItem, setDuplicateModalItem] = React.useState<PatrimonioItem | null>(null);
  const [duplicateCount, setDuplicateCount] = React.useState<number | ''>(1);
  const [isRotating, setIsRotating] = React.useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);

  // Novos modais: Transferência/Histórico e Etiquetas QR Code
  const [transferModalItem, setTransferModalItem] = React.useState<PatrimonioItem | null>(null);
  const [transferForm, setTransferForm] = React.useState({
    toDepartment: '',
    toLocation: '',
    toResponsible: '',
    reason: '',
    emitTermAfter: true
  });
  const [qrModalItems, setQrModalItems] = React.useState<PatrimonioItem[] | null>(null);
  const [qrLayout, setQrLayout] = React.useState<'a4' | 'thermal'>('a4');

  const itemsPerPage = 12;
  const formRef = React.useRef<HTMLFormElement>(null);

  const emptyFormData: Partial<PatrimonioItem> = {
    itemType: 'Geral',
    code: '',
    objectName: '',
    location: '',
    status: 'Servível',
    condition: 'Bom',
    department: userDepartment || '',
    year: new Date().getFullYear(),
    imageUrls: [],
    plate: '',
    chassis: '',
    model: '',
    acquisitionValue: undefined,
    acquisitionDate: '',
    invoiceNumber: '',
    responsiblePerson: '',
    transferHistory: []
  };

  const [formData, setFormData] = React.useState<Partial<PatrimonioItem>>(emptyFormData);

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    if (confirm(`Tem certeza que deseja excluir ${selectedItems.length} itens selecionados?`)) {
      // Remove fotos associadas do Storage
      selectedItems.forEach(id => {
        const found = items.find(i => i.id === id);
        found?.imageUrls?.forEach(url => removePatrimonioStorageFile(url));
      });

      if (onDeleteMultiple) {
        onDeleteMultiple(selectedItems);
      } else if (onDelete) {
        selectedItems.forEach(id => onDelete(id));
      }
      setSelectedItems([]);
      setIsSelectionMode(false);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDept, filterCond, filterStatus, viewMode]);

  const handleSave = () => {
    if (formRef.current && !formRef.current.reportValidity()) return;

    const normalizedCode = (formData.code || '').trim().toLowerCase();
    if (!normalizedCode) {
      showToast('Informe o código de tombamento do bem.', 'warning');
      return;
    }

    // Validação de código de tombamento único por prefeitura
    const duplicateCodeItem = items.find(
      i => i.id !== editingItemId && (i.code || '').trim().toLowerCase() === normalizedCode
    );
    if (duplicateCodeItem) {
      showToast(
        `O código de tombamento "${formData.code}" já está em uso pelo item "${duplicateCodeItem.objectName}".`,
        'warning'
      );
      return;
    }

    if (editingItemId && onEdit) {
      const original = items.find(i => i.id === editingItemId);
      let updatedHistory = [...(formData.transferHistory || original?.transferHistory || [])];

      if (
        original &&
        (original.department !== formData.department ||
          original.location !== formData.location ||
          (original.responsiblePerson || '') !== (formData.responsiblePerson || ''))
      ) {
        const entry: PatrimonioTransferEntry = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          fromDepartment: original.department,
          toDepartment: formData.department || original.department,
          fromLocation: original.location,
          toLocation: formData.location || original.location,
          fromResponsible: original.responsiblePerson || 'Não informado',
          toResponsible: formData.responsiblePerson || 'Não informado',
          reason: 'Atualização cadastral de lotação/responsável',
          user: currentUserName || 'Servidor Municipal'
        };
        updatedHistory = [entry, ...updatedHistory];
      }

      onEdit({ ...formData, id: editingItemId, transferHistory: updatedHistory } as PatrimonioItem);
    } else {
      const initialHistory: PatrimonioTransferEntry[] = [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          fromDepartment: 'Incorporação Inicial',
          toDepartment: formData.department || 'Administração',
          fromLocation: '-',
          toLocation: formData.location || '-',
          fromResponsible: '-',
          toResponsible: formData.responsiblePerson || currentUserName || 'Setor de Patrimônio',
          reason: 'Cadastro inicial / tombamento do bem',
          user: currentUserName || 'Servidor Municipal'
        }
      ];

      onAdd({
        ...formData,
        id: crypto.randomUUID(),
        transferHistory: initialHistory
      } as PatrimonioItem);
    }

    setIsModalOpen(false);
    setEditingItemId(null);
    setFormData(emptyFormData);
  };

  const handleConfirmTransfer = () => {
    if (!transferModalItem || !onEdit) return;
    if (!transferForm.toDepartment.trim() || !transferForm.toLocation.trim()) {
      showToast('Preencha a Secretaria de destino e a nova localização.', 'warning');
      return;
    }

    const entry: PatrimonioTransferEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      fromDepartment: transferModalItem.department,
      toDepartment: transferForm.toDepartment.trim(),
      fromLocation: transferModalItem.location,
      toLocation: transferForm.toLocation.trim(),
      fromResponsible: transferModalItem.responsiblePerson || 'Não informado',
      toResponsible: transferForm.toResponsible.trim() || 'Não informado',
      reason: transferForm.reason.trim() || 'Transferência formal entre setores',
      user: currentUserName || 'Servidor Municipal'
    };

    const updatedItem: PatrimonioItem = {
      ...transferModalItem,
      department: transferForm.toDepartment.trim(),
      location: transferForm.toLocation.trim(),
      responsiblePerson: transferForm.toResponsible.trim() || transferModalItem.responsiblePerson,
      transferHistory: [entry, ...(transferModalItem.transferHistory || [])]
    };

    onEdit(updatedItem);
    setTransferModalItem(updatedItem);
    showToast('Transferência patrimonial registrada no histórico!', 'success');

    if (transferForm.emitTermAfter) {
      openTermoDeGuardaPrint([updatedItem], currentInstitution, updatedItem.responsiblePerson);
    }
  };

  const handleRotateImage = async (item: PatrimonioItem, idx: number) => {
    setIsRotating(true);
    try {
      const url = item.imageUrls![idx];
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'image.webp', { type: blob.type });

      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.height;
      canvas.height = bitmap.width; 
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Sem suporte a Canvas');
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
      
      const newBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.8));
      if (!newBlob) throw new Error('Falha ao processar imagem');
      
      const newFile = new File([newBlob], `rotated-${Date.now()}.webp`, { type: 'image/webp' });
      
      showToast('Salvando foto rotacionada...', 'info');
      
      const instFolder = currentInstitution?.id || 'geral';
      const filename = `patrimonio/${instFolder}/${Date.now()}-rotated.webp`;
      const { error: uploadError } = await supabase.storage.from('certidoes').upload(filename, newFile);
      if (uploadError) throw uploadError;
      
      const { data: publicData } = supabase.storage.from('certidoes').getPublicUrl(filename);
      const newUrl = publicData.publicUrl;
      
      const newUrls = [...item.imageUrls!];
      newUrls[idx] = newUrl;
      
      const { error: updateError } = await supabase.from('patrimonio').update({ image_urls: newUrls }).eq('id', item.id);
      if (updateError) throw updateError;
      
      await removePatrimonioStorageFile(url);
      
      if (onEdit) onEdit({ ...item, imageUrls: newUrls });
      setImageModalItem({ ...item, imageUrls: newUrls });
      
      const itemIndex = items.findIndex(i => i.id === item.id);
      if (itemIndex > -1) {
         items[itemIndex].imageUrls = newUrls;
      }
      
      showToast('Foto rotacionada e salva!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao rotacionar a foto', 'error');
    } finally {
      setIsRotating(false);
    }
  };

  const openImageModal = (item: PatrimonioItem) => {
    setActiveImageIdx(0);
    setImageModalItem(item);
  };
  const openEditModal = (item: PatrimonioItem) => {
    setEditingItemId(item.id);
    setFormData(item);
    setIsModalOpen(true);
  };
  const openTransferModal = (item: PatrimonioItem) => {
    setTransferModalItem(item);
    setTransferForm({
      toDepartment: item.department || '',
      toLocation: item.location || '',
      toResponsible: item.responsiblePerson || '',
      reason: '',
      emitTermAfter: true
    });
  };
  const handleDuplicate = (item: PatrimonioItem) => {
    setDuplicateCount(1);
    setDuplicateModalItem(item);
  };

  const confirmDuplicate = () => {
    if (!duplicateModalItem) return;
    const num = duplicateCount === '' ? 0 : duplicateCount;
    if (isNaN(num) || num < 1 || num > 50) {
      showToast("Por favor, insira um número válido entre 1 e 50.", 'error');
      return;
    }

    if (num === 1) {
      setEditingItemId(null);
      setFormData({
        ...duplicateModalItem,
        id: undefined,
        code: duplicateModalItem.code ? `${duplicateModalItem.code}-COPIA` : '',
        plate: duplicateModalItem.plate ? `${duplicateModalItem.plate}` : ''
      });
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
      const createCopies = async () => {
        showToast(`Criando ${num} cópias, aguarde...`, 'info');
        const baseTime = new Date().getTime();
        for (let i = 1; i <= num; i++) {
          const artificialDate = new Date(baseTime - (num - i) * 1000);
          await onAdd({
            ...duplicateModalItem,
            id: crypto.randomUUID(),
            code: duplicateModalItem.code ? `${duplicateModalItem.code}-${i}` : `${Date.now()}-${i}`,
            plate: duplicateModalItem.plate ? `${duplicateModalItem.plate}-${i}` : '',
            createdAt: artificialDate.toISOString()
          } as PatrimonioItem);
        }
        showToast(`${num} cópias criadas com sucesso!`, 'success');
      };
      createCopies();
    }
    setDuplicateModalItem(null);
  };
  
  const filteredItems = React.useMemo(() => {
    return items.filter(i => {
      if (filterDept !== 'Todos' && i.department !== filterDept) return false;
      if (filterCond !== 'Todos' && i.condition !== filterCond) return false;
      if (filterStatus !== 'Todos' && i.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!i.objectName.toLowerCase().includes(s) && 
            !i.code.toLowerCase().includes(s) &&
            !i.department.toLowerCase().includes(s) &&
            !i.location.toLowerCase().includes(s) &&
            !(i.responsiblePerson && i.responsiblePerson.toLowerCase().includes(s)) &&
            !(i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(s)) &&
            !(i.plate && i.plate.toLowerCase().includes(s)) &&
            !(i.model && i.model.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [items, filterDept, filterCond, filterStatus, search]);

  const uniqueDepts = React.useMemo(() => {
    return Array.from(new Set([...availableDepartments, ...items.map(i => i.department)].filter(Boolean)));
  }, [items, availableDepartments]);

  const summaryStats = React.useMemo(() => {
    const total = filteredItems.length;
    const serviveis = filteredItems.filter(i => i.status === 'Servível').length;
    const veiculos = filteredItems.filter(i => i.itemType === 'Veículo').length;
    const totalValue = filteredItems.reduce((acc, i) => acc + (Number(i.acquisitionValue) || 0), 0);
    return { total, serviveis, veiculos, totalValue };
  }, [filteredItems]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 relative print:hidden">
      <WhatsNewBanner 
        version="2.5.0"
        title="Gestão Patrimonial Completa (Padrão TCE)"
        features={[
          "Termo de Guarda e Responsabilidade (PDF): Emita com 1 clique o termo oficial pronto para assinatura do servidor responsável.",
          "Histórico de Transferências: Rastreabilidade completa de movimentações do bem entre secretarias, salas e responsáveis.",
          "Etiquetas com QR Code e Valores Contábeis: Imprima etiquetas térmicas ou A4 com QR Code e controle Valor de Aquisição e Nota Fiscal."
        ]}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Controle de Patrimônio</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Gerencie bens móveis, imóveis, veículos, termos de guarda e transferências da prefeitura.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button 
            onClick={() => window.print()}
            className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-all flex items-center gap-2"
          >
            <Download size={16} />
            Relatório Inventário
          </button>
          <button
            onClick={() => setQrModalItems(selectedItems.length > 0 ? items.filter(i => selectedItems.includes(i.id)) : filteredItems.slice(0, 21))}
            className="bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-sky-100 transition-all flex items-center gap-2"
            title="Gerar Etiquetas de Tombamento com QR Code"
          >
            <QrCode size={16} />
            Etiquetas QR
          </button>
          {canDelete && (
            <button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedItems([]);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${isSelectionMode ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              <CheckSquare size={16} />
              <span className="hidden sm:inline">{isSelectionMode ? 'Cancelar Seleção' : 'Selecionar Vários'}</span>
            </button>
          )}
          <DemoFillButton moduleKey="patrimonio" currentInstitution={currentInstitution} />
          {canEdit && (
            <button 
              onClick={() => {
                setEditingItemId(null);
                setFormData(emptyFormData);
                setIsModalOpen(true);
              }}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-5 py-2.5 rounded-2xl text-xs font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Package size={16} />
              Novo Item
            </button>
          )}
        </div>
      </div>

      {/* Resumo Contábil e Operacional */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Bens Listados</p>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{summaryStats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
            <Package size={20} />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Bens Servíveis</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{summaryStats.serviveis}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <FileSignature size={20} />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Frota / Veículos</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{summaryStats.veiculos}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Truck size={20} />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Valor Contábil (PCASP)</p>
            <p className="text-lg font-black text-neutral-900 dark:text-white mt-1 truncate" title={formatCurrencyBRL(summaryStats.totalValue)}>
              {formatCurrencyBRL(summaryStats.totalValue)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <CircleDollarSign size={20} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSelectionMode && selectedItems.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400 font-bold">
              <CheckSquare size={20} />
              <span>{selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button 
                onClick={() => setSelectedItems(paginatedItems.map(i => i.id))}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mr-2"
              >
                Selecionar Página
              </button>
              <button
                onClick={() => openTermoDeGuardaPrint(items.filter(i => selectedItems.includes(i.id)), currentInstitution)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <FileSignature size={14} />
                Emitir Termo de Guarda ({selectedItems.length})
              </button>
              <button
                onClick={() => setQrModalItems(items.filter(i => selectedItems.includes(i.id)))}
                className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <QrCode size={14} />
                Etiquetas QR ({selectedItems.length})
              </button>
              <button 
                onClick={handleBulkDelete}
                className="bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-rose-500/20"
              >
                <Trash2 size={14} />
                Excluir Selecionados
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-3 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, tombamento, responsável, NF, placa ou localização..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white font-medium"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:flex md:gap-3">
            <select 
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3 py-3 text-xs md:text-sm md:min-w-[180px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white font-semibold cursor-pointer"
            >
              <option value="Todos">Secretarias</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            
            <select 
              value={filterCond}
              onChange={e => setFilterCond(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3 py-3 text-xs md:text-sm md:min-w-[140px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white font-semibold cursor-pointer"
            >
              <option value="Todos">Condição</option>
              <option value="Excelente">Excelente</option>
              <option value="Bom">Bom</option>
              <option value="Ruim">Ruim</option>
              <option value="Muito Ruim">Muito Ruim</option>
            </select>
            
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3 py-3 text-xs md:text-sm md:min-w-[140px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white font-semibold cursor-pointer"
            >
              <option value="Todos">Status</option>
              <option value="Servível">Servível</option>
              <option value="Inservível">Inservível</option>
              <option value="Ocioso">Ocioso</option>
              <option value="Em Manutenção">Em Manutenção</option>
              <option value="Baixado">Baixado</option>
            </select>
          </div>
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl self-end lg:self-auto shadow-sm">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
            title="Visualização em Grid"
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
            title="Visualização em Lista"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedItems.map(item => (
              <motion.div 
                key={item.id}
                className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden group flex flex-col h-full hover:shadow-md hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-300 relative"
              >
                {/* Image Area */}
                <div 
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelection(item.id);
                    } else if (item.imageUrls && item.imageUrls.length > 0) {
                      openImageModal(item);
                    }
                  }}
                  className={`relative aspect-[4/3] bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800/50 overflow-hidden ${isSelectionMode || (item.imageUrls && item.imageUrls.length > 0) ? 'cursor-pointer' : ''}`}
                >
                  {isSelectionMode && (
                    <div className="absolute top-3 left-3 z-20">
                      <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${selectedItems.includes(item.id) ? 'bg-indigo-500 text-white' : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-400 border border-neutral-300 dark:border-neutral-600 backdrop-blur-md'}`}>
                        {selectedItems.includes(item.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                    </div>
                  )}
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <>
                      <img 
                        src={item.imageUrls[0]} 
                        alt={item.objectName} 
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      {item.imageUrls.length > 1 && (
                        <div className="absolute top-3 right-3 bg-neutral-950/85 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-lg border border-white/10 shadow-lg">
                          +{item.imageUrls.length - 1} FOTOS
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 relative overflow-hidden group-hover:scale-105 transition-transform duration-700 ease-out">
                      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                      <div className="relative z-10 p-5 bg-white/60 dark:bg-black/30 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500 ease-out">
                        {item.itemType === 'Veículo' ? (
                          <Truck size={36} strokeWidth={1.5} className="text-neutral-400 dark:text-neutral-500" />
                        ) : (
                          <ImageOff size={36} strokeWidth={1.5} className="text-neutral-400 dark:text-neutral-500" />
                        )}
                      </div>
                      <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 bg-white/60 dark:bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 dark:border-white/10 shadow-sm">
                        Foto Indisponível
                      </span>
                    </div>
                  )}

                  {/* Status & Condition Pills (Floating) */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                    <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-md ${
                      item.condition === 'Excelente' ? 'bg-emerald-500/90 text-white' :
                      item.condition === 'Bom' ? 'bg-sky-500/90 text-white' :
                      item.condition === 'Ruim' ? 'bg-amber-500/90 text-white' :
                      'bg-rose-500/90 text-white'
                    }`}>
                      {item.condition}
                    </span>
                    <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-md ${
                      item.status === 'Servível' ? 'bg-neutral-900/90 text-white dark:bg-white/90 dark:text-neutral-950' :
                      'bg-rose-900/90 text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-mono font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                        #{item.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.acquisitionValue ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                            {formatCurrencyBRL(item.acquisitionValue)}
                          </span>
                        ) : null}
                        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 font-bold">{item.year}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 uppercase" title={item.objectName}>
                        {item.objectName}
                      </h3>

                      {item.itemType === 'Veículo' && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[9px] font-mono bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded border border-neutral-100 dark:border-neutral-800">
                            Placa: <strong className="text-neutral-800 dark:text-neutral-300">{item.plate}</strong>
                          </span>
                          <span className="text-[9px] font-medium bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded border border-neutral-100 dark:border-neutral-800">
                            Modelo: <strong className="text-neutral-800 dark:text-neutral-300">{item.model}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/50 space-y-1.5">
                      <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                        <Building2 size={13} className="text-neutral-400 shrink-0" />
                        <span className="truncate">{item.department}</span>
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <Home size={13} className="text-neutral-400 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </p>
                      {item.responsiblePerson && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-2">
                          <UserCheck size={13} className="shrink-0" />
                          <span className="truncate">Guarda: {item.responsiblePerson}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/50 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openTermoDeGuardaPrint([item], currentInstitution)}
                        className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
                        title="Emitir Termo de Guarda e Responsabilidade (PDF)"
                      >
                        <FileSignature size={15} />
                      </button>
                      <button
                        onClick={() => openTransferModal(item)}
                        className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all"
                        title="Transferir de Secretaria / Histórico de Movimentação"
                      >
                        <ArrowLeftRight size={15} />
                      </button>
                      <button
                        onClick={() => setQrModalItems([item])}
                        className="p-2 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all"
                        title="Etiqueta de Tombamento QR Code"
                      >
                        <QrCode size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="p-2 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                            title="Duplicar item"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
                            title="Editar item"
                          >
                            <Edit2 size={15} />
                          </button>
                        </>
                      )}
                      {(canDelete || (currentUserName && item.createdByName === currentUserName)) && (
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                          title="Excluir item"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {paginatedItems.length === 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-3">
              <p>Nenhum item encontrado.</p>
              <DemoFillButton moduleKey="patrimonio" currentInstitution={currentInstitution} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden transition-all">
              <div 
                className={`px-6 py-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer transition-colors gap-4 ${selectedItems.includes(item.id) ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelection(item.id);
                  } else {
                    setExpandedDescId(expandedDescId === item.id ? null : item.id);
                  }
                }}
              >
                <div className="flex items-center gap-4 flex-1">
                  {isSelectionMode && (
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${selectedItems.includes(item.id) ? 'bg-indigo-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-300 dark:border-neutral-600'}`}>
                      {selectedItems.includes(item.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0 relative">
                    {item.imageUrls && item.imageUrls.length > 0 ? (
                      <div className="w-full h-full relative cursor-pointer group" onClick={(e) => { e.stopPropagation(); openImageModal(item); }}>
                        <img src={item.imageUrls[0]} alt={item.objectName} loading="lazy" className="w-full h-full object-cover rounded-2xl group-hover:opacity-80 transition-opacity" />
                        {item.imageUrls.length > 1 && (
                          <div className="absolute -bottom-1 -right-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 z-10 shadow-sm">
                            +{item.imageUrls.length - 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Package size={20} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-neutral-500">#{item.code}</span>
                      <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100 uppercase">{item.objectName}</h3>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {item.department} • {item.location}
                      {item.responsiblePerson ? ` • Guarda: ${item.responsiblePerson}` : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t border-neutral-100 dark:border-neutral-800 md:border-0">
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openTermoDeGuardaPrint([item], currentInstitution)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all" title="Termo de Guarda (PDF)">
                      <FileSignature size={16} />
                    </button>
                    <button onClick={() => openTransferModal(item)} className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all" title="Transferir / Histórico">
                      <ArrowLeftRight size={16} />
                    </button>
                    <button onClick={() => setQrModalItems([item])} className="p-2 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all" title="Etiqueta QR Code">
                      <QrCode size={16} />
                    </button>
                    {canEdit && (
                      <>
                        <button onClick={() => handleDuplicate(item)} className="p-2 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all" title="Duplicar item">
                          <Copy size={16} />
                        </button>
                        <button onClick={() => openEditModal(item)} className="p-2 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all" title="Editar item">
                          <Edit2 size={16} />
                        </button>
                      </>
                    )}
                    {(canDelete || (currentUserName && item.createdByName === currentUserName)) && (
                      <button onClick={() => setItemToDelete(item)} className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all" title="Excluir item">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <ChevronDown className={`text-neutral-400 transition-transform duration-300 ${expandedDescId === item.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              <AnimatePresence>
                {expandedDescId === item.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Descrição</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{item.description || 'Nenhuma descrição fornecida para este item.'}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Tombamento & NF</p>
                          <p className="text-sm font-mono font-bold text-neutral-900 dark:text-neutral-100">{item.code}</p>
                          <p className="text-xs text-neutral-500">NF/Empenho: {item.invoiceNumber || 'Não informado'}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Lotação & Guarda</p>
                          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.department} — {item.location}</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Responsável: {item.responsiblePerson || 'Não atribuído'}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Valor Contábil / Aquisição</p>
                          <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrencyBRL(item.acquisitionValue)}</p>
                          <p className="text-xs text-neutral-500">
                            {item.acquisitionDate ? `Adquirido em ${new Date(item.acquisitionDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : `Ano: ${item.year}`}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Status / Condição</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">{item.status}</span>
                            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">{item.condition}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {paginatedItems.length === 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-3">
              <p>Nenhum item encontrado.</p>
              <DemoFillButton moduleKey="patrimonio" currentInstitution={currentInstitution} />
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium text-center sm:text-left">
            Mostrando <strong className="text-neutral-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong className="text-neutral-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</strong> de <strong className="text-neutral-900 dark:text-white">{filteredItems.length}</strong> itens
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center hidden sm:flex"
              title="Primeira Página"
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center"
              title="Página Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center ${
                      currentPage === pageNum
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md'
                        : 'border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hidden sm:flex'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center"
              title="Próxima Página"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center hidden sm:flex"
              title="Última Página"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-[30px] md:rounded-[40px] p-6 md:p-10 shadow-2xl custom-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-neutral-100">{editingItemId ? 'Editar Item Patrimonial' : 'Novo Item Patrimonial'}</h3>
                  <p className="text-xs md:text-sm text-neutral-500 mt-1">{editingItemId ? 'Atualize as informações contábeis e de localização do bem.' : 'Cadastre um novo bem móvel, equipamento ou veículo da prefeitura.'}</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 shrink-0 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form 
                ref={formRef}
                onSubmit={(e) => e.preventDefault()}
                className="space-y-6"
              >
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Tipo de Bem</label>
                  <div className="flex gap-4 mt-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 cursor-pointer transition-all ${formData.itemType === 'Geral' ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-600 dark:text-neutral-400'}`}>
                      <input type="radio" name="itemType" className="hidden" checked={formData.itemType === 'Geral'} onChange={() => setFormData({...formData, itemType: 'Geral'})} />
                      <Package size={16} />
                      <span className="text-sm font-bold">Patrimônio Geral</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 cursor-pointer transition-all ${formData.itemType === 'Veículo' ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-600 dark:text-neutral-400'}`}>
                      <input type="radio" name="itemType" className="hidden" checked={formData.itemType === 'Veículo'} onChange={() => setFormData({...formData, itemType: 'Veículo'})} />
                      <Truck size={16} />
                      <span className="text-sm font-bold">Veículo da Frota</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Código de Tombamento (Único)</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: 015/2026"
                      value={formData.code || ''}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Objeto / Especificação</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Cadeira Giratória / Ambulância"
                      value={formData.objectName || ''}
                      onChange={e => setFormData({...formData, objectName: e.target.value.toUpperCase()})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all uppercase font-bold"
                    />
                  </div>
                </div>

                {/* Dados Contábeis PCASP e Responsável pela Guarda */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-emerald-50/40 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ml-1">Servidor Responsável pela Guarda</label>
                    <input 
                      type="text"
                      placeholder="Nome do servidor detentor da guarda"
                      value={formData.responsiblePerson || ''}
                      onChange={e => setFormData({...formData, responsiblePerson: e.target.value})}
                      className="w-full mt-1 bg-white dark:bg-neutral-900 border border-emerald-200/70 dark:border-emerald-800/40 px-4 py-3 rounded-xl text-sm outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ml-1">Valor Aquisição (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={formData.acquisitionValue ?? ''}
                      onChange={e => setFormData({...formData, acquisitionValue: e.target.value ? Number(e.target.value) : undefined})}
                      className="w-full mt-1 bg-white dark:bg-neutral-900 border border-emerald-200/70 dark:border-emerald-800/40 px-4 py-3 rounded-xl text-sm outline-none dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 ml-1">Nº NF / Empenho</label>
                    <input 
                      type="text"
                      placeholder="Ex: NF 4520 / Emp 112"
                      value={formData.invoiceNumber || ''}
                      onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                      className="w-full mt-1 bg-white dark:bg-neutral-900 border border-emerald-200/70 dark:border-emerald-800/40 px-4 py-3 rounded-xl text-sm outline-none dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Descrição Técnica Complementar</label>
                  <textarea 
                    placeholder="Marca, número de série, medidas ou observações de auditoria..."
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={2}
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all resize-none"
                  />
                </div>

                {formData.itemType === 'Veículo' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">Placa</label>
                      <input 
                        required={formData.itemType === 'Veículo'}
                        type="text"
                        placeholder="Ex: ABC-1234"
                        value={formData.plate || ''}
                        onChange={e => setFormData({...formData, plate: e.target.value})}
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-900/50 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">Modelo</label>
                      <input 
                        required={formData.itemType === 'Veículo'}
                        type="text"
                        placeholder="Ex: Fiat Ducato"
                        value={formData.model || ''}
                        onChange={e => setFormData({...formData, model: e.target.value})}
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-900/50 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">Chassi</label>
                      <input 
                        required={formData.itemType === 'Veículo'}
                        type="text"
                        placeholder="Ex: 9BD..."
                        value={formData.chassis || ''}
                        onChange={e => setFormData({...formData, chassis: e.target.value})}
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-900/50 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white transition-all uppercase"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Secretaria</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Administração"
                      value={formData.department || ''}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      onFocus={() => setShowDeptDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDeptDropdown(false), 200)}
                      readOnly={!canDelete && !!userDepartment}
                      className={`w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none transition-all ${!canDelete && !!userDepartment ? 'opacity-60 cursor-not-allowed font-semibold' : 'focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white'}`}
                    />
                    {showDeptDropdown && canDelete && availableDepartments.length > 0 && (
                      <div className="absolute z-[60] w-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto py-2 custom-scrollbar">
                        {availableDepartments.map(d => (
                          <button
                            key={d}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData({...formData, department: d});
                              setShowDeptDropdown(false);
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-sm font-medium transition-colors text-neutral-700 dark:text-neutral-200"
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Localização Específica</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Sala de Reuniões"
                      value={formData.location || ''}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Status</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    >
                      <option value="Servível">Servível</option>
                      <option value="Inservível">Inservível</option>
                      <option value="Ocioso">Ocioso</option>
                      <option value="Em Manutenção">Em Manutenção</option>
                      <option value="Baixado">Baixado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Condição</label>
                    <select 
                      value={formData.condition}
                      onChange={e => setFormData({...formData, condition: e.target.value as any})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    >
                      <option value="Excelente">Excelente</option>
                      <option value="Bom">Bom</option>
                      <option value="Ruim">Ruim</option>
                      <option value="Muito Ruim">Muito Ruim</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Ano de Incorporação</label>
                    <input 
                      required
                      type="number"
                      value={formData.year}
                      onChange={e => setFormData({...formData, year: Number(e.target.value)})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1 mb-1 block">Fotos do Item (Até 5)</label>
                  <div className="flex flex-col gap-4">
                    {(formData.imageUrls?.length || 0) < 5 && (
                      <label className="cursor-pointer bg-neutral-50 dark:bg-neutral-800 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-2xl px-5 py-4 flex flex-col items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                        <input 
                          type="file" 
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []) as File[];
                            if (!files.length) return;
                            
                            const currentImages = formData.imageUrls || [];
                            const remainingSlots = 5 - currentImages.length;
                            const filesToProcess = files.slice(0, remainingSlots);
                            
                            if (files.length > remainingSlots) {
                              showToast(`Você só pode adicionar mais ${remainingSlots} foto(s). O limite é 5.`, 'warning');
                            }

                            showToast('Comprimindo e enviando imagens...', 'info');
                            const instFolder = currentInstitution?.id || 'geral';

                            try {
                              const uploadPromises = filesToProcess.map(async (file) => {
                                try {
                                  const compressedFile = await compressImage(file);
                                  const safeName = compressedFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
                                  const filename = `patrimonio/${instFolder}/${Date.now()}-${safeName}`;
                                  
                                  const { error } = await supabase.storage.from('certidoes').upload(filename, compressedFile);
                                  if (error) throw error;
                                  
                                  const { data } = supabase.storage.from('certidoes').getPublicUrl(filename);
                                  return data.publicUrl;
                                } catch (err) {
                                  console.error("Erro no processamento/upload do arquivo:", file.name, err);
                                  showToast(`Erro ao enviar a imagem ${file.name}`, 'error');
                                  return null;
                                }
                              });

                              const newUrls = await Promise.all(uploadPromises);
                              const validUrls = newUrls.filter((url): url is string => url !== null);

                              if (validUrls.length > 0) {
                                setFormData(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...validUrls] }));
                                showToast('Imagens anexadas com sucesso!', 'success');
                              }
                            } catch (globalErr) {
                              console.error("Erro no processamento de imagens", globalErr);
                              showToast('Erro ao processar as imagens.', 'error');
                            }
                          }}
                        />
                        <Package size={24} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Clique para selecionar até 5 imagens</span>
                      </label>
                    )}
                    {formData.imageUrls && formData.imageUrls.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {formData.imageUrls.map((url, idx) => (
                          <div key={url} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0">
                            <img src={url} alt={`Preview ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                removePatrimonioStorageFile(url);
                                const newUrls = [...formData.imageUrls!];
                                newUrls.splice(idx, 1);
                                setFormData({ ...formData, imageUrls: newUrls });
                              }}
                              className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex flex-col md:flex-row gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 md:py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="button" onClick={handleSave} className="flex-1 py-3.5 md:py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 md:hover:scale-105 transition-all">
                    {editingItemId ? 'Atualizar Item' : 'Salvar Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Transferência de Setor e Histórico Patrimonial (Auditoria TCE) */}
      <AnimatePresence>
        {transferModalItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setTransferModalItem(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[36px] p-8 shadow-2xl space-y-6 custom-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <ArrowLeftRight size={22} className="text-amber-500" />
                    Movimentação & Termo de Guarda
                  </h3>
                  <p className="text-xs font-bold text-neutral-500 mt-1">
                    Bem #{transferModalItem.code} — {transferModalItem.objectName}
                  </p>
                </div>
                <button onClick={() => setTransferModalItem(null)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500">
                  <X size={18} />
                </button>
              </div>

              {canEdit && (
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-700 dark:text-neutral-200">
                      Registrar Transferência de Setor / Responsável
                    </span>
                    <button
                      type="button"
                      onClick={() => openTermoDeGuardaPrint([transferModalItem], currentInstitution)}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <FileSignature size={14} /> Imprimir Termo Atual
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Secretaria de Destino</label>
                      <input
                        type="text"
                        list="pat-depts-list"
                        value={transferForm.toDepartment}
                        onChange={e => setTransferForm({ ...transferForm, toDepartment: e.target.value })}
                        placeholder="Ex: Secretaria de Saúde"
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-sm outline-none dark:text-white"
                      />
                      <datalist id="pat-depts-list">
                        {uniqueDepts.map(d => <option key={d} value={d} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nova Sala / Localização</label>
                      <input
                        type="text"
                        value={transferForm.toLocation}
                        onChange={e => setTransferForm({ ...transferForm, toLocation: e.target.value })}
                        placeholder="Ex: Recepção UBS Centro"
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-sm outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Novo Servidor Responsável</label>
                      <input
                        type="text"
                        value={transferForm.toResponsible}
                        onChange={e => setTransferForm({ ...transferForm, toResponsible: e.target.value })}
                        placeholder="Nome do servidor"
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-sm outline-none dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Motivo / Processo</label>
                      <input
                        type="text"
                        value={transferForm.reason}
                        onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
                        placeholder="Ex: Remanejamento Memo 14/2026"
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-sm outline-none dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transferForm.emitTermAfter}
                        onChange={e => setTransferForm({ ...transferForm, emitTermAfter: e.target.checked })}
                        className="rounded accent-emerald-600"
                      />
                      Emitir Termo de Guarda e Responsabilidade (PDF) após confirmar
                    </label>
                    <button
                      type="button"
                      onClick={handleConfirmTransfer}
                      className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all"
                    >
                      Confirmar Transferência
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                  <History size={14} /> Histórico de Movimentação e Auditoria ({transferModalItem.transferHistory?.length || 0})
                </h4>
                {(!transferModalItem.transferHistory || transferModalItem.transferHistory.length === 0) ? (
                  <p className="text-xs text-neutral-500 italic bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl">
                    Nenhuma transferência anterior registrada para este bem.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {transferModalItem.transferHistory.map((h) => (
                      <div key={h.id} className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 text-xs space-y-1">
                        <div className="flex justify-between items-center text-neutral-400 font-bold">
                          <span>{new Date(h.date).toLocaleString('pt-BR')}</span>
                          <span>Por: {h.user}</span>
                        </div>
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">
                          {h.fromDepartment} ({h.fromLocation || '-'}) → <span className="text-emerald-600 dark:text-emerald-400">{h.toDepartment} ({h.toLocation || '-'})</span>
                        </p>
                        {(h.fromResponsible || h.toResponsible) && (
                          <p className="text-neutral-500">
                            Guarda: {h.fromResponsible || '-'} → <strong>{h.toResponsible || '-'}</strong>
                          </p>
                        )}
                        {h.reason && <p className="text-neutral-500 italic">Motivo: {h.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Etiquetas de Tombamento com QR Code */}
      <AnimatePresence>
        {qrModalItems && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setQrModalItems(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[36px] p-8 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <QrCode size={24} className="text-sky-500" />
                    Etiquetas de Tombamento QR Code
                  </h3>
                  <p className="text-xs font-bold text-neutral-500 mt-1">
                    {qrModalItems.length} {qrModalItems.length === 1 ? 'etiqueta pronta' : 'etiquetas prontas'} para impressão.
                  </p>
                </div>
                <button onClick={() => setQrModalItems(null)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setQrLayout('a4')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    qrLayout === 'a4'
                      ? 'border-neutral-900 dark:border-white bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  <p className="text-xs font-black uppercase">Folha A4 Adesiva</p>
                  <p className="text-[11px] opacity-80 mt-0.5">Grade de 3 colunas (21 por página)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setQrLayout('thermal')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    qrLayout === 'thermal'
                      ? 'border-neutral-900 dark:border-white bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  <p className="text-xs font-black uppercase">Rolo Térmico (Zebra/Elgin)</p>
                  <p className="text-[11px] opacity-80 mt-0.5">Etiqueta individual 60x40mm</p>
                </button>
              </div>

              {/* Preview da primeira etiqueta */}
              {qrModalItems[0] && (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center gap-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=2&data=${encodeURIComponent(`PATRIMONIO:${qrModalItems[0].code}|BEM:${qrModalItems[0].objectName}`)}`}
                    alt="QR Preview"
                    className="w-20 h-20 rounded-lg border border-neutral-300 bg-white p-1 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 truncate">
                      {currentInstitution?.name || 'Prefeitura Municipal'}
                    </p>
                    <p className="text-base font-mono font-black text-neutral-900 dark:text-white mt-0.5">
                      TOMBAMENTO: #{qrModalItems[0].code}
                    </p>
                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
                      {qrModalItems[0].objectName}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {qrModalItems[0].department} • {qrModalItems[0].location}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setQrModalItems(null)}
                  className="flex-1 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => openQrLabelsPrint(qrModalItems, currentInstitution, qrLayout)}
                  className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
                >
                  <Printer size={16} /> Imprimir Etiquetas ({qrModalItems.length})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {imageModalItem && imageModalItem.imageUrls && imageModalItem.imageUrls.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-950/95 backdrop-blur-md"
            onClick={() => setImageModalItem(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl flex flex-col items-center gap-4 p-4"
              onClick={e => e.stopPropagation()}
            >
              {canEdit && (
                <button 
                  onClick={() => handleRotateImage(imageModalItem, activeImageIdx)}
                  disabled={isRotating}
                  className="absolute top-0 right-16 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Rotacionar foto (90°)"
                >
                  {isRotating ? <Loader2 size={20} className="animate-spin" /> : <RotateCw size={20} />}
                </button>
              )}
              
              <button 
                onClick={() => setImageModalItem(null)} 
                className="absolute top-0 right-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-20"
              >
                <X size={20} />
              </button>
              
              <div className="relative w-full aspect-[4/3] max-h-[70vh] flex items-center justify-center bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl group">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={activeImageIdx}
                    src={imageModalItem.imageUrls[activeImageIdx]} 
                    alt={`${imageModalItem.objectName} - Foto ${activeImageIdx + 1}`} 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-contain"
                  />
                </AnimatePresence>
                
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-xl border border-white/10 shadow-lg pointer-events-none">
                  {activeImageIdx + 1} / {imageModalItem.imageUrls.length}
                </div>

                {imageModalItem.imageUrls.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActiveImageIdx(prev => (prev === 0 ? imageModalItem.imageUrls!.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white bg-black/40 hover:bg-black/60 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={() => setActiveImageIdx(prev => (prev === imageModalItem.imageUrls!.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white bg-black/40 hover:bg-black/60 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>

              <div className="text-center text-white mt-2 space-y-1 max-w-xl">
                <h4 className="font-bold text-lg">{imageModalItem.objectName}</h4>
                <p className="text-xs text-white/60 font-medium tracking-wide uppercase">{imageModalItem.department} • {imageModalItem.location}</p>
              </div>

              {imageModalItem.imageUrls.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto max-w-full px-4 py-2 custom-scrollbar">
                  {imageModalItem.imageUrls.map((url, idx) => (
                    <button 
                      key={url}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeImageIdx === idx ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    >
                      <img src={url} alt={`Miniatura ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {duplicateModalItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-neutral-100 dark:border-neutral-800"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Copy size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">Duplicar Item</h3>
                  <p className="text-sm text-neutral-500">Quantas cópias você deseja criar?</p>
                </div>
              </div>

              <div className="mb-6 space-y-4">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs font-bold uppercase text-neutral-400 block mb-1">Item a ser duplicado</span>
                  <strong className="text-neutral-900 dark:text-neutral-200 uppercase truncate block">
                    {duplicateModalItem.objectName}
                  </strong>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setDuplicateCount(Math.max(1, (typeof duplicateCount === 'number' ? duplicateCount : 1) - 1))}
                    className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex-1 relative">
                    <input 
                      type="number" 
                      min="1" 
                      max="50"
                      value={duplicateCount}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setDuplicateCount('');
                          return;
                        }
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setDuplicateCount(Math.min(50, val));
                      }}
                      className="w-full h-12 bg-transparent border-2 border-indigo-100 dark:border-indigo-500/20 rounded-2xl text-center text-xl font-black text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <button 
                    onClick={() => setDuplicateCount(Math.min(50, (typeof duplicateCount === 'number' ? duplicateCount : 0) + 1))}
                    className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                
                <p className="text-xs text-center text-neutral-500 px-4">
                  {duplicateCount === 1 
                    ? "O modal de edição será aberto para você revisar a cópia antes de salvar." 
                    : `Serão criadas ${duplicateCount} cópias numeradas instantaneamente.`}
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setDuplicateModalItem(null)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDuplicate}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-600 shadow-xl shadow-indigo-500/20 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {itemToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-500">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Excluir Item</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  Você está prestes a excluir o item <strong className="text-neutral-900 dark:text-white uppercase">{itemToDelete.objectName}</strong>. Esta ação não pode ser desfeita. Tem certeza que deseja prosseguir?
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    itemToDelete.imageUrls?.forEach(url => removePatrimonioStorageFile(url));
                    onDelete?.(itemToDelete.id);
                    setItemToDelete(null);
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-sm bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-colors"
                >
                  Sim, excluir item
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    
    <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] min-h-screen pb-10">
      <PatrimonioPrintLayout filteredItems={filteredItems} filters={{ search: search, dept: filterDept, cond: filterCond, status: filterStatus }} />
    </div>
    </>
  );
};

export { PatrimonioModule };
