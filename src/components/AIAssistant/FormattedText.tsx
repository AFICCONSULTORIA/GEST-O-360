import React from 'react';

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Renderizador de texto formatado para mensagens de chat.
 * Converte **negrito**, *itálico*, `código` e listas para elementos React estilizados,
 * garantindo que nunca apareçam asteriscos literais (**) na tela.
 */
export const FormattedText: React.FC<FormattedTextProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Quebra por linhas mantendo a estrutura
  const lines = content.split('\n');

  // Função para parsear inline (**negrito**, *itálico*, `código`)
  const parseInline = (text: string): React.ReactNode[] => {
    // Regex para capturar **negrito**, *itálico* ou `código`
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        const inner = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold text-neutral-950 dark:text-white">
            {inner}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
        const inner = part.slice(1, -1);
        return (
          <em key={index} className="italic opacity-90">
            {inner}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        const inner = part.slice(1, -1);
        return (
          <code 
            key={index} 
            className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[11px] border border-amber-500/20"
          >
            {inner}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Linha em branco
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // Itens de Lista (- item ou * item ou • item)
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || (trimmed.startsWith('* ') && !trimmed.startsWith('**'))) {
          const itemText = trimmed.replace(/^[-•*]\s+/, '');
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              <div className="flex-1">{parseInline(itemText)}</div>
            </div>
          );
        }

        // Títulos em Markdown (### ou ##)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lineIdx} className="font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-2 mb-1">
              {parseInline(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={lineIdx} className="font-black text-sm text-neutral-950 dark:text-white mt-2 mb-1">
              {parseInline(trimmed.replace(/^##\s+/, ''))}
            </h3>
          );
        }

        // Parágrafo regular
        return (
          <p key={lineIdx} className="leading-relaxed">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
};

export default FormattedText;

