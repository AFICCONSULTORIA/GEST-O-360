import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, ThumbsUp, MessageSquare, Send, Sparkles, 
  Search, CheckCircle2, Users, Calendar, Plus, Heart, 
  Share2, ShieldCheck, MapPin, Eye 
} from 'lucide-react';
import { SugestaoPopular, Vereador, MateriaLegislativa } from '../types';
import { CamaraService } from '../services/camaraService';
import { showToast } from '../../../components/ui/Toast';

interface PortalCidadaoCamaraProps {
  vereadores: Vereador[];
  materias: MateriaLegislativa[];
}

export const PortalCidadaoCamara: React.FC<PortalCidadaoCamaraProps> = ({
  vereadores,
  materias
}) => {
  const [sugestoes, setSugestoes] = useState<SugestaoPopular[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);

  // Form states
  const [nomeCidadao, setNomeCidadao] = useState('');
  const [email, setEmail] = useState('');
  const [bairro, setBairro] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<any>('Infraestrutura');
  const [vereadorDestinatarioId, setVereadorDestinatarioId] = useState('');

  useEffect(() => {
    CamaraService.getSugestoes().then(data => setSugestoes(data));
  }, []);

  const handleApoiar = async (id: string) => {
    const updated = await CamaraService.apoiarSugestao(id);
    if (updated) {
      setSugestoes(prev => prev.map(s => s.id === id ? updated : s));
      showToast('Apoio registrado com sucesso! Obrigado pela sua participação.', 'success');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCidadao || !email || !titulo || !descricao) return;

    const ver = vereadores.find(v => v.id === vereadorDestinatarioId);

    const nova: SugestaoPopular = {
      id: `sug-${Date.now()}`,
      nome_cidadao: nomeCidadao,
      email,
      bairro: bairro || 'Bairro Municipal',
      titulo,
      descricao,
      categoria,
      vereador_destinatario_id: vereadorDestinatarioId || undefined,
      vereador_destinatario_nome: ver?.nome_parlamentar,
      apoios_count: 1,
      status: 'Em Avaliação',
      created_at: new Date().toISOString().split('T')[0]
    };

    const saved = await CamaraService.saveSugestao(nova);
    setSugestoes(prev => [saved, ...prev]);
    setIsNewOpen(false);
    setTitulo('');
    setDescricao('');
    setNomeCidadao('');
    setEmail('');
    setBairro('');
    showToast('Proposta de Iniciativa Popular enviada ao Poder Legislativo!', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* 1. HERO BANNER DO PORTAL */}
      <div className="bg-gradient-to-br from-[#003B6F] via-[#0A4D8C] to-[#002244] text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-400" size={20} />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-sky-200">
              Democracia Participativa & Ouvidoria
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black font-['Montserrat'] tracking-tight">
            Portal do Cidadão • Câmara Conectada
          </h2>
          <p className="text-xs text-neutral-200 leading-relaxed">
            Envie sugestões de projetos de lei, solicite melhorias no seu bairro e acompanhe a atuação de cada parlamentar do município.
          </p>
        </div>

        <button
          onClick={() => setIsNewOpen(true)}
          className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Plus size={16} /> Enviar Ideia Legislativa
        </button>
      </div>

      {/* 2. ÁREA DE PROPOSTAS POPULARES & AUDIÊNCIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lista de Sugestões Populares */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-neutral-900 dark:text-white text-base">
              Ideias Legislativas da Comunidade ({sugestoes.length})
            </h4>
            <span className="text-xs text-neutral-400">
              As mais apoiadas são transformadas em Projetos de Lei
            </span>
          </div>

          <div className="space-y-4">
            {sugestoes.map(sug => (
              <div
                key={sug.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-[10px] font-black uppercase rounded-md">
                        {sug.categoria}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                        <MapPin size={12} className="text-sky-500" /> {sug.bairro}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sug.status === 'Acolhida pelo Gabinete'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}>
                        {sug.status}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-neutral-900 dark:text-white pt-1">
                      {sug.titulo}
                    </h4>
                  </div>

                  {/* Botão de Apoiar */}
                  <button
                    onClick={() => handleApoiar(sug.id)}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-neutral-700 dark:text-neutral-200 hover:text-emerald-600 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                  >
                    <ThumbsUp size={14} className="text-emerald-500" />
                    <span>{sug.apoios_count} Apoios</span>
                  </button>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {sug.descricao}
                </p>

                {/* Resposta do Vereador/Gabinete se houver */}
                {sug.resposta_gabinete && (
                  <div className="p-4 bg-sky-50/60 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 rounded-2xl text-xs text-sky-900 dark:text-sky-200 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-sky-600 dark:text-sky-400" />
                      Gabinete {sug.vereador_destinatario_nome ? `de ${sug.vereador_destinatario_nome}` : 'Parlamentar'}:
                    </span>
                    <p className="leading-relaxed pl-4">
                      {sug.resposta_gabinete}
                    </p>
                  </div>
                )}

                <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span>Enviado por: <strong>{sug.nome_cidadao}</strong></span>
                  <span>Data: {sug.created_at}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Painel Lateral: Audiências Públicas e Sessões Abertas */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2">
              <Calendar className="text-[#003B6F] dark:text-sky-400" size={18} />
              Audiências Públicas Agendadas
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">15 de Março às 19h</span>
                <h5 className="font-bold text-neutral-900 dark:text-white">Discussão da Lei de Diretrizes Orçamentárias (LDO 2027)</h5>
                <p className="text-neutral-500 text-[11px]">Plenário e Transmissão Online ao Vivo</p>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">22 de Março às 18h</span>
                <h5 className="font-bold text-neutral-900 dark:text-white">Prestação de Contas Quadrimestral da Saúde (SUS)</h5>
                <p className="text-neutral-500 text-[11px]">Comissão de Saúde e Presença do Secretário</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-[32px] shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sky-400">
              <ShieldCheck size={20} />
              <h5 className="font-bold text-xs uppercase tracking-wider">Tribuna Livre Popular</h5>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Cidadãos e representantes de associações de bairro podem se inscrever para discursar na tribuna da Câmara durante o expediente regimental.
            </p>
            <button 
              onClick={() => showToast('Formulário de inscrição na Tribuna Livre aberto na Secretaria!', 'info')}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Solicitar Inscrição na Tribuna
            </button>
          </div>
        </div>

      </div>

      {/* MODAL ENVIAR IDEIA LEGISLATIVA */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 max-w-xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-neutral-900 dark:text-white text-base">
                Enviar Ideia de Projeto de Lei
              </h4>
              <button onClick={() => setIsNewOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-neutral-400">Seu Nome</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo..."
                    value={nomeCidadao}
                    onChange={e => setNomeCidadao(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-neutral-400">E-mail</label>
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-neutral-400">Bairro</label>
                  <input
                    type="text"
                    placeholder="Seu bairro..."
                    value={bairro}
                    onChange={e => setBairro(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-neutral-400">Categoria</label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                  >
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Educação">Educação</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Meio Ambiente">Meio Ambiente</option>
                    <option value="Cultura & Esporte">Cultura & Esporte</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-neutral-400">Direcionar a um Vereador (Opcional)</label>
                <select
                  value={vereadorDestinatarioId}
                  onChange={e => setVereadorDestinatarioId(e.target.value)}
                  className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                >
                  <option value="">A todos os Vereadores (Geral)</option>
                  {vereadores.map(v => (
                    <option key={v.id} value={v.id}>{v.nome_parlamentar} ({v.partido})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-neutral-400">Título da Proposta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Criação de horta comunitária nos terrenos públicos..."
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-neutral-400">Descrição Detalhada</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explique como essa lei ajudará nossa cidade..."
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  className="w-full mt-1 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Publicar Ideia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
