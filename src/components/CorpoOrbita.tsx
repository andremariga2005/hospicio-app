// CORPO EM ÓRBITA — uma figura humana esculpida em ouro, com luz de verdade, girando devagar.
// Cada músculo clareia conforme o que recebeu de treino na semana; dor aparece pulsando em vermelho.
// Em volta, três anéis (hoje, semana, ciclo): o que está em dia fica no anel, o que atrasa se afasta.
// O corpo é desenhado em WebGL (three.js); os anéis e os pontos ficam em duas camadas 2D, atrás e na frente.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { ItemOrbita, Regiao } from '../lib/corpo'

const ROT_ST: Record<string, string> = { ok: 'em órbita', pend: 'se afastando', atr: 'fora de órbita', sem: 'sem demanda agora' }
const DESVIO: Record<string, number> = { ok: 0, pend: 0.1, atr: 0.24, sem: 0.04 }
const RAIOS = [0.56, 0.78, 1.0], INCL = 0.24

/* ---------- a escultura: partes do corpo como superfícies lisas, por cortes de altura ---------- */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** perfil por altura, com curva suave (Catmull-Rom) para não ter quinas */
const perfil = (tab: [number, number][], y: number) => {
  for (let i = 0; i < tab.length - 1; i++) {
    const [y0, v1] = tab[i], [y1, v2] = tab[i + 1]
    if (y <= y0 && y >= y1) {
      const t = (y0 - y) / (y0 - y1 || 1), v0 = (tab[i - 1] || tab[i])[1], v3 = (tab[i + 2] || tab[i + 1])[1]
      return 0.5 * ((2 * v1) + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t * t + (-v0 + 3 * v1 - 3 * v2 + v3) * t * t * t)
    }
  }
  return tab[y > tab[0][0] ? 0 : tab.length - 1][1]
}
type Corte = { y: number; cx: number; cz: number; rx: number; rz: number }
type Parte = { cortes: Corte[]; reg: (y: number, z: number, x: number) => string }

const TX: [number, number][] = [[0.725, 0.055], [0.7, 0.1], [0.67, 0.165], [0.63, 0.198], [0.56, 0.196], [0.47, 0.184], [0.37, 0.16], [0.28, 0.137], [0.18, 0.147], [0.09, 0.178], [0.01, 0.176], [-0.05, 0.15], [-0.1, 0.07]]
const TZ: [number, number][] = [[0.725, 0.05], [0.67, 0.082], [0.6, 0.104], [0.5, 0.117], [0.38, 0.098], [0.28, 0.084], [0.13, 0.097], [0.04, 0.11], [-0.05, 0.09], [-0.1, 0.05]]
const PEITO: [number, number][] = [[0.61, 0], [0.53, 0.02], [0.45, 0.015], [0.39, 0]]
const GL: [number, number][] = [[0.22, 0], [0.14, 0.012], [0.07, 0.028], [0.01, 0.032], [-0.04, 0.018], [-0.07, 0]]
const BX: [number, number][] = [[0.67, 0.258], [0.3, 0.312], [-0.02, 0.33], [-0.21, 0.335]]
const BR: [number, number][] = [[0.67, 0.07], [0.57, 0.062], [0.46, 0.053], [0.35, 0.041], [0.29, 0.045], [0.15, 0.039], [0.01, 0.027], [-0.03, 0.033], [-0.11, 0.036], [-0.17, 0.026], [-0.215, 0.006]]
const PR: [number, number][] = [[0.07, 0.06], [-0.03, 0.098], [-0.15, 0.09], [-0.3, 0.072], [-0.43, 0.052], [-0.47, 0.05], [-0.52, 0.056], [-0.6, 0.062], [-0.72, 0.046], [-0.85, 0.031], [-0.905, 0.032]]

