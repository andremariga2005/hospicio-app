// Função da Vercel: a assistente diária. Usa a chave da Anthropic do Abel (ANTHROPIC_API_KEY), só no servidor.
// Sem chave: responde 503 e o app segue no modo rápido (perguntas em toques e respostas prontas).
import { json, quemChama } from './_base'

export const config = { runtime: 'edge' }

const PERSONA = `Tu és a assistente do treinador Abel Colognese, dentro do app da consultoria de musculação dele. Fala em português do Brasil e trata a aluna por "tu", com o jeito do Abel: direto, bem-humorado, gaúcho na medida (um "bá" de vez em quando, não sempre), sarcástico sem nunca humilhar, sem frase motivacional vazia. Regras: no máximo 3 frases curtas; termina com UMA ação concreta e possível para hoje; não dá diagnóstico, não fala de remédio nem de dose de remédio; se houver dor forte, aguda ou que não passa, orienta parar o exercício que dói, avisar o Abel e procurar um profissional de saúde; nunca usa a palavra "hospício" para falar de uma pessoa; a régua da consultoria é cumprir 75% do que foi prescrito na semana que a pessoa realmente tem — a vida molda o treino, não o contrário.`

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)
  const chave = process.env.ANTHROPIC_API_KEY
  if (!chave) return json({ erro: 'Assistente sem chave configurada' }, 503)
  const q = await quemChama(req); if (q.erro) return q.erro

  const c = (await req.json()) as { modo?: string; nome?: string; contexto?: string; bloco?: string; texto?: string; campos?: string; historico?: string }
  const nome = String(c.nome || '').replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 20)
  const sistema = PERSONA + (nome ? ` Teu nome, escolhido pela própria aluna, é "${nome}": apresenta-te assim quando fizer sentido, sem repetir o nome a cada mensagem.` : '')
  const contexto = String(c.contexto || '').slice(0, 4000)

  let pedido: string
  if (c.modo === 'livre') {
    pedido = `Dados: ${contexto}\n\nConversa de hoje:\n${String(c.historico || '').slice(0, 3000)}\n\nA aluna escreveu agora: """${String(c.texto || '').slice(0, 600)}"""\n\nTarefa: (1) responde a ela seguindo as regras; (2) extrai do que ela escreveu os campos do diário que ela informou, usando SOMENTE estes campos e valores permitidos:\n${String(c.campos || '').slice(0, 3000)}\nResponde só com JSON no formato {"resposta":"texto","dados":{"manha":{...},"noite":{...}}}. Deixa de fora qualquer campo que ela não informou.`
  } else {
    pedido = `Dados: ${contexto}\n\nA aluna acabou de responder o check-in da ${c.bloco === 'noite' ? 'noite' : 'manhã'}. Escreve a tua mensagem para ela agora.`
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 500, system: sistema, messages: [{ role: 'user', content: pedido }] }),
  })
  if (!r.ok) return json({ erro: 'A assistente não respondeu agora' }, 502)
  const j = (await r.json()) as { content?: { type: string; text?: string }[] }
  const texto = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  if (c.modo === 'livre') {
    const ini = texto.indexOf('{'), fim = texto.lastIndexOf('}')
    try { const o = JSON.parse(texto.slice(ini, fim + 1)); return json({ resposta: String(o.resposta || ''), dados: o.dados || null }) }
    catch { return json({ resposta: texto, dados: null }) }
  }
  return json({ texto })
}
