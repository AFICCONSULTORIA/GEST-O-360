import React from 'react';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileCheck2,
  FileText,
  Headphones,
  HelpCircle,
  Landmark,
  Receipt,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Institution } from '../../types';
import { PublicInstitutionalLayout } from '../../layouts/PublicInstitutionalLayout';
import { withInstitutionQuery } from '../../lib/institutionModules';
import { showToast } from '../../components/ui/Toast';

export interface InstitutionalPortalHomeProps {
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const InstitutionalPortalHome: React.FC<InstitutionalPortalHomeProps> = ({
  institution,
  darkMode,
  setDarkMode,
}) => {
  const handleGovBrLogin = () => {
    const govBrClientId = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOVBR_CLIENT_ID;
    if (govBrClientId) {
      const redirectUri = encodeURIComponent(window.location.origin + '/portal');
      window.location.href = `https://sso.acesso.gov.br/authorize?response_type=code&client_id=${govBrClientId}&scope=openid+email+profile&redirect_uri=${redirectUri}`;
      return;
    }
    showToast(
      'Integração OAuth2/OIDC Gov.br pronta: configure VITE_GOVBR_CLIENT_ID para habilitar a autenticação em produção.',
      'info'
    );
  };

  const quickServices = [
    {
      title: 'Emissão de CND',
      desc: 'Certidão Negativa de Débitos municipais com validação digital.',
      href: withInstitutionQuery('/carta-de-servicos', institution),
      icon: FileCheck2,
    },
    {
      title: '2ª Via de IPTU',
      desc: 'Consulta de guias, parcelamentos e tributos imobiliários.',
      href: withInstitutionQuery('/carta-de-servicos', institution),
      icon: Receipt,
    },
    {
      title: 'NFS-e (Nota Fiscal)',
      desc: 'Emissão e auditoria de Nota Fiscal de Serviços Eletrônica.',
      href: withInstitutionQuery('/notafiscal', institution),
      icon: FileText,
    },
    {
      title: 'Protocolo Eletrônico',
      desc: 'Abertura e acompanhamento de requerimentos digitais.',
      href: withInstitutionQuery('/esic', institution),
      icon: ClipboardList,
    },
  ];

  const transparencyPillars = [
    {
      title: 'Portal da Transparência',
      desc: 'Receitas, despesas, licitações (14.133/21), contratos, obras, folha nominal e dados abertos.',
      href: withInstitutionQuery('/transparencia', institution),
      icon: Landmark,
    },
    {
      title: 'e-SIC (Acesso à Informação)',
      desc: 'Pedidos sem justificativa, prazo legal de 20+10 dias e recursos em 1ª e 2ª instância.',
      href: withInstitutionQuery('/esic', institution),
      icon: ShieldCheck,
    },
    {
      title: 'Ouvidoria Municipal',
      desc: 'Manifestações, elogios, reclamações e modo explícito de Denúncia Anônima.',
      href: withInstitutionQuery('/ouvidoria', institution),
      icon: Headphones,
    },
    {
      title: 'Carta de Serviços',
      desc: 'Catálogo padronizado Lei 13.460/2017 com etapas, prazos e avaliação cidadã.',
      href: withInstitutionQuery('/carta-de-servicos', institution),
      icon: ClipboardList,
    },
    {
      title: 'Organograma e Quem é Quem',
      desc: 'Estrutura administrativa, secretarias, competências legais e contatos oficiais.',
      href: withInstitutionQuery('/estrutura', institution),
      icon: Building2,
    },
    {
      title: 'Legislação e Diário Oficial',
      desc: 'Lei Orgânica, Código Tributário, Plano Diretor (Original/Compilado) e ICP-Brasil.',
      href: withInstitutionQuery('/legislacao', institution),
      icon: Scale,
    },
    {
      title: 'Perguntas Frequentes (FAQ)',
      desc: 'Dúvidas recorrentes sobre transparência, LAI, serviços e LGPD.',
      href: withInstitutionQuery('/perguntas-frequentes', institution),
      icon: HelpCircle,
    },
  ];

  return (
    <PublicInstitutionalLayout
      institution={institution}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      activeNav="portal"
      pageTitle={`Portal Institucional Público — ${institution.name}`}
      pageSubtitle="Acesso unificado a serviços digitais, transparência pública (PNTP Selo Diamante), acesso à informação (LAI) e controle social em estrita conformidade com o Art. 37, §1º da Constituição Federal."
    >
      <div className="space-y-10">
        {/* Balcão de Autoatendimento + Login Único Gov.br */}
        <section
          aria-label="Balcão de Autoatendimento ao Cidadão"
          className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Balcão de Autoatendimento Digital
              </h2>
              <p className="text-xs text-slate-600 dark:text-neutral-400">
                Serviços digitais essenciais conforme a Lei do Governo Digital (Lei nº 14.129/2021).
              </p>
            </div>
            <button
              type="button"
              onClick={handleGovBrLogin}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#1351B4] hover:bg-[#0c3c8c] text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
            >
              <UserCheck size={15} />
              Entrar com gov.br
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickServices.map((svc) => {
              const Icon = svc.icon;
              return (
                <a
                  key={svc.title}
                  href={svc.href}
                  className="group p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/40 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition flex flex-col justify-between gap-3"
                >
                  <div>
                    <Icon size={20} className="mb-2.5 text-slate-700 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-slate-900" />
                    <h3 className="text-sm font-extrabold">{svc.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 group-hover:text-slate-200 dark:group-hover:text-slate-700 mt-1">
                      {svc.desc}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                    Acessar <ArrowRight size={12} />
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        {/* Eixos de Transparência e Participação */}
        <section aria-label="Acesso rápido à Transparência e Controle Social" className="space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Transparência, Legislação e Controle Social
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {transparencyPillars.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.title}
                  href={item.href}
                  className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-900 dark:hover:border-white transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-white shrink-0">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-white self-end">
                    Abrir módulo <ArrowRight size={13} />
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </div>
    </PublicInstitutionalLayout>
  );
};

export default InstitutionalPortalHome;
