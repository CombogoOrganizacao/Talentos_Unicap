// ============================================
// Serviço - Importação de currículo externo (PDF / DOCX)
//
// Lê um currículo que o aluno já tem pronto (PDF com texto ou Word .docx),
// extrai o texto 100% no navegador, identifica as seções e converte para o
// MESMO modelo da importação do LinkedIn. Por isso o plano de revisão e a
// gravação são os do LinkedInImport (montarPlano / aplicar).
//
// Etapas:  lerArquivo() -> converter() -> montarPlano() -> LinkedInImport.aplicar()
//
// Diferente do ZIP do LinkedIn (CSV estruturado), um currículo é texto livre:
// a interpretação é heurística. Por isso o plano marca o que ficou incompleto
// e deixa o aluno corrigir cada campo antes de gravar (veja `editaveis`).
//
// Não depende de DOM: pode ser testado em Node (veja module.exports).
// Depende de: linkedin-import-service.js (carregar antes).
// ============================================
(function (root) {
  'use strict';

  const LI = root.LinkedInImport || (typeof require === 'function' ? require('./linkedin-import-service.js') : null);
  if (!LI || !LI.helpers) throw new Error('curriculo-import-service.js precisa do linkedin-import-service.js carregado antes.');
  const {
    LIM, UF_POR_ESTADO, norm, limpar, cortar, urlSegura, semProtocolo, normalizarLinkedin,
    parseData, isoData, ym, pad2, separarGrauCurso, ehUnicap, formatarTelefoneBR,
    categoriaHabilidade, derivarCursoPeriodo
  } = LI.helpers;

  const MAX_BYTES = 10 * 1024 * 1024;       // arquivo enviado
  const MAX_PAGINAS = 15;                   // páginas de PDF lidas
  const MAX_XML_BYTES = 20 * 1024 * 1024;   // cada XML lido de dentro do .docx
  const TIMEOUT_PDF_MS = 45000;
  const PDFJS_URL = 'js/vendor/pdfjs/pdf.min.mjs';
  const PDFJS_WORKER_URL = 'js/vendor/pdfjs/pdf.worker.min.mjs';

  const UFS = new Set(Object.values(UF_POR_ESTADO));
  const UF_ALT = Array.from(UFS).join('|');

  // ==================================================================
  // 1. EXTRAÇÃO DE TEXTO
  // ==================================================================

  function normalizarTexto(t) {
    return String(t ?? '')
      .replace(/[\uFB00-\uFB06]/g, c => ({ '\uFB00': 'ff', '\uFB01': 'fi', '\uFB02': 'fl', '\uFB03': 'ffi', '\uFB04': 'ffl', '\uFB05': 'st', '\uFB06': 'st' }[c]))
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\r\n?/g, '\n');
  }

  const decodificarXml = s => String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

  // ---------- DOCX ----------
  // word/document.xml -> texto, um parágrafo por linha. Itens de lista (numPr)
  // ganham "• " porque o marcador não existe como texto no XML.
  function docxParaTexto(xml) {
    const limpo = String(xml).replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');   // caixas de texto vêm duplicadas
    const linhas = [];
    for (const p of limpo.split(/<\/w:p>/)) {
      let texto = '';
      const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:(?:br|cr)(?:\s[^>]*)?\/>/g;
      let m;
      while ((m = re.exec(p))) {
        if (m[1] !== undefined) texto += decodificarXml(m[1]);
        else if (m[0].startsWith('<w:tab')) texto += '\t';
        else texto += '\n';
      }
      if (!texto.trim()) { if (/<\/w:|<w:p[\s>]/.test(p)) linhas.push(''); continue; }
      const estilo = (p.match(/<w:pStyle\s+w:val="([^"]*)"/) || [])[1] || '';
      if (/<w:numPr>/.test(p) || /^(?:list|lista|bullet|marcador|pargrafodelista)/i.test(estilo.replace(/[\s_-]/g, ''))) texto = '• ' + texto.trimStart();
      linhas.push(texto);
    }
    return linhas.join('\n');
  }

  async function extrairDocx(buffer, JSZipLib) {
    if (!JSZipLib) throw new Error('A biblioteca JSZip não foi carregada. Recarregue a página.');
    let zip;
    try { zip = await JSZipLib.loadAsync(buffer); }
    catch (_) { throw new Error('Não foi possível abrir o .docx. O arquivo está corrompido ou protegido por senha?'); }

    const lerXml = async nome => {
      const f = zip.file(nome);
      if (!f) return '';
      const tam = f._data && f._data.uncompressedSize;
      if (tam && tam > MAX_XML_BYTES) throw new Error('O documento é grande demais para ser lido.');
      return f.async('string');
    };

    const corpoXml = await lerXml('word/document.xml');
    if (!corpoXml) throw new Error('Esse arquivo não parece um documento Word (.docx) válido.');

    // Cabeçalhos: muitos modelos de currículo colocam nome/contatos ali
    const cabecalhos = [];
    for (const nome of Object.keys(zip.files).filter(n => /^word\/header\d*\.xml$/i.test(n)).sort()) {
      const t = docxParaTexto(await lerXml(nome)).trim();
      if (t) cabecalhos.push(t);
    }

    // Links (hyperlinks) apontam para o endereço real, mesmo quando o texto é só "LinkedIn"
    const links = [];
    const rels = await lerXml('word/_rels/document.xml.rels');
    if (rels) {
      const alvos = new Map();
      for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
        const id = (m[0].match(/\bId="([^"]+)"/) || [])[1];
        const alvo = (m[0].match(/\bTarget="([^"]+)"/) || [])[1];
        if (id && alvo && /TargetMode="External"/i.test(m[0])) alvos.set(id, decodificarXml(alvo));
      }
      for (const m of corpoXml.matchAll(/<w:hyperlink\b[^>]*\br:id="([^"]+)"/g)) {
        if (alvos.has(m[1])) links.push(alvos.get(m[1]));
      }
    }

    return { texto: [...cabecalhos, docxParaTexto(corpoXml)].join('\n'), links };
  }

  // ---------- PDF ----------
  // Junta os fragmentos de texto do pdf.js em linhas (por posição vertical) e
  // marca com linha em branco as quebras maiores (espaço entre blocos).
  function itensParaLinhas(items) {
    const linhas = [];
    let atual = '', lastY = null, lastEnd = null, lastH = 0, quebrar = false;
    const fechar = () => { if (atual.trim()) linhas.push(atual); atual = ''; };

    for (const it of items) {
      if (!it || typeof it.str !== 'string') continue;
      const tr = it.transform || [1, 0, 0, 1, 0, 0];
      const x = tr[4], y = tr[5];
      const h = it.height || Math.abs(tr[3]) || 10;
      if (it.str === '') { if (it.hasEOL) quebrar = true; continue; }

      const mudouLinha = quebrar || (lastY !== null && Math.abs(y - lastY) > Math.max(2, h * 0.5));
      if (atual && mudouLinha) {
        const gap = lastY !== null ? Math.abs(lastY - y) : 0;
        fechar();
        if (gap > lastH * 2.4) linhas.push('');
      } else if (atual && lastEnd !== null) {
        const espaco = x - lastEnd;
        if (espaco > h * 3) atual += ' | ';                       // colunas / datas alinhadas à direita
        else if (espaco > h * 0.2 && !/\s$/.test(atual) && !/^\s/.test(it.str)) atual += ' ';
      }
      atual += it.str;
      lastY = y; lastEnd = x + (it.width || 0); lastH = h;
      quebrar = !!it.hasEOL;
    }
    fechar();
    return linhas;
  }

  let pdfjsPromise = null;
  function carregarPdfJs(deps = {}) {
    if (deps.pdfjs) return Promise.resolve(deps.pdfjs);
    if (!pdfjsPromise) {
      const base = (typeof document !== 'undefined' && document.baseURI) || '';
      pdfjsPromise = import(/* webpackIgnore: true */ new URL(PDFJS_URL, base).href)
        .then(lib => { lib.GlobalWorkerOptions.workerSrc = new URL(PDFJS_WORKER_URL, base).href; return lib; })
        .catch(e => {
          pdfjsPromise = null;
          console.error('Falha ao carregar o pdf.js:', e);
          throw new Error('Não foi possível carregar o leitor de PDF. Verifique sua conexão e tente de novo, ou envie o currículo em .docx.');
        });
    }
    return pdfjsPromise;
  }

  async function extrairPdf(buffer, deps = {}) {
    const pdfjs = await carregarPdfJs(deps);
    const tarefa = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0 });
    let doc;
    try { doc = await tarefa.promise; }
    catch (e) {
      if (e && e.name === 'PasswordException') throw new Error('Esse PDF está protegido por senha. Remova a senha e envie de novo.');
      throw new Error('Não foi possível abrir o PDF. O arquivo pode estar corrompido.');
    }
    try {
      const paginas = Math.min(doc.numPages, MAX_PAGINAS);
      const partes = [], links = [];
      for (let n = 1; n <= paginas; n++) {
        const pagina = await doc.getPage(n);
        const conteudo = await pagina.getTextContent();
        partes.push(itensParaLinhas(conteudo.items).join('\n'));
        try {
          for (const a of await pagina.getAnnotations()) if (a.subtype === 'Link' && a.url) links.push(a.url);
        } catch (_) { /* anotações são opcionais */ }
      }
      return { texto: partes.join('\n\n'), links, paginas: doc.numPages };
    } finally {
      try { await doc.destroy(); } catch (_) { /* nada */ }
    }
  }

  const comTimeout = (promessa, ms, msg) => Promise.race([
    promessa,
    new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))
  ]);

  // arquivo: File (ou objeto com name, size e arrayBuffer())
  async function lerArquivo(arquivo, deps = {}) {
    if (!arquivo) throw new Error('Selecione um arquivo.');
    const nome = arquivo.name || '';
    if (arquivo.size > MAX_BYTES) throw new Error('O arquivo é grande demais (limite de 10 MB).');
    if (/\.doc$/i.test(nome)) throw new Error('O formato .doc (Word antigo) não é suportado. Abra o arquivo no Word e salve como .docx ou PDF.');
    const ehPdf = /\.pdf$/i.test(nome), ehDocx = /\.docx$/i.test(nome);
    if (!ehPdf && !ehDocx) throw new Error('Formato não suportado. Envie um arquivo PDF ou Word (.docx).');

    const buffer = await arquivo.arrayBuffer();
    const cab = new Uint8Array(buffer.slice(0, 5));
    const assinatura = String.fromCharCode(...cab);
    if (ehPdf && !assinatura.startsWith('%PDF')) throw new Error('Esse arquivo não é um PDF válido.');
    if (ehDocx && !assinatura.startsWith('PK')) throw new Error('Esse arquivo não é um documento .docx válido.');

    const r = ehPdf
      ? await comTimeout(extrairPdf(buffer, deps), TIMEOUT_PDF_MS, 'A leitura do PDF demorou demais. Tente um arquivo menor ou em .docx.')
      : await extrairDocx(buffer, deps.JSZip || root.JSZip);

    const texto = normalizarTexto(r.texto).slice(0, 200000);
    if (texto.replace(/\s/g, '').length < 80) {
      throw new Error(ehPdf
        ? 'Não encontrei texto nesse PDF. Ele deve ser uma imagem escaneada — exporte o currículo como PDF a partir do Word/Google Docs (ou envie o .docx).'
        : 'O documento está praticamente vazio.');
    }
    return { texto, links: r.links || [], formato: ehPdf ? 'pdf' : 'docx' };
  }

  // ==================================================================
  // 2. LINHAS E SEÇÕES
  // ==================================================================

  const BULLET_RE = /^\s*(?:[\u2022\u25CF\u25AA\u25A0\u25E6\u25CB\u27A2\u27A4\u25BA\u25B6\u2713\u2714\u00B7\u2219*]|[\uE000-\uF8FF]|[-\u2013\u2014](?=\s))\s*/;

  // -> [{ t: texto, b: é item de lista }], com '' para linhas em branco
  function prepararLinhas(texto) {
    let out = [];
    for (const bruto of normalizarTexto(texto).split('\n')) {
      let t = bruto, b = false;
      const m = t.match(BULLET_RE);
      if (m && t.slice(m[0].length).trim()) { b = true; t = t.slice(m[0].length); }
      t = t.replace(/\t+/g, ' | ').replace(/\s{2,}/g, ' ').trim().replace(/^\|\s*/, '').replace(/\s*\|$/, '').trim();
      if (/^(?:p[aá]gina|page)\s+\d+(?:\s+(?:de|of)\s+\d+)?$/i.test(t) || /^\d{1,2}\s*\/\s*\d{1,2}$/.test(t)) continue;   // "Página 1 de 2"
      if (!t) { if (out.length && out[out.length - 1].t !== '') out.push({ t: '', b: false }); continue; }
      out.push({ t, b });
    }
    while (out.length && out[out.length - 1].t === '') out.pop();

    // Modelos do Word que deixam uma linha em branco entre TODAS as linhas: o espaçamento não é separador
    const naoVazias = out.filter(l => l.t).length;
    const vazias = out.length - naoVazias;
    if (naoVazias >= 8 && vazias / naoVazias >= 0.7) out = out.filter(l => l.t);
    return out;
  }

  // [seção, categoria padrão das habilidades, títulos normalizados]
  const TITULOS = [
    ['resumo', null, ['resumo', 'resumo profissional', 'resumo de qualificacoes', 'sobre mim', 'sobre', 'perfil', 'perfil profissional', 'objetivo', 'objetivo profissional', 'apresentacao', 'summary', 'professional summary', 'about me', 'about', 'profile', 'career objective', 'objective']],
    ['experiencias', null, ['experiencia', 'experiencias', 'experiencia profissional', 'experiencias profissionais', 'historico profissional', 'atuacao profissional', 'trajetoria profissional', 'experiencia de trabalho', 'estagios', 'work experience', 'experience', 'professional experience', 'employment history', 'employment', 'career history', 'relevant experience']],
    ['formacoes', null, ['formacao', 'formacao academica', 'educacao', 'escolaridade', 'academico', 'dados academicos', 'formacao educacional', 'ensino superior', 'education', 'academic background', 'academic education', 'educational background']],
    ['habilidades', null, ['habilidades', 'competencias', 'habilidades e competencias', 'competencias e habilidades', 'principais competencias', 'top skills', 'conhecimentos', 'conhecimentos tecnicos', 'qualificacoes', 'skills', 'key skills', 'core skills']],
    ['habilidades', 'Técnica', ['habilidades tecnicas', 'competencias tecnicas', 'hard skills', 'technical skills', 'tecnologias', 'linguagens', 'linguagens de programacao', 'stack', 'stack tecnologica', 'technologies', 'programming languages']],
    ['habilidades', 'Ferramenta', ['ferramentas', 'tools', 'softwares', 'ferramentas e tecnologias', 'tecnologias e ferramentas', 'ferramentas e softwares']],
    ['habilidades', 'Soft Skill', ['soft skills', 'habilidades comportamentais', 'competencias comportamentais', 'habilidades interpessoais', 'competencias interpessoais', 'habilidades pessoais', 'perfil comportamental']],
    ['idiomas', 'Idioma', ['idiomas', 'idioma', 'linguas', 'languages']],
    ['projetos', null, ['projetos', 'projeto', 'projetos pessoais', 'projetos academicos', 'projetos de destaque', 'projetos relevantes', 'projects', 'personal projects', 'academic projects', 'side projects', 'portfolio', 'projetos e portfolio']],
    ['certificacoes', null, ['certificacoes', 'certificados', 'cursos', 'cursos e certificacoes', 'certificacoes e cursos', 'cursos complementares', 'cursos e treinamentos', 'cursos e capacitacoes', 'formacao complementar', 'cursos extracurriculares', 'capacitacoes', 'treinamentos', 'certifications', 'licenses and certifications', 'licencas e certificacoes', 'courses', 'cursos e qualificacoes', 'qualificacoes e atividades complementares', 'atividades complementares']],
    ['contato', null, ['contato', 'contatos', 'contact', 'informacoes de contato', 'informacoes pessoais', 'dados pessoais', 'personal information', 'personal details']],
    ['ignorar', null, ['referencias', 'references', 'interesses', 'hobbies', 'atividades extracurriculares', 'voluntariado', 'trabalho voluntario', 'atividades voluntarias', 'premios', 'conquistas', 'premios e conquistas', 'publicacoes', 'extracurricular', 'informacoes adicionais', 'outras informacoes', 'disponibilidade', 'pretensao salarial', 'links', 'redes sociais', 'palestras', 'eventos', 'participacao em eventos', 'honors', 'awards', 'volunteer', 'volunteering', 'interests']]
  ];
  const MAPA_TITULOS = new Map();
  for (const [sec, cat, nomes] of TITULOS) for (const n of nomes) MAPA_TITULOS.set(n, { sec, cat });

  function detectarTitulo(l) {
    if (l.b || !l.t) return null;
    const t = l.t.replace(/[:：\s]+$/, '').trim();
    if (!t || t.length > 50) return null;
    const hit = MAPA_TITULOS.get(norm(t).replace(/^\d+\s+/, ''));
    return hit ? { ...hit, resto: '' } : null;
  }

  // "Habilidades: Java, SQL" / "Idiomas: Inglês (avançado)" — título e conteúdo na mesma linha
  function detectarTituloInline(l) {
    if (l.b) return null;
    const m = l.t.match(/^([^:]{3,40}):\s*(\S.*)$/);
    if (!m) return null;
    const hit = MAPA_TITULOS.get(norm(m[1]));
    if (!hit || !(hit.sec === 'habilidades' || hit.sec === 'idiomas' || hit.sec === 'resumo')) return null;
    if (hit.sec === 'resumo' && (m[2].length < 30 || TEM_URL_RE.test(m[2]) || EMAIL_RE.test(m[2]))) return null;   // "Perfil: linkedin.com/in/..."
    return { ...hit, resto: m[2] };
  }

  function dividirSecoes(linhas) {
    const chunks = [{ sec: 'cabecalho', cat: null, titulo: '', lines: [] }];
    for (const l of linhas) {
      const h = detectarTitulo(l) || detectarTituloInline(l);
      if (h) {
        chunks.push({ sec: h.sec, cat: h.cat, titulo: l.t.replace(/[:：\s]+$/, ''), lines: [] });
        if (h.resto) chunks[chunks.length - 1].lines.push({ t: h.resto, b: false });
      } else chunks[chunks.length - 1].lines.push(l);
    }
    return chunks;
  }

  // ==================================================================
  // 3. DATAS, LINKS, CONTATO
  // ==================================================================

  const MESES_ALT = 'janeiro|january|jan|fevereiro|february|fev|feb|mar[cç]o|march|mar|abril|april|abr|apr|maio|may|mai|junho|june|jun|julho|july|jul|agosto|august|ago|aug|setembro|september|sept|set|sep|outubro|october|out|oct|novembro|november|nov|dezembro|december|dez|dec';
  const DATA_S = `(?:\\b(?:${MESES_ALT})\\.?\\s*(?:de\\s+|[\\/.,-]\\s*)?)?(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])\\s*[\\/.-]\\s*(?:19|20)\\d{2}`;
  const ATUAL_S = 'atual(?:mente)?|presente|present|current|hoje|atualidade|o momento|at[eé] o momento|now|cursando|em andamento|em curso|ongoing';
  const RANGE_S = `(${DATA_S})\\s*(?:[-–—]|at[eé]|to|ao|a)\\s*(${DATA_S}|${ATUAL_S})`;
  const ATUAL_RE = new RegExp(`^(?:${ATUAL_S})$`, 'i');

  // "Jan 2020 - Atual", "09/2021 a 03/2023", "2019 – 2022", "desde mar/2021"
  function acharIntervalo(texto) {
    const re = new RegExp(RANGE_S, 'gi');
    let m;
    while ((m = re.exec(texto))) {
      if (m.index > 0 && /\d/.test(texto[m.index - 1])) { re.lastIndex = m.index + 1; continue; }
      const ini = parseData(m[1]);
      if (!ini) continue;
      const atual = ATUAL_RE.test(m[2].trim());
      const fim = atual ? null : parseData(m[2]);
      if (!atual && !fim) continue;
      return { ini, fim, atual, indice: m.index, tamanho: m[0].length };
    }
    const s = texto.match(new RegExp(`\\b(?:desde|since|a partir de|from)\\s+(${DATA_S})`, 'i'));
    if (s) {
      const ini = parseData(s[1]);
      if (ini) return { ini, fim: null, atual: true, indice: s.index, tamanho: s[0].length };
    }
    return null;
  }

  // Uma data só ("Conclusão: 2023", "Previsão: 12/2026", "Cursando") — usado na formação
  const PALAVRA_DATA_UNICA = /\b(previs\w*|prevista|expected|cursando|em andamento|em curso|in progress|conclus[aã]o|conclu[ií]d[oa]|formatura|formad[oa]|graduat\w*|completed|ano de conclus[aã]o)\b/i;
  function acharDataUnica(texto) {
    const soData = new RegExp(`^\\(?\\s*(?:${DATA_S})\\s*\\)?$`, 'i').test(texto.trim());
    if (!PALAVRA_DATA_UNICA.test(texto) && !soData) return null;
    const m = new RegExp(DATA_S, 'i').exec(texto);
    const fim = m ? parseData(m[0]) : null;
    const emCurso = /\b(previs\w*|prevista|expected|cursando|em andamento|em curso|in progress)\b/i.test(texto);
    if (!fim && !emCurso) return null;
    return { ini: null, fim, atual: emCurso, indice: m ? m.index : 0, tamanho: m ? m[0].length : 0, unica: true };
  }

  const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'\])]+|\b(?:[a-z0-9-]+\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net)\/[^\s<>"'\])]+/gi;
  function extrairUrls(texto) {
    const set = new Set();
    for (const m of String(texto ?? '').matchAll(URL_RE)) set.add(m[0].replace(/[.,;:!?]+$/, ''));
    return Array.from(set);
  }
  const hostDe = u => { try { return new URL(urlSegura(u)).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; } };
  const REDES = /(^|\.)(linkedin\.com|github\.com|gitlab\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|wa\.me|whatsapp\.com|t\.me|youtube\.com|youtu\.be|lattes\.cnpq\.br|medium\.com)$/;

  const TEM_URL_RE = /(?:https?:\/\/|www\.)\S+|\b(?:linkedin\.com|github\.com|gitlab\.com)\/\S+/i;
  const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  const TEL_RE = /(?:\+?\s*55[\s.-]*)?\(?\s*\d{2}\s*\)?[\s.-]*9?\s*\d{4}[\s.-]*\d{4}(?!\d)/;

  function acharTelefone(linhas) {
    for (const l of linhas) {
      const m = l.match(TEL_RE);
      if (!m) continue;
      const t = formatarTelefoneBR(m[0]);
      if (t) return t;
    }
    return '';
  }

  const ENDERECO_RE = /^(rua|r\.|av\.?|avenida|travessa|tv\.|alameda|rodovia|estrada|pra[cç]a)\s/i;

  // "Recife - PE", "Recife, PE", "Recife/PE", "Recife (PE)", "Recife, Pernambuco, Brasil"
  function acharLocal(segmento) {
    let s = segmento.trim();
    const par = s.match(/^(.+?)\s*\(\s*([A-Z]{2})\s*\)$/);
    if (par && UFS.has(par[2])) return { cidade: par[1].split(',').pop().trim(), estado: par[2], resto: par[1].split(',').slice(0, -1).join(',').trim() };
    const partes = s.split(/\s*[,\/–—]\s*|\s+-\s+/).map(p => p.trim()).filter(Boolean);
    while (partes.length && /^(brasil|brazil)$/i.test(partes[partes.length - 1])) partes.pop();
    if (partes.length < 2) return null;
    const ultima = partes[partes.length - 1];
    let estado = '';
    if (/^[A-Z]{2}$/.test(ultima) && UFS.has(ultima)) estado = ultima;
    else if (UF_POR_ESTADO[norm(ultima)]) estado = UF_POR_ESTADO[norm(ultima)];
    if (!estado) return null;
    const cidade = partes[partes.length - 2];
    if (!/^[A-Za-zÀ-ÿ.'’ ]{2,40}$/.test(cidade) || CARGO_RE.test(norm(cidade))) return null;
    return { cidade, estado, resto: partes.slice(0, -2).join(', ') };
  }

  // ==================================================================
  // 4. CARGO / EMPRESA / CABEÇALHOS DE ENTRADA
  // ==================================================================

  const CARGO_RE = /\b(estagi\w*|desenvolv\w*|programador\w*|analista|engenheir\w*|assistente|auxiliar|gerente|coordenador\w*|supervisor\w*|diretor\w*|consultor\w*|especialista|tecnic\w*|arquitet\w*|designer|administrador\w*|atendente|vendedor\w*|operador\w*|monitor\w*|bolsista|pesquisador\w*|professor\w*|instrutor\w*|trainee|aprendiz|recepcionista|secretari\w*|representante|promotor\w*|motorista|enfermeir\w*|advogad\w*|contador\w*|medic\w*|psicolog\w*|nutricionista|fisioterapeuta|jornalista|redator\w*|editor\w*|fotograf\w*|social media|freelancer|lider|chefe|gestor\w*|encarregad\w*|developer|engineer|intern|internship|manager|analyst|specialist|consultant|director|assistant|coordinator|architect|programmer|tester|qa|devops|sre|scientist|researcher|teacher|tutor|lead|officer|associate|executive|agent|clerk|technician|fullstack|full stack|backend|back end|frontend|front end)\b/;
  const EMPRESA_RE = /\b(ltda|s a|sa|eireli|inc|llc|corp|company|group|grupo|banco|hospital|escola|colegio|universidade|faculdade|instituto|fundacao|empresa|consultoria|solucoes|sistemas|software|labs?|studio|agencia|clinica|laboratorio|prefeitura|governo|secretaria|ministerio|tribunal|supermercado|farmacia|restaurante|hotel|construtora|industria|comercio|servicos|tecnologias?|digital)\b/;
  const CONTRATO_RE = /^(tempo integral|meio periodo|full[- ]?time|part[- ]?time|clt|pj|remoto|remote|presencial|hibrido|hybrid|home office)$/i;
  const INST_RE = /\b(universidade|univ|faculdade|facul|instituto|centro universitario|escola|colegio|college|university|institute|school|unicap|ufpe|ufrpe|uninassau|unifavip|senai|senac|ifpe|if[a-z]{2}|usp|unicamp|ufc|ufba|ufrn|ufpb|ufal|uepb|upe|uninter|fiap|estacio|unip|anhanguera|unifacisa|fbv|cesar|iesp|fundacao|centro de ensino)\b/;
  const UNIVERSIDADE_RE = /\b(universidade|univ|faculdade|facul|centro universitario|college|university|unicap|ufpe|ufrpe|uninassau|unifavip|usp|unicamp|ufc|ufba|ufrn|ufpb|ufal|uepb|upe|uninter|estacio|unip|anhanguera|unifacisa|fbv|iesp|ifpe)\b/;
  const NAO_SUPERIOR_RE = /\b(ensino medio|ensino fundamental|segundo grau|2o grau|high school|ensino tecnico|curso tecnico|tecnico em|tecnico de)\b/;

  const BORDA_RE = /^[\s|,;:\-–—•·([]+|[\s|,;:\-–—•·]+$/g;
  function limparBordas(t) {
    let s = String(t).replace(/\(\s*\)|\[\s*\]/g, '').replace(/\s{2,}/g, ' ').replace(BORDA_RE, '').trim();
    const abre = (s.match(/\(/g) || []).length, fecha = (s.match(/\)/g) || []).length;
    if (fecha > abre) s = s.replace(/\)+$/, '').trim();
    if (abre > fecha) s = s.replace(/^\(+/, '').trim();
    return s.replace(/\b(per[ií]odo|data|periodo)\s*:?\s*$/i, '').replace(BORDA_RE, '').trim();
  }

  const removerTrecho = (texto, indice, tamanho) => texto.slice(0, indice) + ' ' + texto.slice(indice + tamanho);

  // "1 ano 10 meses" (duração que o PDF do LinkedIn imprime ao lado do período)
  const DURACAO_RE = /\b\d+\s*(?:anos?|years?|yrs?|meses|m[eê]s|months?|mos?)\b(?:\s*\d+\s*(?:meses|m[eê]s|months?|mos?)\b)?/gi;
  const RESIDUO_DATA_RE = /\b(?:previs[aã]o(?:\s+de\s+conclus[aã]o)?|prevista|expected(?:\s+graduation)?|cursando|em andamento|em curso|in progress|ano de conclus[aã]o|conclus[aã]o|conclu[ií]d[oa]|formatura|formad[oa]|completed)\b\s*:?/gi;
  const limparResiduoData = t => limparBordas(t.replace(RESIDUO_DATA_RE, ' ').replace(DURACAO_RE, ' '));

  const LOCAL_FINAL_RE = new RegExp(`\\s*(?:[,|–—-]|\\()\\s*[A-ZÀ-Ú][A-Za-zÀ-ÿ.'’ ]{1,30}?\\s*(?:[,\\/–—-]\\s*|\\(\\s*)(?:${UF_ALT})\\)?\\s*$`);
  const MODALIDADE_FINAL_RE = /(?:\s*[,|–—-]\s*|\s*\(\s*)(?:remoto|remote|presencial|h[ií]brido|hybrid|home office)\)?\s*$/i;
  function tirarLocal(t) {
    return String(t).replace(LOCAL_FINAL_RE, '').replace(MODALIDADE_FINAL_RE, '').replace(/\s*[,|–—-]\s*(?:brasil|brazil)\s*$/i, '').trim();
  }

  function dividirPartes(t) {
    return t.split(/\s*\|\s*|\s+[•·]\s+|\s+[-–—]\s+|\s+@\s+|\s+(?:na|no|at)\s+(?=[A-ZÀ-Ú0-9])/)
      .map(s => limparBordas(s)).filter(Boolean);
  }

  // Linha curta, sem ponto final: parece título de entrada, não descrição
  const ehCabecalho = l => !!(l && l.t && !l.b && l.t.length <= 90 && !/[.;:]$/.test(l.t) && !acharIntervalo(l.t) && !TEM_URL_RE.test(l.t));

  function atribuirCargoEmpresa(partes) {
    const ps = partes.filter(Boolean);
    if (!ps.length) return { cargo: '', empresa: '' };
    const ehCargo = p => CARGO_RE.test(norm(p));
    const ehEmpresa = p => EMPRESA_RE.test(norm(p));
    if (ps.length === 1) return ehCargo(ps[0]) ? { cargo: ps[0], empresa: '' } : { cargo: '', empresa: ps[0] };

    const idxCargo = ps.findIndex(ehCargo);
    let iCargo;
    if (idxCargo >= 0) iCargo = idxCargo;
    else {
      const idxEmp = ps.findIndex(ehEmpresa);
      iCargo = idxEmp >= 0 ? (idxEmp === 0 ? 1 : 0) : 0;     // sem pistas: "Cargo — Empresa"
    }
    const resto = ps.filter((_, i) => i !== iCargo);
    const empresa = resto.find(ehEmpresa) || resto[0] || '';
    return { cargo: ps[iCargo], empresa };
  }

  // Agrupa as linhas de uma seção em entradas, usando as datas como âncora:
  //   { cab: [linhas do título], corpo: [linhas de descrição], r: intervalo|null }
  function agruparPorData(linhas, opc = {}) {
    const ancoras = [];
    linhas.forEach((l, i) => {
      if (l.b || !l.t || l.t.length > 140) return;
      const r = acharIntervalo(l.t) || (opc.dataUnica ? acharDataUnica(l.t) : null);
      if (r) ancoras.push({ i, r });
    });
    if (!ancoras.length) return null;

    const entradas = ancoras.map((a, k) => {
      const limiteInf = k > 0 ? ancoras[k - 1].i : -1;
      const limiteSup = k + 1 < ancoras.length ? ancoras[k + 1].i : linhas.length;
      const textoCab = limparResiduoData(removerTrecho(linhas[a.i].t, a.r.indice, a.r.tamanho));
      const nParteslinha = textoCab ? dividirPartes(textoCab).length : 0;
      const maxAcima = !textoCab ? 2 : (nParteslinha >= 2 ? 0 : 1);

      const acima = [];
      let inicioCab = a.i;
      for (let j = a.i - 1; j > limiteInf && acima.length < maxAcima; j--) {
        if (!ehCabecalho(linhas[j])) break;
        acima.unshift(linhas[j].t);
        inicioCab = j;
      }
      const abaixo = [];
      let fimCab = a.i;
      if (!textoCab && !acima.length) {     // modelo "data primeiro": o título vem depois da data
        for (let j = a.i + 1; j < limiteSup && abaixo.length < 2; j++) {
          if (!ehCabecalho(linhas[j])) break;
          abaixo.push(linhas[j].t);
          fimCab = j;
        }
      }
      const emCursoTexto = /\b(previs\w*|prevista|expected|cursando|em andamento|em curso|in progress)\b/i.test(linhas[a.i].t);
      return { cab: [...acima, ...(textoCab ? [textoCab] : []), ...abaixo], r: a.r, inicioCab, fimCab, corpo: [], emCursoTexto };
    });

    entradas.forEach((e, k) => {
      const fim = k + 1 < entradas.length ? entradas[k + 1].inicioCab : linhas.length;
      e.corpo = linhas.slice(e.fimCab + 1, fim).filter(l => l.t);
    });
    return entradas;
  }

  // Sem nenhuma data: separa por linhas em branco (ou uma entrada por linha)
  function agruparPorBlocos(linhas, { porLinha = false } = {}) {
    const blocos = [];
    let atual = [];
    for (const l of linhas) {
      if (!l.t) { if (atual.length) blocos.push(atual); atual = []; } else atual.push(l);
    }
    if (atual.length) blocos.push(atual);
    const grupos = (blocos.length === 1 && porLinha && !blocos[0].some(l => l.b))
      ? blocos[0].map(l => [l]) : blocos;
    return grupos.map(g => {
      const cabecas = g.filter(l => !l.b).slice(0, porLinha ? 1 : 2);
      return { cab: cabecas.map(l => l.t), corpo: g.filter(l => !cabecas.includes(l)), r: null };
    });
  }

  const corpoParaTexto = linhas => linhas.filter(l => l.t).map(l => (l.b ? `• ${l.t}` : l.t)).join('\n');

  // ==================================================================
  // 5. CONVERSORES POR SEÇÃO
  // ==================================================================

  function construirExperiencia(e, ctx) {
    const corpo = e.corpo.slice();
    while (corpo.length && !corpo[0].b && corpo[0].t.length <= 60 && (acharLocal(corpo[0].t) || /^(remoto|remote|presencial|h[ií]brido|hybrid)$/i.test(corpo[0].t))) corpo.shift();
    const partes = e.cab.flatMap(t => dividirPartes(tirarLocal(t)).filter(p => !CONTRATO_RE.test(norm(p))));
    if (partes.length === 1 && /,/.test(partes[0])) {
      const sub = partes[0].split(/\s*,\s+/).filter(Boolean);
      if (sub.length > 1 && sub.some(p => CARGO_RE.test(norm(p)))) partes.splice(0, 1, ...sub.slice(0, 2), ...(sub.length > 2 ? [sub.slice(2).join(', ')] : []));
    }
    const { cargo, empresa } = atribuirCargoEmpresa(partes);
    const r = e.r;
    const atual = !!(r && r.atual);
    const dataIni = r && r.ini ? isoData(r.ini, false) : '';
    let dataFim = atual || !r || !r.fim ? '' : isoData(r.fim, true);
    if (dataFim && dataIni && dataFim < dataIni) dataFim = dataIni;
    return {
      empresa: cortar(empresa, LIM.empresa, ctx),
      cargo: cortar(cargo, LIM.cargo, ctx),
      descricao: cortar(corpoParaTexto(corpo), LIM.descricao, ctx),
      data_inicio: dataIni, data_fim: dataFim, atual: atual || !dataFim
    };
  }

  function construirFormacao(e, config, agora, ctx, avisos) {
    const textoTodo = [...e.cab, ...e.corpo.map(l => l.t)].join(' ');
    if (NAO_SUPERIOR_RE.test(norm(textoTodo))) {
      avisos.push(`Formação ignorada (o TalentoUNICAP só aceita graduação, especialização, mestrado e doutorado): ${e.cab[0] || textoTodo.slice(0, 60)}.`);
      return null;
    }
    const partes = e.cab.flatMap(t => dividirPartes(tirarLocal(t))).flatMap(p => p.split(/\s*,\s+/)).filter(Boolean);
    if (!partes.length) return null;

    let instituicao = partes.find(p => INST_RE.test(norm(p))) || '';
    let resto = partes.filter(p => p !== instituicao);
    if (!instituicao && partes.length >= 2) { instituicao = partes[partes.length - 1]; resto = partes.slice(0, -1); }
    if (!instituicao) { instituicao = partes[0]; resto = []; }

    const notas = e.corpo.map(l => l.t).join(' ');
    const comGrau = resto.filter(seg => separarGrauCurso(seg, '', config).nivel);    // "Bacharelado em X" vale mais que um "X" repetido ou uma cidade
    const textoCurso = (comGrau.length ? comGrau : resto).join(', ');
    const { nivel: nivelAchado, curso } = separarGrauCurso(textoCurso || instituicao, notas, config);
    let nivel = nivelAchado;
    if (!nivel && UNIVERSIDADE_RE.test(norm(instituicao))) nivel = 'Graduação';   // o aluno confirma no select

    const r = e.r;
    const agoraYm = agora.getFullYear() * 12 + agora.getMonth();
    const ini = r ? r.ini : null, fim = r ? r.fim : null;
    const marcadoEmCurso = (r && r.atual) || e.emCursoTexto || /\b(previs\w*|expected|cursando|em andamento|em curso|in progress)\b/i.test(textoTodo);
    const emCurso = !!marcadoEmCurso || (r ? (!fim || (fim.m != null ? ym(fim) > agoraYm : fim.y > agora.getFullYear())) : true);

    return {
      instituicao: cortar(instituicao, LIM.instituicao, ctx),
      nivel,
      curso: cortar(curso, LIM.curso, ctx),
      ano_inicio: ini ? String(ini.y) : '',
      ano_conclusao: emCurso || !fim ? '' : String(fim.y),
      _inicio: ini, _emCurso: emCurso
    };
  }

  const NIVEL_IDIOMA = [
    [/\b(nativ[oa]|native|bil[ií]ngue|bilingual|c2)\b/i, 'Expert'],
    [/\b(fluente|fluent|avan[cç]ado|advanced|c1|profissional|professional|full professional)\b/i, 'Avançado'],
    [/\b(intermedi[aá]rio|intermediate|b1|b2|conversa[cç][aã]o|limited working)\b/i, 'Intermediário'],
    [/\b(b[aá]sico|basic|iniciante|beginner|elementar|elementary|a1|a2|pr[eé]-intermedi[aá]rio)\b/i, 'Básico']
  ];
  const nivelIdiomaTexto = t => { for (const [re, n] of NIVEL_IDIOMA) if (re.test(t)) return n; return null; };

  const IDIOMAS_CONHECIDOS = /^(ingl[eê]s|english|espanhol|spanish|castelhano|franc[eê]s|french|alem[aã]o|german|italiano|italian|japon[eê]s|japanese|mandarim|chin[eê]s|chinese|portugu[eê]s|portuguese|libras|russo|russian|coreano|korean|[aá]rabe|arabic|hebraico|hebrew|holand[eê]s|dutch|esperanto|latim|latin)\b/i;

  function itensDeLista(linhas) {
    const out = [];
    for (const l of linhas) {
      if (!l.t) continue;
      // vírgula dentro de parênteses não separa: "Inglês (Avançado, C1)"
      const t = l.t.replace(/\(([^)]*)\)/g, (m) => m.replace(/[,;]/g, '·'));
      for (const p of t.split(/\s*[,;|•·]\s*|\s+\/\s+/)) {
        const s = p.replace(/·/g, ',').trim().replace(/[.]+$/, '');
        if (s) out.push(s);
      }
    }
    return out;
  }

  const ROTULO_HAB_RE = /\s+(?=(?:linguagens?(?: de programa[cç][aã]o)?|ferramentas?|soft skills?|hard skills?|idiomas?|tecnologias?|frameworks?|bancos? de dados|compet[eê]ncias(?: t[eé]cnicas| comportamentais)?|habilidades(?: t[eé]cnicas| comportamentais)?|conhecimentos?|metodologias?|bibliotecas?|languages?|tools?)\s*:)/i;

  function construirHabilidades(chunks, ctx) {
    const out = [], vistas = new Set();
    const add = (nome, categoria, nivel) => {
      const n = cortar(nome, LIM.habilidade, ctx);
      const k = `${norm(n)}|${categoria}`;
      if (!n || vistas.has(k) || out.length >= 80) return;
      vistas.add(k);
      out.push({ nome: n, categoria, nivel });
    };

    const idioma = (texto, nivelPadrao = null) => {
      const m = texto.match(/^([A-Za-zÀ-ÿ]+(?: [A-Za-zÀ-ÿ]+)?)\s*(?:[-–—:(]\s*(.*?)\)?)?$/);
      const conhecido = texto.match(IDIOMAS_CONHECIDOS);
      const nome = (conhecido ? conhecido[0] : (m ? m[1] : texto)).trim();
      if (!nome || nome.length > 30) return;
      const nivel = nivelIdiomaTexto(texto);
      if (!conhecido && !nivel) return;      // linha solta do cabeçalho (PDF do LinkedIn), não um idioma
      add(nome, 'Idioma', nivel || nivelPadrao);
    };

    for (const c of chunks) {
      if (c.sec === 'idiomas') {
        itensDeLista(c.lines).forEach(it => idioma(it));
        continue;
      }
      for (const l of c.lines.flatMap(x => (x.t ? x.t.split(ROTULO_HAB_RE).map(t => ({ t, b: x.b })) : []))) {
        if (!l.t || TEM_URL_RE.test(l.t) || EMAIL_RE.test(l.t)) continue;     // contatos soltos no fim da seção
        let categoria = c.cat, texto = l.t;
        const rot = texto.match(/^([^:]{2,40}):\s*(\S.*)$/);
        if (rot) {
          const n = norm(rot[1]);
          if (/idioma|language|lingua/.test(n)) { itensDeLista([{ t: rot[2] }]).forEach(it => idioma(it)); continue; }
          if (/ferrament|tools|software/.test(n)) categoria = 'Ferramenta';
          else if (/soft|comportament|interpessoa/.test(n)) categoria = 'Soft Skill';
          else if (/linguage|tecnolog|framework|banco|database|backend|frontend|front end|back end|bibliotec|metodolog|cloud|devops|conhecimento|tecnic/.test(n)) categoria = 'Técnica';
          else categoria = c.cat;
          texto = rot[2];
        }
        for (const item of itensDeLista([{ t: texto }])) {
          const nivelPar = item.match(/^(.*?)\s*\(([^)]*)\)\s*$/);       // "Java (Avançado)": o nível vira o padrão do app, não nome
          const nome = nivelPar ? nivelPar[1].trim() : item;
          const palavras = nome.split(/\s+/).length;
          if (palavras > 6 || nome.length > LIM.habilidade) continue;     // frase descritiva, não habilidade
          add(nome, categoria || categoriaHabilidade(nome), null);
        }
      }
    }
    return out;
  }

  function construirProjetos(linhas, ctx) {
    const projetos = [];
    let atual = null, anterior = null;
    const fechar = () => { if (atual) projetos.push(atual); atual = null; };
    const soUrl = t => /^(?:https?:\/\/|www\.)\S+$/i.test(t) || /^(?:github\.com|gitlab\.com)\/\S+$/i.test(t);

    for (const l of linhas) {
      if (!l.t) { anterior = 'branco'; continue; }
      const titulo = !l.b && !soUrl(l.t) && l.t.length <= 100 && !/[.;]$/.test(l.t) &&
        (!atual || anterior === 'branco' || anterior === 'lista' || anterior === 'url');
      if (titulo) { fechar(); atual = { cab: l.t, corpo: [] }; anterior = 'titulo'; continue; }
      if (!atual) { atual = { cab: '', corpo: [] }; }
      atual.corpo.push(l);
      anterior = l.b ? 'lista' : (soUrl(l.t) ? 'url' : 'texto');
    }
    fechar();

    if (!projetos.some(p => p.cab) && linhas.some(l => l.b)) {          // "• Nome: descrição" — um projeto por item
      return linhas.filter(l => l.b && l.t).map(l => {
        const m = l.t.match(/^(.{2,100}?)\s*(?::|\s[–—-]\s)\s*(.+)$/);
        const urls = extrairUrls(l.t).map(urlSegura).filter(Boolean);
        return {
          titulo: cortar(m ? m[1] : l.t, LIM.projeto, ctx),
          descricao: cortar(m ? m[2] : '', LIM.descricao, ctx),
          link_github: urls[0] || '', status: 'CONCLUIDO'
        };
      });
    }

    for (const p of projetos) {
      if (!p.cab) continue;
      const r = acharIntervalo(p.cab);
      let cab = r ? limparBordas(removerTrecho(p.cab, r.indice, r.tamanho)) : p.cab;
      cab = cab.replace(/\(\s*(?:19|20)\d{2}\s*\)\s*$/, '').trim();
      const partes = cab.split(/\s+\|\s+|\s+[–—]\s+/);
      const titulo = limparBordas(partes[0]);
      const tecnologias = partes.slice(1).join(', ');
      if (!titulo) continue;

      const urls = extrairUrls([cab, ...p.corpo.map(l => l.t)].join('\n'));
      const link = urls.map(urlSegura).find(Boolean) || '';
      const corpo = p.corpo.filter(l => !soUrl(l.t));
      const desc = [tecnologias ? `Tecnologias: ${tecnologias}` : '', corpoParaTexto(corpo)].filter(Boolean).join('\n');
      p.out = {
        titulo: cortar(titulo, LIM.projeto, ctx),
        descricao: cortar(desc, LIM.descricao, ctx),
        link_github: link,
        status: r && r.atual ? 'EM_ANDAMENTO' : 'CONCLUIDO'
      };
    }
    return projetos.filter(p => p.out).map(p => p.out);
  }

  const EMISSORES_LISTA = '(udemy|coursera|alura|dio|digital innovation one|rocketseat|edx|microsoft|google|aws|amazon|oracle|cisco|ibm|bradesco|fgv|senai|senac|unicap|cambridge|linkedin learning|hotmart|curso em video|fiap|cesar|sebrae|enap|fundacao|iniciativa|harvard|stanford|mit|red hat|scrum\.?org|pmi|comptia|lpi|alison|domestika|treinaweb|origamid|devmedia|b7web|gran cursos|estrategia|descomplica)';
  const EMISSOR_EXATO = new RegExp(`^${EMISSORES_LISTA}(?:\\s+(?:brasil|learning|academy|university|training))?$`);

  function construirCertificacoes(linhas, ctx) {
    const grupos = [];
    const blocos = agruparPorBlocos(linhas);
    const modoBloco = blocos.length > 1 && blocos.every(b => !b.cab.length || (b.cab.length + b.corpo.length) <= 3) &&
      blocos.some(b => b.cab.length + b.corpo.length >= 2) && !linhas.some(l => l.b);
    if (modoBloco) blocos.forEach(b => grupos.push([...b.cab, ...b.corpo.map(l => l.t)].join(' | ')));
    else linhas.filter(l => l.t).forEach(l => grupos.push(l.t));

    const out = [];
    for (let texto of grupos) {
      const urls = extrairUrls(texto);
      for (const u of urls) texto = texto.replace(u, ' ');
      const r = acharIntervalo(texto);
      let data = null;
      if (r) { data = r.ini; texto = removerTrecho(texto, r.indice, r.tamanho); }
      else {
        const d = new RegExp(`(?:\\b(?:conclu[ií]d[oa]|emiss[aã]o|emitido|issued)\\s*(?:em|em:|:)?\\s*)?(${DATA_S})`, 'i').exec(texto);
        if (d) { data = parseData(d[1]); texto = removerTrecho(texto, d.index, d[0].length); }
      }
      texto = limparBordas(texto.replace(/\(\s*\)/g, ''));
      const partes = dividirPartes(texto);
      if (!partes.length) continue;
      let nome = partes[0], emissor = '';
      const idxEmissor = partes.findIndex(p => EMISSOR_EXATO.test(norm(p)));
      if (idxEmissor === 0 && partes.length > 1) { emissor = partes[0]; nome = partes[1]; }
      else emissor = partes.slice(1).join(' - ');
      if (!emissor) {
        const par = nome.match(/^(.*?)\s*\(([^)\d][^)]*)\)\s*$/);     // "Java Completo (Udemy)"
        if (par && par[2].length <= LIM.emissor && !/^\d+\s*h/i.test(par[2])) { nome = par[1].trim(); emissor = par[2].trim(); }
      }
      out.push({
        nome: cortar(nome, LIM.certificado, ctx),
        instituicao: cortar(emissor, LIM.emissor, ctx),
        data_emissao: data ? isoData(data, false) : null,
        data_validade: null,
        link_certificado: urls.map(urlSegura).find(Boolean) || ''
      });
    }
    return out.filter(c => c.nome);
  }

  // ==================================================================
  // 6. CONVERSÃO COMPLETA: texto -> modelo do TalentoUNICAP
  // ==================================================================

  function converter(texto, links, config, agora = new Date()) {
    const ctx = { truncados: 0 };
    const avisos = [];
    const linhas = prepararLinhas(texto);
    const chunks = dividirSecoes(linhas);
    const secao = sec => chunks.filter(c => c.sec === sec);
    const linhasDe = sec => secao(sec).flatMap(c => c.lines);

    const out = {
      perfil: {}, experiencias: [], formacoes: [], habilidades: [], projetos: [], certificacoes: [],
      avisos, lidos: Array.from(new Set(chunks.filter(c => c.sec !== 'cabecalho' && c.sec !== 'ignorar').map(c => c.sec))),
      truncados: 0
    };

    // ---------- Perfil: cabeçalho + contato ----------
    const cab = [...secao('cabecalho'), ...secao('contato')].flatMap(c => c.lines).filter(l => l.t).slice(0, 20);
    const cabTextos = cab.map(l => l.t);
    out.perfil.telefone = acharTelefone(cabTextos);

    const nomeLinha = cabTextos.find(t => !EMAIL_RE.test(t) && !/\d/.test(t) && !/https?:|www\./i.test(t) && /^[A-Za-zÀ-ÿ.'’ -]{4,60}$/.test(t) && t.split(/\s+/).length >= 2 && t.split(/\s+/).length <= 6);
    if (nomeLinha) out.perfil.nome = limpar(nomeLinha);

    for (const t of cabTextos) {
      for (const seg of t.split(/\s*[|•·●]\s*/)) {
        if (!seg || EMAIL_RE.test(seg) || /https?:|www\./i.test(seg) || (seg.replace(/\D/g, '').length >= 8)) continue;
        if (out.perfil.estado) break;
        const loc = acharLocal(seg);
        if (!loc) continue;
        out.perfil.estado = loc.estado;
        out.perfil.cidade = cortar(limparCidadeSimples(loc.cidade), LIM.cidade, ctx);
        if (loc.resto && ENDERECO_RE.test(loc.resto)) out.perfil.endereco = cortar(loc.resto, LIM.endereco, ctx);
      }
      if (out.perfil.estado) break;
    }
    if (!out.perfil.endereco) {
      const end = cabTextos.flatMap(t => t.split(/\s*[|•·●]\s*/)).find(s => ENDERECO_RE.test(s) && !EMAIL_RE.test(s));
      if (end) {
        const loc = acharLocal(end);
        out.perfil.endereco = cortar(loc && ENDERECO_RE.test(loc.resto) ? loc.resto : end, LIM.endereco, ctx);
      }
    }

    if (!out.perfil.estado) {
      const solta = chunks.filter(c => ['habilidades', 'idiomas', 'resumo', 'cabecalho', 'contato'].includes(c.sec))
        .flatMap(c => c.lines).filter(l => l.t && !l.b && l.t.length <= 60);
      for (const l of solta) {
        const loc = acharLocal(l.t);
        if (loc) { out.perfil.estado = loc.estado; out.perfil.cidade = cortar(limparCidadeSimples(loc.cidade), LIM.cidade, ctx); break; }
      }
    }

    // Redes: texto + links clicáveis do arquivo
    const todasUrls = Array.from(new Set([...extrairUrls(texto), ...(links || []).map(String)]));
    const li = todasUrls.find(u => /linkedin\.com\/in\//i.test(u));
    if (li) { const n = normalizarLinkedin(li); if (n) out.perfil.linkedin = n; }
    const perfilGh = todasUrls.find(u => /^(https?:\/\/)?(www\.)?github\.com\/[^/?#]+\/?$/i.test(u.trim()));
    const repoGh = todasUrls.find(u => /github\.com\/[^/?#]+\/[^/?#]+/i.test(u));
    const gh = perfilGh || repoGh;
    if (gh) { const href = urlSegura(gh); if (href) out.perfil.github = semProtocolo(href).split('/').slice(0, 2).join('/'); }
    const portfolio = extrairUrls(cabTextos.join('\n')).find(u => { const h = hostDe(u); return h && !REDES.test(h); });
    if (portfolio) { const href = urlSegura(portfolio); if (href && href.length <= 100) out.perfil.portfolio = href; }

    // ---------- Sobre ----------
    const resumo = linhasDe('resumo').filter(l => l.t).map(l => l.t).join(' ');
    if (resumo) out.perfil.sobre = cortar(resumo, LIM.sobre, ctx);

    // ---------- Experiências ----------
    const linhasExp = linhasDe('experiencias');
    if (linhasExp.some(l => l.t)) {
      const entradas = agruparPorData(linhasExp) || agruparPorBlocos(linhasExp);
      if (!entradas.some(e => e.r)) avisos.push('Não encontrei datas nas experiências. Preencha o período de cada uma na revisão.');
      for (const e of entradas) { if (e.cab.length) out.experiencias.push(construirExperiencia(e, ctx)); }
    }

    // ---------- Formação ----------
    const linhasFor = linhasDe('formacoes');
    if (linhasFor.some(l => l.t)) {
      const entradas = agruparPorData(linhasFor, { dataUnica: true }) || agruparPorBlocos(linhasFor, { porLinha: true });
      for (const e of entradas) {
        const f = e.cab.length ? construirFormacao(e, config, agora, ctx, avisos) : null;
        if (f) out.formacoes.push(f);
      }
      derivarCursoPeriodo(out.formacoes, out.perfil, agora);
    }

    // ---------- Habilidades + idiomas ----------
    out.habilidades = construirHabilidades([...secao('habilidades'), ...secao('idiomas')], ctx);

    // ---------- Projetos / Certificações ----------
    const linhasProj = linhasDe('projetos');
    if (linhasProj.some(l => l.t)) out.projetos = construirProjetos(linhasProj, ctx);
    const linhasCert = linhasDe('certificacoes');
    if (linhasCert.some(l => l.t)) out.certificacoes = construirCertificacoes(linhasCert, ctx);

    const ignoradas = Array.from(new Set(secao('ignorar').map(c => c.titulo))).filter(Boolean);
    if (ignoradas.length) avisos.push(`Seções que o TalentoUNICAP não tem e não foram importadas: ${ignoradas.join(', ')}.`);

    out.truncados = ctx.truncados;
    return out;
  }

  const limparCidadeSimples = c => limpar(c).replace(/^(regi[aã]o metropolitana d[eao]s?)\s+/i, '').trim();

  // ==================================================================
  // 7. PLANO DE REVISÃO (com campos editáveis)
  // ==================================================================

  const mesAno = iso => (iso ? `${pad2(Number(iso.slice(5, 7)))}/${iso.slice(0, 4)}` : '');

  // "09/2023", "set 2023", "2023" -> 'YYYY-MM-01' | ''
  function dataDeTexto(txt, fim) {
    const d = parseData(txt);
    return d ? isoData(d, fim) : '';
  }

  const DEFINICAO_CAMPOS = {
    experiencias: [
      { campo: 'cargo', rotulo: 'Cargo', max: LIM.cargo, valor: d => d.cargo },
      { campo: 'empresa', rotulo: 'Empresa', max: LIM.empresa, valor: d => d.empresa },
      { campo: 'inicio', rotulo: 'Início (mm/aaaa)', max: 12, valor: d => mesAno(d.data_inicio) },
      { campo: 'fim', rotulo: 'Término (vazio = atual)', max: 12, valor: d => mesAno(d.data_fim) }
    ],
    formacoes: [
      { campo: 'curso', rotulo: 'Curso', max: LIM.curso, valor: d => d.curso },
      { campo: 'ano_inicio', rotulo: 'Ano de início', max: 4, valor: d => d.ano_inicio },
      { campo: 'ano_conclusao', rotulo: 'Ano de conclusão (vazio = em curso)', max: 4, valor: d => d.ano_conclusao }
    ],
    certificacoes: [
      { campo: 'emissao', rotulo: 'Emissão (mm/aaaa)', max: 12, valor: d => mesAno(d.data_emissao) }
    ]
  };

  // Recalcula título, detalhe e bloqueio de um item depois de criado/editado
  function revalidar(sec, item) {
    const d = item.dados;
    if (sec === 'experiencias') {
      d.atual = !d.data_fim;
      item.titulo = `${d.cargo || '(cargo?)'} — ${d.empresa || '(empresa?)'}`;
      item.detalhe = `${mesAno(d.data_inicio) || '?'} – ${d.atual ? 'atual' : mesAno(d.data_fim)}`;
      const falta = [!d.cargo && 'cargo', !d.empresa && 'empresa', !d.data_inicio && 'início'].filter(Boolean);
      item.bloqueio = falta.length ? `Preencha: ${falta.join(', ')}.`
        : (d.data_fim && d.data_fim < d.data_inicio ? 'O término não pode ser anterior ao início.' : null);
    } else if (sec === 'formacoes') {
      item.titulo = `${d.curso || '(curso não identificado)'} — ${d.instituicao}`;
      item.detalhe = `${d.ano_inicio || '?'} – ${d.ano_conclusao || 'em curso'}`;
      const falta = [!d.curso && 'curso', !d.ano_inicio && 'ano de início'].filter(Boolean);
      item.bloqueio = falta.length ? `Preencha: ${falta.join(', ')}.`
        : (d.ano_conclusao && Number(d.ano_conclusao) < Number(d.ano_inicio) ? 'A conclusão não pode ser anterior ao início.' : null);
    } else if (sec === 'certificacoes') {
      item.detalhe = [d.instituicao, d.data_emissao ? mesAno(d.data_emissao) : ''].filter(Boolean).join(' · ');
      item.bloqueio = d.data_emissao ? null : 'Informe a data de emissão (obrigatória no TalentoUNICAP).';
    }
    return item;
  }

  // Aplica a edição de um campo e devolve o item revalidado
  function editarCampo(sec, item, campo, valor) {
    const d = item.dados;
    const v = String(valor ?? '');
    const t = limpar(v);
    if (sec === 'experiencias') {
      if (campo === 'cargo') d.cargo = cortar(t, LIM.cargo);
      else if (campo === 'empresa') d.empresa = cortar(t, LIM.empresa);
      else if (campo === 'inicio') d.data_inicio = dataDeTexto(t, false);
      else if (campo === 'fim') d.data_fim = dataDeTexto(t, true);
    } else if (sec === 'formacoes') {
      if (campo === 'curso') d.curso = cortar(t, LIM.curso);
      else if (campo === 'ano_inicio') d.ano_inicio = /^(19|20)\d{2}$/.test(t) ? t : '';
      else if (campo === 'ano_conclusao') d.ano_conclusao = /^(19|20)\d{2}$/.test(t) ? t : '';
    } else if (sec === 'certificacoes') {
      if (campo === 'emissao') d.data_emissao = dataDeTexto(t, false) || null;
    }
    const antes = !!item.bloqueio;
    revalidar(sec, item);
    if (item.bloqueio || (sec === 'formacoes' && !d.nivel)) item.selecionado = false;
    else if (antes) item.selecionado = true;      // acabou de ficar válido: já vem marcado
    return item;
  }

  // existente/opcoes: iguais aos de LinkedInImport.montarPlano
  function montarPlano(conv, existente = {}, opcoes = {}) {
    const plano = LI.montarPlano(conv, existente, opcoes);
    plano.origem = 'curriculo';
    for (const sec of Object.keys(DEFINICAO_CAMPOS)) {
      for (const item of plano[sec]) {
        if (item.duplicado) continue;
        const antes = item.selecionado;
        revalidar(sec, item);
        item.editaveis = DEFINICAO_CAMPOS[sec].map(c => ({ campo: c.campo, rotulo: c.rotulo, max: c.max, valor: c.valor(item.dados) || '' }));
        item.selecionado = item.bloqueio ? false : antes;
      }
    }
    return plano;
  }

  const api = {
    lerArquivo, converter, montarPlano, editarCampo,
    // expostos para testes
    _internos: {
      docxParaTexto, itensParaLinhas, prepararLinhas, dividirSecoes, acharIntervalo, acharDataUnica,
      acharLocal, dividirPartes, atribuirCargoEmpresa, extrairUrls, revalidar, normalizarTexto
    }
  };

  root.CurriculoImport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
