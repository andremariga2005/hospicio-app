// Função da Vercel: o Abel cadastra uma aluna (à mão ou aprovando uma ficha de anamnese)
// e o Supabase manda o convite por e-mail para ela criar a senha.
import { json, quemChama } from './_base'
import { alunoDaFicha } from './_anamnese'

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)
  const q = await quemChama(req); if (q.erro) return q.erro
  if (q.papel !== 'treinador') return json({ erro: 'Só o treinador cadastra alunos' }, 403)
  const site = process.env.PORTAL_URL; if (!site) return json({ erro: 'Falta a variável PORTAL_URL' }, 500)
  const admin = q.admin!

  const c = (await req.json()) as { anamnese_id?: string; nome?: string; email?: string; plano?: string; freq?: number; sexo?: string; objetivo?: string; inicio?: string }
  if (!c.plano) return json({ erro: 'Escolhe o plano' }, 400)

  let coluna: any, dados: any = {}, fichaId: string | null = null
  if (c.anamnese_id) {
    const { data: f } = await admin.from('anamneses').select('*').eq('id', c.anamnese_id).single()
    if (!f) return json({ erro: 'Ficha não encontrada' }, 404)
    if (f.status === 'aprovada') return json({ erro: 'Esta ficha já foi aprovada' }, 400)
    const m = alunoDaFicha(f.respostas, { plano: c.plano, freq: c.freq, inicio: c.inicio }); coluna = m.coluna; dados = m.dados; fichaId = f.id
  } else {
    const nome = c.nome?.trim(), email = c.email?.trim().toLowerCase()
    if (!nome || !email) return json({ erro: 'Nome e e-mail são obrigatórios' }, 400)
    coluna = { nome, email, plano: c.plano, freq: c.freq || 4, sexo: c.sexo || 'f', objetivo: c.objetivo || null, inicio: c.inicio || new Date().toISOString() }
  }

  // já é aluno (renovação ou ficha refeita): só atualiza, sem apagar nada
  const { data: existente } = await admin.from('alunos').select('id, dados').eq('email', coluna.email).maybeSingle()
  if (existente) {
    const { error } = await admin.from('alunos').update({ plano: coluna.plano, freq: coluna.freq, ativo: true, dados: { ...(existente.dados || {}), ...dados, peso: [...((existente.dados || {}).peso || []), ...(dados.peso || [])] } }).eq('id', existente.id)
    if (error) return json({ erro: 'Não consegui atualizar o aluno.' }, 500)
    if (fichaId) await admin.from('anamneses').update({ status: 'aprovada', aluno_id: existente.id, revisado_em: new Date().toISOString() }).eq('id', fichaId)
    return json({ id: existente.id, existente: true })
  }

  const { data: convite, error } = await admin.auth.admin.inviteUserByEmail(coluna.email, { data: { nome: coluna.nome }, redirectTo: `${site}/nova-senha` })
  if (error || !convite.user) return json({ erro: 'Não foi possível enviar o convite. Confira se o e-mail já não está cadastrado.' }, 400)

  await admin.from('perfis').insert({ id: convite.user.id, papel: 'aluna', nome: coluna.nome })
  const { data: aluno, error: e2 } = await admin.from('alunos').insert({ ...coluna, user_id: convite.user.id, dados }).select('id').single()
  if (e2) return json({ erro: 'Convite enviado, mas o cadastro da aluna falhou.' }, 500)
  if (fichaId) await admin.from('anamneses').update({ status: 'aprovada', aluno_id: aluno.id, revisado_em: new Date().toISOString() }).eq('id', fichaId)
  return json({ id: aluno.id })
}