function partes(): Parte[] {
  const ps: Parte[] = []; const dy = 0.008
  const fatia = (y0: number, y1: number, f: (y: number) => Corte | null) => { const c: Corte[] = []; for (let y = y0; y >= y1 - 1e-6; y -= dy) { const k = f(y); if (k) c.push(k) } return c }
  // cabeça e pescoço
  ps.push({ cortes: fatia(1.0, 0.7, (y) => {
    if (y > 0.745) { const t = (y - 0.868) / 0.132; const r = Math.sqrt(Math.max(0.0004, 1 - t * t)); const mand = y < 0.82 ? lerp(1, 0.7, Math.min(1, (0.82 - y) / 0.075)) : 1; return { y, cx: 0, cz: y < 0.82 ? 0.012 : 0.004, rx: 0.08 * r * mand, rz: 0.096 * r * (y < 0.82 ? 0.92 : 1) } }
    return { y, cx: 0, cz: -0.004, rx: 0.05, rz: 0.055 } }), reg: () => 'cabeca' })
  // nariz
  ps.push({ cortes: fatia(0.862, 0.81, (y) => { const t = (y - 0.836) / 0.026; const r = Math.sqrt(Math.max(0.0004, 1 - t * t)); return { y, cx: 0, cz: 0.084 + 0.006 * (1 - t), rx: 0.011 * r, rz: 0.012 * r } }), reg: () => 'cabeca' })
  // tronco
  ps.push({ cortes: fatia(0.735, -0.1, (y) => { const g = y < 0.22 ? Math.max(0, perfil(GL, y)) : 0, pe = Math.max(0, perfil(PEITO, y)); const top = y > 0.725 ? 0.2 : 1; return { y, cx: 0, cz: pe - g, rx: perfil(TX, y) * top, rz: (perfil(TZ, y) + g + pe) * top } }),
    reg: (y, z, x) => { if (y > 0.37) return z > -0.01 ? (y > 0.6 && Math.abs(x) > 0.14 ? 'Ombro' : 'Peito') : 'Costas'; if (y > 0.14) return z > 0 ? 'Core' : 'Costas'; return z < -0.02 ? 'Glúteo' : 'Core' } })
  for (const sx of [-1, 1]) {
    // deltoide
    ps.push({ cortes: fatia(0.71, 0.53, (y) => { const t = (y - 0.628) / 0.08; const r = 0.066 * Math.sqrt(Math.max(0.0004, 1 - t * t)); return { y, cx: sx * 0.236, cz: 0, rx: r, rz: r * 0.95 } }), reg: () => 'Ombro' })
    // braço e mão
    ps.push({ cortes: fatia(0.66, -0.215, (y) => { const r = perfil(BR, y), mao = y < -0.02; return { y, cx: sx * perfil(BX, y), cz: mao ? 0.006 : 0, rx: mao ? r * 0.45 : r, rz: mao ? r * 1.05 : r * 0.95 } }),
      reg: (y) => (y > 0.56 ? 'Ombro' : y > 0.31 ? 'Tríceps' : 'antebraco') })
    // perna
    ps.push({ cortes: fatia(0.07, -0.905, (y) => { const r = perfil(PR, y); const cz = y < -0.5 && y > -0.75 ? -0.008 : y < -0.42 && y > -0.5 ? 0.008 : 0; return { y, cx: sx * lerp(0.094, 0.1, Math.max(0, -y) / 0.9), cz: cz - (y > -0.05 ? 0.01 : 0), rx: r, rz: r * 0.95 } }),
      reg: (y, z) => (y > -0.46 ? (z > 0 ? 'Quadríceps' : 'Posterior') : 'Panturrilha') })
    // pé
    ps.push({ cortes: fatia(-0.9, -0.99, (y) => { const t = (-0.9 - y) / 0.09; return { y, cx: sx * 0.104, cz: 0.03 + 0.025 * t, rx: 0.034 * (1 - 0.3 * t * t), rz: (0.052 + 0.035 * t) * (1 - 0.5 * t * t) } }), reg: () => 'pe' })
  }
  return ps
}

/** monta a malha: cada parte vira um tubo liso, fechado nas pontas; guarda a região de cada vértice */
function malha() {
  const pos: number[] = [], reg: string[] = [], idx: number[] = []; const N = 48
  for (const p of partes()) {
    const base = pos.length / 3; const c = p.cortes
    // tampa de cima
    pos.push(c[0].cx, c[0].y + 0.004, c[0].cz); reg.push(p.reg(c[0].y, 0, 0))
    for (const k of c) for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; const x = k.cx + k.rx * Math.sin(t), z = k.cz + k.rz * Math.cos(t); pos.push(x, k.y, z); reg.push(p.reg(k.y, z - k.cz, x - k.cx)) }
    const L = c[c.length - 1]; pos.push(L.cx, L.y - 0.004, L.cz); reg.push(p.reg(L.y, 0, 0))
    const topo = base, fundo = pos.length / 3 - 1, anel = (j: number, i: number) => base + 1 + j * N + (i % N)
    for (let i = 0; i < N; i++) idx.push(topo, anel(0, i), anel(0, i + 1))
    for (let j = 0; j < c.length - 1; j++) for (let i = 0; i < N; i++) { const a = anel(j, i), b = anel(j, i + 1), d = anel(j + 1, i), e = anel(j + 1, i + 1); idx.push(a, d, b, b, d, e) }
    for (let i = 0; i < N; i++) idx.push(fundo, anel(c.length - 1, i + 1), anel(c.length - 1, i))
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3))
  return { g, reg }
}

