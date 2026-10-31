import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from './supabase'

export interface Perfil { id: string; papel: 'aluna' | 'treinador'; nome: string | null }
interface Estado { carregando: boolean; sessao: Session | null; perfil: Perfil | null; sair: () => Promise<void> }
const Ctx = createContext<Estado>({ carregando: true, sessao: null, perfil: null, sair: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(supabaseConfigurado)

  useEffect(() => {
    if (!supabaseConfigurado) return
    supabase.auth.getSession().then(({ data }) => { setSessao(data.session); if (!data.session) setCarregando(false) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) { setPerfil(null); return }
    setCarregando(true)
    supabase.from('perfis').select('id, nome, papel').eq('id', sessao.user.id).single().then(({ data }) => {
      setPerfil((data as Perfil) ?? null); setCarregando(false)
    })
  }, [sessao?.user.id])

  return <Ctx.Provider value={{ carregando, sessao, perfil, sair: async () => { await supabase.auth.signOut() } }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
