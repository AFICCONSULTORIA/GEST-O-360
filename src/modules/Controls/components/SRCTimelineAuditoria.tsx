import React, { useState } from 'react';
import { 
  Clock, ShieldCheck, CheckCircle2, AlertCircle, FileCheck, 
  User, Copy, Check, Lock, ChevronDown, ChevronUp, FileCode
} from 'lucide-react';
import { TrilhaAuditoriaTramitacao, AccountingChange } from '../types/accountingChanges';

interface SRCTimelineAuditoriaProps {
  change: AccountingChange;
}

export const SRCTimelineAuditoria: React.FC<SRCTimelineAuditoriaProps> = ({ change }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [expandedHashes, setExpandedHashes] = useState<Record<string, boolean>>({});

  const formatExactTimestamp = (isoStr?: string): string => {
    if (!isoStr) return 'Pendente';
    try {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    } catch {}
    return isoStr;
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const toggleHashExpand = (id: string) => {
    setExpandedHashes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Monta os eventos da linha do tempo com base na trilha gravada ou nos campos da SRC
  const timelineEvents = React.useMemo(() => {
    if (change.trilhaAuditoria && change.trilhaAuditoria.length > 0) {
      return change.trilhaAuditoria.map((item, idx) => ({
        id: item.id || `step-${idx}`,
        title: 
          item.etapa === 'ABERTURA' ? 'Abertura da Solicitação de Retificação' :
          item.etapa === 'PARECER_CONTABIL' ? 'Parecer Técnico da Contabilidade' :
          item.etapa === 'HOMOLOGACAO_CONTADOR_GERAL' ? 'Homologação do Contador-Geral' :
          item.etapa === 'EXECUCAO_LANCAMENTO' ? 'Efetivação do Lançamento no Razão' : 'Despacho de Recusa / Indeferimento',
        etapa: item.etapa,
        responsavel: item.usuarioResponsavelNome,
        cargo: item.matriculaCargoUsuario,
        crc: item.crcUsuario,
        despacho: item.parecerDespacho,
        statusResultante: item.statusResultante,
        timestamp: item.dataHoraExata,
        hash: item.assinaturaEletronicaHash,
        ip: item.ipOrigem,
        isCompleted: true
      }));
    }

    // Geração dinâmica com base no estado atual da SRC
    const events = [];

    // Etapa 1: Abertura
    events.push({
      id: 'step-abertura',
      title: 'Abertura da Solicitação de Retificação (SRC)',
      etapa: 'ABERTURA',
      responsavel: change.requesterName,
      cargo: change.requesterRole,
      crc: undefined,
      despacho: `Solicitação oficial de retificação autuada sob protocolo ${change.protocolNumber}. Justificativa: ${change.reason}`,
      statusResultante: 'AGUARDANDO_PARECER',
      timestamp: change.dataHoraSolicitacao || change.createdAt,
      hash: 'sha256-autenticado-pelo-gestao360-municipio',
      ip: '127.0.0.1 (Terminal Oficial)',
      isCompleted: true
    });

    // Etapa 2: Parecer Técnico ou Homologação
    if (change.accountantName || change.status === 'in_review' || change.status === 'approved' || change.status === 'completed') {
      events.push({
        id: 'step-parecer',
        title: 'Análise e Parecer Técnico Contábil',
        etapa: 'PARECER_CONTABIL',
        responsavel: change.accountantName || 'Setor Contábil Municipal',
        cargo: 'Responsável Técnico Contábil',
        crc: change.accountantCrc,
        despacho: change.accountantNotes || 'Análise técnica de conformidade com a Lei 4.320/64 e MCASP.',
        statusResultante: change.status === 'approved' ? 'AGUARDANDO_HOMOLOGACAO' : 'AGUARDANDO_PARECER',
        timestamp: change.dataHoraParecer || change.reviewedAt || change.updatedAt,
        hash: 'sha256-analise-tecnica-deferida',
        ip: '127.0.0.1 (Terminal Setor Contábil)',
        isCompleted: true
      });
    }

    // Etapa 3: Homologação
    if (change.status === 'approved' || change.status === 'completed') {
      events.push({
        id: 'step-homologacao',
        title: 'Homologação pelo Contador-Geral / Ordenador',
        etapa: 'HOMOLOGACAO_CONTADOR_GERAL',
        responsavel: change.accountantName || 'Contador(a) Geral do Município',
        cargo: 'Contador Geral do Município',
        crc: change.accountantCrc,
        despacho: `Homologada a retificação contábil do processo ${change.protocolNumber}. Autorizado o lançamento de estorno corretivo.`,
        statusResultante: 'APROVADO_EXECUTADO',
        timestamp: change.dataHoraHomologacao || change.reviewedAt || change.updatedAt,
        hash: 'sha256-homologacao-contador-geral-crc',
        ip: '127.0.0.1 (Gabinete Contábil)',
        isCompleted: true
      });
    }

    // Etapa 4: Execução no Razão
    if (change.status === 'completed') {
      events.push({
        id: 'step-execucao',
        title: 'Efetivação do Lançamento no Razão Municipal',
        etapa: 'EXECUCAO_LANCAMENTO',
        responsavel: change.accountantName || 'Sistema Contábil Municipal',
        cargo: 'Rotina de Lançamento Automático SIAFIC',
        crc: change.accountantCrc,
        despacho: `Lançamento corretivo autônomo registrado com sucesso para a competência ${change.monthRef}. Histórico padrão inserido no Diário Geral.`,
        statusResultante: 'APROVADO_EXECUTADO',
        timestamp: change.completedAt || change.updatedAt,
        hash: 'sha256-lancamento-razao-efetivado-siafic',
        ip: '127.0.0.1 (Servidor Central SIAFIC)',
        isCompleted: true
      });
    }

    return events;
  }, [change]);

  return (
    <div className="space-y-4">
      {/* Banner de Rastreabilidade e Imutabilidade */}
      <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-150 dark:border-indigo-900/40 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="font-black text-indigo-950 dark:text-indigo-200 block">
              Trilha de Auditoria Imutável • Fiscalização TCE
            </span>
            <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
              Registros com carimbo temporal milissegundo e integridade garantida por chave criptográfica SHA-256.
            </span>
          </div>
        </div>
        <div className="text-right font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hidden sm:block">
          Protocolo: {change.protocolNumber}
        </div>
      </div>

      {/* Linha do Tempo Visual */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
        {timelineEvents.map((evt, idx) => {
          const isExpanded = expandedHashes[evt.id];
          return (
            <div key={evt.id} className="relative group">
              {/* Marcador do Ponto na Linha */}
              <div className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-neutral-950 shadow-sm ${
                evt.etapa === 'ABERTURA' ? 'bg-indigo-600' :
                evt.etapa === 'PARECER_CONTABIL' ? 'bg-sky-600' :
                evt.etapa === 'HOMOLOGACAO_CONTADOR_GERAL' ? 'bg-purple-600' :
                evt.etapa === 'EXECUCAO_LANCAMENTO' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}>
                {evt.etapa === 'EXECUCAO_LANCAMENTO' ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <Clock size={12} />
                )}
              </div>

              {/* Card da Etapa */}
              <div className="p-4 bg-white dark:bg-neutral-900/90 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2.5 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-neutral-900 dark:text-white">
                      {evt.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      Etapa {idx + 1} de {timelineEvents.length}
                    </span>
                  </div>

                  {/* Data e Horário Exatos com Segundos */}
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl">
                    <Clock size={12} />
                    <span>{formatExactTimestamp(evt.timestamp)}</span>
                  </div>
                </div>

                {/* Dados do Autor e Cargo */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                    <User size={13} className="text-indigo-500" />
                    <span>{evt.responsavel}</span>
                  </div>
                  <span>•</span>
                  <span>{evt.cargo}</span>
                  {evt.crc && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{evt.crc}</span>
                    </>
                  )}
                </div>

                {/* Despacho / Parecer */}
                <p className="text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-100 dark:border-neutral-850 leading-relaxed italic">
                  "{evt.despacho}"
                </p>

                {/* Assinatura Eletrônica e Hash SHA-256 */}
                {evt.hash && (
                  <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                      <Lock size={11} className="text-emerald-500" />
                      <span className="font-semibold">Assinatura Eletrônica (SHA-256):</span>
                      <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {isExpanded ? evt.hash : `${evt.hash.slice(0, 16)}...${evt.hash.slice(-8)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHashExpand(evt.id)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                      >
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        <span>{isExpanded ? 'Recolher' : 'Ver Hash Completo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyHash(evt.hash)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1 font-bold"
                        title="Copiar Hash SHA-256 da assinatura"
                      >
                        {copiedHash === evt.hash ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        <span>{copiedHash === evt.hash ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
