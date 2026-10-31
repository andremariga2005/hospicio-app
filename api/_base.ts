import { createClient } from '@supabase/supabase-js'

export function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
}
// Confere o token de quem chama e devolve o usuário e o papel.
export async function quemChama(req: Request) {
  const url = process.env.VITE_SUPABASE_URL, servico = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !servico) return { erro: json({ erro: 'Servidor sem configuração do banco' }, 500) }
  const admin = createClient(url, servico, { auth: { persistSession: false } })
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { erro: json({ erro: 'Não autenticado' }, 401) }
  const { data } = await admin.auth.getUser(token)
  if (!data.user) return { erro: json({ erro: 'Não autenticado' }, 401) }
  const { data: perfil } = await admin.from('perfis').select('papel').eq('id', data.user.id).single()
  return { admin, user: data.user, papel: perfil?.papel as string | undefined }
}
