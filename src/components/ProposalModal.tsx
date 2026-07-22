import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Download, X, CheckCircle2, ShieldCheck, Zap, Globe, 
  Building2, Users, PieChart, Landmark, HeartPulse, GraduationCap, 
  HardHat, MessageSquare, Printer, Send, FileCheck, ListOrdered
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

  const WA_SHARE_URL = "https://wa.me/5566996893617?text=Ol%C3%A1!%20Gostaria%20de%20receber%20a%20proposta%20comercial%20e%20apresenta%C3%A7%C3%A3o%20do%20Gest%C3%A3o%20360.";

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
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl transition-all border border-neutral-700"
          >
            <Send size={14} className="text-emerald-400" />
            Enviar por WhatsApp
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
          className="bg-white text-neutral-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto border border-neutral-200 print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none print:my-0"
        >
          {/* Cover Header Banner */}
          <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-emerald-950 text-white p-8 sm:p-12 relative overflow-hidden print:bg-neutral-950 print:text-white">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
                    <LogoCompass size={32} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black italic tracking-tight">GESTÃO <span className="text-emerald-400 font-normal">360</span></h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Tecnologia & Governança Pública Municipal</p>
                  </div>
                </div>
                <div className="hidden sm:block text-right border-l border-white/15 pl-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">Documento Institucional</span>
                  <span className="text-xs font-bold text-white">Apresentação Técnica Comercial</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-emerald-500/30">
                  Transformação Digital Governamental
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Plataforma Integrada de Governança, Transparência & Eficiência Municipal
                </h2>
                <p className="text-neutral-300 text-sm mt-3 max-w-2xl leading-relaxed">
                  Solução completa para blindagem jurídica do gestor, controle preventivo do TCE, automação de secretarias e transparência ativa para a população.
                </p>
              </div>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-8 sm:p-12 space-y-10 bg-white print:p-8">
            
            {/* Section 1: Os Dois Pilares da Solução */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-sm">01</div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-neutral-900">Pilares Fundamentais do Gestão 360</h3>
                  <p className="text-xs text-neutral-500 font-medium">Desenhado para simplificar a rotina e proteger a administração pública.</p>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                
                {/* Pilar 1: O Servidor */}
                <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-wider">
                    <Zap size={18} className="text-emerald-600" />
                    1. Facilidade & Produtividade para o Servidor
                  </div>
                  <ul className="space-y-2 text-xs text-neutral-700 leading-relaxed font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span><strong>Zero Burocracia & Retrabalho:</strong> Eliminação de planilhas paralelas e pilhas de papel com processos 100% digitais.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span><strong>Controle Sequencial Automático:</strong> Fim do erro de numeração duplicada ou pulada em decretos, portarias e ofícios.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span><strong>Interface Intuitiva:</strong> Telas amigáveis e fluxo simplificado para que a equipe trabalhe sem estresse.</span>
                    </li>
                  </ul>
                </div>

                {/* Pilar 2: A Prefeitura / Prefeito */}
                <div className="p-5 bg-sky-50/50 rounded-2xl border border-sky-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-sky-800 font-black text-sm uppercase tracking-wider">
                    <ShieldCheck size={18} className="text-sky-600" />
                    2. Segurança Jurídica & Tranquilidade para o Gestor
                  </div>
                  <ul className="space-y-2 text-xs text-neutral-700 leading-relaxed font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 font-bold">•</span>
                      <span><strong>Alertas Preventivos TCE/LRF:</strong> Notificações antes de prazos vencerem, prevenindo apontamentos e multas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 font-bold">•</span>
                      <span><strong>Banco de Certidões (CND):</strong> Validação contínua da regularidade de fornecedores para evitar contratos irregulares.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 font-bold">•</span>
                      <span><strong>Radar PNTP & Transparência:</strong> Conformidade total com a Lei 14.133 para elevar o índice nacional do município.</span>
                    </li>
                  </ul>
                </div>

              </div>
            </section>

            {/* Section 2: Arquitetura do Sistema */}
            <section className="space-y-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-sm">02</div>
                <h3 className="text-xl font-black tracking-tight text-neutral-900">Arquitetura Completa de Módulos</h3>
              </div>

              <div className="space-y-3 pt-2">
                
                {/* Module item 1 */}
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <Landmark size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm text-neutral-900">Gabinete, Visão do Prefeito & Governança</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Painel exclusivo para o Prefeito com indicadores estratégicos, acompanhamento de metas, alertas de riscos fiscais e relatórios consolidados em tempo real.
                    </p>
                  </div>
                </div>

                {/* Module item 2 */}
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <PieChart size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm text-neutral-900">Controles Internos & Gestão Financeira (Lei 14.133)</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Checklists preventivos do TCE, gestão de contratos, banco de certidões automatizado, regulação de atas e integração nativa com o PNTP.
                    </p>
                  </div>
                </div>

                {/* Module item 3 */}
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <HeartPulse size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm text-neutral-900">Saúde Pública & Farmácia SUS</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Controle de estoque de medicamentos com portal de transparência, gestão de frotas de ambulâncias, TFD e agendamento online de consultas.
                    </p>
                  </div>
                </div>

                {/* Module item 4 */}
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm text-neutral-900">Educação, Obras & Serviços Públicos</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Portal escolar, acompanhamento de transporte e merenda, vistorias de obras, tombamento patrimonial via QR Code e chamados de manutenção urbana.
                    </p>
                  </div>
                </div>

                {/* Module item 5 */}
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="p-3 bg-neutral-900 text-white rounded-xl shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm text-neutral-900">Central WhatsApp & Integração Legislativa</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Notificações automáticas via WhatsApp para cidadãos e servidores, além do módulo Câmara 360 para integração ágil com os vereadores.
                    </p>
                  </div>
                </div>

              </div>
            </section>

            {/* Section 3: Diferenciais e Implantação */}
            <section className="space-y-4 pt-4 border-t border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-sm">03</div>
                <h3 className="text-xl font-black tracking-tight text-neutral-900">Diferenciais & Modelo de Implantação</h3>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-center space-y-2">
                  <div className="text-2xl font-black text-emerald-800">7 Dias</div>
                  <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Implantação Rápida</div>
                  <p className="text-[11px] text-emerald-700 leading-normal">
                    Configuração em nuvem imediata com cadastro de subdomínio e logo da prefeitura em menos de 7 dias.
                  </p>
                </div>

                <div className="p-5 bg-sky-50/60 rounded-2xl border border-sky-200/80 text-center space-y-2">
                  <div className="text-2xl font-black text-sky-800">100% Nuvem</div>
                  <div className="text-xs font-bold text-sky-900 uppercase tracking-wider">Sem Servidores Físicos</div>
                  <p className="text-[11px] text-sky-700 leading-normal">
                    Infraestrutura moderna e segura, sem necessidade de investimento em hardware local ou equipe de TI interna.
                  </p>
                </div>

                <div className="p-5 bg-purple-50/60 rounded-2xl border border-purple-200/80 text-center space-y-2">
                  <div className="text-2xl font-black text-purple-800">Suporte VIP</div>
                  <div className="text-xs font-bold text-purple-900 uppercase tracking-wider">Capacitação Contínua</div>
                  <p className="text-[11px] text-purple-700 leading-normal">
                    Treinamento dedicado para secretários e servidores, além de canal direto via WhatsApp para suporte técnico.
                  </p>
                </div>
              </div>
            </section>

            {/* Footer Contact & Sign-off */}
            <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row justify-between items-center gap-6 bg-neutral-900 text-white p-8 rounded-3xl print:bg-neutral-950">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-lg font-black italic">Gestão 360 · Consultoria & Tecnologia</h4>
                <p className="text-xs text-neutral-400">Solicite uma demonstração ao vivo para a equipe do seu município.</p>
                <p className="text-xs font-bold text-emerald-400 pt-1">Contato Comercial: (66) 99689-3617 | aficconsultoria@gmail.com</p>
              </div>

              <a
                href={WA_SHARE_URL}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shrink-0 shadow-lg shadow-emerald-500/30 print:hidden"
              >
                Agendar Demonstração
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
