// CORPO EM ÓRBITA — uma figura humana esculpida em ouro, com luz de verdade, girando devagar.
// Cada músculo clareia conforme o que recebeu de treino na semana; dor aparece pulsando em vermelho.
// Em volta, três anéis (hoje, semana, ciclo): o que está em dia fica no anel, o que atrasa se afasta.
// O corpo é desenhado em WebGL (three.js); os anéis e os pontos ficam em duas camadas 2D, atrás e na frente.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import type { ItemOrbita, Regiao } from '../lib/corpo'

const ROT_ST: Record<string, string> = { ok: 'em órbita', pend: 'se afastando', atr: 'fora de órbita', sem: 'sem demanda agora' }
const DESVIO: Record<string, number> = { ok: 0, pend: 0.1, atr: 0.24, sem: 0.04 }
const RAIOS = [0.56, 0.78, 1.0], INCL = 0.24

/* ---------- o corpo: modelo humano (malha com esqueleto e animação de respiração) ---------- */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const MUSC = ['Peito', 'Costas', 'Ombro', 'Tríceps', 'Core', 'Glúteo', 'Quadríceps', 'Posterior', 'Panturrilha']
/** região de um vértice pela posição de repouso (pose em T), normalizada pela altura; frente = normal para +z */
function regiaoDe(x: number, y: number, frente: boolean) {
  const ax = Math.abs(x)
  if (y > 0.86) return 'cabeca'
  if (y > 0.83 && ax < 0.06) return 'pescoco'
  if (ax > 0.094 && y > 0.66) return ax < 0.15 ? 'Ombro' : ax < 0.277 ? 'Tríceps' : 'antebraco'
  if (y > 0.747) return frente ? (ax > 0.066 ? 'Ombro' : 'Peito') : 'Costas'
  if (y > 0.62) return frente ? 'Peito' : 'Costas'
  if (y > 0.543) return frente ? 'Core' : 'Costas'
  if (y > 0.487) return frente ? 'Core' : 'Glúteo'
  if (y > 0.277) return frente ? 'Quadríceps' : (y > 0.43 ? 'Glúteo' : 'Posterior')
  if (y > 0.044) return 'Panturrilha'
  return 'pe'
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
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.8, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.28, emissive: new THREE.Color(0x1f1404), emissiveIntensity: 0.5 })
    if (renderer) {
      renderer.setPixelRatio(DPR); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95; renderer.outputColorSpace = THREE.SRGBColorSpace
      const pm = new THREE.PMREMGenerator(renderer); cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
    }
    cena.add(new THREE.HemisphereLight(0xfff1d6, 0x1a1208, 0.6))
    const chave = new THREE.DirectionalLight(0xffe2a8, 1.9); chave.position.set(-0.6, 0.9, 1); cena.add(chave)
    const contra = new THREE.DirectionalLight(0xffd27a, 3.2); contra.position.set(0.8, 0.4, -1); cena.add(contra)
    const baixo = new THREE.DirectionalLight(0xb8955a, 0.8); baixo.position.set(0, -1, 0.4); cena.add(baixo)

    // cada malha do modelo guarda: região de cada vértice e o peso alisado de cada músculo (transição suave)
    type Info = { mesh: THREE.SkinnedMesh; reg: string[]; peso: Float32Array[]; cor: THREE.BufferAttribute }
    const infos: Info[] = []; let mixer: THREE.AnimationMixer | null = null; let carregado = false
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load('/modelos/corpo.glb', (gltf) => {
      if (!vivo) return
      const modelo = gltf.scene; const pivo = new THREE.Group(); pivo.add(modelo); modelo.updateMatrixWorld(true)
      const caixa = new THREE.Box3().setFromObject(modelo); const alt = caixa.max.y - caixa.min.y || 1
      const cxm = (caixa.max.x + caixa.min.x) / 2, czm = (caixa.max.z + caixa.min.z) / 2
      const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3()
      // caixa de repouso medida nos próprios vértices (a mesma base usada para dar a região de cada um)
      const malhas: any[] = []; modelo.traverse((o: any) => { if (o.isMesh) malhas.push(o) })
      const rb = new THREE.Box3()
      for (const o of malhas) { const p = o.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) rb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)) }
      const ra = rb.max.y - rb.min.y || 1, rcx = (rb.max.x + rb.min.x) / 2
      for (const o of malhas) {
        const geo = o.geometry as THREE.BufferGeometry; const p = geo.getAttribute('position'), no = geo.getAttribute('normal'); nm.getNormalMatrix(o.matrixWorld)
        const nV = p.count, reg: string[] = new Array(nV)
        for (let i = 0; i < nV; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); n.fromBufferAttribute(no, i).applyMatrix3(nm); reg[i] = regiaoDe((v.x - rcx) / ra, (v.y - rb.min.y) / ra, n.z > 0) }
        const ix = geo.getIndex()?.array as ArrayLike<number> | undefined
        const viz: number[][] = Array.from({ length: nV }, () => [])
        if (ix) for (let i = 0; i < ix.length; i += 3) { const a = ix[i], b = ix[i + 1], d = ix[i + 2]; viz[a].push(b, d); viz[b].push(a, d); viz[d].push(a, b) }
        const peso = MUSC.map((m) => { let w = new Float32Array(nV); for (let i = 0; i < nV; i++) w[i] = reg[i] === m ? 1 : 0
          for (let it = 0; it < 6; it++) { const q = new Float32Array(nV); for (let i = 0; i < nV; i++) { const vv = viz[i]; let sm = w[i] * 2; for (const j of vv) sm += w[j]; q[i] = sm / (vv.length + 2) } w = q }
          return w })
        const cor = new THREE.Float32BufferAttribute(new Float32Array(nV * 3).fill(1), 3); geo.setAttribute('color', cor)
        o.material = mat; o.frustumCulled = false
        infos.push({ mesh: o, reg, peso, cor })
      }
      // escala: altura do corpo = 2 unidades, pés em -1, centrado
      const k = 2 / alt; pivo.scale.setScalar(k); pivo.position.set(-cxm * k, -1 - caixa.min.y * k, -czm * k)
      grupo.add(pivo)
      const idle = gltf.animations.find((a) => a.name === 'idle') || gltf.animations[0]
      if (idle) { mixer = new THREE.AnimationMixer(modelo); mixer.clipAction(idle).play() }
      carregado = true; assinaturaReg = ''
    }, undefined, () => setSemGL(true))

    function pintar(t: number) {
      const R = estado.current.regioes
      const OURO = [0.5, 0.33, 0.12], CLARO = [1.0, 0.76, 0.32], DOR = [0.85, 0.12, 0.08]
      const pu = 0.5 + 0.5 * Math.sin(t / 320)
      const alvos = MUSC.map((m) => { const r = R[m]; if (r?.dor) { const k = 0.55 + 0.45 * pu; return [lerp(OURO[0], DOR[0], k), lerp(OURO[1], DOR[1], k), lerp(OURO[2], DOR[2], k)] } const k = r ? Math.min(1, r.pct) : 0; return [lerp(OURO[0], CLARO[0], k), lerp(OURO[1], CLARO[1], k), lerp(OURO[2], CLARO[2], k)] })
      for (const inf of infos) {
        const nV = inf.reg.length
        for (let i = 0; i < nV; i++) {
          let r0 = OURO[0], g0 = OURO[1], b0 = OURO[2]
          for (let m = 0; m < MUSC.length; m++) { const w = inf.peso[m][i]; if (w > 0.002) { r0 += (alvos[m][0] - OURO[0]) * w; g0 += (alvos[m][1] - OURO[1]) * w; b0 += (alvos[m][2] - OURO[2]) * w } }
          inf.cor.setXYZ(i, r0, g0, b0)
        }
        inf.cor.needsUpdate = true
      }
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
      if (mixer) mixer.update(1 / 60)
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
      const hit = carregado ? ray.intersectObjects(infos.map((x) => x.mesh), false)[0] : null
      if (hit && hit.face) { const inf = infos.find((x) => x.mesh === hit.object); const rg = inf?.reg[hit.face.a]; if (rg && estado.current.regioes[rg]) return { tipo: 'reg' as const, rg } }
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
      infos.forEach((x) => x.mesh.geometry.dispose()); mat.dispose(); renderer?.dispose()
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
