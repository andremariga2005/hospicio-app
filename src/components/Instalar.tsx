import { useEffect, useState } from 'react'

// Convite para instalar o app no celular (Android/Chrome pelo prompt do navegador; iPhone pelo Compartilhar).
export default function Instalar() {
  const [evento, setEvento] = useState<any>(null)
  const [fechado, setFechado] = useState(() => { try { return localStorage.getItem('hosp_instalar') === 'x' } catch { return false } })
  const instalado = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone)
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  useEffect(() => { const f = (e: any) => { e.preventDefault(); setEvento(e) }; window.addEventListener('beforeinstallprompt', f); return () => window.removeEventListener('beforeinstallprompt', f) }, [])
  if (instalado || fechado || (!evento && !ios)) return null
  const fechar = () => { setFechado(true); try { localStorage.setItem('hosp_instalar', 'x') } catch { /* sem armazenamento */ } }
  return (
    <div className="instalar">
      <img src="/icone-192.png" alt="" width={36} height={36} style={{ borderRadius: 8 }} />
      <div style={{ flex: 1 }}>{ios ? <>Instala o app: toca em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</> : <>Instala o app no teu celular e abre direto da tela inicial.</>}</div>
      {evento && <button className="btn peq" onClick={async () => { evento.prompt(); await evento.userChoice; setEvento(null) }}>Instalar</button>}
      <button className="mini" onClick={fechar} aria-label="Fechar">✕</button>
    </div>
  )
}
