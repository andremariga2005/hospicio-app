// Gamificação do Hospício: pontos, níveis, sequência e medalhas.
// Tudo é calculado a partir do que a aluna já registra — não há ponto "dado" à mão, então não tem como inflar.
import { agora, alvoSemana, chaveDia, DIA, diaDe, dt, feitosSemana, hojeISO, notaPlacar, placar, semanaISO, treinouHoje } from './metodo'

export const XP = { treino: 50, manha: 10, noite: 10, diaCheio: 15, semana75: 100, semana100: 50, fechamento: 20, execucao: 15, perfeita: 25, laudo: 40, recorde: 30, licao: 10 }

export const NIVEIS = [
  { min: 0, nome: 'Triagem', frase: 'Acabou de chegar. Tudo começa aqui.' },
  { min: 250, nome: 'Em observação', frase: 'O Abel já sabe teu nome.' },
  { min: 700, nome: 'Ala comum', frase: 'Rotina instalada. Agora é constância.' },
  { min: 1400, nome: 'Ala VI', frase: 'Treina mesmo quando a semana aperta.' },
  { min: 2400, nome: 'Residência', frase: 'O hospício virou casa.' },
  { min: 3800, nome: 'Postura de rei', frase: 'Exemplo para a ala inteira.' },
  { min: 5600, nome: 'Lenda do Hospício', frase: 'Não tem mais o que provar. Só manter.' },
]

const semanasPassadas = (a: any) => { const cur = semanaISO(agora()); return Object.keys(a.semanas || {}).filter((k) => k < cur).sort() }
const pctW = (a: any, k: string) => feitosSemana(a, k) / Math.max(1, alvoSemana(a, k))

export function pontos(a: any, execucoes: any[] = []) {
  const det: Record<string, number> = {}
  const add = (k: string, v: number) => { det[k] = (det[k] || 0) + v }
  add('Treinos', (a.logs || []).length * XP.treino)
  Object.entries(a.diario || {}).forEach(([k, d]: any) => {
    if (d.manha) add('Diário', XP.manha); if (d.noite) add('Diário', XP.noite)
    if (k < hojeISO() && notaPlacar(placar(a, k)) >= 4) add('Dias completos', XP.diaCheio)
  })
  semanasPassadas(a).forEach((k) => { const p = pctW(a, k); if (p >= 0.75) add('Semanas nos 75%', XP.semana75); if (p >= 1) add('Semanas nos 75%', XP.semana100) })
  add('Fechamentos', (a.fechamentos || []).length * XP.fechamento)
  add('Execuções', execucoes.length * XP.execucao + execucoes.filter((x) => x.veredito === 'perfeita').length * XP.perfeita)
  add('Laudos', (a.laudos || []).length * XP.laudo)
  add('Recordes', Object.keys(a.recordes || {}).length * XP.recorde)
  add('Lições', (a.licoes || []).length * XP.licao)
  const total = Object.values(det).reduce((s, v) => s + v, 0)
  return { total, det }
}

export function nivel(total: number) {
  let i = 0; NIVEIS.forEach((n, j) => { if (total >= n.min) i = j })
  const atual = NIVEIS[i], prox = NIVEIS[i + 1] || null
  const pct = prox ? Math.round(100 * (total - atual.min) / (prox.min - atual.min)) : 100
  return { n: i + 1, ...atual, prox, falta: prox ? prox.min - total : 0, pct }
}

/** semanas seguidas fechando os 75% (a semana atual entra quando já fechou) */
export function sequenciaSemanas(a: any) {
  const ks = semanasPassadas(a); let n = 0
  for (let i = ks.length - 1; i >= 0; i--) { if (pctW(a, ks[i]) >= 0.75) n++; else break }
  const wk = semanaISO(agora()); if (pctW(a, wk) >= 0.75) n++
  return n
}
/** dias seguidos respondendo o diário (hoje ainda pode entrar) */
export function sequenciaDiario(a: any) {
  let n = 0; const hoje = diaDe(a); const comecar = hoje.manha || hoje.noite ? 0 : 1
  for (let i = comecar; i < 60; i++) { const d = diaDe(a, chaveDia(new Date(Date.now() - i * DIA))); if (d.manha || d.noite) n++; else break }
  return n
}

