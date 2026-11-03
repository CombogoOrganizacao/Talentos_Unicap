// Testes do parser de currículo (PDF/DOCX). Rodar com:  node tests/curriculo-import.test.js
// Não precisa de dependências: usa só o texto já extraído (a extração de PDF/DOCX roda no navegador).
const assert = require('assert');
require('../js/services/linkedin-import-service.js');
const CI = require('../js/services/curriculo-import-service.js');
const fx = require('./curriculo-fixtures.js');

const CONFIG = { cursos: ['Ciência da Computação', 'Sistemas para Internet'], especializacoes: [], mestrados: [], doutorados: [] };
const MAPA = { 'Graduação': 'cursos', 'Especialização': 'especializacoes', 'Mestrado': 'mestrados', 'Doutorado': 'doutorados' };
const conv = txt => CI.converter(txt, [], { CONFIG, MAPA_GRAU_PARA_CHAVE: MAPA }, new Date('2026-10-27'));

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('✓', nome); };

teste('modelo "Cargo | Empresa | período"', () => {
  const c = conv(fx.modelo1);
  assert.deepStrictEqual([c.perfil.telefone, c.perfil.cidade, c.perfil.estado], ['(81) 99999-1234', 'Recife', 'PE']);
  assert.strictEqual(c.perfil.linkedin, 'linkedin.com/in/mariaeduarda');
  assert.strictEqual(c.perfil.github, 'github.com/mariadev');
  assert.strictEqual(c.experiencias.length, 2);
  assert.deepStrictEqual([c.experiencias[0].cargo, c.experiencias[0].empresa, c.experiencias[0].atual], ['Estagiária de Desenvolvimento', 'Banco Pernambucano S.A.', true]);
  assert.strictEqual(c.experiencias[1].data_fim, '2023-12-01');
  assert.strictEqual(c.formacoes.length, 1, 'Ensino Médio não entra');
  assert.deepStrictEqual([c.formacoes[0].nivel, c.formacoes[0].curso, c.formacoes[0].ano_conclusao], ['Graduação', 'Sistemas de Informação', '']);
  assert.ok(c.avisos.some(a => /Ensino Médio/.test(a)));
  assert.ok(c.habilidades.some(h => h.nome === 'Docker' && h.categoria === 'Ferramenta'));
  assert.ok(c.habilidades.some(h => h.nome === 'Inglês' && h.categoria === 'Idioma' && h.nivel === 'Avançado'));
  assert.strictEqual(c.projetos[0].link_github, 'https://github.com/mariadev/talento-unicap');
  assert.deepStrictEqual([c.certificacoes[1].nome, c.certificacoes[1].instituicao], ['AWS Cloud Practitioner', 'Amazon']);
  assert.strictEqual(c.certificacoes[2].data_emissao, null);
});

teste('modelo "Empresa / Cargo / datas em linhas separadas"', () => {
  const c = conv(fx.modelo2);
  assert.deepStrictEqual([c.experiencias[0].empresa, c.experiencias[0].cargo], ['Itaú Unibanco', 'Analista de Dados Júnior']);
  assert.strictEqual(c.experiencias[1].data_inicio, '2021-02-01');
  assert.deepStrictEqual([c.formacoes[1].nivel, c.formacoes[1].curso, c.formacoes[1].ano_conclusao], ['Especialização', 'Ciência de Dados', '']);
  assert.strictEqual(c.perfil.portfolio, 'https://joaopedro.dev/');
});

teste('PDF exportado do LinkedIn', () => {
  const c = conv(fx.linkedin);
  assert.strictEqual(c.perfil.cidade, 'Recife');
  assert.deepStrictEqual([c.experiencias[0].empresa, c.experiencias[0].descricao], ['Nubank', 'Desenvolvimento de microsserviços em Java.']);
  assert.strictEqual(c.formacoes[0].curso, 'Sistemas de Informação');
  assert.deepStrictEqual(c.habilidades.filter(h => h.categoria === 'Idioma').map(h => h.nome), ['Português', 'Inglês']);
});

teste('currículo em inglês', () => {
  const c = conv(fx.ingles);
  assert.deepStrictEqual([c.experiencias[0].cargo, c.experiencias[0].empresa], ['Software Engineer', 'Acme Technologies']);
  assert.strictEqual(c.formacoes[0].curso, 'Computer Science');
});

teste('plano: itens incompletos ficam bloqueados e podem ser corrigidos', () => {
  const plano = CI.montarPlano(conv(fx.modelo1), {}, {});
  const cert = plano.certificacoes.find(c => c.dados.nome === 'Git e GitHub');
  assert.ok(cert.bloqueio && !cert.selecionado);
  CI.editarCampo('certificacoes', cert, 'emissao', '03/2024');
  assert.strictEqual(cert.dados.data_emissao, '2024-03-01');
  assert.ok(!cert.bloqueio && cert.selecionado);
  const exp = plano.experiencias[0];
  CI.editarCampo('experiencias', exp, 'empresa', '');
  assert.ok(exp.bloqueio && !exp.selecionado);
});

teste('plano: não duplica o que o aluno já tem', () => {
  const existente = { experiencias: [{ empresa: 'Banco Pernambucano S.A.', cargo: 'Estagiária de Desenvolvimento', data_inicio: '2024-01-01' }], habilidades: [{ nome: 'Java', categoria: 'Técnica' }] };
  const plano = CI.montarPlano(conv(fx.modelo1), existente, {});
  assert.ok(plano.experiencias[0].duplicado);
  assert.ok(plano.habilidades.find(h => h.dados.nome === 'Java').duplicado);
});

console.log(`\n${ok} testes passaram.`);
