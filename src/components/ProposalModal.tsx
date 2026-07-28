import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Download, X, CheckCircle2, ShieldCheck, Zap, Globe, 
  Building2, Users, PieChart, Landmark, HeartPulse, GraduationCap, 
  HardHat, MessageSquare, Printer, Send, FileCheck, Shield, Award,
  TrendingUp, Clock, Scale, Lock, Sparkles, Check, XCircle, ArrowRight,
  Calculator, Package, Wrench, Leaf, Tractor, HeartHandshake, PhoneCall
} from 'lucide-react';
import { LogoCompass } from './LogoCompass';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const WA_SHARE_URL = "https://wa.me/5566996893617?text=Ol%C3%A1!%20Gostaria%20de%20solicitar%20uma%20demonstra%C3%A7%C3%A3o%20e%20proposta%20comercial%20do%20sistema%20Gest%C3%A3o%20360.";

  const modalContent = (
    <>
      <style type="text/css">
        {`
          @media print {
            #root { display: none !important; }
            body { 
              background-color: white !important; 
              margin: 0 !important; 
              padding: 0 !important;
            }
          }
        `}
      </style>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-neutral-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible">
        
        {/* Floating action bar header (hidden on print) */}
        <div className="fixed top-4 right-4 sm:right-8 z-[110] flex items-center gap-3 bg-neutral-900/90 border border-neutral-700/60 p-2.5 rounded-2xl shadow-2xl backdrop-blur-xl print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/30 hover:scale-105"
          >
            <Printer size={15} />
            Baixar / Imprimir PDF
          </button>
          
          <a
            href={WA_SHARE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl transition-all border border-neutral-700 hover:border-emerald-500/50"
          >
            <Send size={14} className="text-emerald-400" />
            Falar com Consultor no WhatsApp
          </a>

          <button
            onClick={onClose}
            className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* PDF / Document Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white text-neutral-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-auto border border-neutral-200 print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none print:my-0"
        >
          {/* Cover Header Banner */}
          <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-emerald-950 text-white p-8 sm:p-12 relative overflow-hidden print:bg-neutral-950 print:text-white">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/20 overflow-hidden flex items-center justify-center shadow-lg shadow-black/30">
                    <LogoCompass size={56} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black italic tracking-tight">GESTÃO <span className="text-emerald-400 font-normal">360</span></h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Consultoria & Tecnologia para Gestão Pública</p>
                  </div>
                </div>

                <div className="hidden sm:block text-right border-l border-white/15 pl-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Proposta Comercial Institucional</span>
                  <span className="text-xs font-bold text-white">Edição Executiva 2026</span>
                </div>
              </div>

              {/* Compliance and Certification Badges */}
              <div className="flex items-center gap-2 flex-wrap pt-2">
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

              <div className="pt-4 border-t border-white/10">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Plataforma Integrada de Governança, Compliance & Eficiência Pública Municipal
                </h2>
                <p className="text-neutral-300 text-sm mt-3 max-w-3xl leading-relaxed">
                  Transforme a administração pública do seu município com blindagem jurídica para o Prefeito, controle preventivo do TCE, automação total de secretarias e comunicação direta com o cidadão.
                </p>
              </div>
            </div>
          </div>

          {/* Highlights Metrics Grid */}
          <div className="bg-neutral-900 border-b border-neutral-800 p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-white print:bg-neutral-900">
            <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">-45%</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Custos com Papel & Impressão</div>
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Implantação Chave na Mão</div>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-8 sm:p-12 space-y-12 bg-white print:p-8">
            
            {/* Section 1: Por que o Gestão 360? (Matriz de Comparação Comercial) */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-sm">01</div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-neutral-900">Por que Modernizar sua Prefeitura com o Gestão 360?</h3>
                    <p className="text-xs text-neutral-500 font-medium">Comparativo direto entre o modelo tradicional e a solução Gestão 360.</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* O Cenário Tradicional (Sem Gestão 360) */}
                <div className="p-6 bg-rose-50/60 rounded-3xl border border-rose-200/80 space-y-4">
                  <div className="flex items-center gap-2 text-rose-800 font-black text-sm uppercase tracking-wider">
                    <XCircle size={20} className="text-rose-600" />
                    Modelo Tradicional (Antes)
                  </div>
                  <ul className="space-y-3 text-xs text-neutral-700 font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 font-black shrink-0">✕</span>
                      <span><strong>Processos em Papel & Burocracia:</strong> Perda de tempo com tramitação física de arquivos, pastas acumuladas e risco de extravio.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 font-black shrink-0">✕</span>
                      <span><strong>Risco no Tribunal de Contas (TCE):</strong> Apontamentos fiscais e multas por descumprimento de prazos formais da LRF e PNTP.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 font-black shrink-0">✕</span>
                      <span><strong>Numeração de Atos Descontínua:</strong> Decretos e portarias lançados com números duplicados ou pulados por falta de controle central.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-rose-600 font-black shrink-0">✕</span>
                      <span><strong>Fornecedores Irregulares:</strong> Falta de monitoramento automático de Certidões Negativas de Débito (CNDs), gerando contratos frágeis.</span>
                    </li>
                  </ul>
                </div>

                {/* Com o Gestão 360 */}
                <div className="p-6 bg-emerald-50/70 rounded-3xl border border-emerald-200 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-wider">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    Com a Plataforma Gestão 360 (Depois)
                  </div>
                  <ul className="space-y-3 text-xs text-neutral-800 font-medium">
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-black shrink-0">✓</span>
                      <span><strong>Fluxos 100% Digitais:</strong> Protocolo, atos normativos e solicitações de secretarias com trâmite instantâneo e rastreável.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-black shrink-0">✓</span>
                      <span><strong>Blindagem Fiscais & Alertas TCE:</strong> Avisos automáticos de obrigações com checklists preventivos pré-auditoria.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-black shrink-0">✓</span>
                      <span><strong>Controle Sequencial Inteligente:</strong> Emissão de decretos, portarias e ordens de compra sem erros formais e com histórico.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-black shrink-0">✓</span>
                      <span><strong>Auditoria de CNDs & PNTP:</strong> Monitoramento de certidões corporativas e elevadas notas de transparência pública.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2: Três Pilares da Solução */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-sm">02</div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-neutral-900">Três Pilares de Alto Impacto para a Gestão</h3>
                    <p className="text-xs text-neutral-500 font-medium">Arquitetura desenvolvida para atender Prefeito, Servidores e Cidadãos.</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-6">
                
                {/* Pilar 1 */}
                <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                    <Zap size={24} />
                  </div>
                  <h4 className="font-black text-base text-neutral-900">1. Produtividade & Automação</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Eliminação de retrabalho com numeração automática de documentos, gerador de minutas padrão e protocolo digital simplificado.
                  </p>
                </div>

                {/* Pilar 2 */}
                <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/20">
                    <ShieldCheck size={24} />
                  </div>
                  <h4 className="font-black text-base text-neutral-900">2. Blindagem & Compliance</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Segurança jurídica para o Prefeito e Secretários com checklists do TCE, controle de prazos da LRF e Banco de Leis com busca oficial.
                  </p>
                </div>

                {/* Pilar 3 */}
                <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20">
                    <MessageSquare size={24} />
                  </div>
                  <h4 className="font-black text-base text-neutral-900">3. Transparência Ativa</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                    Aproximação com a população via Central WhatsApp automatizada, Diário Oficial com certificado ICP-Brasil e Radar PNTP elevado.
                  </p>
                </div>

              </div>
            </section>

            {/* Section 3: Arquitetura Completa dos Módulos */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-sm">03</div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-neutral-900">Suíte Completa de Módulos Integrados</h3>
                    <p className="text-xs text-neutral-500 font-medium">Solução modular que atende todas as secretarias e departamentos municipais.</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                
                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex gap-4 items-start">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900">Gabinete & Visão do Prefeito</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed font-medium">
                      Painel gerencial com indicadores estratégicos, acompanhamento de metas municipais, alertas de riscos fiscais e relatórios executivos em tempo real.
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
                      Checklists preventivos do Tribunal de Contas, gestão da Nova Lei de Licitações (14.133/21), Banco de Certidões (CNDs) e integração com o Radar PNTP.
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
                    <HeartPulse size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900">Saúde Pública & Farmácia SUS</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed font-medium">
                      Estoque transparente de medicamentos para o cidadão, controle de escalas médicas, agendamentos presenciais/online e gestão de ambulâncias/TFD.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex gap-4 items-start">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900">Educação, Merenda & Transporte Escolar</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed font-medium">
                      Portal escolar, acompanhamento das rotas de transporte de alunos, controle nutricional de merenda e relatórios de aplicação dos recursos do SIOPE.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 flex gap-4 items-start">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900">Central WhatsApp & Comunicação Cidadã</h4>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed font-medium">
                      Disparo automático de lembretes e certidões via WhatsApp para o munícipe, canal direto de ouvidoria e módulo Câmara 360 para o Legislativo.
                    </p>
                  </div>
                </div>

              </div>
            </section>

            {/* Section 4: Modalidades de Contratação Pública Simplificada */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-sm">04</div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-neutral-900">Amparo Legal & Facilidade de Contratação</h3>
                    <p className="text-xs text-neutral-500 font-medium">Mecanismos previstos em lei para contratação rápida por Prefeituras e Câmaras.</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
                  <div className="font-black text-sm text-emerald-900 flex items-center gap-2">
                    <Award size={16} className="text-emerald-600" />
                    Inexigibilidade / Dispensa
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Amparado pelos Arts. 74 e 75 da Lei nº 14.133/2021 para contratação direta de software especializado em gestão pública.
                  </p>
                </div>

                <div className="p-5 bg-sky-50/50 rounded-2xl border border-sky-200/80 space-y-2">
                  <div className="font-black text-sm text-sky-900 flex items-center gap-2">
                    <FileCheck size={16} className="text-sky-600" />
                    Adesão à Ata de Registro (Carona)
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Possibilidade de adesão ágil a Atas de Registro de Preços vigentes de outros municípios consorciados.
                  </p>
                </div>

                <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200/80 space-y-2">
                  <div className="font-black text-sm text-purple-900 flex items-center gap-2">
                    <Globe size={16} className="text-purple-600" />
                    Pregão Eletrônico
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Termo de Referência (TR) e especificações técnicas prontas para instrução imediata do processo licitatório.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: Cronograma de Implantação Turnkey (7 Dias) */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-sm">05</div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-neutral-900">Implantação Ágil em 7 Dias (Turnkey)</h3>
                    <p className="text-xs text-neutral-500 font-medium">Sem necessidade de investimento em servidores físicos ou infraestrutura local.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 bg-neutral-900 text-white rounded-2xl space-y-2">
                  <div className="text-xs font-black text-emerald-400 uppercase tracking-widest">Dias 1 a 2</div>
                  <div className="font-bold text-sm">Setup & Subdomínio</div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Instalação na nuvem, configuração de segurança e personalização com a identidade oficial da prefeitura.
                  </p>
                </div>

                <div className="p-5 bg-neutral-900 text-white rounded-2xl space-y-2">
                  <div className="text-xs font-black text-emerald-400 uppercase tracking-widest">Dias 3 a 4</div>
                  <div className="font-bold text-sm">Migração de Dados</div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Importação segura do acervo documental, leis, certidões e cadastro de usuários das secretarias.
                  </p>
                </div>

                <div className="p-5 bg-neutral-900 text-white rounded-2xl space-y-2">
                  <div className="text-xs font-black text-emerald-400 uppercase tracking-widest">Dias 5 a 6</div>
                  <div className="font-bold text-sm">Capacitação da Equipe</div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Treinamento prático presencial ou online para secretários, controladores internos e servidores operadores.
                  </p>
                </div>

                <div className="p-5 bg-emerald-600 text-white rounded-2xl space-y-2 shadow-lg shadow-emerald-600/30">
                  <div className="text-xs font-black text-emerald-200 uppercase tracking-widest">Dia 7</div>
                  <div className="font-bold text-sm">Go-Live & Suporte VIP</div>
                  <p className="text-[11px] text-emerald-100 leading-relaxed">
                    Início das operações com acompanhamento direto de consultor especialista e canal exclusivo via WhatsApp.
                  </p>
                </div>
              </div>
            </section>

            {/* Footer Contact & Action Banner */}
            <div className="pt-6 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-emerald-950 text-white p-8 sm:p-10 rounded-3xl print:bg-neutral-950 shadow-2xl">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                  Solicite uma Demonstração Sem Compromisso
                </div>
                <h4 className="text-xl font-black tracking-tight italic">Gestão 360 · Consultoria & Tecnologia Governamental</h4>
                <p className="text-xs text-neutral-300 max-w-xl">
                  Agende uma apresentação técnica presencial ou por videoconferência com nossos consultores de gestão pública.
                </p>
                <div className="pt-2 text-xs font-bold text-emerald-400 flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <span>📞 (66) 99689-3617</span>
                  <span>✉️ aficconsultoria@gmail.com</span>
                </div>
              </div>

              <a
                href={WA_SHARE_URL}
                target="_blank"
                rel="noreferrer"
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shrink-0 shadow-xl shadow-emerald-500/30 hover:scale-105 print:hidden flex items-center gap-2"
              >
                <PhoneCall size={16} />
                Agendar Apresentação
              </a>
            </div>

          </div>
        </motion.div>
      </div>
    </>
  );

  return createPortal(
    <AnimatePresence>
      {modalContent}
    </AnimatePresence>,
    document.body
  );
};
