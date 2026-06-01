import { supabase } from './supabase';
import { Institution } from '../types';

/**
 * Extrai o subdomínio do hostname atual.
 * Suporta:
 * - Desenvolvimento local: 'torixoreu.localhost' -> 'torixoreu'
 * - Produção: 'torixoreu.gestao360sistema.com.br' -> 'torixoreu'
 * Retorna null se não houver subdomínio ou se for o domínio principal.
 */
export const getSubdomain = (): string | null => {
  const hostname = window.location.hostname;
  
  // Lista de domínios ou IPs que não devem ser considerados subdomínios
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'localhost.localdomain') {
    return null;
  }

  const parts = hostname.split('.');

  // Caso especial para desenvolvimento com subdomínios locais (ex: torixoreu.localhost)
  if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
    return parts[0];
  }

  // Para produção (ex: torixoreu.gestao360sistema.com.br)
  // gestao360sistema.com.br termina com .com.br (3 partes base: gestao360sistema, com, br)
  const isComBr = hostname.endsWith('.com.br');
  const basePartsCount = isComBr ? 3 : 2;

  if (parts.length > basePartsCount) {
    return parts[0];
  }

  return null;
};

/**
 * Busca os detalhes da instituição (município) correspondente ao subdomínio no Supabase.
 */
export const fetchInstitutionBySubdomain = async (subdomain: string): Promise<Institution | null> => {
  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('subdomain', subdomain.toLowerCase())
      .single();

    if (error) {
      console.error(`Erro ao buscar instituição pelo subdomínio '${subdomain}':`, error.message);
      return null;
    }

    return data as Institution;
  } catch (err) {
    console.error('Erro de conexão ao buscar instituição pelo subdomínio:', err);
    return null;
  }
};
