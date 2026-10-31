// Regras do método do Abel: ciclo de 8 semanas, régua dos 75%, dose do dia, volume por músculo,
// dupla progressão, tendência de peso, dieta adaptativa, placar do dia e radar de desistência.
// Tudo aqui é função pura sobre o "aluno" (colunas da tabela + o JSON de dados).
import modelosPadrao from '../content/modelos.json'
import operacaoPadrao from '../content/operacao.json'

export type Aluno = any
export const DIA = 864e5
let MODELOS: any = modelosPadrao
let OPERACAO: any = operacaoPadrao
export const setConfig = (m?: any, o?: any) => { if (m) MODELOS = m; if (o) OPERACAO = o }
export const MOD = () => MODELOS
export const OP = () => OPERACAO

/* ---------- datas e formatos ---------- */
export const dt = (s: string) => new Date(s)
export const agora = () => new Date()
const p2 = (n: number) => String(n).padStart(2, '0')
export const chaveDia = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const hojeISO = () => chaveDia(agora())
export const diaAtras = (i: number) => chaveDia(new Date(Date.now() - i * DIA))
export const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const dataLonga = (d: Date) => `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
export const dataCurta = (d: Date) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`
export const brl = (n: number) => 'R$ ' + Math.round(n).toLocaleString('pt-BR')
export const num = (n: number) => Math.round(n).toLocaleString('pt-BR')
export const fmtKg = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')
export const numBR = (v: any) => parseFloat(String(v ?? '').replace(',', '.'))
export const primeiro = (n: string) => String(n || '').split(' ')[0]
export const iniciais = (n: string) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
export function ha(iso: string) {
  const m = Math.round((Date.now() - +dt(iso)) / 6e4)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}
export function semanaISO(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dn = (t.getUTCDay() + 6) % 7
  t.setUTCDate(t.getUTCDate() - dn + 3)
  const fy = t.getUTCFullYear(), f4 = new Date(Date.UTC(fy, 0, 4))
  const w = 1 + Math.round(((+t - +f4) / DIA - 3 + ((f4.getUTCDay() + 6) % 7)) / 7)
  return fy + '-W' + p2(w)
}
export const precoMes = (p: string) => ((OP().precos || {})[p] || 0) / 2
export const NOMEV: any = { patetica: 'Patética', aceitavel: 'Aceitável', perfeita: 'Perfeita' }

/* ---------- ciclo e régua dos 75% ---------- */
export function ciclo(a: Aluno) {
  const d = Math.max(0, Math.floor((Date.now() - +dt(a.inicio)) / DIA)); const r = d % 56
  return { dias: d, semana: Math.floor(r / 7) + 1, renovaEm: 56 - r, fotoEm: 28 - (d % 28), videoEm: 56 - r, n: Math.floor(d / 56) + 1 }
}
export const alvoSemana = (a: Aluno, wk: string) => (a.semanaReal && a.semanaReal.semana === wk && a.semanaReal.dias) ? a.semanaReal.dias : (a.freq || 4)
export const feitosSemana = (a: Aluno, wk: string) => (a.semanas && a.semanas[wk] && a.semanas[wk].feitos) || 0
export const pctSemana = (a: Aluno, wk: string) => Math.round(100 * feitosSemana(a, wk) / Math.max(1, alvoSemana(a, wk)))
export function semanasFechadas(a: Aluno, n = 4) { const cur = semanaISO(agora()); return Object.keys(a.semanas || {}).filter((k) => k < cur).sort().slice(-n) }
export function consist(a: Aluno): number | null { const ks = semanasFechadas(a); if (!ks.length) return null; return Math.round(ks.reduce((s, k) => s + Math.min(100, pctSemana(a, k)), 0) / ks.length) }
export const diasSemTreino = (a: Aluno) => a.ultimoTreino ? Math.floor((Date.now() - +dt(a.ultimoTreino)) / DIA) : 999
export function estado(a: Aluno) {
  const c = consist(a), s = diasSemTreino(a)
  if (s >= 10) return { k: 'risco', t: `Sumiu · ${s} dias` }
  if (c == null) return { k: 'latao', t: 'Começando' }
  if (c >= 75) return { k: 'bom', t: 'Dentro dos 75%' }
  if (c >= 50) return { k: 'atencao', t: 'Abaixo dos 75%' }
  return { k: 'risco', t: 'Em risco' }
}