export const MEDALHAS: { id: string; nome: string; como: string; teste: (a: any, ex: any[]) => boolean | [number, number] }[] = [
  { id: 'primeiro', nome: 'Primeiro treino', como: 'Registrar o primeiro treino no app', teste: (a) => [(a.logs || []).length, 1] },
  { id: 'dez', nome: '10 treinos', como: 'Somar 10 treinos registrados', teste: (a) => [(a.logs || []).length, 10] },
  { id: 'cinquenta', nome: '50 treinos', como: 'Somar 50 treinos registrados', teste: (a) => [(a.logs || []).length, 50] },
  { id: 'semana', nome: 'Semana fechada', como: 'Fechar os 75% de uma semana', teste: (a) => [[...semanasPassadas(a), semanaISO(agora())].filter((k) => pctW(a, k) >= 0.75).length, 1] },
  { id: 'quatro', nome: '4 semanas seguidas', como: 'Fechar os 75% por 4 semanas seguidas', teste: (a) => [sequenciaSemanas(a), 4] },
  { id: 'ciclo', nome: 'Ciclo completo', como: 'Fechar os 75% nas 8 semanas de um ciclo', teste: (a) => [sequenciaSemanas(a), 8] },
  { id: 'diario7', nome: 'Diário em dia', como: 'Responder o diário 7 dias seguidos', teste: (a) => [sequenciaDiario(a), 7] },
  { id: 'dia4', nome: 'Dia perfeito', como: 'Fechar um dia com placar 4/4', teste: (a) => Object.keys(a.diario || {}).some((k) => notaPlacar(placar(a, k)) >= 4) },
  { id: 'sono', nome: 'Sono de atleta', como: '7 h ou mais de sono por 7 noites seguidas', teste: (a) => { let n = 0, mx = 0; Object.keys(a.diario || {}).sort().forEach((k) => { const s = (diaDe(a, k).manha || {}).sono_h; if (s >= 7) { n++; mx = Math.max(mx, n) } else if (s != null) n = 0 }); return [mx, 7] } },
  { id: 'recorde', nome: 'Recorde pessoal', como: 'Bater um recorde de carga', teste: (a) => [Object.keys(a.recordes || {}).length, 1] },
  { id: 'execucao', nome: 'Na frente do Abel', como: 'Mandar uma execução para correção', teste: (_a, ex) => [ex.length, 1] },
  { id: 'perfeita', nome: 'Execução perfeita', como: 'Receber o veredito "perfeita"', teste: (a, ex) => ex.some((x) => x.veredito === 'perfeita') || a.ultimoVeredito?.veredito === 'perfeita' },
  { id: 'laudo', nome: 'Laudo na mão', como: 'Entregar as fotos do laudo de 4 semanas', teste: (a) => [(a.laudos || []).length, 2] },
  { id: 'fechamento', nome: 'Palavra dada', como: 'Fazer 4 fechamentos de semana', teste: (a) => [(a.fechamentos || []).length, 4] },
  { id: 'escola', nome: 'Escola da ala', como: 'Concluir as 8 lições do ciclo', teste: (a) => [(a.licoes || []).length, 8] },
]

export function medalhas(a: any, ex: any[] = []) {
  return MEDALHAS.map((m) => {
    const r = m.teste(a, ex)
    if (Array.isArray(r)) return { ...m, ok: r[0] >= r[1], prog: Math.min(r[0], r[1]), alvo: r[1] }
    return { ...m, ok: !!r, prog: r ? 1 : 0, alvo: 1 }
  })
}

/** missões de hoje, na ordem em que fazem sentido */
export function missoes(a: any, nomeIA: string) {
  const d = diaDe(a), h = agora().getHours(), fa = a.plano === 'Full Access'
  const m = d.manha || {}, treinou = treinouHoje(a), semTreino = m.treinoHoje === 'nao' || m.treinoHoje === 'descanso'
  const lista: { id: string; t: string; s: string; xp: number; ok: boolean; acao: string }[] = [
    { id: 'manha', t: `Check-in da manhã com ${nomeIA || 'a assistente'}`, s: 'Sono, energia e dor: define a dose do treino de hoje', xp: XP.manha, ok: !!d.flags?.manha, acao: 'assistente' },
    { id: 'treino', t: semTreino && !treinou ? (m.treinoHoje === 'descanso' ? 'Descanso planejado' : 'Treino de hoje fica para outro dia') : 'Treinar', s: semTreino && !treinou ? 'Avisado no check-in. Conta a favor, não contra.' : 'Abrir a ficha e registrar as séries', xp: XP.treino, ok: treinou || m.treinoHoje === 'descanso', acao: semTreino ? '' : 'treinar' },
  ]
  if (fa) { const ig = (a.ingestao || {})[hojeISO()]; lista.push({ id: 'comida', t: 'Marcar as refeições', s: 'O que comeu de verdade ajusta a dieta da semana', xp: 0, ok: !!(ig && ig.k), acao: 'rotina' }) }
  lista.push({ id: 'noite', t: 'Fechar o dia', s: h < 17 ? 'Libera às 17 h: treino, comida e o que atrapalhou' : 'Três perguntas e o placar do dia fecha', xp: XP.noite, ok: !!d.flags?.noite, acao: 'assistente-noite' })
  return lista
}

void dt
