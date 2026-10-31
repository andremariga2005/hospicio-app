import { useState } from 'react'
import { useAluna } from './ctx'
import { agora, MOD, num, semanaISO } from '../lib/metodo'
import { Chips, Modal } from '../components/ui'
import { concluirTreino } from './Prescricao'

function Semana() {
  const { a, salvar, fechar, toast } = useAluna(); const sr = a.semanaReal || {}
  const [dias, setDias] = useState(sr.dias || a.freq || 3), [min, setMin] = useState(sr.minutos || 45), [obs, setObs] = useState('')
  const ok = () => { salvar({ semanaReal: { dias, minutos: min, obs: obs.slice(0, 240), semana: semanaISO(agora()), em: new Date().toISOString(), ajustado: false } }); fechar(); toast('Avisado. A meta da semana mudou para caber.') }
  return (<>
    <h3>A semana que tu tem</h3><p className="mini">Sem culpa e sem enfeite. O treino se adapta à tua vida — não o contrário.</p>
    <span className="lbl">Dias de treino possíveis</span>
    <div className="stepper"><button onClick={() => setDias(Math.max(1, dias - 1))} aria-label="Menos">−</button><b>{dias}</b><button onClick={() => setDias(Math.min(7, dias + 1))} aria-label="Mais">+</button></div>
    <span className="lbl">Tempo por treino</span><Chips opcoes={[20, 30, 45, 60, 90].map((m) => [m, `${m} min`] as [number, string])} valor={min} onEscolher={setMin} />
    <label className="lbl" htmlFor="obs">O que está acontecendo (opcional)</label><textarea id="obs" rows={2} style={{ width: '100%' }} placeholder="Viagem, plantão, filho doente…" value={obs} onChange={(e) => setObs(e.target.value)} />
    {dias <= 2 && <p className="mini" style={{ marginTop: 8 }}>Com 1 ou 2 dias, a ficha S (30 min) entra no lugar. Feito é melhor que perfeito.</p>}
    <button className="btn" style={{ width: '100%', marginTop: 14 }} onClick={ok}>Avisar o Abel</button>
  </>)
}

function Fechamento() {
  const { a, salvar, fechar, toast } = useAluna()
  const [nota, setNota] = useState(0), [vit, setVit] = useState(''), [atr, setAtr] = useState('')
  const ok = () => { if (!nota) { toast('Dá uma nota de 1 a 5.'); return } const f = { semana: semanaISO(agora()), nota, vitoria: vit.slice(0, 200), atrapalhou: atr.slice(0, 200), em: new Date().toISOString(), lido: false }; salvar({ fechamentos: [...(a.fechamentos || []).filter((x: any) => x.semana !== f.semana), f].slice(-16) }); fechar(); toast('Semana fechada. O Abel lê no fim de semana.') }
  return (<>
    <h3>Fechamento da semana</h3><p className="mini">O Abel lê todos. Sinceridade vale mais que nota alta.</p>
    <span className="lbl">Nota da semana</span><Chips opcoes={[1, 2, 3, 4, 5].map((n) => [n, String(n)] as [number, string])} valor={nota} onEscolher={setNota} />
    <label className="lbl" htmlFor="fv">Uma vitória (qualquer tamanho)</label><input id="fv" style={{ width: '100%' }} value={vit} onChange={(e) => setVit(e.target.value)} placeholder="Treinei mesmo com a semana corrida" />
    <label className="lbl" htmlFor="fa">O que atrapalhou</label><input id="fa" style={{ width: '100%' }} value={atr} onChange={(e) => setAtr(e.target.value)} placeholder="Trabalho, viagem, cansaço…" />
    <button className="btn" style={{ width: '100%', marginTop: 14 }} onClick={ok}>Mandar para o Abel</button>
  </>)
}

