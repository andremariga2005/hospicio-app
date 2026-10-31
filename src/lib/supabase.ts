import { createClient } from '@supabase/supabase-js'

// Projeto hospicio-app (região São Paulo). A chave publicável vai para o navegador de qualquer forma:
// quem protege os dados são as regras do banco (RLS). As variáveis de ambiente têm prioridade.
const URL_PADRAO = '__SUPABASE_URL__'
const CHAVE_PADRAO = '__SUPABASE_CHAVE__'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || URL_PADRAO
const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || CHAVE_PADRAO

export const supabaseConfigurado = /^https:\/\//.test(url) && !chave.startsWith('__')
export const supabase = createClient(supabaseConfigurado ? url : 'https://exemplo.supabase.co', supabaseConfigurado ? chave : 'x', {
  auth: { persistSession: true, autoRefreshToken: true },
})

// Login curto ("luiza") vira e-mail interno; e-mail de verdade passa direto.
export const emailDoLogin = (login: string) => {
  const l = login.trim().toLowerCase()
  return l.includes('@') ? l : `${l}@hospicio.app`
}
