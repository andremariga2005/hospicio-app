// Assistente: fala com a função /api/assistente (que usa a chave da Anthropic do Abel, só no servidor).
// Sem chave configurada ou sem rede, o app segue com as perguntas em toques e respostas prontas.
import { api } from './dados'
import { ciclo, consist, diaAtras, diaDe, doseDe, feitosSemana, alvoSemana, fmtKg, ha, notaPlacar, placar, primeiro, prontidaoHoje, proximaFicha, semanaISO, agora, tendencia } from './metodo'

export let iaDisponivel = true
export function resumoAluna(a: any) {
  const wk = semanaISO(agora()), c = ciclo(a), d = diaDe(a), dose = doseDe(prontidaoHoje(a)), t = tendencia(a), f = proximaFicha(a)
  const ultimos = [1, 2, 3].map((i) => `${diaAtras(i)}: placar ${notaPlacar(placar(a, diaAtras(i)))}/4`).join('; ')
  return `Aluna: ${primeiro(a.nome)}, ${a.idade || ''} anos, plano ${a.plano}, objetivo "${a.objetivo || ''}". Ciclo de 8 semanas, semana ${c.semana}${c.semana === 8 ? ' (descarga)' : ''}. Semana atual: ${feitosSemana(a, wk)} de ${alvoSemana(a, wk)} treinos feitos (régua 75%). Consistência das últimas 4 semanas: ${consist(a) ?? 'sem dados'}%. Último treino: ${a.ultimoTreino ? ha(a.ultimoTreino) : 'nenhum'}. Dose de hoje: ${dose ? dose.t : 'ainda não definida'}. Próxima ficha: ${f.id} (${f.nome}).${t ? ` Peso médio ${fmtKg(t.atual)} kg${t.delta != null ? `, ${t.delta > 0 ? '+' : ''}${fmtKg(t.delta)} kg em 2 semanas` : ''}.` : ''}${a.massaMagra && a.massaMagra.ativo ? ' Usa caneta para emagrecer (protocolo massa magra: proteína e força 2x por semana).' : ''} Respostas de hoje: ${JSON.stringify({ manha: d.manha || {}, noite: d.noite || {} })}. Dias anteriores: ${ultimos}.`
}
export async function reacaoIA(a: any, bloco: string): Promise<string | null> {
  if (!iaDisponivel) return null
  try { const r = await api('/api/assistente', { modo: 'reacao', nome: a.assistente?.nome || '', contexto: resumoAluna(a), bloco }); return r.texto || null }
  catch (e: any) { if (e.status === 503 || e.status === 404) iaDisponivel = false; return null }
}
export async function livreIA(a: any, texto: string, campos: string, historico: string): Promise<{ resposta: string | null; dados: any } | null> {
  if (!iaDisponivel) return null
  try { const r = await api('/api/assistente', { modo: 'livre', nome: a.assistente?.nome || '', contexto: resumoAluna(a), texto, campos, historico }); return { resposta: r.resposta || null, dados: r.dados || null } }
  catch (e: any) { if (e.status === 503 || e.status === 404) iaDisponivel = false; return null }
}
