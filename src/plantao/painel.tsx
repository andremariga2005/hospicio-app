// Administração do Abel: o painel consolidado de todos os alunos, a página individual de cada um
// e a entrada de fichas de anamnese. Tudo lido do banco; nada aqui apaga dado.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Cab, usePlantao } from './Plantao'
import {
  agora, alvoSemana, baseGrupo, brl, chaveDia, ciclo, consist, dataCurta, DIA, diaDe, diasSemTreino, dt, estado, feitosSemana, fmtKg, gastoEstimado, ha,
  iniciais, metaNutri, noRadar, notaPlacar, num, OP, pctSemana, placar, precoMes, primeiro, radar, semanaISO, tendencia, ultimoCheckin, volAtivo,
} from '../lib/metodo'
import { medalhas, nivel, pontos, sequenciaDiario, sequenciaSemanas } from '../lib/jogo'
import { anamneseDoAluno, api, historicoAluno, marcarAnamnese } from '../lib/dados'
import { alertas, ETAPAS, textoResposta, visivel } from '../content/anamnese'
import { Barras, Calor, COR, Linha, Segmentos } from '../components/graficos'
import { Tag, Veredito } from '../components/ui'
import CorpoOrbita from '../components/CorpoOrbita'
import { itensOrbita, regioes as regioesDe, regioesTodos } from '../lib/corpo'

const semanaDe = (i: number) => semanaISO(new Date(Date.now() - i * 7 * DIA))
const rotSem = (wk: string) => 'S' + wk.slice(-2)
const corEstado: any = { bom: COR.bom, atencao: COR.atencao, risco: COR.risco, latao: COR.latao }
const Kpi = ({ t, v, s, alerta }: any) => <div className={'kpi' + (alerta ? ' kpi-alerta' : '')}><small>{t}</small><b>{v}</b><span>{s}</span></div>

/** último acesso de cada aluno (pelo user_id) */
function useUltimoAcesso() {
  const { acessos } = usePlantao()
  return useMemo(() => { const m: Record<string, { ult: string; n30: number }> = {}; const lim = Date.now() - 30 * DIA
    ;(acessos || []).forEach((x: any) => { const r = (m[x.user_id] = m[x.user_id] || { ult: x.em, n30: 0 }); if (x.em > r.ult) r.ult = x.em; if (+dt(x.em) > lim) r.n30++ }); return m }, [acessos])
}

