import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { alunoPorId, carregarConfig, gravarAluno, listarAla, listarExecucoes, meuAluno, todosAlunos } from '../lib/dados'
import { iniciais, primeiro } from '../lib/metodo'
import { Assinatura, Icone, useToast } from '../components/ui'
import { AlunaCtx } from './ctx'
import Hoje, { Resultados } from './Hoje'
import Abertura, { blocoDaVez, chaveAbertura } from './Abertura'
import Prescricao, { Sessao } from './Prescricao'
import Rotina from './Rotina'
import Ala from './Ala'
import Prontuario from './Prontuario'
import Modais from './Modais'
import Instalar from '../components/Instalar'
import { AssistenteFlutuante } from './Assistente'
import { medalhas, nivel, pontos } from '../lib/jogo'

const ABAS: [string, string, any][] = [['hoje', 'Hoje', Icone.casa], ['prescricao', 'Prescrição', Icone.halter], ['rotina', 'Rotina', Icone.prato], ['ala', 'A ala', Icone.gente], ['prontuario', 'Prontuário', Icone.ficha]]

export default function AppAluna({ equipe = false }: { equipe?: boolean }) {
  const { sessao, perfil, sair } = useAuth()
  const params = useParams(); const navegar = useNavigate(); const toast = useToast()
  const aba = params.aba && (ABAS.some((x) => x[0] === params.aba) || params.aba === 'resultados') ? params.aba : 'hoje'
  const abaNav = aba === 'resultados' ? 'hoje' : aba
  const base = equipe ? `/plantao/ver/${params.id}` : '/app'
  const [a, setA] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [modal, setModal] = useState<any>(null)
  const [sessaoTreino, setSessaoTreino] = useState<string | null>(null)
  const [execucoes, setExecucoes] = useState<any[]>([])
  const [ala, setAla] = useState<any[]>([])
  const [lista, setLista] = useState<any[]>([])
  const [ia, setIa] = useState<{ aberto: boolean; noite: boolean }>({ aberto: false, noite: false })
  const [abertura, setAbertura] = useState<{ noite: boolean } | null>(null)
  const checouAbertura = useRef(false)

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

  /* conquistas novas: mostra uma de cada vez, quando não houver outra janela aberta */
  useEffect(() => {
    if (!a || equipe || modal || sessaoTreino) return
    const ms = medalhas(a, execucoes).filter((m) => m.ok).map((m) => m.id); const nv = nivel(pontos(a, execucoes).total)
    const j = a.jogo
    if (!j) { salvar({ jogo: { vistas: ms, nivel: nv.n } }); return }
    const nova = medalhas(a, execucoes).find((m) => m.ok && !(j.vistas || []).includes(m.id))
    if (nova) { salvar({ jogo: { ...j, vistas: [...(j.vistas || []), nova.id] } }); setModal({ tipo: 'medalha', nome: nova.nome, texto: nova.como + '.' }); return }
    if (nv.n > (j.nivel || 1)) { salvar({ jogo: { ...j, nivel: nv.n } }); setModal({ tipo: 'medalha', nivel: true, n: nv.n, nome: nv.nome, texto: nv.frase }) }
  }, [a, execucoes, modal, sessaoTreino, equipe, salvar])

  /* ao abrir o app: se o check-in da vez não foi feito, a assistente recebe a aluna em tela cheia */
  useEffect(() => {
    if (!a || equipe || checouAbertura.current) return
    checouAbertura.current = true
    const b = blocoDaVez(a); let pulou = false
    try { pulou = !!b && localStorage.getItem(chaveAbertura(b)) === '1' } catch { /* sem armazenamento */ }
    if (b && (!pulou || !a.assistente?.nome)) setAbertura({ noite: b === 'noite' })
  }, [a, equipe])

  const abrirIA = useCallback((noite = false) => setIa({ aberto: true, noite }), [])
  const fecharIA = useCallback(() => setIa({ aberto: false, noite: false }), [])

  if (erro) return <div className="carregando" style={{ padding: 24, textAlign: 'center' }}><div><p>{erro}</p><p style={{ marginTop: 14 }}><button className="btn sec peq" onClick={() => sair()}>Sair</button></p></div></div>
  if (!a) return <div className="carregando">Abrindo a ala…</div>

  const ir = (x: string) => { navegar(`${base}/${x}`); window.scrollTo(0, 0) }
  const ctx = { a, salvar, equipe, toast, modal, abrir: setModal, fechar: () => setModal(null), ir, execucoes, recarregarExecucoes: () => listarExecucoes(a.id).then(setExecucoes).catch(() => {}), ala, setAla, treinar: (f: string) => setSessaoTreino(f), abrirIA, abrirAbertura: (noite = false) => setAbertura({ noite }) }
  const Pagina: any = { hoje: Hoje, resultados: Resultados, prescricao: Prescricao, rotina: Rotina, ala: Ala, prontuario: Prontuario }[aba]

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
          <nav>{ABAS.map(([k, t, ic]) => <button key={k} className={abaNav === k ? 'on' : ''} onClick={() => ir(k)}>{ic}{t}</button>)}</nav>
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
      <nav className="nav-baixo">{ABAS.map(([k, t, ic]) => <button key={k} className={abaNav === k ? 'on' : ''} onClick={() => ir(k)}>{ic}{t}</button>)}</nav>
      {abertura && !sessaoTreino && <Abertura noite={abertura.noite} onFechar={() => setAbertura(null)} />}
      {!sessaoTreino && !abertura && <AssistenteFlutuante aberto={ia.aberto} noite={ia.noite} onAbrir={() => abrirIA(false)} onFechar={fecharIA} />}
      {sessaoTreino && <Sessao fichaId={sessaoTreino} onSair={() => setSessaoTreino(null)} />}
      <Modais />
    </AlunaCtx.Provider>
  )
}
