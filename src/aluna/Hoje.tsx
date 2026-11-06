import { useAluna } from './ctx'
import {
  agora, alvoProteina, alvoSemana, ciclo, dataLonga, diaDe, doseDe, feitosSemana, fichaPorId, fmtKg, ha, hojeISO,
  notaPlacar, placar, primeiro, prontidaoHoje, proteinaHoje, proximaFicha, proximaRefeicao, semanaISO, seriesNoDia, tendencia, treinouHoje,
} from '../lib/metodo'
import { missoes, nivel, pontos } from '../lib/jogo'
import { NivelCard } from './Jogo'
import CorpoOrbita from '../components/CorpoOrbita'
import { itensOrbita, regioes } from '../lib/corpo'
import { Tag, Veredito } from '../components/ui'

export default function Hoje() {
  const { a, abrir, treinar, ir, abrirAbertura, execucoes } = useAluna()
  const wk = semanaISO(agora()), c = ciclo(a), alvo = alvoSemana(a, wk), feitos = feitosSemana(a, wk)
  const sr = a.semanaReal && a.semanaReal.semana === wk ? a.semanaReal : null
  const pr0 = prontidaoHoje(a), dose = doseDe(pr0)
  const f = sr && sr.dias <= 2 ? fichaPorId('S') : proximaFicha(a)
  const nSer = f.exercicios.reduce((s: number, e: any) => s + seriesNoDia(a, f, e), 0)
  const v = a.ultimoVeredito; const vNovo = v && Date.now() - +new Date(v.em) < 3 * 864e5
  const fa = a.plano === 'Full Access'
  const pedeFech = !(a.fechamentos || []).some((x: any) => x.semana === wk) && [0, 5, 6].includes(agora().getDay())
  const nomeIA = a.assistente?.nome || 'a assistente'
  const ms = missoes(a, nomeIA); const feitas = ms.filter((m) => m.ok).length
  const d = diaDe(a), m = d.manha || {}, h = agora().getHours()
  const semTreino = m.treinoHoje === 'nao' || m.treinoHoje === 'descanso'
  const nv = nivel(pontos(a, execucoes).total); const t = tendencia(a)

  const acaoOrbita = (x?: string) => {
    if (!x) return
    if (x === 'abertura') abrirAbertura(false); else if (x === 'abertura-noite') abrirAbertura(true)
    else if (x === 'treinar') treinar(f.id); else if (x === 'fechamento') abrir({ tipo: 'fechamento' }); else ir(x)
  }
  const acao = (x: string) => {
    if (x === 'assistente') abrirAbertura(false)
    else if (x === 'assistente-noite') abrirAbertura(true)
    else if (x === 'treinar') treinar(f.id)
    else if (x === 'fechamento') abrir({ tipo: 'fechamento' })
    else if (x) ir(x)
  }
  const proxima = (() => {
    if (!d.flags?.manha && h < 17) return { t: 'Começar o dia', s: `${nomeIA} faz 6 perguntas rápidas e monta o teu plano de hoje.`, b: 'Começar', x: 'assistente' }
    if (!treinouHoje(a) && !semTreino) return { t: `Treinar a ficha ${f.id}`, s: `${f.nome} · ~${f.tempo} min${dose ? ` · ${dose.t.toLowerCase()}` : ''}`, b: 'Treinar', x: 'treinar' }
    if (fa && !(((a.ingestao || {})[hojeISO()] || {}).k)) return { t: 'Marcar as refeições', s: 'O que tu comeu de verdade ajusta a dieta da semana.', b: 'Abrir', x: 'rotina' }
    if (!d.flags?.noite && h >= 17) return { t: 'Fechar o dia', s: `Três perguntas com ${nomeIA} e o placar do dia fecha.`, b: 'Fechar o dia', x: 'assistente-noite' }
    if (pedeFech) return { t: 'Fechar a semana', s: 'Uma nota, uma vitória e o que atrapalhou. O Abel lê todos.', b: 'Fechar', x: 'fechamento' }
    return { t: d.flags?.noite ? 'Dia fechado' : 'Tudo em dia', s: d.flags?.noite ? 'Descansa. Músculo cresce no descanso.' : `À noite ${nomeIA} volta para fechar o dia.`, b: '', x: '' }
  })()

  return (
    <div className="app-conteudo uma">
      <div className="coluna">
        <div className="saud"><div className="data">{dataLonga(agora())} · semana {c.semana} de 8</div><h1>Bá, {primeiro(a.nome)}.</h1></div>

        <div className="hoje-card">
          <div className="k">Agora</div>
          <div className="t">{proxima.t}</div>
          <p className="s">{proxima.s}</p>
          {proxima.b && <button className="btn" onClick={() => acao(proxima.x)}>{proxima.b}</button>}
          <div className="passos">
            <div className="passos-cab"><span>Teu dia</span><span className="maq">{feitas} de {ms.length}</span></div>
            {ms.map((x) => (
              <button key={x.id} className={'passo' + (x.ok ? ' ok' : '')} disabled={x.ok || !x.acao || (x.id === 'noite' && h < 17)} onClick={() => acao(x.acao)}>
                <span className="ck">{x.ok ? '✓' : ''}</span><span className="c">{x.t}</span>{x.xp > 0 && <span className="xp">+{x.xp}</span>}
              </button>
            ))}
          </div>
        </div>

        {!semTreino && proxima.x !== 'treinar' && (
          <div className={`ficha-c f${f.id}`}>
            <div className="letra">{f.id}</div><div className="sel">{f.id}</div><h3>{f.nome}</h3>
            <div className="meta">{nSer} séries · ~{f.tempo} min{dose ? ` · ${dose.t.toLowerCase()}` : ''}{a.ultimoTreino ? ` · último treino ${ha(a.ultimoTreino)}` : ''}</div>
            <button className="btn" onClick={() => treinar(f.id)}>{treinouHoje(a) ? 'Treinar de novo' : 'Treinar agora »'}</button>
          </div>
        )}

        {vNovo && <div className="card"><h4>Recado do Abel <span className="mini" style={{ letterSpacing: 0, textTransform: 'none' }}>{ha(v.em)}</span></h4><div className="veredito"><Veredito v={v.veredito} /><div><b style={{ fontWeight: 500 }}>{v.exercicio}</b>{v.resposta && <p className="nota-abel" style={{ marginTop: 4 }}>{v.resposta}</p>}</div></div></div>}

        <div className="corpo-card">
          <h4><span>Teu corpo esta semana</span><button className="ab-link" onClick={() => ir('resultados')}>Ver tudo ›</button></h4>
          <CorpoOrbita regioes={regioes(a)} itens={itensOrbita(a, execucoes)} onItem={(i) => acaoOrbita(i.acao)} altura={340} legenda={false} />
          <p className="mini" style={{ textAlign: 'center', marginTop: 2 }}>Anel de dentro: hoje · do meio: semana · de fora: ciclo. Toca num ponto para abrir; arrasta para girar.</p>
        </div>

        <button className="resumo-link" onClick={() => ir('resultados')}>
          <div><div className="k">Teus resultados</div>
            <div className="linha"><span><b>{feitos}/{alvo}</b> na semana</span><span><b>{nv.nome}</b> · nível {nv.n}</span>{t && <span><b>{fmtKg(t.atual)} kg</b></span>}</div></div>
          <span className="seta">›</span>
        </button>
      </div>
    </div>
  )
}