/* =================== PAINEL CONSOLIDADO =================== */
export function Painel() {
  const { alunos, execucoes, anamneses, ir, abrirFicha } = usePlantao(); const op = OP(); const acessos = useUltimoAcesso()
  const rec = alunos.reduce((s: number, a: any) => s + precoMes(a.plano), 0)
  const wk = semanaISO(agora())
  const sems = Array.from({ length: 8 }, (_, i) => semanaDe(8 - i))
  const consistSem = sems.map((w) => { const vs = alunos.filter((a: any) => semanaISO(dt(a.inicio)) <= w).map((a: any) => Math.min(100, pctSemana(a, w))); return { r: rotSem(w), v: vs.length ? Math.round(vs.reduce((s: number, v: number) => s + v, 0) / vs.length) : null } })
  const semAtual = (() => { const vs = alunos.map((a: any) => Math.min(100, pctSemana(a, wk))); return Math.round(vs.reduce((s: number, v: number) => s + v, 0) / Math.max(1, vs.length)) })()
  const dias28 = Array.from({ length: 28 }, (_, i) => { const d = new Date(Date.now() - (27 - i) * DIA); return { k: chaveDia(d), r: dataCurta(d) } })
  const treinosDia = dias28.map((d) => ({ r: d.r, v: alunos.reduce((s: number, a: any) => s + (a.logs || []).filter((l: any) => chaveDia(dt(l.data)) === d.k).length, 0) }))
  const diario14 = dias28.slice(-14).map((d) => ({ r: d.r, v: Math.round(100 * alunos.filter((a: any) => { const x = diaDe(a, d.k); return x.manha || x.noite }).length / Math.max(1, alunos.length)) }))
  const est: any = { bom: 0, atencao: 0, risco: 0, latao: 0 }; alunos.forEach((a: any) => { est[estado(a).k]++ })
  const planos = ['Full Access', 'Premium', 'Essential'].map((p, i) => ({ r: p, v: alunos.filter((a: any) => a.plano === p).length, cor: [COR.latao2, COR.latao, COR.apagado][i] }))
  const fila = execucoes.filter((x: any) => x.status === 'aguardando'); const rad = noRadar(alunos)
  const fichasNovas = (anamneses || []).filter((f: any) => f.status === 'pendente')
  const ren = alunos.filter((a: any) => ciclo(a).renovaEm <= 14 && (a.renovacao || {}).status !== 'renovou'); const renV = ren.reduce((s: number, a: any) => s + ((op.precos || {})[a.plano] || 0), 0)
  const cs = alunos.map(consist).filter((x: any) => x != null) as number[]; const media = cs.length ? Math.round(cs.reduce((a, b) => a + b, 0) / cs.length) : 0
  const ativos7 = alunos.filter((a: any) => { const u = a.user_id && acessos[a.user_id]; return (u && Date.now() - +dt(u.ult) < 7 * DIA) || diasSemTreino(a) < 7 }).length
  const ranking = alunos.map((a: any) => ({ a, c: consist(a) })).filter((x: any) => x.c != null).sort((x: any, y: any) => y.c - x.c)
  const nutP = alunos.filter((a: any) => { const c = ultimoCheckin(a); return c && c.status === 'pendente' })
  const acoes: any[] = []
  if (fichasNovas.length) acoes.push([`${fichasNovas.length} ficha${fichasNovas.length > 1 ? 's' : ''} de anamnese para aprovar`, fichasNovas.slice(0, 3).map((f: any) => primeiro(f.nome)).join(', '), 'fichas'])
  if (fila.length) acoes.push([`${fila.length} execuç${fila.length === 1 ? 'ão' : 'ões'} na fila de 24 h`, 'Mais antiga primeiro', 'fila'])
  if (rad.length) acoes.push([`${rad.length} no radar de desistência`, rad.slice(0, 3).map((x: any) => primeiro(x.a.nome)).join(', '), 'radar'])
  if (nutP.length) acoes.push([`${nutP.length} ajuste${nutP.length > 1 ? 's' : ''} de dieta para aprovar`, nutP.slice(0, 3).map((a: any) => primeiro(a.nome)).join(', '), 'nutricao'])
  if (ren.length) acoes.push([`${ren.length} renovaç${ren.length > 1 ? 'ões' : 'ão'} em 14 dias`, `${brl(renV)} em jogo`, 'renovacoes'])

  return (<>
    <Cab titulo="Painel" sub={`${alunos.length} alunos. Consolidado de treino, diário, comida e negócio — clique em qualquer aluno para abrir a página dele.`} />
    <div className="kpis kpis6">
      <Kpi t="Alunos ativos" v={alunos.length} s={`${ativos7} movimentaram nos últimos 7 dias`} />
      <Kpi t="Recorrente / mês" v={brl(rec)} s={`meta ${brl(op.meta)}`} />
      <Kpi t="Consistência média" v={`${media}%`} s="últimas 4 semanas fechadas" />
      <Kpi t="Fila 24 h" v={fila.length} s={fila.length ? 'execuções esperando' : 'zerada'} alerta={fila.some((x: any) => Date.now() - +dt(x.enviado_em) > 20 * 36e5)} />
      <Kpi t="Radar" v={rad.length} s="com 3+ pontos de risco" alerta={rad.length > 0} />
      <Kpi t="Fichas novas" v={fichasNovas.length} s="anamneses para aprovar" alerta={fichasNovas.length > 0} />
    </div>

    {acoes.length > 0 && <div className="bloco"><h3>O que pede ação hoje</h3>{acoes.map((x, i) => <div key={i} className="acao"><span className="n">{String(i + 1).padStart(2, '0')}</span><div className="c"><b>{x[0]}</b><small>{x[1]}</small></div><button className="btn sec peq" onClick={() => ir(x[2])}>Abrir</button></div>)}</div>}

    <div className="grade2">
      <div className="bloco"><h3>Consistência média por semana <span className="mini">semanas fechadas · faixa = régua dos 75%</span></h3>
        <Linha alt="Consistência média dos alunos nas últimas 8 semanas" pts={consistSem} fmt={(v) => `${v}%`} faixa={[75, 100]} /><p className="mini">Semana em curso, até agora: {semAtual}% da meta.</p></div>
      <div className="bloco"><h3>Corpo da consultoria <span className="mini">% das alunas que bateram o volume de cada músculo na semana</span></h3>
        <CorpoOrbita regioes={regioesTodos(alunos)} altura={330} legenda={false} unidade="alunas" /></div>
    </div>
    <div>
      <div className="bloco"><h3>Estado dos alunos</h3>
        <Segmentos alt="Alunos por estado" itens={[{ r: 'Dentro dos 75%', v: est.bom, cor: COR.bom }, { r: 'Abaixo', v: est.atencao, cor: COR.atencao }, { r: 'Em risco / sumiu', v: est.risco, cor: COR.risco }, { r: 'Começando', v: est.latao, cor: COR.latao }]} />
        <h3 style={{ marginTop: 22 }}>Planos</h3>
        <Segmentos alt="Alunos por plano" itens={planos} />
        <p className="mini" style={{ marginTop: 10 }}>{planos.map((p) => `${p.r}: ${brl(p.v * precoMes(p.r))}/mês`).join(' · ')}</p></div>
    </div>
    <div className="grade2">
      <div className="bloco"><h3>Treinos registrados por dia · 28 dias</h3><Barras alt="Treinos por dia nos últimos 28 dias" dados={treinosDia} h={150} /></div>
      <div className="bloco"><h3>Adesão ao diário · 14 dias <span className="mini">% dos alunos que responderam</span></h3><Barras alt="Percentual de alunos que responderam o diário" dados={diario14} fmt={(v) => `${v}%`} max={100} h={150} /></div>
    </div>
    <div className="grade2">
      <div className="bloco"><h3>Mais consistentes</h3>{ranking.slice(0, 6).map(({ a, c }: any) => <LinhaAluno key={a.id} a={a} dir={`${c}%`} onClick={() => abrirFicha(a.id)} />)}</div>
      <div className="bloco"><h3>Precisam de atenção</h3>{[...rad.map((x: any) => x.a), ...ranking.slice().reverse().map((x: any) => x.a)].filter((a: any, i: number, l: any[]) => l.findIndex((b) => b.id === a.id) === i).slice(0, 6).map((a: any) => <LinhaAluno key={a.id} a={a} dir={estado(a).t} onClick={() => abrirFicha(a.id)} />)}</div>
    </div>
  </>)
}

