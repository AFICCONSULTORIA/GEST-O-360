import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Baby, GraduationCap, ChevronLeft, Download, FileText, 
  CheckCircle2, Users, Heart, AlertCircle, CalendarClock,
  Home, MapPin, Scale, Clock, ShieldCheck, Phone
} from 'lucide-react';
import { Institution } from '../../types';

interface PublicCrechePortalProps {
  darkMode: boolean;
  currentInstitution?: Institution | null;
}

export interface CrecheSettings {
  bercarioTotal: number;
  bercarioOccupied: number;
  maternal1Total: number;
  maternal1Occupied: number;
  maternal2Total: number;
  maternal2Occupied: number;
  decretoUrl: string;
  decretoName: string;
  decretoDescription: string;
  isOpen: boolean;
}

export const DEFAULT_CRECHE_SETTINGS: CrecheSettings = {
  bercarioTotal: 20,
  bercarioOccupied: 0,
  maternal1Total: 35,
  maternal1Occupied: 0,
  maternal2Total: 45,
  maternal2Occupied: 0,
  decretoUrl: '#',
  decretoName: 'Decreto Municipal nº 035/2024',
  decretoDescription: 'Regulamentação do Acesso à Educação Infantil e Fila Única dos CMEIs.',
  isOpen: true
};

