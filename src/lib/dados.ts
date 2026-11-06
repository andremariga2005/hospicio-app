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

/* gravações: cada alteração vai como "patch" e o banco mescla com o que já existe (outro aparelho não perde nada).
   Se a internet cair, a alteração fica guardada neste aparelho e é reenviada assim que der. Nada se perde. */
const FILA = 'hosp_fila_gravacoes'
type Item = { id: string; patch: any; em: string }
const lerFila = (): Item[] => { try { return JSON.parse(localStorage.getItem(FILA) || '[]') } catch { return [] } }
const salvarFila = (f: Item[]) => { try { localStorage.setItem(FILA, JSON.stringify(f)) } catch { /* sem armazenamento */ } }
let enviando: Promise<void> | null = null
let aoFalhar: ((n: number) => void) | null = null
export const quandoFalhar = (f: (n: number) => void) => { aoFalhar = f }
export const pendentes = () => lerFila().length

async function esvaziar() {
  let f = lerFila()
  while (f.length) {
    const it = f[0]
    const { error } = await supabase.rpc('salvar_dados', { aluno: it.id, patch: it.patch })
    if (error) { aoFalhar?.(f.length); return }
    f = lerFila().slice(1); salvarFila(f)
  }
}
export function enviarPendentes() {
  if (!enviando) enviando = esvaziar().finally(() => { enviando = null })
  return enviando
}
if (typeof window !== 'undefined') window.addEventListener('online', () => { enviarPendentes() })

export function gravarPatch(id: string, patch: any) {
  const limpo = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => !COLUNAS.includes(k)))
  if (!Object.keys(limpo).length) return Promise.resolve()
  salvarFila([...lerFila(), { id, patch: limpo, em: new Date().toISOString() }])
  return enviarPendentes()
}
/** compatibilidade: grava o aluno inteiro como patch */
export const gravarAluno = (a: any) => gravarPatch(a.id, dadosDoAluno(a))

export async function registrarAcesso(onde: string) {
  try { await supabase.from('acessos').insert({ onde, aparelho: navigator.userAgent.slice(0, 180) }) } catch { /* não bloqueia */ }
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
  // convites rodam numa função do próprio Supabase (a chave secreta nunca sai do servidor)
  if (caminho === '/api/convidar') {
    const { data, error } = await supabase.functions.invoke('convidar', { body: corpo })
    if (error) { let msg = 'Falha'; try { msg = (await (error as any).context?.json())?.erro || error.message } catch { msg = error.message } throw new Error(msg) }
    return data
  }
  const { data } = await supabase.auth.getSession()
  const r = await fetch(caminho, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify(corpo) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.erro || 'Falha'), { status: r.status })
  return j
}

/* fichas de anamnese, histórico e acessos (leitura do treinador; nada aqui apaga) */
export async function listarAnamneses() {
  const { data, error } = await supabase.from('anamneses').select('*').order('criado_em', { ascending: false }).limit(300)
  if (error) throw error; return data || []
}
export async function anamneseDoAluno(alunoId: string) {
  const { data } = await supabase.from('anamneses').select('*').eq('aluno_id', alunoId).order('criado_em', { ascending: false }).limit(1).maybeSingle()
  return data
}
export async function marcarAnamnese(id: string, status: 'pendente' | 'arquivada') {
  const { error } = await supabase.from('anamneses').update({ status, revisado_em: new Date().toISOString() }).eq('id', id); if (error) throw error
}
export async function historicoAluno(alunoId: string) {
  const { data } = await supabase.from('alunos_historico').select('id, em, autor').eq('aluno_id', alunoId).order('em', { ascending: false }).limit(500)
  return data || []
}
export async function versaoDoAluno(id: number) {
  const { data } = await supabase.from('alunos_historico').select('linha, em').eq('id', id).single(); return data
}
export async function listarAcessos(dias = 60) {
  const desde = new Date(Date.now() - dias * 864e5).toISOString()
  const { data } = await supabase.from('acessos').select('user_id, em, onde').gte('em', desde).order('em', { ascending: false }).limit(5000)
  return data || []
}
