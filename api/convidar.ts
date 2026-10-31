// Função da Vercel: o Abel cadastra uma aluna e o Supabase manda o convite por e-mail para ela criar a senha.
import { json, quemChama } from './_base'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)
  const q = await quemChama(req); if (q.erro) return q.erro
  if (q.papel !== 'treinador') return json({ erro: 'Só o treinador cadastra alunos' }, 403)
  const site = process.env.PORTAL_URL; if (!site) return json({ erro: 'Falta a variável PORTAL_URL' }, 500)

  const c = (await req.json()) as { nome?: string; email?: string; plano?: string; freq?: number; sexo?: string; objetivo?: string; inicio?: string }
  const nome = c.nome?.trim(), email = c.email?.trim().toLowerCase()
  if (!nome || !email || !c.plano) return json({ erro: 'Nome, e-mail e plano são obrigatórios' }, 400)

  const { data: convite, error } = await q.admin!.auth.admin.inviteUserByEmail(email, { data: { nome }, redirectTo: `${site}/nova-senha` })
  if (error || !convite.user) return json({ erro: 'Não foi possível enviar o convite. Confira se o e-mail já não está cadastrado.' }, 400)

  await q.admin!.from('perfis').insert({ id: convite.user.id, papel: 'aluna', nome })
  const { data: aluno, error: e2 } = await q.admin!.from('alunos').insert({
    user_id: convite.user.id, nome, email, plano: c.plano, freq: c.freq || 4, sexo: c.sexo || 'f', objetivo: c.objetivo || null,
    inicio: c.inicio || new Date().toISOString(), dados: {},
  }).select('id').single()
  if (e2) return json({ erro: 'Convite enviado, mas o cadastro da aluna falhou.' }, 500)
  return json({ id: aluno.id })
}
