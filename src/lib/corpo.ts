// O corpo em órbita: o que cada músculo recebeu na semana e o que gira em volta (hoje, semana, ciclo).
// Tudo calculado do que a aluna já registra.
import { agora, alvoSemana, baseGrupo, ciclo, diaDe, DIA, dt, feitosSemana, fichaPorId, grupoDe, hojeISO, chaveDia, semanaISO, treinouHoje, volAtivo, ultimoCheckin } from './metodo'
import { sequenciaDiario } from './jogo'

export type St = 'ok' | 'pend' | 'atr' | 'sem'
export const MUSCULOS = ['Peito', 'Costas', 'Ombro', 'Tríceps', 'Core', 'Glúteo', 'Quadríceps', 'Posterior', 'Panturrilha'] as const
export interface Regiao { feito: number; alvo: number; pct: number; dor: string | null }
export interface ItemOrbita { id: string; n: string; info: string; anel: 0 | 1 | 2; st: St; acao?: string }

const DOR_EM: Record<string, string> = { Joelho: 'Quadríceps', Lombar: 'Costas', Ombro: 'Ombro', Quadril: 'Glúteo' }

export function regioes(a: any): Record<string, Regiao> {
  const wk = semanaISO(agora()); const vg = volAtivo(a); const r: Record<string, Regiao> = {}
  MUSCULOS.forEach((g) => { const alvo = Math.max(0, baseGrupo(g) + ((vg[g] || {}).delta || 0)); r[g] = { feito: 0, alvo, pct: 0, dor: null } })
  ;(a.logs || []).filter((l: any) => semanaISO(dt(l.data)) === wk).forEach((l: any) => {
    const f = fichaPorId(l.ficha); if (!f) return
    f.exercicios.forEach((e: any) => { if (r[e.grupo]) r[e.grupo].feito += e.series })
  })
  MUSCULOS.forEach((g) => { const x = r[g]; x.pct = x.alvo ? Math.min(1.5, x.feito / x.alvo) : 0 })
  const m = diaDe(a).manha || {}
  if (m.dor === 'articular' && DOR_EM[m.dorOnde]) r[DOR_EM[m.dorOnde]].dor = `Dor no ${String(m.dorOnde).toLowerCase()} hoje`
  const fb = a.ultimoFb
  if (fb && fb.art === 'dor' && Date.now() - +dt(fb.em) < 10 * DIA) { const g = grupoDe(fb.ex || ''); if (r[g] && !r[g].dor) r[g].dor = `Dor relatada: ${fb.ex}` }
  return r
}

