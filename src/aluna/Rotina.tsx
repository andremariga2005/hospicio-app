import { useState } from 'react'
import { useAluna } from './ctx'
import {
  agora, dataCurta, dataLonga, DIA, DIAS, dt, fatorPorcao, fmtKg, gastoEstimado, gravaIngestao, ha, hojeDieta, hojeISO, ingHoje,
  macrosHoje, metaNutri, MOD, num, OBJ, porcao, propor, sonoScore, ultimoCheckin, chaveDia,
} from '../lib/metodo'

const foraPadrao: [number, string][] = [[150, 'Lanche · +150'], [400, 'Refeição leve · +400'], [800, 'Refeição grande · +800']]
import { Anel } from '../components/ui'

function CheckinNutri() {
  const { a, salvar, toast } = useAluna()
  const uc = ultimoCheckin(a), g = gastoEstimado(a), m = metaNutri(a), n = a.nutri || {}
  const dias = uc ? Math.floor((Date.now() - +dt(uc.em)) / DIA) : 99
  const fazer = () => {
    if (!g.ok) { toast('Ainda faltam dados para o check-in.'); return }
    const novo = { ...(a.nutri || { objetivo: 'manter' }) }
    novo.checkins = [...(novo.checkins || []), { id: 'c' + Date.now().toString(36), em: new Date().toISOString(), gasto: g.gasto, dias: g.dias, peso: g.peso, semana: Math.round(g.semana * 100) / 100, sugerido: propor(a, g), status: 'pendente' }].slice(-20)
    salvar({ nutri: novo }); toast('Check-in enviado. O Abel aprova a nova meta em até 24 h.')
  }
  let corpo
  if (uc && uc.status === 'pendente') corpo = <p style={{ fontSize: 14 }}>Check-in enviado {ha(uc.em)}. Proposta: <b style={{ fontWeight: 500 }}>{num(uc.sugerido.k)} kcal</b>. O Abel aprova ou ajusta em até 24 h.</p>
  else if (dias < 6) corpo = <p style={{ fontSize: 14 }}>Próximo check-in em {6 - dias} {6 - dias === 1 ? 'dia' : 'dias'}.</p>
  else if (g.ok) corpo = <><p style={{ fontSize: 14, marginBottom: 10 }}>Teus dados da semana estão prontos.</p><button className="btn peq" onClick={fazer}>Fazer o check-in da semana</button></>
  else corpo = <p className="mini">Para o check-in: marca o que comeu em pelo menos 7 dos últimos 21 dias (tem {g.dias}) e registra o peso 3x por semana no Prontuário (tem {g.pesos || 0} médias).</p>
  return (
    <div className="card"><h4>Meta que se ajusta <span className="mini" style={{ textTransform: 'none', letterSpacing: 0 }}>{OBJ[n.objetivo] || 'Manter'}{n.ritmo ? ` · ${String(n.ritmo).replace('.', ',')}% por semana` : ''}</span></h4>
      <div className="grande">{num(m.k)} kcal <span className="mini">· P {m.p} · C {m.c} · G {m.g}</span></div>
      {g.ok ? <p className="mini" style={{ margin: '6px 0 10px' }}>Teu gasto estimado: <b style={{ color: 'var(--papel)' }}>~{num(g.gasto)} kcal/dia</b>, calculado com {g.dias} dias do que tu comeu e a tendência do teu peso ({g.semana > 0 ? '+' : ''}{fmtKg(g.semana)} kg por semana).</p> : <p className="mini" style={{ margin: '6px 0 10px' }}>O gasto estimado aparece quando tiver dados suficientes.</p>}
      {corpo}
      {uc && uc.status !== 'pendente' && uc.final && <p className="mini" style={{ marginTop: 8 }}>Última meta aprovada pelo Abel {ha(uc.decididoEm || uc.em)}.</p>}
    </div>
  )
}

