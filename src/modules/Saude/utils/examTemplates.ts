import { ExamParameterResult, ExamResultData, ParameterStatus, generateUUID } from '../types';

export interface ParameterTemplateDef {
  name: string;
  unit: string;
  reference_range: string;
  min_ref?: number;
  max_ref?: number;
  defaultValue?: string;
  isLowerBetter?: boolean; // Se baixar for considerado bom (ex: glicose alta que baixou, colesterol)
}

export const EXAM_PARAMETER_TEMPLATES: Record<string, ParameterTemplateDef[]> = {
  'Glicemia de Jejum': [
    { name: 'Glicose em Jejum', unit: 'mg/dL', reference_range: '70 a 99 mg/dL', min_ref: 70, max_ref: 99, isLowerBetter: true }
  ],
  'Lipidograma Completo (Colesterol e Triglicerídeos)': [
    { name: 'Colesterol Total', unit: 'mg/dL', reference_range: 'Desejável: < 190 mg/dL', max_ref: 190, isLowerBetter: true },
    { name: 'Colesterol HDL (Bom)', unit: 'mg/dL', reference_range: 'Desejável: > 40 mg/dL', min_ref: 40, isLowerBetter: false },
    { name: 'Colesterol LDL (Mau)', unit: 'mg/dL', reference_range: 'Ótimo: < 100 mg/dL (Risco intermediário: < 130)', max_ref: 130, isLowerBetter: true },
    { name: 'Colesterol VLDL', unit: 'mg/dL', reference_range: '< 30 mg/dL', max_ref: 30, isLowerBetter: true },
    { name: 'Triglicerídeos', unit: 'mg/dL', reference_range: '< 150 mg/dL (em jejum)', max_ref: 150, isLowerBetter: true }
  ],
  'Hemograma Completo': [
    { name: 'Hemácias (Eritrócitos)', unit: 'milhões/mm³', reference_range: '4.20 a 5.80 milhões/mm³', min_ref: 4.2, max_ref: 5.8 },
    { name: 'Hemoglobina', unit: 'g/dL', reference_range: '12.0 a 17.5 g/dL', min_ref: 12.0, max_ref: 17.5 },
    { name: 'Hematócrito', unit: '%', reference_range: '37.0 a 52.0 %', min_ref: 37.0, max_ref: 52.0 },
    { name: 'VCM', unit: 'fL', reference_range: '80.0 a 100.0 fL', min_ref: 80.0, max_ref: 100.0 },
    { name: 'HCM', unit: 'pg', reference_range: '27.0 a 32.0 pg', min_ref: 27.0, max_ref: 32.0 },
    { name: 'Leucócitos Totais', unit: '/mm³', reference_range: '4.000 a 10.000 /mm³', min_ref: 4000, max_ref: 10000 },
    { name: 'Neutrófilos', unit: '%', reference_range: '40.0 a 70.0 %', min_ref: 40.0, max_ref: 70.0 },
    { name: 'Linfócitos', unit: '%', reference_range: '20.0 a 45.0 %', min_ref: 20.0, max_ref: 45.0 },
    { name: 'Plaquetas', unit: '/mm³', reference_range: '150.000 a 450.000 /mm³', min_ref: 150000, max_ref: 450000 }
  ],
  'Ureia e Creatinina (Função Renal)': [
    { name: 'Creatinina Sérica', unit: 'mg/dL', reference_range: '0.60 a 1.20 mg/dL', min_ref: 0.6, max_ref: 1.2, isLowerBetter: true },
    { name: 'Ureia Sérica', unit: 'mg/dL', reference_range: '15 a 45 mg/dL', min_ref: 15, max_ref: 45, isLowerBetter: true },
    { name: 'Taxa de Filtração Glomerular (eGFR)', unit: 'mL/min/1.73m²', reference_range: '> 60 mL/min/1.73m²', min_ref: 60 }
  ],
  'TSH e T4 Livre (Tireoide)': [
    { name: 'TSH Ultra-sensível', unit: 'mUI/L', reference_range: '0.40 a 4.50 mUI/L', min_ref: 0.4, max_ref: 4.5 },
    { name: 'T4 Livre', unit: 'ng/dL', reference_range: '0.80 a 1.90 ng/dL', min_ref: 0.8, max_ref: 1.9 }
  ],
  'Urina Tipo I (EAS) e Urocultura': [
    { name: 'Densidade', unit: '', reference_range: '1.005 a 1.030', min_ref: 1.005, max_ref: 1.030 },
    { name: 'pH', unit: '', reference_range: '5.0 a 7.5', min_ref: 5.0, max_ref: 7.5 },
    { name: 'Glicose na Urina', unit: '', reference_range: 'Ausente / Negativo', defaultValue: 'Ausente' },
    { name: 'Proteínas na Urina', unit: '', reference_range: 'Ausente / Negativo', defaultValue: 'Ausente' },
    { name: 'Hemácias na Urina', unit: 'por campo', reference_range: 'Até 3 por campo', max_ref: 3, isLowerBetter: true },
    { name: 'Leucócitos na Urina', unit: 'por campo', reference_range: 'Até 5 por campo', max_ref: 5, isLowerBetter: true }
  ],
  'Ácido Úrico': [
    { name: 'Ácido Úrico', unit: 'mg/dL', reference_range: '2.5 a 7.0 mg/dL', min_ref: 2.5, max_ref: 7.0, isLowerBetter: true }
  ],
  'Eletrocardiograma (ECG)': [
    { name: 'Frequência Cardíaca', unit: 'bpm', reference_range: '60 a 100 bpm', min_ref: 60, max_ref: 100 },
    { name: 'Ritmo Cardíaco', unit: '', reference_range: 'Ritmo Sinusal Regular', defaultValue: 'Sinusal Regular' },
    { name: 'Intervalo PR', unit: 'ms', reference_range: '120 a 200 ms', min_ref: 120, max_ref: 200 }
  ]
};

