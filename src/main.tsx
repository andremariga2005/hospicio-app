import { StrictMode, Suspense, lazy, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './styles.css'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './components/ui'
import Antessala from './pages/Antessala'
import Entrar, { NovaSenha } from './pages/Entrar'
const AppAluna = lazy(() => import('./aluna/AppAluna'))
const Plantao = lazy(() => import('./plantao/Plantao'))

function Protegida({ papel, children }: { papel: 'aluna' | 'treinador'; children: ReactNode }) {
  const { sessao, perfil, carregando } = useAuth()
  if (carregando) return <div className="carregando">Abrindo a ala…</div>
  if (!sessao) return <Navigate to="/entrar" replace />
  if (!perfil) return <div className="carregando">Teu acesso ainda não foi liberado. Fala com o Abel.</div>
  if (papel === 'treinador' && perfil.papel !== 'treinador') return <Navigate to="/app" replace />
  if (papel === 'aluna' && perfil.papel === 'treinador') return <Navigate to="/plantao" replace />
  return <>{children}</>
}

// Convite ou recuperação de senha do Supabase podem cair em qualquer página: leva direto para criar a senha.
if (/type=(invite|recovery)/.test(location.hash) && location.pathname !== '/nova-senha') history.replaceState(null, '', '/nova-senha' + location.hash)
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="carregando">Carregando…</div>}>
            <Routes>
              <Route path="/" element={<Antessala />} />
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/nova-senha" element={<NovaSenha />} />
              <Route path="/app" element={<Protegida papel="aluna"><AppAluna /></Protegida>} />
              <Route path="/app/:aba" element={<Protegida papel="aluna"><AppAluna /></Protegida>} />
              <Route path="/plantao/ver/:id" element={<Protegida papel="treinador"><AppAluna equipe /></Protegida>} />
              <Route path="/plantao/ver/:id/:aba" element={<Protegida papel="treinador"><AppAluna equipe /></Protegida>} />
              <Route path="/plantao" element={<Protegida papel="treinador"><Plantao /></Protegida>} />
              <Route path="/plantao/:secao" element={<Protegida papel="treinador"><Plantao /></Protegida>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
