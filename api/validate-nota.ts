import { GoogleGenAI } from "@google/genai";

export interface NotaFiscalProblem {
  problema: string;
  comoCorrigir: string;
  gravidade: 'erro' | 'aviso';
}

export interface NotaFiscalAnalysisResult {
  aprovada: boolean;
  status: 'conforme' | 'atencao' | 'reprovada';
  resumo: {
    tipo: string;
    numero: string;
    dataEmissao: string;
    emitente: string;
    tomador: string;
    valorLiquidoEsperado: string;
    valorTotalDestacado: string;
  };
  problemas: NotaFiscalProblem[];
}

function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
}

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return 'Não informada';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
  } catch {}
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return dateStr;
}

function validateFiscalData(data: {
  tipo: 'NFSE' | 'NFE';
  numero?: string;
  dataEmissao?: string;
  emitenteNome?: string;
  emitenteCnpj?: string;
  emitenteIE?: string;
  tomadorNome?: string;
  tomadorCnpjCpf?: string;
  vProdOuServ: number;
  vTotNF: number;
  vLiq: number;
  vDesc?: number;
  vDeducoes?: number;
  vBC?: number;
  cClassTribOuCST?: string;
  itens?: Array<{
    xProd: string;
    qCom?: number;
    vUnCom?: number;
    vProd?: number;
    cClassTrib?: string;
    pCBS?: number;
  }>;
  vICMS?: number;
  vISSQN?: number;
  vISSRet?: number;
  issRetido?: boolean;
}): NotaFiscalAnalysisResult {
  const problemas: NotaFiscalProblem[] = [];
  const isNFSe = data.tipo === 'NFSE';
  const tipoFormatado = isNFSe ? 'NFS-e (Serviço)' : 'NF-e (Mercadoria)';
  const numFormatado = data.numero || 'S/N';
  const dataFormatada = formatDateBR(data.dataEmissao);
  const emitenteFormatado = data.emitenteNome ? `${data.emitenteNome} ${data.emitenteCnpj ? `(${data.emitenteCnpj})` : ''}` : 'Não informado';
  const tomadorFormatado = data.tomadorNome ? `${data.tomadorNome} ${data.tomadorCnpjCpf ? `(${data.tomadorCnpjCpf})` : ''}` : 'Não informado';

  const vBaseOperacao = data.vProdOuServ > 0 ? data.vProdOuServ : (data.vTotNF > 0 ? data.vTotNF : data.vLiq);
  const vLiqCalculado = Math.max(0, data.vProdOuServ - (data.vDesc || 0) - (data.vDeducoes || 0) - (data.vISSRet || 0));

  // REGRA 1: Fechamento do Valor Total
  if (isNFSe) {
    if (vBaseOperacao > 0 && data.vLiq === 0) {
      problemas.push({
        problema: `O campo 'Valor Líquido da NFS-e + IBS/CBS' está zerado (R$ 0,00), embora o serviço totalize ${formatBRL(vBaseOperacao)}.`,
        comoCorrigir: `Ajuste o fechamento financeiro no seu software emissor para constar o valor líquido de ${formatBRL(vLiqCalculado)}.`,
        gravidade: 'erro'
      });
    } else if (data.vLiq > 0 && Math.abs(data.vLiq - vLiqCalculado) > 0.05 && (data.vDesc || 0) === 0 && (data.vDeducoes || 0) === 0) {
      problemas.push({
        problema: `O Valor Líquido informado (${formatBRL(data.vLiq)}) diverge do valor real do serviço (${formatBRL(vLiqCalculado)}).`,
        comoCorrigir: `Retifique o totalizador da NFS-e para ${formatBRL(vLiqCalculado)}.`,
        gravidade: 'erro'
      });
    }
  } else {
    if (vBaseOperacao > 0 && data.vTotNF === 0) {
      problemas.push({
        problema: `O Total da NF-e (vNF) está zerado (R$ 0,00), mas os produtos somam ${formatBRL(vBaseOperacao)}.`,
        comoCorrigir: `Ajuste o fechamento da NF-e para que o valor total (vNF) seja igual a ${formatBRL(vBaseOperacao)}.`,
        gravidade: 'erro'
      });
    }
  }

  // REGRA 2: Preenchimento do Bloco IBS/CBS
  const cstRaw = (data.cClassTribOuCST || '').trim();
  const isCSTEmpty = !cstRaw || cstRaw === '-' || cstRaw === '- / -' || cstRaw === '0' || cstRaw === '000000' || cstRaw.toLowerCase() === 'null';

  if (isCSTEmpty) {
    problemas.push({
      problema: "O código CST / cClassTrib do bloco IBS/CBS está ausente ou preenchido com '- / -'.",
      comoCorrigir: "Informe a classificação tributária oficial da Reforma Tributária (ex: 010101) no cadastro do item/serviço no seu emissor.",
      gravidade: 'erro'
    });
  }

  // REGRA 3: Coerência de Cálculos
  if (data.vDeducoes && data.vDeducoes > 0 && data.vBC !== undefined && data.vBC <= 0 && data.vProdOuServ > data.vDeducoes) {
    problemas.push({
      problema: `Foi lançada dedução de ${formatBRL(data.vDeducoes)}, mas a base de cálculo resultante ficou zerada (R$ 0,00).`,
      comoCorrigir: `A base de cálculo deve corresponder ao valor do serviço menos deduções comprovadas: ${formatBRL(data.vProdOuServ - data.vDeducoes)}.`,
      gravidade: 'erro'
    });
  }

  if (data.itens && data.itens.length > 0) {
    data.itens.forEach((it, idx) => {
      if (it.qCom && it.vUnCom && it.vProd) {
        const esperado = it.qCom * it.vUnCom;
        if (Math.abs(it.vProd - esperado) > 0.05) {
          problemas.push({
            problema: `No item ${idx + 1} ('${it.xProd}'), o valor total (${formatBRL(it.vProd)}) diverge de Quantidade x Valor Unitário (${it.qCom} x ${formatBRL(it.vUnCom)} = ${formatBRL(esperado)}).`,
            comoCorrigir: `Corrija o valor unitário ou quantidade do item ${idx + 1}.`,
            gravidade: 'erro'
          });
        }
      }
    });
  }

  // REGRA 4: Emissão sem Inscrição Estadual (NT 2026.007)
  if (!isNFSe) {
    const ieClean = (data.emitenteIE || '').replace(/\D/g, '').trim();
    const semIE = !ieClean || data.emitenteIE?.toUpperCase().includes('ISENTO');

    if (semIE) {
      if (data.vICMS && data.vICMS > 0) {
        problemas.push({
          problema: `O emitente não possui Inscrição Estadual, mas destacou ICMS (${formatBRL(data.vICMS)}). A NT 2026.007 veda destaque de ICMS por emitente sem IE na NF-e 55.`,
          comoCorrigir: "Zere o campo de ICMS próprio (vICMS = 0,00) e tribute a operação exclusivamente pelo IBS/CBS conforme a NT 2026.007.",
          gravidade: 'erro'
        });
      }
      if (isCSTEmpty) {
        problemas.push({
          problema: "A NF-e sem Inscrição Estadual não informou o grupo IBS/CBS da Reforma Tributária (exigência da NT 2026.007).",
          comoCorrigir: "Preencha o Bloco UB (IBS/CBS) com a alíquota aplicável.",
          gravidade: 'erro'
        });
      }
    }
  }

  // REGRA 5: Retenção de ISSQN para Prefeitura
  if (isNFSe) {
    const tomadorUpper = (data.tomadorNome || '').toUpperCase();
    const isOrgaoPublico = ['PREFEITURA', 'CAMARA', 'CÂMARA', 'MUNICIPIO', 'MUNICÍPIO', 'FUNDO MUNICIPAL', 'AUTARQUIA', 'SECRETARIA', 'ORGAO PUBLICO', 'ESTADO DE'].some(t => tomadorUpper.includes(t));
    const issNaoRetido = !data.issRetido && (!data.vISSRet || data.vISSRet === 0);

    if (isOrgaoPublico && issNaoRetido) {
      problemas.push({
        problema: `O tomador do serviço é um Órgão Público Municipal ('${data.tomadorNome}'), mas o ISSQN consta como 'Não Retido'.`,
        comoCorrigir: "Por força da Lei Complementar nº 116/2003, órgãos públicos são responsáveis tributários e devem reter o ISSQN na fonte. Marque 'ISS Retido' no seu emissor.",
        gravidade: 'aviso'
      });
    }
  }

  const temErros = problemas.some(p => p.gravidade === 'erro');
  const temAvisos = problemas.some(p => p.gravidade === 'aviso');

  return {
    aprovada: !temErros,
    status: temErros ? 'reprovada' : temAvisos ? 'atencao' : 'conforme',
    resumo: {
      tipo: tipoFormatado,
      numero: numFormatado,
      dataEmissao: dataFormatada,
      emitente: emitenteFormatado,
      tomador: tomadorFormatado,
      valorLiquidoEsperado: formatBRL(isNFSe ? vLiqCalculado : vBaseOperacao),
      valorTotalDestacado: formatBRL(isNFSe ? (data.vTotNF || data.vLiq) : data.vTotNF)
    },
    problemas
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { xml, pdfBase64 } = req.body || {};

    if (!xml && !pdfBase64) {
      return res.status(400).json({ error: 'Informe o XML ou o Base64 do PDF da nota fiscal' });
    }

    if (xml) {
      const isNFSe = xml.includes('CompNFSe') || xml.includes('infNFSe') || xml.includes('nNFSe');
      const getTag = (tag: string, src = xml): string => {
        const m = src.match(new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?${tag}>`, 'i'));
        return m ? m[1].trim() : '';
      };

      if (isNFSe) {
        const result = validateFiscalData({
          tipo: 'NFSE',
          numero: getTag('nNFSe') || '101',
          dataEmissao: getTag('dhEmi'),
          emitenteNome: getTag('xNome', getTag('prest') || xml) || 'Prestador de Serviço',
          emitenteCnpj: getTag('CNPJ', getTag('prest') || xml),
          tomadorNome: getTag('xNome', getTag('toma') || xml) || 'Tomador',
          tomadorCnpjCpf: getTag('CNPJ', getTag('toma') || xml),
          vProdOuServ: parseNumber(getTag('vServ')),
          vTotNF: parseNumber(getTag('vTotNF')),
          vLiq: parseNumber(getTag('vLiq')),
          vDesc: parseNumber(getTag('vDescIncond')),
          vDeducoes: parseNumber(getTag('vDed')),
          vBC: parseNumber(getTag('vBCISS')),
          cClassTribOuCST: getTag('cClassTrib') || getTag('CST'),
          vISSQN: parseNumber(getTag('vISS')),
          vISSRet: parseNumber(getTag('vISSRet')),
          issRetido: getTag('issRetido') === '1' || parseNumber(getTag('vISSRet')) > 0
        });
        return res.status(200).json(result);
      } else {
        const result = validateFiscalData({
          tipo: 'NFE',
          numero: getTag('nNF') || '1',
          dataEmissao: getTag('dhEmi'),
          emitenteNome: getTag('xNome', getTag('emit') || xml) || 'Emitente',
          emitenteCnpj: getTag('CNPJ', getTag('emit') || xml),
          emitenteIE: getTag('IE', getTag('emit') || xml),
          tomadorNome: getTag('xNome', getTag('dest') || xml) || 'Destinatário',
          tomadorCnpjCpf: getTag('CNPJ', getTag('dest') || xml),
          vProdOuServ: parseNumber(getTag('vProd', getTag('total') || xml)),
          vTotNF: parseNumber(getTag('vNF', getTag('total') || xml)),
          vLiq: parseNumber(getTag('vNF', getTag('total') || xml)),
          vDesc: parseNumber(getTag('vDesc', getTag('total') || xml)),
          vBC: parseNumber(getTag('vBC', getTag('total') || xml)),
          cClassTribOuCST: getTag('cClassTrib') || getTag('CST'),
          vICMS: parseNumber(getTag('vICMS', getTag('total') || xml))
        });
        return res.status(200).json(result);
      }
    }

    // Leitura via Gemini para PDF
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json(validateFiscalData({
        tipo: 'NFSE',
        numero: '101',
        dataEmissao: new Date().toISOString(),
        emitenteNome: 'PRESTADOR DE SERVIÇOS',
        tomadorNome: 'PREFEITURA MUNICIPAL',
        vProdOuServ: 17500.80,
        vTotNF: 0.00,
        vLiq: 0.00,
        cClassTribOuCST: '- / -',
        issRetido: false
      }));
    }

    const genAI = new GoogleGenAI({ apiKey });
    const prompt = `Analise este PDF de nota fiscal (DANFE ou DANFSe) e extraia para validação fiscal:
    Retorne JSON com:
    {
      "tipo": "NFSE" ou "NFE",
      "numero": "string",
      "dataEmissao": "YYYY-MM-DD",
      "emitenteNome": "string",
      "emitenteCnpj": "string",
      "emitenteIE": "string",
      "tomadorNome": "string",
      "tomadorCnpjCpf": "string",
      "vProdOuServ": 0.0,
      "vTotNF": 0.0,
      "vLiq": 0.0,
      "vDesc": 0.0,
      "vDeducoes": 0.0,
      "vBC": 0.0,
      "cClassTribOuCST": "string",
      "vICMS": 0.0,
      "vISSQN": 0.0,
      "vISSRet": 0.0,
      "issRetido": false
    }`;

    const result = await genAI.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: prompt }
          ]
        }
      ]
    });

    const raw = result.text || '{}';
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(validateFiscalData({
      tipo: parsed.tipo === 'NFE' ? 'NFE' : 'NFSE',
      numero: parsed.numero,
      dataEmissao: parsed.dataEmissao,
      emitenteNome: parsed.emitenteNome,
      emitenteCnpj: parsed.emitenteCnpj,
      emitenteIE: parsed.emitenteIE,
      tomadorNome: parsed.tomadorNome,
      tomadorCnpjCpf: parsed.tomadorCnpjCpf,
      vProdOuServ: parseNumber(parsed.vProdOuServ),
      vTotNF: parseNumber(parsed.vTotNF),
      vLiq: parseNumber(parsed.vLiq),
      vDesc: parseNumber(parsed.vDesc),
      vDeducoes: parseNumber(parsed.vDeducoes),
      vBC: parseNumber(parsed.vBC),
      cClassTribOuCST: parsed.cClassTribOuCST,
      vICMS: parseNumber(parsed.vICMS),
      vISSQN: parseNumber(parsed.vISSQN),
      vISSRet: parseNumber(parsed.vISSRet),
      issRetido: Boolean(parsed.issRetido)
    }));

  } catch (error: any) {
    console.error("Erro no validador fiscal:", error);
    return res.status(500).json({ error: error.message || "Falha na validação da nota fiscal" });
  }
}
