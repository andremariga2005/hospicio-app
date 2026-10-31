import { useAluna } from './ctx'
import { medalhas, nivel, NIVEIS, pontos, sequenciaDiario, sequenciaSemanas, XP } from '../lib/jogo'
import { agora, iniciais, num, semanaISO, dt } from '../lib/metodo'

export function NivelCard({ onConquistas }: { onConquistas?: () => void }) {
  const { a, execucoes } = useAluna()
  const p = pontos(a, execucoes), nv = nivel(p.total), ms = medalhas(a, execucoes)
  const ss = sequenciaSemanas(a), sd = sequenciaDiario(a)
  return (
    <div className="card nivel-card">
      <h4>Teu nível <span className="maq" style={{ letterSpacing: 0, textTransform: 'none' }}>{num(p.total)} pts</span></h4>
      <div className="nv"><div className="selo">{nv.n}</div><div><div className="nome">{nv.nome}</div><div className="mini">{nv.frase}</div></div></div>
      <div className="barra"><i style={{ width: `${nv.pct}%` }} /></div>
      <div className="mini">{nv.prox ? `Faltam ${num(nv.falta)} pts para ${nv.prox.nome}` : 'Nível máximo.'}</div>
      <div className="chamas">
        <div><b>{ss}</b><small>{ss === 1 ? 'semana seguida' : 'semanas seguidas'} nos 75%</small></div>
        <div><b>{sd}</b><small>{sd === 1 ? 'dia seguido' : 'dias seguidos'} no diário</small></div>
      </div>
      {onConquistas && <button className="btn sec peq" style={{ marginTop: 12, width: '100%' }} onClick={onConquistas}>Conquistas · {ms.filter((m) => m.ok).length} de {ms.length}</button>}
    </div>
  )
}

export function Conquistas() {
  const { a, execucoes } = useAluna()
  const p = pontos(a, execucoes), nv = nivel(p.total), ms = medalhas(a, execucoes)
  return (
    <div>
      <h3>Conquistas</h3>
      <p className="mini" style={{ marginBottom: 14 }}>Os pontos saem do que tu faz de verdade: treino registrado, diário respondido, semana fechada. Ninguém dá ponto à mão.</p>
      <div className="medalhas">{ms.map((m) => (
        <div key={m.id} className={'medalha' + (m.ok ? ' ok' : '')}>
          <div className="ic">{m.ok ? '★' : `${m.prog}/${m.alvo}`}</div>
          <b>{m.nome}</b><small>{m.como}</small>
        </div>))}</div>
      <h4 className="cond" style={{ fontSize: 12, color: 'var(--suave)', margin: '20px 0 8px' }}>De onde vêm teus {num(p.total)} pontos</h4>
      {Object.entries(p.det).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}><span>{k}</span><span className="maq">{num(v)}</span></div>)}
      <h4 className="cond" style={{ fontSize: 12, color: 'var(--suave)', margin: '20px 0 8px' }}>Quanto vale cada coisa</h4>
      <p className="mini">Treino {XP.treino} · Check-in manhã {XP.manha} · Fechar o dia {XP.noite} · Dia 4/4 +{XP.diaCheio} · Semana nos 75% {XP.semana75} (100%: +{XP.semana100}) · Fechamento {XP.fechamento} · Execução enviada {XP.execucao} (perfeita: +{XP.perfeita}) · Laudo {XP.laudo} · Recorde {XP.recorde} · Lição {XP.licao}</p>
      <h4 className="cond" style={{ fontSize: 12, color: 'var(--suave)', margin: '20px 0 8px' }}>Os níveis</h4>
      {NIVEIS.map((n, i) => <div key={n.nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0', color: i + 1 === nv.n ? 'var(--latao2)' : i + 1 < nv.n ? 'var(--papel)' : 'var(--mudo)' }}><span>{i + 1}. {n.nome}</span><span className="maq">{num(n.min)}</span></div>)}
    </div>
  )
}

/** ranking da semana na ala: treinos postados + coroas recebidas (só primeiro nome, como no resto da ala) */
export function Ranking() {
  const { a, ala } = useAluna()
  const wk = semanaISO(agora()); const m: Record<string, { nome: string; t: number; c: number }> = {}
  ala.filter((p: any) => p.tipo === 'treino' && p.aluno_id && semanaISO(dt(p.em)) === wk).forEach((p: any) => {
    const r = (m[p.aluno_id] = m[p.aluno_id] || { nome: p.nome, t: 0, c: 0 }); r.t++; r.c += (p.reis || []).length
  })
  const lista = Object.entries(m).map(([id, r]) => ({ id, ...r, pts: r.t * XP.treino + r.c * 5 })).sort((x, y) => y.pts - x.pts)
  const minha = lista.findIndex((x) => x.id === a.id)
  return (
    <div className="card ranking">
      <h4>Ranking da semana <span className="mini" style={{ letterSpacing: 0, textTransform: 'none' }}>treinos + coroas</span></h4>
      {lista.slice(0, 5).map((x, i) => <div key={x.id} className={'lin' + (x.id === a.id ? ' eu' : '')}><span className="pos">{i + 1}</span><div className="av" style={{ width: 28, height: 28, fontSize: 10 }}>{iniciais(x.nome)}</div><b>{x.id === a.id ? 'Tu' : x.nome}</b><span>{x.t} treino{x.t > 1 ? 's' : ''} · {x.c} coroa{x.c === 1 ? '' : 's'}</span></div>)}
      {minha >= 5 && <div className="lin eu"><span className="pos">{minha + 1}</span><b>Tu</b><span>{lista[minha].t} treinos</span></div>}
      {!lista.length && <p className="mini">Ninguém treinou ainda esta semana. O primeiro registro abre o ranking.</p>}
      {lista.length > 0 && minha < 0 && <p className="mini" style={{ marginTop: 8 }}>Teu primeiro treino da semana te coloca aqui.</p>}
    </div>
  )
}

/** faixa compacta do nível, para o celular (no computador o cartão completo fica na lateral) */
export function NivelFaixa({ onClick }: { onClick: () => void }) {
  const { a, execucoes } = useAluna()
  const p = pontos(a, execucoes), nv = nivel(p.total), ss = sequenciaSemanas(a)
  return (
    <button className="nivel-faixa" onClick={onClick}>
      <span className="selo">{nv.n}</span>
      <span className="c"><b>{nv.nome}</b><span className="barra"><i style={{ width: `${nv.pct}%` }} /></span></span>
      <span className="maq">{num(p.total)} pts{ss ? ` · ${ss} sem.` : ''}</span>
    </button>
  )
}
