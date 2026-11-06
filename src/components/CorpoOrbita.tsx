// CORPO EM ÓRBITA — no lugar do globo do sistema de governança, um corpo em pontos que gira devagar.
// Cada músculo acende conforme o que recebeu de treino na semana; dor aparece pulsando.
// Em volta, três anéis (hoje, semana, ciclo): o que está em dia fica no anel, o que atrasa se afasta.
// Canvas puro, sem dependências. Arrastar gira o corpo; tocar num ponto mostra o que é.
import { useEffect, useRef, useState } from 'react'
import type { ItemOrbita, Regiao } from '../lib/corpo'

type P3 = { x: number; y: number; z: number; g: string }
const ROT_ST: Record<string, string> = { ok: 'em órbita', pend: 'se afastando', atr: 'fora de órbita', sem: 'sem demanda agora' }
const DESVIO: Record<string, number> = { ok: 0, pend: 0.1, atr: 0.24, sem: 0.04 }
const RAIOS = [0.56, 0.78, 1.0], INCL = 0.24, NOMES_ANEL = ['hoje', 'semana', 'ciclo']; void NOMES_ANEL

/* ---------- o corpo: cortes horizontais, como um escaneamento (gerado uma vez) ---------- */
let CORPO: P3[] | null = null
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** perfil por altura: [y, valor] — interpola */
const perfil = (tab: [number, number][], y: number) => { for (let i = 0; i < tab.length - 1; i++) { const [y0, v0] = tab[i], [y1, v1] = tab[i + 1]; if (y <= y0 && y >= y1) return lerp(v0, v1, (y0 - y) / (y0 - y1)) } return tab[tab.length - 1][1] }
function corpo(): P3[] {
  if (CORPO) return CORPO
  const pts: P3[] = []
  const anel = (cx: number, cz: number, rx: number, rz: number, y: number, n: number, reg: (z: number, x: number) => string, off = 0) => {
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 + off; const x = cx + rx * Math.cos(t), z = cz + rz * Math.sin(t); pts.push({ x, y, z, g: reg(z - cz, x - cx) }) }
  }
  const dy = 0.0125
  // tronco: largura e profundidade por altura (ombro → quadril)
  const TX: [number, number][] = [[0.69, 0.07], [0.66, 0.17], [0.62, 0.215], [0.55, 0.2], [0.46, 0.185], [0.36, 0.16], [0.26, 0.138], [0.16, 0.15], [0.07, 0.185], [0.0, 0.18], [-0.04, 0.16]]
  const TZ: [number, number][] = [[0.69, 0.055], [0.62, 0.1], [0.5, 0.118], [0.38, 0.1], [0.26, 0.085], [0.12, 0.1], [0.04, 0.12], [-0.04, 0.1]]
  const GL: [number, number][] = [[0.16, 0], [0.08, 0.03], [0.02, 0.045], [-0.04, 0.02]] // glúteo projeta para trás
  let k = 0
  for (let y = 1.0; y >= -0.985; y -= dy, k++) {
    const off = (k % 2) * 0.09
    if (y > 0.74) { const t = (y - 0.86) / 0.135; const r = Math.sqrt(Math.max(0, 1 - t * t)); if (r > 0.05) anel(0, 0.005, 0.083 * r, 0.098 * r, y, Math.max(8, Math.round(34 * r)), () => 'cabeca', off) }
    else if (y > 0.69) anel(0, -0.005, 0.047, 0.052, y, 16, () => 'pescoco', off)
    if (y <= 0.69 && y >= -0.04) {
      const rx = perfil(TX, y), rz = perfil(TZ, y), g = y < 0.16 ? perfil(GL, y) : 0
      anel(0, -g, rx, rz + g, y, Math.round(46 * rx / 0.2) + 8, (z, x) => {
        if (y > 0.36) return z > -0.01 ? (y > 0.6 && Math.abs(x) > 0.15 ? 'Ombro' : 'Peito') : 'Costas'
        if (y > 0.13) return z > 0.0 ? 'Core' : 'Costas'
        return z < -0.02 ? 'Glúteo' : 'Core'
      }, off)
    }
    for (const sx of [-1, 1]) {
      // braço: do ombro (0.63) ao punho (0.06) e mão
      if (y <= 0.65 && y >= -0.04) {
        const t = (0.65 - y) / 0.69
        const x = sx * lerp(0.285, 0.37, Math.min(1, t * 1.05))
        const r = perfil([[0.65, 0.066], [0.56, 0.058], [0.46, 0.05], [0.37, 0.038], [0.3, 0.043], [0.12, 0.03], [0.06, 0.026], [0.03, 0.03], [-0.04, 0.018]], y)
        anel(x, 0, r, r * (y < 0.06 ? 0.55 : 0.95), y, Math.max(8, Math.round(r * 260)), (z) => (y > 0.56 ? 'Ombro' : y > 0.36 ? (z < 0 ? 'Tríceps' : 'Tríceps') : 'antebraco'), off)
      }
      // perna: do quadril (-0.03) ao tornozelo (-0.9)
      if (y <= -0.03 && y >= -0.9) {
        const x = sx * lerp(0.1, 0.105, (-0.03 - y) / 0.87)
        const r = perfil([[-0.03, 0.098], [-0.15, 0.088], [-0.3, 0.07], [-0.44, 0.05], [-0.5, 0.054], [-0.6, 0.06], [-0.72, 0.045], [-0.85, 0.03], [-0.9, 0.032]], y)
        anel(x, 0, r, r * 0.95, y, Math.max(10, Math.round(r * 280)), (z) => (y > -0.46 ? (z > 0 ? 'Quadríceps' : 'Posterior') : 'Panturrilha'), off)
      }
      // pé
      if (y < -0.9) anel(sx * 0.108, 0.035, 0.035, 0.07, y, 16, () => 'pe', off)
    }
  }
  CORPO = pts; return pts
}

