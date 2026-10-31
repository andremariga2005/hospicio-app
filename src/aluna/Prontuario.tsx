import { useRef, useState } from 'react'
import { useAluna } from './ctx'
import {
  agora, alvoProteina, alvoSemana, chaveDia, ciclo, consist, dataCurta, DIA, diaDe, DIAS, dt, estado, feitosSemana, fmtKg, hojeISO, iniciais,
  macrosHoje, MESES, MOD, notaPlacar, num, numBR, pctSemana, PILARES, placar, semanaISO, tendencia,
} from '../lib/metodo'
import { enviarArquivo } from '../lib/dados'
import { Tag } from '../components/ui'

function BarrasSemanas({ a }: { a: any }) {
  const ks = Object.keys(a.semanas || {}).sort().slice(-6); if (!ks.length) return <p className="mini">Sem semanas registradas ainda.</p>
  const W = 320, H = 120, pb = 20, larg = (W - 20) / ks.length, bw = Math.min(34, larg - 12); const y = (v: number) => H - pb - (Math.min(125, v) / 125) * (H - pb - 10)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Consistência por semana">
      <line x1="0" x2={W} y1={y(75)} y2={y(75)} stroke="#EDE6D6" strokeDasharray="3 4" strokeOpacity=".5" />
      <text x={W} y={y(75) - 4} textAnchor="end" fill="#A89A80" fontSize="9" fontFamily="Courier Prime">75%</text>
      {ks.map((k, i) => { const p = pctSemana(a, k), x = 10 + i * larg + (larg - bw) / 2; return (
        <g key={k}><title>{`${k}: ${feitosSemana(a, k)} de ${alvoSemana(a, k)} treinos (${p}%)`}</title>
          <rect x={x} y={y(p)} width={bw} height={Math.max(2, H - pb - y(p))} rx="4" fill={p >= 75 ? '#B8955A' : '#5b4f3b'} />
          <text x={x + bw / 2} y={y(p) - 5} textAnchor="middle" fill="#EDE6D6" fontSize="10" fontFamily="Courier Prime">{p}</text>
          <text x={x + bw / 2} y={H - 5} textAnchor="middle" fill="#756B58" fontSize="9" fontFamily="Courier Prime">S{k.slice(-2)}</text></g>) })}
    </svg>
  )
}

function GraficoPeso({ a }: { a: any }) {
  const t = tendencia(a); if (!t || t.pts.length < 2) return null
  const W = 320, H = 110, pts = t.pts.slice(-35), mm = t.mm.slice(-35), d0 = pts[0].d, d1 = pts[pts.length - 1].d
  const all = pts.map((p: any) => p.kg); const mx = Math.max(...all) + 0.3, mn = Math.min(...all) - 0.3
  const X = (d: Date) => 12 + (W - 24) * ((+d - +d0) / Math.max(1, +d1 - +d0)), Y = (v: number) => H - 18 - ((v - mn) / Math.max(0.1, mx - mn)) * (H - 30)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Peso e média de 7 dias">
      {pts.map((p: any, i: number) => <circle key={i} cx={X(p.d)} cy={Y(p.kg)} r="2.5" fill="#756B58"><title>{`${dataCurta(p.d)}: ${fmtKg(p.kg)} kg`}</title></circle>)}
      <polyline points={mm.map((m: any) => `${X(m.d)},${Y(m.kg)}`).join(' ')} fill="none" stroke="#D9BE86" strokeWidth="2" />
      <text x="12" y={H - 3} fill="#756B58" fontSize="9" fontFamily="Courier Prime">{dataCurta(d0)}</text>
      <text x={W - 12} y={H - 3} textAnchor="end" fill="#756B58" fontSize="9" fontFamily="Courier Prime">média {fmtKg(t.atual)} kg</text>
    </svg>
  )
}

