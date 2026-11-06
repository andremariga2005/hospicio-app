import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

/* ---------- ícones ---------- */
export const Icone = {
  casa: <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  halter: <svg viewBox="0 0 24 24"><path d="M2 12h20M5 8v8M8 6v12M16 6v12M19 8v8" /></svg>,
  prato: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></svg>,
  gente: <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 15.5c.9-.6 1.9-.9 3-.9 2.8 0 4 2.2 4 5" /></svg>,
  ficha: <svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h7M9 16h7" /></svg>,
  relogio: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  serie: <svg viewBox="0 0 24 24"><path d="M4 7h13l-3-3M20 17H7l3 3" /></svg>,
  peso: <svg viewBox="0 0 24 24"><path d="M6 20h12l-2-11H8zM9 9a3 3 0 0 1 6 0" /></svg>,
  voltar: <svg viewBox="0 0 24 24" width="22" height="22" stroke="#EDE6D6" fill="none" strokeWidth="1.8"><path d="M15 5l-7 7 7 7" /></svg>,
  coroa: <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" /></svg>,
}

export function Assinatura({ tamanho }: { tamanho?: number }) {
  return (
    <div className="assinatura">
      <span className="escrita" style={tamanho ? { fontSize: tamanho } : undefined}>Abel Colognese</span>
      <svg viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8 C46 2 118 1 176 4 C204 5.5 224 7 236 3" /></svg>
    </div>
  )
}

export function Tunel() {
  const W = 1600, H = 1000, cx = 800, cy = 470
  const q = Array.from({ length: 9 }, (_, i) => { const k = Math.pow(0.72, i); return { w: 1500 * k, h: 1050 * k } })
  const l = q[q.length - 1]
  return (
    <svg className="tunel" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><radialGradient id="vg" cx="50%" cy="47%" r="65%"><stop offset="0" stopColor="#2a2114" stopOpacity=".9" /><stop offset=".45" stopColor="#0B0A08" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity=".95" /></radialGradient></defs>
      <rect width={W} height={H} fill="#0B0A08" />
      {q.map((r, i) => (
        <g key={i}>
          <rect x={cx - r.w / 2} y={cy - r.h / 2} width={r.w} height={r.h} fill="none" stroke="#B8955A" strokeOpacity={(0.5 - i * 0.045).toFixed(2)} strokeWidth={Math.max(0.6, 2.2 - i * 0.2)} />
          {i > 0 && i < 8 && <rect className="luz" x={cx - r.w * 0.09} y={cy - r.h / 2 + 4} width={r.w * 0.18} height={Math.max(2, 10 - i)} fill="#EDE6D6" opacity=".85" rx="1" />}
        </g>
      ))}
      {[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y], i) => <line key={i} x1={x} y1={y} x2={cx + (x < cx ? -l.w / 2 : l.w / 2)} y2={cy + (y < cy ? -l.h / 2 : l.h / 2)} stroke="#B8955A" strokeOpacity=".28" />)}
      <rect width={W} height={H} fill="url(#vg)" />
    </svg>
  )
}

export function Gauge({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct)), R = 52, cx = 66, cy = 66, L = Math.PI * R
  const a = Math.PI * 0.25, tx = cx + R * Math.cos(a), ty = cy - R * Math.sin(a), tx2 = cx + (R + 9) * Math.cos(a), ty2 = cy - (R + 9) * Math.sin(a)
  return (
    <svg viewBox="0 0 132 80" role="img" aria-label={`${p}% da meta da semana`}>
      <path d="M14 66 A52 52 0 0 1 118 66" fill="none" stroke="#ffffff14" strokeWidth="9" strokeLinecap="round" />
      <path d="M14 66 A52 52 0 0 1 118 66" fill="none" stroke={p >= 75 ? '#86A562' : '#B8955A'} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(L * p) / 100} ${L}`} />
      <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="#EDE6D6" strokeWidth="2" />
      <text x={tx2 + 2} y={ty2 - 2} fill="#A89A80" fontSize="9" fontFamily="Courier Prime">75%</text>
    </svg>
  )
}

export function Anel({ v, meta, cor, rotulo }: { v: number; meta: number; cor: string; rotulo: string }) {
  const R = 29, L = 2 * Math.PI * R, p = meta ? Math.min(1, v / meta) : 0
  return (
    <div>
      <svg viewBox="0 0 70 70" role="img" aria-label={rotulo}>
        <circle cx="35" cy="35" r={R} fill="none" stroke="#ffffff12" strokeWidth="5" />
        <circle cx="35" cy="35" r={R} fill="none" stroke={cor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${L * p} ${L}`} transform="rotate(-90 35 35)" />
        <text x="35" y="34" textAnchor="middle" fill="#EDE6D6" fontSize="12" fontFamily="Courier Prime">{Math.round(v)}</text>
        <text x="35" y="46" textAnchor="middle" fill="#756B58" fontSize="8.5" fontFamily="Courier Prime">{Math.round(meta)}</text>
      </svg>
      <small>{rotulo}</small>
    </div>
  )
}

export function Chips<T>({ opcoes, valor, onEscolher, estilo }: { opcoes: [T, string][]; valor?: T; onEscolher: (v: T, rotulo: string) => void; estilo?: any }) {
  return (
    <div className="chips" style={estilo}>
      {opcoes.map(([v, t]) => <button key={String(v)} type="button" className={'chip' + (valor === v ? ' on' : '')} onClick={() => onEscolher(v, t)}>{t}</button>)}
    </div>
  )
}

export const Tag = ({ k, children }: { k?: string; children: ReactNode }) => <span className={`tag ${k ? 't-' + k : ''}`}><i />{children}</span>
export const Veredito = ({ v, peq }: { v: string; peq?: boolean }) => <span className={`ver ${v}`} style={peq ? { fontSize: 10 } : undefined}>{({ patetica: 'Patética', aceitavel: 'Aceitável', perfeita: 'Perfeita' } as any)[v] || ''}</span>

export function Modal({ aberto, onFechar, children, travado }: { aberto: boolean; onFechar: () => void; children: ReactNode; travado?: boolean }) {
  if (!aberto) return null
  return (
    <div className="modal-fundo" onClick={(e) => { if (e.target === e.currentTarget && !travado) onFechar() }}>
      <div className="modal" role="dialog" aria-modal="true">{!travado && <button className="modal-x" onClick={onFechar} aria-label="Fechar">×</button>}{children}</div>
    </div>
  )
}

/* ---------- toast ---------- */
const ToastCtx = createContext<(t: string) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState(''); const [on, setOn] = useState(false)
  const mostrar = useCallback((t: string) => { setMsg(t); setOn(true); clearTimeout((mostrar as any)._t); (mostrar as any)._t = setTimeout(() => setOn(false), 2800) }, [])
  return <ToastCtx.Provider value={mostrar}>{children}<div id="toast" role="status" aria-live="polite" className={on ? 'on' : ''}>{msg}</div></ToastCtx.Provider>
}
export const useToast = () => useContext(ToastCtx)
