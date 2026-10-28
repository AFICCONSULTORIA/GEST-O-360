import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Download, X, CheckCircle2, ShieldCheck, Zap, Globe, 
  Building2, Users, PieChart, Landmark, HeartPulse, GraduationCap, 
  HardHat, MessageSquare, Printer, Send, FileCheck, Shield, Award,
  TrendingUp, Clock, Scale, Lock, Sparkles, Check, XCircle, ArrowRight,
  Calculator, Package, Wrench, Leaf, Tractor, HeartHandshake, PhoneCall,
  Share2, Copy, FileSignature, ChevronLeft, ExternalLink, Briefcase, Mail,
  Maximize2, Calendar, ListChecks, CheckSquare, Layers, Server, Activity,
  BadgeCheck, CheckCheck
} from 'lucide-react';
import { LogoCompass } from './LogoCompass';

export interface ProposalModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialModule?: string;
  isStandalonePage?: boolean;
  initialMunicipality?: string;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({ 
  isOpen = true, 
  onClose, 
  initialModule,
  isStandalonePage = false,
  initialMunicipality
}) => {
  // Query parameters initialization
  const [municipality, setMunicipality] = useState<string>('Prefeitura Municipal de Torixoréu - MT');
  const [recipientRole, setRecipientRole] = useState<string>('Ao Exmo. Sr. Prefeito Municipal');
  const [targetFocus, setTargetFocus] = useState<string>(initialModule || 'visao_geral');
  const [activeTab, setActiveTab] = useState<'proposta' | 'termo_referencia' | 'oficio'>('proposta');
  const [cronogramaView, setCronogramaView] = useState<'roadmap' | 'matriz'>('roadmap');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMunicipio = params.get('municipio') || params.get('cidade') || params.get('prefeitura');
      const urlCargo = params.get('cargo') || params.get('destinatario');
      const urlModulo = params.get('modulo') || params.get('foco');
      const urlTab = params.get('aba');

      if (urlMunicipio) setMunicipality(urlMunicipio);
      else if (initialMunicipality) setMunicipality(initialMunicipality);

      if (urlCargo) setRecipientRole(urlCargo);
      if (urlModulo) setTargetFocus(urlModulo);
      if (urlTab === 'tr' || urlTab === 'termo') setActiveTab('termo_referencia');
      if (urlTab === 'oficio') setActiveTab('oficio');
    }
  }, [initialMunicipality]);

  if (!isOpen && !isStandalonePage) return null;

  const handlePrint = () => {
    window.print();
  };

  // Build the shareable URL
  const getShareableUrl = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.origin + '/proposta');
    if (municipality) url.searchParams.set('municipio', municipality);
    if (recipientRole) url.searchParams.set('cargo', recipientRole);
    if (targetFocus) url.searchParams.set('modulo', targetFocus);
    if (activeTab !== 'proposta') url.searchParams.set('aba', activeTab === 'termo_referencia' ? 'tr' : 'oficio');
    return url.toString();
  };

  const shareableUrl = getShareableUrl();

  // WhatsApp Protocol Message
  const getWhatsAppMessage = () => {
    const focusLabel = 
      targetFocus === 'saude' ? 'Saúde Pública 360 & Farmácia SUS' :
      targetFocus === 'educacao' ? 'Educação 360, CMEI & Merenda Escolar' :
      targetFocus === 'fazenda' ? 'Blindagem Fiscal, CNDs & Alertas TCE' :
      targetFocus === 'camara' ? 'Câmara Municipal 360 & Transparência' :
      'Suíte Completa de Governança Municipal & Compliance';

    return `🏛️ *PROPOSTA INSTITUCIONAL · GESTÃO 360*
📍 *Município:* ${municipality}
👤 *Destinatário:* ${recipientRole}
🎯 *Foco da Solução:* ${focusLabel}

Prezado(a) gestor(a),

Temos a honra de apresentar a Proposta Oficial de Implantação da Plataforma *GESTÃO 360*, moderna solução em nuvem SaaS desenvolvida para blindagem jurídica contra apontamentos do TCE, automação total de secretarias e conformidade com a *Nova Lei de Licitações (Lei nº 14.133/2021)*.

Acesse o documento completo, cronograma e a Minuta do Termo de Referência pronta pelo link oficial:
👉 ${shareableUrl}

Ficamos à disposição para agendar uma demonstração técnica presencial ou virtual!
*AFIC Consultoria & Tecnologia Pública*
✉️ aficconsultoria@gmail.com`;
  };

  const WA_SHARE_URL = `https://wa.me/?text=${encodeURIComponent(getWhatsAppMessage())}`;

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  // Termo de Referência text for direct copy
  const trTextContent = `TERMO DE REFERÊNCIA SIMPLIFICADO
CONFORME LEI FEDERAL Nº 14.133/2021 (NOVA LEI DE LICITAÇÕES)
PROCESSO DE CONTRATAÇÃO DIRETA (DISPENSA DE LICITAÇÃO - ART. 75, II / ADESÃO A ATA)

1. DO OBJETO
Contratação de empresa especializada em tecnologia da informação para fornecimento de licença de uso temporário (SaaS - Software as a Service) de sistema integrado de governança pública municipal, com suporte técnico, implantação, parametrização e treinamento de servidores, para atender às necessidades da ${municipality}.

2. DA JUSTIFICATIVA E INTERESSE PÚBLICO
A presente contratação fundamenta-se na necessidade de modernização tecnológica, integridade administrativa e conformidade com as exigências dos órgãos de controle externo (Tribunal de Contas do Estado - TCE e Radar Nacional de Transparência Pública - PNTP/ATRICON). 
A solução elimina a fragmentação de controles manuais, previne sanções fiscais da Lei de Responsabilidade Fiscal (LRF) e atende aos princípios de eficiência e desburocratização da Administração Pública.

3. DO ENQUADRAMENTO LEGAL
A contratação fundamenta-se no Art. 75, inciso II da Lei nº 14.133/2021 (Dispensa de Licitação em razão do valor) ou, subsidiariamente, na Adesão à Ata de Registro de Preços em vigência (Art. 86 da Lei 14.133/2021).

4. DAS ESPECIFICAÇÕES TÉCNICAS MÍNIMAS
- Plataforma 100% em Nuvem (Web/SaaS), com acesso simultâneo e criptografia de ponta a ponta.
- Não exigência de aquisição de servidores locais físicos ou licenças adicionais de banco de dados.
- Módulos integrados: Gabinete do Prefeito, Controle de Obrigações Fiscais/TCE, Banco de Leis com busca oficial, Saúde Pública (Farmácia SUS e Agendamentos), Educação (Portal da Família, CMEI e Fila de Vagas) e Comunicação Cidadã.
- Validação e assinatura eletrônica em conformidade com o padrão ICP-Brasil.
- Disponibilidade de pelo menos 99,5% do serviço.

5. DO PRAZO DE IMPLANTAÇÃO E VIGÊNCIA
- Prazo de Implantação e Treinamento: Até 7 (sete) dias corridos a partir da assinatura do contrato.
- Prazo de Vigência Contratual: 12 (doze) meses, prorrogável nos termos da legislação vigente.

6. DAS OBRIGAÇÕES DA CONTRATADA
- Disponibilizar a plataforma parametrizada com os dados e brasão oficial do Município.
- Realizar o treinamento prático das equipes municipais.
- Prestar suporte técnico continuado via canais diretos (telefone/WhatsApp/email) em horário de expediente administrativo.
- Garantir a segurança e backup diário e imutável de todas as bases de dados.

${municipality}, ${new Date().toLocaleDateString('pt-BR')}.
Elaborado para instrução processual interna.`;

  // Inner Document Content (White paper layout)
  const renderDocumentContent = () => (
    <div className="bg-white text-neutral-900 w-full rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 print:shadow-none print:border-none print:rounded-none">
      
      {/* TAB 1: PROPOSTA COMERCIAL COMPLETA */}
      {activeTab === 'proposta' && (
        <div>
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-emerald-950 text-white p-6 sm:p-10 relative overflow-hidden print:bg-neutral-950 print:text-white">
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="rounded-2xl border border-white/20 overflow-hidden flex items-center justify-center shadow-lg shadow-black/30 bg-neutral-900 p-1 shrink-0">
                    <LogoCompass size={48} />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black italic tracking-tight">GESTÃO <span className="text-emerald-400 font-normal">360</span></h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Consultoria & Tecnologia para Gestão Pública</p>
                  </div>
                </div>

                <div className="sm:text-right border-l sm:border-l-0 sm:border-r-0 border-white/15 pl-4 sm:pl-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Proposta Comercial Institucional</span>
                  <span className="text-xs font-bold text-white block">Edição Executiva 2026</span>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">Ref: Lei Federal nº 14.133/21</span>
                </div>
              </div>

              {/* Addressed To Box */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Proposta Direcionada a:</div>
                  <div className="text-sm sm:text-base font-black text-white">{recipientRole}</div>
                  <div className="text-xs font-bold text-emerald-400">{municipality}</div>
                </div>
                <div className="text-xs text-neutral-300 font-medium">
                  Data de Emissão: <strong className="text-white">{new Date().toLocaleDateString('pt-BR')}</strong>
                </div>
              </div>

              {/* Compliance and Certification Badges */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 flex items-center gap-1.5">
                  <ShieldCheck size={12} /> 100% Nuvem SaaS
                </span>
                <span className="px-3 py-1 bg-sky-500/20 text-sky-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-sky-500/30 flex items-center gap-1.5">
                  <Lock size={12} /> Certificação ICP-Brasil
                </span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-500/30 flex items-center gap-1.5">
                  <Scale size={12} /> Nova Lei de Licitações (14.133/21)
                </span>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/30 flex items-center gap-1.5">
                  <Globe size={12} /> Radar PNTP Selo Ouro/Diamante
                </span>
              </div>

              <div className="pt-2 border-t border-white/10">
                <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                  Plataforma Integrada de Governança, Compliance & Eficiência Pública Municipal
                </h2>
                <p className="text-neutral-300 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
                  Modernização completa para a gestão de <strong>{municipality}</strong>: blindagem preventiva contra apontamentos do TCE, digitalização integral de processos, transparência ativa e ferramentas especializadas para as Secretarias de Saúde e Educação.
                </p>
              </div>
            </div>
          </div>

          {/* Highlights Metrics Grid */}
          <div className="bg-neutral-900 border-b border-neutral-800 p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-white print:bg-neutral-900">
            <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">-45%</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Custos com Papel & Tramitação</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Conformidade com LRF & TCE</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">0</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Risco de Numeração Duplicada</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">7 Dias</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Implantação Turnkey na Nuvem</div>
            </div>
          </div>

          {/* Document Body */}
          <div className="p-6 sm:p-10 space-y-10 bg-white print:p-8">
            
            {/* Section 1: Por que o Gestão 360? */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-sm">01</div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">Por que Modernizar {municipality} com o Gestão 360?</h3>
                    <p className="text-xs text-neutral-500 font-medium">Comparativo direto entre o modelo administrativo tradicional e a inovação tecnológica da plataforma.</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Cenário Tradicional */}
                <div className="p-6 bg-rose-50/60 rounded-3xl border border-rose-200/80 space-y-4">
                  <div className="flex items-center gap-2 text-rose-800 font-black text-xs sm:text-sm uppercase tracking-wider">
                    <XCircle size={18} className="text-rose-600" />
                    Modelo Tradicional (Antes)
                  </div>
                  <ul className="space-y-3 text-xs text-neutral-700 font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 font-black shrink-0">✕</span>
                      <span><strong>Filas e Processos Físicos de Saúde e Educação:</strong> Pais esperando de madrugada por vagas em creches e munícipes indo ao posto sem saber se há remédio.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 font-black shrink-0">✕</span>
                      <span><strong>Apontamentos e Multas no TCE:</strong> Risco ao ordenador de despesa por perda de prazos da LRF, SIOPE, SIOPS ou divergências em certidões.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 font-black shrink-0">✕</span>
                      <span><strong>Numeração de Atos Descentralizada:</strong> Decretos e portarias gerados em pastas locais, resultando em numerações sobrepostas e inconsistências jurídicas.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 font-black shrink-0">✕</span>
                      <span><strong>Baixa Pontuação de Transparência:</strong> Avaliação insuficiente no Radar da Transparência (PNTP) por falta de portal moderno e intuitivo.</span>
                    </li>
                  </ul>
                </div>

                {/* Com Gestão 360 */}
                <div className="p-6 bg-emerald-50/70 rounded-3xl border border-emerald-200 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-xs sm:text-sm uppercase tracking-wider">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    Com a Plataforma Gestão 360 (Depois)
                  </div>
                  <ul className="space-y-3 text-xs text-neutral-800 font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-black shrink-0">✓</span>
                      <span><strong>Farmácia SUS & Fila de Creches 100% Online:</strong> Cidadão consulta estoque de remédios e posição na fila escolar pelo celular via QR Code ou WhatsApp.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-black shrink-0">✓</span>
                      <span><strong>Painel Preventivo de Alertas Fiscais:</strong> Cronograma inteligente que avisa o Prefeito e Secretários antes dos prazos limites do TCE e da LRF.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-black shrink-0">✓</span>
                      <span><strong>Numeração Sequencial Inviolável:</strong> Criação, controle e publicação de decretos, portarias e atas com assinatura digital ICP-Brasil.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-black shrink-0">✓</span>
                      <span><strong>Selo Ouro/Diamante no Radar PNTP:</strong> Conformidade técnica imediata com os critérios da ATRICON e Ministério Público.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2: Especial Destaque - Saúde & Educação 360 */}
            <section className="space-y-6 bg-neutral-50 p-6 sm:p-8 rounded-3xl border border-neutral-200 print:bg-white print:p-0">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl font-black text-sm">02</div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">Soluções de Alto Impacto Social: Saúde & Educação</h3>
                    <p className="text-xs text-neutral-500 font-medium">As duas áreas de maior sensibilidade para a população e prioridade dos Tribunais de Contas.</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Saúde 360 */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                      <HeartPulse size={22} />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-neutral-900">Módulo Saúde 360 & Farmácia SUS</h4>
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Atendimento ao Cidadão & SIOPS</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Transparência total do estoque de medicamentos municipais em tempo real para o munícipe, agendamento de consultas da UBS, controle da frota de ambulâncias/TFD e monitoramento contínuo da aplicação constitucional de 15% da Saúde.
                  </p>
                  <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-2 text-[11px] font-bold text-neutral-700">
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-800 rounded-lg">Estoque Farmácia Digital</span>
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-800 rounded-lg">Agendamento de Consultas</span>
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-800 rounded-lg">Gestão TFD</span>
                  </div>
                </div>

                {/* Educação 360 */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-neutral-900">Módulo Educação & Fila de CMEIs</h4>
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Portal da Família & SIOPE</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Fila pública e auditável de vagas em creches (CMEI) com ordem cronológica transparente, rastreamento de rotas de transporte escolar rural e controle nutricional da merenda escolar em conformidade com o FNDE e SIOPE (25%).
                  </p>
                  <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-2 text-[11px] font-bold text-neutral-700">
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-800 rounded-lg">Fila Auditável CMEI</span>
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-800 rounded-lg">Rotas Transporte Escolar</span>
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-800 rounded-lg">Merenda Escolar FNDE</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Arquitetura Geral da Plataforma */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-sm">03</div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">Suíte Completa de Módulos Integrados</h3>
                    <p className="text-xs text-neutral-500 font-medium">Solução modular que atende harmonicamente todas as secretarias municipais.</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex gap-4 items-start">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900">Gabinete & Visão Executiva do Prefeito</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed font-medium">
                      Painel executivo com indicadores gerenciais em tempo real, monitoramento dos limites da LRF, alertas de riscos de apontamentos e relatórios prontos.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex gap-4 items-start">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <PieChart size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900">Controles Internos & Compliance TCE</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed font-medium">
                      Checklists preventivos do Tribunal de Contas, gestão da Nova Lei de Licitações (14.133/21), Banco de Certidões Negativas (CNDs) e integração com o Radar PNTP.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex gap-4 items-start">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <Scale size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900">Banco de Leis & Diário Oficial Eletrônico</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed font-medium">
                      Repositório oficial de leis municipais, decretos e portarias com busca avançada de inteiro teor e publicação assinada digitalmente com ICP-Brasil.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex gap-4 items-start">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900">Central WhatsApp & Ouvidoria Cidadã</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed font-medium">
                      Canal direto de ouvidoria com protocolo automático no WhatsApp, disparo de informativos municipais e módulo Câmara 360 para integração com o Legislativo.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Amparo Legal de Contratação (Nova Lei 14.133/2021) */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-sm">04</div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">Amparo Legal & Modalidades de Contratação Imediata</h3>
                    <p className="text-xs text-neutral-500 font-medium">Mecanismos previstos na Lei Federal nº 14.133/2021 para rápida contratação pública.</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="font-black text-sm text-emerald-950 flex items-center gap-2">
                    <Award size={16} className="text-emerald-600" />
                    Dispensa de Licitação
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Art. 75, inciso II da Lei nº 14.133/2021 para contratação direta de software especializado por valor compatível, com trâmite simplificado.
                  </p>
                </div>

                <div className="p-5 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-2">
                  <div className="font-black text-sm text-sky-950 flex items-center gap-2">
                    <FileCheck size={16} className="text-sky-600" />
                    Adesão à Ata (Carona)
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Adesão célere a Atas de Registro de Preços vigentes de consórcios públicos ou municípios parceiros, conforme previsto no Art. 86 da Lei 14.133/21.
                  </p>
                </div>

                <div className="p-5 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
                  <div className="font-black text-sm text-purple-950 flex items-center gap-2">
                    <Globe size={16} className="text-purple-600" />
                    Pregão Eletrônico
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Minuta de Termo de Referência (TR) completa e especificações técnicas já elaboradas para instrução imediata do processo licitatório.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: Cronograma de Implantação Chave na Mão (5 Fases + Matriz) */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-600/20">05</div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">
                      Cronograma Executivo de Implantação Chave na Mão (7 Dias + Suporte Assistido)
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium">
                      Ativação ágil 100% em nuvem para {municipality}: sem despesas com servidores físicos, sem obras e com suporte continuado.
                    </p>
                  </div>
                </div>

                {/* Alternador de Visão do Cronograma */}
                <div className="no-print inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200 self-start sm:self-auto shrink-0">
                  <button
                    onClick={() => setCronogramaView('roadmap')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      cronogramaView === 'roadmap'
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <Calendar size={13} />
                    <span>Roadmap 5 Fases</span>
                  </button>
                  <button
                    onClick={() => setCronogramaView('matriz')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      cronogramaView === 'matriz'
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <ListChecks size={13} />
                    <span>Matriz de Entregáveis</span>
                  </button>
                </div>
              </div>

              {/* VISÃO 1: ROADMAP POR FASES (TIMELINE ESTRATÉGICA) */}
              {(cronogramaView === 'roadmap' || typeof window === 'undefined') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                    {/* Fase 1 */}
                    <div className="p-4 sm:p-5 bg-neutral-900 text-white rounded-3xl space-y-3 border border-neutral-800 relative flex flex-col justify-between group hover:border-emerald-500/40 transition">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            Dias 1 e 2
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400">Fase 01</span>
                        </div>
                        <h4 className="font-black text-sm text-white">Setup em Nuvem & Identidade</h4>
                        <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                          Provisionamento do tenant seguro em nuvem, subdomínio governamental oficial, certificado SSL 256 bits, Brasão Municipal e criação das credenciais masters do Gabinete.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-neutral-800 text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span>Ambiente no ar em 48h</span>
                      </div>
                    </div>

                    {/* Fase 2 */}
                    <div className="p-4 sm:p-5 bg-neutral-900 text-white rounded-3xl space-y-3 border border-neutral-800 relative flex flex-col justify-between group hover:border-emerald-500/40 transition">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            Dias 3 e 4
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400">Fase 02</span>
                        </div>
                        <h4 className="font-black text-sm text-white">Carga & Parametrização</h4>
                        <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                          Importação do acervo de leis e decretos, cadastro das unidades de saúde e remédios da Farmácia SUS (RENAME), creches municipais e limites fiscais da LRF.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-neutral-800 text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span>Bases de dados homologadas</span>
                      </div>
                    </div>

                    {/* Fase 3 */}
                    <div className="p-4 sm:p-5 bg-neutral-900 text-white rounded-3xl space-y-3 border border-neutral-800 relative flex flex-col justify-between group hover:border-emerald-500/40 transition">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            Dias 5 e 6
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400">Fase 03</span>
                        </div>
                        <h4 className="font-black text-sm text-white">Capacitação Prática</h4>
                        <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                          Workshops remotos hands-on com servidores da Saúde, Educação, Compras e Gabinete; emissão de atos testes com certificado ICP-Brasil e manuais operacionais digitais.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-neutral-800 text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span>Equipes 100% habilitadas</span>
                      </div>
                    </div>

                    {/* Fase 4 */}
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl space-y-3 shadow-xl shadow-emerald-600/20 relative flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20">
                            Dia 7
                          </span>
                          <span className="text-[10px] font-black text-white uppercase">Go-Live</span>
                        </div>
                        <h4 className="font-black text-sm text-white">Ativação & Abertura Cidadã</h4>
                        <p className="text-[11px] text-emerald-50 leading-relaxed font-medium">
                          Homologação formal pelo Gabinete, publicação oficial do Portal da Transparência, liberação da consulta de medicamentos e Ouvidoria no WhatsApp para a população.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-white/20 text-[10px] text-white font-black flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-300" />
                        <span>Plataforma 100% em produção</span>
                      </div>
                    </div>

                    {/* Fase 5 */}
                    <div className="p-4 sm:p-5 bg-neutral-900 text-white rounded-3xl space-y-3 border border-emerald-500/30 relative flex flex-col justify-between group hover:border-emerald-500 transition">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                            Dias 8 a 30
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400">Pós Go-Live</span>
                        </div>
                        <h4 className="font-black text-sm text-white">Operação Assistida & TCE</h4>
                        <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                          Plantão técnico exclusivo para secretários, monitoramento de prazos do Tribunal de Contas, rotinas automáticas de backup diário e assessoria em governança.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-neutral-800 text-[10px] text-amber-300 font-bold flex items-center gap-1">
                        <ShieldCheck size={12} />
                        <span>Blindagem fiscal garantida</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Garantia de SLA */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold">
                      <CheckCheck size={16} className="text-emerald-600 shrink-0" />
                      <span>Garantia de Disponibilidade (SLA Contratual): <strong>99,5%</strong></span>
                    </div>
                    <div className="flex items-center gap-4 text-neutral-600 font-semibold text-[11px]">
                      <span>✓ Backup diário redundante</span>
                      <span>✓ Suporte ilimitado para servidores</span>
                      <span>✓ Atendimento em horário comercial</span>
                    </div>
                  </div>
                </div>
              )}

              {/* VISÃO 2: MATRIZ DE ENTREGÁVEIS & RESPONSABILIDADES */}
              {cronogramaView === 'matriz' && (
                <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-700 font-black uppercase tracking-wider text-[10px] border-b border-neutral-200">
                      <tr>
                        <th className="p-3.5">Fase / Área</th>
                        <th className="p-3.5">O Que a Contratada (AFIC) Entrega</th>
                        <th className="p-3.5">O Que o Município Fornece</th>
                        <th className="p-3.5 text-center">Prazo</th>
                        <th className="p-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-700">
                      <tr className="hover:bg-neutral-50/60 transition">
                        <td className="p-3.5 font-bold text-neutral-900">1. Infraestrutura & Nuvem</td>
                        <td className="p-3.5 font-medium">Provisionamento de ambiente SaaS, subdomínio, certificado SSL 256 bits e isolamento de banco.</td>
                        <td className="p-3.5 font-medium text-neutral-500">Apenas indicação do nome oficial e brasão municipal.</td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">Dias 1-2</td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">100% AFIC</span></td>
                      </tr>
                      <tr className="hover:bg-neutral-50/60 transition">
                        <td className="p-3.5 font-bold text-neutral-900">2. Acervo de Leis & Decretos</td>
                        <td className="p-3.5 font-medium">Indexação com motor de busca inteligente, assinatura ICP-Brasil e publicação oficial.</td>
                        <td className="p-3.5 font-medium text-neutral-500">Disponibilização de arquivos digitais em PDF ou Word dos atos.</td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">Dias 3-4</td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">100% AFIC</span></td>
                      </tr>
                      <tr className="hover:bg-neutral-50/60 transition">
                        <td className="p-3.5 font-bold text-neutral-900">3. Saúde 360 & Farmácia SUS</td>
                        <td className="p-3.5 font-medium">Configuração do catálogo RENAME, controle de estoque UBS e portal de consulta cidadã.</td>
                        <td className="p-3.5 font-medium text-neutral-500">Relação de medicamentos padronizados e unidades de saúde.</td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">Dias 3-4</td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">100% AFIC</span></td>
                      </tr>
                      <tr className="hover:bg-neutral-50/60 transition">
                        <td className="p-3.5 font-bold text-neutral-900">4. Educação 360 & CMEI</td>
                        <td className="p-3.5 font-medium">Fila pública auditável por ordem cronológica, regras de pontuação e rotas escolares.</td>
                        <td className="p-3.5 font-medium text-neutral-500">Lista de creches e critérios vigentes da Secretaria de Educação.</td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">Dias 4-5</td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">100% AFIC</span></td>
                      </tr>
                      <tr className="hover:bg-neutral-50/60 transition">
                        <td className="p-3.5 font-bold text-neutral-900">5. Capacitação de Servidores</td>
                        <td className="p-3.5 font-medium">Oficinas práticas ao vivo, tutoriais gravados, manuais digitais e suporte contínuo.</td>
                        <td className="p-3.5 font-medium text-neutral-500">Convocação dos servidores operadores para a sessão remota.</td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">Dias 5-6</td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">100% AFIC</span></td>
                      </tr>
                      <tr className="hover:bg-neutral-50/60 transition">
                        <td className="p-3.5 font-bold text-neutral-900">6. Go-Live & Suporte 30 Dias</td>
                        <td className="p-3.5 font-medium">Liberação do ambiente oficial, homologação formal e plantão técnico preventivo TCE.</td>
                        <td className="p-3.5 font-medium text-neutral-500">Assinatura do Termo de Recebimento Provisório/Definitivo.</td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">Dia 7 em diante</td>
                        <td className="p-3.5 text-center"><span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">Operação Total</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Section 6: Condições Comerciais & Modelo de Contratação Turnkey */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-600/20">06</div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-neutral-900">
                      Condições de Contratação & Escopo Turnkey "Tudo Incluso"
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium">
                      Pacote completo sem custos ocultos, perfeitamente compatível com os limites da Lei Federal nº 14.133/2021.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-neutral-900 text-sm">
                    <Users size={16} className="text-emerald-600" />
                    <span>Usuários & Acessos Ilimitados</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Sem cobrança por usuário ou computador. Todos os secretários, assessores e servidores municipais podem utilizar simultaneamente.
                  </p>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-neutral-900 text-sm">
                    <Server size={16} className="text-emerald-600" />
                    <span>Hospedagem & Backups Inclusos</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Servidores em nuvem de alta performance com backups diários automatizados e criptografia bancária, dispensando servidores físicos locais.
                  </p>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-neutral-900 text-sm">
                    <GraduationCap size={16} className="text-emerald-600" />
                    <span>Treinamento Continuado</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Capacitação completa na implantação e reciclagem para novos servidores que ingressarem na gestão ao longo do contrato, sem custo extra.
                  </p>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-neutral-900 text-sm">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>Atualizações & Conformidade TCE</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Evolução contínua do sistema para atender prontamente novas resoluções do Tribunal de Contas (TCE) e critérios do Radar PNTP/ATRICON.
                  </p>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-neutral-900 text-sm">
                    <MessageSquare size={16} className="text-emerald-600" />
                    <span>Suporte Técnico Prioritário</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Canal direto via WhatsApp, e-mail e videoconferência com tempo de resposta ágil para suporte operacional e resolução de dúvidas.
                  </p>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-neutral-900 text-sm">
                    <Scale size={16} className="text-emerald-600" />
                    <span>Enquadramento Art. 75, II</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Processo administrativo de contratação direta pronto e simplificado, acompanhado de Minuta de Termo de Referência inclusa nesta proposta.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7: Impacto Orçamentário Positivo & ROI Governamental */}
            <section className="space-y-6 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white p-6 sm:p-8 rounded-3xl border border-neutral-800 shadow-xl print:bg-neutral-950">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 text-neutral-950 rounded-2xl font-black text-sm shadow-md shadow-emerald-500/20">07</div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                      Retorno do Investimento & Eficiência Comprovada
                    </h3>
                    <p className="text-xs text-neutral-400 font-medium">
                      A modernização institucional da gestão municipal se autofinancia com a redução imediata de custos operacionais.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">Até 60%</div>
                  <div className="text-xs font-bold text-white mt-1">Economia de Insumos</div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Eliminação de resmas de papel, toner, arquivos físicos e impressões.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">0 Risco</div>
                  <div className="text-xs font-bold text-white mt-1">Multas Pessoais TCE</div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Alertas preventivos de prazos da LRF para o Prefeito e Secretários.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">-80%</div>
                  <div className="text-xs font-bold text-white mt-1">Tempo de Tramitação</div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Assinatura digital ICP-Brasil e publicação de atos em minutos.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">Selo Ouro</div>
                  <div className="text-xs font-bold text-white mt-1">Radar PNTP / ATRICON</div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Transparência ativa e reconhecimento pelos órgãos de controle.</p>
                </div>
              </div>
            </section>

            {/* Footer Banner com CTA de Alto Impacto */}
            <div className="pt-6 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl print:bg-neutral-950 shadow-2xl">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                  Proposta Comercial Válida por 60 Dias · Exercício 2026
                </div>
                <h4 className="text-lg sm:text-xl font-black tracking-tight italic">
                  Gestão 360 · Consultoria & Tecnologia Pública
                </h4>
                <p className="text-xs text-neutral-300 max-w-xl">
                  Para formalizar a contratação por Dispensa (Lei 14.133/21), solicitar adequações na minuta ou agendar apresentação no gabinete:
                </p>
                <div className="pt-2 text-xs font-bold text-emerald-400 flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Atendimento Oficial AFIC
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} /> aficconsultoria@gmail.com
                  </span>
                </div>
              </div>

              <a
                href={WA_SHARE_URL}
                target="_blank"
                rel="noreferrer"
                className="no-print px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shrink-0 shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 flex items-center gap-2 group"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-950 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-950"></span>
                </span>
                <Send size={15} />
                <span>Solicitar Minuta Contratual no WhatsApp</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: MINUTA DE TERMO DE REFERÊNCIA (LEI 14.133/2021) */}
      {activeTab === 'termo_referencia' && (
        <div className="p-6 sm:p-10 space-y-8 bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg text-[10px] font-black tracking-wider uppercase">
                  Documento Oficial para Instrução Processual
                </span>
                <span className="text-xs text-neutral-400 font-semibold">Art. 75, II / Art. 86 Lei 14.133/21</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 mt-2">
                Minuta de Termo de Referência Simplificado (TR)
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Pronta para inclusão no processo administrativo de contratação direta por <strong>{municipality}</strong>.
              </p>
            </div>

            <div className="no-print flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(trTextContent, 'Minuta de Termo de Referência copiada!')}
                className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-sky-600/20"
              >
                <Copy size={14} />
                <span>Copiar Texto Completo</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                <Printer size={14} />
                <span>Imprimir TR</span>
              </button>
            </div>
          </div>

          {/* Termo de Referência Formatted Body */}
          <div className="space-y-6 text-xs text-neutral-800 leading-relaxed font-serif p-6 sm:p-8 bg-neutral-50 rounded-2xl border border-neutral-200">
            <div className="text-center space-y-1 pb-4 border-b border-neutral-300">
              <h3 className="font-bold text-sm uppercase tracking-wide text-neutral-900">
                ESTADO DE MATO GROSSO · {municipality.toUpperCase()}
              </h3>
              <h4 className="font-bold text-xs uppercase text-neutral-700">
                SETOR DE COMPRAS, CONTRATOS E LICITAÇÕES
              </h4>
              <p className="text-[11px] text-neutral-500 italic">
                Minuta de Termo de Referência nos moldes da Lei Federal nº 14.133/2021
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-neutral-900 uppercase">1. DO OBJETO</h4>
              <p className="text-justify font-sans text-xs">
                1.1. Contratação de empresa especializada em tecnologia da informação para fornecimento de licença de uso temporário de software em nuvem (SaaS - Software as a Service) voltado à governança pública municipal, com suporte continuado, implantação, migração inicial de dados e treinamento de servidores, para atender às demandas de modernização institucional da <strong>{municipality}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-neutral-900 uppercase">2. DA JUSTIFICATIVA E INTERESSE PÚBLICO</h4>
              <p className="text-justify font-sans text-xs">
                2.1. A contratação visa atender aos imperativos de eficiência, transparência ativa e conformidade fiscal exigidos pela Lei de Responsabilidade Fiscal (LRF), pelo Radar Nacional de Transparência Pública (PNTP/ATRICON) e pelas diretrizes preventivas do Tribunal de Contas do Estado (TCE).<br />
                2.2. A implantação de ferramentas digitais centralizadas para a Saúde Municipal (estoque transparente de medicamentos da Farmácia SUS) e Educação (controle de vagas em creches e merenda escolar) garantirá agilidade aos serviços essenciais e segurança jurídica aos ordenadores de despesas.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-neutral-900 uppercase">3. DO ENQUADRAMENTO LEGAL</h4>
              <p className="text-justify font-sans text-xs">
                3.1. A presente contratação encontra amparo no <strong>Artigo 75, inciso II da Lei Federal nº 14.133/2021</strong>, que autoriza a dispensa de licitação para serviços e compras com valores inferiores ao teto legal estabelecido pela legislação federal anual, ou subsidiariamente por meio de <strong>Adesão à Ata de Registro de Preços (Art. 86)</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-neutral-900 uppercase">4. DOS REQUISITOS TÉCNICOS E ESPECIFICAÇÕES DA PLATAFORMA</h4>
              <ul className="list-disc pl-5 font-sans text-xs space-y-1.5">
                <li>Ambiente 100% em nuvem (SaaS), dispensando aquisição de servidores locais físicos ou licenças adicionais.</li>
                <li>Módulo Gabinete & Gestão 360 com alertas automáticos pré-auditoria do TCE.</li>
                <li>Módulo Saúde 360 com transparência pública de estoque de medicamentos da Farmácia SUS e agendamentos.</li>
                <li>Módulo Educação 360 com fila pública e cronológica de vagas para CMEI / Creches e gestão de transporte.</li>
                <li>Banco de Leis e Atos Normativos Municipais com motor de busca de inteiro teor e assinatura ICP-Brasil.</li>
                <li>Atendimento aos critérios de avaliação Ouro e Diamante do Programa Nacional de Transparência Pública (PNTP).</li>
                <li>Disponibilidade mínima mensal garantida de 99,5% (SLA).</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-neutral-900 uppercase">5. DO PRAZO DE IMPLANTAÇÃO E CAPACITAÇÃO</h4>
              <p className="text-justify font-sans text-xs">
                5.1. A contratada deverá disponibilizar a plataforma customizada no prazo máximo de <strong>7 (sete) dias corridos</strong> após a emissão da Ordem de Serviço.<br />
                5.2. O treinamento dos servidores operadores das secretarias será realizado em ambiente remoto ou presencial, com fornecimento de manual operacional digital.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-neutral-900 uppercase">6. DA VIGÊNCIA E DO SUPORTE TÉCNICO</h4>
              <p className="text-justify font-sans text-xs">
                6.1. O contrato terá vigência de 12 (doze) meses, prorrogável nos termos da Lei 14.133/2021.<br />
                6.2. O suporte técnico estará disponível em dias úteis, via canais digitais (WhatsApp, videoconferência e e-mail).
              </p>
            </div>

            <div className="pt-6 text-center border-t border-neutral-300 font-sans text-xs">
              <p>Documento de apoio elaborado pela AFIC Consultoria & Tecnologia para instrução técnica.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OFÍCIO FORMAL DE ENCAMINHAMENTO */}
      {activeTab === 'oficio' && (
        <div className="p-6 sm:p-10 space-y-8 bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-[10px] font-black tracking-wider uppercase">
                  Ofício Formal de Encaminhamento
                </span>
                <span className="text-xs text-neutral-400 font-semibold">Ofício AFIC nº 026/2026</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 mt-2">
                Carta Institucional de Apresentação
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Documento formal de protocolo endereçado a <strong>{recipientRole}</strong>.
              </p>
            </div>

            <div className="no-print flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                <Printer size={14} />
                <span>Imprimir Carta / Ofício</span>
              </button>
            </div>
          </div>

          {/* Ofício Body */}
          <div className="p-6 sm:p-10 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-8 font-serif text-neutral-900 text-sm leading-relaxed">
            {/* Header Timbre */}
            <div className="flex items-center justify-between border-b border-neutral-300 pb-6 font-sans">
              <div className="flex items-center gap-3">
                <LogoCompass size={40} />
                <div>
                  <div className="font-black text-sm sm:text-base text-neutral-900">AFIC CONSULTORIA & TECNOLOGIA GOVERNAMENTAL</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Soluções em Nuvem para a Gestão Pública</div>
                </div>
              </div>
              <div className="text-right text-xs text-neutral-600">
                <strong>Ofício AFIC nº 026/2026</strong><br />
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Recipient */}
            <div className="space-y-1 font-sans">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">A Sua Excelência:</p>
              <p className="text-base font-bold text-neutral-900">{recipientRole}</p>
              <p className="text-sm font-semibold text-emerald-800">{municipality}</p>
            </div>

            {/* Subject */}
            <div className="p-3 bg-neutral-100 rounded-xl font-sans text-xs font-bold text-neutral-800">
              Assunto: Apresentação da Plataforma GESTÃO 360 e Minuta Técnica para Modernização Municipal
            </div>

            {/* Letter Content */}
            <div className="space-y-4 text-justify text-neutral-800">
              <p>
                Cumprimentando-o(a) cordialmente, dirigimo-nos a Vossa Excelência para submeter à apreciação desta conceituada Administração a Proposta Comercial Institucional da plataforma <strong>GESTÃO 360</strong>, concebida para atender às complexas demandas de governança, blindagem jurídica e eficiência operacional dos municípios brasileiros.
              </p>
              <p>
                O sistema Gestão 360 opera 100% em modelo de computação em nuvem (SaaS), eliminando despesas com aquisição de servidores locais físicos, oferecendo módulos integrados para o Gabinete, Controle Interno (com alertas preventivos pré-auditoria do TCE), Saúde Pública (Farmácia SUS Digital e agendamentos), Educação (Fila cronológica e transparente de vagas em creches) e Diário Oficial com certificado ICP-Brasil.
              </p>
              <p>
                Ressaltamos que a contratação encontra pleno amparo na <strong>Lei Federal nº 14.133/2021 (Nova Lei de Licitações)</strong>, estando inclusa na documentação anexa a minuta do Termo de Referência simplificado, pronta para instrução do setor competente.
              </p>
              <p>
                Na certeza de contarmos com a vossa valorosa atenção, colocamo-nos à inteira disposição para agendamento de uma apresentação técnica demonstrativa, presencialmente ou por videoconferência.
              </p>
            </div>

            {/* Sign-off */}
            <div className="pt-8 text-center space-y-2 font-sans border-t border-neutral-300">
              <div className="font-bold text-neutral-900">AFIC CONSULTORIA & GESTÃO GOVERNAMENTAL</div>
              <div className="text-xs text-neutral-600">Diretoria de Tecnologia e Relações Institucionais</div>
              <div className="text-xs text-emerald-700 font-bold">
                Atendimento Oficial AFIC · ✉️ aficconsultoria@gmail.com
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );

  // Common CSS for print
  const printStyles = (
    <style type="text/css">
      {`
        @media print {
          #root { display: none !important; }
          body { 
            background-color: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
            color: #111827 !important;
          }
          .no-print { display: none !important; }
          .print-page-break { page-break-before: always; }
          .print-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          @page {
            margin: 1.2cm;
            size: A4 portrait;
          }
        }
      `}
    </style>
  );

  // 1. STANDALONE PAGE MODE (/proposta)
  if (isStandalonePage) {
    return (
      <>
        {printStyles}
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center">
          
          {/* Top Exec Bar - Sticky */}
          <header className="no-print sticky top-0 z-50 w-full bg-neutral-900/95 border-b border-neutral-800 shadow-xl backdrop-blur-xl">
            <div className="max-w-5xl mx-auto px-4 py-3.5 space-y-3">
              
              {/* Row 1: Logo, Title & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-xl bg-white/10 border border-white/20">
                    <LogoCompass size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white tracking-wide">GESTÃO 360</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black tracking-widest border border-emerald-500/30">
                        LEI 14.133/21
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">Proposta Comercial & Minuta de Contratação Municipal</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={WA_SHARE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 hover:scale-105"
                  >
                    <Send size={13} />
                    <span>WhatsApp Município</span>
                  </a>

                  <button
                    onClick={() => copyToClipboard(shareableUrl, 'Link copiado com sucesso!')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-700 transition hover:border-emerald-500/40"
                  >
                    <Share2 size={13} className="text-emerald-400" />
                    <span>Copiar Link</span>
                  </button>

                  <button
                    onClick={() => copyToClipboard(trTextContent, 'Minuta de TR copiada!')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-700 transition hover:border-sky-500/40"
                  >
                    <Copy size={13} className="text-sky-400" />
                    <span>Copiar TR</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 transition hover:border-white/30"
                  >
                    <Printer size={13} />
                    <span>Gerar PDF</span>
                  </button>

                  <a
                    href="/"
                    className="flex items-center gap-1 px-3 py-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl text-xs font-bold transition ml-1"
                  >
                    <ChevronLeft size={16} />
                    <span>Voltar ao Site</span>
                  </a>
                </div>
              </div>

              {/* Row 2: Inputs for Realtime Customization */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-0.5">
                    Município Destinatário:
                  </label>
                  <input 
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="Ex: Prefeitura Municipal de Torixoréu - MT"
                    className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-0.5">
                    Autoridade / Cargo:
                  </label>
                  <input 
                    type="text"
                    value={recipientRole}
                    onChange={(e) => setRecipientRole(e.target.value)}
                    placeholder="Ex: Ao Exmo. Sr. Prefeito Municipal"
                    className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-0.5">
                    Módulo de Destaque:
                  </label>
                  <select
                    value={targetFocus}
                    onChange={(e) => setTargetFocus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="visao_geral">🏛️ Suíte Integrada Completa</option>
                    <option value="saude">🏥 Saúde Pública & Farmácia SUS</option>
                    <option value="educacao">🎒 Educação, Merenda & CMEI</option>
                    <option value="fazenda">📊 Blindagem Fiscal & Alertas TCE</option>
                    <option value="camara">⚖️ Câmara Municipal & Transparência</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Tabs */}
              <div className="flex items-center justify-between border-t border-neutral-800 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('proposta')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition ${
                      activeTab === 'proposta' 
                        ? 'bg-emerald-500 text-neutral-950 shadow-sm' 
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <FileText size={13} />
                    <span>1. Proposta & Cronograma</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('termo_referencia')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition ${
                      activeTab === 'termo_referencia' 
                        ? 'bg-sky-500 text-neutral-950 shadow-sm' 
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Scale size={13} />
                    <span>2. Minuta Termo de Referência (TR)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('oficio')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition ${
                      activeTab === 'oficio' 
                        ? 'bg-purple-500 text-neutral-950 shadow-sm' 
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <FileSignature size={13} />
                    <span>3. Ofício de Encaminhamento</span>
                  </button>
                </div>

                {copyFeedback && (
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                    <Check size={14} />
                    <span>{copyFeedback}</span>
                  </div>
                )}
              </div>

            </div>
          </header>

          {/* Main Document Body */}
          <main className="w-full max-w-5xl mx-auto py-8 px-3 sm:px-6">
            {renderDocumentContent()}
          </main>
        </div>
      </>
    );
  }

  // 2. MODAL MODE (Opened on Landing Page via button)
  return createPortal(
    <>
      {printStyles}
      <div className="fixed inset-0 z-[120] bg-neutral-950/85 backdrop-blur-md overflow-y-auto">
        <div className="min-h-full w-full flex flex-col items-center justify-start py-6 sm:py-10 px-3 sm:px-6">
          
          {/* Compact Top Action Bar for Modal (Fixed at top or positioned above document) */}
          <div className="no-print w-full max-w-5xl mb-4 flex items-center justify-between gap-3 bg-neutral-900 border border-neutral-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider pl-2">Proposta Comercial Gestão 360</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                2026
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={WA_SHARE_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs rounded-xl transition shadow-md"
              >
                <Send size={13} />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 transition"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">Imprimir PDF</span>
              </button>

              <a
                href="/proposta"
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl border border-neutral-700 transition hover:border-emerald-500/50"
                title="Abrir em página dedicada com painel de personalização de TR e Ofício"
              >
                <Maximize2 size={13} className="text-emerald-400" />
                <span className="hidden sm:inline">Personalizar TR</span>
              </a>

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition ml-1"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Document Content - Max 5xl, perfectly centered in column */}
          <div className="w-full max-w-5xl">
            {renderDocumentContent()}
          </div>

        </div>
      </div>
    </>,
    document.body
  );
};

export default ProposalModal;