export default function CorpoOrbita({ regioes, itens = [], onItem, onRegiao, altura = 460, legenda = true, unidade = 'séries' }: {
  regioes: Record<string, Regiao>; itens?: ItemOrbita[]; onItem?: (i: ItemOrbita) => void; onRegiao?: (g: string) => void; altura?: number; legenda?: boolean; unidade?: 'séries' | 'alunas'
}) {
  const ref = useRef<HTMLDivElement>(null); const cvRef = useRef<HTMLCanvasElement>(null)
  const [dica, setDica] = useState<{ x: number; y: number; t: string; s: string } | null>(null)
  const estado = useRef({ regioes, itens, onItem, onRegiao, unidade }); estado.current = { regioes, itens, onItem, onRegiao, unidade }

  useEffect(() => {
    const el = ref.current!, cv = cvRef.current!, cx = cv.getContext('2d')!
    const DPR = Math.min(2, window.devicePixelRatio || 1); const pts = corpo()
    const itensAng = new Map<string, { ang: number; vel: number }>()
    let W = 0, H = 0, S = 0, RX = 0, CX = 0, CY = 0, ang = 0.5, vivo = true, arrasto: { x: number; a: number } | null = null, ultimoArr = 0
    let hoverItem: string | null = null, hoverReg: string | null = null
    const proj: { x: number; y: number; z: number; g: string }[] = []
    const posItens: { it: ItemOrbita; x: number; y: number; frente: boolean }[] = []
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function tam() { const r = el.getBoundingClientRect(); W = Math.max(280, r.width); H = altura; cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(DPR, 0, 0, DPR, 0, 0); S = Math.min(H * 0.4, W * 0.4); RX = Math.min(W * 0.47, S * 1.55); CX = W / 2; CY = H * 0.47 }
    const ro = new ResizeObserver(tam); ro.observe(el); tam()

    function corDe(g: string, z: number, t: number) {
      const R = estado.current.regioes[g]; const luz = 0.3 + 0.7 * Math.max(0, Math.min(1, (z + 0.25) / 0.5))
      if (R?.dor) { const p = 0.5 + 0.5 * Math.sin(t / 300); return `rgba(${Math.round(178 + 50 * p)},${Math.round(58 + 40 * p)},${Math.round(46 + 30 * p)},${(0.45 + 0.5 * p) * luz})` }
      if (!R) return `rgba(237,230,214,${0.16 * luz})`
      const k = Math.min(1, R.pct)
      if (k <= 0.01) return `rgba(237,230,214,${0.2 * luz})`
      return `rgba(${Math.round(150 + 67 * k)},${Math.round(118 + 72 * k)},${Math.round(70 + 64 * k)},${(0.35 + 0.65 * k) * luz})`
    }
    function anel(rr: number, a0: number, a1: number, cor: string) { cx.beginPath(); cx.ellipse(CX, CY + S * 0.12, rr, rr * INCL, 0, a0, a1); cx.strokeStyle = cor; cx.lineWidth = 1; cx.stroke() }
    function desenhaItens(frente: boolean, t: number) {
      for (const p of posItens) {
        if (p.frente !== frente) continue
        const st = p.it.st, hov = hoverItem === p.it.id, s = frente ? 1 : 0.6
        cx.globalAlpha = frente ? 1 : 0.45
        if (st === 'atr') { const f = (t / 1600) % 1; cx.beginPath(); cx.arc(p.x, p.y, 6 + f * 11, 0, 7); cx.strokeStyle = 'rgba(217,190,134,.9)'; cx.lineWidth = 1; cx.globalAlpha = (frente ? 1 : 0.45) * (1 - f); cx.stroke(); cx.globalAlpha = frente ? 1 : 0.45 }
        const rr = (hov ? 6 : 4.4) * s
        cx.beginPath(); cx.arc(p.x, p.y, rr, 0, 7); cx.lineWidth = 1.6
        if (st === 'ok') { cx.fillStyle = '#D9BE86'; cx.fill() }
        else if (st === 'pend') { cx.fillStyle = '#121009'; cx.fill(); cx.strokeStyle = '#D9BE86'; cx.stroke() }
        else if (st === 'atr') { cx.fillStyle = '#F6EFDC'; cx.fill() }
        else { cx.strokeStyle = 'rgba(217,190,134,.4)'; cx.stroke() }
        cx.lineWidth = 1
        if (frente || hov) { cx.font = `${hov ? 600 : 500} 12px "Libre Franklin", system-ui`; cx.fillStyle = 'rgba(237,230,214,.92)'
          const lw = cx.measureText(p.it.n).width; let esq = p.x < CX
          if (!esq && p.x + 9 + lw > W - 2) esq = true; if (esq && p.x - 9 - lw < 2) esq = false
          cx.textAlign = esq ? 'right' : 'left'; cx.fillText(p.it.n, p.x + (esq ? -9 : 9), p.y + 4) }
        cx.globalAlpha = 1
      }
    }
    function quadro(t: number) {
      if (!vivo) return
      if (!arrasto && !reduzido && t - ultimoArr > 1500) ang += 0.0045
      cx.clearRect(0, 0, W, H)
      const g = cx.createRadialGradient(CX, CY, S * 0.1, CX, CY, S * 1.1); g.addColorStop(0, 'rgba(184,149,90,.13)'); g.addColorStop(1, 'rgba(184,149,90,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H)
      // posições dos itens nos anéis
      posItens.length = 0
      const its = estado.current.itens
      its.forEach((it, i) => {
        let a = itensAng.get(it.id); if (!a) { const mesmos = its.filter((x) => x.anel === it.anel); const j = mesmos.indexOf(it); a = { ang: (j / Math.max(1, mesmos.length)) * Math.PI * 2 + it.anel * 0.9, vel: 0.0011 - it.anel * 0.0002 + (i % 3) * 0.00005 }; itensAng.set(it.id, a) }
        if (!reduzido && hoverItem !== it.id) a.ang += a.vel
        const rr = RX * (RAIOS[it.anel] + DESVIO[it.st] * 0.6)
        posItens.push({ it, x: CX + Math.cos(a.ang) * rr, y: CY + S * 0.12 + Math.sin(a.ang) * rr * INCL, frente: Math.sin(a.ang) > 0 })
      })
      const comAneis = estado.current.itens.length > 0
      if (comAneis) RAIOS.forEach((r) => anel(RX * r, Math.PI, Math.PI * 2, 'rgba(216,191,134,.13)'))
      desenhaItens(false, t)
      // plataforma holográfica sob os pés
      const pe = CY + 0.99 * S
      for (let i = 0; i < 4; i++) { const rr = S * (0.2 + i * 0.11), pul = 0.5 + 0.5 * Math.sin(t / 900 - i * 0.8); cx.beginPath(); cx.ellipse(CX, pe, rr, rr * 0.22, 0, 0, 7); cx.strokeStyle = `rgba(217,190,134,${(0.28 - i * 0.055) * (0.6 + 0.4 * pul)})`; cx.lineWidth = 1; cx.stroke() }
      const gp = cx.createRadialGradient(CX, pe, 2, CX, pe, S * 0.5); gp.addColorStop(0, 'rgba(217,190,134,.22)'); gp.addColorStop(1, 'rgba(217,190,134,0)'); cx.fillStyle = gp; cx.beginPath(); cx.ellipse(CX, pe, S * 0.5, S * 0.11, 0, 0, 7); cx.fill()
      // feixe vertical suave
      const fx = cx.createLinearGradient(0, pe, 0, CY - S); fx.addColorStop(0, 'rgba(217,190,134,.07)'); fx.addColorStop(1, 'rgba(217,190,134,0)'); cx.fillStyle = fx; cx.beginPath(); cx.moveTo(CX - S * 0.42, pe); cx.lineTo(CX - S * 0.3, CY - S); cx.lineTo(CX + S * 0.3, CY - S); cx.lineTo(CX + S * 0.42, pe); cx.fill()
      // corpo em pontos, com luz somada (holograma) e uma linha de varredura subindo
      const c = Math.cos(ang), s = Math.sin(ang), flut = Math.sin(t / 1400) * S * 0.008; proj.length = 0
      const varre = 1 - ((t / 3800) % 1) * 2.1 // de 1 a -1.1
      cx.globalCompositeOperation = 'lighter'
      const tp = Math.max(0.8, S / 230)
      for (const p of pts) {
        const x = p.x * c + p.z * s, z = -p.x * s + p.z * c
        const X = CX + x * S, Y = CY - p.y * S + flut
        proj.push({ x: X, y: Y, z, g: p.g })
        const prof = Math.max(0, Math.min(1, (z + 0.2) / 0.4))
        const borda = 1 - Math.min(1, Math.abs(Math.atan2(z, Math.abs(x) + 0.0001)) / 1.5) // brilho na borda (contorno)
        const scan = Math.max(0, 1 - Math.abs(p.y - varre) / 0.05)
        const R = estado.current.regioes[p.g]
        let r = 217, g2 = 205, b2 = 175, al = 0.05 + 0.2 * prof + 0.16 * borda
        if (R?.dor) { const pu = 0.5 + 0.5 * Math.sin(t / 300); r = 210; g2 = 70; b2 = 52; al = (0.28 + 0.4 * pu) * (0.45 + 0.55 * prof) }
        else if (R && R.pct > 0.01) { const kk = Math.min(1, R.pct); r = 230; g2 = Math.round(180 + 20 * kk); b2 = Math.round(105 + 20 * kk); al = (0.14 + 0.42 * kk) * (0.4 + 0.6 * prof) + 0.12 * borda }
        if (hoverReg && p.g === hoverReg) al = Math.min(1, al + 0.35)
        al += scan * 0.5
        cx.fillStyle = `rgba(${r},${g2},${b2},${Math.min(1, al)})`
        const tam2 = tp * (0.9 + 0.7 * prof) * (scan > 0.3 ? 1.6 : 1)
        cx.fillRect(X - tam2 / 2, Y - tam2 / 2, tam2, tam2)
      }
      // linha de varredura
      if (varre > -1 && varre < 1.02) { const yv = CY - varre * S + flut; const gl = cx.createLinearGradient(CX - S * 0.5, 0, CX + S * 0.5, 0); gl.addColorStop(0, 'rgba(217,190,134,0)'); gl.addColorStop(0.5, 'rgba(246,239,220,.35)'); gl.addColorStop(1, 'rgba(217,190,134,0)'); cx.fillStyle = gl; cx.fillRect(CX - S * 0.5, yv - 0.6, S, 1.2) }
      cx.globalCompositeOperation = 'source-over'
      if (comAneis) RAIOS.forEach((r) => anel(RX * r, 0, Math.PI, 'rgba(216,191,134,.3)'))
      desenhaItens(true, t)
      requestAnimationFrame(quadro)
    }
    requestAnimationFrame(quadro)

    const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    function achar(x: number, y: number) {
      let it: any = null, dm = 14; for (const p of posItens) { const d = Math.hypot(p.x - x, p.y - y); if (d < dm) { dm = d; it = p } }
      if (it) return { tipo: 'item' as const, it }
      let rg: string | null = null, dr = 9; for (let i = 0; i < proj.length; i++) { const q = proj[i]; if (q.z < -0.01) continue; const d = Math.hypot(q.x - x, q.y - y); if (d < dr) { dr = d; rg = q.g } }
      if (rg && estado.current.regioes[rg]) return { tipo: 'reg' as const, rg }
      return null
    }
    function mover(e: PointerEvent) {
      const { x, y } = local(e)
      if (arrasto) { ang = arrasto.a + (x - arrasto.x) * 0.012; ultimoArr = performance.now(); return }
      const h = achar(x, y); hoverItem = h?.tipo === 'item' ? h.it.it.id : null; hoverReg = h?.tipo === 'reg' ? h.rg : null
      cv.style.cursor = h ? 'pointer' : 'grab'
      if (h?.tipo === 'item') setDica({ x: h.it.x, y: h.it.y, t: `${h.it.it.n} · ${ROT_ST[h.it.it.st]}`, s: h.it.it.info })
      else if (h?.tipo === 'reg') { const R = estado.current.regioes[h.rg]; setDica({ x, y, t: h.rg, s: (estado.current.unidade === 'alunas' ? `${R.feito} de ${R.alvo} alunas bateram o volume (${Math.round(100 * R.pct)}%)` : R.alvo ? `${R.feito} de ${R.alvo} séries na semana (${Math.round(100 * Math.min(1, R.feito / R.alvo))}%)` : `${R.feito} séries na semana`) + (R.dor ? ` · ${R.dor}` : '') }) }
      else setDica(null)
    }
    let inicio = { x: 0, y: 0, t: 0 }
    const baixo = (e: PointerEvent) => { const p = local(e); inicio = { ...p, t: performance.now() }; arrasto = { x: p.x, a: ang }; cv.setPointerCapture(e.pointerId) }
    const cima = (e: PointerEvent) => {
      const p = local(e); const clique = Math.hypot(p.x - inicio.x, p.y - inicio.y) < 6 && performance.now() - inicio.t < 400; arrasto = null
      if (!clique) return
      const h = achar(p.x, p.y)
      if (h?.tipo === 'item') { setDica({ x: h.it.x, y: h.it.y, t: `${h.it.it.n} · ${ROT_ST[h.it.it.st]}`, s: h.it.it.info }); estado.current.onItem?.(h.it.it) }
      else if (h?.tipo === 'reg') { mover(e); estado.current.onRegiao?.(h.rg) } else setDica(null)
    }
    const sair = () => { hoverItem = null; hoverReg = null; setDica(null); arrasto = null }
    cv.addEventListener('pointermove', mover); cv.addEventListener('pointerdown', baixo); cv.addEventListener('pointerup', cima); cv.addEventListener('pointerleave', sair)
    return () => { vivo = false; ro.disconnect(); cv.removeEventListener('pointermove', mover); cv.removeEventListener('pointerdown', baixo); cv.removeEventListener('pointerup', cima); cv.removeEventListener('pointerleave', sair) }
  }, [altura])

  const lista = Object.entries(regioes)
  return (
    <div>
      <div ref={ref} className="corpo-orb" style={{ height: altura }}>
        <canvas ref={cvRef} style={{ touchAction: 'pan-y', cursor: 'grab' }} role="img" aria-label="Corpo em pontos com os músculos treinados na semana e, em volta, o que está em dia e o que está atrasado" />
        {dica && <div className="corpo-dica" style={{ left: Math.min(Math.max(dica.x, 110), (ref.current?.clientWidth || 300) - 110), top: dica.y - 12 }}><b>{dica.t}</b><span>{dica.s}</span></div>}
      </div>
      {legenda && <div className="corpo-legenda">
        <span><i style={{ background: '#D9BE86' }} />em órbita</span><span><i style={{ border: '1.6px solid #D9BE86' }} />se afastando</span><span><i style={{ background: '#F6EFDC', boxShadow: '0 0 0 3px #d9be8633' }} />fora de órbita</span>
        <span><i style={{ background: '#B23A2E' }} />dor</span>
        <span className="sep" /><span><i className="grad" />músculo mais aceso = mais treinado na semana</span>
        <span style={{ flexBasis: '100%', justifyContent: 'center' }}>anel de dentro: hoje · do meio: semana · de fora: ciclo</span>
      </div>}
      <div className="sr-only"><table><caption>Músculos na semana</caption><tbody>{lista.map(([g, r]) => <tr key={g}><td>{g}</td><td>{r.feito} de {r.alvo}</td><td>{r.dor || ''}</td></tr>)}{itens.map((i) => <tr key={i.id}><td>{i.n}</td><td>{ROT_ST[i.st]}</td><td>{i.info}</td></tr>)}</tbody></table></div>
    </div>
  )
}