export default function CorpoOrbita({ regioes, itens = [], onItem, onRegiao, altura = 460, legenda = true, unidade = 'séries' }: {
  regioes: Record<string, Regiao>; itens?: ItemOrbita[]; onItem?: (i: ItemOrbita) => void; onRegiao?: (g: string) => void; altura?: number; legenda?: boolean; unidade?: 'séries' | 'alunas'
}) {
  const ref = useRef<HTMLDivElement>(null), trasRef = useRef<HTMLCanvasElement>(null), glRef = useRef<HTMLCanvasElement>(null), frenteRef = useRef<HTMLCanvasElement>(null)
  const [dica, setDica] = useState<{ x: number; y: number; t: string; s: string } | null>(null)
  const [semGL, setSemGL] = useState(false)
  const estado = useRef({ regioes, itens, onItem, onRegiao, unidade }); estado.current = { regioes, itens, onItem, onRegiao, unidade }

  useEffect(() => {
    const el = ref.current!, cvT = trasRef.current!, cvF = frenteRef.current!, cvG = glRef.current!
    const ct = cvT.getContext('2d')!, cf = cvF.getContext('2d')!
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    let renderer: THREE.WebGLRenderer | null = null
    try { renderer = new THREE.WebGLRenderer({ canvas: cvG, antialias: true, alpha: true, powerPreference: 'low-power' }) } catch { setSemGL(true) }
    const cena = new THREE.Scene(); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000); cam.position.z = 1000
    const grupo = new THREE.Group(); cena.add(grupo)
    const { g, reg } = malha()
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.78, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.3, emissive: new THREE.Color(0x1f1404), emissiveIntensity: 0.5 })
    const corpo = new THREE.Mesh(g, mat); grupo.add(corpo)
    if (renderer) {
      renderer.setPixelRatio(DPR); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95; renderer.outputColorSpace = THREE.SRGBColorSpace
      const pm = new THREE.PMREMGenerator(renderer); cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
    }
    cena.add(new THREE.HemisphereLight(0xfff1d6, 0x1a1208, 0.6))
    const chave = new THREE.DirectionalLight(0xffe2a8, 1.9); chave.position.set(-0.6, 0.9, 1); cena.add(chave)
    const contra = new THREE.DirectionalLight(0xffd27a, 3.2); contra.position.set(0.8, 0.4, -1); cena.add(contra)
    const baixo = new THREE.DirectionalLight(0xb8955a, 0.8); baixo.position.set(0, -1, 0.4); cena.add(baixo)
    const cor = g.getAttribute('color') as THREE.BufferAttribute
    // transição suave entre músculos: indicador de cada região, alisado pelos vizinhos da malha
    const nV = reg.length, ix = g.getIndex()!.array as ArrayLike<number>
    const viz: number[][] = Array.from({ length: nV }, () => [])
    for (let i = 0; i < ix.length; i += 3) { const a = ix[i], b = ix[i + 1], d = ix[i + 2]; viz[a].push(b, d); viz[b].push(a, d); viz[d].push(a, b) }
    const MUSC = ['Peito', 'Costas', 'Ombro', 'Tríceps', 'Core', 'Glúteo', 'Quadríceps', 'Posterior', 'Panturrilha']
    const peso: Float32Array[] = MUSC.map((m) => {
      let w = new Float32Array(nV); for (let i = 0; i < nV; i++) w[i] = reg[i] === m ? 1 : 0
      for (let it = 0; it < 7; it++) { const n = new Float32Array(nV); for (let i = 0; i < nV; i++) { const v = viz[i]; let sm = w[i] * 2; for (const j of v) sm += w[j]; n[i] = sm / (v.length + 2) } w = n }
      return w
    })

    function pintar(t: number) {
      const R = estado.current.regioes
      const OURO = [0.5, 0.33, 0.12], CLARO = [1.0, 0.76, 0.32], DOR = [0.85, 0.12, 0.08]
      const pu = 0.5 + 0.5 * Math.sin(t / 320)
      const alvos = MUSC.map((m) => { const r = R[m]; if (r?.dor) { const k = 0.55 + 0.45 * pu; return [lerp(OURO[0], DOR[0], k), lerp(OURO[1], DOR[1], k), lerp(OURO[2], DOR[2], k)] } const k = r ? Math.min(1, r.pct) : 0; return [lerp(OURO[0], CLARO[0], k), lerp(OURO[1], CLARO[1], k), lerp(OURO[2], CLARO[2], k)] })
      for (let i = 0; i < nV; i++) {
        let r0 = OURO[0], g0 = OURO[1], b0 = OURO[2]
        for (let m = 0; m < MUSC.length; m++) { const w = peso[m][i]; if (w > 0.002) { r0 += (alvos[m][0] - OURO[0]) * w; g0 += (alvos[m][1] - OURO[1]) * w; b0 += (alvos[m][2] - OURO[2]) * w } }
        cor.setXYZ(i, r0, g0, b0)
      }
      cor.needsUpdate = true
    }
    const temDor = () => Object.values(estado.current.regioes).some((r) => r.dor)

    let W = 0, H = 0, S = 0, RX = 0, CX = 0, CY = 0, ang = 0.4, vivo = true, arrasto: { x: number; a: number } | null = null, ultimoArr = 0
    let hoverItem: string | null = null, hoverReg: string | null = null, ultimaPintura = -1e9, assinaturaReg = ''
    const itensAng = new Map<string, { ang: number; vel: number }>()
    const posItens: { it: ItemOrbita; x: number; y: number; frente: boolean }[] = []
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2()

    function tam() {
      const r = el.getBoundingClientRect(); W = Math.max(280, r.width); H = altura
      for (const c of [cvT, cvF]) { c.width = W * DPR; c.height = H * DPR; c.style.width = W + 'px'; c.style.height = H + 'px' }
      ct.setTransform(DPR, 0, 0, DPR, 0, 0); cf.setTransform(DPR, 0, 0, DPR, 0, 0)
      S = Math.min(H * 0.4, W * 0.4); RX = Math.min(W * 0.47, S * 1.55); CX = W / 2; CY = H * 0.47
      if (renderer) { renderer.setSize(W, H, false); cvG.style.width = W + 'px'; cvG.style.height = H + 'px' }
      cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2; cam.updateProjectionMatrix()
      grupo.scale.setScalar(S); grupo.position.set(0, H / 2 - CY, 0)
    }
    const ro = new ResizeObserver(tam); ro.observe(el); tam()

    function anel(cx: CanvasRenderingContext2D, rr: number, a0: number, a1: number, c: string) { cx.beginPath(); cx.ellipse(CX, CY + S * 0.12, rr, rr * INCL, 0, a0, a1); cx.strokeStyle = c; cx.lineWidth = 1; cx.stroke() }
    function itensEm(cx: CanvasRenderingContext2D, frente: boolean, t: number) {
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
        if (frente || hov) {
          cx.font = `${hov ? 600 : 500} 12px "Libre Franklin", system-ui`; cx.fillStyle = 'rgba(237,230,214,.92)'
          const lw = cx.measureText(p.it.n).width; let esq = p.x < CX
          if (!esq && p.x + 9 + lw > W - 2) esq = true; if (esq && p.x - 9 - lw < 2) esq = false
          cx.textAlign = esq ? 'right' : 'left'; cx.fillText(p.it.n, p.x + (esq ? -9 : 9), p.y + 4)
        }
        cx.globalAlpha = 1
      }
    }

    function quadro(t: number) {
      if (!vivo) return
      if (!arrasto && !reduzido && t - ultimoArr > 1500) ang += 0.004
      const sig = JSON.stringify(Object.entries(estado.current.regioes).map(([k, r]) => [k, Math.round(r.pct * 20), !!r.dor]))
      if (sig !== assinaturaReg || (temDor() && t - ultimaPintura > 90)) { pintar(t); ultimaPintura = t; assinaturaReg = sig }
      // fundo: halo e plataforma
      ct.clearRect(0, 0, W, H); cf.clearRect(0, 0, W, H)
      const gr = ct.createRadialGradient(CX, CY, S * 0.1, CX, CY, S * 1.15); gr.addColorStop(0, 'rgba(184,149,90,.16)'); gr.addColorStop(1, 'rgba(184,149,90,0)'); ct.fillStyle = gr; ct.fillRect(0, 0, W, H)
      const pe = CY + 0.995 * S
      for (let i = 0; i < 4; i++) { const rr = S * (0.2 + i * 0.11), pul = 0.5 + 0.5 * Math.sin(t / 900 - i * 0.8); ct.beginPath(); ct.ellipse(CX, pe, rr, rr * 0.22, 0, 0, 7); ct.strokeStyle = `rgba(217,190,134,${(0.3 - i * 0.06) * (0.6 + 0.4 * pul)})`; ct.lineWidth = 1; ct.stroke() }
      const gp = ct.createRadialGradient(CX, pe, 2, CX, pe, S * 0.45); gp.addColorStop(0, 'rgba(217,190,134,.3)'); gp.addColorStop(1, 'rgba(217,190,134,0)'); ct.fillStyle = gp; ct.beginPath(); ct.ellipse(CX, pe, S * 0.45, S * 0.1, 0, 0, 7); ct.fill()
      // órbita
      posItens.length = 0
      const its = estado.current.itens
      its.forEach((it, i) => {
        let a = itensAng.get(it.id); if (!a) { const mesmos = its.filter((x) => x.anel === it.anel); const j = mesmos.indexOf(it); a = { ang: (j / Math.max(1, mesmos.length)) * Math.PI * 2 + it.anel * 0.9, vel: 0.0011 - it.anel * 0.0002 + (i % 3) * 0.00005 }; itensAng.set(it.id, a) }
        if (!reduzido && hoverItem !== it.id) a.ang += a.vel
        const rr = RX * (RAIOS[it.anel] + DESVIO[it.st] * 0.6)
        posItens.push({ it, x: CX + Math.cos(a.ang) * rr, y: CY + S * 0.12 + Math.sin(a.ang) * rr * INCL, frente: Math.sin(a.ang) > 0 })
      })
      if (its.length) { RAIOS.forEach((r) => anel(ct, RX * r, Math.PI, Math.PI * 2, 'rgba(216,191,134,.16)')); RAIOS.forEach((r) => anel(cf, RX * r, 0, Math.PI, 'rgba(216,191,134,.32)')) }
      itensEm(ct, false, t); itensEm(cf, true, t)
      // corpo
      grupo.rotation.y = ang; grupo.position.y = H / 2 - CY + Math.sin(t / 1400) * S * 0.006
      if (renderer) renderer.render(cena, cam)
      requestAnimationFrame(quadro)
    }
    requestAnimationFrame(quadro)

    const local = (e: PointerEvent) => { const r = cvF.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    function achar(x: number, y: number) {
      let it: any = null, dm = 14; for (const p of posItens) { const d = Math.hypot(p.x - x, p.y - y); if (d < dm) { dm = d; it = p } }
      if (it) return { tipo: 'item' as const, it }
      mouse.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(mouse, cam)
      const hit = ray.intersectObject(corpo, false)[0]
      if (hit && hit.face) { const rg = reg[hit.face.a]; if (estado.current.regioes[rg]) return { tipo: 'reg' as const, rg } }
      return null
    }
    function texto(rg: string, R: Regiao) {
      const base = estado.current.unidade === 'alunas' ? `${R.feito} de ${R.alvo} alunas bateram o volume (${Math.round(100 * R.pct)}%)` : R.alvo ? `${R.feito} de ${R.alvo} séries na semana (${Math.round(100 * Math.min(1, R.feito / R.alvo))}%)` : `${R.feito} séries na semana`
      return { t: rg, s: base + (R.dor ? ` · ${R.dor}` : '') }
    }
    function mover(e: PointerEvent) {
      const { x, y } = local(e)
      if (arrasto) { ang = arrasto.a + (x - arrasto.x) * 0.012; ultimoArr = performance.now(); return }
      const h = achar(x, y); hoverItem = h?.tipo === 'item' ? h.it.it.id : null; hoverReg = h?.tipo === 'reg' ? h.rg : null
      cvF.style.cursor = h ? 'pointer' : 'grab'
      if (h?.tipo === 'item') setDica({ x: h.it.x, y: h.it.y, t: `${h.it.it.n} · ${ROT_ST[h.it.it.st]}`, s: h.it.it.info })
      else if (h?.tipo === 'reg') setDica({ x, y, ...texto(h.rg, estado.current.regioes[h.rg]) })
      else setDica(null)
      void hoverReg
    }
    let inicio = { x: 0, y: 0, t: 0 }
    const desce = (e: PointerEvent) => { const p = local(e); inicio = { ...p, t: performance.now() }; arrasto = { x: p.x, a: ang }; cvF.setPointerCapture(e.pointerId) }
    const sobe = (e: PointerEvent) => {
      const p = local(e); const clique = Math.hypot(p.x - inicio.x, p.y - inicio.y) < 6 && performance.now() - inicio.t < 400; arrasto = null
      if (!clique) return
      const h = achar(p.x, p.y)
      if (h?.tipo === 'item') { setDica({ x: h.it.x, y: h.it.y, t: `${h.it.it.n} · ${ROT_ST[h.it.it.st]}`, s: h.it.it.info }); estado.current.onItem?.(h.it.it) }
      else if (h?.tipo === 'reg') { setDica({ x: p.x, y: p.y, ...texto(h.rg, estado.current.regioes[h.rg]) }); estado.current.onRegiao?.(h.rg) } else setDica(null)
    }
    const sai = () => { hoverItem = null; hoverReg = null; setDica(null); arrasto = null }
    cvF.addEventListener('pointermove', mover); cvF.addEventListener('pointerdown', desce); cvF.addEventListener('pointerup', sobe); cvF.addEventListener('pointerleave', sai)
    return () => {
      vivo = false; ro.disconnect(); cvF.removeEventListener('pointermove', mover); cvF.removeEventListener('pointerdown', desce); cvF.removeEventListener('pointerup', sobe); cvF.removeEventListener('pointerleave', sai)
      g.dispose(); mat.dispose(); renderer?.dispose()
    }
  }, [altura])

  const lista = Object.entries(regioes)
  return (
    <div>
      <div ref={ref} className="corpo-orb" style={{ height: altura }}>
        <canvas ref={trasRef} className="corpo-camada" aria-hidden="true" />
        <canvas ref={glRef} className="corpo-camada" aria-hidden="true" />
        <canvas ref={frenteRef} className="corpo-camada" style={{ touchAction: 'pan-y', cursor: 'grab' }} role="img" aria-label="Corpo com os músculos treinados na semana e, em volta, o que está em dia e o que está atrasado" />
        {semGL && <div className="corpo-semgl">Este aparelho não mostra o corpo em 3D. Os dados estão em “Teus resultados”.</div>}
        {dica && <div className="corpo-dica" style={{ left: Math.min(Math.max(dica.x, 110), (ref.current?.clientWidth || 300) - 110), top: dica.y - 12 }}><b>{dica.t}</b><span>{dica.s}</span></div>}
      </div>
      {legenda && <div className="corpo-legenda">
        <span><i style={{ background: '#D9BE86' }} />em órbita</span><span><i style={{ border: '1.6px solid #D9BE86' }} />se afastando</span><span><i style={{ background: '#F6EFDC', boxShadow: '0 0 0 3px #d9be8633' }} />fora de órbita</span>
        <span><i style={{ background: '#B23A2E' }} />dor</span>
        <span className="sep" /><span><i className="grad" />ouro mais claro = músculo mais treinado na semana</span>
        <span style={{ flexBasis: '100%', justifyContent: 'center' }}>anel de dentro: hoje · do meio: semana · de fora: ciclo</span>
      </div>}
      <div className="sr-only"><table><caption>Músculos na semana</caption><tbody>{lista.map(([g, r]) => <tr key={g}><td>{g}</td><td>{r.feito} de {r.alvo}</td><td>{r.dor || ''}</td></tr>)}{itens.map((i) => <tr key={i.id}><td>{i.n}</td><td>{ROT_ST[i.st]}</td><td>{i.info}</td></tr>)}</tbody></table></div>
    </div>
  )
}