/* ---------- fichas ---------- */
export const fichaPorId = (id: string) => MOD().fichas.find((f: any) => f.id === id)
export function proximaFicha(a: Aluno) {
  const seq = ['A', 'B', 'C']; const logs = (a.logs || []).filter((l: any) => l.ficha !== 'S')
  const ult = logs.length ? logs[logs.length - 1].ficha : null; const i = ult ? seq.indexOf(ult) : -1
  return fichaPorId(seq[(i + 1) % 3])
}
export function subsDe(nome: string): string[] { for (const f of MOD().fichas) for (const e of f.exercicios) if (e.nome === nome) return e.subs || []; return [] }
export function faixa(reps: string) { const m = String(reps).match(/(\d+)\s*[–-]\s*(\d+)/); return m ? [+m[1], +m[2]] : null }
/* dupla progressão: topo da faixa em todas as séries → sobe carga; senão → +1 repetição */
export function metaHoje(a: Aluno, nome: string, reps: string) {
  const ult = (a.cargas || {})[nome]; const fx = faixa(reps); if (!ult || !ult.length || !fx) return null
  const kg = Math.max(...ult.map((s: any) => s.kg || 0)); if (!kg) return null
  if (ult.every((s: any) => (s.reps || 0) >= fx[1])) { const inc = kg >= 20 ? 2.5 : 1; return { kg: kg + inc, reps: fx[0], sobe: true, txt: `Sobe a carga: ${fmtKg(kg + inc)} kg × ${fx[0]}` } }
  const r = Math.min(fx[1], Math.min(...ult.map((s: any) => s.reps || 0)) + 1); return { kg, reps: r, sobe: false, txt: `Meta: ${fmtKg(kg)} kg × ${r} em todas` }
}

/* ---------- prontidão → dose do dia ---------- */
export const prontidaoHoje = (a: Aluno) => { const p = a.prontidao; return p && p.data === hojeISO() ? p : null }
export function doseDe(p: any) {
  if (!p) return null; const sc = (p.sono || 3) + (p.energia || 3)
  if (p.dor === 'articular') return { k: 'leve', t: 'Dose leve', x: 'Dor na articulação: treina em volta, não em cima. Uma série a menos, troca o exercício que dói e manda o vídeo.' }
  if (sc <= 4) return { k: 'minima', t: 'Dose mínima', x: 'Dia ruim também conta. Duas séries por exercício, mesma intensidade. Fecha os 75% do mesmo jeito.' }
  if (p.ciclo === 'forte' && sc <= 6) return { k: 'minima', t: 'Dose mínima', x: 'Sintomas fortes hoje. Duas séries por exercício e sem caça a recorde. O treino de hoje é para não quebrar a sequência.' }
  return { k: 'cheia', t: 'Dose cheia', x: 'Corpo pronto. Prescrição completa.' }
}

