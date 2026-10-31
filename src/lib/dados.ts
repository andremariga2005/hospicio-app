// Leitura e gravação no Supabase. O "aluno" do app é a linha da tabela com o JSON de dados aberto por cima.
import { supabase } from './supabase'
import { setConfig } from './metodo'

const COLUNAS = ['id', 'user_id', 'nome', 'email', 'cidade', 'idade', 'sexo', 'plano', 'inicio', 'freq', 'objetivo', 'nivel', 'demo', 'ativo', 'criado_em', 'atualizado_em']
export const linhaParaAluno = (l: any) => ({ ...(l.dados || {}), ...Object.fromEntries(COLUNAS.map((c) => [c, l[c]])) })
export const dadosDoAluno = (a: any) => Object.fromEntries(Object.entries(a).filter(([k]) => !COLUNAS.includes(k)))

export async function carregarConfig() {
  const { data } = await supabase.from('config').select('chave, valor')
  const m = (data || []).find((x: any) => x.chave === 'modelos'), o = (data || []).find((x: any) => x.chave === 'operacao')
  setConfig(m?.valor, o?.valor)
  return { modelos: m?.valor, operacao: o?.valor }
}
export async function salvarConfig(chave: string, valor: any) {
  const { error } = await supabase.from('config').upsert({ chave, valor, atualizado_em: new Date().toISOString() })
  if (error) throw error
}

export async function meuAluno(userId: string) {
  const { data, error } = await supabase.from('alunos').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data ? linhaParaAluno(data) : null
}
export async function alunoPorId(id: string) {
  const { data, error } = await supabase.from('alunos').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? linhaParaAluno(data) : null
}
export async function todosAlunos() {
  const { data, error } = await supabase.from('alunos').select('*').eq('ativo', true).order('nome')
  if (error) throw error
  return (data || []).map(linhaParaAluno)
}

/* gravações em fila por aluno: sempre o estado mais recente, uma de cada vez */
const filas: Record<string, Promise<any>> = {}
const pendente: Record<string, any> = {}
export function gravarAluno(a: any) {
  pendente[a.id] = a
  const anterior = filas[a.id] || Promise.resolve()
  const p = anterior.then(async () => {
    const atual = pendente[a.id]; if (!atual) return
    delete pendente[a.id]
    const { error } = await supabase.from('alunos').update({ dados: dadosDoAluno(atual) }).eq('id', atual.id)
    if (error) throw error
  })
  filas[a.id] = p.catch(() => {})
  return p
}
export async function atualizarColunas(id: string, cols: any) {
  const { error } = await supabase.from('alunos').update(cols).eq('id', id); if (error) throw error
}

/* execuções (vídeos) */
export async function listarExecucoes(alunoId?: string) {
  let q = supabase.from('execucoes').select('*, alunos(nome, plano)').order('enviado_em', { ascending: false }).limit(200)
  if (alunoId) q = q.eq('aluno_id', alunoId)
  const { data, error } = await q; if (error) throw error
  return (data || []).map((x: any) => ({ ...x, nome: x.alunos?.nome, plano: x.alunos?.plano }))
}
const limpo = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-60)
export async function enviarArquivo(alunoId: string, pasta: string, arquivo: File) {
  const caminho = `${alunoId}/${pasta}/${Date.now()}-${limpo(arquivo.name)}`
  const { error } = await supabase.storage.from('execucoes').upload(caminho, arquivo, { upsert: false, contentType: arquivo.type || undefined })
  if (error) throw error
  return caminho
}
export async function enviarExecucao(aluno: any, exercicio: string, arquivo: File, nota = '') {
  const caminho = await enviarArquivo(aluno.id, 'execucoes', arquivo)
  const { error } = await supabase.from('execucoes').insert({ aluno_id: aluno.id, exercicio, nota, arquivo: caminho })
  if (error) throw error
}
export async function urlAssinada(caminho: string) {
  if (!caminho || !caminho.includes('/')) return null
  const { data } = await supabase.storage.from('execucoes').createSignedUrl(caminho, 3600)
  return data?.signedUrl || null
}
export async function responderExecucao(id: string, veredito: string, resposta: string) {
  const { error } = await supabase.from('execucoes').update({ status: 'respondido', veredito, resposta, respondido_em: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/* a ala */
export async function listarAla() {
  const { data, error } = await supabase.from('ala').select('*').order('em', { ascending: false }).limit(40)
  if (error) throw error; return data || []
}
export async function postarAla(post: any) { const { error } = await supabase.from('ala').insert(post); if (error) throw error }
export async function alternarCoroa(id: string) { const { data, error } = await supabase.rpc('alternar_coroa', { post: id }); if (error) throw error; return data as string[] }

/* chamadas às funções do servidor */
export async function api(caminho: string, corpo: any) {
  const { data } = await supabase.auth.getSession()
  const r = await fetch(caminho, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify(corpo) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.erro || 'Falha'), { status: r.status })
  return j
}
