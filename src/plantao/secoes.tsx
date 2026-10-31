import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cab, usePlantao } from './Plantao'
import {
  agora, baseGrupo, brl, chaveDia, ciclo, consist, DIA, diaAtras, diaDe, diasSemTreino, dt, estado, fmtKg, gastoEstimado, ha, hojeISO, iniciais,
  metaNutri, noRadar, notaPlacar, NOMEV, num, OBJ, OP, PERGUNTAS, placar, precoMes, primeiro, semanaISO, semanasFechadas, pctSemana, tendencia, ultimoCheckin,
} from '../lib/metodo'
import { api, responderExecucao, salvarConfig, urlAssinada, gravarAluno } from '../lib/dados'
import { Tag, Veredito } from '../components/ui'

const restante = (iso: string) => 24 - (Date.now() - +dt(iso)) / 36e5
function Relogio({ iso }: { iso: string }) {
  const r = restante(iso)
  if (r <= 0) return <span className="relogio urg">estourou há {Math.ceil(-r)} h</span>
  const h = Math.floor(r), m = Math.floor((r - h) * 60)
  return <span className={`relogio ${r < 4 ? 'urg' : r < 10 ? 'med' : 'ok'}`}>faltam {h}h{String(m).padStart(2, '0')}</span>
}
const Kpi = ({ t, v, s, f }: any) => <div className="kpi"><small>{t}</small><b style={f ? { fontSize: f } : undefined}>{v}</b><span>{s}</span></div>

