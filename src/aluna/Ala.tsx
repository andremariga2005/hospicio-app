import { useAluna } from './ctx'
import { fichaPorId, ha, iniciais, num } from '../lib/metodo'
import { alternarCoroa } from '../lib/dados'
import { Icone } from '../components/ui'

export default function Ala() {
  const { a, ala, setAla, toast, equipe } = useAluna()
  const coroa = async (id: string) => {
    if (equipe) { toast('No modo equipe a coroa fica com as alunas.'); return }
    try { const reis = await alternarCoroa(id); setAla(ala.map((p) => (p.id === id ? { ...p, reis } : p))) } catch { toast('Não consegui agora. Tenta de novo.') }
  }
  return (
    <div className="app-conteudo uma">
      <div className="coluna">
        <div className="saud"><div className="data">{ala.length} registros recentes</div><h1>A ala</h1><p className="mini">Aqui aparece só o primeiro nome e o treino. Rosto e corpo, nunca.</p></div>
        {ala.map((p) => {
          const reis = p.reis || []; const on = reis.includes(a.id)
          if (p.tipo === 'abel') return (
            <div key={p.id} className="post abel"><div className="post-top"><div className="av" style={{ background: '#1C1914', borderColor: '#1C1914' }}>AC</div><div><b>Abel</b><small>{ha(p.em)}</small></div></div>
              <p style={{ fontSize: 15 }}>{p.texto}</p><div style={{ marginTop: 10 }}><button className={'rei' + (on ? ' on' : '')} onClick={() => coroa(p.id)}>{Icone.coroa} {reis.length}</button></div></div>)
          const f = fichaPorId(p.ficha) || { nome: '' }
          return (
            <div key={p.id} className="post"><div className="post-top"><div className="av">{iniciais(p.nome)}</div><div><b>{p.nome}</b><small>{ha(p.em)}</small></div>{p.recorde && <span className="recorde">Recorde</span>}</div>
              <div style={{ fontWeight: 500, fontSize: 16 }}>Ficha {p.ficha} · {String(f.nome).split('·')[0]}</div>
              <div className="stats"><div><span>Tempo</span>{p.duracao} min</div><div><span>Volume</span>{num(p.volume || 0)} kg</div><div><span>Séries</span>{p.series}</div></div>
              {p.melhor && <div className="mini">Melhor série: <b style={{ color: 'var(--papel)', fontWeight: 500 }}>{p.melhor}</b></div>}
              <div style={{ marginTop: 10 }}><button className={'rei' + (on ? ' on' : '')} onClick={() => coroa(p.id)} aria-label="Postura de rei">{Icone.coroa} Postura de rei · {reis.length}</button></div></div>)
        })}
        {!ala.length && <p className="mini">A ala ainda está vazia. O primeiro treino registrado aparece aqui.</p>}
      </div>
    </div>
  )
}
