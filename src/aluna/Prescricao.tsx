import { useEffect, useRef, useState } from 'react'
import { useAluna } from './ctx'
import {
  agora, baseGrupo, calcGrupo, ciclo, DESCARGA, doseDe, fichaPorId, fmtKg, grupoDe, GRUPOS, ha, metaHoje, MOD, num, primeiro,
  prontidaoHoje, semanaISO, seriesNoDia, subsDe, volAtivo,
} from '../lib/metodo'
import { enviarExecucao, postarAla } from '../lib/dados'
import { Icone, Tag, Veredito } from '../components/ui'

function CardVolume({ a }: { a: any }) {
  const c = ciclo(a), vg = volAtivo(a)
  const linhas = GRUPOS.map((g) => ({ g, b: baseGrupo(g), d: (vg[g] || {}).delta || 0, u: (vg[g] || {}).ult })).filter((x) => x.b)
  const mx = Math.max(...linhas.map((x) => x.b + Math.max(0, x.d)))
  return (
    <div className="card">
      <h4>Volume por músculo <span className="maq" style={{ letterSpacing: 0, textTransform: 'none' }}>semana {c.semana} de 8</span></h4>
      <p className="mini" style={{ marginBottom: 10 }}>{c.semana === DESCARGA ? <><b style={{ color: 'var(--atencao)' }}>Semana de descarga:</b> metade das séries. O corpo consolida o que construiu no ciclo.</> : 'Séries por semana em cada músculo. Sobe ou desce a cada treino, pelo que tu responde no fim. Na semana 8, descarga.'}</p>
      {linhas.map((x) => { const cur = Math.max(1, x.b + x.d); return (
        <div key={x.g} style={{ margin: '9px 0' }} title={x.u ? x.u.motivo : 'Ainda sem ajuste neste ciclo'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{x.g}</span><span className="maq">{cur} séries {x.d ? <b style={{ color: x.d > 0 ? 'var(--bom)' : 'var(--atencao)' }}>{x.d > 0 ? '+' : '−'}{Math.abs(x.d)}</b> : <span className="mudo">=</span>}</span></div>
          <div style={{ position: 'relative', height: 8, borderRadius: 99, background: '#ffffff10', marginTop: 4 }}>
            <i style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${100 * cur / mx}%`, background: x.d > 0 ? 'var(--latao)' : x.d < 0 ? '#7a5d33' : '#5b4f3b', borderRadius: 99 }} />
            <i style={{ position: 'absolute', top: -3, bottom: -3, left: `${100 * x.b / mx}%`, width: 1.5, background: 'var(--papel2)' }} />
          </div>
          {x.u && x.d !== 0 && <div className="mini" style={{ fontSize: 11.5, marginTop: 3 }}>{x.u.motivo}</div>}
        </div>) })}
      <p className="mini" style={{ marginTop: 8 }}>O traço claro marca o volume com que o ciclo começou.</p>
    </div>
  )
}

export default function Prescricao() {
  const { a, execucoes, treinar } = useAluna()
  const ultima = (id: string) => { const l = (a.logs || []).filter((x: any) => x.ficha === id).pop(); return l ? ha(l.data) : 'ainda não feita' }
  return (
    <div className="app-conteudo">
      <div className="coluna">
        <div className="saud"><div className="data">Ciclo {ciclo(a).n} · {a.nivel || ''} · {a.freq}x por semana</div><h1>Prescrição</h1><p className="mini">{a.objetivo || ''}</p></div>
        {MOD().fichas.map((f: any) => { const n = f.exercicios.reduce((s: number, e: any) => s + seriesNoDia(a, f, e), 0); return (
          <div key={f.id} className={`ficha-c f${f.id}`}><div className="letra">{f.id}</div><div className="sel">{f.id}</div><h3>{f.nome}</h3>
            <div className="meta">{n} séries válidas · ~{f.tempo} min · {ultima(f.id)}</div>
            <button className="btn" onClick={() => treinar(f.id)}>Treinar agora »</button></div>) })}
      </div>
      <div className="coluna-lado">
        <CardVolume a={a} />
        <div className="card"><h4>Execuções mandadas ao Abel</h4>
          {execucoes.length ? execucoes.slice(0, 5).map((x) => (
            <div key={x.id} className="item"><div>{x.exercicio}<small>{ha(x.enviado_em)}{x.status === 'respondido' ? ' · respondido' : ''}</small></div>
              {x.status === 'respondido' ? <Veredito v={x.veredito} peq /> : <Tag k="atencao">Em até 24 h</Tag>}</div>
          )) : <p className="mini">Grava a execução durante o treino e manda. A resposta chega em até 24 horas.</p>}
        </div>
      </div>
    </div>
  )
}

const REC: [string, string][] = [['dolorida', 'Ainda dolorido'], ['tempo', 'Recuperou no tempo'], ['nem', 'Nem senti'], ['primeira', 'Primeira vez']]
const fmtDur = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` }
const kgNum = (v: any) => parseFloat(String(v).replace(',', '.')) || 0

export function Sessao({ fichaId, onSair }: { fichaId: string; onSair: () => void }) {
  const { a, abrir, toast, recarregarExecucoes } = useAluna()
  const f = fichaPorId(fichaId); const c = ciclo(a); const d = doseDe(prontidaoHoje(a))
  const ini = useRef(Date.now()); const [, setTick] = useState(0)
  const [publicar, setPublicar] = useState(true); const [rec, setRec] = useState<any>({}); const [confirmaSair, setConfirmaSair] = useState(false)
  const [ex, setEx] = useState<any[]>(() => f.exercicios.map((e: any) => ({
    nome: e.nome, original: e.nome, reps: e.reps, rpe: e.rpe, nota: e.nota, troca: false,
    series: Array.from({ length: seriesNoDia(a, f, e) }, (_, i) => { const ant = ((a.cargas || {})[e.nome] || [])[i]; return { kg: '', reps: '', rpe: '', feita: false, ant: ant ? `${fmtKg(ant.kg)} kg × ${ant.reps}` : '—' } }),
  })))
  const arquivo = useRef<HTMLInputElement>(null); const [enviandoEx, setEnviandoEx] = useState<number | null>(null)
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t) }, [])

  const tot = ex.reduce((acc, x) => { x.series.forEach((s: any) => { if (s.feita) { acc.n++; acc.v += kgNum(s.kg) * (parseInt(s.reps) || 0) } }); return acc }, { n: 0, v: 0 })
  const muda = (ei: number, fn: (x: any) => void) => setEx((l) => l.map((x, i) => { if (i !== ei) return x; const c2 = { ...x, series: x.series.map((s: any) => ({ ...s })) }; fn(c2); return c2 }))
  const marca = (ei: number, si: number) => muda(ei, (x) => {
    const s = x.series[si]; s.feita = !s.feita
    if (s.feita && !s.kg) { const m = metaHoje(a, x.nome, x.reps); if (m) { s.kg = String(m.kg); s.reps = String(m.reps) } else if (s.ant !== '—') { const mm = s.ant.match(/([\d.,]+) kg × (\d+)/); if (mm) { s.kg = mm[1].replace(',', '.'); s.reps = mm[2] } } }
  })
  const trocar = (ei: number, nome: string) => muda(ei, (x) => { x.nome = nome; x.troca = false; x.series.forEach((s: any, i: number) => { const ant = ((a.cargas || {})[nome] || [])[i]; s.ant = ant ? `${fmtKg(ant.kg)} kg × ${ant.reps}` : '—' }) })

  async function aoEscolherArquivo(e: any) {
    const fl = e.target.files?.[0]; e.target.value = ''; if (!fl || enviandoEx == null) return
    const nome = ex[enviandoEx].nome
    if (fl.size > 200 * 1024 * 1024) { toast('Vídeo muito grande. Corta só a série e manda de novo.'); return }
    toast('Enviando o vídeo…')
    try { await enviarExecucao(a, nome, fl); toast('Execução mandada. O Abel responde em até 24 h.'); recarregarExecucoes() }
    catch { toast('Não consegui enviar o vídeo. Tenta de novo com internet boa.') }
    setEnviandoEx(null)
  }

  function sair() { if (tot.n && !confirmaSair) { setConfirmaSair(true); toast('Tem série marcada. Toca de novo para sair sem registrar.'); setTimeout(() => setConfirmaSair(false), 3000); return } onSair() }
  function terminar() {
    if (!tot.n) { toast('Marca pelo menos uma série feita.'); return }
    const dur = Math.max(1, Math.round((Date.now() - ini.current) / 6e4))
    const cargas: any = {}; let melhor = '', melhorV = 0, trocas = 0; const grupos: string[] = []
    ex.forEach((x) => {
      if (x.nome !== x.original) trocas++
      const g = grupoDe(x.original); if (!f.curta && x.series.some((s: any) => s.feita) && !grupos.includes(g)) grupos.push(g)
      const feitas = x.series.filter((s: any) => s.feita && s.kg)
      if (feitas.length) cargas[x.nome] = x.series.filter((s: any) => s.feita).map((s: any) => ({ kg: kgNum(s.kg), reps: parseInt(s.reps) || 0 }))
      feitas.forEach((s: any) => { const v = kgNum(s.kg) * (parseInt(s.reps) || 0); if (v > melhorV) { melhorV = v; melhor = `${x.nome} ${s.kg} kg × ${s.reps}` } })
    })
    const log = { data: new Date().toISOString(), ficha: f.id, duracao: dur, series: tot.n, volume: Math.round(tot.v), dose: d?.k || 'cheia', trocas }
    onSair()
    abrir({ tipo: 'fb', res: { log, cargas, melhor, publicar, ficha: f.id, exs: ex.map((x) => x.nome) }, grupos, rec, r: { g: {} } })
  }

  const vistos = new Set<string>()
  return (
    <div className="sessao-tela">
      <div className="sess-topo"><div className="sess-cab">
        <div className="l1"><h2><button onClick={sair} aria-label="Sair">{Icone.voltar}</button>Ficha {f.id}</h2><button className="btn vermelho peq" onClick={terminar}>Terminar</button></div>
        <div className="sess-num"><span>{Icone.relogio}<b>{fmtDur(Date.now() - ini.current)}</b></span><span>{Icone.serie}<b>{tot.n}</b> séries</span><span>{Icone.peso}<b>{num(tot.v)}</b> kg</span></div>
      </div></div>
      <div className="rol">
        {c.semana === DESCARGA && !f.curta && <div className="card" style={{ marginTop: 12, borderColor: 'var(--atencao)' }}><h4>Semana de descarga</h4><p style={{ fontSize: 13.5 }}>Metade das séries, mesma técnica. Não é semana perdida: é quando o ciclo assenta.</p></div>}
        {d && d.k !== 'cheia' && <div className="card" style={{ marginTop: 12, borderColor: 'var(--atencao)' }}><h4>{d.t}</h4><p style={{ fontSize: 13.5 }}>{d.x}</p></div>}
        {ex.map((x, ei) => {
          const m = metaHoje(a, x.nome, x.reps); const subs = subsDe(x.original); const g = grupoDe(x.original); const pergunta = !f.curta && !vistos.has(g); vistos.add(g)
          return (
            <div className="ex" key={ei}>
              {pergunta && <div className="card" style={{ margin: '0 0 10px', padding: 12 }}><h4>{g} · recuperou desde o último treino?</h4>
                <div className="chips" style={{ margin: 0 }}>{REC.map(([v, t]) => <button key={v} className={'chip' + (rec[g] === v ? ' on' : '')} onClick={() => setRec({ ...rec, [g]: v })}>{t}</button>)}</div></div>}
              <div className="chapa"><div className="play" /><small>Vídeo de execução · biblioteca do Abel</small></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div><h4>{x.nome}</h4><div className="mini">{x.series.length} × {x.reps} · RPE alvo {x.rpe}{x.nome !== x.original ? ` · no lugar de ${x.original}` : ''}</div></div>
                {subs.length > 0 && <button className="btn sec peq" onClick={() => muda(ei, (y) => { y.troca = !y.troca })}>Trocar</button>}
              </div>
              {x.troca && <div className="card" style={{ margin: '8px 0 0', padding: 12 }}><h4>Aparelho ocupado ou dói? Trocas aprovadas pelo Abel</h4>
                <div className="chips" style={{ margin: 0 }}>{[x.original, ...subs].filter((n) => n !== x.nome).map((n) => <button key={n} className="chip" onClick={() => trocar(ei, n)}>{n}</button>)}</div></div>}
              {m && <div className="mini" style={{ marginTop: 6, color: m.sobe ? 'var(--bom)' : 'var(--latao2)' }}>{m.txt}</div>}
              {x.nota && x.nome === x.original && <p className="nota-abel" style={{ fontSize: 18, marginTop: 4 }}>{x.nota}</p>}
              <table className="tab-series"><thead><tr><th>Série</th><th>Anterior</th><th>Kg</th><th>Reps</th><th>RPE</th><th>Feita</th></tr></thead><tbody>
                {x.series.map((s: any, si: number) => (
                  <tr key={si} className={s.feita ? 'feita' : ''}><td className="s">{si + 1}</td><td className="ant">{s.ant}</td>
                    <td><input inputMode="decimal" value={s.kg} placeholder={m ? fmtKg(m.kg) : ''} onChange={(e) => muda(ei, (y) => { y.series[si].kg = e.target.value })} aria-label="Carga" /></td>
                    <td><input inputMode="numeric" value={s.reps} placeholder={m ? String(m.reps) : ''} onChange={(e) => muda(ei, (y) => { y.series[si].reps = e.target.value })} aria-label="Repetições" /></td>
                    <td><input className="rpe" inputMode="numeric" value={s.rpe} placeholder={String(x.rpe)} onChange={(e) => muda(ei, (y) => { y.series[si].rpe = e.target.value })} aria-label="RPE" /></td>
                    <td><button className={'chk' + (s.feita ? ' on' : '')} onClick={() => marca(ei, si)} aria-label="Série feita" /></td></tr>))}
              </tbody></table>
              <div className="envio"><button className="btn sec peq" onClick={() => { setEnviandoEx(ei); arquivo.current?.click() }}>Mandar execução ao Abel</button><span>resposta em até 24 h</span></div>
            </div>
          )
        })}
        <label className="item" style={{ border: 0, marginTop: 10, cursor: 'pointer' }} onClick={() => setPublicar(!publicar)}><div>Publicar na ala<small>Só o primeiro nome e o treino</small></div><span className={'chk' + (publicar ? ' on' : '')} /></label>
        <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={terminar}>Terminar e registrar</button>
      </div>
      <input ref={arquivo} type="file" accept="video/*" capture="environment" hidden onChange={aoEscolherArquivo} />
    </div>
  )
}

/* conclui o treino com a resposta por músculo (modelo RP) */
export function concluirTreino(a: any, m: any, salvar: (p: any) => void) {
  const { res, grupos, rec, r } = m
  const { log, cargas, melhor, publicar, ficha } = res
  log.fb = { grupos: r.g, rec, art: r.art, artEx: r.artEx || '' }
  const wk = semanaISO(agora()); const semanas = { ...(a.semanas || {}) }; semanas[wk] = { feitos: ((semanas[wk] || {}).feitos || 0) + 1 }
  const c = ciclo(a); const vol = a.volume && a.volume.ciclo === c.n ? JSON.parse(JSON.stringify(a.volume)) : { ciclo: c.n, grupos: {} }
  const resumo: any[] = []; const gArt = r.art === 'dor' ? grupoDe(r.artEx) : null
  grupos.forEach((g: string) => {
    let aj = c.semana === DESCARGA ? { d: 0, motivo: 'Semana de descarga: volume não muda.' } : calcGrupo(rec[g] || 'tempo', r.g[g].pump, r.g[g].esf)
    if (g === gArt && c.semana !== DESCARGA) aj = { d: Math.min(aj.d, -1), motivo: 'Doeu a articulação: −1 série até o Abel ver o vídeo.' }
    const prev = (vol.grupos[g] || {}).delta || 0; const b = baseGrupo(g); const novo = Math.max(-Math.floor(b / 2), Math.min(8, prev + aj.d))
    vol.grupos[g] = { delta: novo, ult: { d: aj.d, motivo: aj.motivo, em: log.data } }; resumo.push({ g, d: aj.d, motivo: aj.motivo, total: Math.max(1, b + novo) })
  })
  const logs = [...(a.logs || []), log].slice(-40)
  salvar({ logs, semanas, cargas: { ...(a.cargas || {}), ...cargas }, ultimoTreino: log.data, volume: vol, ultimoFb: { art: r.art, ex: r.artEx || '', em: log.data } })
  if (publicar) postarAla({ tipo: 'treino', aluno_id: a.id, nome: primeiro(a.nome), ficha, duracao: log.duracao, series: log.series, volume: log.volume, melhor: melhor || '', recorde: false }).catch(() => {})
  return { log, melhor, resumo }
}