function Diario({ a }: { a: any }) {
  const dias = Array.from({ length: 14 }, (_, i) => { const x = new Date(Date.now() - (13 - i) * DIA); const k = chaveDia(x); return { x, k, r: placar(a, k), d: diaDe(a, k) } })
  const cel = (v: any) => v === 1 ? { background: 'var(--latao)' } : v === 0.5 ? { background: '#b8955a66' } : v === 0 ? { background: '#ffffff14', border: '1px solid #5a2620' } : { background: '#ffffff08' }
  const sonos = dias.map((z) => (z.d.manha || {}).sono_h).filter((v) => v != null), en = dias.map((z) => (z.d.manha || {}).energia).filter((v) => v != null)
  const dores = dias.filter((z) => (z.d.manha || {}).dor === 'articular').length, resp = dias.filter((z) => z.d.manha || z.d.noite).length
  const media = dias.slice(-7).reduce((s, z) => s + notaPlacar(z.r), 0) / 7; const med = (l: number[]) => fmtKg(Math.round(l.reduce((s, v) => s + v, 0) / l.length * 10) / 10)
  return (
    <div className="card"><h4>Diário · 14 dias <span className="maq" style={{ letterSpacing: 0, textTransform: 'none' }}>placar {fmtKg(Math.round(media * 10) / 10)}/4</span></h4>
      <div style={{ display: 'grid', gridTemplateColumns: '62px repeat(14,1fr)', gap: 3, alignItems: 'center', fontSize: 10 }}>
        {PILARES.map(([k, t]) => [<div key={k} className="mudo">{t}</div>, ...dias.map((z) => <div key={k + z.k} title={`${z.k} · ${t}`} style={{ height: 14, borderRadius: 3, ...cel(z.r[k]) }} />)])}
        <div />{dias.map((z) => <div key={z.k} className="mudo" style={{ textAlign: 'center' }}>{z.x.getDate()}</div>)}
      </div>
      <div className="linha2" style={{ marginTop: 12 }}><div><div className="mini">Sono médio</div><div className="slab" style={{ fontSize: 20 }}>{sonos.length ? med(sonos) + ' h' : '—'}</div></div><div><div className="mini">Energia média</div><div className="slab" style={{ fontSize: 20 }}>{en.length ? med(en) + '/5' : '—'}</div></div></div>
      <p className="mini" style={{ marginTop: 8 }}>{resp} de 14 dias respondidos{dores ? ` · ${dores} com dor na articulação` : ''}. Cheio = em dia; vazio com borda = não cumpriu; apagado = sem resposta.</p>
    </div>
  )
}

