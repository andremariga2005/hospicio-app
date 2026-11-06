// Gráficos do Hospício em SVG puro: traço fino, pontas arredondadas, grade discreta, um eixo só.
// Cada marca tem dica ao passar o mouse (title) e o texto sempre em tinta neutra, nunca na cor da série.
const T = { tinta: '#EDE6D6', suave: '#A89A80', mudo: '#756B58', grade: '#2B261D', latao: '#B8955A', latao2: '#D9BE86', apagado: '#4a4031', bom: '#86A562', atencao: '#D29B3C', risco: '#C9584B' }
export const COR = T

export function Barras({ dados, h = 160, meta, fmt = (v: number) => String(v), max, alt }: { dados: { r: string; v: number; cor?: string; dica?: string }[]; h?: number; meta?: { v: number; r: string }; fmt?: (v: number) => string; max?: number; alt: string }) {
  const W = 560, pb = 22, pt = 18, mx = Math.max(max ?? 0, meta?.v ?? 0, ...dados.map((d) => d.v), 1)
  const larg = (W - 8) / Math.max(1, dados.length), bw = Math.max(4, Math.min(34, larg - 4))
  const y = (v: number) => h - pb - (v / mx) * (h - pb - pt)
  const passo = Math.ceil(dados.length / 8)
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label={alt}>
      <line x1="0" x2={W} y1={h - pb} y2={h - pb} stroke={T.grade} />
      {meta && <><line x1="0" x2={W} y1={y(meta.v)} y2={y(meta.v)} stroke={T.tinta} strokeOpacity=".35" strokeDasharray="3 4" /><text x={W - 2} y={y(meta.v) - 4} textAnchor="end" fill={T.suave} fontSize="10" fontFamily="Courier Prime">{meta.r}</text></>}
      {dados.map((d, i) => {
        const x = 4 + i * larg + (larg - bw) / 2, yy = y(d.v), alto = Math.max(d.v > 0 ? 3 : 0, h - pb - yy)
        return (
          <g key={i}><title>{d.dica || `${d.r}: ${fmt(d.v)}`}</title>
            <rect x={x - 2} y={pt} width={bw + 4} height={h - pb - pt} fill="transparent" />
            {alto > 0 && <path d={`M${x},${h - pb} v${-(alto - Math.min(4, alto))} q0,-${Math.min(4, alto)} ${Math.min(4, bw / 2)},-${Math.min(4, alto)} h${bw - 2 * Math.min(4, bw / 2)} q${Math.min(4, bw / 2)},0 ${Math.min(4, bw / 2)},${Math.min(4, alto)} v${alto - Math.min(4, alto)} z`} fill={d.cor || T.latao} />}
            {dados.length <= 12 && d.v > 0 && <text x={x + bw / 2} y={yy - 5} textAnchor="middle" fill={T.tinta} fontSize="10.5" fontFamily="Courier Prime">{fmt(d.v)}</text>}
            {i % passo === 0 && <text x={x + bw / 2} y={h - 6} textAnchor="middle" fill={T.mudo} fontSize="10" fontFamily="Courier Prime">{d.r}</text>}
          </g>
        )
      })}
    </svg>
  )
}

