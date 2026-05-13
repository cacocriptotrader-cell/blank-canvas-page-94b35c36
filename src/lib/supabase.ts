import { createClient } from '@supabase/supabase-js';

// No TanStack Start, as variáveis de ambiente VITE_* são injetadas no cliente.
// No servidor, elas podem não estar presentes durante o build ou renderização inicial.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// Criamos o cliente de forma que não quebre se as chaves faltarem no servidor.
// O createClient do Supabase é resiliente a strings vazias ou placeholders, 
// desde que não lancemos um erro manualmente durante a fase de importação.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper para verificar se o Supabase está configurado corretamente no cliente
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder';
};