/* ---------------- VISÃO GERAL ---------------- */
export function Geral() {
  const { alunos, execucoes, ir, abrirFicha, salvarAluno, toast } = usePlantao(); const op = OP()
  const rec = alunos.reduce((s: number, a: any) => s + precoMes(a.plano), 0)
  const fila = execucoes.filter((x: any) => x.status === 'aguardando'); const urg = fila.filter((x: any) => restante(x.enviado_em) < 4).length
  const cs = alunos.map(consist).filter((x: any) => x != null) as number[]; const media = cs.length ? Math.round(cs.reduce((a, b) => a + b, 0) / cs.length) : 0
  const abaixo = alunos.filter((a: any) => { const c = consist(a); return c != null && c < 75 }).length
  const ren = alunos.filter((a: any) => ciclo(a).renovaEm <= 14 && (a.renovacao || {}).status !== 'renovou'); const renV = ren.reduce((s: number, a: any) => s + ((op.precos || {})[a.plano] || 0), 0)
  const sumidos = alunos.filter((a: any) => diasSemTreino(a) >= 7).sort((a: any, b: any) => diasSemTreino(b) - diasSemTreino(a))
  const laudosV = alunos.filter((a: any) => ciclo(a).fotoEm <= 2)
  const wk = semanaISO(agora()); const semanas = alunos.filter((a: any) => a.semanaReal && a.semanaReal.semana === wk && !a.semanaReal.ajustado)
  const rad = noRadar(alunos); const nutP = alunos.filter((a: any) => { const c = ultimoCheckin(a); return c && c.status === 'pendente' })
  const velha = fila.slice().sort((x: any, y: any) => +dt(x.enviado_em) - +dt(y.enviado_em))[0]
  const acoes: any[] = []
  if (velha) acoes.push([`Responder ${fila.length} execuç${fila.length === 1 ? 'ão' : 'ões'} da fila`, <>A mais antiga é de {primeiro(velha.nome)} ({velha.exercicio}) · <Relogio iso={velha.enviado_em} /></>, 'fila'])
  if (rad.length) acoes.push([`${rad.length} aluno${rad.length > 1 ? 's' : ''} no radar de desistência`, `${rad.slice(0, 3).map((x: any) => primeiro(x.a.nome)).join(', ')}${rad.length > 3 ? '…' : ''} · ${rad[0].r.motivos[0].t}`, 'radar'])
  if (nutP.length) acoes.push([`Aprovar ${nutP.length} ajuste${nutP.length > 1 ? 's' : ''} de dieta`, `Check-in semanal de ${nutP.slice(0, 3).map((a: any) => primeiro(a.nome)).join(', ')}`, 'nutricao'])
  if (semanas.length) acoes.push([`Ajustar ${semanas.length} semana${semanas.length > 1 ? 's' : ''} real${semanas.length > 1 ? 'is' : ''}`, `Avisaram quantos dias têm esta semana: ${semanas.slice(0, 3).map((a: any) => primeiro(a.nome)).join(', ')}`, 'alunos'])
  if (sumidos.length) acoes.push([`Chamar ${sumidos.length} aluno${sumidos.length > 1 ? 's' : ''} sem treinar há 7+ dias`, sumidos.slice(0, 4).map((a: any) => `${primeiro(a.nome)} (${diasSemTreino(a)}d)`).join(' · '), 'alunos'])
  if (laudosV.length) acoes.push([`Cobrar ${laudosV.length} laudo${laudosV.length > 1 ? 's' : ''} de fotos`, `Vencem em até 2 dias: ${laudosV.slice(0, 4).map((a: any) => primeiro(a.nome)).join(', ')}`, 'laudos'])
  if (ren.length) acoes.push([`Conversar com ${ren.length} renovaç${ren.length > 1 ? 'ões' : 'ão'} dos próximos 14 dias`, `${brl(renV)} em jogo`, 'renovacoes'])
  const faixas = [[0, 25], [25, 50], [50, 75], [75, 100], [100, 999]]; const cont = faixas.map(([x, y]) => cs.filter((v) => v >= x && v < y).length)
  const W = 520, H = 170, mx = Math.max(1, ...cont), bw = 64, nomesF = ['0–25%', '25–50%', '50–75%', '75–100%', '100%+']
  const metaPct = Math.min(100, rec / op.meta * 100)
  const ajustado = (a: any) => { salvarAluno(a.id, { semanaReal: { ...a.semanaReal, ajustado: true } }); toast('Marcado como ajustado.') }
  return (<>
    <Cab titulo="Plantão" sub={`${alunos.length} alunos dentro. A régua é a mesma para todos: 75% da semana que cada um tem, resposta em 24 h e laudo a cada 4 semanas.`} />
    <div className="kpis">
      <Kpi t="Alunos ativos" v={alunos.length} s={['Full Access', 'Premium', 'Essential'].map((p) => `${alunos.filter((a: any) => a.plano === p).length} ${p.replace('Full Access', 'FA')}`).join(' · ')} />
      <Kpi t="Recorrente / mês" v={brl(rec)} s="estimado pelos planos bimestrais" />
      <Kpi t="Fila 24 h" v={fila.length} s={urg ? <span style={{ color: '#E0705F' }}>{urg} com menos de 4 h</span> : 'nenhuma estourando'} />
      <Kpi t="Consistência média" v={`${media}%`} s={`${abaixo} abaixo dos 75%`} />
      <Kpi t="Renovações · 14 dias" v={ren.length} s={`${brl(renV)} em jogo`} />
    </div>
    <div className="grade2">
      <div className="bloco"><h3>O que o plantão pede hoje</h3>{acoes.length ? acoes.map((x, i) => <div key={i} className="acao"><span className="n">{String(i + 1).padStart(2, '0')}</span><div className="c"><b>{x[0]}</b><small>{x[1]}</small></div><button className="btn sec peq" onClick={() => ir(x[2])}>Abrir</button></div>) : <p className="suave">Nada pendente. Plantão tranquilo.</p>}</div>
      <div className="bloco papel"><h3>Rumo aos R$ 250 mil</h3>
        <div style={{ fontFamily: 'var(--slab)', fontSize: 34, lineHeight: 1 }}>{brl(rec)}<span style={{ fontFamily: 'var(--corpo)', fontSize: 14, color: '#6b6150' }}> / mês recorrente</span></div>
        <div style={{ height: 10, borderRadius: 99, background: '#d6ccb6', margin: '14px 0 6px', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${metaPct}%`, background: '#1C1914', borderRadius: 99 }} /></div>
        <div className="maq" style={{ fontSize: 12, color: '#6b6150', display: 'flex', justifyContent: 'space-between' }}><span>{metaPct.toFixed(1)}% da meta</span><span>meta {brl(op.meta)}</span></div>
        <p style={{ fontSize: 13.5, marginTop: 14, color: '#3a342a' }}>Faturamento declarado: {op.faturamentoDeclarado}. O pico foi {brl(op.pico)} num único mês, com a mentoria. A meta ainda não tem prazo definido.</p>
        <p style={{ fontSize: 13.5, marginTop: 8, color: '#3a342a' }}>O recorrente acima conta só a consultoria.</p></div>
    </div>
    <div className="grade2">
      <div className="bloco"><h3>Consistência dos alunos · últimas 4 semanas</h3>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Distribuição de consistência">
          {cont.map((n, i) => { const x = 30 + i * 98, h = (n / mx) * (H - 50), y = H - 26 - h; return <g key={i}><title>{`${nomesF[i]}: ${n} alunos`}</title><rect x={x} y={y} width={bw} height={Math.max(2, h)} rx="4" fill={i >= 3 ? '#B8955A' : '#5b4f3b'} /><text x={x + bw / 2} y={y - 6} textAnchor="middle" fill="#EDE6D6" fontSize="12" fontFamily="Courier Prime">{n}</text><text x={x + bw / 2} y={H - 8} textAnchor="middle" fill="#756B58" fontSize="11" fontFamily="Courier Prime">{nomesF[i]}</text></g> })}
          <line x1={30 + 3 * 98 - 17} x2={30 + 3 * 98 - 17} y1="10" y2={H - 26} stroke="#EDE6D6" strokeDasharray="3 4" strokeOpacity=".5" /><text x={30 + 3 * 98 - 21} y="20" textAnchor="end" fill="#A89A80" fontSize="10" fontFamily="Courier Prime">régua 75%</text>
        </svg></div>
      <div className="bloco"><h3>A semana que eles têm <span className="mini" style={{ textTransform: 'none', letterSpacing: 0 }}>{semanas.length} sem ajuste</span></h3>
        {semanas.slice(0, 5).map((a: any) => <div key={a.id} className="acao"><div className="c"><b onClick={() => abrirFicha(a.id)} style={{ cursor: 'pointer' }}>{a.nome}</b><small>{a.semanaReal.dias} dias · {a.semanaReal.minutos} min{a.semanaReal.obs ? ` · “${a.semanaReal.obs}”` : ''}</small></div><button className="btn peq" onClick={() => ajustado(a)}>Ajustei</button></div>)}
        {!semanas.length && <p className="suave">Ninguém avisou mudança esta semana.</p>}</div>
    </div>
  </>)
}

/* ---------------- FILA 24 H ---------------- */
function Video({ caminho }: { caminho: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { let v = true; urlAssinada(caminho).then((u) => v && setUrl(u)); return () => { v = false } }, [caminho])
  if (url) return <video className="exec" src={url} controls playsInline preload="metadata" />
  return <div className="chapa"><div className="play" /><small>{caminho ? 'carregando o vídeo…' : 'sem arquivo'}</small></div>
}
export function Fila() {
  const { execucoes, setExecucoes, alunos, salvarAluno, toast } = usePlantao()
  const [rasc, setRasc] = useState<any>({})
  const ag = execucoes.filter((x: any) => x.status === 'aguardando').sort((a: any, b: any) => +dt(a.enviado_em) - +dt(b.enviado_em))
  const resp = execucoes.filter((x: any) => x.status === 'respondido').sort((a: any, b: any) => +dt(b.respondido_em) - +dt(a.respondido_em))
  const noPrazo = resp.filter((x: any) => (+dt(x.respondido_em) - +dt(x.enviado_em)) <= 24 * 36e5).length
  async function responder(x: any) {
    const r = rasc[x.id] || {}; if (!r.v) { toast('Escolhe o veredito.'); return }
    try {
      await responderExecucao(x.id, r.v, (r.t || '').slice(0, 600)); const em = new Date().toISOString()
      setExecucoes(execucoes.map((e: any) => (e.id === x.id ? { ...e, status: 'respondido', veredito: r.v, resposta: r.t, respondido_em: em } : e)))
      if (alunos.some((a: any) => a.id === x.aluno_id)) salvarAluno(x.aluno_id, { ultimoVeredito: { exercicio: x.exercicio, veredito: r.v, resposta: (r.t || '').slice(0, 600), em } })
      toast('Resposta enviada para o app da aluna.')
    } catch { toast('Não consegui responder agora.') }
  }
  return (<>
    <Cab titulo="Fila 24 h" sub="A execução chega, o Abel responde em até 24 horas com um veredito — patética, aceitável ou perfeita — e o porquê." />
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}><Kpi t="Esperando" v={ag.length} s="ordem: mais antiga primeiro" /><Kpi t="Respondidas no prazo" v={`${resp.length ? Math.round(100 * noPrazo / resp.length) : 0}%`} s={`${noPrazo} de ${resp.length}`} /><Kpi t="Biblioteca" v={`${OP().biblioteca}+`} s="vídeos de execução prontos" /></div>
    {ag.map((x: any) => { const r = rasc[x.id] || {}; return (
      <div key={x.id} className="fila-card"><Video caminho={x.arquivo} />
        <div><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><div><b style={{ fontWeight: 500, fontSize: 17 }}>{x.exercicio}</b><div className="mini">{x.nome} · {x.plano || ''} · mandou {ha(x.enviado_em)}</div></div><Relogio iso={x.enviado_em} /></div>
          {x.nota && <p style={{ marginTop: 8, fontSize: 14 }}>“{x.nota}”</p>}
          <div className="vbtns">{['patetica', 'aceitavel', 'perfeita'].map((v) => <button key={v} className={`vbtn ${v} ${r.v === v ? 'on' : ''}`} onClick={() => setRasc({ ...rasc, [x.id]: { ...r, v } })}>{NOMEV[v]}</button>)}</div>
          <textarea placeholder="O porquê, do jeito que tu fala com ela." value={r.t || ''} onChange={(e) => setRasc({ ...rasc, [x.id]: { ...r, t: e.target.value } })} />
          <div style={{ marginTop: 8 }}><button className="btn peq" onClick={() => responder(x)}>Responder</button></div></div></div>) })}
    {!ag.length && <div className="bloco vazio">Fila zerada. Ninguém esperando.</div>}
    {resp.length > 0 && <div className="bloco"><h3>Respondidas</h3><table className="tabela"><thead><tr><th>Aluno</th><th>Exercício</th><th>Veredito</th><th>Tempo de resposta</th></tr></thead><tbody>
      {resp.slice(0, 15).map((x: any) => { const h = Math.round((+dt(x.respondido_em) - +dt(x.enviado_em)) / 36e5); return <tr key={x.id}><td>{x.nome}</td><td>{x.exercicio}</td><td><Veredito v={x.veredito} peq /></td><td className="num">{h} h {h <= 24 ? '' : '· fora do prazo'}</td></tr> })}</tbody></table></div>}
  </>)
}

/* ---------------- RADAR ---------------- */
export function Radar() {
  const { alunos, salvarAluno, abrirFicha } = usePlantao()
  const lista = noRadar(alunos); const wk = semanaISO(agora())
  const fechs = alunos.flatMap((a: any) => (a.fechamentos || []).filter((f: any) => f.semana === wk).map((f: any) => ({ a, f }))); const naoLidos = fechs.filter((x: any) => !x.f.lido).sort((x: any, y: any) => x.f.nota - y.f.nota)
  const media = fechs.length ? fechs.reduce((s: number, x: any) => s + x.f.nota, 0) / fechs.length : 0
  const lido = (a: any, sem: string) => salvarAluno(a.id, { fechamentos: (a.fechamentos || []).map((f: any) => (f.semana === sem ? { ...f, lido: true } : f)) })
  return (<>
    <Cab titulo="Radar de desistência" sub="Aluno quase nunca avisa que vai sair: ele some aos poucos. O radar junta os sinais que aparecem semanas antes." />
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}><Kpi t="No radar" v={lista.length} s="com 3+ pontos de risco" /><Kpi t="Fechamentos da semana" v={`${fechs.length}/${alunos.length}`} s={`${naoLidos.length} para ler`} /><Kpi t="Nota média" v={media ? fmtKg(Math.round(media * 10) / 10) : '—'} s="de 1 a 5" /><Kpi t="Em pausa" v={alunos.filter((a: any) => (a.renovacao || {}).status === 'pausa').length} s="pausa em vez de cancelar" /></div>
    <div className="grade2">
      <div className="bloco"><h3>Quem pode sair</h3>{lista.slice(0, 20).map(({ a, r }: any) => (
        <div key={a.id} className="acao"><span className="n">{r.pontos}</span><div className="c"><b>{a.nome}</b> <span className="mini">· {a.plano}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>{r.motivos.map((m: any, i: number) => <Tag key={i} k={m.p >= 3 ? 'risco' : m.p === 2 ? 'atencao' : ''}>{m.t}</Tag>)}</div>
          <small>{r.motivos.slice().sort((x: any, y: any) => y.p - x.p)[0].acao}</small></div><button className="btn sec peq" onClick={() => abrirFicha(a.id)}>Abrir</button></div>))}
        {!lista.length && <p className="suave">Ninguém no radar. Bá.</p>}</div>
      <div className="bloco"><h3>Fechamentos para ler <span className="mini" style={{ textTransform: 'none', letterSpacing: 0 }}>notas baixas primeiro</span></h3>
        {naoLidos.slice(0, 14).map(({ a, f }: any) => <div key={a.id} className="acao"><span className="n">{f.nota}/5</span><div className="c"><b>{a.nome}</b>{f.vitoria && <small>Vitória: {f.vitoria}</small>}{f.atrapalhou && <small>Atrapalhou: {f.atrapalhou}</small>}</div><button className="btn peq" onClick={() => lido(a, f.semana)}>Lido</button></div>)}
        {!naoLidos.length && <p className="suave">Tudo lido.</p>}</div>
    </div>
  </>)
}

/* ---------------- DIÁRIO ---------------- */
export function Diario() {
  const { alunos, abrirFicha } = usePlantao()
  const manha = alunos.filter((a: any) => diaDe(a).manha).length, noite = alunos.filter((a: any) => diaDe(a).noite).length
  const semResp = alunos.map((a: any) => { let n = 0; for (let i = 0; i < 14; i++) { const d = diaDe(a, diaAtras(i)); if (d.manha || d.noite) break; n++ } return { a, n } }).filter((x: any) => x.n >= 3).sort((x: any, y: any) => y.n - x.n)
  const dorHoje = alunos.filter((a: any) => (diaDe(a).manha || {}).dor === 'articular')
  const motivos: any = {}; const sonoBaixo: any[] = []; const placares: number[] = []
  alunos.forEach((a: any) => { const ss: number[] = []; for (let i = 0; i < 14; i++) { const k = diaAtras(i), d = diaDe(a, k); const mo = (d.noite || {}).motivo; if (mo) motivos[mo] = (motivos[mo] || 0) + 1; if (i < 7) { const s = (d.manha || {}).sono_h; if (s != null) ss.push(s); if (d.manha || d.noite) placares.push(notaPlacar(placar(a, k))) } } if (ss.length >= 3) { const m = ss.reduce((s, v) => s + v, 0) / ss.length; if (m < 6.3) sonoBaixo.push({ a, m }) } })
  const NOMEM: any = { tempo: 'Faltou tempo', cansaco: 'Cansaço', dor: 'Dor', esqueci: 'Esqueceu', outro: 'Outra coisa' }; const mo = Object.entries(motivos).sort((x: any, y: any) => y[1] - x[1]) as [string, number][]; const mmax = Math.max(1, ...mo.map((x) => x[1]))
  const pm = placares.length ? placares.reduce((s, v) => s + v, 0) / placares.length : 0
  return (<>
    <Cab titulo="Diário" sub="Duas conversas curtas por dia com a assistente de cada aluna: manhã e noite. Cada pergunta existe para uma decisão — nenhuma é curiosidade." />
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}><Kpi t="Responderam hoje" v={`${manha}/${alunos.length}`} s={`manhã · ${noite} à noite`} /><Kpi t="Sumiram do diário" v={semResp.length} s="3+ dias sem responder" /><Kpi t="Dor na articulação hoje" v={dorHoje.length} s="avisadas pelo diário" /><Kpi t="Placar médio · 7 dias" v={`${fmtKg(Math.round(pm * 10) / 10)}/4`} s="treino, comida, sono, presença" /></div>
    <div className="grade2">
      <div className="bloco"><h3>O que mais derruba o treino · 14 dias</h3>{mo.map(([k, v]) => <div key={k} style={{ margin: '10px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{NOMEM[k] || k}</span><span className="maq">{v}</span></div><div className="barra" style={{ height: 8 }}><i style={{ width: `${100 * v / mmax}%` }} /></div></div>)}{!mo.length && <p className="suave">Sem faltas registradas.</p>}<p className="mini" style={{ marginTop: 8 }}>Se "faltou tempo" lidera, o problema é a prescrição não caber, não a aluna.</p></div>
      <div className="bloco"><h3>Dor na articulação hoje</h3>{dorHoje.map((a: any) => <div key={a.id} className="acao"><div className="c"><b>{a.nome}</b><small>{(diaDe(a).manha || {}).dorOnde || 'local não informado'} · dose leve aplicada</small></div><button className="btn sec peq" onClick={() => abrirFicha(a.id)}>Abrir</button></div>)}{!dorHoje.length && <p className="suave">Ninguém relatou dor hoje.</p>}</div>
    </div>
    <div className="grade2">
      <div className="bloco"><h3>Sumiram do diário</h3>{semResp.slice(0, 10).map(({ a, n }: any) => <div key={a.id} className="acao"><div className="c"><b>{a.nome}</b><small>{n >= 14 ? '14+' : n} dias sem responder</small></div><button className="btn sec peq" onClick={() => abrirFicha(a.id)}>Abrir</button></div>)}{!semResp.length && <p className="suave">Todo mundo respondendo.</p>}</div>
      <div className="bloco"><h3>Dormindo pouco · média de 7 dias</h3>{sonoBaixo.sort((x, y) => x.m - y.m).slice(0, 10).map(({ a, m }) => <div key={a.id} className="acao"><div className="c"><b>{a.nome}</b><small>{fmtKg(Math.round(m * 10) / 10)} h por noite</small></div></div>)}{!sonoBaixo.length && <p className="suave">Ninguém abaixo de 6 h.</p>}</div>
    </div>
    <div className="bloco" style={{ overflowX: 'auto' }}><h3>Cada pergunta e a decisão que ela alimenta</h3><table className="cmp"><thead><tr><th>Quando</th><th>Pergunta</th><th>Para quê</th></tr></thead><tbody>
      {PERGUNTAS.map((p) => <tr key={p.id}><td className="suave">{p.bloco === 'manha' ? 'Manhã' : 'Noite'}</td><td>{p.q}</td><td className="h">{p.por}</td></tr>)}</tbody></table>
      <p className="mini" style={{ marginTop: 10 }}>Placar do dia (0 a 4): treino feito ou descanso planejado · comida em dia (Full Access: 70% a 130% da meta; demais: proteína em 3+ refeições) · 7 h ou mais de sono · respondeu manhã e noite.</p></div>
  </>)
}

/* ---------------- NUTRIÇÃO ---------------- */
export function Nutricao() {
  const { alunos, salvarAluno, abrirFicha, toast } = usePlantao(); const [rasc, setRasc] = useState<any>({})
  const fa = alunos.filter((a: any) => a.plano === 'Full Access')
  const pend = fa.map((a: any) => ({ a, c: ultimoCheckin(a) })).filter((x: any) => x.c && x.c.status === 'pendente').sort((x: any, y: any) => +dt(x.c.em) - +dt(y.c.em))
  const decidir = (a: any, acao: string) => {
    const n = JSON.parse(JSON.stringify(a.nutri || {})); const c = n.checkins[n.checkins.length - 1]; const em = new Date().toISOString()
    if (acao === 'aprovar') { const k = rasc[a.id] || c.sugerido.k; const p = c.sugerido.p, g = c.sugerido.g, cc = Math.max(50, Math.round((k - p * 4 - g * 9) / 4)); const final = { k, p, c: cc, g }; c.status = k === c.sugerido.k ? 'aprovado' : 'ajustado'; c.final = final; c.decididoEm = em; n.meta = { ...final, desde: hojeISO() } }
    else { c.status = 'mantido'; c.final = metaNutri(a); c.decididoEm = em }
    salvarAluno(a.id, { nutri: n }); toast(acao === 'aprovar' ? 'Meta nova no app da aluna.' : 'Meta mantida.')
  }
  const mudaObj = (a: any, obj: string) => { salvarAluno(a.id, { nutri: { ...(a.nutri || {}), objetivo: obj, ritmo: obj === 'perder' ? 0.5 : obj === 'ganhar' ? 0.25 : 0 } }); toast('Objetivo salvo. Vale a partir do próximo check-in.') }
  return (<>
    <Cab titulo="Nutrição" sub="A dieta do Full Access se ajusta toda semana pelo que a aluna comeu de verdade e pela tendência do peso. O cálculo propõe, o Abel decide." />
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}><Kpi t="Full Access" v={fa.length} s="com dieta prescrita" /><Kpi t="Check-ins para aprovar" v={pend.length} s="mais antigo primeiro" /><Kpi t="Com dados suficientes" v={fa.filter((a: any) => gastoEstimado(a).ok).length} s="7+ dias de comida e peso em tendência" /></div>
    {pend.map(({ a, c }: any) => { const m = metaNutri(a); return (
      <div key={a.id} className="bloco"><h3>{a.nome} <span className="mini" style={{ textTransform: 'none', letterSpacing: 0 }}>{ha(c.em)} · {OBJ[(a.nutri || {}).objetivo] || 'Manter'}</span></h3>
        <div className="grade3" style={{ marginBottom: 10 }}>
          <div><div className="mini">Gasto estimado</div><div className="slab" style={{ fontSize: 24 }}>{num(c.gasto)} kcal</div><div className="mini">{c.dias} dias de registro{c.semana != null ? ` · peso ${c.semana > 0 ? '+' : ''}${fmtKg(c.semana)} kg/sem` : ''}</div></div>
          <div><div className="mini">Meta atual</div><div className="slab" style={{ fontSize: 24 }}>{num(m.k)} kcal</div><div className="mini">P {m.p} · C {m.c} · G {m.g}</div></div>
          <div><div className="mini">Proposta</div><div className="slab" style={{ fontSize: 24, color: 'var(--latao2)' }}>{num(c.sugerido.k)} kcal</div><div className="mini">P {c.sugerido.p} · C {c.sugerido.c} · G {c.sugerido.g}</div></div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><span className="mini">Aprovar com</span><input type="number" step={10} value={rasc[a.id] ?? c.sugerido.k} onChange={(e) => setRasc({ ...rasc, [a.id]: +e.target.value })} style={{ width: 110 }} /><span className="mini">kcal</span>
          <button className="btn peq" onClick={() => decidir(a, 'aprovar')}>Aprovar</button><button className="btn sec peq" onClick={() => decidir(a, 'manter')}>Manter a meta atual</button></div></div>) })}
    {!pend.length && <div className="bloco vazio">Nenhum check-in esperando.</div>}
    <div className="bloco" style={{ overflowX: 'auto' }}><h3>Alunas Full Access</h3><table className="tabela"><thead><tr><th>Aluna</th><th>Objetivo</th><th>Meta</th><th>Gasto estimado</th><th>Peso · tendência</th><th>Dias registrados (21)</th></tr></thead><tbody>
      {fa.map((a: any) => { const g = gastoEstimado(a), m = metaNutri(a), t = tendencia(a), o = (a.nutri || {}).objetivo || 'manter'; return (
        <tr key={a.id}><td onClick={() => abrirFicha(a.id)}>{a.nome}</td><td><select value={o} onChange={(e) => mudaObj(a, e.target.value)}>{Object.entries(OBJ).map(([k, t2]: any) => <option key={k} value={k}>{t2}</option>)}</select></td>
          <td className="num">{num(m.k)} kcal</td><td className="num">{g.ok ? `~${num(g.gasto)} kcal` : <span className="mudo">sem dados</span>}</td><td className="num">{t ? `${fmtKg(t.atual)} kg${t.delta != null ? ` · ${t.delta > 0 ? '+' : ''}${fmtKg(t.delta)}/2 sem` : ''}` : '—'}</td><td className="num">{g.dias || 0}</td></tr>) })}</tbody></table></div>
    <div className="bloco papel"><h3>Como o cálculo funciona</h3><p style={{ fontSize: 14, color: '#3a342a' }}>Gasto estimado = média das calorias registradas nos últimos 21 dias − variação semanal da tendência de peso × 7.700 kcal por kg. A proposta soma o objetivo, fixa proteína em 1,8 g/kg e gordura em 0,8 g/kg, e completa com carboidrato. Piso de 1.200 kcal. Comida fora do plano entra no cálculo como qualquer outra.</p></div>
  </>)
}

/* ---------------- ALUNOS ---------------- */
export function Alunos() {
  const { alunos, abrirFicha } = usePlantao(); const [busca, setBusca] = useState(''); const [filtro, setFiltro] = useState('todos'); const wk = semanaISO(agora())
  const F: any = { todos: () => true, abaixo: (a: any) => { const c = consist(a); return c != null && c < 75 }, sumidos: (a: any) => diasSemTreino(a) >= 7, semana: (a: any) => a.semanaReal && a.semanaReal.semana === wk && !a.semanaReal.ajustado, dor: (a: any) => a.ultimoFb && a.ultimoFb.art !== 'nada' && (Date.now() - +dt(a.ultimoFb.em)) < 10 * DIA, massa: (a: any) => a.massaMagra && a.massaMagra.ativo, 'Full Access': (a: any) => a.plano === 'Full Access', Premium: (a: any) => a.plano === 'Premium', Essential: (a: any) => a.plano === 'Essential' }
  const q = busca.toLowerCase(); const lista = alunos.filter((a: any) => !q || a.nome.toLowerCase().includes(q) || (a.cidade || '').toLowerCase().includes(q)).filter(F[filtro]).sort((a: any, b: any) => (consist(a) ?? 101) - (consist(b) ?? 101))
  const chip = (k: string, t: string) => <button key={k} className={'chip' + (filtro === k ? ' on' : '')} onClick={() => setFiltro(k)}>{t}</button>
  return (<>
    <Cab titulo="Alunos" sub="De quem mais precisa de atenção para quem menos. A consistência mede treinos feitos sobre a meta da semana que cada um tinha." />
    <div className="filtros"><input placeholder="Buscar por nome ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {[['todos', 'Todos'], ['abaixo', 'Abaixo de 75%'], ['sumidos', 'Sem treinar 7+ dias'], ['semana', 'Semana real a ajustar'], ['dor', 'Dor ou incômodo'], ['massa', 'Usa caneta'], ['Full Access', 'Full Access'], ['Premium', 'Premium'], ['Essential', 'Essential']].map(([k, t]) => chip(k, t))}</div>
    <div className="bloco" style={{ padding: '6px 8px', overflowX: 'auto' }}><table className="tabela"><thead><tr><th>Aluno</th><th>Plano</th><th>Ciclo</th><th>Consistência · 4 sem</th><th>Último treino</th><th>Semana real</th><th>Renova</th></tr></thead><tbody>
      {lista.map((a: any) => { const c = consist(a), ci = ciclo(a), st = estado(a), sr = a.semanaReal && a.semanaReal.semana === wk ? a.semanaReal : null; return (
        <tr key={a.id} onClick={() => abrirFicha(a.id)}>
          <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="av" style={{ width: 30, height: 30, fontSize: 11 }}>{iniciais(a.nome)}</div><div>{a.nome}<div className="mini" style={{ fontSize: 11.5 }}>{a.cidade || ''}{a.demo ? ' · exemplo' : ''}</div></div></div></td>
          <td>{a.plano}</td><td className="num">sem {ci.semana}/8</td>
          <td><div className="mbar"><div className="t"><i style={{ width: `${Math.min(100, c || 0)}%` }} /></div><span className="num maq" style={{ width: 38 }}>{c == null ? '—' : c + '%'}</span><Tag k={st.k}>{st.t}</Tag></div></td>
          <td className="num">{a.ultimoTreino ? ha(a.ultimoTreino) : '—'}</td>
          <td>{sr ? <Tag k={sr.ajustado ? 'bom' : 'atencao'}>{sr.dias}d · {sr.minutos}min</Tag> : <span className="mudo">—</span>}</td>
          <td className="num">{ci.renovaEm}d</td></tr>) })}</tbody></table>{!lista.length && <div className="vazio">Ninguém neste filtro.</div>}</div>
  </>)
}

/* ---------------- LAUDOS ---------------- */
export function Laudos() {
  const { alunos, abrirFicha } = usePlantao(); const al = alunos.map((a: any) => ({ a, c: ciclo(a) }))
  const fotos = al.filter((x: any) => x.c.fotoEm <= 7).sort((x: any, y: any) => x.c.fotoEm - y.c.fotoEm), videos = al.filter((x: any) => x.c.videoEm <= 14).sort((x: any, y: any) => x.c.videoEm - y.c.videoEm)
  const Lista = ({ arr, campo }: any) => arr.length ? <table className="tabela"><thead><tr><th>Aluno</th><th>Plano</th><th>Semana</th><th>Vence</th></tr></thead><tbody>{arr.map(({ a, c }: any) => <tr key={a.id} onClick={() => abrirFicha(a.id)}><td>{a.nome}</td><td>{a.plano}</td><td className="num">{c.semana}/8</td><td className="num">em {c[campo]}d</td></tr>)}</tbody></table> : <p className="suave">Nada nos próximos dias.</p>
  return (<>
    <Cab titulo="Laudos" sub="A cada 4 semanas, fotos. A cada 8, vídeo de movimento. O progresso fica visível — e a inconsistência também." />
    <div className="grade2"><div className="bloco"><h3>Fotos · próximos 7 dias <span className="mini">{fotos.length}</span></h3><Lista arr={fotos} campo="fotoEm" /></div><div className="bloco"><h3>Vídeo · próximos 14 dias <span className="mini">{videos.length}</span></h3><Lista arr={videos} campo="videoEm" /></div></div>
    <div className="bloco papel"><h3>Como o laudo funciona no app</h3><p style={{ fontSize: 14 }}>A aluna recebe a contagem regressiva no Hoje, manda as fotos pelo Prontuário (frente, lado e costas, mesma luz) e o laudo do Abel aparece escrito à mão no histórico dela. As fotos ficam na ficha da aluna, aqui no plantão.</p></div>
  </>)
}

/* ---------------- RENOVAÇÕES ---------------- */
export function Renovacoes() {
  const { alunos, salvarAluno, abrirFicha, toast } = usePlantao(); const op = OP()
  const al = alunos.map((a: any) => ({ a, c: ciclo(a) })).filter((x: any) => x.c.renovaEm <= 21).sort((x: any, y: any) => x.c.renovaEm - y.c.renovaEm)
  const tot = al.reduce((s: number, x: any) => s + ((op.precos || {})[x.a.plano] || 0), 0)
  const ST = [['aberta', 'Aberta'], ['conversa', 'Conversa marcada'], ['renovou', 'Renovou'], ['pausa', 'Pausa (em vez de cancelar)'], ['graduou', 'Graduou'], ['nao', 'Não renova']]
  return (<>
    <Cab titulo="Renovações" sub="Os planos são de 8 semanas. A renovação se ganha nas semanas 6 e 7, com o laudo na mão — não no último dia." />
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}><Kpi t="Renovam em 21 dias" v={al.length} s={`${brl(tot)} em jogo`} /><Kpi t="Já renovaram" v={al.filter((x: any) => (x.a.renovacao || {}).status === 'renovou').length} s="nesta janela" /><Kpi t="Em risco" v={al.filter((x: any) => { const c = consist(x.a); return c != null && c < 50 }).length} s="consistência abaixo de 50%" /></div>
    <div className="bloco" style={{ overflowX: 'auto' }}><table className="tabela"><thead><tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Renova</th><th>Consistência</th><th>Status</th></tr></thead><tbody>
      {al.map(({ a, c }: any) => { const s = (a.renovacao || {}).status || 'aberta'; const cs = consist(a); return (
        <tr key={a.id}><td onClick={() => abrirFicha(a.id)}>{a.nome}</td><td>{a.plano}</td><td className="num">{brl((op.precos || {})[a.plano] || 0)}</td><td className="num">{c.renovaEm}d</td><td className="num">{cs == null ? '—' : cs + '%'}</td>
          <td><select value={s} onChange={(e) => { salvarAluno(a.id, { renovacao: { status: e.target.value, em: new Date().toISOString() } }); toast('Status salvo.') }}>{ST.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></td></tr>) })}</tbody></table></div>
  </>)
}

/* ---------------- FUNIL ---------------- */
export function Funil() {
  const { toast, recarregar } = usePlantao(); const op = OP(), f = op.funil, pr = op.precos || {}
  const [proc, setProc] = useState(f.procurasMes), [fech, setFech] = useState(f.fechamentosMes), [cp, setCp] = useState(6), [cs, setCs] = useState(15)
  const comprou = Math.round(f.classificados * cp / 100), sobe = Math.round(comprou * cs / 100)
  const salvar = async () => { try { await salvarConfig('operacao', { ...op, funil: { ...f, procurasMes: Math.max(0, +proc || 0), fechamentosMes: Math.max(0, +fech || 0) } }); toast('Funil salvo.'); recarregar() } catch { toast('Não consegui salvar.') } }
  return (<>
    <Cab titulo="Funil" sub="O caminho real: a pessoa comenta a palavra-chave, vai ao site com formulário, chama no WhatsApp para retirar o material, a SDR entrega e qualifica, e a conversa fecha a consultoria." />
    <div className="bloco"><h3>Do post à consultoria</h3><div className="funil">{f.etapas.map((e: string, i: number) => <div key={i} className="etapa" style={{ minHeight: 84 }}><div className="k">0{i + 1}</div><b>{e}</b></div>)}</div>
      <div className="kpis" style={{ marginTop: 14, marginBottom: 0 }}><Kpi t="Formulário" v={f.formulario} s="respostas acumuladas" /><Kpi t="Classificados" v={f.classificados} s="fechou / não fechou" /><Kpi t="Procuras" v={f.procurasMes} s="por mês" /><Kpi t="Fechamentos" v={f.fechamentosMes} s="por mês" /><Kpi t="Objeção nº 1" v={f.objecao} s="de quem não fecha" f={24} /></div>
      <p className="suave" style={{ marginTop: 12, fontSize: 13.5 }}>Conversão relatada: {f.conversao} interessados fecham. Boa parte dos alunos chega por indicação.</p></div>
    <div className="grade2"><div className="bloco"><h3>Números do mês</h3>
        <label className="lbl" htmlFor="fp">Procuras no mês</label><input id="fp" type="number" min={0} value={proc} onChange={(e) => setProc(e.target.value)} style={{ width: 140 }} />
        <label className="lbl" htmlFor="ff">Fechamentos no mês</label><input id="ff" type="number" min={0} value={fech} onChange={(e) => setFech(e.target.value)} style={{ width: 140 }} />
        <div style={{ marginTop: 14 }}><button className="btn peq" onClick={salvar}>Salvar</button></div><p className="mini" style={{ marginTop: 10 }}>Taxa do mês: {+proc ? Math.round(100 * +fech / +proc) : 0}%</p></div>
      <div className="bloco papel"><h3>Cenário · planilha como porta</h3><p style={{ fontSize: 13.5, color: '#3a342a' }}>Os {f.classificados} leads já classificados, com a planilha de R$ 97 como entrada. É simulação, não previsão.</p>
        <div className="sl"><span style={{ width: 170, fontSize: 13 }}>Compram a planilha</span><input type="range" min={0} max={40} value={cp} onChange={(e) => setCp(+e.target.value)} /><b>{cp}%</b></div>
        <div className="sl"><span style={{ width: 170, fontSize: 13 }}>Sobem para o Premium</span><input type="range" min={0} max={50} value={cs} onChange={(e) => setCs(+e.target.value)} /><b>{cs}%</b></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}><div><div className="maq" style={{ fontSize: 12, color: '#6b6150' }}>{comprou} planilhas</div><div style={{ fontFamily: 'var(--slab)', fontSize: 24 }}>{brl(comprou * 97)}</div></div><div><div className="maq" style={{ fontSize: 12, color: '#6b6150' }}>{sobe} no Premium · por ciclo de 2 meses</div><div style={{ fontFamily: 'var(--slab)', fontSize: 24 }}>{brl(sobe * (pr.Premium || 858))}</div></div></div></div></div>
  </>)
}

/* ---------------- ESTEIRA ---------------- */
export function Esteira() {
  const cor: any = { pronto: 'bom', ativo: 'bom', foco: 'latao', 'âncora': 'latao', novo: 'atencao', 'em revisão': 'atencao', inativa: 'risco' }
  return (<>
    <Cab titulo="Esteira" sub="Do gratuito à mentoria. Quem chega ao Full Access já passou pelas camadas de antes: chega entendendo o método e mais comprometido." />
    <div className="esteira">{OP().esteira.map((x: any) => <div key={x.nome} className="degrau"><div className="cam">{x.camada}</div><div><b>{x.nome}</b><small>{x.nota}</small></div><div className="p">{x.preco}</div><div><Tag k={cor[x.status]}>{x.status}</Tag></div></div>)}</div>
  </>)
}

/* ---------------- MERCADO ---------------- */
export function Mercado() {
  const L = [
    ['Ajuste automático da dose pelo feedback do treino', 'RP Hypertrophy ajusta séries pela sensação no músculo, dor e esforço', 'Raro: a ficha costuma ficar igual até o próximo ciclo', 'Recuperação antes e sensação/esforço depois, por músculo'],
    ['Prontidão do dia', 'Apps de treino feminino e de recuperação fazem check-in diário', 'Quase não existe em consultoria de musculação', 'Assistente diária: sono, energia, dor e ciclo definem a dose'],
    ['Meta de carga por exercício', 'Apps de registro sugerem progressão', 'Aluna anota no papel ou no bloco de notas', 'Dupla progressão: o app diz a carga e as repetições de hoje'],
    ['Dieta que se ajusta pelo real', 'MacroFactor ajusta pelo que foi comido e pela tendência do peso', 'Dieta fixa até a próxima consulta', 'Gasto estimado + check-in semanal aprovado pelo Abel'],
    ['Protocolo para quem usa caneta', 'Planos de proteína e força para usuários de GLP-1', 'Quase ninguém em consultoria fala disso', 'Alvo de proteína por kg e força mínima 2x'],
    ['Radar de desistência', 'Plataformas de coaching alertam quem ficou quieto', 'O aluno some e o treinador descobre na renovação', 'Pontos de risco por aluno e a ação sugerida'],
    ['Execução corrigida pelo treinador', 'Future: vídeo de execução com retorno do treinador', 'Correção solta no WhatsApp', 'Fila de 24 h com veredito patética, aceitável ou perfeita'],
    ['Educação como produto', 'Raro', 'Raro', 'Escola da ala: 8 lições ao longo do ciclo'],
  ]
  return (<>
    <Cab titulo="Mercado" sub="O que as grandes referências fazem, o que quase ninguém faz no mercado do Abel e onde o Hospício entra." />
    <div className="bloco" style={{ overflowX: 'auto' }}><h3>As lacunas que o Hospício ocupa</h3><table className="cmp"><thead><tr><th>Funcionalidade</th><th>Quem faz lá fora</th><th>No mercado do Abel</th><th>No Hospício</th></tr></thead><tbody>
      {L.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="suave">{r[1]}</td><td className="suave">{r[2]}</td><td className="h">{r[3]}</td></tr>)}</tbody></table></div>
    <div className="grade2"><div className="bloco"><h3>Uma decisão de ciência</h3><p style={{ fontSize: 14 }}>O app não periodiza o treino pela fase do ciclo menstrual: a revisão mais ampla até aqui (2023) não encontrou efeito relevante da fase sobre força ou ganho muscular. O ciclo entra como sintoma do dia.</p></div>
      <div className="bloco"><h3>Concorrente direto · Pacholok Team</h3><p style={{ fontSize: 14 }}>App próprio com treino, dieta, sono, timeline social e perfil, com discurso de elite. O Hospício tem a mesma base e vai além no que só um treinador presente entrega: execução corrigida em 24 h, a semana real e a régua dos 75%.</p></div></div>
  </>)
}

/* ---------------- CADASTRAR ALUNA ---------------- */
export function Convidar() {
  const { toast, recarregar } = usePlantao(); const navegar = useNavigate()
  const [f, setF] = useState<any>({ nome: '', email: '', plano: 'Full Access', freq: 4, sexo: 'f', objetivo: '', inicio: hojeISO() }); const [env, setEnv] = useState(false)
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const ok = async (e: any) => { e.preventDefault(); setEnv(true); try { await api('/api/convidar', { ...f, inicio: new Date(f.inicio + 'T08:00:00').toISOString() }); toast('Convite enviado por e-mail.'); recarregar(); navegar('/plantao/alunos') } catch (er: any) { toast(er.message || 'Não consegui cadastrar.') } setEnv(false) }
  return (<>
    <Cab titulo="Cadastrar aluna" sub="A aluna recebe um e-mail para criar a senha e cai direto no app dela." />
    <form className="bloco" style={{ maxWidth: 560 }} onSubmit={ok}>
      <label className="lbl" htmlFor="cn">Nome completo</label><input id="cn" required value={f.nome} onChange={(e) => set('nome', e.target.value)} style={{ width: '100%' }} />
      <label className="lbl" htmlFor="ce">E-mail</label><input id="ce" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} style={{ width: '100%' }} />
      <div className="linha2"><div><label className="lbl" htmlFor="cp">Plano</label><select id="cp" value={f.plano} onChange={(e) => set('plano', e.target.value)} style={{ width: '100%' }}>{['Full Access', 'Premium', 'Essential'].map((p) => <option key={p}>{p}</option>)}</select></div>
        <div><label className="lbl" htmlFor="cf">Treinos por semana</label><input id="cf" type="number" min={1} max={7} value={f.freq} onChange={(e) => set('freq', +e.target.value)} style={{ width: '100%' }} /></div></div>
      <div className="linha2"><div><label className="lbl" htmlFor="cs">Sexo</label><select id="cs" value={f.sexo} onChange={(e) => set('sexo', e.target.value)} style={{ width: '100%' }}><option value="f">Feminino</option><option value="m">Masculino</option></select></div>
        <div><label className="lbl" htmlFor="ci">Início do ciclo</label><input id="ci" type="date" value={f.inicio} onChange={(e) => set('inicio', e.target.value)} style={{ width: '100%' }} /></div></div>
      <label className="lbl" htmlFor="co">Objetivo</label><input id="co" value={f.objetivo} onChange={(e) => set('objetivo', e.target.value)} style={{ width: '100%' }} placeholder="Glúteo e posterior, sem abrir mão do fim de semana" />
      <button className="btn" type="submit" disabled={env} style={{ marginTop: 16 }}>{env ? 'Enviando…' : 'Cadastrar e enviar convite'}</button>
    </form>
  </>)
}

void baseGrupo; void chaveDia; void semanasFechadas; void pctSemana; void gravarAluno
