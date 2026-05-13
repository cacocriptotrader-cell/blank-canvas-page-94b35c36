import { createClient } from '@supabase/supabase-js';

// No TanStack Start, as variáveis de ambiente VITE_* são injetadas no cliente.
// Se elas não estiverem configuradas no Lovable, o app não conseguirá se conectar ao banco.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Se as chaves estiverem ausentes, avisamos no console.
// Não usamos placeholders para evitar redirecionamentos para domínios inexistentes.
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error(
      '[DocFin] ERRO CRÍTICO: Variáveis de ambiente do Supabase não configuradas no Lovable. ' +
      'Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações do projeto.'
    );
  }
}

// Inicializamos o cliente. Se as chaves forem vazias, o Supabase lançará um erro 
// apenas quando uma função (como login) for chamada, em vez de quebrar o site inteiro no carregamento.
export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co', 
  supabaseAnonKey || 'missing-key'
);