export function itensOrbita(a: any, execucoes: any[] = []): ItemOrbita[] {
  const d = diaDe(a), m = d.manha || {}, h = agora().getHours(), wk = semanaISO(agora()), c = ciclo(a)
  const fa = a.plano === 'Full Access'
  const alvo = alvoSemana(a, wk), feitos = feitosSemana(a, wk), meta = Math.ceil(alvo * 0.75)
  const diaSem = (agora().getDay() + 6) % 7 // 0 = segunda
  const esperado = Math.floor(meta * (diaSem + 1) / 7)
  const sono = Array.from({ length: 7 }, (_, i) => (diaDe(a, chaveDia(new Date(Date.now() - i * DIA))).manha || {}).sono_h).filter((v) => v != null) as number[]
  const sonoM = sono.length ? sono.reduce((s, v) => s + v, 0) / sono.length : null
  const pes = (a.peso || []).filter((p: any) => Date.now() - +new Date(p.data + 'T12:00:00') < 7 * DIA).length
  const fech = (a.fechamentos || []).some((f: any) => f.semana === wk)
  const sd = sequenciaDiario(a)
  const ex = execucoes.filter((x) => Date.now() - +dt(x.enviado_em) < 28 * DIA)
  const semTreino = m.treinoHoje === 'nao' || m.treinoHoje === 'descanso'
  const ig = (a.ingestao || {})[hojeISO()]
  const ck = ultimoCheckin(a)
  const it: ItemOrbita[] = [
    { id: 'manha', n: 'Check-in', anel: 0, st: d.flags?.manha ? 'ok' : h < 11 ? 'pend' : 'atr', info: d.flags?.manha ? 'Manhã respondida: dose do dia definida.' : 'Falta o check-in da manhã.', acao: 'abertura' },
    { id: 'treino', n: 'Treino', anel: 0, st: treinouHoje(a) || m.treinoHoje === 'descanso' ? 'ok' : semTreino ? 'sem' : h < 18 ? 'pend' : 'atr', info: treinouHoje(a) ? 'Treino de hoje registrado.' : semTreino ? 'Avisou que hoje não tem treino.' : 'Treino de hoje ainda não registrado.', acao: semTreino ? undefined : 'treinar' },
    fa ? { id: 'comida', n: 'Comida', anel: 0, st: ig && ig.k ? 'ok' : h < 14 ? 'pend' : 'atr', info: ig && ig.k ? `${Math.round(ig.k)} kcal marcadas hoje.` : 'Refeições de hoje ainda não marcadas.', acao: 'rotina' }
      : { id: 'proteina', n: 'Proteína', anel: 0, st: (d.noite || {}).proteina >= 3 ? 'ok' : (d.noite || {}).proteina != null ? 'atr' : 'sem', info: 'Refeições com proteína, respondido no fechamento do dia.', acao: 'abertura-noite' },
    { id: 'noite', n: 'Fechar o dia', anel: 0, st: d.flags?.noite ? 'ok' : h < 17 ? 'sem' : h < 22 ? 'pend' : 'atr', info: d.flags?.noite ? 'Dia fechado.' : h < 17 ? 'Libera às 17 h.' : 'Falta fechar o dia.', acao: h >= 17 ? 'abertura-noite' : undefined },

    { id: 'regua', n: 'Régua 75%', anel: 1, st: feitos >= meta ? 'ok' : feitos >= esperado ? 'pend' : 'atr', info: `${feitos} de ${alvo} treinos na semana. Meta dos 75%: ${meta}.`, acao: 'resultados' },
    { id: 'sono', n: 'Sono', anel: 1, st: sonoM == null ? 'sem' : sonoM >= 7 ? 'ok' : sonoM >= 6 ? 'pend' : 'atr', info: sonoM == null ? 'Sem sono registrado nos últimos 7 dias.' : `Média de ${sonoM.toFixed(1).replace('.', ',')} h nos últimos 7 dias.`, acao: 'rotina' },
    { id: 'diario', n: 'Diário', anel: 1, st: sd >= 5 ? 'ok' : sd >= 2 ? 'pend' : 'atr', info: `${sd} dia${sd === 1 ? '' : 's'} seguido${sd === 1 ? '' : 's'} respondendo.`, acao: 'abertura' },
    { id: 'peso', n: 'Balança', anel: 1, st: pes >= 3 ? 'ok' : pes >= 1 ? 'pend' : 'atr', info: `${pes} pesage${pes === 1 ? 'm' : 'ns'} nos últimos 7 dias (o ideal são 3).`, acao: 'prontuario' },
    { id: 'fech', n: 'Fechamento', anel: 1, st: fech ? 'ok' : [0, 5, 6].includes(agora().getDay()) ? 'pend' : 'sem', info: fech ? 'Semana fechada com o Abel.' : 'Fechamento libera no fim de semana.', acao: 'fechamento' },

    { id: 'laudo', n: 'Laudo', anel: 2, st: c.fotoEm > 3 ? 'ok' : c.fotoEm > 0 ? 'pend' : 'atr', info: `Próximas fotos em ${c.fotoEm} dia${c.fotoEm === 1 ? '' : 's'}.`, acao: 'prontuario' },
    { id: 'exec', n: 'Execução', anel: 2, st: ex.length ? (ex.some((x) => x.status === 'aguardando') ? 'pend' : 'ok') : 'atr', info: ex.length ? `${ex.length} execuç${ex.length === 1 ? 'ão enviada' : 'ões enviadas'} em 4 semanas.` : 'Nenhuma execução enviada ao Abel em 4 semanas.', acao: 'prescricao' },
    { id: 'ciclo', n: `Semana ${c.semana}/8`, anel: 2, st: c.renovaEm > 14 ? 'ok' : 'pend', info: `Ciclo ${c.n}. Renovação em ${c.renovaEm} dias.`, acao: 'resultados' },
  ]
  if (fa && ck) it.push({ id: 'dieta', n: 'Dieta', anel: 2, st: ck.status === 'pendente' ? 'pend' : 'ok', info: ck.status === 'pendente' ? 'Ajuste da dieta esperando o Abel.' : 'Dieta ajustada pelo último check-in.', acao: 'rotina' })
  return it
}

/** corpo da consultoria inteira: % das alunas que treinaram cada músculo na semana */
export function regioesTodos(alunos: any[]): Record<string, Regiao> {
  const r: Record<string, Regiao> = {}
  MUSCULOS.forEach((g) => { r[g] = { feito: 0, alvo: alunos.length, pct: 0, dor: null } })
  alunos.forEach((a) => { const x = regioes(a); MUSCULOS.forEach((g) => { if (x[g].pct >= 0.75) r[g].feito++; }); })
  MUSCULOS.forEach((g) => { r[g].pct = r[g].alvo ? r[g].feito / r[g].alvo : 0 })
  const dores = alunos.map((a) => regioes(a)).flatMap((x) => MUSCULOS.filter((g) => x[g].dor).map((g) => g))
  MUSCULOS.forEach((g) => { const n = dores.filter((x) => x === g).length; if (n) r[g].dor = `${n} aluna${n > 1 ? 's' : ''} com dor aqui` })
  return r
}
