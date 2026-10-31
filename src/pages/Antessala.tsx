import { Link } from 'react-router-dom'
import { Assinatura, Tunel } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function Antessala() {
  const { sessao, perfil } = useAuth()
  const destino = perfil?.papel === 'treinador' ? '/plantao' : '/app'
  return (
    <section className="antessala">
      <Tunel />
      <div className="portal">
        <span className="carimbo">Internação · Ala VI</span>
        <h1>Bem-vindo<br />ao hospício</h1>
        <Assinatura />
        <p className="axioma">A vida molda o treino. Não o contrário.</p>
        <div style={{ marginTop: 40, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {sessao ? <Link className="btn" to={destino}>Entrar</Link> : <Link className="btn" to="/entrar">Entrar na ala</Link>}
        </div>
        <p className="rodape-ant">O hospício é o prazo, a avaliação, a correção, a foto de quatro semanas, o treino refeito para caber. É código interno e afetivo da casa — nunca é usado sobre uma pessoa ou sobre saúde mental.</p>
      </div>
    </section>
  )
}
