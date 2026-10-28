import React, { useState } from 'react';
import { 
  Building2, 
  FileText, 
  Send, 
  Share2, 
  Copy, 
  Printer, 
  ExternalLink, 
  Check, 
  Scale, 
  FileSignature, 
  ShieldCheck, 
  Lock, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  HeartPulse, 
  GraduationCap, 
  Landmark, 
  PieChart, 
  MessageSquare, 
  Award, 
  FileCheck, 
  PhoneCall,
  Sparkles
} from 'lucide-react';
import { Institution } from '../../types';
import { LogoCompass } from '../../components/LogoCompass';

interface SaaSControlCenterProposalProps {
  institutions: Institution[];
}

export const SaaSControlCenterProposal: React.FC<SaaSControlCenterProposalProps> = ({ institutions }) => {
  const [selectedInstId, setSelectedInstId] = useState<string>('custom');
  const [customMunicipality, setCustomMunicipality] = useState<string>('Prefeitura Municipal de Torixoréu - MT');
  const [recipientRole, setRecipientRole] = useState<string>('Ao Exmo. Sr. Prefeito Municipal');
  const [targetFocus, setTargetFocus] = useState<string>('visao_geral');
  const [activeTab, setActiveTab] = useState<'proposta' | 'termo_referencia' | 'oficio'>('proposta');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Active municipality name
  const municipality = selectedInstId === 'custom' 
    ? customMunicipality 
    : (institutions.find(i => i.id === selectedInstId)?.name || customMunicipality);

  const handleSelectInstitution = (instId: string) => {
    setSelectedInstId(instId);
    if (instId !== 'custom') {
      const inst = institutions.find(i => i.id === instId);
      if (inst) {
        setCustomMunicipality(inst.name);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // URL pública parametrizada para enviar aos municípios
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

  // Mensagem oficial para WhatsApp
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* PAINEL DE CONTROLE EXECUTIVO DA PROPOSTA NO SAAS */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900 dark:text-white">Gerador & Editor de Proposta Comercial Governamental</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  Lei 14.133/21
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Personalize propostas para prefeituras parceiras, gere a minuta de Termo de Referência e envie pelo WhatsApp
              </p>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={WA_SHARE_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              title="Disparar proposta formatada no WhatsApp"
            >
              <Send size={13} />
              <span>Enviar WhatsApp</span>
            </a>

            <button
              onClick={() => copyToClipboard(shareableUrl, 'Link copiado para a área de transferência!')}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 transition"
              title="Copiar link com parâmetros do município"
            >
              <Share2 size={13} className="text-emerald-500" />
              <span>Copiar Link</span>
            </button>

            <button
              onClick={() => copyToClipboard(trTextContent, 'Minuta de Termo de Referência copiada com sucesso!')}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 transition"
              title="Copiar minuta de TR da Lei 14.133 para processo de compras"
            >
              <Copy size={13} className="text-sky-500" />
              <span>Copiar TR</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 transition"
              title="Imprimir ou gerar PDF A4"
            >
              <Printer size={13} />
              <span>Gerar PDF</span>
            </button>

            <a
              href={shareableUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition"
              title="Visualizar como a autoridade receberá a página pública"
            >
              <ExternalLink size={13} />
              <span>Ver Link Público</span>
            </a>
          </div>
        </div>

        {/* Formulário de Configuração Rápida */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              Selecionar Município Cadastrado:
            </label>
            <select
              value={selectedInstId}
              onChange={(e) => handleSelectInstitution(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="custom">✍️ Digitar Município Manualmente...</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              Nome do Município / Órgão:
            </label>
            <input
              type="text"
              value={customMunicipality}
              onChange={(e) => {
                setCustomMunicipality(e.target.value);
                if (selectedInstId !== 'custom') setSelectedInstId('custom');
              }}
              placeholder="Ex: Prefeitura Municipal de Torixoréu - MT"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              Destinatário / Autoridade:
            </label>
            <input
              type="text"
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
              placeholder="Ex: Ao Exmo. Sr. Prefeito Municipal"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              Módulo de Destaque:
            </label>
            <select
              value={targetFocus}
              onChange={(e) => setTargetFocus(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="visao_geral">🏛️ Suíte Integrada Completa</option>
              <option value="saude">🏥 Saúde Pública & Farmácia SUS</option>
              <option value="educacao">🎒 Educação, Merenda & CMEI</option>
              <option value="fazenda">📊 Blindagem Fiscal & Alertas TCE</option>
              <option value="camara">⚖️ Câmara Municipal & Transparência</option>
            </select>
          </div>
        </div>

        {/* Seletor de Abas de Documento */}
        <div className="flex flex-wrap items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-4 gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('proposta')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'proposta' 
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-neutral-950 shadow-sm' 
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <FileText size={14} />
              <span>1. Proposta Comercial & Módulos</span>
            </button>

            <button
              onClick={() => setActiveTab('termo_referencia')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'termo_referencia' 
                  ? 'bg-sky-600 text-white dark:bg-sky-500 dark:text-neutral-950 shadow-sm' 
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <Scale size={14} />
              <span>2. Minuta Termo de Referência (TR Lei 14.133)</span>
            </button>

            <button
              onClick={() => setActiveTab('oficio')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'oficio' 
                  ? 'bg-purple-600 text-white dark:bg-purple-500 dark:text-neutral-950 shadow-sm' 
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <FileSignature size={14} />
              <span>3. Carta / Ofício Formal</span>
            </button>
          </div>

          {copyFeedback && (
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-pulse">
              <Check size={14} />
              <span>{copyFeedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* PRÉ-VISUALIZAÇÃO DA PROPOSTA OFICIAL FORMATADA */}
      <div className="bg-white text-neutral-900 rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-w-5xl mx-auto">
        
        {/* TAB 1: PROPOSTA COMERCIAL */}
        {activeTab === 'proposta' && (
          <div>
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-emerald-950 text-white p-8 sm:p-10 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/20 overflow-hidden flex items-center justify-center shadow-lg bg-neutral-900 p-1">
                      <LogoCompass size={48} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black italic tracking-tight">GESTÃO <span className="text-emerald-400 font-normal">360</span></h1>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Consultoria & Tecnologia para Gestão Pública</p>
                    </div>
                  </div>

                  <div className="text-right border-l border-white/15 pl-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Proposta Comercial Institucional</span>
                    <span className="text-xs font-bold text-white block">Edição Executiva 2026</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">Ref: Lei Federal nº 14.133/21</span>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Proposta Direcionada a:</div>
                    <div className="text-base font-black text-white">{recipientRole}</div>
                    <div className="text-xs font-bold text-emerald-400">{municipality}</div>
                  </div>
                  <div className="text-xs text-neutral-300 font-medium">
                    Data de Emissão: <strong className="text-white">{new Date().toLocaleDateString('pt-BR')}</strong>
                  </div>
                </div>

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
                  <h2 className="text-2xl font-black tracking-tight leading-tight">
                    Plataforma Integrada de Governança, Compliance & Eficiência Pública Municipal
                  </h2>
                  <p className="text-neutral-300 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
                    Modernização completa para a gestão de <strong>{municipality}</strong>: blindagem preventiva contra apontamentos do TCE, digitalização integral de processos, transparência ativa e ferramentas especializadas para as Secretarias de Saúde e Educação.
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="bg-neutral-900 border-b border-neutral-800 p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-white">
              <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-2xl font-black text-emerald-400">-45%</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Custos com Papel</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-2xl font-black text-emerald-400">100%</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Conformidade LRF & TCE</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-2xl font-black text-emerald-400">0</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Risco de Duplicidade</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-2xl font-black text-emerald-400">7 Dias</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 mt-1">Implantação Turnkey</div>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-8 sm:p-10 space-y-10">
              {/* Seção Saúde & Educação */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3">
                  <div className="flex items-center gap-2.5 text-rose-600 font-black text-sm">
                    <HeartPulse size={20} />
                    <span>Saúde Pública 360 & Farmácia SUS</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Estoque transparente de remédios para a população, regulação e agendamento de consultas da UBS, frotas de ambulâncias/TFD e controle dos 15% constitucionais da Saúde.
                  </p>
                </div>

                <div className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-3">
                  <div className="flex items-center gap-2.5 text-sky-600 font-black text-sm">
                    <GraduationCap size={20} />
                    <span>Educação 360 & Fila de CMEIs</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Fila de vagas em creches auditável pelo Ministério Público, controle nutricional da merenda escolar FNDE e rotas de transporte escolar rural (SIOPE 25%).
                  </p>
                </div>
              </div>

              {/* Amparo Legal */}
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                  <Scale size={20} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-emerald-950">Amparo na Lei Federal nº 14.133/2021 (Nova Lei de Licitações)</h4>
                  <p className="text-xs text-neutral-700 mt-1 leading-relaxed">
                    Contratação direta imediata por Dispensa de Licitação em razão do valor (Art. 75, inciso II) ou por Adesão a Ata de Registro de Preços (Art. 86). Acompanha minuta de Termo de Referência pronta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MINUTA TR */}
        {activeTab === 'termo_referencia' && (
          <div className="p-8 sm:p-10 space-y-6">
            <div className="text-center space-y-1 pb-4 border-b border-neutral-300 font-serif">
              <h3 className="font-bold text-sm uppercase text-neutral-900">
                ESTADO DE MATO GROSSO · {municipality.toUpperCase()}
              </h3>
              <h4 className="font-bold text-xs uppercase text-neutral-700">
                MINUTA DE TERMO DE REFERÊNCIA SIMPLIFICADO (LEI Nº 14.133/2021)
              </h4>
            </div>
            <pre className="font-mono text-xs text-neutral-800 bg-neutral-50 p-6 rounded-2xl border border-neutral-200 whitespace-pre-wrap leading-relaxed">
              {trTextContent}
            </pre>
          </div>
        )}

        {/* TAB 3: OFÍCIO FORMAL */}
        {activeTab === 'oficio' && (
          <div className="p-8 sm:p-10 space-y-6 font-serif text-xs leading-relaxed text-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-300 pb-4 font-sans">
              <div className="font-bold text-sm">AFIC CONSULTORIA & TECNOLOGIA GOVERNAMENTAL</div>
              <div className="text-xs text-neutral-500">Ofício AFIC nº 026/2026 · {new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            <div className="space-y-1 font-sans">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">A Sua Excelência:</p>
              <p className="font-bold text-sm text-neutral-900">{recipientRole}</p>
              <p className="text-xs font-semibold text-emerald-800">{municipality}</p>
            </div>
            <p className="text-justify">
              Cumprimentando-o(a) cordialmente, dirigimo-nos a Vossa Excelência para submeter à apreciação desta conceituada Administração a Proposta Comercial Institucional da plataforma <strong>GESTÃO 360</strong>, concebida para atender às demandas de governança, blindagem jurídica e eficiência operacional dos municípios brasileiros nos moldes da Lei Federal nº 14.133/2021.
            </p>
            <p className="text-justify">
              O sistema opera 100% em modelo de computação em nuvem (SaaS), eliminando despesas com aquisição de servidores locais físicos, oferecendo módulos integrados para Saúde Pública, Educação e Compliance TCE.
            </p>
          </div>
        )}

      </div>

    </div>
  );
};
