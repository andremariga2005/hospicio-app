// Abertura do dia: a assistente fala com a aluna em tela cheia, uma pergunta por vez,
// e entrega o plano do dia no fim. À noite, a mesma tela fecha o dia.
import { useState } from 'react'
import { useAluna } from './ctx'
import { useConversa } from './Assistente'
import {
  agora, alvoSemana, aplicavel, blocoCompleto, dataLonga, diaDe, doseDe, feitosSemana, fichaPorId, iniciais, notaPlacar, placar,
  PERGUNTAS, primeiro, prontidaoHoje, proximaFicha, proximaPergunta, semanaISO, treinouHoje,
} from '../lib/metodo'
import { Chips } from '../components/ui'

const SUGESTOES = ['Nina', 'Bia', 'Vera', 'Lola', 'Tina', 'Duda']

export const chaveAbertura = (bloco: string) => `hosp_abertura_${new Date().toDateString()}_${bloco}`
export function blocoDaVez(a: any): 'manha' | 'noite' | null {
  const d = diaDe(a), h = agora().getHours()
  if (!a.assistente?.nome) return 'manha'
  if (h < 17) return d.flags?.manha ? null : 'manha'
  return d.flags?.noite ? null : 'noite'
}

export default function Abertura({ noite, onFechar }: { noite: boolean; onFechar: () => void }) {
  const { a, treinar } = useAluna()
  const conv = useConversa()
  const [peso, setPeso] = useState(''); const [nomeNovo, setNomeNovo] = useState(''); const [livre, setLivre] = useState(''); const [escrever, setEscrever] = useState(false)
  const nome = a.assistente?.nome || ''
  const d = diaDe(a); const p = nome ? proximaPergunta(a, noite) : null
  const bloco = noite ? 'noite' : 'manha'
  const doBloco = PERGUNTAS.filter((x) => (x.bloco === bloco || (noite && x.bloco === 'manha' && !blocoCompleto(a, d, 'manha'))) && aplicavel(a, d, x))
  const feitas = doBloco.filter((x) => (d[x.bloco] || {})[x.id] !== undefined).length
  const ultimaIA = [...(d.msgs || [])].reverse().find((m: any) => m.de === 'ia')
  const pular = () => { try { localStorage.setItem(chaveAbertura(bloco), '1') } catch { /* sem armazenamento */ } onFechar() }

  const wk = semanaISO(agora()); const alvo = alvoSemana(a, wk), feitos = feitosSemana(a, wk), falta = Math.max(0, Math.ceil(alvo * 0.75) - feitos)
  const sr = a.semanaReal && a.semanaReal.semana === wk ? a.semanaReal : null
  const f = sr && sr.dias <= 2 ? fichaPorId('S') : proximaFicha(a); const dose = doseDe(prontidaoHoje(a))
  const m = d.manha || {}; const semTreino = m.treinoHoje === 'nao' || m.treinoHoje === 'descanso'

  let corpo: any
  if (!nome) {
    corpo = (<>
      <p className="ab-fala">Oi, {primeiro(a.nome)}. Eu vou conversar contigo todo dia: umas perguntas rápidas de manhã e de noite, e eu levo tudo pro Abel.</p>
      <h2 className="ab-pergunta">Antes de tudo: como tu quer me chamar?</h2>
      <Chips opcoes={SUGESTOES.map((n) => [n, n] as [string, string])} onEscolher={(v) => conv.salvarNome(v)} />
      <form className="ab-linha" onSubmit={(e) => { e.preventDefault(); conv.salvarNome(nomeNovo) }}>
        <input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} maxLength={20} placeholder="Ou escreve o nome que tu quiser" />
        <button className="btn" type="submit">Pronto</button>
      </form>
    </>)
  } else if (conv.pensando) {
    corpo = <p className="ab-fala ab-pensando">{nome} está pensando…</p>
  } else if (p) {
    corpo = (<>
      {ultimaIA && feitas === 0 && <p className="ab-fala">{ultimaIA.t}</p>}
      <div className="ab-prog" aria-label={`Pergunta ${feitas + 1} de ${doBloco.length}`}>{doBloco.map((x, i) => <i key={x.id} className={i < feitas ? 'ok' : i === feitas ? 'ag' : ''} />)}</div>
      <h2 className="ab-pergunta">{p.q.replace(/^Bom dia\. /, '').replace(/^\w/, (c: string) => c.toUpperCase())}</h2>
      {p.input ? (
        <form className="ab-linha" onSubmit={(e) => { e.preventDefault(); if (peso) { conv.responder(p, peso, peso + ' kg'); setPeso('') } }}>
          <input value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" placeholder="kg" style={{ maxWidth: 140 }} autoFocus />
          <button className="btn" type="submit">Registrar</button>
          <button className="btn sec" type="button" onClick={() => conv.responder(p, null, 'Hoje não')}>Pular</button>
        </form>
      ) : <Chips opcoes={p.chips} onEscolher={(v, t) => conv.responder(p, v, t)} />}
      <p className="ab-por">Por que eu pergunto: {p.por}</p>
      {escrever ? (
        <form className="ab-linha" onSubmit={(e) => { e.preventDefault(); const t = livre; setLivre(''); setEscrever(false); conv.enviarLivre(t) }}>
          <input value={livre} onChange={(e) => setLivre(e.target.value)} placeholder="“dormi 6h, joelho doendo, sem tempo hoje”" autoFocus />
          <button className="btn" type="submit">Enviar</button>
        </form>
      ) : <button className="ab-link" onClick={() => setEscrever(true)}>Prefiro escrever do meu jeito</button>}
    </>)
  } else if (noite || (d.flags?.noite)) {
    const pl = notaPlacar(placar(a))
    corpo = (<>
      {ultimaIA && <p className="ab-fala">{ultimaIA.t}</p>}
      <div className="ab-plano">
        <div className="k">Placar de hoje</div><div className="grande">{pl}/4</div>
        <p>Treino, comida, sono e diário. {pl >= 4 ? 'Dia completo.' : 'Amanhã a gente busca o resto.'}</p>
      </div>
      <button className="btn ab-cta" onClick={onFechar}>Boa noite</button>
    </>)
  } else {
    corpo = (<>
      {ultimaIA && <p className="ab-fala">{ultimaIA.t}</p>}
      <div className="ab-plano">
        <div className="k">O plano de hoje</div>
        <div className="item"><b>{semTreino && !treinouHoje(a) ? (m.treinoHoje === 'descanso' ? 'Descanso planejado' : 'Sem treino hoje') : `Treino: ficha ${f.id}`}</b><span>{semTreino ? 'Avisado. Conta a favor, não contra.' : `${f.nome} · ~${f.tempo} min`}</span></div>
        {dose && !semTreino && <div className="item"><b>{dose.t}</b><span>{dose.x}</span></div>}
        <div className="item"><b>Semana: {feitos} de {alvo}</b><span>{falta ? `Faltam ${falta} para os 75%.` : 'Os 75% da semana já estão fechados.'}</span></div>
        <div className="item"><b>À noite</b><span>{nome} volta para fechar o dia. Três perguntas.</span></div>
      </div>
      {!semTreino && !treinouHoje(a) && <button className="btn ab-cta" onClick={() => { onFechar(); treinar(f.id) }}>Treinar agora</button>}
      <button className={'btn ab-cta' + (!semTreino && !treinouHoje(a) ? ' sec' : '')} onClick={onFechar}>Ir para o meu dia</button>
    </>)
  }

  return (
    <div className="abertura" role="dialog" aria-label={noite ? 'Fechar o dia' : 'Abertura do dia'}>
      <div className="ab-topo">
        <div className="ab-quem"><span className="av">{iniciais(nome || '?')}</span><div><b>{nome || 'Tua assistente'}</b><small>{dataLonga(agora())}</small></div></div>
        <button className="ab-link" onClick={pular}>{p || !nome ? 'Agora não' : 'Fechar'}</button>
      </div>
      <div className="ab-miolo">
        {nome && p && feitas === 0 && !conv.pensando && <div className="ab-saud">{noite ? `Boa noite, ${primeiro(a.nome)}.` : agora().getHours() < 12 ? `Bom dia, ${primeiro(a.nome)}.` : `Oi, ${primeiro(a.nome)}.`}</div>}
        {corpo}
      </div>
    </div>
  )
}
