import { useAluna } from './ctx'
import {
  agora, alvoProteina, alvoSemana, ciclo, dataLonga, diaDe, doseDe, feitosSemana, fichaPorId, fmtKg, ha, hojeISO,
  notaPlacar, placar, primeiro, prontidaoHoje, proteinaHoje, proximaFicha, proximaRefeicao, semanaISO, seriesNoDia, tendencia, treinouHoje,
} from '../lib/metodo'
import { missoes } from '../lib/jogo'
import { Assistente } from './Assistente'
import { NivelCard, NivelFaixa } from './Jogo'
import { Tag, Veredito } from '../components/ui'

export default function Hoje() {
  const { a, salvar, abrir, treinar, ir, abrirIA } = useAluna()
  const wk = semanaISO(agora()), c = ciclo(a), alvo = alvoSemana(a, wk), feitos = feitosSemana(a, wk), pct = Math.round(100 * feitos / Math.max(1, alvo))
  const meta75 = Math.ceil(alvo * 0.75), falta = Math.max(0, meta75 - feitos)
  const sr = a.semanaReal && a.semanaReal.semana === wk ? a.semanaReal : null
  const pr0 = prontidaoHoje(a), dose = doseDe(pr0)
  const f = sr && sr.dias <= 2 ? fichaPorId('S') : proximaFicha(a)
  const nSer = f.exercicios.reduce((s: number, e: any) => s + seriesNoDia(a, f, e), 0)
  const v = a.ultimoVeredito; const fa = a.plano === 'Full Access'; const pr = proximaRefeicao()
  const mm = a.massaMagra && a.massaMagra.ativo; const ap = mm ? alvoProteina(a) : null; const pg = mm ? proteinaHoje(a) : 0
  const pedeFech = !(a.fechamentos || []).some((x: any) => x.semana === wk) && [0, 5, 6].includes(agora().getDay())
  const maisProteina = (g: number) => { const atual = a.proteina && a.proteina.dia === hojeISO() ? a.proteina.g : 0; salvar({ proteina: { dia: hojeISO(), g: g ? atual + g : 0 } }) }
  const nomeIA = a.assistente?.nome || ''
  const ms = missoes(a, nomeIA); const feitas = ms.filter((m) => m.ok).length
  const t = tendencia(a); const ontem = new Date(Date.now() - 864e5); const kOntem = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`
  const plHoje = notaPlacar(placar(a)), plOntem = notaPlacar(placar(a, kOntem))
  const h = agora().getHours()

  const acao = (x: string) => {
    if (x === 'assistente') abrirIA(false)
    else if (x === 'assistente-noite') abrirIA(true)
    else if (x === 'treinar') treinar(f.id)
    else if (x) ir(x)
  }
  /* a próxima coisa a fazer, uma só */
  const proxima = (() => {
    if (!nomeIA) return null
    const d = diaDe(a)
    if (!d.flags?.manha && h < 17) return { k: 'Agora', t: `Check-in da manhã com ${nomeIA}`, s: 'Um minuto. Define a dose do treino de hoje.', b: 'Responder', x: 'assistente' }
    const pulou = (d.manha || {}).treinoHoje === 'nao' || (d.manha || {}).treinoHoje === 'descanso'
    if (!treinouHoje(a) && !pulou) return { k: 'Agora', t: `Treino de hoje: ficha ${f.id}`, s: `${f.nome} · ~${f.tempo} min${dose ? ` · ${dose.t.toLowerCase()}` : ''}`, b: 'Treinar', x: 'treinar' }
    if (fa && !(((a.ingestao || {})[hojeISO()] || {}).k)) return { k: 'Agora', t: 'Marcar as refeições de hoje', s: 'O que tu comeu de verdade ajusta a dieta da semana.', b: 'Abrir dieta', x: 'rotina' }
    if (!d.flags?.noite && h >= 17) return { k: 'Antes de dormir', t: `Fechar o dia com ${nomeIA}`, s: 'Três perguntas e o placar do dia fecha.', b: 'Fechar o dia', x: 'assistente-noite' }
    if (pedeFech) return { k: 'Fim de semana', t: 'Fechar a semana', s: 'Uma nota, uma vitória e o que atrapalhou. O Abel lê todos.', b: 'Fechar', x: 'fechamento' }
    return { k: 'Hoje', t: 'Dia em dia.', s: d.flags?.noite ? 'Placar fechado. Descansa, que músculo cresce no descanso.' : 'O que tinha pra fazer agora está feito. À noite eu volto pra fechar o dia.', b: '', x: '' }
  })()

  return (
    <div className="app-conteudo">
      <div className="coluna">
        <div className="saud"><div className="data">{dataLonga(agora())}</div><h1>Bá, {primeiro(a.nome)}.</h1><span className="carimbo latao">Semana {String(c.semana).padStart(2, '0')} de 08 · {a.plano}</span></div>

        {!nomeIA && <Assistente onNomeado={() => abrirIA(false)} />}

        {proxima && (
          <div className="agora">
            <div><div className="k">{proxima.k}</div><b>{proxima.t}</b><small>{proxima.s}</small></div>
            {proxima.b && <button className="btn" onClick={() => (proxima.x === 'fechamento' ? abrir({ tipo: 'fechamento' }) : acao(proxima.x))}>{proxima.b}</button>}
          </div>
        )}

        <NivelFaixa onClick={() => abrir({ tipo: 'conquistas' })} />

        <div className="numeros">
          <div className="tile"><small>Semana · régua dos 75%</small><b>{feitos}/{alvo}</b><small>{pct >= 75 ? 'Semana fechada. O resto é lucro.' : falta === 1 ? 'Falta 1 treino' : `Faltam ${falta} treinos`}</small><div className="barra"><i style={{ width: `${Math.min(100, pct)}%`, background: pct >= 75 ? 'var(--bom)' : 'var(--latao)' }} /></div></div>
          <div className="tile"><small>Placar do dia</small><b>{plHoje}/4</b><small>ontem {plOntem}/4 · treino, comida, sono, diário</small></div>
          <div className="tile"><small>Peso · média 7 dias</small><b>{t ? `${fmtKg(t.atual)} kg` : '—'}</b><small>{t && t.delta != null ? `${t.delta > 0 ? '+' : ''}${fmtKg(t.delta)} kg em 2 semanas` : 'Registra o peso no check-in'}</small></div>
          <div className="tile"><small>Próximo laudo</small><b>{c.fotoEm}d</b><small>{c.fotoEm === c.videoEm ? 'Fotos + vídeo' : 'Fotos de 4 semanas'}</small></div>
        </div>

        <div className="card">
          <h4>Teu dia <span className="maq" style={{ letterSpacing: 0, textTransform: 'none' }}>{feitas} de {ms.length}</span></h4>
          {ms.map((m) => (
            <div key={m.id} className={'missao' + (m.ok ? ' ok' : '')}>
              <span className="ck">{m.ok ? '✓' : ''}</span>
              <div className="c"><b>{m.t}</b><small>{m.s}</small></div>
              {m.xp > 0 && <span className="xp">+{m.xp}</span>}
              {!m.ok && m.acao && nomeIA && !(m.id === 'noite' && h < 17) && <button className="btn sec peq" onClick={() => acao(m.acao)}>Ir</button>}
            </div>
          ))}
        </div>

        <div className={`ficha-c f${f.id}`}>
          <div className="letra">{f.id}</div><div className="sel">{f.id}</div><h3>{f.nome}</h3>
          <div className="meta">{nSer} séries válidas{dose && dose.k !== 'cheia' ? ` · ${dose.t.toLowerCase()}` : ''} · ~{f.tempo} min{a.ultimoTreino ? ` · último treino ${ha(a.ultimoTreino)}` : ''}</div>
          {pr0 && dose && <p style={{ fontSize: 13.5, margin: '0 0 12px', opacity: 0.85 }}><Tag k={dose.k === 'cheia' ? 'bom' : dose.k === 'minima' ? 'atencao' : 'risco'}>{dose.t}</Tag> {dose.x}</p>}
          <button className="btn" onClick={() => treinar(f.id)}>Treinar agora »</button>
        </div>

        {v && <div className="card"><h4>Laudo de execução <span className="mini" style={{ letterSpacing: 0, textTransform: 'none' }}>{ha(v.em)}</span></h4><div className="veredito"><Veredito v={v.veredito} /><div><b style={{ fontWeight: 500 }}>{v.exercicio}</b>{v.resposta && <p className="nota-abel" style={{ marginTop: 4 }}>{v.resposta}</p>}</div></div></div>}
      </div>

      <div className="coluna-lado">
        <div className="so-desk"><NivelCard onConquistas={() => abrir({ tipo: 'conquistas' })} /></div>
        <div className="card"><h4>A semana que tu tem {sr && <Tag k="bom">Avisado</Tag>}</h4>
          {sr ? <><div className="grande">{sr.dias} {sr.dias === 1 ? 'dia' : 'dias'} · {sr.minutos} min por treino</div>{sr.obs && <p className="mini" style={{ marginTop: 4 }}>“{sr.obs}”</p>}<p className="mini" style={{ marginTop: 6 }}>{sr.ajustado ? 'O Abel já ajustou a prescrição desta semana.' : 'O Abel recebeu. A meta da semana já mudou para caber.'}</p></>
            : <p className="mini">Semana apertada? Avisa quantos dias e quanto tempo tu tem de verdade, e a meta se ajusta.</p>}
          <button className="btn sec peq" style={{ marginTop: 10 }} onClick={() => abrir({ tipo: 'semana' })}>{sr ? 'Mudar' : 'Avisar o Abel'}</button></div>
        {mm && ap && <div className="card"><h4>Protocolo massa magra <span className="maq" style={{ letterSpacing: 0, textTransform: 'none' }}>{Math.round(pg)}/{ap.alvo} g</span></h4>
          <div className="barra" style={{ height: 8 }}><i style={{ width: `${Math.min(100, 100 * pg / ap.alvo)}%`, background: 'var(--bom)' }} /></div>
          <p className="mini" style={{ marginTop: 6 }}>Proteína de hoje. Mínimo {ap.min} g, alvo {ap.alvo} g. Força pelo menos 2x na semana: é o que segura o músculo enquanto a caneta tira gordura.</p>
          {!fa && <div className="chips" style={{ marginBottom: 0 }}>{[20, 30].map((g) => <button key={g} className="chip" onClick={() => maisProteina(g)}>+{g} g</button>)}<button className="chip" onClick={() => maisProteina(0)}>zerar</button></div>}</div>}
        {fa && pr && <div className="tile" style={{ cursor: 'pointer' }} onClick={() => ir('rotina')}><small>Próxima refeição</small><b>{pr.hora}</b><small>{pr.nome}</small></div>}
      </div>
    </div>
  )
}
