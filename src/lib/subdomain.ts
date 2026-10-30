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
  // 1. Prioridade Máxima: Parâmetros explícitos na URL (?inst=, ?subdomain=, ?municipio=)
  // Permite navegação direta em localhost, Vercel e compartilhamento de links
  if (typeof window !== 'undefined' && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const paramInst = params.get('inst') || params.get('subdomain') || params.get('municipio');
    if (paramInst && paramInst.trim() !== '') {
      return paramInst.trim().toLowerCase();
    }
  }

  if (typeof window === 'undefined') return null;

  let hostname = window.location.hostname;
  
  // Remove prefixo 'www.' se estiver presente para evitar erros de interpretação de subdomínio
  if (hostname.startsWith('www.')) {
    hostname = hostname.substring(4);
  }

  // Lista de domínios ou IPs que não devem ser considerados subdomínios
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'localhost.localdomain') {
    return null;
  }

  const parts = hostname.split('.');

  // Caso especial para desenvolvimento com subdomínios locais (ex: torixoreu.localhost)
  if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
    return parts[0].toLowerCase();
  }

  // Para produção (ex: torixoreu.gestao360sistema.com.br)
  // gestao360sistema.com.br termina com .com.br (3 partes base: gestao360sistema, com, br)
  const isComBr = hostname.endsWith('.com.br');
  const basePartsCount = isComBr ? 3 : 2;

  if (parts.length > basePartsCount) {
    return parts[0].toLowerCase();
  }

  return null;
};

/**
 * Busca os detalhes da instituição (município) correspondente ao subdomínio ou ID no Supabase.
 */
export const fetchInstitutionBySubdomain = async (subdomain: string): Promise<Institution | null> => {
  const cleanSubdomain = subdomain.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .or(`subdomain.ilike.${cleanSubdomain},id.eq.${cleanSubdomain}`)
      .maybeSingle();

    if (!error && data) {
      return data as Institution;
    }

    if (error) {
      console.warn(`Consulta ao Supabase para instituição '${cleanSubdomain}':`, error.message);
    }
  } catch (err) {
    console.error('Erro de conexão ao buscar instituição pelo subdomínio:', err);
  }

  // Fallback para o município oficial ativo em produção
  const fallbackMunicipalities: Institution[] = [
    {
      id: 'inst_1',
      name: 'Prefeitura Municipal de Torixoréu',
      subdomain: 'torixoreu',
      logo_url: 'https://www.torixoreu.mt.gov.br/images/logoHeadernovo.png'
    }
  ];

  const matched = fallbackMunicipalities.find(
    m => m.subdomain.toLowerCase() === cleanSubdomain || m.id.toLowerCase() === cleanSubdomain
  );

  return matched || null;
};