function Comida() {
  const { a, salvar, toast } = useAluna()
  if (a.plano !== 'Full Access') return (
    <div className="card" style={{ textAlign: 'center', padding: '28px 18px' }}><span className="carimbo">Restrito</span><h3 className="slab" style={{ fontSize: 22, margin: '14px 0 6px' }}>A dieta é do Full Access</h3>
      <p className="mini">No {a.plano}, a prescrição é de treino{a.plano === 'Premium' ? ' com acompanhamento' : ''}. No Full Access entram dieta que se ajusta toda semana, ergogênicos e este checklist com os macros do dia.</p></div>)
  const { tot, meta } = macrosHoje(a); const feitos = hojeDieta(a); const f = fatorPorcao(a); const fora = ingHoje(a).fora || 0
  const marca = (id: string) => { const l = feitos.includes(id) ? feitos.filter((x: string) => x !== id) : [...feitos, id]; salvar({ dieta: { dia: hojeISO(), feitos: l }, ingestao: gravaIngestao(a, l, fora) }) }
  const foraDoPlano = (k: number) => { salvar({ ingestao: gravaIngestao(a, feitos, k ? fora + k : 0) }); toast(k ? 'Registrado. O ajuste usa o que aconteceu, não o que era pra acontecer.' : 'Zerado.') }
  return (
    <>
      <CheckinNutri />
      <div className="aneis"><Anel v={tot.p} meta={meta.p} cor="#86A562" rotulo="Proteína g" /><Anel v={tot.c} meta={meta.c} cor="#B8955A" rotulo="Carbo g" /><Anel v={tot.g} meta={meta.g} cor="#D29B3C" rotulo="Gordura g" /><Anel v={tot.k} meta={meta.k} cor="#EDE6D6" rotulo="kcal" /></div>
      {Math.abs(f - 1) >= 0.03 && <p className="mini" style={{ margin: '-4px 4px 10px' }}>Porções ajustadas à meta atual ({f > 1 ? '+' : ''}{Math.round((f - 1) * 100)}% em relação ao plano base).</p>}
      {MOD().dieta.refeicoes.map((r: any) => (
        <div key={r.id} className="card ref"><h5>{r.nome}<span>{r.hora} · {Math.round(r.itens.reduce((s: number, i: any) => s + i[2], 0) * f)} kcal</span></h5>
          {r.itens.map((it: any, i: number) => { const id = r.id + ':' + i; return (
            <div key={id} className="item"><div>{it[0]}<small>{porcao(it[1], f)} · {Math.round(it[2] * f)} kcal</small></div><button className={'chk' + (feitos.includes(id) ? ' on' : '')} onClick={() => marca(id)} aria-label="Comi" /></div>) })}
        </div>))}
      <div className="card"><h4>Fora do plano <span className="maq" style={{ letterSpacing: 0, textTransform: 'none' }}>{num(fora)} kcal hoje</span></h4>
        <p className="mini" style={{ marginBottom: 8 }}>Comeu fora? Registra igual. Sem número vermelho e sem bronca: o ajuste da semana usa o que aconteceu, não o que era pra acontecer.</p>
        <div className="chips" style={{ margin: 0 }}>{foraPadrao.map(([k, t]) => <button key={k} className="chip" onClick={() => foraDoPlano(k)}>{t}</button>)}{fora > 0 && <button className="chip" onClick={() => foraDoPlano(0)}>zerar</button>}</div></div>
      <p className="mini" style={{ padding: '0 4px' }}>{MOD().dieta.nota}</p>
    </>
  )
}

