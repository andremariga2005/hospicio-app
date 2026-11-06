import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { carregarConfig, gravarPatch, enviarPendentes, quandoFalhar, registrarAcesso, listarAla, listarExecucoes, todosAlunos, listarAnamneses, listarAcessos } from '../lib/dados'
import { blocoCompleto, ciclo, dataLonga, agora, noRadar, ultimoCheckin } from '../lib/metodo'
import { Assinatura, useToast } from '../components/ui'
import * as S from './secoes'
import * as P from './painel'

export const PlantaoCtx = createContext<any>(null)
export const usePlantao = () => useContext(PlantaoCtx)

const GRUPOS: [string, [string, string][]][] = [
  ['Painel', [['geral', 'Visão consolidada'], ['alunos', 'Alunos']]],
  ['Operação do dia', [['fila', 'Fila 24 h'], ['radar', 'Radar'], ['diario', 'Diário'], ['nutricao', 'Nutrição'], ['laudos', 'Laudos'], ['renovacoes', 'Renovações']]],
  ['Entrada', [['fichas', 'Fichas de anamnese'], ['convidar', 'Cadastrar à mão']]],
  ['Negócio', [['funil', 'Funil'], ['esteira', 'Esteira'], ['mercado', 'Mercado'], ['operacao', 'Números da operação']]],
]

export function Cab({ titulo, sub }: { titulo: string; sub?: string }) {
  return <div className="pl-h"><div><div className="data">{dataLonga(agora())}</div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div></div>
}

export default function Plantao() {
  const { sair } = useAuth(); const toast = useToast(); const navegar = useNavigate()
  const secao = useParams().secao || 'geral'
  const [alunos, setAlunos] = useState<any[] | null>(null)
  const [execucoes, setExecucoes] = useState<any[]>([])
  const [ala, setAla] = useState<any[]>([])
  const [anamneses, setAnamneses] = useState<any[]>([])
  const [acessos, setAcessos] = useState<any[]>([])
  const [, setVersao] = useState(0)

  const recarregar = useCallback(async () => {
    try {
      await carregarConfig()
      const [al, ex, aa] = await Promise.all([todosAlunos(), listarExecucoes(), listarAla()])
      setAlunos(al); setExecucoes(ex); setAla(aa); setVersao((v) => v + 1)
      listarAnamneses().then(setAnamneses).catch(() => {}); listarAcessos().then(setAcessos).catch(() => {})
    } catch { toast('Não consegui carregar o plantão. Confere a internet.') }
  }, [toast])
  useEffect(() => { recarregar(); const t = setInterval(recarregar, 60000); const f = () => document.visibilityState === 'visible' && recarregar(); document.addEventListener('visibilitychange', f); return () => { clearInterval(t); document.removeEventListener('visibilitychange', f) } }, [recarregar])

  const salvarAluno = useCallback((id: string, patch: any) => {
    setAlunos((l) => (l || []).map((a) => (a.id === id ? { ...a, ...patch } : a)))
    gravarPatch(id, patch)
  }, [])
  useEffect(() => {
    quandoFalhar((n) => toast(`Sem conexão: ${n} alteraç${n === 1 ? 'ão guardada' : 'ões guardadas'} neste aparelho. Envio assim que a internet voltar.`))
    enviarPendentes(); registrarAcesso('plantao')
  }, [toast])

  if (!alunos) return <div className="carregando">Abrindo o plantão…</div>
  const fila = execucoes.filter((x) => x.status === 'aguardando').length
  const cont: any = {
    fila, radar: noRadar(alunos).length, alunos: alunos.length, fichas: anamneses.filter((f) => f.status === 'pendente').length || undefined,
    nutricao: alunos.filter((a) => { const c = ultimoCheckin(a); return c && c.status === 'pendente' }).length,
    laudos: alunos.filter((a) => ciclo(a).fotoEm <= 3).length,
    renovacoes: alunos.filter((a) => ciclo(a).renovaEm <= 14 && (a.renovacao || {}).status !== 'renovou').length,
    diario: alunos.filter((a) => !blocoCompleto(a, (a.diario || {})[new Date().toISOString().slice(0, 10)] || {}, 'manha')).length ? undefined : undefined,
  }
  const Secao: any = ({ geral: P.Painel, operacao: S.Geral, fichas: P.Fichas, aluno: P.PaginaAluno, convidar: S.Convidar, fila: S.Fila, radar: S.Radar, diario: S.Diario, nutricao: S.Nutricao, alunos: S.Alunos, laudos: S.Laudos, renovacoes: S.Renovacoes, funil: S.Funil, esteira: S.Esteira, mercado: S.Mercado } as any)[secao] || S.Geral
  const ctx = { alunos, salvarAluno, execucoes, setExecucoes, ala, recarregar, toast, anamneses, setAnamneses, acessos, abrirFicha: (id: string) => { navegar(`/plantao/aluno/${id}`); window.scrollTo(0, 0) }, ir: (s: string) => { navegar(`/plantao/${s}`); window.scrollTo(0, 0) } }

  return (
    <PlantaoCtx.Provider value={ctx}>
      <div className="pl">
        <aside className="pl-nav">
          <Assinatura /><div className="sub">Plantão · Hospício</div>
          {GRUPOS.map(([g, itens]) => <div key={g} className="pl-grupo"><div className="pl-grupo-t">{g}</div>{itens.map(([k, t]) => { const n = cont[k]; const on = secao === k || (k === 'alunos' && secao === 'aluno'); return <button key={k} className={on ? 'on' : ''} onClick={() => ctx.ir(k)}>{t}{n != null && <em className={['fila', 'radar', 'nutricao', 'fichas'].includes(k) && n ? 'alerta' : ''}>{n}</em>}</button> })}</div>)}
          <div className="pe">
            <button className="btn sec peq" onClick={() => sair()}>Sair</button>
          </div>
        </aside>
        <main className="pl-main"><Secao /></main>
      </div>
    </PlantaoCtx.Provider>
  )
}
