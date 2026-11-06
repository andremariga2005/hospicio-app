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

/* ---------- o corpo em pontos (gerado uma vez) ---------- */
let CORPO: P3[] | null = null
function corpo(): P3[] {
  if (CORPO) return CORPO
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  const pts: P3[] = []
  const elip = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, n: number, reg: (x: number, y: number, z: number) => string) => {
    for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); const x = cx + rx * r * Math.cos(t), y = cy + ry * u, z = cz + rz * r * Math.sin(t); pts.push({ x, y, z, g: reg(x - cx, y - cy, z - cz) }) }
  }
  const caps = (x1: number, y1: number, x2: number, y2: number, r1: number, r2: number, n: number, reg: (z: number, f: number) => string) => {
    for (let i = 0; i < n; i++) { const f = rnd(), t = rnd() * Math.PI * 2, r = r1 + (r2 - r1) * f; const x = x1 + (x2 - x1) * f + r * Math.cos(t), y = y1 + (y2 - y1) * f, z = r * 0.9 * Math.sin(t); pts.push({ x, y, z, g: reg(z, f) }) }
  }
  elip(0, 0.87, 0, 0.1, 0.12, 0.11, 140, () => 'cabeca')
  caps(0, 0.78, 0, 0.71, 0.045, 0.055, 40, () => 'pescoco')
  elip(0, 0.52, 0, 0.21, 0.17, 0.115, 330, (_x, _y, z) => (z > 0 ? 'Peito' : 'Costas'))
  elip(0, 0.29, 0, 0.165, 0.13, 0.095, 230, (_x, _y, z) => (z > 0.01 ? 'Core' : 'Costas'))
  elip(0, 0.09, 0, 0.185, 0.11, 0.115, 220, (_x, _y, z) => (z < -0.01 ? 'Glúteo' : 'Core'))
  for (const sx of [-1, 1]) {
    elip(sx * 0.245, 0.6, 0, 0.075, 0.07, 0.075, 90, () => 'Ombro')
    caps(sx * 0.275, 0.55, sx * 0.31, 0.3, 0.06, 0.048, 120, () => 'Tríceps')
    caps(sx * 0.31, 0.29, sx * 0.335, 0.06, 0.045, 0.034, 80, () => 'antebraco')
    caps(sx * 0.1, 0.0, sx * 0.11, -0.45, 0.095, 0.065, 230, (z) => (z > 0 ? 'Quadríceps' : 'Posterior'))
    caps(sx * 0.11, -0.5, sx * 0.115, -0.88, 0.065, 0.04, 140, () => 'Panturrilha')
    elip(sx * 0.12, -0.93, 0.04, 0.04, 0.025, 0.075, 30, () => 'pe')
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

    function tam() { const r = el.getBoundingClientRect(); W = Math.max(280, r.width); H = altura; cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(DPR, 0, 0, DPR, 0, 0); S = Math.min(H * 0.42, W * 0.4); RX = Math.min(W * 0.47, S * 1.55); CX = W / 2; CY = H * 0.47 }
    const ro = new ResizeObserver(tam); ro.observe(el); tam()

    function corDe(g: string, z: number, t: number) {
      const R = estado.current.regioes[g]; const luz = 0.3 + 0.7 * Math.max(0, Math.min(1, (z + 0.25) / 0.5))
      if (R?.dor) { const p = 0.55 + 0.45 * Math.sin(t / 260); return `rgba(214,88,72,${(0.35 + 0.6 * p) * luz})` }
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
        if (st === 'atr') { const f = (t / 1600) % 1; cx.beginPath(); cx.arc(p.x, p.y, 6 + f * 10, 0, 7); cx.strokeStyle = 'rgba(214,88,72,.8)'; cx.globalAlpha = (frente ? 1 : 0.45) * (1 - f); cx.stroke(); cx.globalAlpha = frente ? 1 : 0.45 }
        cx.beginPath(); cx.arc(p.x, p.y, (hov ? 6 : 4.2) * s, 0, 7)
        cx.fillStyle = st === 'ok' ? '#D9BE86' : st === 'pend' ? '#D29B3C' : st === 'atr' ? '#D65848' : 'rgba(217,190,134,.35)'; cx.fill()
        if (st === 'sem') { cx.strokeStyle = 'rgba(217,190,134,.6)'; cx.stroke() }
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
      // corpo
      const c = Math.cos(ang), s = Math.sin(ang); proj.length = 0
      for (const p of pts) { const x = p.x * c + p.z * s, z = -p.x * s + p.z * c; proj.push({ x: CX + x * S, y: CY - p.y * S, z, g: p.g }) }
      proj.sort((a, b) => a.z - b.z)
      for (const q of proj) { cx.fillStyle = corDe(q.g, q.z, t); const r = (hoverReg && q.g === hoverReg ? 2.1 : 1.55) * (0.75 + 0.5 * (q.z + 0.25) / 0.5) * Math.max(0.85, S / 170); cx.beginPath(); cx.arc(q.x, q.y, Math.max(0.6, r), 0, 7); cx.fill() }
      if (comAneis) RAIOS.forEach((r) => anel(RX * r, 0, Math.PI, 'rgba(216,191,134,.3)'))
      desenhaItens(true, t)
      requestAnimationFrame(quadro)
    }
    requestAnimationFrame(quadro)

    const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    function achar(x: number, y: number) {
      let it: any = null, dm = 14; for (const p of posItens) { const d = Math.hypot(p.x - x, p.y - y); if (d < dm) { dm = d; it = p } }
      if (it) return { tipo: 'item' as const, it }
      let rg: string | null = null, dr = 9; for (let i = proj.length - 1; i >= 0; i--) { const q = proj[i]; if (q.z < -0.02) break; const d = Math.hypot(q.x - x, q.y - y); if (d < dr) { dr = d; rg = q.g } }
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
        <span><i style={{ background: '#D9BE86' }} />em órbita</span><span><i style={{ background: '#D29B3C' }} />se afastando</span><span><i style={{ background: '#D65848' }} />fora de órbita</span>
        <span className="sep" /><span><i className="grad" />músculo mais aceso = mais treinado na semana</span>
        <span style={{ flexBasis: '100%', justifyContent: 'center' }}>anel de dentro: hoje · do meio: semana · de fora: ciclo</span>
      </div>}
      <table className="sr-only"><caption>Músculos na semana</caption><tbody>{lista.map(([g, r]) => <tr key={g}><td>{g}</td><td>{r.feito} de {r.alvo}</td><td>{r.dor || ''}</td></tr>)}{itens.map((i) => <tr key={i.id}><td>{i.n}</td><td>{ROT_ST[i.st]}</td><td>{i.info}</td></tr>)}</tbody></table>
    </div>
  )
}
