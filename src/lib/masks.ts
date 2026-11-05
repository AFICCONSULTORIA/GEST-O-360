export const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length <= 10) {
    return v
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return v
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const formatNIS = (value: string) => {
  return value
    .replace(/\D/g, '')
    .substring(0, 11);
};

export const validateCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  // Rejeita dígitos repetidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
};

export const maskCPF = (cpf: string): string => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`;
};

/**
 * Formata um valor numérico com separadores de milhar no padrão brasileiro (ex: 1.250, 125.430)
 */
export const formatThousands = (value: string | number | null | undefined): string => {
  if (value === '' || value === null || value === undefined) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('pt-BR');
};

/**
 * Converte uma string formatada em milhar para número inteiro puro
 */
export const parseThousands = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};