export const PublicCrechePortal = ({ darkMode, currentInstitution }: PublicCrechePortalProps) => {
  const [settings, setSettings] = useState<CrecheSettings>(DEFAULT_CRECHE_SETTINGS);
  const [activeTab, setActiveTab] = useState<'vagas' | 'criterios' | 'documentos' | 'faq'>('vagas');

  useEffect(() => {
    const saved = localStorage.getItem('@gestao360:creche_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading creche settings', e);
      }
    }
  }, []);

  const totalVagas = settings.bercarioTotal + settings.maternal1Total + settings.maternal2Total;
  const totalOccupied = settings.bercarioOccupied + settings.maternal1Occupied + settings.maternal2Occupied;
  const totalAvailable = totalVagas - totalOccupied;

  return (
    <div className={`min-h-[100dvh] ${darkMode ? 'dark bg-neutral-950' : 'bg-[#F4F4F2]'}`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/40 dark:bg-pink-900/10 rounded-full blur-3xl" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] bg-amber-200/40 dark:bg-amber-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-sky-200/30 dark:bg-sky-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <a 
              href="/"
              className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-pink-600 dark:hover:text-pink-400 shadow-sm border border-neutral-100 dark:border-neutral-800 transition-colors"
            >
              <ChevronLeft size={24} />
            </a>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                Vagas no <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">CMEI</span>
              </h1>
              <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                Fila Única e Transparência Municipal
              </p>
            </div>
          </div>
          
          {currentInstitution && (
            <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 px-4 py-2 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800">
              {currentInstitution.logo_url && (
                <img src={currentInstitution.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
              )}
              <div className="text-right">
                <p className="text-xs font-black text-neutral-900 dark:text-white">{currentInstitution.name}</p>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Secretaria de Educação</p>
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Tabs */}
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-2 rounded-3xl flex flex-wrap sm:flex-nowrap gap-2 shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-x-auto">
              {[
                { id: 'vagas', label: 'Vagas Ofertadas', icon: Baby },
                { id: 'criterios', label: 'Critérios', icon: Scale },
                { id: 'documentos', label: 'Documentação', icon: FileText },
                { id: 'faq', label: 'Dúvidas', icon: AlertCircle }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20' 
                      : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'vagas' && (
                <motion.div 
                  key="vagas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Status Banner */}
                  <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${settings.isOpen ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings.isOpen ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        {settings.isOpen ? <CheckCircle2 size={24} className="text-white" /> : <Clock size={24} className="text-white" />}
                      </div>
                      <div>
                        <h3 className={`text-lg font-black ${settings.isOpen ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {settings.isOpen ? 'Inscrições Abertas' : 'Fila de Espera Ativa'}
                        </h3>
                        <p className={`text-sm font-medium ${settings.isOpen ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'}`}>
                          No momento, o sistema está recebendo novas inscrições.
                        </p>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-3xl font-black text-neutral-900 dark:text-white">{totalVagas}</p>
                      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Vagas Totais da Rede</p>
                    </div>
                  </div>

                  {/* Vagas Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Berçário */}
                    <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-lg shadow-neutral-200/20 dark:shadow-none hover:-translate-y-1 transition-transform">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-sky-100 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center text-sky-500 mb-4">
                          <Baby size={32} />
                        </div>
                        <div className="bg-sky-50 dark:bg-sky-900/20 px-3 py-1 rounded-full border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 text-xs font-bold">
                          0 a 1 ano
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Berçário</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-6">
                        Ambiente acolhedor, climatizado, com lactário e proporção ideal de cuidadores por bebê.
                      </p>
                      
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Vagas Ofertadas</p>
                          <p className="text-3xl font-black text-sky-500">{settings.bercarioTotal}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Disponíveis</p>
                          <p className="text-xl font-black text-neutral-900 dark:text-white">{settings.bercarioTotal - settings.bercarioOccupied}</p>
                        </div>
                      </div>
                    </div>

                    {/* Maternal I */}
                    <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-lg shadow-neutral-200/20 dark:shadow-none hover:-translate-y-1 transition-transform">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
                          <Heart size={32} />
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-xs font-bold">
                          1 a 2 anos
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Maternal I</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-6">
                        Estímulo à linguagem, psicomotricidade, autonomia e socialização com atividades lúdicas.
                      </p>
                      
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Vagas Ofertadas</p>
                          <p className="text-3xl font-black text-amber-500">{settings.maternal1Total}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Disponíveis</p>
                          <p className="text-xl font-black text-neutral-900 dark:text-white">{settings.maternal1Total - settings.maternal1Occupied}</p>
                        </div>
                      </div>
                    </div>

                    {/* Maternal II */}
                    <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-lg shadow-neutral-200/20 dark:shadow-none hover:-translate-y-1 transition-transform md:col-span-2">
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex-shrink-0 flex items-center justify-center text-emerald-500">
                          <Users size={40} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <div className="inline-block bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
                            2 a 3 anos
                          </div>
                          <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">Maternal II</h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                            Musicalização, contação de histórias, brincadeiras ao ar livre e introdução às rotinas escolares.
                          </p>
                        </div>
                        <div className="w-full md:w-auto bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex md:flex-col justify-between items-center gap-4 min-w-[150px]">
                          <div className="text-center">
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Vagas Ofertadas</p>
                            <p className="text-4xl font-black text-emerald-500">{settings.maternal2Total}</p>
                          </div>
                          <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700 md:w-full md:h-px" />
                          <div className="text-center">
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Disponíveis</p>
                            <p className="text-xl font-black text-neutral-900 dark:text-white">{settings.maternal2Total - settings.maternal2Occupied}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'criterios' && (
                <motion.div 
                  key="criterios"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] shadow-lg border border-neutral-100 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-4 mb-8 pb-8 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="w-16 h-16 bg-pink-100 dark:bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500">
                      <Scale size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 dark:text-white">Critérios de Prioridade</h2>
                      <p className="text-neutral-500 dark:text-neutral-400 mt-1">Regras para classificação na Fila Única municipal.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { icon: Baby, title: "I - Criança com deficiência", desc: "Necessidades educacionais especiais comprovadas mediante laudo médico." },
                      { icon: AlertCircle, title: "II - Mãe em situação de violência doméstica", desc: "Conforme laudo ou medida protetiva." },
                      { icon: AlertCircle, title: "III - Criança vítima de violência doméstica", desc: "Acompanhada ou encaminhada pelo Conselho Tutelar." },
                      { icon: Home, title: "IV - Criança em situação de acolhimento institucional", desc: "Crianças em abrigos ou lares adotivos." },
                      { icon: Heart, title: "V - Família beneficiária de programas sociais", desc: "Bolsa Família, BPC e Ser Família." },
                      { icon: Users, title: "VI - Família monoparental de baixa renda", desc: "Comprovação de renda e composição familiar." },
                      { icon: ShieldCheck, title: "VII - Mãe economicamente ativa de baixa renda", desc: "Comprovação de trabalho e renda." },
                      { icon: FileText, title: "VIII - Declaração de hipossuficiência financeira", desc: "Responsável que apresente declaração de carência financeira." },
                      { icon: MapPin, title: "IX - Zoneamento da residência", desc: "Escola solicitada atenda ao zoneamento da residência do responsável." },
                      { icon: Clock, title: "X - Aguardando transferência", desc: "Criança matriculada em outra cidade aguardando vaga para transferência." },
                      { icon: Scale, title: "XI - Ordem de inscrição", desc: "Ordem cadastral crescente no sistema eletrônico." },
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800">
                        <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-400">
                          <item.icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-lg">{item.title}</h4>
                          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'documentos' && (
                <motion.div 
                  key="documentos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] shadow-lg border border-neutral-100 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-4 mb-8 pb-8 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 dark:text-white">Documentação Exigida</h2>
                      <p className="text-neutral-500 dark:text-neutral-400 mt-1">Separe estes documentos para a inscrição e matrícula.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      "Certidão de Nascimento da criança",
                      "Carteira de Vacinação atualizada",
                      "Comprovante de Residência recente",
                      "Comprovante de Renda/Trabalho",
                      "Cartão do SUS da criança",
                      "Comprovante do NIS / CadÚnico",
                      "RG e CPF dos pais ou responsáveis",
                      "Laudo médico (se houver deficiência)"
                    ].map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                        <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">{doc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'faq' && (
                <motion.div 
                  key="faq"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {[
                    { q: "Qual o horário de funcionamento dos CMEIs?", a: "O atendimento de período integral ocorre das 07h00 às 17h00. O período parcial é das 07h00 às 11h30 (manhã) ou 13h00 às 17h00 (tarde)." },
                    { q: "A alimentação está inclusa?", a: "Sim. Todas as unidades oferecem cardápio balanceado desenvolvido por nutricionistas escolares, incluindo café da manhã, almoço, lanche e jantar (para o integral)." },
                    { q: "Como acompanho minha posição na fila?", a: "As listas são publicadas periodicamente no Diário Oficial e podem ser consultadas presencialmente na Secretaria de Educação ou em nossa central online." },
                  ].map((faq, idx) => (
                    <div key={idx} className="bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
                      <h4 className="text-lg font-black text-neutral-900 dark:text-white mb-2 flex items-start gap-3">
                        <span className="text-pink-500">Q.</span> {faq.q}
                      </h4>
                      <p className="text-neutral-500 dark:text-neutral-400 pl-7">{faq.a}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            
            {/* Decreto Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
                <FileText size={160} />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                  <Download size={28} className="text-white" />
                </div>
                <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                  Documento Oficial
                </div>
                <h3 className="text-2xl font-black mb-2">{settings.decretoName}</h3>
                <p className="text-blue-100 text-sm font-medium mb-8 leading-relaxed">
                  {settings.decretoDescription} Leia para conhecer as regras gerais.
                </p>
                <a 
                  href={settings.decretoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-white text-blue-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Baixar PDF <Download size={18} />
                </a>
              </div>
            </div>

            {/* Inscrição Card */}
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-lg text-center">
              <div className="w-16 h-16 bg-pink-50 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-pink-100 dark:border-pink-800 text-pink-500">
                <CalendarClock size={28} />
              </div>
              <h4 className="text-lg font-black text-neutral-900 dark:text-white mb-2">Deseja matricular?</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 font-medium">
                As matrículas são realizadas <strong className="text-pink-600 dark:text-pink-400">exclusivamente presencialmente no CMEI</strong>. Procure a secretaria portando todos os documentos necessários.
              </p>
              
              <div className="w-full flex flex-col items-center justify-center gap-2 py-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Contato e Dúvidas</p>
                <a href="tel:+5566999307691" className="flex items-center gap-2 text-neutral-900 dark:text-white font-black text-lg hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                  <Phone size={18} className="text-pink-500" /> (66) 9 9930-7691
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