/**
 * Obtém os parâmetros recomendados para determinado exame
 */
export const getTemplateForExam = (examName: string): ExamParameterResult[] => {
  if (!examName) return [];
  const normalized = examName.trim().toLowerCase();

  // Busca exata ou por palavra-chave
  for (const [key, templates] of Object.entries(EXAM_PARAMETER_TEMPLATES)) {
    const normKey = key.toLowerCase();
    if (normalized === normKey || normalized.includes(normKey) || normKey.includes(normalized)) {
      return templates.map(t => ({
        id: generateUUID(),
        name: t.name,
        value: t.defaultValue || '',
        unit: t.unit,
        reference_range: t.reference_range,
        min_ref: t.min_ref,
        max_ref: t.max_ref,
        status: (t.defaultValue ? 'normal' : 'normal') as ParameterStatus
      }));
    }
  }

  // Palavras-chave parciais
  if (normalized.includes('glic')) {
    return EXAM_PARAMETER_TEMPLATES['Glicemia de Jejum'].map(t => ({
      id: generateUUID(),
      name: t.name,
      value: '',
      unit: t.unit,
      reference_range: t.reference_range,
      min_ref: t.min_ref,
      max_ref: t.max_ref,
      status: 'normal'
    }));
  }
  if (normalized.includes('lipid') || normalized.includes('colesterol')) {
    return EXAM_PARAMETER_TEMPLATES['Lipidograma Completo (Colesterol e Triglicerídeos)'].map(t => ({
      id: generateUUID(),
      name: t.name,
      value: '',
      unit: t.unit,
      reference_range: t.reference_range,
      min_ref: t.min_ref,
      max_ref: t.max_ref,
      status: 'normal'
    }));
  }
  if (normalized.includes('hemograma') || normalized.includes('sangue')) {
    return EXAM_PARAMETER_TEMPLATES['Hemograma Completo'].map(t => ({
      id: generateUUID(),
      name: t.name,
      value: '',
      unit: t.unit,
      reference_range: t.reference_range,
      min_ref: t.min_ref,
      max_ref: t.max_ref,
      status: 'normal'
    }));
  }
  if (normalized.includes('creatinina') || normalized.includes('ureia') || normalized.includes('renal')) {
    return EXAM_PARAMETER_TEMPLATES['Ureia e Creatinina (Função Renal)'].map(t => ({
      id: generateUUID(),
      name: t.name,
      value: '',
      unit: t.unit,
      reference_range: t.reference_range,
      min_ref: t.min_ref,
      max_ref: t.max_ref,
      status: 'normal'
    }));
  }
  if (normalized.includes('tireoide') || normalized.includes('tsh') || normalized.includes('t4')) {
    return EXAM_PARAMETER_TEMPLATES['TSH e T4 Livre (Tireoide)'].map(t => ({
      id: generateUUID(),
      name: t.name,
      value: '',
      unit: t.unit,
      reference_range: t.reference_range,
      min_ref: t.min_ref,
      max_ref: t.max_ref,
      status: 'normal'
    }));
  }
  if (normalized.includes('urina') || normalized.includes('eas')) {
    return EXAM_PARAMETER_TEMPLATES['Urina Tipo I (EAS) e Urocultura'].map(t => ({
      id: generateUUID(),
      name: t.name,
      value: '',
      unit: t.unit,
      reference_range: t.reference_range,
      min_ref: t.min_ref,
      max_ref: t.max_ref,
      status: 'normal'
    }));
  }
  if (normalized.includes('ecg') || normalized.includes('eletrocardio')) {
    return EXAM_PARAMETER_TEMPLATES['Eletrocardiograma (ECG)'].map(t => ({
      id: generateUUID(),
      name: t.name,
      value: '',
      unit: t.unit,
      reference_range: t.reference_range,
      min_ref: t.min_ref,
      max_ref: t.max_ref,
      status: 'normal'
    }));
  }

  // Template genérico padrão para outros exames
  return [
    {
      id: generateUUID(),
      name: 'Resultado Principal',
      value: '',
      unit: '',
      reference_range: 'Normal / Negativo',
      status: 'normal'
    }
  ];
};

/**
 * Avalia o status de um parâmetro baseado em seu valor numérico e referências
 */
