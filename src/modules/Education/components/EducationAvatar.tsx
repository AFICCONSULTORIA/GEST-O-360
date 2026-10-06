import React, { useState } from 'react';
import { User, GraduationCap } from 'lucide-react';

export interface EducationAvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  role?: 'student' | 'teacher';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  badge?: React.ReactNode;
}

const SIZE_MAP = {
  xs: { box: 'w-7 h-7', icon: 14, text: 'text-[10px]' },
  sm: { box: 'w-9 h-9', icon: 18, text: 'text-xs' },
  md: { box: 'w-11 h-11', icon: 22, text: 'text-sm' },
  lg: { box: 'w-16 h-16', icon: 30, text: 'text-lg' },
  xl: { box: 'w-24 h-24', icon: 42, text: 'text-2xl' },
  '2xl': { box: 'w-32 h-32', icon: 56, text: 'text-3xl' },
};

/**
 * Utilitário para otimizar e comprimir imagens de perfil em Base64
 * Reduz a resolução para maxDimension (padrão 320px) e comprime em JPEG
 */
export async function optimizeAvatarImage(file: File, maxDimension = 320, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Mantém proporção com crop centralizado quadrado
        const minSide = Math.min(width, height);
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        const targetSize = Math.min(minSide, maxDimension);
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Desenha imagem quadrada cortada centralizada
        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, targetSize, targetSize);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Falha ao processar arquivo de imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Obtém iniciais do nome para avatar fallback
 */
export function getInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const EducationAvatar: React.FC<EducationAvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  role = 'student',
  size = 'md',
  className = '',
  badge,
}) => {
  const [hasError, setHasError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  // Se a fonte mudar, reseta o estado de erro
  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  const hasValidPhoto = Boolean(src && typeof src === 'string' && src.trim().length > 0 && !hasError);

  // Paleta do fallback
  const isTeacher = role === 'teacher';
  
  // Gradiente temático para ícone padrão
  const defaultGradient = isTeacher
    ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-indigo-500/20'
    : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-emerald-500/20';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeConfig.box} ${className}`}>
      <div 
        className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center select-none shadow-sm transition-transform ${
          hasValidPhoto ? 'bg-neutral-100 dark:bg-neutral-800' : defaultGradient
        }`}
      >
        {hasValidPhoto ? (
          <img
            src={src || ''}
            alt={alt || name || 'Avatar'}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            {isTeacher ? (
              <GraduationCap 
                size={sizeConfig.icon} 
                className="drop-shadow-sm transition-transform group-hover:scale-110" 
              />
            ) : (
              <User 
                size={sizeConfig.icon} 
                className="drop-shadow-sm transition-transform group-hover:scale-110" 
              />
            )}
          </div>
        )}
      </div>

      {badge && (
        <div className="absolute -bottom-0.5 -right-0.5 z-10">
          {badge}
        </div>
      )}
    </div>
  );
};