/* ---------- volume por músculo (modelo RP) ---------- */
export const GRUPOS = ['Glúteo', 'Quadríceps', 'Posterior', 'Costas', 'Peito', 'Ombro', 'Tríceps', 'Panturrilha', 'Core']
export const DESCARGA = 8
export function grupoDe(nome: string) { for (const f of MOD().fichas) for (const e of f.exercicios) { if (e.nome === nome || (e.subs || []).includes(nome)) return e.grupo || 'Outros' } return 'Outros' }
export const volAtivo = (a: Aluno) => { const v = a.volume; return (v && v.ciclo === ciclo(a).n) ? (v.grupos || {}) : {} }
export const fichasFixas = () => MOD().fichas.filter((f: any) => !f.curta)
export function baseGrupo(g: string) { let n = 0; fichasFixas().forEach((f: any) => f.exercicios.forEach((e: any) => { if (e.grupo === g) n += e.series })); return n }
export function alocacao(a: Aluno) {
  const vg = volAtivo(a), out: any = {}
  GRUPOS.forEach((g) => {
    let d = (vg[g] || {}).delta || 0; if (!d) return; const slots: any[] = []
    fichasFixas().forEach((f: any) => f.exercicios.forEach((e: any, i: number) => { if (e.grupo === g) slots.push({ k: f.id + ':' + i, base: e.series }) }))
    slots.forEach((s) => (out[s.k] = 0)); let i = 0, guard = 0
    while (d !== 0 && guard < 200 && slots.length) {
      const s = slots[i % slots.length], cur = s.base + out[s.k]
      if (d > 0 && cur < 6) { out[s.k]++; d-- } else if (d < 0 && cur > 1) { out[s.k]--; d++ }
      i++; guard++
    }
  })
  return out
}
export function seriesNoDia(a: Aluno, f: any, e: any) {
  const i = f.exercicios.indexOf(e); let n = e.series + (f.curta ? 0 : (alocacao(a)[f.id + ':' + i] || 0))
  if (ciclo(a).semana === DESCARGA) n = Math.max(1, Math.ceil(n / 2))
  const d = doseDe(prontidaoHoje(a)); if (d && d.k === 'minima') n = Math.min(n, 2); if (d && d.k === 'leve') n = Math.max(1, n - 1)
  return n
}
export function calcGrupo(rec: string, pump: string, esf: string) {
  if (rec === 'dolorida' && esf === 'pesado') return { d: -2, motivo: 'Ainda dolorido e pesado demais: −2 séries.' }
  if (rec === 'dolorida') return { d: -1, motivo: 'Ainda dolorido do treino anterior: −1 série.' }
  if (esf === 'pesado') return { d: 0, motivo: 'Pesado demais hoje: segura o volume.' }
  if (rec === 'nem' && pump === 'fraca') return { d: 2, motivo: 'Recuperou antes do tempo e quase não sentiu: +2 séries.' }
  if (pump === 'fraca') return { d: 1, motivo: 'Recuperou no tempo e sentiu pouco: +1 série.' }
  if (rec === 'nem' && esf === 'facil') return { d: 1, motivo: 'Recuperou antes do tempo e sobrou energia: +1 série.' }
  return { d: 0, motivo: 'Sentiu bem e recuperou no tempo: segura.' }
}

/* ---------- peso em tendência ---------- */
export function tendencia(a: Aluno) {
  const ps = (a.peso || []).slice().sort((x: any, y: any) => (x.data < y.data ? -1 : 1)); if (!ps.length) return null
  const pts = ps.map((p: any) => ({ d: new Date(p.data + 'T12:00:00'), kg: p.kg }))
  const mm = pts.map((p: any) => { const j = pts.filter((q: any) => q.d <= p.d && (+p.d - +q.d) < 7 * DIA); return { d: p.d, kg: j.reduce((s: number, q: any) => s + q.kg, 0) / j.length } })
  const ult = mm[mm.length - 1]; const ant = mm.slice().reverse().find((m: any) => (+ult.d - +m.d) >= 13 * DIA)
  return { pts, mm, atual: ult.kg, delta: ant ? ult.kg - ant.kg : null, ultimo: pts[pts.length - 1].kg }
}

