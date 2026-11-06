// Ficha de anamnese do Abel Colognese: a mesma do formulário do Google, organizada em etapas.
// Cada pergunta tem um id estável: é por ele que as respostas viram o app da aluna.

export type Tipo = 'texto' | 'email' | 'tel' | 'paragrafo' | 'data' | 'numero' | 'escala' | 'unica' | 'varias' | 'simnao' | 'cpf'
export interface Pergunta {
  id: string
  q: string
  tipo: Tipo
  ajuda?: string
  opcoes?: string[]
  min?: number
  max?: number
  unidade?: string
  obrigatoria?: boolean
  /** só aparece quando a condição é verdadeira */
  se?: (r: Respostas) => boolean
  /** em perguntas sim/não: pede o detalhe quando a resposta é "Sim" */
  detalhe?: string
}
export interface Etapa { id: string; titulo: string; nota?: string; perguntas: Pergunta[] }
export type Respostas = Record<string, any>

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export const ETAPAS: Etapa[] = [
  {
    id: 'tu', titulo: 'Quem é tu',
    perguntas: [
      { id: 'nome', q: 'Teu nome', tipo: 'texto', obrigatoria: true },
      { id: 'email', q: 'E-mail', tipo: 'email', obrigatoria: true, ajuda: 'O convite para entrar no app chega aqui.' },
      { id: 'whatsapp', q: 'WhatsApp com DDD', tipo: 'tel', obrigatoria: true },
      { id: 'nascimento', q: 'Data de nascimento', tipo: 'data', obrigatoria: true },
      { id: 'sexo', q: 'Sexo', tipo: 'unica', opcoes: ['Feminino', 'Masculino'], obrigatoria: true, ajuda: 'Muda algumas perguntas do diário, como a do ciclo.' },
      { id: 'instagram', q: 'Instagram', tipo: 'texto', obrigatoria: true, ajuda: '@ do teu perfil' },
      { id: 'profissao', q: 'Qual tua profissão?', tipo: 'texto', obrigatoria: true },
      { id: 'peso', q: 'Peso atual', tipo: 'numero', unidade: 'kg', obrigatoria: true, min: 30, max: 250 },
      { id: 'altura', q: 'Altura', tipo: 'numero', unidade: 'cm', obrigatoria: true, min: 120, max: 230 },
      { id: 'horas_sentado', q: 'Quantas horas do dia passa sentado(a)?', tipo: 'escala', min: 0, max: 12, unidade: 'h', obrigatoria: true },
      { id: 'horas_em_pe', q: 'Quantas horas do dia passa em pé?', tipo: 'escala', min: 0, max: 12, unidade: 'h', obrigatoria: true },
    ],
  },
  {
    id: 'treino', titulo: 'Treino', nota: 'Seja extremamente sincero(a). A prescrição sai daqui.',
    perguntas: [
      { id: 'freq_atual', q: 'Quantas vezes na semana pratica musculação HOJE?', tipo: 'escala', min: 0, max: 7, ajuda: '0 = não treino', obrigatoria: true },
      { id: 'freq_quer', q: 'Quantas vezes na semana QUER treinar com a consultoria?', tipo: 'escala', min: 1, max: 7, obrigatoria: true },
      { id: 'tempo_treino', q: 'Quanto tempo tem para cada treino de musculação?', tipo: 'paragrafo', obrigatoria: true, ajuda: 'Se muda conforme o dia, descreve cada dia.' },
      { id: 'dias', q: 'Quais dias da semana pretende treinar?', tipo: 'varias', opcoes: DIAS, obrigatoria: true },
      { id: 'horarios', q: 'Em quais horários costuma treinar?', tipo: 'varias', opcoes: ['Entre 5h e 8h', 'Entre 9h e 11h', 'Meio-dia', 'Entre 13h e 14h', 'Entre 15h e 17h', 'Entre 18h e 20h', 'Entre 21h e 22h'], obrigatoria: true },
      { id: 'odeia', q: 'Quais exercícios de musculação tu odeia?', tipo: 'texto', obrigatoria: true },
      { id: 'ama', q: 'Quais exercícios de musculação tu ama?', tipo: 'texto', obrigatoria: true },
      { id: 'aerobico_vezes', q: 'Quantas vezes na semana pretende fazer aeróbico?', tipo: 'escala', min: 0, max: 7, obrigatoria: true },
      { id: 'aerobico_tempo', q: 'Quanto tempo de aeróbico por sessão?', tipo: 'texto', obrigatoria: true, se: (r) => Number(r.aerobico_vezes) > 0 },
      { id: 'aerobico_dias', q: 'Em quais dias faz aeróbico?', tipo: 'varias', opcoes: DIAS, se: (r) => Number(r.aerobico_vezes) > 0 },
      { id: 'aerobico_tipos', q: 'Quais aeróbicos costuma fazer?', tipo: 'varias', opcoes: ['Esteira caminhada', 'Esteira corrida', 'Bicicleta', 'Elíptico', 'Escada', 'Caminhada na rua', 'Corrida na rua'], se: (r) => Number(r.aerobico_vezes) > 0 },
      { id: 'alongamento', q: 'Quantas vezes na semana faz alongamento?', tipo: 'escala', min: 0, max: 7, obrigatoria: true },
    ],
  },
  {
    id: 'comida', titulo: 'Alimentação',
    perguntas: [
      { id: 'alimentos_nao', q: 'Quais alimentos tu odeia ou tem alergia?', tipo: 'paragrafo', obrigatoria: true },
      { id: 'carboidratos', q: '3 fontes de carboidrato que tu gosta', tipo: 'texto', obrigatoria: true, ajuda: 'Arroz, aveia, pão, tapioca, batata…' },
      { id: 'proteinas', q: '2 fontes de proteína que tu gosta', tipo: 'texto', obrigatoria: true, ajuda: 'Frango, patinho, ovo, whey, lombo suíno…' },
      { id: 'frutas', q: '3 frutas que tu gosta', tipo: 'texto' },
      { id: 'mamao_abacaxi', q: 'Entre mamão e abacaxi, qual tu prefere?', tipo: 'unica', opcoes: ['Mamão', 'Abacaxi'], obrigatoria: true },
      { id: 'dieta', q: 'Faz dieta? Pesa os alimentos?', tipo: 'unica', opcoes: ['Sim', 'Não'], obrigatoria: true },
      { id: 'suplementos', q: 'Usa algum suplemento?', tipo: 'simnao', detalhe: 'Quais?', obrigatoria: true },
    ],
  },
  {
    id: 'saude', titulo: 'Saúde e dores', nota: 'Fica só entre ti e o Abel. Serve para treinar com segurança.',
    perguntas: [
      { id: 'dor', q: 'Sente algum tipo de dor?', tipo: 'unica', opcoes: ['Não', 'Sim, articular', 'Sim, muscular', 'Sim, articular e muscular'], obrigatoria: true },
      { id: 'dor_quando', q: 'Quando essas dores começaram? E quando acontecem?', tipo: 'paragrafo', obrigatoria: true, se: (r) => !!r.dor && r.dor !== 'Não' },
      { id: 'cirurgia', q: 'Já passou por alguma cirurgia?', tipo: 'simnao', detalhe: 'Onde e há quanto tempo?', obrigatoria: true },
      { id: 'fratura', q: 'Já teve alguma fratura?', tipo: 'simnao', detalhe: 'Onde e há quanto tempo?', obrigatoria: true },
      { id: 'medicamento', q: 'Usa algum medicamento?', tipo: 'simnao', detalhe: 'Quais?', obrigatoria: true },
      { id: 'cardiaco', q: 'Tem algum problema cardíaco?', tipo: 'simnao', detalhe: 'Qual?', obrigatoria: true },
      { id: 'pressao', q: 'Tem algum problema de pressão?', tipo: 'simnao', detalhe: 'Qual?', obrigatoria: true },
      { id: 'respiratorio', q: 'Tem algum problema respiratório?', tipo: 'simnao', detalhe: 'Qual?', obrigatoria: true },
      { id: 'desmaios', q: 'Já teve desmaios frequentes?', tipo: 'simnao', detalhe: 'Conta como foi.', obrigatoria: true },
      { id: 'convulsoes', q: 'Já teve convulsões?', tipo: 'simnao', detalhe: 'Conta como foi.', obrigatoria: true },
      { id: 'exames', q: 'Tem alguma alteração em exames de sangue?', tipo: 'simnao', detalhe: 'Qual?', obrigatoria: true },
      { id: 'ergogenico', q: 'Usa ou já usou algum recurso ergogênico?', tipo: 'simnao', detalhe: 'Substância e dosagem.', obrigatoria: true },
      { id: 'estetico', q: 'Já fez algum tratamento estético?', tipo: 'unica', opcoes: ['Sim', 'Não'], obrigatoria: true },
      { id: 'sono', q: 'Dorme quantas horas por noite?', tipo: 'escala', min: 3, max: 10, unidade: 'h', obrigatoria: true },
      { id: 'alcool', q: 'Bebe álcool?', tipo: 'unica', opcoes: ['Não', '1 a 2 vezes na semana', '3 a 4 vezes na semana', '5 ou mais vezes na semana'], obrigatoria: true },
      { id: 'fumante', q: 'É fumante?', tipo: 'unica', opcoes: ['Sim', 'Não'], obrigatoria: true },
    ],
  },
  {
    id: 'objetivo', titulo: 'Objetivo',
    perguntas: [
      { id: 'objetivo', q: 'Qual teu objetivo com a consultoria e a musculação?', tipo: 'paragrafo', obrigatoria: true },
      { id: 'nao_gosta', q: 'O que tu não gosta no teu corpo?', tipo: 'paragrafo', obrigatoria: true },
      { id: 'disposto', q: 'O que tu está disposto(a) a fazer para mudar?', tipo: 'paragrafo', obrigatoria: true },
    ],
  },
  {
    id: 'fim', titulo: 'Finalizando',
    perguntas: [
      { id: 'nome_cpf', q: 'Nome completo', tipo: 'texto', obrigatoria: true },
      { id: 'cpf', q: 'CPF', tipo: 'cpf', obrigatoria: true },
    ],
  },
]

