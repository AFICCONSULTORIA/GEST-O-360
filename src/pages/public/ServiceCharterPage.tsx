import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Search,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Institution } from '../../types';
import { PublicInstitutionalLayout } from '../../layouts/PublicInstitutionalLayout';
import {
  CitizenServiceItem,
  fetchCitizenServiceCharter,
  voteServiceCharter,
} from '../../lib/api/pntpPortal';
import { withInstitutionQuery } from '../../lib/institutionModules';
import { showToast } from '../../components/ui/Toast';

export interface ServiceCharterPageProps {
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

function buildBaselineServices(institution: Institution): CitizenServiceItem[] {
  return [
    {
      id: 'svc-cnd',
      institution_id: institution.id,
      department_id: null,
      title: 'Emissão de Certidão Negativa de Débitos (CND)',
      category: 'Tributação e Finanças',
      target_audience: 'Contribuintes (Pessoas Físicas e Jurídicas)',
      requirements: 'Não possuir débitos tributários vencidos inscritos em dívida ativa municipal.',
      required_documents: ['CPF ou CNPJ', 'Inscrição Imobiliária ou Mobiliária'],
      steps: [
        'Acessar o Balcão Digital ou Setor de Tributos.',
        'Informar CPF/CNPJ ou inscrição cadastral.',
        'Emitir a certidão em PDF com código de autenticidade.',
      ],
      max_deadline: 'Imediato (online) ou até 2 dias úteis (presencial)',
      fees: 'Gratuito',
      service_channels: 'Portal Digital e Atendimento Presencial no Setor de Tributos',
      online_url: withInstitutionQuery('/portal', institution),
      satisfaction_yes: 48,
      satisfaction_no: 2,
    },
    {
      id: 'svc-nfse',
      institution_id: institution.id,
      department_id: null,
      title: 'Emissão e Validação de Nota Fiscal de Serviços Eletrônica (NFS-e)',
      category: 'Tributação e Finanças',
      target_audience: 'Prestadores de Serviços e Tomadores',
      requirements: 'Cadastro Municipal de Contribuintes (Alvará) ativo.',
      required_documents: ['CNPJ', 'Credencial de acesso ou Certificado Digital ICP-Brasil'],
      steps: [
        'Acessar o módulo /notafiscal.',
        'Informar os dados do tomador e do serviço prestado.',
        'Transmitir e validar o documento fiscal eletrônico.',
      ],
      max_deadline: 'Imediato',
      fees: 'Gratuito (incidência de ISSQN conforme alíquota municipal)',
      service_channels: '100% Online (/notafiscal)',
      online_url: withInstitutionQuery('/notafiscal', institution),
      satisfaction_yes: 64,
      satisfaction_no: 3,
    },
    {
      id: 'svc-esic',
      institution_id: institution.id,
      department_id: null,
      title: 'Pedido de Acesso à Informação Pública (e-SIC / LAI)',
      category: 'Transparência e Controle',
      target_audience: 'Qualquer cidadão',
      requirements: 'Sem exigência de justificativa ou motivação.',
      required_documents: ['Nome do solicitante e canal de retorno (e-mail ou presencial)'],
      steps: [
        'Preencher formulário no e-SIC.',
        'Guardar o número de protocolo gerado.',
        'Acompanhar a resposta no prazo legal de até 20 dias (+10 prorrogáveis).',
      ],
      max_deadline: '20 dias corridos (prorrogável por +10 dias)',
      fees: 'Gratuito',
      service_channels: 'Portal e-SIC (/esic) e SIC Físico',
      online_url: withInstitutionQuery('/esic', institution),
      satisfaction_yes: 39,
      satisfaction_no: 1,
    },
  ];
}

export const ServiceCharterPage: React.FC<ServiceCharterPageProps> = ({
  institution,
  darkMode,
  setDarkMode,
}) => {
  const [services, setServices] = useState<CitizenServiceItem[]>([]);
  const [search, setSearch] = useState('');
  const [votedMap, setVotedMap] = useState<Record<string, 'yes' | 'no'>>({});

  useEffect(() => {
    let active = true;
    fetchCitizenServiceCharter(institution.id).then((rows) => {
      if (!active) return;
      setServices(rows.length > 0 ? rows : buildBaselineServices(institution));
    });
    return () => {
      active = false;
    };
  }, [institution]);

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.target_audience || '').toLowerCase().includes(q)
    );
  }, [services, search]);

  const handleVote = async (svc: CitizenServiceItem, useful: boolean) => {
    if (votedMap[svc.id]) return;
    setVotedMap((prev) => ({ ...prev, [svc.id]: useful ? 'yes' : 'no' }));
    setServices((prev) =>
      prev.map((item) =>
        item.id === svc.id
          ? {
              ...item,
              satisfaction_yes: item.satisfaction_yes + (useful ? 1 : 0),
              satisfaction_no: item.satisfaction_no + (useful ? 0 : 1),
            }
          : item
      )
    );
    await voteServiceCharter(svc.id, useful);
    showToast('Avaliação registrada! Obrigado por contribuir com a melhoria dos serviços.', 'success');
  };

  return (
    <PublicInstitutionalLayout
      institution={institution}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      activeNav="carta-de-servicos"
      pageTitle="Carta de Serviços ao Usuário"
      pageSubtitle="Catálogo oficial padronizado nos termos da Lei Federal nº 13.460/2017 e Lei nº 14.129/2021 (Governo Digital), com prazos, requisitos, etapas e avaliação cidadã."
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar serviço público (ex.: CND, NFS-e, IPTU, e-SIC)..."
              aria-label="Buscar serviço na Carta de Serviços"
              className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((svc) => {
            const voted = votedMap[svc.id];
            return (
              <article
                key={svc.id}
                className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-[11px] font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                      {svc.category}
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {svc.title}
                    </h2>
                  </div>
                  {svc.online_url && (
                    <a
                      href={svc.online_url}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800"
                    >
                      <ExternalLink size={13} />
                      Acessar Serviço Digital
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/60">
                    <p className="font-bold text-slate-900 dark:text-white mb-1">Público-Alvo</p>
                    <p className="text-slate-600 dark:text-neutral-300">{svc.target_audience || 'Cidadãos em geral'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/60">
                    <p className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1">
                      <Clock size={13} /> Prazo Máximo
                    </p>
                    <p className="text-slate-600 dark:text-neutral-300">{svc.max_deadline || 'Conforme demanda'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/60">
                    <p className="font-bold text-slate-900 dark:text-white mb-1">Taxas / Custos</p>
                    <p className="text-slate-600 dark:text-neutral-300">{svc.fees || 'Gratuito'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                      <FileText size={13} /> Requisitos e Documentos Necessários
                    </p>
                    {svc.requirements && (
                      <p className="text-slate-600 dark:text-neutral-400 mb-1.5">{svc.requirements}</p>
                    )}
                    <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-neutral-300">
                      {(svc.required_documents || []).map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Etapas de Atendimento
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-neutral-300">
                      {(Array.isArray(svc.steps) ? svc.steps : []).map((step, idx) => (
                        <li key={idx}>{String(step)}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Widget de Avaliação de Satisfação (Lei 13.460/2017) */}
                <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-700 dark:text-neutral-300">
                    Esta informação foi útil?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={Boolean(voted)}
                      onClick={() => handleVote(svc, true)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                        voted === 'yes'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <ThumbsUp size={13} />
                      Sim ({svc.satisfaction_yes})
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(voted)}
                      onClick={() => handleVote(svc, false)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                        voted === 'no'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <ThumbsDown size={13} />
                      Não ({svc.satisfaction_no})
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </PublicInstitutionalLayout>
  );
};

export default ServiceCharterPage;
