import { useEffect, useRef, useState } from 'react'
import { useAluna } from './ctx'
import {
  agora, alvoSemana, aplicavel, blocoCompleto, diaDe, doseDe, feitosSemana, gravaDia, hojeISO,
  iniciais, notaPlacar, numBR, PERGUNTAS, placar, primeiro, prontidaoHoje, proximaFicha, proximaPergunta,
  semanaISO, treinouHoje,
} from '../lib/metodo'
import { livreIA, reacaoIA, iaDisponivel } from '../lib/ia'
import { Chips } from '../components/ui'

const SUGESTOES = ['Nina', 'Bia', 'Vera', 'Lola', 'Tina', 'Duda']

function falaPronta(a: any, bloco: string) {
  const d = diaDe(a), m = d.manha || {}, n = d.noite || {}; const dose = doseDe(prontidaoHoje(a)); const wk = semanaISO(agora())
  const falta = Math.max(0, Math.ceil(alvoSemana(a, wk) * 0.75) - feitosSemana(a, wk)); const f = proximaFicha(a)
  if (bloco === 'manha') {
    if (m.dor === 'articular') return `Dor no ${String(m.dorOnde || 'lugar').toLowerCase()} não se negocia: hoje é dose leve e troca o exercício que dói pela opção da lista. Grava a execução e me manda.`
    if (m.treinoHoje === 'nao') return falta > 0 ? `Sem problema, a semana ainda dá: faltam ${falta} para os 75%. Se sobrar meia hora, a ficha S resolve.` : 'Semana já fechada nos 75%. Descansa sem culpa.'
    if (dose && dose.k === 'minima') return 'Noite ruim, dose mínima: duas séries por exercício e vai embora. Feito conta mais que perfeito.'
    return `Corpo pronto, dose cheia. Hoje é a ficha ${f.id}: ${f.nome.toLowerCase()}. Postura de rei.`
  }
  if (n.treinou === 'sim') return `Bá, mais um na conta. ${falta > 1 ? `Faltam ${falta - 1} pros 75% da semana.` : 'Semana encaminhada.'} Agora dorme cedo, que músculo cresce no descanso.`
  if (n.motivo === 'dor') return 'Dor não é preguiça. Me manda onde dói e qual exercício, que eu troco antes do próximo treino.'
  if (n.motivo === 'tempo') return 'Faltou tempo, acontece. Amanhã a ficha S cabe em 30 minutos — escolhe agora o horário.'
  if (n.treinou === 'nao') return 'Dia que não deu, deu. Amanhã é outro: deixa a roupa de treino separada hoje.'
  return 'Dia registrado. Amanhã a gente continua.'
}

function Bolha({ de, t }: { de: string; t: string }) {
  const eu = de === 'eu'
  return (
    <div style={{ display: 'flex', justifyContent: eu ? 'flex-end' : 'flex-start', margin: '6px 0' }}>
      <div style={{ maxWidth: '85%', padding: '9px 12px', borderRadius: 14, fontSize: 14, lineHeight: 1.45, ...(eu ? { background: 'var(--latao)', color: 'var(--noite)', borderBottomRightRadius: 4 } : { background: '#ffffff0d', border: '1px solid var(--linha)', borderBottomLeftRadius: 4 }) }}>{t}</div>
    </div>
  )
}

