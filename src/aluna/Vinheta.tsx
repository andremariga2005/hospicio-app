// Vinheta de entrada: "Bem-vindo ao Hospício". O corredor do vestiário, as luzes acendendo, o carimbo.
// Aparece na primeira abertura do dia, dura uns 4 segundos e pode ser pulada com um toque.
import { useEffect, useState } from 'react'
import { Assinatura } from '../components/ui'
import { primeiro } from '../lib/metodo'

export const chaveVinheta = () => `hosp_vinheta_${new Date().toDateString()}`
export function vinhetaHoje() { try { return localStorage.getItem(chaveVinheta()) !== '1' } catch { return false } }

export default function Vinheta({ nome, sexo, onFim }: { nome: string; sexo?: string; onFim: () => void }) {
  const o = sexo === 'm' ? 'o' : 'a'
  const [saindo, setSaindo] = useState(false)
  const reduzido = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const fechar = () => { if (saindo) return; setSaindo(true); try { localStorage.setItem(chaveVinheta(), '1') } catch { /* ignora */ } setTimeout(onFim, 550) }
  useEffect(() => { const t = setTimeout(fechar, reduzido ? 1600 : 4300); return () => clearTimeout(t) }, []) // eslint-disable-line
  const quadros = Array.from({ length: 9 }, (_, i) => i)
  return (
    <div className={'vinheta' + (saindo ? ' sai' : '') + (reduzido ? ' calma' : '')} onClick={fechar} role="dialog" aria-label="Bem-vindo ao Hospício">
      <div className="vh-corredor" aria-hidden="true">
        {quadros.map((i) => <div key={i} className="vh-quadro" style={{ animationDelay: `${-i * 0.42}s` }}><i className="vh-luz" style={{ animationDelay: `${0.25 + i * 0.12}s` }} /></div>)}
      </div>
      <div className="vh-vinheta" aria-hidden="true" />
      <div className="vh-texto">
        <div className="vh-ala">Internação · Ala VI</div>
        <div className="vh-bem">Bem-vind{o} ao</div>
        <div className="vh-hospicio">Hospício</div>
        <div className="vh-carimbo">{primeiro(nome)} · admitid{o} hoje</div>
        <div className="vh-assin"><Assinatura /></div>
      </div>
      <button className="vh-pular" onClick={(e) => { e.stopPropagation(); fechar() }}>Pular</button>
    </div>
  )
}