export function Linha({ pts, h = 160, fmt = (v: number) => String(v), alt, faixa, pontos = true, cor = T.latao2 }: { pts: { r: string; v: number | null }[]; h?: number; fmt?: (v: number) => string; alt: string; faixa?: [number, number]; pontos?: boolean; cor?: string }) {
  const W = 560, pb = 22, pt = 14, pl = 6, pr = 40
  const vs = pts.map((p) => p.v).filter((v) => v != null) as number[]
  if (vs.length < 2) return <p className="mini" style={{ padding: '20px 0' }}>Ainda sem dados suficientes para a linha.</p>
  let mn = Math.min(...vs, faixa?.[0] ?? Infinity), mx = Math.max(...vs, faixa?.[1] ?? -Infinity); if (mx - mn < 1e-6) { mx += 1; mn -= 1 }
  const pad = (mx - mn) * 0.12; mn -= pad; mx += pad
  const X = (i: number) => pl + (W - pl - pr) * (i / Math.max(1, pts.length - 1)), Y = (v: number) => h - pb - ((v - mn) / (mx - mn)) * (h - pb - pt)
  const seg: string[] = []; let cur = ''
  pts.forEach((p, i) => { if (p.v == null) { if (cur) seg.push(cur); cur = ''; return } cur += `${cur ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}` }); if (cur) seg.push(cur)
  const ult = [...pts].reverse().find((p) => p.v != null)!; const iu = pts.lastIndexOf(ult)
  const passo = Math.ceil(pts.length / 7)
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label={alt}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pl} x2={W - pr} y1={pt + (h - pb - pt) * f} y2={pt + (h - pb - pt) * f} stroke={T.grade} strokeDasharray="2 5" />)}
      {faixa && <rect x={pl} width={W - pl - pr} y={Y(faixa[1])} height={Math.max(0, Y(faixa[0]) - Y(faixa[1]))} fill={T.bom} opacity=".08" />}
      {seg.map((d, i) => <path key={i} d={d} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
      {pts.map((p, i) => p.v == null ? null : (
        <g key={i}><title>{`${p.r}: ${fmt(p.v)}`}</title>
          <rect x={X(i) - (W / pts.length) / 2} y={pt} width={W / pts.length} height={h - pb - pt} fill="transparent" />
          {(pontos || i === iu) && <circle cx={X(i)} cy={Y(p.v)} r={i === iu ? 4.5 : 3} fill={cor} stroke="#121009" strokeWidth="2" />}
        </g>))}
      <text x={X(iu) + 8} y={Y(ult.v!) + 4} fill={T.tinta} fontSize="11" fontFamily="Courier Prime">{fmt(ult.v!)}</text>
      {pts.map((p, i) => i % passo === 0 ? <text key={'r' + i} x={X(i)} y={h - 6} textAnchor="middle" fill={T.mudo} fontSize="10" fontFamily="Courier Prime">{p.r}</text> : null)}
    </svg>
  )
}

/** calendário de calor: uma célula por dia, intensidade pelo valor (0 a max), vazio = sem registro */
export function Calor({ dias, max = 4, alt, rotulo = (v: number) => `${v}/4` }: { dias: { k: string; r: string; v: number | null }[]; max?: number; alt: string; rotulo?: (v: number) => string }) {
  const pri = dias.length ? new Date(dias[0].k + 'T12:00:00').getDay() : 0; const off = (pri + 6) % 7
  const sem = Math.ceil((dias.length + off) / 7), c = 15, g = 3, W = sem * (c + g) + 24, H = 7 * (c + g) + 4
  const op = (v: number) => 0.18 + 0.82 * (v / max)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W * 1.6 }} role="img" aria-label={alt}>
      {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => i % 2 === 0 ? <text key={i} x="0" y={i * (c + g) + c - 3} fill={T.mudo} fontSize="9" fontFamily="Courier Prime">{d}</text> : null)}
      {dias.map((d, i) => { const j = i + off, col = Math.floor(j / 7), lin = j % 7; return (
        <rect key={d.k} x={22 + col * (c + g)} y={lin * (c + g)} width={c} height={c} rx="3" fill={d.v == null ? '#ffffff0a' : T.latao} opacity={d.v == null ? 1 : op(d.v)}>
          <title>{`${d.r}: ${d.v == null ? 'sem registro' : rotulo(d.v)}`}</title></rect>) })}
    </svg>
  )
}

/** barra única segmentada com legenda (estado dos alunos, planos…) */
export function Segmentos({ itens, alt }: { itens: { r: string; v: number; cor: string }[]; alt: string }) {
  const tot = Math.max(1, itens.reduce((s, x) => s + x.v, 0))
  return (
    <div role="img" aria-label={alt}>
      <div style={{ display: 'flex', gap: 2, height: 14, borderRadius: 99, overflow: 'hidden', background: '#ffffff0a' }}>
        {itens.filter((x) => x.v > 0).map((x) => <div key={x.r} title={`${x.r}: ${x.v} (${Math.round(100 * x.v / tot)}%)`} style={{ width: `${100 * x.v / tot}%`, background: x.cor }} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10 }}>
        {itens.map((x) => <span key={x.r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.suave }}><i style={{ width: 10, height: 10, borderRadius: 3, background: x.cor, display: 'inline-block' }} />{x.r} <b style={{ color: T.tinta, fontWeight: 500 }}>{x.v}</b></span>)}
      </div>
    </div>
  )
}
