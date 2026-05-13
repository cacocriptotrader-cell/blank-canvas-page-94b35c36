import { createClient } from '@supabase/supabase-js';

// No TanStack Start / SSR, import.meta.env pode não estar disponível no servidor da mesma forma que no cliente.
// Usamos uma abordagem que não quebra o servidor se as variáveis estiverem ausentes.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Se as chaves estiverem ausentes, o createClient ainda será chamado, mas as requisições falharão no cliente
// em vez de derrubar o servidor com um erro 500 durante a renderização.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[DocFin] Variáveis de ambiente do Supabase não encontradas. Certifique-se de configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
