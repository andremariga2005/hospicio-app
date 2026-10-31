import { createContext, useContext } from 'react'

export interface CtxAluna {
  a: any
  salvar: (patch: any) => void
  equipe: boolean
  toast: (t: string) => void
  modal: any
  abrir: (m: any) => void
  fechar: () => void
  ir: (aba: string) => void
  execucoes: any[]
  recarregarExecucoes: () => void
  ala: any[]
  setAla: (x: any[]) => void
  treinar: (fichaId: string) => void
  abrirIA: (noite?: boolean) => void
}
export const AlunaCtx = createContext<CtxAluna>(null as any)
export const useAluna = () => useContext(AlunaCtx)
