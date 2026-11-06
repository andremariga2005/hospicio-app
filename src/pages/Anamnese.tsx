// Ficha de anamnese: a pessoa fechou a consultoria e preenche isto antes de entrar no app.
// As respostas ficam salvas no aparelho enquanto ela preenche; ao enviar, vão para o banco como "pendente".
// O Abel revisa no plantão e, ao aprovar, o app dela nasce montado com estas respostas.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Assinatura } from '../components/ui'
import { cpfValido, DECLARACAO, ETAPAS, idadeDe, respondida, visivel, type Pergunta, type Respostas } from '../content/anamnese'
import { supabase } from '../lib/supabase'

const RASCUNHO = 'hosp_anamnese_rascunho'
const ler = (): Respostas => {
  let r: Respostas = {}
  try { r = JSON.parse(localStorage.getItem(RASCUNHO) || '{}') } catch { /* sem armazenamento */ }
  // link personalizado do Abel: /anamnese?nome=...&email=...&whatsapp=... já chega preenchido (o rascunho do aparelho tem prioridade)
  try { const q = new URLSearchParams(location.search); for (const k of ['nome', 'email', 'whatsapp']) { const v = q.get(k); if (v && !r[k]) r[k] = v.slice(0, 120) } } catch { /* ignora */ }
  return r
}

function Campo({ p, r, set }: { p: Pergunta; r: Respostas; set: (k: string, v: any) => void }) {
  const v = r[p.id]
  const chips = (ops: string[], multi = false) => (
    <div className="chips an-chips" role={multi ? 'group' : 'radiogroup'}>
      {ops.map((o) => {
        const on = multi ? (v || []).includes(o) : v === o
        return <button key={o} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on}
          onClick={() => set(p.id, multi ? (on ? (v || []).filter((x: string) => x !== o) : [...(v || []), o]) : o)}>{o}</button>
      })}
    </div>
  )
  let entrada: any
  switch (p.tipo) {
    case 'paragrafo': entrada = <textarea rows={3} maxLength={2000} value={v || ''} onChange={(e) => set(p.id, e.target.value)} />; break
    case 'data': entrada = <input type="date" value={v || ''} onChange={(e) => set(p.id, e.target.value)} />; break
    case 'email': entrada = <input type="email" autoComplete="email" value={v || ''} onChange={(e) => set(p.id, e.target.value)} />; break
    case 'tel': entrada = <input inputMode="tel" autoComplete="tel" value={v || ''} onChange={(e) => set(p.id, e.target.value)} placeholder="(54) 99999-9999" />; break
    case 'cpf': entrada = <input inputMode="numeric" value={v || ''} maxLength={14} onChange={(e) => set(p.id, e.target.value)} placeholder="000.000.000-00" />; break
    case 'numero': entrada = <div className="an-num"><input inputMode="decimal" value={v ?? ''} onChange={(e) => set(p.id, e.target.value.replace(',', '.'))} /><span>{p.unidade}</span></div>; break
    case 'escala': entrada = chips(Array.from({ length: (p.max! - p.min!) + 1 }, (_, i) => String(p.min! + i))); break
    case 'unica': entrada = chips(p.opcoes!); break
    case 'varias': entrada = chips(p.opcoes!, true); break
    case 'simnao': entrada = <>{chips(['Não', 'Sim'])}{v === 'Sim' && <input className="an-detalhe" value={r[p.id + '_qual'] || ''} onChange={(e) => set(p.id + '_qual', e.target.value)} placeholder={p.detalhe} />}</>; break
    default: entrada = <input value={v || ''} onChange={(e) => set(p.id, e.target.value)} />
  }
  return (
    <div className="an-campo">
      <label className="an-q">{p.q}{p.obrigatoria && <span aria-hidden="true"> *</span>}</label>
      {p.ajuda && <div className="an-ajuda">{p.ajuda}</div>}
      {p.tipo === 'escala' && p.unidade && <div className="an-ajuda">em horas</div>}
      {entrada}
    </div>
  )
}

