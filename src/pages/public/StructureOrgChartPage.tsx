import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Clock, Mail, MapPin, Phone, User } from 'lucide-react';
import { Institution } from '../../types';
import { PublicInstitutionalLayout } from '../../layouts/PublicInstitutionalLayout';
import {
  fetchInstitutionalDepartments,
  InstitutionalDepartment,
} from '../../lib/api/pntpPortal';

export interface StructureOrgChartPageProps {
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

function buildBaselineDepartments(institution: Institution): InstitutionalDepartment[] {
  return [
    {
      id: 'dept-gab',
      institution_id: institution.id,
      parent_id: null,
      name: 'Gabinete do Prefeito',
      acronym: 'GAB',
      legal_competencies:
        'Direção superior da Administração Pública Municipal, representação institucional, sanção e promulgação de leis e coordenação intersetorial.',
      secretary_name: 'Chefia de Gabinete',
      secretary_role: 'Prefeito(a) / Chefe de Gabinete',
      address: 'Paço Municipal — Sede Administrativa',
      phone: institution.contact_phone || '(00) 0000-0000',
      email: 'gabinete@municipio.gov.br',
      business_hours: 'Segunda a Sexta, 08h00 às 17h00',
      display_order: 1,
    },
    {
      id: 'dept-adm',
      institution_id: institution.id,
      parent_id: 'dept-gab',
      name: 'Secretaria Municipal de Administração e Finanças',
      acronym: 'SMAF',
      legal_competencies:
        'Gestão orçamentária, financeira, tributária, licitações e contratos (Lei 14.133/21), recursos humanos e patrimônio público.',
      secretary_name: 'Titular da Pasta de Administração e Finanças',
      secretary_role: 'Secretário(a) Municipal',
      address: 'Paço Municipal — Ala Financeira',
      phone: institution.contact_phone || '(00) 0000-0001',
      email: 'financas@municipio.gov.br',
      business_hours: 'Segunda a Sexta, 08h00 às 17h00',
      display_order: 2,
    },
    {
      id: 'dept-saude',
      institution_id: institution.id,
      parent_id: 'dept-gab',
      name: 'Secretaria Municipal de Saúde',
      acronym: 'SMS',
      legal_competencies:
        'Gestão plena do Sistema Único de Saúde (SUS) no âmbito municipal, atenção básica, vigilância epidemiológica e assistência farmacêutica.',
      secretary_name: 'Titular da Pasta de Saúde',
      secretary_role: 'Secretário(a) Municipal de Saúde',
      address: 'Centro Administrativo de Saúde',
      phone: institution.contact_phone || '(00) 0000-0002',
      email: 'saude@municipio.gov.br',
      business_hours: 'Segunda a Sexta, 07h00 às 17h00',
      display_order: 3,
    },
    {
      id: 'dept-educ',
      institution_id: institution.id,
      parent_id: 'dept-gab',
      name: 'Secretaria Municipal de Educação',
      acronym: 'SME',
      legal_competencies:
        'Educação infantil (creches e pré-escolas), ensino fundamental, transporte escolar, alimentação escolar e gestão dos recursos do FUNDEB.',
      secretary_name: 'Titular da Pasta de Educação',
      secretary_role: 'Secretário(a) Municipal de Educação',
      address: 'Centro Administrativo de Educação',
      phone: institution.contact_phone || '(00) 0000-0003',
      email: 'educacao@municipio.gov.br',
      business_hours: 'Segunda a Sexta, 07h30 às 17h00',
      display_order: 4,
    },
  ];
}

export const StructureOrgChartPage: React.FC<StructureOrgChartPageProps> = ({
  institution,
  darkMode,
  setDarkMode,
}) => {
  const [departments, setDepartments] = useState<InstitutionalDepartment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchInstitutionalDepartments(institution.id).then((rows) => {
      if (!active) return;
      const list = rows.length > 0 ? rows : buildBaselineDepartments(institution);
      setDepartments(list);
      if (list[0]) setSelectedId(list[0].id);
    });
    return () => {
      active = false;
    };
  }, [institution]);

  const roots = useMemo(() => departments.filter((d) => !d.parent_id), [departments]);
  const childrenMap = useMemo(() => {
    const map: Record<string, InstitutionalDepartment[]> = {};
    departments.forEach((d) => {
      if (d.parent_id) {
        if (!map[d.parent_id]) map[d.parent_id] = [];
        map[d.parent_id].push(d);
      }
    });
    return map;
  }, [departments]);

  const selectedDept = departments.find((d) => d.id === selectedId) || departments[0] || null;

  const renderNode = (dept: InstitutionalDepartment, level = 0) => {
    const children = childrenMap[dept.id] || [];
    const isSelected = selectedDept?.id === dept.id;
    return (
      <div key={dept.id} className={level > 0 ? 'ml-6 pl-4 border-l-2 border-slate-200 dark:border-neutral-700 mt-2' : ''}>
        <button
          type="button"
          onClick={() => setSelectedId(dept.id)}
          className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer ${
            isSelected
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
              : 'bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold">{dept.name}</span>
            {dept.acronym && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                isSelected ? 'bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}>
                {dept.acronym}
              </span>
            )}
          </div>
          {dept.secretary_name && (
            <span className={`text-[11px] block mt-0.5 ${isSelected ? 'text-slate-200 dark:text-slate-700' : 'text-slate-500 dark:text-neutral-400'}`}>
              {dept.secretary_name}
            </span>
          )}
        </button>
        {children.map((c) => renderNode(c, level + 1))}
      </div>
    );
  };

  return (
    <PublicInstitutionalLayout
      institution={institution}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      activeNav="estrutura"
      pageTitle="Estrutura Organizacional e Quem é Quem"
      pageSubtitle="Organograma interativo das secretarias e órgãos municipais com competências legais, responsáveis, endereços, telefones e horários de atendimento (LAI / PNTP)."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section aria-label="Árvore do organograma municipal" className="lg:col-span-6 space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-3">
            Hierarquia Administrativa
          </h2>
          {roots.map((r) => renderNode(r))}
        </section>

        <section aria-label="Detalhes da unidade selecionada" className="lg:col-span-6">
          {selectedDept && (
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 sticky top-24">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {selectedDept.acronym && (
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                      {selectedDept.acronym}
                    </span>
                  )}
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                    {selectedDept.name}
                  </h2>
                </div>
                <Building2 size={24} className="text-slate-400 shrink-0" />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700 text-xs space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User size={14} /> Responsável / Gestor(a)
                </p>
                <p className="text-slate-800 dark:text-neutral-200 font-semibold">
                  {selectedDept.secretary_name || 'A definir'}
                </p>
                {selectedDept.secretary_role && (
                  <p className="text-slate-500 dark:text-neutral-400">{selectedDept.secretary_role}</p>
                )}
              </div>

              {selectedDept.legal_competencies && (
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Competências Legais
                  </p>
                  <p className="text-slate-600 dark:text-neutral-300 leading-relaxed">
                    {selectedDept.legal_competencies}
                  </p>
                </div>
              )}

              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-neutral-300 pt-2 border-t border-slate-200 dark:border-neutral-800">
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-slate-500" />
                  <span>{selectedDept.address || 'Sede Administrativa Municipal'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={14} className="shrink-0 text-slate-500" />
                  <span>{selectedDept.phone || '(00) 0000-0000'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={14} className="shrink-0 text-slate-500" />
                  <span>{selectedDept.email || 'contato@municipio.gov.br'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={14} className="shrink-0 text-slate-500" />
                  <span>{selectedDept.business_hours || 'Segunda a Sexta, 08h00 às 17h00'}</span>
                </li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </PublicInstitutionalLayout>
  );
};

export default StructureOrgChartPage;
