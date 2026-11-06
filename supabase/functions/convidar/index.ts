// Função do Supabase: o Abel cadastra um aluno (à mão ou aprovando uma ficha de anamnese)
// e o Supabase manda o convite por e-mail para ele criar a senha.
// Roda dentro do próprio Supabase, então a chave secreta nunca sai do servidor.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { alunoDaFicha } from './anamnese.ts'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'content-type': 'application/json' } })
const SITE = Deno.env.get('PORTAL_URL') || 'https://hospicio-app.vercel.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const { data: u } = await admin.auth.getUser(token || '')
  if (!u.user) return json({ erro: 'Não autenticado' }, 401)
  const { data: perfil } = await admin.from('perfis').select('papel').eq('id', u.user.id).single()
  if (perfil?.papel !== 'treinador') return json({ erro: 'Só o treinador cadastra alunos' }, 403)

  const c = await req.json().catch(() => ({})) as { anamnese_id?: string; nome?: string; email?: string; plano?: string; freq?: number; sexo?: string; objetivo?: string; inicio?: string }
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

  // já é aluno (renovação ou ficha refeita): só acrescenta, sem apagar nada
  const { data: existente } = await admin.from('alunos').select('id, dados').eq('email', coluna.email).maybeSingle()
  if (existente) {
    const antigo = existente.dados || {}
    const { error } = await admin.from('alunos').update({ plano: coluna.plano, freq: coluna.freq, ativo: true, dados: { ...antigo, ...dados, entrada: dados.entrada || antigo.entrada, peso: [...(antigo.peso || []), ...(dados.peso || [])] } }).eq('id', existente.id)
    if (error) return json({ erro: 'Não consegui atualizar o aluno.' }, 500)
    if (fichaId) await admin.from('anamneses').update({ status: 'aprovada', aluno_id: existente.id, revisado_em: new Date().toISOString() }).eq('id', fichaId)
    return json({ id: existente.id, existente: true })
  }

  const { data: convite, error } = await admin.auth.admin.inviteUserByEmail(coluna.email, { data: { nome: coluna.nome }, redirectTo: `${SITE}/nova-senha` })
  if (error || !convite.user) return json({ erro: 'Não foi possível enviar o convite: ' + (error?.message || 'sem usuário') }, 400)
  await admin.from('perfis').insert({ id: convite.user.id, papel: 'aluna', nome: coluna.nome })
  const { data: aluno, error: e2 } = await admin.from('alunos').insert({ ...coluna, user_id: convite.user.id, dados }).select('id').single()
  if (e2) return json({ erro: 'Convite enviado, mas o cadastro falhou: ' + e2.message }, 500)
  if (fichaId) await admin.from('anamneses').update({ status: 'aprovada', aluno_id: aluno.id, revisado_em: new Date().toISOString() }).eq('id', fichaId)
  return json({ id: aluno.id })
})
