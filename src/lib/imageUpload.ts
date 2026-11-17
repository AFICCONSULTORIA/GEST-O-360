import { supabase, supabaseAnon } from './supabase';

export interface ImageCompressOptions {
  maxDimension?: number;
  quality?: number;
  preferWebp?: boolean;
}

/**
 * Redimensiona e comprime uma imagem no navegador (WebP com fallback para JPEG)
 * para evitar envio de arquivos pesados e nunca sobrecarregar o banco de dados.
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressOptions = {}
): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  const maxDim = options.maxDimension ?? 960;
  const quality = options.quality ?? 0.7;
  const preferWebp = options.preferWebp ?? true;

  const encodeCanvas = (
    source: CanvasImageSource,
    origW: number,
    origH: number
  ): Promise<File> => {
    let width = origW;
    let height = origH;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round(height * (maxDim / width));
        width = maxDim;
      } else {
        width = Math.round(width * (maxDim / height));
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);
    }

    const cleanBase = (file.name || 'imagem').replace(/\.[^/.]+$/, '');
    const mime = preferWebp ? 'image/webp' : 'image/jpeg';
    const ext = preferWebp ? 'webp' : 'jpg';

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(new File([blob], `${cleanBase}.${ext}`, { type: blob.type || mime }));
            return;
          }
          // Fallback para JPEG caso o navegador não suporte WebP no canvas
          canvas.toBlob(
            (jpgBlob) => {
              if (jpgBlob) {
                resolve(new File([jpgBlob], `${cleanBase}.jpg`, { type: 'image/jpeg' }));
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        },
        mime,
        quality
      );
    });
  };

  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      const out = await encodeCanvas(bitmap, bitmap.width, bitmap.height);
      try {
        bitmap.close();
      } catch {
        // ignore
      }
      return out;
    }
  } catch {
    // Fallback para Image + ObjectURL (Safari iOS / WebViews Android)
  }

  try {
    return await new Promise<File>((resolve) => {
      const objUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        URL.revokeObjectURL(objUrl);
        try {
          const out = await encodeCanvas(
            img,
            img.naturalWidth || img.width,
            img.naturalHeight || img.height
          );
          resolve(out);
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(file);
      };
      img.src = objUrl;
    });
  } catch {
    return file;
  }
}

export interface StorageImageUploadOptions extends ImageCompressOptions {
  buckets: string[];
  folder: string;
}

/**
 * Comprime a imagem e envia para o Supabase Storage (salvando apenas a URL pública
 * no banco Postgres em vez de strings Base64 pesadas).
 */
export async function uploadOptimizedImageToStorage(
  file: File,
  options: StorageImageUploadOptions
): Promise<string> {
  const compressed = await compressImageFile(file, options);
  const ext = compressed.type === 'image/webp' ? 'webp' : compressed.type === 'application/pdf' ? 'pdf' : 'jpg';
  const contentType = compressed.type || 'image/jpeg';
  const fileName = `${options.folder}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;

  for (const bucket of options.buckets) {
    try {
      let uploadRes = await supabase.storage
        .from(bucket)
        .upload(fileName, compressed, {
          contentType,
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadRes.error) {
        uploadRes = await supabaseAnon.storage
          .from(bucket)
          .upload(fileName, compressed, {
            contentType,
            cacheControl: '31536000',
            upsert: true,
          });
      }

      if (!uploadRes.error) {
        const { data } = supabaseAnon.storage.from(bucket).getPublicUrl(fileName);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    } catch {
      // tenta próximo bucket
    }
  }

  throw new Error('Não foi possível enviar a imagem para o Storage. Verifique os buckets no Supabase.');
}