function Feedback() {
  const { a, salvar, modal, abrir, toast } = useAluna()
  const [r, setR] = useState<any>({ g: {} })
  const setG = (g: string, campo: string, v: string) => setR({ ...r, g: { ...r.g, [g]: { ...(r.g[g] || {}), [campo]: v } } })
  const ok = () => {
    if (!r.art || modal.grupos.some((g: string) => !r.g[g] || !r.g[g].pump || !r.g[g].esf)) { toast('Responde cada músculo e as articulações.'); return }
    if (r.art === 'dor' && !r.artEx) { toast('Qual exercício doeu?'); return }
    const out = concluirTreino(a, { ...modal, r }, salvar); abrir({ tipo: 'fim', ...out })
  }
  return (<>
    <h3>Como foi?</h3><p className="mini">Por músculo. É isso que sobe ou desce as séries da próxima semana — sem tu precisar pedir.</p>
    {modal.grupos.map((g: string) => (
      <div key={g} style={{ borderTop: '1px solid var(--linha)', paddingTop: 10, marginTop: 10 }}><b style={{ fontWeight: 500 }}>{g}</b>
        <span className="lbl" style={{ marginTop: 6 }}>Sentiu o músculo?</span><Chips opcoes={[['fraca', 'Quase nada'], ['boa', 'Sentiu bem'], ['forte', 'Muito forte']]} valor={r.g[g]?.pump} onEscolher={(v) => setG(g, 'pump', v)} />
        <span className="lbl">Esforço</span><Chips opcoes={[['facil', 'Deu pra mais'], ['certo', 'No ponto'], ['pesado', 'Pesado demais']]} valor={r.g[g]?.esf} onEscolher={(v) => setG(g, 'esf', v)} />
      </div>))}
    <div style={{ borderTop: '1px solid var(--linha)', paddingTop: 10, marginTop: 10 }}><b style={{ fontWeight: 500 }}>Articulações</b>
      <Chips opcoes={[['nada', 'Tudo certo'], ['incomodo', 'Incômodo'], ['dor', 'Doeu']]} valor={r.art} onEscolher={(v) => setR({ ...r, art: v })} />
      {r.art === 'dor' && <><span className="lbl">Em qual exercício?</span><Chips opcoes={modal.res.exs.map((n: string) => [n, n] as [string, string])} valor={r.artEx} onEscolher={(v) => setR({ ...r, artEx: v })} /></>}
    </div>
    <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={ok}>Registrar o treino</button>
  </>)
}

function Fim() {
  const { modal, fechar, ir } = useAluna()
  return (<>
    <div style={{ textAlign: 'center' }}><span className="carimbo bom">Registrado</span><h3 style={{ marginTop: 14 }}>Postura de rei.</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, margin: '16px 0', fontFamily: 'var(--maq)' }}><div><span className="lbl">Tempo</span>{modal.log.duracao} min</div><div><span className="lbl">Séries</span>{modal.log.series}</div><div><span className="lbl">Volume</span>{num(modal.log.volume)} kg</div></div>
      {modal.melhor && <p className="mini">Melhor série: <b style={{ color: 'var(--papel)' }}>{modal.melhor}</b></p>}</div>
    {modal.resumo?.length > 0 && <div className="card" style={{ marginTop: 14 }}><h4>Próxima semana, por músculo</h4>
      {modal.resumo.map((x: any) => <div key={x.g} className="item"><div>{x.g}<small>{x.motivo}</small></div><span className="maq" style={{ color: x.d > 0 ? 'var(--bom)' : x.d < 0 ? 'var(--atencao)' : 'var(--mudo)' }}>{x.d > 0 ? '+' : x.d < 0 ? '−' : ''}{x.d ? Math.abs(x.d) : '='} · {x.total}</span></div>)}</div>}
    <p className="nota-abel" style={{ margin: '14px 0', textAlign: 'center' }}>Mais um na conta da semana. Bá, é assim que se faz.</p>
    <button className="btn" style={{ width: '100%' }} onClick={() => { fechar(); ir('hoje') }}>Voltar</button>
  </>)
}

function Licao() {
  const { modal, fechar } = useAluna(); const l = (MOD().licoes || []).find((x: any) => x.id === modal.id) || { t: '', x: '' }
  return (<><span className="carimbo latao">Escola da ala</span><h3 style={{ marginTop: 12 }}>{l.t}</h3><p style={{ fontSize: 15.5, lineHeight: 1.6, margin: '8px 0 16px' }}>{l.x}</p><p className="nota-abel">— Abel</p><button className="btn" style={{ width: '100%', marginTop: 14 }} onClick={fechar}>Entendi</button></>)
}

export default function Modais() {
  const { modal, fechar } = useAluna()
  if (!modal) return null
  const C: any = { semana: Semana, fechamento: Fechamento, fb: Feedback, fim: Fim, licao: Licao }[modal.tipo]
  if (!C) return null
  return <Modal aberto onFechar={fechar} travado={modal.tipo === 'fb'}><C key={modal.tipo} /></Modal>
}