function LinhaAluno({ a, dir, onClick }: any) {
  const st = estado(a)
  return <button className="lin-aluno" onClick={onClick}><div className="av" style={{ width: 30, height: 30, fontSize: 11 }}>{iniciais(a.nome)}</div><div className="c"><b>{a.nome}</b><small>{a.plano} · semana {ciclo(a).semana}/8</small></div><span className="d"><i style={{ background: corEstado[st.k] }} />{dir}</span></button>
}

/* =================== PÁGINA INDIVIDUAL =================== */
export function PaginaAluno() {
  const { alunos, execucoes, salvarAluno, toast } = usePlantao(); const { id } = useParams(); const navegar = useNavigate(); const acessos = useUltimoAcesso()
  const a = alunos.find((x: any) => x.id === id)
  const [ficha, setFicha] = useState<any>(null); const [hist, setHist] = useState<any[]>([]); const [aba, setAba] = useState('visao')
  const [laudoTxt, setLaudoTxt] = useState(''); const [acesso, setAcesso] = useState<string | null>(null)
  const gerarLink = async () => { try { const r = await api('/api/convidar', { acao: 'link', aluno_id: id }); if (r.link) setAcesso(r.link); else toast('Não veio link.') } catch (er: any) { toast(er.message || 'Não consegui gerar o link.') } }
  useEffect(() => { if (!id) return; anamneseDoAluno(id).then(setFicha).catch(() => {}); historicoAluno(id).then(setHist).catch(() => {}) }, [id])
  if (!a) return <div className="bloco vazio">Aluno não encontrado. <button className="ab-link" onClick={() => navegar('/plantao/alunos')}>Voltar</button></div>

  const c = ciclo(a), st = estado(a), r = radar(a), cs = consist(a), t = tendencia(a), ex = execucoes.filter((x: any) => x.aluno_id === a.id)
  const p = pontos(a, ex), nv = nivel(p.total), ms = medalhas(a, ex)
  const u = a.user_id && acessos[a.user_id]
  const sems = Object.keys(a.semanas || {}).sort()
  const barrasSem = sems.slice(-12).map((w) => { const v = pctSemana(a, w); return { r: rotSem(w), v: Math.min(150, v), cor: v >= 75 ? COR.bom : v >= 50 ? COR.atencao : COR.risco, dica: `${w}: ${feitosSemana(a, w)} de ${alvoSemana(a, w)} treinos (${v}%)` } })
  const dias56 = Array.from({ length: 56 }, (_, i) => { const d = new Date(Date.now() - (55 - i) * DIA); const k = chaveDia(d); const x = diaDe(a, k); return { k, r: dataCurta(d), v: x.manha || x.noite ? notaPlacar(placar(a, k)) : null } })
  const sono28 = Array.from({ length: 28 }, (_, i) => { const d = new Date(Date.now() - (27 - i) * DIA); const k = chaveDia(d); const s = (diaDe(a, k).manha || {}).sono_h; return { r: dataCurta(d), v: s ?? null } })
  const pesoPts = t ? t.mm.slice(-60).map((m: any) => ({ r: dataCurta(m.d), v: Math.round(m.kg * 10) / 10 })) : []
  const g = a.plano === 'Full Access' ? gastoEstimado(a) : null
  const vg = volAtivo(a)
  const e = a.entrada
  const pendLaudo = (a.laudos || []).map((l: any, i: number) => ({ l, i })).filter((x: any) => !x.l.nota)
  const linhaTempo = [
    ...(a.logs || []).map((l: any) => ({ em: l.data, t: `Treino ficha ${l.ficha}`, s: `${l.series} séries · ${l.duracao} min · ${num(l.volume || 0)} kg`, k: 'treino' })),
    ...ex.map((x: any) => ({ em: x.enviado_em, t: `Execução: ${x.exercicio}`, s: x.status === 'respondido' ? `Veredito: ${x.veredito}` : 'Esperando resposta', k: 'exec' })),
    ...(a.laudos || []).map((l: any) => ({ em: l.data, t: `Laudo de ${l.tipo === 'video' ? 'vídeo' : 'fotos'}`, s: l.nota || 'Sem laudo escrito ainda', k: 'laudo' })),
    ...(a.fechamentos || []).map((f: any) => ({ em: f.em, t: `Fechamento da semana · ${f.nota}/5`, s: [f.vitoria && `Vitória: ${f.vitoria}`, f.atrapalhou && `Atrapalhou: ${f.atrapalhou}`].filter(Boolean).join(' · '), k: 'fech' })),
    ...((a.nutri || {}).checkins || []).map((x: any) => ({ em: x.em, t: 'Check-in de dieta', s: `${x.status} · proposta ${num(x.sugerido?.k || 0)} kcal`, k: 'nutri' })),
  ].sort((x, y) => (x.em < y.em ? 1 : -1))
  const escreverLaudo = (i: number) => { if (!laudoTxt.trim()) return; salvarAluno(a.id, { laudos: (a.laudos || []).map((l: any, j: number) => (j === i ? { ...l, nota: laudoTxt.trim().slice(0, 600) } : l)) }); setLaudoTxt(''); toast('Laudo no app da aluna.') }
  const ABAS = [['visao', 'Visão'], ['treino', 'Treino'], ['corpo', 'Corpo e diário'], ['ficha', 'Ficha de entrada'], ['historico', 'Histórico']]

  return (<>
    <button className="btn-voltar" onClick={() => { if (window.history.state && window.history.state.idx > 0) navegar(-1); else navegar('/plantao/alunos') }}><span aria-hidden="true">‹</span> Voltar</button>
    <div className="al-cab">
      <div className="av g">{iniciais(a.nome)}</div>
      <div className="c"><h1>{a.nome}</h1><div className="mini">{[a.cidade, a.idade && `${a.idade} anos`, a.nivel, a.plano].filter(Boolean).join(' · ')}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}><Tag k={st.k}>{st.t}</Tag>{r.pontos >= 3 && <Tag k="risco">Radar · {r.pontos} pts</Tag>}{a.massaMagra?.ativo && <Tag k="latao">Usa caneta</Tag>}{a.demo && <Tag>exemplo</Tag>}</div></div>
      <div className="al-acoes" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn sec peq" onClick={gerarLink}>Gerar link de acesso</button><button className="btn sec peq" onClick={() => navegar(`/plantao/ver/${a.id}`)}>Ver o app dela</button></div>
    </div>
 {acesso && <LinkAcesso nome={a.nome} whatsapp={a.entrada?.whatsapp} link={acesso} onFechar={() => setAcesso(null)} />}
    <div className="kpis kpis6">
      <Kpi t="Ciclo" v={`${c.semana}/8`} s={`ciclo ${c.n} · renova em ${c.renovaEm}d`} />
      <Kpi t="Consistência" v={cs == null ? '—' : `${cs}%`} s={`${a.freq}x por semana prescrito`} />
      <Kpi t="Sequência" v={sequenciaSemanas(a)} s="semanas seguidas nos 75%" />
      <Kpi t="Nível" v={nv.n} s={`${nv.nome} · ${num(p.total)} pts`} />
      <Kpi t="Último treino" v={a.ultimoTreino ? ha(a.ultimoTreino).replace('há ', '') : '—'} s={`${(a.logs || []).length} treinos no total`} />
      <Kpi t="Último acesso" v={u ? ha(u.ult).replace('há ', '') : '—'} s={u ? `${u.n30} acessos em 30 dias` : 'ainda não registrado'} />
    </div>
    <div className="abas">{ABAS.map(([k, tt]) => <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{tt}</button>)}</div>

    {aba === 'visao' && <>
      <div className="bloco corpo-bloco"><h3>Corpo em órbita <span className="mini">músculos da semana · hoje, semana e ciclo em volta</span></h3>
        <CorpoOrbita regioes={regioesDe(a)} itens={itensOrbita(a, ex)} altura={430} /></div>
      {(r.motivos.length > 0 || pendLaudo.length > 0) && <div className={r.motivos.length > 0 && pendLaudo.length > 0 ? 'grade2' : ''}>
        {r.motivos.length > 0 && <div className="bloco"><h3>Sinais de risco</h3>{r.motivos.map((m: any, i: number) => <div key={i} className="acao"><div className="c"><b>{m.t}</b><small>{m.acao}</small></div></div>)}</div>}
        {pendLaudo.length > 0 && <div className="bloco"><h3>Laudo para escrever</h3><p className="mini">Enviado {ha(pendLaudo[pendLaudo.length - 1].l.data)}</p><textarea value={laudoTxt} onChange={(ev) => setLaudoTxt(ev.target.value)} placeholder="O que mudou e o que fazer agora." style={{ width: '100%', minHeight: 80, marginTop: 8 }} /><button className="btn peq" style={{ marginTop: 8 }} onClick={() => escreverLaudo(pendLaudo[pendLaudo.length - 1].i)}>Mandar o laudo</button></div>}
      </div>}
      <div className="grade2">
        <div className="bloco"><h3>Semanas · % da meta <span className="mini">verde ≥ 75%</span></h3>{barrasSem.length ? <Barras alt="Percentual da meta semanal" dados={barrasSem} fmt={(v) => `${v}%`} meta={{ v: 75, r: '75%' }} /> : <p className="mini">Sem semanas registradas.</p>}</div>
        <div className="bloco"><h3>Placar do diário · 8 semanas <span className="mini">mais escuro = dia mais completo</span></h3><Calor alt="Placar diário das últimas 8 semanas" dias={dias56} /><p className="mini" style={{ marginTop: 8 }}>{sequenciaDiario(a)} dias seguidos respondendo · {dias56.filter((d) => d.v != null).length} de 56 dias com registro</p></div>
      </div>
      <div className="grade2">
        <div className="bloco"><h3>Peso · média de 7 dias</h3>{pesoPts.length > 1 ? <Linha alt="Peso, média móvel de 7 dias" pts={pesoPts} fmt={(v) => `${fmtKg(v)} kg`} pontos={false} /> : <p className="mini">Sem pesagens suficientes.</p>}{t?.delta != null && <p className="mini">{t.delta > 0 ? '+' : ''}{fmtKg(t.delta)} kg nas últimas 2 semanas</p>}</div>
        <div className="bloco"><h3>Último veredito e objetivo</h3>{a.ultimoVeredito ? <div className="veredito"><Veredito v={a.ultimoVeredito.veredito} /><div>{a.ultimoVeredito.exercicio} · {ha(a.ultimoVeredito.em)}{a.ultimoVeredito.resposta && <p className="nota-abel">{a.ultimoVeredito.resposta}</p>}</div></div> : <p className="mini">Nenhum veredito ainda.</p>}<p style={{ marginTop: 12, fontSize: 14 }}><span className="mini">Objetivo: </span>{a.objetivo || e?.objetivo || '—'}</p>{a.assistente?.nome && <p className="mini" style={{ marginTop: 6 }}>Chama a assistente de {a.assistente.nome}</p>}</div>
      </div>
    </>}

    {aba === 'treino' && <>
      <div className="bloco"><h3>Volume por músculo · ciclo {c.n}</h3>
        <table className="tabela"><thead><tr><th>Músculo</th><th>Base</th><th>Ajuste</th><th>Séries/semana</th><th>Último motivo</th></tr></thead><tbody>
          {Object.keys(vg).length ? Object.entries(vg).map(([gr, x]: any) => <tr key={gr}><td>{gr}</td><td className="num">{baseGrupo(gr)}</td><td className="num">{x.delta > 0 ? '+' : ''}{x.delta}</td><td className="num">{Math.max(1, baseGrupo(gr) + x.delta)}</td><td className="mini">{x.ult?.motivo || '—'}</td></tr>) : <tr><td colSpan={5} className="mini">Volume na base do ciclo.</td></tr>}</tbody></table>
        <button className="btn sec peq" style={{ marginTop: 10 }} onClick={() => { salvarAluno(a.id, { volume: { ciclo: c.n, grupos: {} } }); toast('Volume voltou à base do ciclo. A versão anterior fica no histórico.') }}>Voltar ao volume base</button></div>
      <div className="grade2">
        <div className="bloco"><h3>Recordes</h3>{Object.entries(a.recordes || {}).map(([k, v]: any) => <div key={k} className="acao"><div className="c"><b>{k}</b><small>{v}</small></div></div>)}{!Object.keys(a.recordes || {}).length && <p className="mini">Sem recordes ainda.</p>}</div>
        <div className="bloco"><h3>Execuções enviadas</h3>{ex.slice(0, 10).map((x: any) => <div key={x.id} className="acao"><div className="c"><b>{x.exercicio}</b><small>{ha(x.enviado_em)}{x.resposta ? ` · ${x.resposta}` : ''}</small></div>{x.veredito ? <Veredito v={x.veredito} peq /> : <Tag k="atencao">esperando</Tag>}</div>)}{!ex.length && <p className="mini">Nenhuma execução enviada.</p>}</div>
      </div>
      <div className="bloco"><h3>Conquistas · {ms.filter((m) => m.ok).length} de {ms.length}</h3><div className="medalhas">{ms.map((m) => <div key={m.id} className={'medalha' + (m.ok ? ' ok' : '')}><div className="ic">{m.ok ? '★' : `${m.prog}/${m.alvo}`}</div><b>{m.nome}</b></div>)}</div></div>
    </>}

    {aba === 'corpo' && <>
      <div className="grade2">
        <div className="bloco"><h3>Sono · 28 dias <span className="mini">faixa verde = 7 h ou mais</span></h3><Linha alt="Horas de sono nos últimos 28 dias" pts={sono28} fmt={(v) => `${fmtKg(v)} h`} faixa={[7, 9]} /></div>
        <div className="bloco"><h3>Dieta {a.plano === 'Full Access' ? '' : '· fora do plano'}</h3>{g ? <><p>Meta: <b>{num(metaNutri(a).k)} kcal</b></p><p className="mini" style={{ marginTop: 6 }}>{g.ok ? `Gasto estimado ~${num(g.gasto)} kcal · ${g.dias} dias registrados em 21` : 'Ainda sem dados para estimar o gasto.'}</p></> : <p className="mini">A dieta adaptativa é do Full Access.</p>}</div>
      </div>
      <div className="bloco"><h3>Medidas</h3>{(a.medidas || []).length ? <table className="tabela"><thead><tr><th>Data</th><th>Cintura</th><th>Quadril</th></tr></thead><tbody>{(a.medidas || []).slice().reverse().map((m: any, i: number) => <tr key={i}><td>{m.data}</td><td className="num">{m.cintura} cm</td><td className="num">{m.quadril} cm</td></tr>)}</tbody></table> : <p className="mini">Sem medidas registradas.</p>}</div>
    </>}

    {aba === 'ficha' && <FichaEntrada ficha={ficha} />}

    {aba === 'historico' && <>
      <div className="bloco"><h3>Linha do tempo · {linhaTempo.length} registros</h3>{linhaTempo.slice(0, 120).map((x, i) => <div key={i} className="tl"><span className="tl-d">{dataCurta(dt(x.em))}</span><i className={'tl-p ' + x.k} /><div><b>{x.t}</b>{x.s && <small>{x.s}</small>}</div></div>)}</div>
      <div className="bloco"><h3>Versões guardadas · {hist.length}</h3><p className="mini">Toda alteração na ficha desta aluna guarda a versão anterior. Nada é apagado: se algo sumir, dá para recuperar daqui.</p>{hist.slice(0, 12).map((h: any) => <div key={h.id} className="acao"><div className="c"><small>{new Date(h.em).toLocaleString('pt-BR')}</small></div></div>)}</div>
    </>}
  </>)
}

