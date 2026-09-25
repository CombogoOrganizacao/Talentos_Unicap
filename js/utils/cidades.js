// ============================================
// Utils - busca dinâmica de cidades via API do IBGE
// ============================================
const cacheCidades = {};

async function buscarCidadesPorEstado(uf) {
  if (cacheCidades[uf]) return cacheCidades[uf];
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
    if (!res.ok) throw new Error('Falha ao buscar cidades');
    const data = await res.json();
    const cidades = data.map(c => c.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    cacheCidades[uf] = cidades;
    return cidades;
  } catch (erro) {
    console.error('Erro ao buscar cidades do IBGE:', erro);
    return [];
  }
}