export default function Prontuario() {
  const { a, salvar, toast, abrir, ir } = useAluna()
  const c = ciclo(a), cs = consist(a), st = estado(a), wk = semanaISO(agora()), treinoPct = Math.min(100, pctSemana(a, wk))
  const { tot, meta } = a.plano === 'Full Access' ? macrosHoje(a) : { tot: { k: 0 }, meta: { k: 1 } }; const refPct = Math.round(100 * tot.k / Math.max(1, meta.k))
  const d7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * DIA); return { d, on: (a.logs || []).some((l: any) => dt(l.data).toDateString() === d.toDateString()), hoje: i === 6 } })
  const desde = dt(a.inicio), t = tendencia(a), md = (a.medidas || []).slice().sort((x: any, y: any) => (x.data < y.data ? -1 : 1)), m0 = md[0], m1 = md[md.length - 1]
  const lic = MOD().licoes || [], lidas = a.licoes || [], liberada = (i: number) => c.n > 1 || i < c.semana
  const mmOn = a.massaMagra && a.massaMagra.ativo, ap = alvoProteina(a)
  const [peso, setPeso] = useState(''); const [cint, setCint] = useState(''); const [quad, setQuad] = useState('')
  const fotos = useRef<HTMLInputElement>(null)
  const salvaPeso = () => { const v = numBR(peso); if (!(v > 25 && v < 300)) { toast('Peso em kg, tipo 68,4.'); return } salvar({ peso: [...(a.peso || []).filter((p: any) => p.data !== hojeISO()), { data: hojeISO(), kg: Math.round(v * 10) / 10 }].sort((x: any, y: any) => (x.data < y.data ? -1 : 1)).slice(-120) }); setPeso(''); toast('Peso registrado. Olha a média, não o dia.') }
  const salvaMedidas = () => { const c1 = numBR(cint), q = numBR(quad); if (!(c1 > 30) || !(q > 30)) { toast('Preenche cintura e quadril em cm.'); return } salvar({ medidas: [...(a.medidas || []).filter((m: any) => m.data !== hojeISO()), { data: hojeISO(), cintura: c1, quadril: q }].slice(-40) }); setCint(''); setQuad(''); toast('Medidas registradas.') }
  const mandarFotos = async (e: any) => {
    const fs = [...(e.target.files || [])].slice(0, 6); e.target.value = ''; if (!fs.length) return; toast('Enviando as fotos…')
    try { const caminhos = []; for (const f of fs) caminhos.push(await enviarArquivo(a.id, 'laudos', f as File)); salvar({ laudos: [...(a.laudos || []), { tipo: c.semana === 8 ? 'video' : 'foto', data: new Date().toISOString(), nota: '', arquivos: caminhos }] }); toast('Fotos recebidas. O laudo sai em até 24 h.') }
    catch { toast('Não consegui enviar. Tenta de novo com internet boa.') }
  }
  const lerLicao = (id: string) => { abrir({ tipo: 'licao', id }); if (!lidas.includes(id)) salvar({ licoes: [...lidas, id] }) }
  return (
    <div className="app-conteudo">
      <div className="coluna">
        <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 6 }}><div className="av g">{iniciais(a.nome)}</div>
          <div><div style={{ fontWeight: 500, fontSize: 19 }}>{a.nome}</div><div className="mini">{a.cidade || ''} · desde {MESES[desde.getMonth()]} de {desde.getFullYear()}</div><div style={{ marginTop: 6 }}><Tag k={st.k}>{st.t}</Tag></div></div></div>
        <div className="linha2"><div className="tile"><small>Último treino</small><b>{a.ultimoTreino ? String(dt(a.ultimoTreino).getDate()).padStart(2, '0') : '—'}</b><small>{a.ultimoTreino ? MESES[dt(a.ultimoTreino).getMonth()] : ''}</small></div>
          <div className="tile"><small>Consistência · 4 semanas</small><b>{cs == null ? '—' : cs + '%'}</b><small>régua: 75%</small></div></div>
        <div className="card" style={{ marginTop: 12 }}><h4>Meta da semana</h4>
          <div className="mini">Treinos feitos · {treinoPct}%</div><div className="barra"><i style={{ width: `${treinoPct}%` }} /></div>
          {a.plano === 'Full Access' && <><div className="mini" style={{ marginTop: 6 }}>Comida de hoje marcada · {refPct}%</div><div className="barra"><i style={{ width: `${Math.min(100, refPct)}%`, background: 'var(--bom)' }} /></div></>}
          <div className="mini" style={{ marginTop: 12 }}>Sequência de treinos</div><div className="semana-dots">{d7.map((x, i) => <div key={i}><i className={(x.on ? 'on ' : '') + (x.hoje ? 'hoje' : '')} />{DIAS[x.d.getDay()].slice(0, 3)}</div>)}</div></div>
        <Diario a={a} />
        <div className="card"><h4>Consistência por semana</h4><BarrasSemanas a={a} /><p className="mini">Treinos feitos sobre a meta da semana que tu tinha. Cheio = passou dos 75%.</p></div>
        <div className="card"><h4>Peso e medidas <span className="mini" style={{ textTransform: 'none', letterSpacing: 0 }}>a média manda, não o dia</span></h4>
          {t && t.pts.length >= 2 ? <GraficoPeso a={a} /> : <p className="mini">Registra o peso de manhã, 3 ou 4 vezes por semana. O app mostra a média de 7 dias para o barulho do dia não te enganar.</p>}
          {t && t.delta != null && <p style={{ fontSize: 14, marginTop: 4 }}>Tendência: <b style={{ fontWeight: 500 }}>{t.delta > 0 ? '+' : ''}{fmtKg(t.delta)} kg</b> em 2 semanas{Math.abs(t.delta) < 0.3 ? ' · estável' : ''}</p>}
          {m0 && m1 && m0 !== m1 && <p className="mini" style={{ marginTop: 4 }}>Cintura {fmtKg(m0.cintura)} → {fmtKg(m1.cintura)} cm · quadril {fmtKg(m0.quadril)} → {fmtKg(m1.quadril)} cm</p>}
          <div className="linha2" style={{ marginTop: 10 }}><div><label className="lbl" htmlFor="pPeso">Peso hoje (kg)</label><input id="pPeso" value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" style={{ width: '100%' }} placeholder={t ? fmtKg(t.ultimo) : '00,0'} /></div><div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn sec peq" style={{ width: '100%' }} onClick={salvaPeso}>Registrar</button></div></div>
          <div className="linha2" style={{ marginTop: 6 }}><div><label className="lbl" htmlFor="pC">Cintura (cm)</label><input id="pC" value={cint} onChange={(e) => setCint(e.target.value)} inputMode="decimal" style={{ width: '100%' }} /></div><div><label className="lbl" htmlFor="pQ">Quadril (cm)</label><input id="pQ" value={quad} onChange={(e) => setQuad(e.target.value)} inputMode="decimal" style={{ width: '100%' }} /></div></div>
          <button className="btn sec peq" style={{ marginTop: 8 }} onClick={salvaMedidas}>Registrar medidas</button></div>
      </div>
      <div className="coluna-lado">
        {a.recordes && <div className="card"><h4>Recordes</h4>{Object.entries(a.recordes).map(([k, v]: any) => <div key={k} className="item"><div>{k}</div><span className="maq">{v}</span></div>)}</div>}
        <div className="card"><h4>Laudos <span className="mini" style={{ textTransform: 'none', letterSpacing: 0 }}>fotos a cada 4 sem · vídeo a cada 8</span></h4>
          {(a.laudos || []).slice().reverse().map((l: any, i: number) => <div key={i} className="laudo"><div className="d">{dataCurta(dt(l.data))}<br />{l.tipo === 'video' ? 'vídeo' : 'fotos'}</div><div className="nota-abel" style={{ fontSize: 18 }}>{l.nota || 'Recebido. Laudo do Abel em até 24 h.'}</div></div>)}
          {!(a.laudos || []).length && <p className="mini">O primeiro laudo sai da anamnese.</p>}
          <div className="laudo"><div className="d">em {c.fotoEm}d</div><div className="mini">Próximo: {c.fotoEm === c.videoEm ? 'fotos + vídeo de movimento' : 'fotos'} · frente, lado e costas, mesma luz.</div></div>
          <button className="btn sec peq" style={{ marginTop: 8 }} onClick={() => fotos.current?.click()}>Mandar fotos do laudo</button>
          <input ref={fotos} type="file" accept="image/*,video/*" multiple hidden onChange={mandarFotos} /></div>
        <div className="card"><h4>Escola da ala <span className="maq" style={{ letterSpacing: 0, textTransform: 'none' }}>{lidas.length}/{lic.length}</span></h4>
          <p className="mini" style={{ marginBottom: 6 }}>Uma lição por semana do ciclo. Quem passa pelo hospício sai sabendo treinar.</p>
          {lic.map((l: any, i: number) => { const ok = liberada(i), lida = lidas.includes(l.id); return (
            <div key={l.id} className="item" style={ok ? { cursor: 'pointer' } : undefined} onClick={() => ok && lerLicao(l.id)}>
              <div style={ok ? undefined : { opacity: 0.45 }}>{String(i + 1).padStart(2, '0')} · {l.t}<small>{ok ? (lida ? 'lida' : 'nova') : `libera na semana ${i + 1}`}</small></div>{lida && <span className="chk on" />}</div>) })}</div>
        <div className="card"><h4>Protocolo massa magra</h4>
          <p className="mini">Para quem usa caneta para emagrecer, prescrita pelo médico. O remédio é com o médico. Aqui a gente protege o músculo: força pelo menos 2x na semana e proteína todo dia.</p>
          {mmOn && ap && <p style={{ fontSize: 14, marginTop: 8 }}>Alvo de proteína: <b style={{ fontWeight: 500 }}>{ap.min}–{ap.alvo} g por dia</b> (pelo teu peso de {fmtKg(ap.peso)} kg)</p>}
          {mmOn && !ap && <p className="mini" style={{ marginTop: 8 }}>Registra o peso para calcular o alvo de proteína.</p>}
          <label className="item" style={{ border: 0, cursor: 'pointer', marginTop: 4 }} onClick={() => salvar({ massaMagra: { ativo: !mmOn, desde: hojeISO() } })}><div>Estou usando caneta<small>Só tu e o Abel veem isso</small></div><span className={'chk' + (mmOn ? ' on' : '')} /></label></div>
        {a.assistente?.nome && <div className="card"><h4>Tua assistente</h4><div className="item" style={{ border: 0 }}><div>{a.assistente.nome}<small>É quem conversa contigo todo dia e leva tudo pro Abel.</small></div><button className="btn sec peq" onClick={() => ir('hoje')}>Abrir</button></div></div>}
        <div className="card"><h4>Plano</h4><div className="grande">{a.plano}</div><div className="mini">Ciclo de 8 semanas · semana {c.semana} · renova em {c.renovaEm} dias</div></div>
        <div className="card"><h4>Suporte</h4><div className="item" style={{ border: 0 }}><div>Falar com o Abel<small>Pelo WhatsApp da consultoria · resposta em até 24 h</small></div></div>
          <div className="item"><div>Refazer a anamnese<small>Mudou rotina, lesão ou objetivo? Avisa antes do próximo ciclo.</small></div><button className="btn sec peq" onClick={() => abrir({ tipo: 'semana' })}>Avisar</button></div></div>
      </div>
    </div>
  )
}
void num
