import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { carregarConfig, gravarAluno, listarAla, listarExecucoes, todosAlunos } from '../lib/dados'
import { blocoCompleto, ciclo, dataLonga, agora, noRadar, ultimoCheckin } from '../lib/metodo'
import { Assinatura, useToast } from '../components/ui'
import * as S from './secoes'
import Ficha from './Ficha'

export const PlantaoCtx = createContext<any>(null)
export const usePlantao = () => useContext(PlantaoCtx)

const SECOES: [string, string][] = [['geral', 'Visão geral'], ['fila', 'Fila 24 h'], ['radar', 'Radar'], ['diario', 'Diário'], ['nutricao', 'Nutrição'], ['alunos', 'Alunos'], ['laudos', 'Laudos'], ['renovacoes', 'Renovações'], ['funil', 'Funil'], ['esteira', 'Esteira'], ['mercado', 'Mercado']]

export function Cab({ titulo, sub }: { titulo: string; sub?: string }) {
  return <div className="pl-h"><div><div className="data">{dataLonga(agora())}</div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div></div>
}

export default function Plantao() {
  const { sair } = useAuth(); const toast = useToast(); const navegar = useNavigate()
  const secao = useParams().secao || 'geral'
  const [alunos, setAlunos] = useState<any[] | null>(null)
  const [execucoes, setExecucoes] = useState<any[]>([])
  const [ala, setAla] = useState<any[]>([])
  const [ficha, setFicha] = useState<string | null>(null)
  const [, setVersao] = useState(0)

  const recarregar = useCallback(async () => {
    try {
      await carregarConfig()
      const [al, ex, aa] = await Promise.all([todosAlunos(), listarExecucoes(), listarAla()])
      setAlunos(al); setExecucoes(ex); setAla(aa); setVersao((v) => v + 1)
    } catch { toast('Não consegui carregar o plantão. Confere a internet.') }
  }, [toast])
  useEffect(() => { recarregar(); const t = setInterval(recarregar, 60000); const f = () => document.visibilityState === 'visible' && recarregar(); document.addEventListener('visibilitychange', f); return () => { clearInterval(t); document.removeEventListener('visibilitychange', f) } }, [recarregar])

  const salvarAluno = useCallback((id: string, patch: any) => {
    setAlunos((l) => (l || []).map((a) => { if (a.id !== id) return a; const novo = { ...a, ...patch }; gravarAluno(novo).catch(() => toast('Não consegui salvar agora.')); return novo }))
  }, [toast])

  if (!alunos) return <div className="carregando">Abrindo o plantão…</div>
  const fila = execucoes.filter((x) => x.status === 'aguardando').length
  const cont: any = {
    fila, radar: noRadar(alunos).length, alunos: alunos.length,
    nutricao: alunos.filter((a) => { const c = ultimoCheckin(a); return c && c.status === 'pendente' }).length,
    laudos: alunos.filter((a) => ciclo(a).fotoEm <= 3).length,
    renovacoes: alunos.filter((a) => ciclo(a).renovaEm <= 14 && (a.renovacao || {}).status !== 'renovou').length,
    diario: alunos.filter((a) => !blocoCompleto(a, (a.diario || {})[new Date().toISOString().slice(0, 10)] || {}, 'manha')).length ? undefined : undefined,
  }
  const Secao: any = ({ geral: S.Geral, fila: S.Fila, radar: S.Radar, diario: S.Diario, nutricao: S.Nutricao, alunos: S.Alunos, laudos: S.Laudos, renovacoes: S.Renovacoes, funil: S.Funil, esteira: S.Esteira, mercado: S.Mercado } as any)[secao] || S.Geral
  const ctx = { alunos, salvarAluno, execucoes, setExecucoes, ala, recarregar, toast, abrirFicha: setFicha, ir: (s: string) => { navegar(`/plantao/${s}`); window.scrollTo(0, 0) } }

  return (
    <PlantaoCtx.Provider value={ctx}>
      <div className="pl">
        <aside className="pl-nav">
          <Assinatura /><div className="sub">Plantão · Hospício</div>
          {SECOES.map(([k, t]) => { const n = cont[k]; return <button key={k} className={secao === k ? 'on' : ''} onClick={() => ctx.ir(k)}>{t}{n != null && <em className={['fila', 'radar', 'nutricao'].includes(k) && n ? 'alerta' : ''}>{n}</em>}</button> })}
          <div className="pe">
            <button className="btn sec peq" onClick={() => ctx.ir('convidar')} style={{ marginBottom: 8 }}>Cadastrar aluna</button>
            <button className="btn sec peq" onClick={() => sair()}>Sair</button>
          </div>
        </aside>
        <main className="pl-main">{secao === 'convidar' ? <S.Convidar /> : <Secao />}</main>
        {ficha && <Ficha id={ficha} onFechar={() => setFicha(null)} />}
      </div>
    </PlantaoCtx.Provider>
  )
}
