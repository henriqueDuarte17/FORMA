import { createClient } from '@supabase/supabase-js';

const env = import.meta.env || {};
let supabaseUrl = env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() || '';
let configurationError = '';

if (!supabaseUrl || !supabaseAnonKey) {
  configurationError = 'Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ficheiro .env.local.';
} else {
  try {
    const parsedUrl = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('A URL do projeto tem de começar por https:// ou http://.');
    }
    if (parsedUrl.search || parsedUrl.hash) {
      throw new Error('A URL do projeto não pode conter parâmetros nem fragmentos.');
    }
    const path = parsedUrl.pathname.replace(/\/+$/, '');
    if (path.toLowerCase() !== '' && path.toLowerCase() !== '/rest/v1') {
      throw new Error('Usa a Project URL base do Supabase, sem caminhos adicionais.');
    }
    parsedUrl.pathname = '/';
    supabaseUrl = parsedUrl.toString().replace(/\/$/, '');
  } catch (error) {
    configurationError = error.message === 'A URL do projeto tem de começar por https:// ou http://.'
      || error.message === 'A URL do projeto não pode conter parâmetros nem fragmentos.'
      || error.message === 'Usa a Project URL base do Supabase, sem caminhos adicionais.'
      ? error.message
      : 'VITE_SUPABASE_URL não é uma URL válida. Usa a Project URL em Supabase → Project Settings → API.';
  }
}

export const supabaseConfigured = !configurationError;
export const supabaseConfigurationError = configurationError;
export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
