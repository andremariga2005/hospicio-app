// Transforma a ficha de anamnese no ponto de partida do app da aluna.
// O CPF e os detalhes de saúde ficam só na ficha (tabela anamneses); o app recebe o que precisa para funcionar.
export function alunoDaFicha(r: any, ajustes: { plano: string; freq?: number; inicio?: string }) {
  const hoje = new Date(); const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  const atual = Number(r.freq_atual) || 0
  const nivel = atual <= 1 ? 'Iniciante' : atual <= 3 ? 'Intermediário' : 'Avançado'
  const peso = Number(String(r.peso || '').replace(',', '.'))
  const objetivo = String(r.objetivo || '').trim()
  const coluna = {
    nome: String(r.nome || '').trim(),
    email: String(r.email || '').trim().toLowerCase(),
    idade: Number(r.idade) || null,
    sexo: r.sexo === 'Masculino' ? 'm' : 'f',
    plano: ajustes.plano,
    freq: Math.min(7, Math.max(1, Number(ajustes.freq) || Number(r.freq_quer) || 4)),
    objetivo: objetivo.length > 160 ? objetivo.slice(0, 157) + '…' : objetivo || null,
    nivel,
    inicio: ajustes.inicio || new Date().toISOString(),
  }
  const dados: any = {
    entrada: {
      em: r.concluido_em || new Date().toISOString(),
      objetivo, nao_gosta: r.nao_gosta || '', disposto: r.disposto || '',
      dias: r.dias || [], horarios: r.horarios || [], tempo: r.tempo_treino || '',
      freq_atual: atual, freq_quer: Number(r.freq_quer) || null,
      ama: r.ama || '', odeia: r.odeia || '',
      aerobico: { vezes: Number(r.aerobico_vezes) || 0, tempo: r.aerobico_tempo || '', dias: r.aerobico_dias || [], tipos: r.aerobico_tipos || [] },
      alongamento: Number(r.alongamento) || 0,
      comida: { nao: r.alimentos_nao || '', carboidratos: r.carboidratos || '', proteinas: r.proteinas || '', frutas: r.frutas || '', mamao_abacaxi: r.mamao_abacaxi || '', dieta: r.dieta || '', suplementos: r.suplementos === 'Sim' ? r.suplementos_qual || 'Sim' : 'Não' },
      rotina: { profissao: r.profissao || '', sentado: Number(r.horas_sentado) || 0, em_pe: Number(r.horas_em_pe) || 0, sono: Number(r.sono) || null },
      altura: Number(r.altura) || null, instagram: r.instagram || '', whatsapp: r.whatsapp || '',
    },
  }
  if (peso > 25 && peso < 300) dados.peso = [{ data: dia, kg: Math.round(peso * 10) / 10 }]
  if (r.dor && r.dor !== 'Não') dados.ultimoFb = { art: 'dor', ex: 'relatado na ficha de entrada', em: new Date().toISOString() }
  return { coluna, dados }
}