/* ---------- dieta adaptativa (modelo MacroFactor) ---------- */
export const KCAL_KG = 7700
export const hojeDieta = (a: Aluno) => { const d = a.dieta || {}; return d.dia === hojeISO() ? (d.feitos || []) : [] }
export function totaisPlano() { const t = { k: 0, p: 0, c: 0, g: 0 }; MOD().dieta.refeicoes.forEach((r: any) => r.itens.forEach((it: any) => { t.k += it[2]; t.p += it[3]; t.c += it[4]; t.g += it[5] })); return t }
export function metaNutri(a: Aluno) { const m = a.nutri && a.nutri.meta; if (m && m.k) return m; const t = totaisPlano(); return { k: Math.round(t.k), p: Math.round(t.p), c: Math.round(t.c), g: Math.round(t.g) } }
export const fatorPorcao = (a: Aluno) => metaNutri(a).k / Math.max(1, totaisPlano().k)
export function porcao(txt: string, f: number) { const m = String(txt).match(/^([\d.,]+)\s*(g|ml)\b/); if (!m || Math.abs(f - 1) < 0.03) return txt; const v = Math.max(5, Math.round(numBR(m[1]) * f / 5) * 5); return txt.replace(m[0], `${v} ${m[2]}`) }
export const ingHoje = (a: Aluno) => (a.ingestao || {})[hojeISO()] || { k: 0, p: 0, fora: 0 }
export function macrosHoje(a: Aluno) {
  const feitos = hojeDieta(a), f = fatorPorcao(a); const tot = { k: 0, p: 0, c: 0, g: 0 }
  MOD().dieta.refeicoes.forEach((r: any) => r.itens.forEach((it: any, i: number) => { if (feitos.includes(r.id + ':' + i)) { tot.k += it[2] * f; tot.p += it[3] * f; tot.c += it[4] * f; tot.g += it[5] * f } }))
  tot.k += ingHoje(a).fora || 0; const m = metaNutri(a); return { tot, meta: { k: m.k, p: m.p, c: m.c, g: m.g } }
}
export function gravaIngestao(a: Aluno, feitos: string[], fora: number) {
  const f = fatorPorcao(a); let k = 0, p = 0
  MOD().dieta.refeicoes.forEach((r: any) => r.itens.forEach((it: any, i: number) => { if (feitos.includes(r.id + ':' + i)) { k += it[2] * f; p += it[3] * f } }))
  const ing = { ...(a.ingestao || {}) }; ing[hojeISO()] = { k: Math.round(k + fora), p: Math.round(p), fora }
  const ks = Object.keys(ing).sort(); ks.slice(0, Math.max(0, ks.length - 60)).forEach((x) => delete ing[x]); return ing
}
export function gastoEstimado(a: Aluno): any {
  const ing = a.ingestao || {}; const vals: number[] = []
  for (let i = 1; i <= 21; i++) { const k = diaAtras(i); if (ing[k] && ing[k].k > 0) vals.push(ing[k].k) }
  const t = tendencia(a); if (vals.length < 7 || !t) return { ok: false, dias: vals.length, pesos: t ? t.pts.filter((p: any) => (Date.now() - +p.d) < 21 * DIA).length : 0 }
  const mm = t.mm.filter((m: any) => (Date.now() - +m.d) < 21 * DIA); if (mm.length < 4) return { ok: false, dias: vals.length, pesos: mm.length }
  const xs = mm.map((m: any) => (+m.d - +mm[0].d) / DIA), ys = mm.map((m: any) => m.kg)
  const mx = xs.reduce((s: number, v: number) => s + v, 0) / xs.length, my = ys.reduce((s: number, v: number) => s + v, 0) / ys.length
  const slope = xs.reduce((s: number, x: number, i: number) => s + (x - mx) * (ys[i] - my), 0) / Math.max(1e-6, xs.reduce((s: number, x: number) => s + (x - mx) ** 2, 0))
  const media = vals.reduce((s, v) => s + v, 0) / vals.length; const gasto = Math.round((media - slope * KCAL_KG) / 10) * 10
  return { ok: true, gasto, media: Math.round(media), slope, semana: slope * 7, dias: vals.length, peso: t.ultimo }
}
export const OBJ: any = { perder: 'Perder gordura', manter: 'Manter', ganhar: 'Ganhar massa' }
export function propor(a: Aluno, g: any) {
  const n = a.nutri || {}; const obj = n.objetivo || 'manter'; const rit = (n.ritmo != null ? n.ritmo : obj === 'perder' ? 0.5 : obj === 'ganhar' ? 0.25 : 0) / 100; const peso = g.peso
  const aj = obj === 'perder' ? -rit * peso * KCAL_KG / 7 : obj === 'ganhar' ? rit * peso * KCAL_KG / 7 : 0
  const k = Math.max(1200, Math.round((g.gasto + aj) / 10) * 10), p = Math.round(1.8 * peso), gd = Math.round(0.8 * peso), c = Math.max(50, Math.round((k - p * 4 - gd * 9) / 4))
  return { k, p, c, g: gd }
}
export const ultimoCheckin = (a: Aluno) => { const cs = (a.nutri && a.nutri.checkins) || []; return cs[cs.length - 1] }
export const proteinaHoje = (a: Aluno) => a.plano === 'Full Access' ? macrosHoje(a).tot.p : ((a.proteina && a.proteina.dia === hojeISO()) ? a.proteina.g : 0)
export const alvoProteina = (a: Aluno) => { const t = tendencia(a); if (!t) return null; return { min: Math.round(t.ultimo * 1.2), alvo: Math.round(t.ultimo * 1.6), peso: t.ultimo } }

