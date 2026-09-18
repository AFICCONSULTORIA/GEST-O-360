/**
 * Utilitários para visualização e download de arquivos PDF de exames
 */

export const openPdfInNewTab = (dataUrl: string, title?: string) => {
  if (!dataUrl) return;

  if (dataUrl.startsWith('data:application/pdf')) {
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.click();
      }
      return;
    } catch (e) {
      console.error('Erro ao converter base64 para blob:', e);
    }
  }

  window.open(dataUrl, '_blank');
};

export const downloadPdfFile = (dataUrl: string, fileName: string = 'exame_paciente.pdf') => {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return 'Tamanho não informado';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