export const DECLARACAO = 'Declaro para os devidos fins que as respostas prestadas aqui são verdadeiras e poderão ser utilizadas na prescrição de atividades físicas.'

export const visivel = (p: Pergunta, r: Respostas) => !p.se || p.se(r)
export const respondida = (p: Pergunta, r: Respostas) => {
  const v = r[p.id]
  if (p.tipo === 'varias') return Array.isArray(v) && v.length > 0
  if (p.tipo === 'simnao') return v === 'Não' || (v === 'Sim' && String(r[p.id + '_qual'] || '').trim().length > 1)
  return v !== undefined && v !== null && String(v).trim() !== ''
}
export const cpfValido = (c: string) => {
  const d = String(c || '').replace(/\D/g, ''); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(9) === +d[9] && dv(10) === +d[10]
}
export const idadeDe = (nasc: string) => {
  if (!nasc) return null; const n = new Date(nasc + 'T12:00:00'); if (isNaN(+n)) return null
  const h = new Date(); let a = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--; return a
}

/** sinais que o Abel precisa ver antes de prescrever */
export function alertas(r: Respostas): string[] {
  const a: string[] = []
  if (r.dor && r.dor !== 'Não') a.push(`Dor: ${r.dor.replace('Sim, ', '')}`)
  ;[['cardiaco', 'Problema cardíaco'], ['pressao', 'Pressão'], ['desmaios', 'Desmaios'], ['convulsoes', 'Convulsões'], ['respiratorio', 'Respiratório'], ['cirurgia', 'Cirurgia'], ['fratura', 'Fratura'], ['medicamento', 'Medicamento'], ['exames', 'Exames alterados'], ['ergogenico', 'Ergogênico']]
    .forEach(([k, t]) => { if (r[k] === 'Sim') a.push(t) })
  if (r.fumante === 'Sim') a.push('Fumante')
  if (Number(r.sono) && Number(r.sono) < 6) a.push(`Dorme ${r.sono} h`)
  return a
}

/** texto legível de uma resposta (para o plantão e o prontuário) */
export function textoResposta(p: Pergunta, r: Respostas) {
  const v = r[p.id]
  if (v === undefined || v === null || v === '') return '—'
  if (Array.isArray(v)) return v.join(', ')
  if (p.tipo === 'simnao') return v === 'Sim' ? `Sim — ${r[p.id + '_qual'] || ''}` : 'Não'
  if (p.tipo === 'data') { const [y, m, d] = String(v).split('-'); return `${d}/${m}/${y}` }
  if (p.tipo === 'cpf') return String(v).replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return `${v}${p.unidade ? ' ' + p.unidade : ''}`
}
