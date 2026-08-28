import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Printer, FileText, Download, Landmark, CheckCircle2, 
  Share2, Eye, ShieldCheck, Stamp 
} from 'lucide-react';
import { MateriaLegislativa, SessaoPlenaria, Vereador, Indicacao } from '../types';

interface DocumentosOficiaisProps {
  materias: MateriaLegislativa[];
  sessoes: SessaoPlenaria[];
  vereadores: Vereador[];
  indicacoes: Indicacao[];
  preSelectedMateria?: MateriaLegislativa | null;
  preSelectedTipo?: string;
}

type TipoDocumento = 'autografo' | 'pauta' | 'ata' | 'oficio_indicacao';

export const DocumentosOficiais: React.FC<DocumentosOficiaisProps> = ({
  materias,
  sessoes,
  vereadores,
  indicacoes,
  preSelectedMateria,
  preSelectedTipo = 'autografo'
}) => {
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>(preSelectedTipo as any || 'autografo');
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>(preSelectedMateria?.id || materias[0]?.id || '');
  const [selectedSessaoId, setSelectedSessaoId] = useState<string>(sessoes[0]?.id || '');
  const [selectedIndicacaoId, setSelectedIndicacaoId] = useState<string>(indicacoes[0]?.id || '');

  const materia = materias.find(m => m.id === selectedMateriaId) || materias[0];
  const sessao = sessoes.find(s => s.id === selectedSessaoId) || sessoes[0];
  const indicacao = indicacoes.find(i => i.id === selectedIndicacaoId) || indicacoes[0];
  const presidente = vereadores.find(v => v.cargo_mesa === 'Presidente') || vereadores[0];
  const secretario = vereadores.find(v => v.cargo_mesa === '1º Secretário') || vereadores[1] || vereadores[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      
      {/* 1. SELETOR DE MODELO */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white font-['Montserrat'] tracking-tight flex items-center gap-2.5">
            <Landmark className="text-[#003B6F] dark:text-sky-400" size={24} />
            Emissor de Documentos Oficiais
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Gere autógrafos de lei, pautas da sessão, atas resumidas e ofícios padronizados para impressão.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-[#003B6F] hover:bg-[#002b52] text-white rounded-xl text-xs font-bold shadow-md shadow-[#003B6F]/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Printer size={16} /> Imprimir / Salvar em PDF
          </button>
        </div>
      </div>

      {/* 2. BARRA DE OPÇÕES / SELEÇÃO DE REGISTROS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        {/* Tipo de Documento */}
        <div>
          <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider">Tipo de Documento</label>
          <select
            value={tipoDoc}
            onChange={e => setTipoDoc(e.target.value as TipoDocumento)}
            className="w-full mt-1 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
          >
            <option value="autografo">Autógrafo de Lei (Para Sanção)</option>
            <option value="pauta">Pauta da Ordem do Dia (Sessão)</option>
            <option value="ata">Ata Resumida da Sessão</option>
            <option value="oficio_indicacao">Ofício de Indicação ao Prefeito</option>
          </select>
        </div>

        {/* Seleção do Objeto dependendo do tipo */}
        {tipoDoc === 'autografo' && (
          <div className="md:col-span-3">
            <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider">Selecione a Matéria</label>
            <select
              value={selectedMateriaId}
              onChange={e => setSelectedMateriaId(e.target.value)}
              className="w-full mt-1 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
            >
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.numero} - {m.tipo} ({m.ementa.substring(0, 80)}...)</option>
              ))}
            </select>
          </div>
        )}

        {(tipoDoc === 'pauta' || tipoDoc === 'ata') && (
          <div className="md:col-span-3">
            <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider">Selecione a Sessão</label>
            <select
              value={selectedSessaoId}
              onChange={e => setSelectedSessaoId(e.target.value)}
              className="w-full mt-1 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
            >
              {sessoes.map(s => (
                <option key={s.id} value={s.id}>{s.numero}ª Sessão {s.tipo}/{s.ano} ({s.data_sessao})</option>
              ))}
            </select>
          </div>
        )}

        {tipoDoc === 'oficio_indicacao' && (
          <div className="md:col-span-3">
            <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider">Selecione a Indicação</label>
            <select
              value={selectedIndicacaoId}
              onChange={e => setSelectedIndicacaoId(e.target.value)}
              className="w-full mt-1 p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
            >
              {indicacoes.map(i => (
                <option key={i.id} value={i.id}>{i.numero} - {i.vereador_nome} ({i.descricao.substring(0, 80)}...)</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. FOLHA DE VISUALIZAÇÃO OFICIAL (A4 FORMAT) */}
      <div className="max-w-4xl mx-auto bg-white text-neutral-900 shadow-2xl rounded-2xl p-10 md:p-16 border border-neutral-200 print:border-none print:shadow-none print:p-0 print:m-0 font-serif">
        
        {/* Cabeçalho Oficial com Brasão */}
        <div className="text-center pb-8 border-b-2 border-neutral-900 space-y-1 mb-8">
          <div className="w-16 h-16 mx-auto mb-2 bg-[#003B6F] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-sm">
            🏛️
          </div>
          <h2 className="text-base md:text-lg font-black uppercase tracking-widest font-sans">
            ESTADO DE SÃO PAULO • CÂMARA MUNICIPAL
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-600 font-sans">
            Palácio 8 de Março • Mesa Diretora Legislativa
          </p>
          <p className="text-[10px] text-neutral-500 font-sans">
            Praça dos Três Poderes, nº 100 • Centro • Telefone: (11) 3456-7890 • www.camara.gov.br
          </p>
        </div>

        {/* --- MODELO 1: AUTÓGRAFO DE LEI --- */}
        {tipoDoc === 'autografo' && materia && (
          <div className="space-y-6 text-justify text-sm leading-relaxed">
            <div className="text-center space-y-1 my-6">
              <h3 className="text-base font-black uppercase tracking-wider font-sans">
                AUTÓGRAFO DE LEI Nº {materia.numero.replace(/[^0-9]/g, '') || '014'}/2026
              </h3>
              <p className="text-xs font-bold text-neutral-600 font-sans">
                Referente ao {materia.tipo} nº {materia.numero}
              </p>
            </div>

            {/* Ementa em Recuo */}
            <div className="w-2/3 ml-auto text-xs italic font-sans bg-neutral-50 p-4 border-l-2 border-neutral-400 mb-6">
              "{materia.ementa}"
            </div>

            <p className="font-bold">
              A CÂMARA MUNICIPAL APROVOU E EU, PRESIDENTE, NOS TERMOS DO REGIMENTO INTERNO, ENCAMINHO O SEGUINTE AUTÓGRAFO DE LEI PARA DEVIDA SANÇÃO:
            </p>

            <div className="whitespace-pre-wrap font-serif text-sm py-4">
              {materia.texto_integral || `Art. 1º Ficam instituídas as diretrizes municipais conforme ementa oficial.\n\nArt. 2º O Poder Executivo regulamentará a presente Lei no prazo de 60 (sessenta) dias.\n\nArt. 3º Esta Lei entra em vigor na data de sua publicação.`}
            </div>

            <p className="pt-4 text-xs font-sans">
              Plenário Vereador Presidente, em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
            </p>
          </div>
        )}

        {/* --- MODELO 2: PAUTA DA SESSÃO PLENÁRIA --- */}
        {tipoDoc === 'pauta' && sessao && (
          <div className="space-y-6 text-sm">
            <div className="text-center space-y-1 my-4">
              <h3 className="text-base font-black uppercase tracking-wider font-sans">
                ORDEM DO DIA • {sessao.numero}ª SESSÃO {sessao.tipo.toUpperCase()}/{sessao.ano}
              </h3>
              <p className="text-xs text-neutral-600 font-sans">
                Data: {sessao.data_sessao} às {sessao.hora_inicio} • Plenário Oficial
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold uppercase text-xs font-sans border-b pb-1">
                I - PEQUENO EXPEDIENTE (Leitura de Correspondências e Proposições)
              </h4>
              <ul className="list-disc pl-5 text-xs space-y-1 font-sans">
                <li>Leitura da Ata da Sessão Anterior</li>
                <li>Correspondências recebidas do Poder Executivo Municipal</li>
                <li>Apresentação de Indicações e Requerimentos de Urgência</li>
              </ul>

              <h4 className="font-bold uppercase text-xs font-sans border-b pb-1 pt-4">
                II - ORDEM DO DIA (Matérias em Discussão e Votação Nominal)
              </h4>
              <div className="space-y-3 font-sans">
                {materias.slice(0, 3).map((m, idx) => (
                  <div key={m.id} className="text-xs p-3 bg-neutral-50 rounded-lg">
                    <span className="font-bold">{idx + 1}. {m.numero} - {m.tipo}</span> (Autor: {m.autor_nome})
                    <p className="italic text-neutral-700 mt-0.5">"{m.ementa}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- MODELO 3: ATA RESUMIDA --- */}
        {tipoDoc === 'ata' && sessao && (
          <div className="space-y-6 text-justify text-sm leading-relaxed">
            <div className="text-center space-y-1 my-4">
              <h3 className="text-base font-black uppercase tracking-wider font-sans">
                EXTRATO DA ATA DA {sessao.numero}ª SESSÃO {sessao.tipo.toUpperCase()}
              </h3>
              <p className="text-xs text-neutral-600 font-sans">
                Legislatura 2025-2028 • Exercício {sessao.ano}
              </p>
            </div>

            <p>
              Aos {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}, às {sessao.hora_inicio} horas, reuniu-se ordinariamente o Plenário da Câmara Municipal sob a presidência do(a) <strong>{presidente.nome_parlamentar}</strong> e secretariado por <strong>{secretario.nome_parlamentar}</strong>.
            </p>

            <p>
              <strong>QUÓRUM DE ABERTURA:</strong> Verificada a presença dos vereadores: {vereadores.map(v => v.nome_parlamentar).join(', ')}. Havendo quórum legal regimental, o Senhor Presidente declarou aberta a Sessão sob a proteção de Deus.
            </p>

            <p>
              <strong>DELIBERAÇÕES E VOTAÇÕES:</strong> Submetidas a votação as matérias constantes na Ordem do Dia, tendo sido aprovadas por unanimidade as matérias prioritárias. Nada mais havendo a tratar, encerrou-se a presente Sessão.
            </p>
          </div>
        )}

        {/* --- MODELO 4: OFÍCIO DE INDICAÇÃO --- */}
        {tipoDoc === 'oficio_indicacao' && indicacao && (
          <div className="space-y-6 text-sm text-justify leading-relaxed">
            <div className="flex justify-between items-center text-xs font-sans mb-8">
              <span><strong>OFÍCIO LEGISLATIVO Nº {indicacao.numero.replace(/[^0-9]/g, '') || '112'}/2026</strong></span>
              <span>Data: {indicacao.data_envio}</span>
            </div>

            <div className="font-sans text-xs space-y-1">
              <p>Ao Excelentíssimo Senhor</p>
              <p><strong>PREFEITO MUNICIPAL</strong></p>
              <p>Palácio Municipal • Prefeitura</p>
            </div>

            <p>
              Senhor Prefeito,
            </p>

            <p>
              Encaminho a Vossa Excelência, para as devidas providências junto à <strong>{indicacao.secretaria_destino}</strong>, a inclusa <strong>{indicacao.numero}</strong> de autoria do ilustre Vereador <strong>{indicacao.vereador_nome}</strong>:
            </p>

            <div className="p-4 bg-neutral-50 border-l-2 border-neutral-400 italic text-xs font-sans">
              "{indicacao.descricao}" (Local: {indicacao.bairro || 'Município'})
            </div>

            <p>
              Reiteramos a importância de atendimento dentro do prazo regimental de 30 (trinta) dias previsto na Lei Orgânica Municipal.
            </p>
          </div>
        )}

        {/* Assinaturas Oficiais */}
        <div className="pt-16 mt-12 border-t border-neutral-300 grid grid-cols-2 gap-8 text-center font-sans text-xs">
          <div>
            <div className="w-48 mx-auto border-b border-neutral-900 pb-1 mb-1">
              <span className="font-mono text-[9px] text-emerald-600 block">✓ Assinado Digitalmente</span>
            </div>
            <strong className="block text-neutral-900">{presidente.nome}</strong>
            <span className="text-neutral-500">{presidente.cargo_mesa}</span>
          </div>

          <div>
            <div className="w-48 mx-auto border-b border-neutral-900 pb-1 mb-1">
              <span className="font-mono text-[9px] text-emerald-600 block">✓ Assinado Digitalmente</span>
            </div>
            <strong className="block text-neutral-900">{secretario.nome}</strong>
            <span className="text-neutral-500">{secretario.cargo_mesa}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
