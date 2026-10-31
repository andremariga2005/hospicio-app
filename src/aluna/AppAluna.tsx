import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { alunoPorId, carregarConfig, gravarAluno, listarAla, listarExecucoes, meuAluno, todosAlunos } from '../lib/dados'
import { iniciais, primeiro } from '../lib/metodo'
import { Assinatura, Icone, useToast } from '../components/ui'
import { AlunaCtx } from './ctx'
import Hoje from './Hoje'
import Prescricao, { Sessao } from './Prescricao'
import Rotina from './Rotina'
import Ala from './Ala'
import Prontuario from './Prontuario'
import Modais from './Modais'
import Instalar from '../components/Instalar'

const ABAS: [string, string, any][] = [['hoje', 'Hoje', Icone.casa], ['prescricao', 'Prescrição', Icone.halter], ['rotina', 'Rotina', Icone.prato], ['ala', 'A ala', Icone.gente], ['prontuario', 'Prontuário', Icone.ficha]]

export default function AppAluna({ equipe = false }: { equipe?: boolean }) {
  const { sessao, perfil, sair } = useAuth()
  const params = useParams(); const navegar = useNavigate(); const toast = useToast()
  const aba = params.aba && ABAS.some((x) => x[0] === params.aba) ? params.aba : 'hoje'
  const base = equipe ? `/plantao/ver/${params.id}` : '/app'
  const [a, setA] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [modal, setModal] = useState<any>(null)
  const [sessaoTreino, setSessaoTreino] = useState<string | null>(null)
  const [execucoes, setExecucoes] = useState<any[]>([])
  const [ala, setAla] = useState<any[]>([])
  const [lista, setLista] = useState<any[]>([])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        await carregarConfig()
        const al = equipe ? await alunoPorId(params.id!) : await meuAluno(sessao!.user.id)
        if (!vivo) return
        if (!al) { setErro(equipe ? 'Aluno não encontrado.' : 'Teu acesso ainda não está ligado a uma ficha. Fala com o Abel.'); return }
        setA(al)
        listarExecucoes(al.id).then((x) => vivo && setExecucoes(x)).catch(() => {})
        listarAla().then((x) => vivo && setAla(x)).catch(() => {})
        if (equipe) todosAlunos().then((x) => vivo && setLista(x)).catch(() => {})
      } catch (e: any) { setErro('Não consegui abrir teus dados agora. Confere a internet e tenta de novo.') }
    })()
    return () => { vivo = false }
  }, [equipe, params.id, sessao?.user.id])

  const salvar = useCallback((patch: any) => {
    setA((atual: any) => {
      const novo = { ...atual, ...patch }
      gravarAluno(novo).catch(() => toast('Não consegui salvar agora. Confere a internet.'))
      return novo
    })
  }, [toast])

  if (erro) return <div className="carregando" style={{ padding: 24, textAlign: 'center' }}><div><p>{erro}</p><p style={{ marginTop: 14 }}><button className="btn sec peq" onClick={() => sair()}>Sair</button></p></div></div>
  if (!a) return <div className="carregando">Abrindo a ala…</div>

  const ir = (x: string) => { navegar(`${base}/${x}`); window.scrollTo(0, 0) }
  const ctx = { a, salvar, equipe, toast, modal, abrir: setModal, fechar: () => setModal(null), ir, execucoes, recarregarExecucoes: () => listarExecucoes(a.id).then(setExecucoes).catch(() => {}), ala, setAla, treinar: (f: string) => setSessaoTreino(f) }
  const Pagina: any = { hoje: Hoje, prescricao: Prescricao, rotina: Rotina, ala: Ala, prontuario: Prontuario }[aba]

  return (
    <AlunaCtx.Provider value={ctx}>
      {equipe && (
        <div className="faixa-equipe">
          <span>Modo equipe: vendo o app como a aluna vê.</span>
          <select value={a.id} onChange={(e) => navegar(`/plantao/ver/${e.target.value}/${aba}`)} aria-label="Ver outro aluno">
            {lista.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
          <button className="btn peq" style={{ background: 'var(--noite)', color: 'var(--papel)' }} onClick={() => navegar('/plantao')}>Voltar ao plantão</button>
        </div>
      )}
      <div className="app">
        <aside className="app-lado">
          <Assinatura />
          <div className="sub">Bem-vindo ao hospício</div>
          <nav>{ABAS.map(([k, t, ic]) => <button key={k} className={aba === k ? 'on' : ''} onClick={() => ir(k)}>{ic}{t}</button>)}</nav>
          <div className="pe">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="av">{iniciais(a.nome)}</div><div><div style={{ color: 'var(--papel)', fontSize: 14 }}>{a.nome}</div><div>{a.plano}</div></div></div>
            {!equipe && <button className="btn sec peq" onClick={() => sair()}>Sair</button>}
            {perfil?.papel === 'treinador' && !equipe && <button className="btn sec peq" onClick={() => navegar('/plantao')}>Plantão</button>}
          </div>
        </aside>
        <main className="app-main">
          <div className="app-topo">
            <div className="quem"><div className="av">{iniciais(a.nome)}</div><div><small>Seja bem-vind{a.sexo === 'm' ? 'o' : 'a'} de volta,</small><b>{primeiro(a.nome)}</b></div></div>
            {!equipe && <button className="btn sec peq" onClick={() => sair()} style={{ display: 'var(--sair, inline-flex)' }}>Sair</button>}
          </div>
          {!equipe && <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}><Instalar /></div>}
          <Pagina />
        </main>
      </div>
      <nav className="nav-baixo">{ABAS.map(([k, t, ic]) => <button key={k} className={aba === k ? 'on' : ''} onClick={() => ir(k)}>{ic}{t}</button>)}</nav>
      {sessaoTreino && <Sessao fichaId={sessaoTreino} onSair={() => setSessaoTreino(null)} />}
      <Modais />
    </AlunaCtx.Provider>
  )
}