export function useConversa() {
  const { a, salvar } = useAluna()
  const k = hojeISO()
  const [pensando, setPensando] = useState(false)

  /* fecha um bloco: manhã vira prontidão (dose do dia); cada bloco recebe a fala da assistente */
  async function aposResponder(novo: any) {
    const d = diaDe(novo); const m = d.manha || {}
    let bloco: string | null = null; const patch: any = {}
    if (blocoCompleto(novo, d, 'manha') && !(d.flags && d.flags.manha)) {
      bloco = 'manha'
      const sono5 = m.sono_q || (m.sono_h >= 7.5 ? 4 : m.sono_h >= 6.5 ? 3 : 2)
      patch.prontidao = { data: k, sono: sono5, energia: m.energia || 3, dor: m.dor || 'nenhuma', ciclo: m.ciclo || 'na', em: new Date().toISOString() }
      if (m.dor === 'articular') patch.ultimoFb = { art: 'dor', ex: m.dorOnde || '', em: patch.prontidao.em }
    } else if (blocoCompleto(novo, d, 'noite') && !(d.flags && d.flags.noite)) bloco = 'noite'
    if (!bloco) return
    patch.diario = gravaDia(novo, k, (x) => { x.flags = { ...(x.flags || {}), [bloco!]: true } })
    const comPatch = { ...novo, ...patch }
    salvar(patch)
    setPensando(true)
    const texto = (await reacaoIA(comPatch, bloco)) || falaPronta(comPatch, bloco)
    setPensando(false)
    salvar({ diario: gravaDia(comPatch, k, (x) => { x.msgs = [...(x.msgs || []), { de: 'ia', t: texto }] }) })
  }

  function responder(p: any, valor: any, rotulo: string) {
    const em = new Date().toISOString(); const patch: any = {}
    patch.diario = gravaDia(a, k, (d) => {
      d[p.bloco] = { ...(d[p.bloco] || {}), [p.id]: valor, em }
      d.msgs = [...(d.msgs || []), { de: 'ia', t: p.q }, { de: 'eu', t: String(rotulo) }]
      if (p.bloco === 'noite' && d.noite.treinou === undefined && treinouHoje(a)) d.noite.treinou = 'sim'
    })
    if (p.id === 'peso' && valor != null) { const v = numBR(valor); if (v > 25 && v < 300) patch.peso = [...(a.peso || []).filter((x: any) => x.data !== k), { data: k, kg: Math.round(v * 10) / 10 }].sort((x: any, y: any) => (x.data < y.data ? -1 : 1)) }
    salvar(patch)
    aposResponder({ ...a, ...patch })
  }

  async function enviarLivre(t0: string) {
    const t = t0.trim(); if (!t) return
    let atual = { ...a, diario: gravaDia(a, k, (x) => { x.msgs = [...(x.msgs || []), { de: 'eu', t: t.slice(0, 600) }] }) }
    salvar({ diario: atual.diario }); setPensando(true)
    const campos = PERGUNTAS.filter((p) => aplicavel(atual, diaDe(atual), p)).map((p) => `${p.bloco}.${p.id}: ${p.input ? 'número em kg' : p.chips.map((c: any) => JSON.stringify(c[0])).join(' | ')}`).join('\n')
    const hist = (diaDe(atual).msgs || []).slice(-8).map((m: any) => `${m.de === 'eu' ? 'Aluna' : 'Assistente'}: ${m.t}`).join('\n')
    const r = await livreIA(atual, t, campos, hist)
    setPensando(false)
    const extra: any = {}
    const diario = gravaDia(atual, k, (x) => {
      const dados = r?.dados
      if (dados) ['manha', 'noite'].forEach((b) => {
        const src = dados[b]; if (!src || typeof src !== 'object') return
        PERGUNTAS.filter((p) => p.bloco === b).forEach((p) => {
          if (src[p.id] === undefined || src[p.id] === null) return; let v = src[p.id]
          if (p.chips) { const ok = p.chips.find((c: any) => String(c[0]) === String(v)); if (!ok) return; v = ok[0] }
          else { v = numBR(v); if (!(v > 25 && v < 300)) return; extra.peso = [...(atual.peso || []).filter((z: any) => z.data !== k), { data: k, kg: Math.round(v * 10) / 10 }].sort((m: any, n: any) => (m.data < n.data ? -1 : 1)) }
          x[b] = { ...(x[b] || {}), [p.id]: v, em: new Date().toISOString() }
        })
      })
      x.msgs = [...(x.msgs || []), { de: 'ia', t: r?.resposta || 'Anotei. As perguntas rápidas abaixo deixam o teu dia registrado certinho.' }]
    })
    atual = { ...atual, ...extra, diario }
    salvar({ ...extra, diario }); aposResponder(atual)
  }

  function salvarNome(n: string) {
    const limpo = String(n || '').replace(/[<>"'`{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20); if (!limpo) return
    salvar({ assistente: { nome: limpo, em: new Date().toISOString() }, diario: gravaDia(a, k, (d) => { d.msgs = [...(d.msgs || []), { de: 'eu', t: limpo }, { de: 'ia', t: `Fechado: a partir de agora, ${limpo}. Duas conversas rápidas por dia, de manhã e de noite, e eu levo tudo pro Abel. Bora?` }] }) })
  }

  return { pensando, responder, enviarLivre, salvarNome }
}

export function Assistente({ noite = false, painel = false, onNomeado }: { noite?: boolean; painel?: boolean; onNomeado?: () => void }) {
  const { a } = useAluna()
  const [fecharDia, setFecharDia] = useState(noite)
  const fim = useRef<HTMLDivElement>(null)
  const nome = a.assistente?.nome || ''
  const [renomear, setRenomear] = useState(false)
  const [txt, setTxt] = useState(''); const [peso, setPeso] = useState(''); const [nomeNovo, setNomeNovo] = useState('')
  const conv = useConversa(); const pensando = conv.pensando
  const responder = (p: any, v: any, r: string) => { conv.responder(p, v, r); setPeso('') }
  const enviarLivre = (e: any) => { e.preventDefault(); const t = txt; setTxt(''); conv.enviarLivre(t) }
  const salvarNome = (n: string) => { conv.salvarNome(n); setRenomear(false); setNomeNovo(''); onNomeado?.() }
  useEffect(() => { if (painel) fim.current?.scrollIntoView({ block: 'end' }) }, [painel, a.diario, pensando])

  if (!nome || renomear) return (
    <div className="card" style={{ borderColor: 'var(--latao3)' }}>
      <h4>{nome ? 'Mudar o nome' : 'Tua assistente'}</h4>
      <Bolha de="ia" t={nome ? `Hoje meu nome é ${nome}. Como tu quer me chamar a partir de agora?` : `Oi, ${primeiro(a.nome)}. Eu vou conversar contigo todo dia: umas perguntas rápidas de manhã e de noite, e eu levo tudo pro Abel. Antes de tudo: como tu quer me chamar?`} />
      <Chips opcoes={SUGESTOES.map((n) => [n, n] as [string, string])} onEscolher={(v) => salvarNome(v)} estilo={{ margin: '6px 0 0' }} />
      <form style={{ display: 'flex', gap: 8, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); salvarNome(nomeNovo) }}>
        <input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} maxLength={20} placeholder="Ou escreve o nome que tu quiser" style={{ flex: 1, minWidth: 0 }} />
        <button className="btn peq" type="submit">Pronto</button>
      </form>
      {nome && <button className="btn sec peq" style={{ marginTop: 10 }} onClick={() => setRenomear(false)}>Deixa como está</button>}
    </div>
  )

  const d = diaDe(a); const msgs = (d.msgs || []).slice(painel ? -40 : -6); const p = proximaPergunta(a, fecharDia)
  const manhaOk = blocoCompleto(a, d, 'manha'), noiteOk = blocoCompleto(a, d, 'noite')
  return (
    <div className={painel ? 'ia-corpo' : 'card'} style={painel ? undefined : { borderColor: 'var(--latao3)' }}>
      <h4 className={painel ? 'ia-cab' : undefined}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="av" style={{ width: 26, height: 26, fontSize: 10 }}>{iniciais(nome)}</span>{nome}</span>
        <button className="mini" style={{ textTransform: 'none', letterSpacing: 0 }} onClick={() => setRenomear(true)}>{iaDisponivel ? 'responde com IA' : 'modo rápido'} · mudar nome</button>
      </h4>
      {msgs.map((m: any, i: number) => <Bolha key={i} de={m.de} t={m.t} />)}
      {pensando ? <Bolha de="ia" t="Pensando…" /> : p ? (
        <>
          <Bolha de="ia" t={p.q} />
          {p.input ? (
            <form style={{ display: 'flex', gap: 8, marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); if (peso) responder(p, peso, peso + ' kg') }}>
              <input value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" placeholder="kg" style={{ width: 110 }} />
              <button className="btn peq" type="submit">Registrar</button>
              <button className="btn sec peq" type="button" onClick={() => responder(p, null, 'Hoje não')}>Pular</button>
            </form>
          ) : <Chips opcoes={p.chips} onEscolher={(v, t) => responder(p, v, t)} estilo={{ margin: '6px 0 0' }} />}
          <p className="mini" style={{ fontSize: 11.5, marginTop: 6 }}>Por que eu pergunto: {p.por}</p>
        </>
      ) : manhaOk && !noiteOk ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}><span className="mini">Manhã registrada. Volto à noite para fechar o dia.</span><button className="btn sec peq" onClick={() => setFecharDia(true)}>Fechar o dia agora</button></div>
      ) : noiteOk ? <p className="mini" style={{ marginTop: 8 }}>Dia fechado. Placar de hoje: <b style={{ color: 'var(--papel)' }}>{notaPlacar(placar(a))}/4</b>.</p> : null}
      <form style={{ display: 'flex', gap: 8, marginTop: 10 }} onSubmit={enviarLivre}>
        <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ou escreve do teu jeito: “dormi 6h, joelho doendo”" style={{ flex: 1, minWidth: 0 }} />
        <button className="btn peq" type="submit">Enviar</button>
      </form>
      <div ref={fim} />
    </div>
  )
}


/* botão no canto + painel da conversa: aparece depois que a aluna escolheu o nome da assistente */
export function AssistenteFlutuante({ aberto, noite, onAbrir, onFechar }: { aberto: boolean; noite: boolean; onAbrir: () => void; onFechar: () => void }) {
  const { a } = useAluna()
  const nome = a.assistente?.nome
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc)
  }, [aberto, onFechar])
  if (!nome) return null
  const pendente = !!proximaPergunta(a, false)
  return (
    <>
      {!aberto && (
        <button className="ia-fab" onClick={onAbrir} aria-label={`Abrir conversa com ${nome}`}>
          <span className="av">{iniciais(nome)}</span>
          <span className="ia-fab-txt"><b>{nome}</b><small>{pendente ? 'tem pergunta pra ti' : 'conversar'}</small></span>
          {pendente && <span className="ia-ponto" aria-hidden="true" />}
        </button>
      )}
      {aberto && (
        <div className="ia-fundo" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
          <div className="ia-painel" role="dialog" aria-label={`Conversa com ${nome}`}>
            <button className="ia-fechar" onClick={onFechar} aria-label="Minimizar">—</button>
            <Assistente painel noite={noite} />
          </div>
        </div>
      )}
    </>
  )
}
