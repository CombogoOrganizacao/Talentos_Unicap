// ============================================
// Serviço - Importação de dados do LinkedIn
//
// O LinkedIn não oferece API pública para ler experiências, formação e
// habilidades de um perfil (e fazer scraping viola os termos de uso).
// O caminho oficial e completo é o arquivo "Obter uma cópia dos seus dados"
// (ZIP com CSVs). Este serviço lê esse arquivo 100% no navegador, converte
// para o modelo do TalentoUNICAP e monta um PLANO de importação para o
// aluno revisar antes de gravar.
//
// Etapas:  lerArquivos() -> converter() -> montarPlano() -> aplicar()
// Não depende de DOM: pode ser testado em Node (veja module.exports).
// ============================================
(function (root) {
  'use strict';

  // Limites documentados em RegraNgocios/project-id
  const LIM = {
    telefone: 15, endereco: 200, cidade: 100, curso: 150, sobre: 500,
    empresa: 100, cargo: 100, descricao: 1000,
    instituicao: 150,
    habilidade: 50,
    projeto: 100,
    certificado: 150, emissor: 100
  };

  const MAX_ZIP_BYTES = 300 * 1024 * 1024;   // arquivo enviado
  const MAX_CSV_BYTES = 20 * 1024 * 1024;    // cada CSV lido de dentro do ZIP

  const UF_POR_ESTADO = {
    'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amazonas': 'AM', 'bahia': 'BA',
    'ceara': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', 'goias': 'GO',
    'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
    'minas gerais': 'MG', 'para': 'PA', 'paraiba': 'PB', 'parana': 'PR',
    'pernambuco': 'PE', 'piaui': 'PI', 'rio de janeiro': 'RJ',
    'rio grande do norte': 'RN', 'rio grande do sul': 'RS', 'rondonia': 'RO',
    'roraima': 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', 'sergipe': 'SE',
    'tocantins': 'TO'
  };

  const MESES = new Map(Object.entries({
    jan: 1, janeiro: 1, january: 1,
    fev: 2, feb: 2, fevereiro: 2, february: 2,
    mar: 3, marco: 3, march: 3,
    abr: 4, apr: 4, abril: 4, april: 4,
    mai: 5, may: 5, maio: 5,
    jun: 6, junho: 6, june: 6,
    jul: 7, julho: 7, july: 7,
    ago: 8, aug: 8, agosto: 8, august: 8,
    set: 9, sep: 9, sept: 9, setembro: 9, september: 9,
    out: 10, oct: 10, outubro: 10, october: 10,
    nov: 11, novembro: 11, november: 11,
    dez: 12, dec: 12, dezembro: 12, december: 12
  }));

  // ------------------------------------------------------------------
  // Utilitários de texto
  // ------------------------------------------------------------------
  const norm = s => String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const normHeader = h => norm(h).replace(/ /g, '');

  // Remove tags HTML e caracteres de controle. O texto importado é
  // exibido via innerHTML em outras telas, então nunca entra "cru".
  const limpar = s => String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();

  function cortar(texto, max, ctx) {
    const t = limpar(texto);
    if (t.length <= max) return t;
    if (ctx) ctx.truncados = (ctx.truncados || 0) + 1;
    return t.slice(0, max - 1).trimEnd() + '…';
  }

  function urlSegura(valor) {
    const v = String(valor ?? '').trim();
    if (!v) return '';
    try {
      let u;
      if (/^https?:\/\//i.test(v)) u = new URL(v);
      else if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return '';   // javascript:, data:, mailto: ...
      else u = new URL('https://' + v);
      return /^https?:$/.test(u.protocol) ? u.href : '';
    } catch (_) { return ''; }
  }

  const semProtocolo = href => href.replace(/^https?:\/\/(www\.)?/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');

  function normalizarLinkedin(valor) {
    const v = String(valor ?? '').trim();
    if (!v) return '';
    if (/linkedin\.com/i.test(v)) {
      const href = urlSegura(v);
      if (!href) return '';
      const caminho = semProtocolo(href);
      return /^([a-z]{2,3}\.)?linkedin\.com\/in\/[^/]+/i.test(caminho)
        ? caminho.replace(/^([a-z]{2,3}\.)?/i, '').split('/').slice(0, 3).join('/')
        : '';
    }
    return /^[\w\-%.]{3,100}$/.test(v) ? `linkedin.com/in/${v}` : '';
  }

  // ------------------------------------------------------------------
  // CSV (RFC 4180: aspas, "" escapado, quebras de linha dentro de campo)
  // ------------------------------------------------------------------
  function parseCsv(texto) {
    const s = String(texto ?? '').replace(/^\uFEFF/, '');
    const linhas = [];
    let campo = '', linha = [], aspas = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (aspas) {
        if (c === '"') {
          if (s[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
        } else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === ',') { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && s[i + 1] === '\n') i++;
        linha.push(campo); campo = '';
        if (linha.some(x => x.trim() !== '')) linhas.push(linha);
        linha = [];
      } else campo += c;
    }
    linha.push(campo);
    if (linha.some(x => x.trim() !== '')) linhas.push(linha);
    return linhas;
  }

  // Alguns CSVs do LinkedIn trazem linhas de aviso antes do cabeçalho
  // ("Notes:..."). O cabeçalho é a primeira linha que contém algum alias.
  function tabela(linhas, aliasesEsperados) {
    const esperados = new Set(aliasesEsperados);
    const idx = linhas.findIndex(l => l.some(c => esperados.has(normHeader(c))));
    if (idx < 0) return [];
    const cab = linhas[idx].map(normHeader);
    return linhas.slice(idx + 1).map(l => {
      const o = {};
      cab.forEach((h, i) => { if (h && o[h] === undefined) o[h] = (l[i] ?? '').trim(); });
      return o;
    });
  }

  const pick = (linha, aliases) => {
    for (const a of aliases) if (linha[a]) return linha[a];
    return '';
  };

  // ------------------------------------------------------------------
  // Datas: "Sep 2023", "set. 2023", "setembro de 2023", "09/2023",
  // "2023-09", "2023" -> { y, m|null }.  "Present"/"Atual" -> null.
  // ------------------------------------------------------------------
  function parseData(txt) {
    const s = norm(txt);
    if (!s) return null;
    const tokens = s.split(' ');
    const idxAno = tokens.findIndex(t => /^(19|20)\d{2}$/.test(t));
    if (idxAno < 0) return null;
    const y = Number(tokens[idxAno]);
    let m = null;
    const palavra = tokens.find(t => MESES.has(t));
    if (palavra) m = MESES.get(palavra);
    else {
      const nums = tokens.filter((t, i) => i !== idxAno && /^\d{1,2}$/.test(t)).map(Number);
      if (nums.length) m = idxAno === 0 ? nums[0] : nums[nums.length - 1];
    }
    if (m !== null && (m < 1 || m > 12)) m = null;
    return { y, m };
  }

  const pad2 = n => String(n).padStart(2, '0');
  const isoData = (d, fim) => d ? `${d.y}-${pad2(d.m ?? (fim ? 12 : 1))}-01` : '';
  const ym = d => d ? d.y * 12 + ((d.m ?? 1) - 1) : null;

  // ------------------------------------------------------------------
  // Leitura dos arquivos enviados (ZIP completo e/ou CSVs soltos)
  // ------------------------------------------------------------------
  const ARQUIVOS_POR_NOME = {
    profile: 'perfil', perfil: 'perfil',
    positions: 'posicoes', posicoes: 'posicoes',
    education: 'educacao', formacao: 'educacao', formacaoacademica: 'educacao',
    skills: 'habilidades', habilidades: 'habilidades',
    certifications: 'certificacoes', certificacoes: 'certificacoes',
    projects: 'projetos', projetos: 'projetos',
    languages: 'idiomas', idiomas: 'idiomas',
    phonenumbers: 'telefones', telefones: 'telefones', numerosdetelefone: 'telefones'
  };

  function tipoPorNome(caminho) {
    const base = String(caminho).split(/[\\/]/).pop().replace(/\.csv$/i, '');
    return ARQUIVOS_POR_NOME[normHeader(base)] || null;
  }

  function tipoPorCabecalho(linhas) {
    const todos = new Set(linhas.slice(0, 5).flat().map(normHeader));
    const tem = (...a) => a.some(x => todos.has(x));
    if (tem('companyname', 'nomedaempresa') && tem('title', 'cargo')) return 'posicoes';
    if (tem('schoolname', 'nomedaescola')) return 'educacao';
    if (tem('authority', 'autoridade')) return 'certificacoes';
    if (tem('proficiency', 'proficiencia')) return 'idiomas';
    if (tem('firstname') && tem('lastname')) return 'perfil';
    if (tem('number', 'phonenumber') && tem('extension', 'type')) return 'telefones';
    return null;
  }

  // arquivos: FileList/Array de File (ou objetos com name + text()/arrayBuffer())
  async function lerArquivos(arquivos, deps = {}) {
    const JSZipLib = deps.JSZip || root.JSZip;
    const csvs = {};      // tipo -> linhas[][]
    const ignorados = [];

    const registrar = (nome, texto) => {
      const linhas = parseCsv(texto);
      const tipo = tipoPorNome(nome) || tipoPorCabecalho(linhas);
      if (tipo && !csvs[tipo]) csvs[tipo] = linhas;
    };

    for (const arq of Array.from(arquivos || [])) {
      const nome = arq.name || '';
      if (/\.zip$/i.test(nome)) {
        if (!JSZipLib) throw new Error('A biblioteca JSZip não foi carregada. Recarregue a página.');
        if (arq.size > MAX_ZIP_BYTES) throw new Error('O arquivo ZIP é grande demais (limite de 300 MB).');
        let zip;
        try { zip = await JSZipLib.loadAsync(await arq.arrayBuffer()); }
        catch (_) { throw new Error('Não foi possível abrir o ZIP. Ele está corrompido ou protegido por senha?'); }
        for (const entrada of Object.values(zip.files)) {
          if (entrada.dir || !/\.csv$/i.test(entrada.name)) continue;
          if (!tipoPorNome(entrada.name)) { ignorados.push(entrada.name); continue; }   // não lê Connections, Messages etc.
          const tam = entrada._data && entrada._data.uncompressedSize;
          if (tam && tam > MAX_CSV_BYTES) continue;
          registrar(entrada.name, await entrada.async('string'));
        }
      } else if (/\.csv$/i.test(nome)) {
        if (arq.size > MAX_CSV_BYTES) continue;
        registrar(nome, await arq.text());
      }
    }
    return csvs;
  }

  // ------------------------------------------------------------------
  // Conversão: CSVs do LinkedIn -> modelo do TalentoUNICAP
  // ------------------------------------------------------------------
  const SOFT = ['lideranca', 'comunicacao', 'trabalho em equipe', 'resolucao de problemas', 'gestao de tempo',
    'criatividade', 'pensamento critico', 'adaptabilidade', 'negociacao', 'empatia', 'proatividade',
    'oratoria', 'colaboracao', 'inteligencia emocional', 'tomada de decisao', 'leadership', 'communication',
    'teamwork', 'problem solving', 'time management', 'critical thinking', 'creativity', 'adaptability',
    'negotiation', 'public speaking', 'collaboration', 'emotional intelligence', 'decision making'];
  const FERRAMENTA = ['excel', 'word', 'powerpoint', 'microsoft office', 'pacote office', 'figma', 'git', 'github',
    'gitlab', 'jira', 'trello', 'notion', 'slack', 'power bi', 'tableau', 'photoshop', 'illustrator', 'canva',
    'postman', 'docker', 'linux', 'visual studio', 'vs code', 'intellij', 'eclipse', 'autocad', 'sap',
    'salesforce', 'looker', 'google analytics', 'blender', 'premiere', 'after effects', 'sketch', 'miro',
    'confluence'];

  const contemTermo = (n, lista) => lista.some(t => ` ${n} `.includes(` ${t} `));

  function categoriaHabilidade(nome) {
    const n = norm(nome);
    if (contemTermo(n, SOFT)) return 'Soft Skill';
    if (contemTermo(n, FERRAMENTA)) return 'Ferramenta';
    return 'Técnica';
  }

  function nivelIdioma(prof) {
    const p = norm(prof);
    if (!p) return 'Intermediário';
    if (/native|bilingual|nativ|bilingue/.test(p)) return 'Expert';
    if (/full|plena|completa/.test(p)) return 'Avançado';
    if (/professional working|profissional/.test(p)) return 'Avançado';
    if (/limited|limitada/.test(p)) return 'Intermediário';
    if (/elementary|elementar|basic|basica/.test(p)) return 'Básico';
    return 'Intermediário';
  }

  function nivelAcademico(texto) {
    const t = norm(texto);
    if (/\b(doutor\w*|phd|ph d|doctor\w*|doctorate)\b/.test(t)) return 'Doutorado';
    if (/\b(mba|especializa\w*|pos graduacao|pos graduado|postgraduate|post graduate|specialization|lato sensu)\b/.test(t)) return 'Especialização';
    if (/\b(mestr\w*|master\w*|msc|m sc)\b/.test(t)) return 'Mestrado';
    if (/\b(bacharel\w*|licenciatura|tecnologos?|tecnologas?|graduacao|bachelor\w*|undergraduate|superior)\b/.test(t)) return 'Graduação';
    return '';
  }

  // Procura, nas listas do CONFIG, o curso citado no texto do LinkedIn
  function acharCurso(texto, config) {
    const t = ` ${norm(texto)} `;
    let melhor = null;
    for (const [grau, chave] of Object.entries(config.MAPA_GRAU_PARA_CHAVE || {})) {
      for (const nome of (config.CONFIG?.[chave] || [])) {
        const n = norm(nome);
        if (n && t.includes(` ${n} `) && (!melhor || n.length > melhor.len)) melhor = { grau, curso: nome, len: n.length };
      }
    }
    return melhor;
  }

  function separarGrauCurso(degree, notas, config) {
    const bruto = limpar(degree);
    let nivel = nivelAcademico(bruto);
    let curso = '';

    const achado = acharCurso(bruto, config) || acharCurso(`${bruto} ${notas || ''}`, config);
    if (achado) {
      curso = achado.curso;
      if (!nivel) nivel = achado.grau;
    } else {
      // "Bacharelado em Sistemas de Informação" / "Bachelor's degree, Computer Science"
      const partes = bruto.split(/\s*(?:,|;| - | – | — |\bem\b|\bin\b)\s*/i).map(p => p.trim()).filter(Boolean);
      const semGrau = partes.filter(p => !nivelAcademico(p) || partes.length === 1);
      curso = semGrau.join(' - ') || bruto;
    }
    return { nivel, curso };
  }

  const ehUnicap = inst => /unicap|catolica de pernambuco/.test(norm(inst));

  function estimarPeriodo(inicio, agora) {
    if (!inicio) return '';
    const meses = (agora.getFullYear() * 12 + agora.getMonth()) - ym(inicio);
    const p = Math.min(12, Math.max(1, Math.floor(meses / 6) + 1));
    return `${p}º período`;
  }

  function limparCidade(c) {
    return limpar(c)
      .replace(/^(regi[aã]o metropolitana d[eao]s?|greater)\s+/i, '')
      .replace(/\s+(area|região|regiao|e região|e regiao)$/i, '')
      .trim();
  }

  function formatarTelefoneBR(numero) {
    const bruto = String(numero ?? '').trim();
    // "+1 415…", "+351 …": número estrangeiro, não cabe na máscara brasileira
    if (/^(\+|00)/.test(bruto) && !/^(\+|00)\s*55\b/.test(bruto)) return '';
    let d = bruto.replace(/\D/g, '');
    if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
    if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    return '';
  }

  function converter(csvs, config, agora = new Date()) {
    const ctx = { truncados: 0 };
    const avisos = [];
    const lidos = Object.keys(csvs);
    const out = {
      perfil: {}, experiencias: [], formacoes: [], habilidades: [],
      projetos: [], certificacoes: [], avisos, lidos, truncados: 0
    };

    // ---------- Perfil ----------
    if (csvs.perfil) {
      const r = tabela(csvs.perfil, ['firstname', 'lastname', 'headline', 'summary'])[0] || {};
      const nome = [pick(r, ['firstname']), pick(r, ['lastname'])].filter(Boolean).join(' ');
      const headline = pick(r, ['headline', 'titulo']);
      const resumo = pick(r, ['summary', 'resumo', 'sobre']);
      out.perfil.nome = limpar(nome);
      out.perfil.sobre = cortar(resumo || headline, LIM.sobre, ctx);
      out.perfil.endereco = cortar(pick(r, ['address', 'endereco']), LIM.endereco, ctx);

      const geo = pick(r, ['geolocation', 'localizacaogeografica', 'localizacao', 'location']);
      if (geo) {
        const partes = geo.split(',').map(p => p.trim()).filter(Boolean);
        const idxUf = partes.findIndex(p => UF_POR_ESTADO[norm(p)]);
        if (idxUf >= 0) {
          out.perfil.estado = UF_POR_ESTADO[norm(partes[idxUf])];
          if (idxUf > 0) out.perfil.cidade = cortar(limparCidade(partes[0]), LIM.cidade, ctx);
        }
      }

      const sites = pick(r, ['websites', 'sites']);
      const urls = (sites.match(/https?:\/\/[^\s,\]\[]+/gi) || []).map(urlSegura).filter(Boolean);
      const gh = urls.find(u => /^https?:\/\/(www\.)?github\.com\/[^/]+/i.test(u));
      if (gh) out.perfil.github = semProtocolo(gh).split('/').slice(0, 2).join('/');
      const portf = urls.find(u => !/(^|\.)(github|linkedin|twitter|x|instagram|facebook)\.com$/i.test(new URL(u).hostname));
      if (portf) out.perfil.portfolio = portf;
    }

    // ---------- Telefone ----------
    if (csvs.telefones) {
      const rows = tabela(csvs.telefones, ['number', 'numero', 'phonenumber']);
      rows.sort((a, b) => /mobile|celular/i.test(pick(b, ['type', 'tipo'])) - /mobile|celular/i.test(pick(a, ['type', 'tipo'])));
      for (const r of rows) {
        const t = formatarTelefoneBR(pick(r, ['number', 'numero', 'phonenumber']));
        if (t) { out.perfil.telefone = t.slice(0, LIM.telefone); break; }
      }
      if (rows.length && !out.perfil.telefone) avisos.push('Telefone encontrado, mas fora do padrão brasileiro — preencha manualmente.');
    }

    // ---------- Experiências ----------
    if (csvs.posicoes) {
      for (const r of tabela(csvs.posicoes, ['companyname', 'nomedaempresa', 'title', 'cargo'])) {
        const empresa = cortar(pick(r, ['companyname', 'empresa', 'nomedaempresa', 'company']), LIM.empresa, ctx);
        const cargo = cortar(pick(r, ['title', 'cargo', 'titulo']), LIM.cargo, ctx);
        if (!empresa && !cargo) continue;
        const ini = parseData(pick(r, ['startedon', 'datadeinicio', 'startdate', 'inicio']));
        const fim = parseData(pick(r, ['finishedon', 'datadetermino', 'enddate', 'termino', 'fim']));
        if (!empresa || !cargo || !ini) {
          avisos.push(`Experiência ignorada (faltam empresa, cargo ou data de início): ${cargo || empresa || '—'}.`);
          continue;
        }
        const atual = !fim;
        let dataFim = atual ? '' : isoData(fim, true);
        const dataIni = isoData(ini, false);
        if (dataFim && dataFim < dataIni) dataFim = dataIni;
        out.experiencias.push({
          empresa, cargo,
          descricao: cortar(pick(r, ['description', 'descricao']), LIM.descricao, ctx),
          data_inicio: dataIni, data_fim: dataFim, atual
        });
      }
    }

    // ---------- Formação ----------
    if (csvs.educacao) {
      const agoraYm = agora.getFullYear() * 12 + agora.getMonth();
      for (const r of tabela(csvs.educacao, ['schoolname', 'nomedaescola', 'degreename', 'startdate'])) {
        const instituicao = cortar(pick(r, ['schoolname', 'instituicao', 'escola', 'nomedaescola']), LIM.instituicao, ctx);
        if (!instituicao) continue;
        const grauTxt = [pick(r, ['degreename', 'grau', 'nomedograu', 'degree']), pick(r, ['fieldofstudy', 'areadeestudo', 'campodeestudo'])]
          .filter(Boolean).join(', ');
        const { nivel, curso } = separarGrauCurso(grauTxt, pick(r, ['notes', 'observacoes']), config);
        const ini = parseData(pick(r, ['startdate', 'datadeinicio', 'startedon']));
        const fim = parseData(pick(r, ['enddate', 'datadeconclusao', 'datadetermino', 'finishedon']));
        // A data de término no LinkedIn pode ser a PREVISTA. No app, "em curso" = sem ano de conclusão.
        const emCurso = !fim || (fim.m != null ? ym(fim) > agoraYm : fim.y > agora.getFullYear());
        out.formacoes.push({
          instituicao, nivel,
          curso: cortar(curso, LIM.curso, ctx),
          ano_inicio: ini ? String(ini.y) : '',
          ano_conclusao: emCurso ? '' : String(fim.y),
          _inicio: ini, _emCurso: emCurso
        });
      }
      // Curso/período do cabeçalho do currículo, derivados da graduação principal
      const grads = out.formacoes.filter(f => f.nivel === 'Graduação');
      const principal =
        grads.find(f => f._emCurso && ehUnicap(f.instituicao)) ||
        grads.find(f => f._emCurso) ||
        grads.find(f => ehUnicap(f.instituicao)) ||
        grads.slice().sort((a, b) => (ym(b._inicio) ?? 0) - (ym(a._inicio) ?? 0))[0];
      if (principal) {
        out.perfil.curso = principal.curso;
        if (principal._emCurso) { out.perfil.periodo = estimarPeriodo(principal._inicio, agora); out.perfil._periodoEstimado = true; }
        else if (!grads.some(f => f._emCurso)) out.perfil.periodo = 'Formado';
      }
    }

    // ---------- Habilidades + Idiomas ----------
    const vistas = new Set();
    const addHab = (nome, categoria, nivel) => {
      const n = cortar(nome, LIM.habilidade, ctx);
      const k = `${norm(n)}|${categoria}`;
      if (!n || vistas.has(k)) return;
      vistas.add(k);
      out.habilidades.push({ nome: n, categoria, nivel });
    };
    if (csvs.habilidades) {
      tabela(csvs.habilidades, ['name', 'nome', 'skill', 'habilidade'])
        .forEach(r => { const n = pick(r, ['name', 'nome', 'skill', 'habilidade']); addHab(n, categoriaHabilidade(n), null); });
    }
    if (csvs.idiomas) {
      tabela(csvs.idiomas, ['name', 'nome', 'idioma', 'language', 'proficiency', 'proficiencia'])
        .forEach(r => addHab(pick(r, ['name', 'nome', 'idioma', 'language']), 'Idioma', nivelIdioma(pick(r, ['proficiency', 'proficiencia', 'nivel']))));
    }

    // ---------- Projetos ----------
    if (csvs.projetos) {
      for (const r of tabela(csvs.projetos, ['title', 'titulo', 'name', 'nome'])) {
        const titulo = cortar(pick(r, ['title', 'titulo', 'name', 'nome']), LIM.projeto, ctx);
        if (!titulo) continue;
        const fim = parseData(pick(r, ['finishedon', 'datadetermino', 'enddate']));
        out.projetos.push({
          titulo,
          descricao: cortar(pick(r, ['description', 'descricao']), LIM.descricao, ctx),
          link_github: urlSegura(pick(r, ['url', 'link'])),
          status: fim ? 'CONCLUIDO' : 'EM_ANDAMENTO'
        });
      }
    }

    // ---------- Certificações ----------
    if (csvs.certificacoes) {
      for (const r of tabela(csvs.certificacoes, ['name', 'nome', 'authority', 'autoridade'])) {
        const nome = cortar(pick(r, ['name', 'nome']), LIM.certificado, ctx);
        if (!nome) continue;
        const emissao = parseData(pick(r, ['startedon', 'datadeinicio', 'issuedon', 'datadeemissao']));
        const validade = parseData(pick(r, ['finishedon', 'datadetermino', 'expireson', 'datadevalidade']));
        out.certificacoes.push({
          nome,
          instituicao: cortar(pick(r, ['authority', 'autoridade', 'emissor', 'organizacaoemissora']), LIM.emissor, ctx),
          data_emissao: emissao ? isoData(emissao, false) : null,
          data_validade: validade ? isoData(validade, false) : null,
          link_certificado: urlSegura(pick(r, ['url', 'link']))
        });
      }
    }

    out.truncados = ctx.truncados;
    return out;
  }

  // ------------------------------------------------------------------
  // Plano de importação (o que será criado / preenchido / ignorado)
  // ------------------------------------------------------------------
  const ROTULOS = {
    telefone: 'Telefone', endereco: 'Endereço', localizacao: 'Cidade / Estado', sobre: 'Sobre mim (bio)',
    curso: 'Curso', periodo: 'Período', linkedin: 'LinkedIn', github: 'GitHub', portfolio: 'Portfólio'
  };

  function montarPlano(conv, existente = {}, opcoes = {}) {
    const atualPerfil = existente.perfil || {};
    const linhas = [];
    const novo = Object.assign({}, conv.perfil);
    const linkedin = normalizarLinkedin(opcoes.linkedinUrl);
    if (linkedin) novo.linkedin = linkedin;

    const addCampo = (chave, valor, atual, extra = {}) => {
      if (!valor) return;
      const igual = norm(valor) === norm(atual);
      if (igual) return;
      linhas.push(Object.assign({
        chave, rotulo: ROTULOS[chave], atual: atual || '', novo: valor,
        selecionado: !atual     // só preenche vazios por padrão; sobrescrever é opt-in
      }, extra));
    };
    addCampo('telefone', novo.telefone, atualPerfil.telefone);
    addCampo('endereco', novo.endereco, atualPerfil.endereco);
    if (novo.estado || novo.cidade) {
      const atualLoc = [atualPerfil.cidade, atualPerfil.estado].filter(Boolean).join(' / ');
      const novoLoc = [novo.cidade, novo.estado].filter(Boolean).join(' / ');
      if (novoLoc && norm(novoLoc) !== norm(atualLoc)) {
        linhas.push({
          chave: 'localizacao', rotulo: ROTULOS.localizacao, atual: atualLoc, novo: novoLoc,
          selecionado: !atualLoc, cidade: novo.cidade || '', estado: novo.estado || ''
        });
      }
    }
    addCampo('sobre', novo.sobre, atualPerfil.sobre || atualPerfil.bio);
    addCampo('curso', novo.curso, atualPerfil.curso);
    addCampo('periodo', novo.periodo, atualPerfil.periodo, { estimado: !!novo._periodoEstimado });
    addCampo('linkedin', novo.linkedin, atualPerfil.linkedin);
    addCampo('github', novo.github, atualPerfil.github);
    addCampo('portfolio', novo.portfolio, atualPerfil.portfolio);

    const chaves = {
      experiencias: i => `${norm(i.empresa)}|${norm(i.cargo)}|${String(i.data_inicio || '').slice(0, 7)}`,
      formacoes: i => `${norm(i.instituicao)}|${norm(i.curso || i.area_estudo)}`,
      habilidades: i => `${norm(i.nome)}|${i.categoria}`,
      projetos: i => norm(i.titulo),
      certificacoes: i => `${norm(i.nome)}|${norm(i.instituicao)}`
    };
    const jaTem = {};
    for (const [sec, fn] of Object.entries(chaves)) jaTem[sec] = new Set((existente[sec] || []).map(fn));

    const secao = (sec, itens, descrever) => itens.map(dados => {
      const dup = jaTem[sec].has(chaves[sec](dados));
      const d = descrever(dados);
      const bloqueio = d.bloqueio || null;
      return { dados, ...d, duplicado: dup, bloqueio, selecionado: !dup && !bloqueio };
    });

    const mesAno = iso => iso ? `${pad2(Number(iso.slice(5, 7)))}/${iso.slice(0, 4)}` : '';
    const plano = {
      perfil: linhas,
      experiencias: secao('experiencias', conv.experiencias, e => ({
        titulo: `${e.cargo} — ${e.empresa}`,
        detalhe: `${mesAno(e.data_inicio)} – ${e.atual ? 'atual' : mesAno(e.data_fim)}`
      })),
      formacoes: secao('formacoes', conv.formacoes.map(({ _inicio, _emCurso, ...f }) => f), f => ({
        titulo: `${f.curso || '(curso não identificado)'} — ${f.instituicao}`,
        detalhe: `${f.ano_inicio || '?'} – ${f.ano_conclusao || 'em curso'}`
      })),
      habilidades: secao('habilidades', conv.habilidades, h => ({ titulo: h.nome, detalhe: h.categoria })),
      projetos: secao('projetos', conv.projetos, p => ({
        titulo: p.titulo, detalhe: p.status === 'CONCLUIDO' ? 'Concluído' : 'Em andamento'
      })),
      certificacoes: secao('certificacoes', conv.certificacoes, c => ({
        titulo: c.nome,
        detalhe: [c.instituicao, c.data_emissao ? mesAno(c.data_emissao) : ''].filter(Boolean).join(' · '),
        bloqueio: c.data_emissao ? null : 'Sem data de emissão (obrigatória no TalentoUNICAP)'
      })),
      avisos: conv.avisos.slice(),
      truncados: conv.truncados
    };
    return plano;
  }

  // ------------------------------------------------------------------
  // Aplicação: grava só o que o aluno marcou, reaproveitando os recursos
  // de API existentes (mesmas validações/RLS das telas manuais).
  // ------------------------------------------------------------------
  async function emLotes(itens, tamanho, fn) {
    for (let i = 0; i < itens.length; i += tamanho) await Promise.all(itens.slice(i, i + tamanho).map(fn));
  }

  async function aplicar(plano, api, hooks = {}) {
    const resumo = { perfil: { ok: false, campos: 0, erro: null }, secoes: {} };
    const progresso = hooks.onProgress || (() => { });

    const selecionados = plano.perfil.filter(l => l.selecionado);
    if (selecionados.length) {
      progresso('Atualizando dados pessoais…');
      const dto = {};
      for (const l of selecionados) {
        if (l.chave === 'localizacao') {
          if (l.estado) dto.estado = l.estado;
          if (l.cidade) dto.cidade = l.cidade;
        } else dto[l.chave] = l.novo;
      }
      const r = await api.salvarPerfil(dto);
      resumo.perfil = r && r.error
        ? { ok: false, campos: 0, erro: r.error }
        : { ok: true, campos: selecionados.length, erro: null };
    }

    const recursos = {
      experiencias: ['Experiências', api.experiencias],
      formacoes: ['Formações', api.formacoes],
      habilidades: ['Habilidades', api.habilidades],
      projetos: ['Projetos', api.projetos],
      certificacoes: ['Certificações', api.certificacoes]
    };
    for (const [sec, [rotulo, recurso]] of Object.entries(recursos)) {
      const itens = plano[sec].filter(i => i.selecionado && !i.duplicado && !i.bloqueio);
      const res = { ok: 0, falhas: [] };
      resumo.secoes[sec] = res;
      if (!itens.length) continue;
      progresso(`Importando ${rotulo.toLowerCase()} (${itens.length})…`);
      await emLotes(itens, 4, async item => {
        try {
          const r = await recurso.criar(item.dados);
          if (r && r.error) res.falhas.push({ titulo: item.titulo, erro: r.error });
          else res.ok++;
        } catch (e) { res.falhas.push({ titulo: item.titulo, erro: e.message || 'Erro desconhecido' }); }
      });
    }
    return resumo;
  }

  const api = {
    lerArquivos, converter, montarPlano, aplicar,
    // expostos para testes
    _internos: { parseCsv, parseData, norm, nivelAcademico, separarGrauCurso, normalizarLinkedin, urlSegura, nivelIdioma, categoriaHabilidade, formatarTelefoneBR }
  };

  root.LinkedInImport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