function Sono() {
  const { a, salvar, toast } = useAluna()
  const lista = (a.sono || []).slice().sort((x: any, y: any) => (x.data < y.data ? 1 : -1)); const ult = lista[0]; const sc = sonoScore(ult)
  const [deitou, setDeitou] = useState(ult ? ult.deitou : '23:00'); const [levantou, setLevantou] = useState(ult ? ult.levantou : '06:30'); const [nota, setNota] = useState(4)
  const R = 62, L = Math.PI * R * 1.5, p = sc ? sc.pct / 100 : 0
  const horas = lista.slice(0, 7).map((s: any) => { const [h, m] = s.deitou.split(':').map(Number); return (h < 12 ? h + 24 : h) * 60 + m })
  const spread = horas.length > 2 ? Math.max(...horas) - Math.min(...horas) : 0
  const dica = !ult ? 'Registra a primeira noite para o prontuário começar a contar.' : spread > 60 ? `Teus horários de dormir variaram ${Math.round(spread / 60 * 10) / 10} h nesta semana. Tenta deitar sempre no mesmo horário.` : sc!.min < 420 ? 'Menos de 7 h na cama. Tenta adiantar 30 min a hora de deitar.' : 'Horário estável e tempo de cama bom. Mantém.'
  const d7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * DIA); return { d, on: lista.some((s: any) => s.data === chaveDia(d)) } })
  const registrar = () => { const reg = { data: hojeISO(), deitou: deitou || '23:00', levantou: levantou || '06:30', nota }; salvar({ sono: [...(a.sono || []).filter((s: any) => s.data !== reg.data), reg].sort((x: any, y: any) => (x.data < y.data ? -1 : 1)).slice(-30) }); toast('Noite registrada.') }
  return (
    <>
      <div className="card" style={{ textAlign: 'center' }}><h4>Pontuação do sono <span className="mini" style={{ textTransform: 'none', letterSpacing: 0 }}>{ult ? dataCurta(dt(ult.data + 'T12:00')) : ''}</span></h4>
        <svg viewBox="0 0 160 130" width="180" role="img" aria-label="Pontuação do sono"><path d="M36 116 A62 62 0 1 1 124 116" fill="none" stroke="#ffffff12" strokeWidth="10" strokeLinecap="round" /><path d="M36 116 A62 62 0 1 1 124 116" fill="none" stroke="#D9BE86" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${L * p} ${L}`} /><text x="80" y="72" textAnchor="middle" fill="#A89A80" fontSize="10">pontuação</text><text x="80" y="100" textAnchor="middle" fill="#EDE6D6" fontSize="30" fontFamily="Alfa Slab One">{sc ? sc.pct + '%' : '—'}</text></svg>
        {ult && <p className="maq mini">Na cama: {ult.deitou} – {ult.levantou} · {Math.floor(sc!.min / 60)}h{String(sc!.min % 60).padStart(2, '0')}</p>}
        <div className="semana-dots" style={{ justifyContent: 'center' }}>{d7.map((x, i) => <div key={i}><i className={x.on ? 'on' : ''} />{DIAS[x.d.getDay()].slice(0, 3)}</div>)}</div></div>
      <div className="card"><h4>Melhoria pendente</h4><p style={{ fontSize: 14 }}>{dica}</p></div>
      <div className="card"><h4>Esta noite</h4>
        <div className="linha2"><div><label className="lbl" htmlFor="sD">Deitei</label><input id="sD" type="time" value={deitou} onChange={(e) => setDeitou(e.target.value)} style={{ width: '100%' }} /></div><div><label className="lbl" htmlFor="sL">Levantei</label><input id="sL" type="time" value={levantou} onChange={(e) => setLevantou(e.target.value)} style={{ width: '100%' }} /></div></div>
        <span className="lbl">Como acordei</span><div className="chips">{['Moída', 'Cansada', 'Ok', 'Bem', 'Inteira'].map((t, i) => <button key={t} className={'chip' + (nota === i + 1 ? ' on' : '')} onClick={() => setNota(i + 1)}>{t}</button>)}</div>
        <button className="btn" style={{ width: '100%' }} onClick={registrar}>Registrar a noite</button></div>
    </>
  )
}

export default function Rotina() {
  const [aba, setAba] = useState<'comida' | 'sono'>('comida')
  return (
    <div className="app-conteudo uma">
      <div className="coluna">
        <div className="saud"><div className="data">{dataLonga(agora())}</div><h1>Rotina</h1></div>
        <div className="seg"><button className={aba === 'comida' ? 'on' : ''} onClick={() => setAba('comida')}>Comida</button><button className={aba === 'sono' ? 'on' : ''} onClick={() => setAba('sono')}>Sono</button></div>
        {aba === 'sono' ? <Sono /> : <Comida />}
      </div>
    </div>
  )
}