export function Resultados() {
  const { a, abrir, ir, salvar, execucoes, abrirAbertura, treinar } = useAluna()
  const acaoOrbita = (x?: string) => {
    if (!x) return
    if (x === 'abertura') abrirAbertura(false); else if (x === 'abertura-noite') abrirAbertura(true)
    else if (x === 'treinar') treinar(proximaFicha(a).id); else if (x === 'fechamento') abrir({ tipo: 'fechamento' }); else if (x !== 'resultados') ir(x)
  }
  const wk = semanaISO(agora()), c = ciclo(a), alvo = alvoSemana(a, wk), feitos = feitosSemana(a, wk), pct = Math.round(100 * feitos / Math.max(1, alvo))
  const falta = Math.max(0, Math.ceil(alvo * 0.75) - feitos)
  const sr = a.semanaReal && a.semanaReal.semana === wk ? a.semanaReal : null
  const t = tendencia(a); const ontem = new Date(Date.now() - 864e5); const kOntem = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`
  const plHoje = notaPlacar(placar(a)), plOntem = notaPlacar(placar(a, kOntem))
  const fa = a.plano === 'Full Access'; const pr = proximaRefeicao()
  const mm = a.massaMagra && a.massaMagra.ativo; const ap = mm ? alvoProteina(a) : null; const pg = mm ? proteinaHoje(a) : 0
  const maisProteina = (g: number) => { const atual = a.proteina && a.proteina.dia === hojeISO() ? a.proteina.g : 0; salvar({ proteina: { dia: hojeISO(), g: g ? atual + g : 0 } }) }
  return (
    <div className="app-conteudo uma">
      <div className="coluna">
        <button className="ab-link" style={{ marginBottom: 6 }} onClick={() => ir('hoje')}>‹ Voltar para o dia</button>
        <div className="saud"><div className="data">semana {c.semana} de 8 · {a.plano}</div><h1>Teu corpo e teus resultados</h1></div>
        <div className="corpo-card">
          <CorpoOrbita regioes={regioes(a)} itens={itensOrbita(a, execucoes)} onItem={(i) => acaoOrbita(i.acao)} altura={440} />
        </div>
        <NivelCard onConquistas={() => abrir({ tipo: 'conquistas' })} />
        <div className="numeros">
          <div className="tile"><small>Semana · régua dos 75%</small><b>{feitos}/{alvo}</b><small>{pct >= 75 ? 'Semana fechada.' : falta === 1 ? 'Falta 1 treino' : `Faltam ${falta} treinos`}</small><div className="barra"><i style={{ width: `${Math.min(100, pct)}%`, background: pct >= 75 ? 'var(--bom)' : 'var(--latao)' }} /></div></div>
          <div className="tile"><small>Placar do dia</small><b>{plHoje}/4</b><small>ontem {plOntem}/4</small></div>
          <div className="tile"><small>Peso · média 7 dias</small><b>{t ? `${fmtKg(t.atual)} kg` : '—'}</b><small>{t && t.delta != null ? `${t.delta > 0 ? '+' : ''}${fmtKg(t.delta)} kg em 2 semanas` : 'Registra no check-in'}</small></div>
          <div className="tile"><small>Próximo laudo</small><b>{c.fotoEm}d</b><small>{c.fotoEm === c.videoEm ? 'Fotos + vídeo' : 'Fotos de 4 semanas'}</small></div>
        </div>
        <div className="card"><h4>A semana que tu tem {sr && <Tag k="bom">Avisado</Tag>}</h4>
          {sr ? <><div className="grande">{sr.dias} {sr.dias === 1 ? 'dia' : 'dias'} · {sr.minutos} min por treino</div>{sr.obs && <p className="mini" style={{ marginTop: 4 }}>“{sr.obs}”</p>}<p className="mini" style={{ marginTop: 6 }}>{sr.ajustado ? 'O Abel já ajustou a prescrição desta semana.' : 'O Abel recebeu. A meta da semana já mudou para caber.'}</p></>
            : <p className="mini">Semana apertada? Avisa quantos dias e quanto tempo tu tem de verdade, e a meta se ajusta.</p>}
          <button className="btn sec peq" style={{ marginTop: 10 }} onClick={() => abrir({ tipo: 'semana' })}>{sr ? 'Mudar' : 'Avisar o Abel'}</button></div>
        {mm && ap && <div className="card"><h4>Protocolo massa magra <span className="maq" style={{ letterSpacing: 0, textTransform: 'none' }}>{Math.round(pg)}/{ap.alvo} g</span></h4>
          <div className="barra" style={{ height: 8 }}><i style={{ width: `${Math.min(100, 100 * pg / ap.alvo)}%`, background: 'var(--bom)' }} /></div>
          <p className="mini" style={{ marginTop: 6 }}>Proteína de hoje. Mínimo {ap.min} g, alvo {ap.alvo} g. Força pelo menos 2x na semana.</p>
          {!fa && <div className="chips" style={{ marginBottom: 0 }}>{[20, 30].map((g) => <button key={g} className="chip" onClick={() => maisProteina(g)}>+{g} g</button>)}<button className="chip" onClick={() => maisProteina(0)}>zerar</button></div>}</div>}
        {fa && pr && <div className="card"><h4>Próxima refeição</h4><div className="grande">{pr.hora} · {pr.nome}</div><button className="btn sec peq" style={{ marginTop: 10 }} onClick={() => ir('rotina')}>Abrir a dieta</button></div>}
        <button className="resumo-link" onClick={() => ir('prontuario')}><div><div className="k">Histórico completo</div><div className="linha"><span>Semanas, peso, sono, laudos e fotos no prontuário</span></div></div><span className="seta">›</span></button>
      </div>
    </div>
  )
}