function FichaEntrada({ ficha }: { ficha: any }) {
  if (!ficha) return <div className="bloco vazio">Esta aluna entrou sem ficha de anamnese no app. Mande o link da ficha para ela: <b>/anamnese</b>.</div>
  const r = ficha.respostas || {}; const al = alertas(r)
  return (<>
    <div className="bloco"><h3>Ficha de anamnese <span className="mini">preenchida {ha(ficha.criado_em)}</span></h3>
      {al.length > 0 ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{al.map((x) => <Tag key={x} k="risco">{x}</Tag>)}</div> : <Tag k="bom">Sem sinais de alerta</Tag>}</div>
    <div className="ficha-grade">{ETAPAS.map((et) => (
      <div key={et.id} className="bloco"><h3>{et.titulo}</h3>
        {et.perguntas.filter((p) => visivel(p, r) && p.tipo !== 'cpf').map((p) => <div key={p.id} className="fr"><span>{p.q}</span><b>{textoResposta(p, r)}</b></div>)}
        {et.id === 'fim' && <div className="fr"><span>CPF</span><b>{textoResposta({ id: 'cpf', q: 'CPF', tipo: 'cpf' }, r)}</b></div>}
      </div>))}</div>
  </>)
}

/* link de acesso: o aluno abre, cria a senha e cai no app */
export function LinkAcesso({ nome, whatsapp, link, onFechar }: { nome: string; whatsapp?: string; link: string; onFechar?: () => void }) {
  const { toast } = usePlantao(); const tel = String(whatsapp || '').replace(/\D/g, '').replace(/^55/, '')
  const msg = `Bem-vindo(a) ao Hospício, ${primeiro(nome)}! Teu acesso está pronto: abre este link, cria tua senha e entra no app. ${link}`
  return (<div className="bloco papel"><h3>Acesso de {primeiro(nome)} pronto</h3>
    <p style={{ fontSize: 13.5, color: '#3a342a', marginBottom: 8 }}>Manda este link para {primeiro(nome)}. Ao abrir, cria a senha e entra direto no app. Vale por tempo limitado: se expirar, gera outro na página do aluno.</p>
    <code style={{ fontSize: 12, wordBreak: 'break-all', display: 'block', background: '#0001', padding: 8, borderRadius: 8 }}>{link}</code>
    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      <button className="btn peq" style={{ background: 'var(--tinta)', color: 'var(--papel)' }} onClick={() => navigator.clipboard?.writeText(msg).then(() => toast('Mensagem com o link copiada.'), () => toast(link))}>Copiar mensagem</button>
      {tel.length >= 10 && <a className="btn peq" style={{ background: 'var(--bom)', color: 'var(--noite)' }} target="_blank" rel="noreferrer" href={`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`}>Mandar no WhatsApp</a>}
      {onFechar && <button className="btn sec peq" style={{ color: 'var(--tinta)', borderColor: '#1c191455' }} onClick={onFechar}>Fechar</button>}
    </div></div>)
}

