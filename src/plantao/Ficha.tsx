import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlantao } from './Plantao'
import { baseGrupo, brl, ciclo, consist, dataCurta, dt, estado, fmtKg, gastoEstimado, ha, iniciais, metaNutri, num, OP, primeiro, radar, semanaISO, agora, tendencia, volAtivo } from '../lib/metodo'
import { urlAssinada } from '../lib/dados'
import { Tag, Veredito } from '../components/ui'

function Foto({ caminho }: { caminho: string }) {
  const [u, setU] = useState<string | null>(null)
  useEffect(() => { urlAssinada(caminho).then(setU) }, [caminho])
  if (!u) return null
  return /\.(mp4|mov|webm)$/i.test(caminho) ? <video className="exec" src={u} controls playsInline /> : <a href={u} target="_blank" rel="noreferrer"><img src={u} alt="Foto do laudo" style={{ width: 96, height: 128, objectFit: 'cover', borderRadius: 8 }} /></a>
}

export default function Ficha({ id, onFechar }: { id: string; onFechar: () => void }) {
  const { alunos, salvarAluno, toast } = usePlantao(); const navegar = useNavigate()
  const a = alunos.find((x: any) => x.id === id); const [laudoTxt, setLaudoTxt] = useState('')
  if (!a) return null
  const c = ciclo(a), st = estado(a), v = a.ultimoVeredito, wk = semanaISO(agora()), sr = a.semanaReal, r = radar(a), vg = volAtivo(a), t = tendencia(a), g = a.plano === 'Full Access' ? gastoEstimado(a) : null
  const uf = (a.fechamentos || []).slice(-1)[0]
  const pendLaudo = (a.laudos || []).map((l: any, i: number) => ({ l, i })).filter((x: any) => !x.l.nota)
  const msg = (() => { const cs = consist(a); if (Date.now() - +dt(a.ultimoTreino || a.inicio) > 7 * 864e5) return `Bá, ${primeiro(a.nome)}, sumiu da ala. Me diz quantos dias tu tem essa semana que eu refaço a prescrição pra caber. Nem que seja a ficha S de 30 min.`; if ((cs ?? 100) < 75) return `${primeiro(a.nome)}, olhei tuas últimas semanas. Não é falta de vontade, é treino que não tá cabendo. Me conta como tá tua rotina que eu ajusto.`; return `${primeiro(a.nome)}, tuas últimas semanas estão dentro dos 75%. Segue assim que o laudo da semana ${c.semana <= 4 ? 4 : 8} vai mostrar.` })()
  const escreverLaudo = (i: number) => { if (!laudoTxt.trim()) return; const laudos = (a.laudos || []).map((l: any, j: number) => (j === i ? { ...l, nota: laudoTxt.trim().slice(0, 600) } : l)); salvarAluno(a.id, { laudos }); setLaudoTxt(''); toast('Laudo no app da aluna.') }
  return (
    <div className="drawer-fundo" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="drawer">
        <button className="btn sec peq" onClick={onFechar}>Fechar</button>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '18px 0' }}><div className="av g">{iniciais(a.nome)}</div><div><div style={{ fontSize: 21, fontWeight: 500 }}>{a.nome}</div><div className="mini">{a.cidade || ''} {a.idade ? `· ${a.idade} anos` : ''} {a.nivel ? `· ${a.nivel}` : ''}</div><div style={{ marginTop: 6 }}><Tag k={st.k}>{st.t}</Tag></div></div></div>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="kpi"><small>Plano</small><b style={{ fontSize: 18 }}>{a.plano}</b><span>{brl((OP().precos || {})[a.plano] || 0)} / 2 meses</span></div>
          <div className="kpi"><small>Ciclo</small><b style={{ fontSize: 22 }}>{c.semana}/8</b><span>renova em {c.renovaEm}d</span></div>
          <div className="kpi"><small>Consistência</small><b style={{ fontSize: 22 }}>{consist(a) ?? '—'}%</b><span>{a.freq}x prescrito</span></div></div>
        <div className="bloco"><h3>Objetivo</h3><p>{a.objetivo || '—'}</p>
          {a.massaMagra?.ativo && <p style={{ marginTop: 8 }}><Tag k="latao">Protocolo massa magra · usa caneta</Tag></p>}
          {a.assistente?.nome && <p className="mini" style={{ marginTop: 8 }}>Chama a assistente de <b style={{ color: 'var(--papel)' }}>{a.assistente.nome}</b></p>}</div>
        {r.motivos.length > 0 && <div className="bloco"><h3>Sinais de risco <span className="mini">{r.pontos} pts</span></h3>{r.motivos.map((m: any, i: number) => <div key={i} className="acao"><div className="c"><b>{m.t}</b><small>{m.acao}</small></div></div>)}</div>}
        {pendLaudo.length > 0 && <div className="bloco"><h3>Laudo para escrever</h3>{pendLaudo.slice(-1).map(({ l, i }: any) => (
          <div key={i}><p className="mini">{l.tipo === 'video' ? 'Vídeo' : 'Fotos'} enviadas {ha(l.data)}</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>{(l.arquivos || []).map((p: string) => <Foto key={p} caminho={p} />)}</div>
            <textarea value={laudoTxt} onChange={(e) => setLaudoTxt(e.target.value)} placeholder="O que mudou e o que fazer agora." style={{ width: '100%', minHeight: 70 }} /><button className="btn peq" style={{ marginTop: 8 }} onClick={() => escreverLaudo(i)}>Mandar o laudo</button></div>))}</div>}
        {Object.entries(vg).some(([, x]: any) => x.delta) && <div className="bloco"><h3>Volume por músculo · ciclo {c.n}</h3>
          {Object.entries(vg).filter(([, x]: any) => x.delta).map(([gr, x]: any) => <div key={gr} className="acao"><div className="c"><b>{gr}: {Math.max(1, baseGrupo(gr) + x.delta)} séries/sem ({x.delta > 0 ? '+' : '−'}{Math.abs(x.delta)})</b><small>{x.ult?.motivo}</small></div></div>)}
          <button className="btn sec peq" style={{ marginTop: 8 }} onClick={() => { salvarAluno(a.id, { volume: { ciclo: c.n, grupos: {} } }); toast('Volume voltou à base do ciclo.') }}>Voltar ao volume base</button></div>}
        <div className="bloco"><h3>Semana real</h3>{sr && sr.semana === wk ? <><p>{sr.dias} dias · {sr.minutos} min{sr.obs ? ` — “${sr.obs}”` : ''}</p><button className="btn peq" style={{ marginTop: 10 }} disabled={sr.ajustado} onClick={() => salvarAluno(a.id, { semanaReal: { ...sr, ajustado: true } })}>{sr.ajustado ? 'Ajustada' : 'Marcar como ajustada'}</button></> : <p className="suave">Não avisou mudança esta semana. Meta = {a.freq} treinos.</p>}</div>
        {(t || uf || g) && <div className="bloco"><h3>Dados da aluna</h3>{t && <p>Peso (média 7 d): {fmtKg(t.atual)} kg{t.delta != null ? ` · ${t.delta > 0 ? '+' : ''}${fmtKg(t.delta)} kg em 2 semanas` : ''}</p>}{g?.ok && <p style={{ marginTop: 6 }}>Gasto estimado: ~{num(g.gasto)} kcal · meta {num(metaNutri(a).k)} kcal</p>}{uf && <p style={{ marginTop: 6 }}>Último fechamento: {uf.nota}/5{uf.atrapalhou ? ` · atrapalhou: ${uf.atrapalhou}` : ''}</p>}</div>}
        {v && <div className="bloco"><h3>Último veredito</h3><div className="veredito"><Veredito v={v.veredito} /><div>{v.exercicio} · {ha(v.em)}{v.resposta && <p className="nota-abel">{v.resposta}</p>}</div></div></div>}
        <div className="bloco"><h3>Mensagem sugerida</h3><p style={{ fontSize: 14.5 }}>{msg}</p><button className="btn sec peq" style={{ marginTop: 10 }} onClick={() => navigator.clipboard?.writeText(msg).then(() => toast('Copiado.'), () => toast('Seleciona o texto e copia.'))}>Copiar</button></div>
        <div className="bloco"><h3>Atalhos</h3><button className="btn sec peq" onClick={() => navegar(`/plantao/ver/${a.id}`)}>Ver o app dela</button></div>
        <p className="mini">Entrou {dataCurta(dt(a.inicio))}{a.demo ? ' · aluna de exemplo' : ''}</p>
      </div>
    </div>
  )
}
