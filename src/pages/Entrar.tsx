import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Assinatura, Tunel } from '../components/ui'
import { emailDoLogin, supabase, supabaseConfigurado } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Entrar() {
  const { sessao, perfil } = useAuth(); const navegar = useNavigate()
  const [login, setLogin] = useState(''), [senha, setSenha] = useState(''), [msg, setMsg] = useState(''), [enviando, setEnviando] = useState(false)
  if (sessao && perfil) return <Navigate to={perfil.papel === 'treinador' ? '/plantao' : '/app'} replace />
  async function entrar(e: any) {
    e.preventDefault(); setMsg('')
    if (!supabaseConfigurado) { setMsg('O app ainda não está ligado ao banco.'); return }
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: emailDoLogin(login), password: senha })
    setEnviando(false)
    if (error) { setMsg('Login ou senha não conferem.'); return }
    navegar('/', { replace: true })
  }
  async function esqueci() {
    if (!login.includes('@')) { setMsg('Escreve teu e-mail no campo de login que eu mando o link para criar uma senha nova.'); return }
    await supabase.auth.resetPasswordForEmail(login.trim(), { redirectTo: `${location.origin}/nova-senha` })
    setMsg('Se esse e-mail estiver cadastrado, o link para a senha nova chega em alguns minutos.')
  }
  return (
    <section className="antessala">
      <Tunel />
      <form className="portal" style={{ maxWidth: 380, width: '100%' }} onSubmit={entrar}>
        <span className="carimbo">Internação · Ala VI</span>
        <h1 style={{ fontSize: 'clamp(34px,6vw,52px)' }}>Entrar<br />na ala</h1>
        <div style={{ marginBottom: 26 }}><Assinatura /></div>
        <div className="form-card">
          <label className="lbl" htmlFor="login" style={{ marginTop: 0 }}>Login ou e-mail</label>
          <input id="login" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" style={{ width: '100%' }} />
          <label className="lbl" htmlFor="senha">Senha</label>
          <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" style={{ width: '100%' }} />
          <button className="btn" type="submit" disabled={enviando} style={{ width: '100%', marginTop: 18 }}>{enviando ? 'Entrando…' : 'Entrar'}</button>
          <p style={{ color: msg.startsWith('Se esse') ? 'var(--bom)' : '#E0705F', fontSize: 13, marginTop: 10, minHeight: 18 }}>{msg}</p>
          <button type="button" className="mini" onClick={esqueci} style={{ textDecoration: 'underline' }}>Esqueci a senha</button>
        </div>
      </form>
    </section>
  )
}

export function NovaSenha() {
  const navegar = useNavigate(); const [s1, setS1] = useState(''), [s2, setS2] = useState(''), [msg, setMsg] = useState('')
  async function ok(e: any) {
    e.preventDefault()
    if (s1.length < 6) { setMsg('A senha precisa de pelo menos 6 caracteres.'); return }
    if (s1 !== s2) { setMsg('As duas senhas não batem.'); return }
    const { error } = await supabase.auth.updateUser({ password: s1 })
    if (error) { setMsg('O link expirou. Pede um novo para o Abel.'); return }
    navegar('/', { replace: true })
  }
  return (
    <section className="antessala"><Tunel />
      <form className="portal" style={{ maxWidth: 380, width: '100%' }} onSubmit={ok}>
        <span className="carimbo">Internação · Ala VI</span><h1 style={{ fontSize: 'clamp(30px,5vw,46px)' }}>Tua senha</h1>
        <div className="form-card">
          <label className="lbl" htmlFor="s1" style={{ marginTop: 0 }}>Senha nova</label><input id="s1" type="password" value={s1} onChange={(e) => setS1(e.target.value)} style={{ width: '100%' }} autoComplete="new-password" />
          <label className="lbl" htmlFor="s2">Repete a senha</label><input id="s2" type="password" value={s2} onChange={(e) => setS2(e.target.value)} style={{ width: '100%' }} autoComplete="new-password" />
          <button className="btn" type="submit" style={{ width: '100%', marginTop: 18 }}>Salvar e entrar</button>
          <p style={{ color: '#E0705F', fontSize: 13, marginTop: 10, minHeight: 18 }}>{msg}</p>
        </div>
      </form>
    </section>
  )
}