export const evaluateParameterStatus = (
  value: string,
  minRef?: number | null,
  maxRef?: number | null
): ParameterStatus => {
  if (!value || value.trim() === '') return 'normal';
  const cleanVal = value.trim().replace(',', '.');
  const numVal = parseFloat(cleanVal);

  if (!isNaN(numVal)) {
    if (minRef !== undefined && minRef !== null && numVal < minRef) {
      return 'baixo';
    }
    if (maxRef !== undefined && maxRef !== null && numVal > maxRef) {
      return 'alto';
    }
    return 'normal';
  }

  // Não numérico
  const lower = value.trim().toLowerCase();
  if (['reagente', 'positivo', 'alterado', 'detectado', 'incompatível'].includes(lower)) {
    return 'alterado';
  }
  if (['não reagente', 'negativo', 'normal', 'ausente', 'regular', 'preservado'].includes(lower)) {
    return 'normal';
  }

  return 'normal';
};

/**
 * Serializa de forma retrocompatível o resultado do exame
 */
export const serializeExamResult = (data: ExamResultData): string => {
  try {
    return JSON.stringify({
      __format: 'gestao360_exam_v1',
      ...data
    });
  } catch (err) {
    console.error('Erro ao serializar resultado do exame:', err);
    return data.conclusion || '';
  }
};

/**
 * Faz o parse seguro do resultado do exame (suporta JSON estruturado e texto legado)
 */
export const parseExamResult = (resultNotes?: string | null): ExamResultData | null => {
  if (!resultNotes || resultNotes.trim() === '') return null;
  const trimmed = resultNotes.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return {
          performed_date: parsed.performed_date || '',
          executing_unit: parsed.executing_unit || '',
          professional_name: parsed.professional_name || '',
          professional_council: parsed.professional_council || '',
          conclusion: parsed.conclusion || '',
          parameters: Array.isArray(parsed.parameters) ? parsed.parameters : [],
          notes: parsed.notes || '',
          recorded_at: parsed.recorded_at || ''
        };
      }
    } catch {
      // continua para fallback de texto
    }
  }

  // Fallback: texto simples legível anterior
  return {
    performed_date: '',
    conclusion: trimmed,
    parameters: []
  };
};

/**
 * Calcula a variação e tendência entre dois valores de exames
 */
export interface DeltaComparisonResult {
  isNumeric: boolean;
  valA: string;
  valB: string;
  deltaNum?: number;
  deltaPercent?: number;
  direction: 'up' | 'down' | 'stable';
  trendQuality: 'better' | 'worse' | 'neutral';
  formattedText: string;
}

export const compareParameterValues = (
  paramName: string,
  valA: string,
  valB: string,
  statusA: ParameterStatus,
  statusB: ParameterStatus,
  minRef?: number,
  maxRef?: number
): DeltaComparisonResult => {
  const numA = parseFloat((valA || '').replace(',', '.'));
  const numB = parseFloat((valB || '').replace(',', '.'));

  if (!isNaN(numA) && !isNaN(numB)) {
    const delta = numB - numA;
    const absDelta = Math.abs(delta);
    const isStable = absDelta < 0.001;
    const direction: 'up' | 'down' | 'stable' = isStable ? 'stable' : delta > 0 ? 'up' : 'down';
    const percent = numA !== 0 ? (delta / numA) * 100 : 0;

    // Avaliação de melhora ou piora
    let trendQuality: 'better' | 'worse' | 'neutral' = 'neutral';
    if (statusA !== 'normal' && statusB === 'normal') {
      trendQuality = 'better'; // Normalizou!
    } else if (statusA === 'normal' && statusB !== 'normal') {
      trendQuality = 'worse'; // Saiu da faixa de normalidade!
    } else if (statusA === 'alto' && statusB === 'alto') {
      trendQuality = delta < 0 ? 'better' : 'worse';
    } else if (statusA === 'baixo' && statusB === 'baixo') {
      trendQuality = delta > 0 ? 'better' : 'worse';
    } else if (isStable) {
      trendQuality = 'neutral';
    }

    const sign = delta > 0 ? '+' : '';
    const formattedText = isStable 
      ? 'Estável (sem variação)' 
      : `${sign}${delta.toFixed(1)} (${sign}${percent.toFixed(1)}%)`;

    return {
      isNumeric: true,
      valA,
      valB,
      deltaNum: delta,
      deltaPercent: percent,
      direction,
      trendQuality,
      formattedText
    };
  }

  // Não numérico
  const isDifferent = (valA || '').trim().toLowerCase() !== (valB || '').trim().toLowerCase();
  let trendQuality: 'better' | 'worse' | 'neutral' = 'neutral';

  if (statusA !== 'normal' && statusB === 'normal') {
    trendQuality = 'better';
  } else if (statusA === 'normal' && statusB !== 'normal') {
    trendQuality = 'worse';
  }

  return {
    isNumeric: false,
    valA,
    valB,
    direction: 'stable',
    trendQuality,
    formattedText: isDifferent ? 'Alteração no laudo' : 'Resultado inalterado'
  };
};