export default function Anamnese() {
  const [r, setR] = useState<Respostas>(ler)
  const [etapa, setEtapa] = useState(0)
  const [aceite, setAceite] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [estado, setEstado] = useState<'' | 'enviando' | 'enviado' | 'falha'>('')
  const isca = useRef<HTMLInputElement>(null)
  const topo = useRef<HTMLHeadingElement>(null)
  const total = ETAPAS.length + 1 // + revisão

  useEffect(() => { try { localStorage.setItem(RASCUNHO, JSON.stringify(r)) } catch { /* ignora */ } }, [r])
  useEffect(() => { window.scrollTo(0, 0); topo.current?.focus() }, [etapa, estado])
  const set = (k: string, v: any) => setR((x) => ({ ...x, [k]: v }))

  function validar(i: number): string[] {
    if (i >= ETAPAS.length) return aceite ? [] : ['Para enviar, marca a declaração.']
    const e: string[] = []
    ETAPAS[i].perguntas.filter((p) => visivel(p, r)).forEach((p) => {
      if (p.obrigatoria && !respondida(p, r)) e.push(p.tipo === 'simnao' && r[p.id] === 'Sim' ? `Conta o detalhe em: ${p.q}` : `Responde: ${p.q}`)
      else if (p.tipo === 'email' && r[p.id] && !/^\S+@\S+\.\S+$/.test(String(r[p.id]).trim())) e.push('E-mail inválido. É por ele que chega o convite do app.')
      else if (p.tipo === 'cpf' && r[p.id] && !cpfValido(r[p.id])) e.push('CPF inválido. Confere os números.')
      else if (p.tipo === 'numero' && r[p.id] && (Number(r[p.id]) < (p.min ?? -1e9) || Number(r[p.id]) > (p.max ?? 1e9))) e.push(`Confere: ${p.q} (${p.unidade}).`)
      else if (p.tipo === 'tel' && r[p.id] && String(r[p.id]).replace(/\D/g, '').length < 10) e.push('WhatsApp com DDD.')
    })
    return e
  }
  const avancar = () => { const e = validar(etapa); setErros(e); if (!e.length) setEtapa((x) => x + 1) }

  async function enviar() {
    const todos = Array.from({ length: total }, (_, i) => validar(i)).flat()
    setErros(todos); if (todos.length) return
    if (isca.current?.value) { setEstado('enviado'); return }
    setEstado('enviando')
    const respostas = { ...r, idade: idadeDe(r.nascimento), declaracao: true, concluido_em: new Date().toISOString(), versao: 1 }
    const { error } = await supabase.from('anamneses').insert({ nome: String(r.nome).trim(), email: String(r.email).trim().toLowerCase(), whatsapp: r.whatsapp || null, respostas })
    if (error) { setEstado('falha'); return }
    try { localStorage.removeItem(RASCUNHO) } catch { /* ignora */ }
    setEstado('enviado')
  }

  if (estado === 'enviado') return (
    <div className="an-pagina"><div className="an-caixa an-fim">
      <Assinatura />
      <span className="carimbo latao" style={{ marginTop: 18 }}>Ficha recebida</span>
      <h1 ref={topo} tabIndex={-1}>Bem-vind{r.sexo === 'Masculino' ? 'o' : 'a'} ao Hospício.</h1>
      <p>O Abel lê tua ficha pessoalmente. Quando ele liberar, chega no teu e-mail o convite para criar a senha e entrar no app — que já vai estar montado com o que tu contou aqui: teus dias, teu tempo, teu objetivo.</p>
      <p className="mini">Se algo mudar antes disso, é só avisar o Abel.</p>
      <Link to="/" className="btn sec" style={{ marginTop: 16 }}>Voltar ao início</Link>
    </div></div>
  )

  const revisao = etapa >= ETAPAS.length
  const E = ETAPAS[Math.min(etapa, ETAPAS.length - 1)]
  return (
    <div className="an-pagina">
      <div className="an-caixa">
        <div className="an-topo"><Assinatura /><span className="mini">Ficha de anamnese</span></div>
        <div className="an-prog" aria-label={`Etapa ${etapa + 1} de ${total}`}>{Array.from({ length: total }, (_, i) => <i key={i} className={i < etapa ? 'ok' : i === etapa ? 'ag' : ''} />)}</div>
        <div className="an-etapa">Etapa {etapa + 1} de {total}</div>
        <h1 ref={topo} tabIndex={-1}>{revisao ? 'Revisar e enviar' : E.titulo}</h1>
        {etapa === 0 && <p className="an-nota">Antes de entrar, o Abel precisa te conhecer. São seis etapas curtas e uma revisão, uns 10 minutos. O que tu preenche fica salvo neste aparelho até enviar.</p>}
        {!revisao && E.nota && <p className="an-nota">{E.nota}</p>}

        <input ref={isca} type="text" name="empresa" tabIndex={-1} autoComplete="off" aria-hidden="true" className="an-isca" />

        {!revisao && E.perguntas.filter((p) => visivel(p, r)).map((p) => <Campo key={p.id} p={p} r={r} set={set} />)}

        {revisao && (<>
          {ETAPAS.map((et, i) => (
            <div key={et.id} className="an-rev"><div className="an-rev-cab"><b>{et.titulo}</b><button className="ab-link" onClick={() => setEtapa(i)}>Editar</button></div>
              <p className="mini">{et.perguntas.filter((p) => visivel(p, r)).filter((p) => respondida(p, r)).length} de {et.perguntas.filter((p) => visivel(p, r)).length} respondidas</p></div>
          ))}
          <label className="an-aceite"><input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} /> <span>{DECLARACAO}</span></label>
        </>)}

        <div className="an-rodape">
        {erros.length > 0 && <div className="an-erros" role="alert">{erros.slice(0, 4).map((e) => <div key={e}>{e}</div>)}{erros.length > 4 && <div>+ {erros.length - 4} pendências</div>}</div>}
        {estado === 'falha' && <div className="an-erros" role="alert">Não consegui enviar agora. Tuas respostas estão salvas neste aparelho: confere a internet e tenta de novo.</div>}
        <div className="an-acoes">
          {etapa > 0 && <button className="btn sec" onClick={() => { setErros([]); setEtapa((x) => x - 1) }}>Voltar</button>}
          {!revisao ? <button className="btn" onClick={avancar}>Continuar</button> : <button className="btn" disabled={estado === 'enviando'} onClick={enviar}>{estado === 'enviando' ? 'Enviando…' : 'Enviar a ficha'}</button>}
        </div>
        </div>
      </div>
    </div>
  )
}
