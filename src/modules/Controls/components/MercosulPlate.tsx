import React from 'react';

interface MercosulPlateProps {
  plate?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  isOfficial?: boolean;
}

/**
 * Miniatura vetorial da bandeira do Brasil
 */
const BrazilFlagSvg: React.FC = () => (
  <svg width="11" height="8" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 shadow-2xs">
    <rect width="20" height="14" fill="#009B3A" rx="1" />
    <path d="M10 2L18 7L10 12L2 7L10 2Z" fill="#FEDF00" />
    <circle cx="10" cy="7" r="3.2" fill="#002776" />
    <path d="M7.5 7.5C8.8 6.5 11.2 6.5 12.5 7.5" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
  </svg>
);

/**
 * Miniatura vetorial do emblema do Mercosul (Quatro Estrelas do Cruzeiro do Sul)
 */
const MercosulSymbolSvg: React.FC = () => (
  <svg width="8" height="7" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 opacity-90">
    <circle cx="8" cy="2" r="1.3" fill="#FEDF00" />
    <circle cx="3.5" cy="6.5" r="1.3" fill="#FEDF00" />
    <circle cx="12.5" cy="6.5" r="1.3" fill="#FEDF00" />
    <circle cx="8" cy="11.5" r="1.3" fill="#FEDF00" />
  </svg>
);

/**
 * Componente Visual da Placa Oficial no Padrão Mercosul (Resolução CONTRAN)
 * Faixa azul superior com "BRASIL" e bandeira, corpo branco com tipografia condensada e sem quebra de linha.
 */
export const MercosulPlate: React.FC<MercosulPlateProps> = ({
  plate,
  size = 'sm',
  className = '',
  isOfficial = true
}) => {
  const cleanPlate = (plate || 'SEM PLACA').trim().toUpperCase();

  // Dimensões proporcionais por tamanho
  const sizeClasses = {
    xs: {
      container: 'w-[78px] rounded-[3px] border-[1px]',
      topBar: 'h-[10px] px-1',
      title: 'text-[6px] tracking-[0.16em]',
      body: 'py-0.5 px-1',
      text: 'text-[11px] tracking-wide'
    },
    sm: {
      container: 'w-[96px] rounded-[4px] border-[1.5px]',
      topBar: 'h-[12px] px-1.5',
      title: 'text-[7px] tracking-[0.2em]',
      body: 'py-0.5 px-1.5',
      text: 'text-[13px] tracking-wider'
    },
    md: {
      container: 'w-[114px] rounded-[5px] border-[1.5px]',
      topBar: 'h-[14px] px-2',
      title: 'text-[8px] tracking-[0.22em]',
      body: 'py-1 px-2',
      text: 'text-[15px] tracking-widest'
    },
    lg: {
      container: 'w-[140px] rounded-[6px] border-[2px]',
      topBar: 'h-[18px] px-2.5',
      title: 'text-[10px] tracking-[0.25em]',
      body: 'py-1.5 px-3',
      text: 'text-[19px] tracking-widest'
    }
  }[size];

  return (
    <div
      className={`inline-flex flex-col select-none overflow-hidden bg-white border-neutral-900 shadow-xs whitespace-nowrap shrink-0 transition-transform hover:scale-102 ${sizeClasses.container} ${className}`}
      title={`Placa Oficial Mercosul: ${cleanPlate}`}
    >
      {/* Faixa Azul Superior Oficial do Mercosul */}
      <div className={`w-full bg-[#003399] flex items-center justify-between text-white ${sizeClasses.topBar}`}>
        <MercosulSymbolSvg />
        <span className={`font-sans font-black leading-none text-white uppercase ${sizeClasses.title}`}>
          BRASIL
        </span>
        <BrazilFlagSvg />
      </div>

      {/* Corpo da Placa com Numeração Oficial */}
      <div className={`w-full bg-white flex items-center justify-center ${sizeClasses.body}`}>
        <span
          className={`font-mono font-black leading-none text-center ${
            isOfficial ? 'text-[#002776]' : 'text-neutral-950'
          } ${sizeClasses.text}`}
          style={{ fontFeatureSettings: '"tnum" 1' }}
        >
          {cleanPlate}
        </span>
      </div>
    </div>
  );
};