/* =================== FICHAS NOVAS (anamneses) =================== */
export function Fichas() {
  const { anamneses, setAnamneses, recarregar, toast } = usePlantao(); const navegar = useNavigate()
  const [aberta, setAberta] = useState<string | null>(null); const [filtro, setFiltro] = useState('pendente')
  const [aj, setAj] = useState<any>({}); const [env, setEnv] = useState(false); const [acesso, setAcesso] = useState<any>(null)
  const lista = (anamneses || []).filter((f: any) => filtro === 'todas' || f.status === filtro)
  const f = (anamneses || []).find((x: any) => x.id === aberta)
  const aprovar = async () => {
    if (!aj.plano) { toast('Escolhe o plano que ela fechou.'); return }
    setEnv(true)
    try { const r = await api('/api/convidar', { anamnese_id: f.id, plano: aj.plano, freq: aj.freq || Number(f.respostas.freq_quer) || 4, inicio: new Date((aj.inicio || chaveDia(new Date())) + 'T08:00:00').toISOString() })
      toast(r.existente ? 'Ficha ligada ao aluno que já existia.' : 'Acesso criado.'); setAberta(null); await recarregar()
      if (r.link) setAcesso({ nome: f.nome, whatsapp: f.whatsapp || f.respostas?.whatsapp, link: r.link, id: r.id }); else navegar(`/plantao/aluno/${r.id}`)
    } catch (er: any) { toast(er.message || 'Não consegui aprovar.') }
    setEnv(false)
  }
  const arquivar = async (id: string, st: 'pendente' | 'arquivada') => { try { await marcarAnamnese(id, st); setAnamneses((anamneses || []).map((x: any) => (x.id === id ? { ...x, status: st } : x))); toast(st === 'arquivada' ? 'Arquivada. Continua guardada, só sai da fila.' : 'Voltou para a fila.') } catch { toast('Não consegui agora.') } }
  const link = `${location.origin}/anamnese`
  const [novo, setNovo] = useState({ nome: '', email: '', whatsapp: '' })
  const linkNovo = `${link}?${new URLSearchParams(Object.fromEntries(Object.entries(novo).filter(([, v]) => v.trim()))).toString()}`.replace(/\?$/, '')
  return (<>
    <Cab titulo="Fichas de anamnese" sub="Quem fechou a consultoria preenche a ficha. Tu revisa, escolhe o plano e o app dela nasce montado com as respostas." />
    {acesso && <><LinkAcesso nome={acesso.nome} whatsapp={acesso.whatsapp} link={acesso.link} onFechar={() => setAcesso(null)} /><button className="ab-link" style={{ margin: '-4px 0 14px' }} onClick={() => navegar(`/plantao/aluno/${acesso.id}`)}>Abrir a página de {primeiro(acesso.nome)} ›</button></>}
    <div className="bloco papel"><h3>Link para mandar depois da venda</h3><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><code style={{ fontSize: 15 }}>{link}</code><button className="btn peq" style={{ background: 'var(--tinta)', color: 'var(--papel)' }} onClick={() => navigator.clipboard?.writeText(link).then(() => toast('Link copiado.'), () => toast(link))}>Copiar</button></div></div>
    <div className="bloco"><h3>Gerar o link de um cliente novo</h3><p className="mini" style={{ marginBottom: 10 }}>Preenche o que tu já sabe: a ficha abre com isso preenchido. Ela continua salva no aparelho do cliente até ele enviar.</p>
      <div className="linha3"><input placeholder="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /><input placeholder="E-mail" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /><input placeholder="WhatsApp" value={novo.whatsapp} onChange={(e) => setNovo({ ...novo, whatsapp: e.target.value })} /></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}><code style={{ fontSize: 13, wordBreak: 'break-all' }}>{linkNovo}</code><button className="btn peq" onClick={() => navigator.clipboard?.writeText(linkNovo).then(() => toast('Link copiado.'), () => toast(linkNovo))}>Copiar</button>
        {novo.whatsapp.replace(/\D/g, '').length >= 10 && <a className="btn sec peq" target="_blank" rel="noreferrer" href={`https://wa.me/55${novo.whatsapp.replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(`Bem-vind${'o(a)'} ao Hospício, ${novo.nome.split(' ')[0] || ''}! Antes de começar, preenche tua ficha de anamnese: ${linkNovo}`)}`}>Mandar no WhatsApp</a>}</div></div>
    <div className="filtros">{[['pendente', 'Para aprovar'], ['aprovada', 'Aprovadas'], ['arquivada', 'Arquivadas'], ['todas', 'Todas']].map(([k, t]) => <button key={k} className={'chip' + (filtro === k ? ' on' : '')} onClick={() => setFiltro(k)}>{t} · {(anamneses || []).filter((x: any) => k === 'todas' || x.status === k).length}</button>)}</div>
    {lista.map((x: any) => { const al = alertas(x.respostas || {}); return (
      <div key={x.id} className="bloco">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="av">{iniciais(x.nome)}</div>
          <div style={{ flex: 1, minWidth: 200 }}><b style={{ fontWeight: 500, fontSize: 16 }}>{x.nome}</b><div className="mini">{x.email} · {x.whatsapp || ''} · enviada {ha(x.criado_em)}</div>
            <div className="mini" style={{ marginTop: 4 }}>{x.respostas?.freq_quer}x por semana · {(x.respostas?.dias || []).join(', ')} · {x.respostas?.idade} anos</div></div>
          {al.length ? <Tag k="risco">{al.length} alerta{al.length > 1 ? 's' : ''}</Tag> : <Tag k="bom">sem alertas</Tag>}
          <Tag k={x.status === 'pendente' ? 'atencao' : x.status === 'aprovada' ? 'bom' : ''}>{x.status}</Tag>
          <button className="btn sec peq" onClick={() => { setAberta(aberta === x.id ? null : x.id); setAj({ freq: Number(x.respostas?.freq_quer) || 4 }) }}>{aberta === x.id ? 'Fechar' : 'Abrir'}</button>
        </div>
        {aberta === x.id && f && (<div style={{ marginTop: 14 }}>
          <FichaEntrada ficha={f} />
          {f.status !== 'aprovada' ? (
            <div className="bloco papel"><h3>Aprovar e criar o acesso</h3>
              <div className="linha3">
                <div><label className="lbl">Plano que fechou</label><select value={aj.plano || ''} onChange={(e) => setAj({ ...aj, plano: e.target.value })} style={{ width: '100%' }}><option value="">Escolher…</option>{['Full Access', 'Premium', 'Essential'].map((p) => <option key={p}>{p}</option>)}</select></div>
                <div><label className="lbl">Treinos por semana</label><input type="number" min={1} max={7} value={aj.freq || ''} onChange={(e) => setAj({ ...aj, freq: +e.target.value })} style={{ width: '100%' }} /></div>
                <div><label className="lbl">Início do ciclo</label><input type="date" value={aj.inicio || chaveDia(new Date())} onChange={(e) => setAj({ ...aj, inicio: e.target.value })} style={{ width: '100%' }} /></div>
              </div>
              <p className="mini" style={{ marginTop: 10, color: '#6b6150' }}>Ao aprovar, sai um link de acesso para mandar no WhatsApp: ela cria a senha e o app já abre com objetivo, dias, tempo de treino, exercícios que ama e odeia, preferências de comida e o peso de entrada.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}><button className="btn peq" style={{ background: 'var(--tinta)', color: 'var(--papel)' }} disabled={env} onClick={aprovar}>{env ? 'Criando…' : 'Aprovar e criar o acesso'}</button>
                {f.status === 'pendente' ? <button className="btn sec peq" style={{ color: 'var(--tinta)', borderColor: '#1c191455' }} onClick={() => arquivar(f.id, 'arquivada')}>Arquivar</button> : <button className="btn sec peq" style={{ color: 'var(--tinta)', borderColor: '#1c191455' }} onClick={() => arquivar(f.id, 'pendente')}>Voltar para a fila</button>}</div>
            </div>) : f.aluno_id && <button className="btn peq" onClick={() => navegar(`/plantao/aluno/${f.aluno_id}`)}>Abrir a página da aluna</button>}
        </div>)}
      </div>) })}
    {!lista.length && <div className="bloco vazio">Nenhuma ficha aqui.</div>}
  </>)
}

void consist; void diasSemTreino