/* ---------- sono ---------- */
export function sonoScore(s: any) {
  if (!s) return null
  const [h1, m1] = s.deitou.split(':').map(Number), [h2, m2] = s.levantou.split(':').map(Number)
  let min = (h2 * 60 + m2) - (h1 * 60 + m1); if (min < 0) min += 1440
  return { pct: Math.round(70 * Math.min(1, min / 480) + 30 * ((s.nota || 3) - 1) / 4), min }
}
export function proximaRefeicao() {
  const h = agora().getHours() * 60 + agora().getMinutes()
  const rs = MOD().dieta.refeicoes.filter((r: any) => /\d/.test(r.hora))
  return rs.find((r: any) => { const [hh, mm] = r.hora.split(':').map(Number); return hh * 60 + mm > h }) || rs[0]
}

/* ---------- diário: perguntas ligadas a decisões ---------- */
export const PERGUNTAS: any[] = [
  { id: 'sono_h', bloco: 'manha', q: 'Bom dia. Quantas horas tu dormiu?', chips: [[4.5, 'Menos de 5'], [5.5, '5 a 6'], [6.5, '6 a 7'], [7.5, '7 a 8'], [8.5, 'Mais de 8']], por: 'Sono abaixo de 7 h puxa a dose do dia para baixo e entra na média da semana.' },
  { id: 'sono_q', bloco: 'manha', q: 'E a qualidade desse sono?', chips: [[1, 'Péssimo'], [2, 'Ruim'], [3, 'Ok'], [4, 'Bom'], [5, 'Ótimo']], por: 'Junto com a energia, decide dose cheia, mínima ou leve.' },
  { id: 'energia', bloco: 'manha', q: 'Energia agora, de zerada a lá em cima?', chips: [[1, 'Zerada'], [2, 'Baixa'], [3, 'Ok'], [4, 'Boa'], [5, 'Lá em cima']], por: 'Decide a dose do treino de hoje.' },
  { id: 'dor', bloco: 'manha', q: 'Alguma dor hoje?', chips: [['nenhuma', 'Nenhuma'], ['muscular', 'Muscular, do treino'], ['articular', 'Na articulação']], por: 'Dor na articulação troca o exercício, baixa uma série e avisa o Abel.' },
  { id: 'dorOnde', bloco: 'manha', q: 'Onde?', chips: [['Joelho', 'Joelho'], ['Lombar', 'Lombar'], ['Ombro', 'Ombro'], ['Quadril', 'Quadril'], ['Outro', 'Outro lugar']], se: (_a: Aluno, d: any) => d.manha && d.manha.dor === 'articular', por: 'Diz ao Abel qual exercício olhar primeiro.' },
  { id: 'ciclo', bloco: 'manha', q: 'Ciclo hoje? Pode pular.', chips: [['sem', 'Sem sintomas'], ['leve', 'Sintomas leves'], ['forte', 'Sintomas fortes'], ['na', 'Não se aplica']], se: (a: Aluno) => a.sexo === 'f', por: 'Contexto do dia: sintomas fortes com energia baixa viram dose mínima.' },
  { id: 'treinoHoje', bloco: 'manha', q: 'Tem treino hoje?', chips: [['sim', 'Tem'], ['descanso', 'Descanso planejado'], ['nao', 'Hoje não vai dar']], por: 'Prevê se a semana fecha os 75% e oferece a ficha S quando aperta.' },
  { id: 'peso', bloco: 'manha', q: 'Dia de balança. Quanto deu, em jejum?', input: 'kg', se: () => [1, 3, 5].includes(agora().getDay()), por: 'Três pesagens por semana alimentam a média de 7 dias e o ajuste da dieta.' },
  { id: 'treinou', bloco: 'noite', q: 'Fechando o dia: treinou?', chips: [['sim', 'Treinei'], ['descanso', 'Era descanso'], ['nao', 'Não deu']], auto: (a: Aluno) => (treinouHoje(a) ? 'sim' : null), por: 'Conta para os 75% da semana.' },
  { id: 'motivo', bloco: 'noite', q: 'Sem julgamento: o que pegou?', chips: [['tempo', 'Faltou tempo'], ['cansaco', 'Cansaço'], ['dor', 'Dor'], ['esqueci', 'Esqueci'], ['outro', 'Outra coisa']], se: (_a: Aluno, d: any) => d.noite && d.noite.treinou === 'nao', por: 'Mostra ao Abel o motivo que mais derruba a semana e alimenta o radar.' },
  { id: 'proteina', bloco: 'noite', q: 'Quantas refeições tiveram proteína de verdade hoje?', chips: [[0, 'Nenhuma'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5+']], se: (a: Aluno) => a.plano !== 'Full Access', por: 'Três ou mais refeições com proteína contam como dia de comida em dia.' },
  { id: 'estresse', bloco: 'noite', q: 'Quanto pesou o dia, de 1 a 5?', chips: [[1, 'Leve'], [2, '2'], [3, '3'], [4, '4'], [5, 'Pesado']], por: 'Dia pesado explica a semana que escorrega. O Abel ajusta antes de virar desistência.' },
]
export const PILARES = [['treino', 'Treino'], ['comida', 'Comida'], ['sono', 'Sono'], ['presenca', 'Presença']]
export const diaDe = (a: Aluno, k?: string) => (a.diario || {})[k || hojeISO()] || {}
export const treinouHoje = (a: Aluno) => (a.logs || []).some((l: any) => dt(l.data).toDateString() === agora().toDateString())
export const aplicavel = (a: Aluno, d: any, p: any) => !p.se || p.se(a, d)
export function blocoCompleto(a: Aluno, d: any, b: string) {
  return !!d[b] && PERGUNTAS.filter((p) => p.bloco === b && aplicavel(a, d, p) && p.id !== 'peso').every((p) => (d[b] || {})[p.id] !== undefined || (p.auto && p.auto(a)))
}
export function proximaPergunta(a: Aluno, fecharDia: boolean) {
  const d = diaDe(a)
  for (const p of PERGUNTAS) {
    if (p.bloco === 'noite' && !blocoCompleto(a, d, 'manha')) break
    if (p.bloco === 'noite' && !fecharDia && agora().getHours() < 17) break
    if (!aplicavel(a, d, p)) continue
    if ((d[p.bloco] || {})[p.id] === undefined) return p
  }
  return null
}
export function placar(a: Aluno, k?: string) {
  const d = diaDe(a, k), m = d.manha || {}, n = d.noite || {}; const r: any = {}
  r.treino = n.treinou === 'sim' || n.treinou === 'descanso' || m.treinoHoje === 'descanso' || ((!k || k === hojeISO()) && treinouHoje(a)) ? 1 : (n.treinou === 'nao' ? 0 : null)
  if (a.plano === 'Full Access') { const ig = (a.ingestao || {})[k || hojeISO()]; const mk = metaNutri(a).k; r.comida = ig && ig.k ? (ig.k / mk >= 0.7 && ig.k / mk <= 1.3 ? 1 : 0) : null }
  else r.comida = n.proteina != null ? (n.proteina >= 3 ? 1 : 0) : null
  r.sono = m.sono_h != null ? (m.sono_h >= 7 ? 1 : 0) : null
  r.presenca = (d.manha && d.noite) ? 1 : (d.manha || d.noite ? 0.5 : 0)
  return r
}
export const notaPlacar = (r: any) => ['treino', 'comida', 'sono', 'presenca'].reduce((s, k) => s + (r[k] === 1 ? 1 : r[k] === 0.5 ? 0.5 : 0), 0)
export function gravaDia(a: Aluno, k: string, mut: (d: any) => void) {
  const di = JSON.parse(JSON.stringify(a.diario || {})); const d = di[k] || {}; mut(d); di[k] = d
  const ks = Object.keys(di).sort(); ks.slice(0, Math.max(0, ks.length - 60)).forEach((x) => delete di[x]); return di
}

/* ---------- radar de desistência ---------- */
export function radar(a: Aluno) {
  const r: any[] = []; const s = diasSemTreino(a), c = ciclo(a), cs = consist(a)
  if (s >= 7) r.push({ p: 3, t: `Sem treinar há ${s} dias`, acao: 'Mensagem pessoal hoje e a ficha S de 30 min como volta.' })
  const fs = (a.fechamentos || []).slice().sort((x: any, y: any) => (x.semana < y.semana ? -1 : 1)); const uf = fs[fs.length - 1]
  if (!uf || (Date.now() - +dt(uf.em)) > 13 * DIA) r.push({ p: 2, t: 'Parou de fechar a semana', acao: 'Pergunta direta: o que mudou na tua rotina?' })
  const ks = semanasFechadas(a, 4)
  if (ks.length === 4) { const v = ks.map((k) => Math.min(100, pctSemana(a, k))); const q = (v[2] + v[3]) / 2 - (v[0] + v[1]) / 2; if (q <= -25) r.push({ p: 2, t: `Consistência caiu ${Math.round(-q)} pontos`, acao: 'Refazer a prescrição para caber na rotina de agora.' }) }
  if (uf && uf.nota <= 2 && (Date.now() - +dt(uf.em)) < 10 * DIA) r.push({ p: 2, t: `Nota da semana ${uf.nota}/5`, acao: 'Mostrar o progresso que ela não está vendo: laudo, recordes, medidas.' })
  const fb = a.ultimoFb
  if (fb && (Date.now() - +dt(fb.em)) < 10 * DIA) { if (fb.art === 'dor') r.push({ p: 3, t: 'Dor na articulação relatada', acao: 'Pedir o vídeo e trocar o exercício antes do próximo treino.' }); else if (fb.art === 'incomodo') r.push({ p: 1, t: 'Incômodo articular', acao: 'Ficar de olho na próxima execução.' }) }
  { let n = 0; for (let i = 0; i < 7; i++) { const dd = (a.diario || {})[diaAtras(i)] || {}; if (dd.manha || dd.noite) break; n++ } if (n >= 3) r.push({ p: 2, t: `${n >= 7 ? '7+' : n} dias sem responder o diário`, acao: 'Uma mensagem curta e pessoal, sem cobrança.' }) }
  const sr = a.semanaReal; if (sr && sr.dias <= 2 && sr.semana === semanaISO(agora())) r.push({ p: 1, t: 'Semana apertada (≤ 2 dias)', acao: 'Ficha S e meta ajustada. Elogiar quem aparece na semana ruim.' })
  if (c.renovaEm <= 14 && cs != null && cs < 60) r.push({ p: 2, t: `Renova em ${c.renovaEm} dias com ${cs}% de consistência`, acao: 'Conversa de renovação com o laudo na mão. Oferecer pausa antes de perder.' })
  return { pontos: r.reduce((x, y) => x + y.p, 0), motivos: r }
}
export const noRadar = (al: Aluno[]) => al.filter((a) => (a.renovacao || {}).status !== 'pausa').map((a) => ({ a, r: radar(a) })).filter((x) => x.r.pontos >= 3).sort((x, y) => y.r.pontos - x.r.pontos)
