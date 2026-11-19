import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import { Institution } from '../../types';
import { PublicInstitutionalLayout } from '../../layouts/PublicInstitutionalLayout';
import { fetchInstitutionalFaqs, InstitutionalFaqItem } from '../../lib/api/pntpPortal';

export interface FaqPortalPageProps {
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

function buildBaselineFaqs(institutionId: string): InstitutionalFaqItem[] {
  return [
    {
      id: 'faq-1',
      institution_id: institutionId,
      category: 'e-SIC e LAI',
      question: 'Como faço um pedido de acesso à informação sem precisar justificar o motivo?',
      answer:
        'Acesse o menu e-SIC no Portal Público, preencha seu nome, assunto e a descrição da informação desejada. Nos termos do Art. 10, §8º da Lei nº 12.527/2011, o órgão público não pode exigir justificativa para o pedido.',
      views_count: 142,
    },
    {
      id: 'faq-2',
      institution_id: institutionId,
      category: 'e-SIC e LAI',
      question: 'Qual é o prazo legal para resposta de pedidos no e-SIC?',
      answer:
        'O prazo é de até 20 dias corridos, prorrogável por mais 10 dias mediante justificativa expressa comunicada ao solicitante. Caso seja indeferido ou o prazo expire, é possível interpor recurso em 1ª e 2ª instâncias diretamente pelo protocolo.',
      views_count: 98,
    },
    {
      id: 'faq-3',
      institution_id: institutionId,
      category: 'Transparência e Dados Abertos',
      question: 'Posso baixar as tabelas do Portal da Transparência em formatos abertos?',
      answer:
        'Sim. Todas as consultas de receitas, despesas, licitações, contratos, obras, folha de pagamento e convênios possuem exportação imediata em CSV, JSON, XML e XLSX/ODS.',
      views_count: 115,
    },
    {
      id: 'faq-4',
      institution_id: institutionId,
      category: 'Ouvidoria',
      question: 'É possível registrar uma denúncia anônima na Ouvidoria Municipal?',
      answer:
        'Sim. O módulo de Ouvidoria dispõe de modo explícito de Denúncia Anônima, sem exigência de CPF, e-mail ou login, gerando um número de protocolo para acompanhamento.',
      views_count: 89,
    },
    {
      id: 'faq-5',
      institution_id: institutionId,
      category: 'LGPD e Privacidade',
      question: 'Como entro em contato com o Encarregado de Dados (DPO) do Município?',
      answer:
        'O nome completo do Encarregado (DPO), a portaria de nomeação e o formulário de contato direto estão disponíveis na página /encarregado-dpo, acessível permanentemente no rodapé do portal.',
      views_count: 64,
    },
  ];
}

export const FaqPortalPage: React.FC<FaqPortalPageProps> = ({
  institution,
  darkMode,
  setDarkMode,
}) => {
  const [faqs, setFaqs] = useState<InstitutionalFaqItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchInstitutionalFaqs(institution.id).then((rows) => {
      if (!active) return;
      const list = rows.length > 0 ? rows : buildBaselineFaqs(institution.id);
      setFaqs(list);
      if (list[0]) setOpenId(list[0].id);
    });
    return () => {
      active = false;
    };
  }, [institution.id]);

  const categories = useMemo(() => {
    const set = new Set<string>(['Todas']);
    faqs.forEach((f) => set.add(f.category));
    return Array.from(set);
  }, [faqs]);

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      if (selectedCategory !== 'Todas' && f.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [faqs, selectedCategory, search]);

  return (
    <PublicInstitutionalLayout
      institution={institution}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      activeNav="faq"
      pageTitle="Perguntas Frequentes (FAQ)"
      pageSubtitle="Esclarecimentos rápidos sobre acesso à informação (LAI), transparência ativa, ouvidoria anônima, serviços digitais e proteção de dados pessoais."
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar dúvida por palavra-chave..."
              aria-label="Pesquisar perguntas frequentes"
              className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-10 text-center text-xs text-slate-500">
              Nenhuma pergunta encontrada para os critérios informados.
            </div>
          ) : (
            filtered.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle size={18} className="text-slate-500 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          {item.category}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.question}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 pl-12 text-xs sm:text-sm text-slate-700 dark:text-neutral-300 leading-relaxed border-t border-slate-100 dark:border-neutral-800">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </PublicInstitutionalLayout>
  );
};

export default FaqPortalPage;
