// ============================================
// Exportação PDF e DOCX
// ============================================
const LOGO_PATH = 'img/asabranca_Unicap.png';

// tagNome: "h1" quando o currículo é a página (perfil público); "h2" quando
// aparece dentro de outra tela que já tem o seu h1 (prévia, visão da empresa).
function renderCVPreview(profile, showLogo = true, tagNome = 'h1') {
  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };
  const isTrue = (v) => v === true || v === 'true';
  const esc = window.escapeHtml;
  const linkHtml = (url, rotulo) => {
    const href = window.safeUrl(url);
    return href ? ` <a href="${href}" target="_blank" rel="noopener" style="font-size:12px">${rotulo}</a>` : '';
  };

  let html = `<div class="cv-preview">`;
  // Header
  html += `<div class="cv-header">
    <div class="cv-header-top">
      ${showLogo ? `<img class="cv-logo" src="${LOGO_PATH}" alt="UNICAP">` : ''}
      <div class="cv-header-text">
        <${tagNome}>${esc(profile.nome || 'Seu Nome')}</${tagNome}>
        <div class="course">${esc(profile.curso)}</div>
      </div>
    </div>
    <div class="contacts">
      ${profile.telefone ? `<span><strong>Telefone:</strong> ${esc(profile.telefone)}</span>` : ''}
      ${profile.cidade ? `<span><strong>Localização:</strong> ${esc(profile.cidade)}${profile.estado ? ' - ' + esc(profile.estado) : ''}</span>` : ''}
      ${profile.linkedin ? `<span><strong>LinkedIn:</strong> ${esc(profile.linkedin)}</span>` : ''}
      ${profile.github ? `<span><strong>GitHub:</strong> ${esc(profile.github)}</span>` : ''}
      ${profile.portfolio ? `<span><strong>Portfólio:</strong> ${esc(profile.portfolio)}</span>` : ''}
    </div>
  </div>`;

  // Bio
  if (profile.bio) {
    html += `<div class="cv-section"><h2>SOBRE MIM</h2><p>${esc(profile.bio)}</p></div>`;
  }

  // Experiências
  if (profile.experiencias?.length) {
    html += `<div class="cv-section"><h2>EXPERIÊNCIA PROFISSIONAL</h2>`;
    profile.experiencias.forEach(e => {
      html += `<div class="item">
        <h3>${esc(e.cargo)} — ${esc(e.empresa)}</h3>
        <div class="date">${esc(formatDate(e.data_inicio))} — ${isTrue(e.atual) ? 'Presente' : (e.data_fim ? esc(formatDate(e.data_fim)) : 'Presente')}${isTrue(e.atual) ? ' <span class="badge badge-green">Atual</span>' : ''}</div>
        ${e.descricao ? `<div class="desc">${esc(e.descricao)}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // Formação
  if (profile.formacoes?.length) {
    html += `<div class="cv-section"><h2>FORMAÇÃO ACADÊMICA</h2>`;
    profile.formacoes.forEach(e => {
      html += `<div class="item">
        <h3>${esc(e.nivel)}${e.curso ? ` em ${esc(e.curso)}` : ''}</h3>
        <div class="subtitle">${esc(e.instituicao)}</div>
        <div class="date">${esc(e.ano_inicio)}${e.ano_inicio ? ' — ' : ''}${esc(e.ano_conclusao || 'Em curso')}${e.ano_conclusao ? '' : ' <span class="badge badge-green">Em curso</span>'}</div>
      </div>`;
    });
    html += `</div>`;
  }

  // Habilidades
  if (profile.habilidades?.length) {
    html += `<div class="cv-section"><h2>HABILIDADES</h2>`;
    const cats = ['Técnica', 'Idioma', 'Soft Skill', 'Ferramenta'];
    cats.forEach(cat => {
      const items = profile.habilidades.filter(h => h.categoria === cat);
      if (!items.length) return;
      html += `<div class="skill-category"><h4>${cat}</h4><div class="skill-list">
        ${items.map(s => `<span class="skill-chip">${esc(s.nome)} <small>(${esc(s.nivel)})</small></span>`).join('')}
      </div></div>`;
    });
    html += `</div>`;
  }

  // Projetos
  if (profile.projetos?.length) {
    html += `<div class="cv-section"><h2>PROJETOS</h2>`;
    profile.projetos.forEach(p => {
      html += `<div class="item">
        <h3>${esc(p.titulo)}${linkHtml(p.link_github, 'GitHub ↗')}${linkHtml(p.link_demo, 'Demo ↗')}</h3>
        ${p.descricao ? `<div class="desc">${esc(p.descricao)}</div>` : ''}
        ${p.tecnologias ? `<div class="desc"><strong>Tecnologias:</strong> ${esc(p.tecnologias)}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // Certificados
  if (profile.certificacoes?.length) {
    html += `<div class="cv-section"><h2>CERTIFICAÇÕES</h2>`;
    profile.certificacoes.forEach(c => {
      html += `<div class="item">
        <h3>${esc(c.nome)}${c.instituicao ? ` — ${esc(c.instituicao)}` : ''}${linkHtml(c.link_certificado, '↗')}</h3>
        <div class="date">
          ${c.data_emissao ? esc(formatDate(c.data_emissao)) : ''}
          ${isTrue(c.sem_validade) ? ' <span class="badge badge-green">Sem validade</span>' : (c.data_validade ? ` — Válido até ${esc(formatDate(c.data_validade))}` : '')}
        </div>
        ${c.carga_horaria ? `<div class="desc">${esc(c.carga_horaria)} horas</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

async function exportPDF() {
  const btn = document.querySelector('button[onclick="exportPDF()"]');
  const originalBtnHtml = btn ? btn.innerHTML : null;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-bold ph-circle-notch" style="font-size:18px;"></i> Gerando...';
  }

  try {
    // html2canvas exporta como "default" — ok. jsPDF v2 exporta como
    // NOMEADO ({ jsPDF }), não como "default" (que aponta pro módulo
    // inteiro, não para a classe) — esse era o bug que quebrava o import.
    const html2canvasMod = await loadModuleWithFallback([
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm',
      'https://esm.sh/html2canvas@1.4.1',
      'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.esm.js'
    ]);
    const html2canvas = html2canvasMod.default || html2canvasMod.html2canvas || html2canvasMod;

    const jsPDFMod = await loadModuleWithFallback([
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm',
      'https://esm.sh/jspdf@2.5.1',
      'https://unpkg.com/jspdf@2.5.1/dist/jspdf.es.min.js'
    ]);
    const jsPDF = jsPDFMod.jsPDF || jsPDFMod.default?.jsPDF || jsPDFMod.default;

    const el = document.getElementById('cvContent');
    // Em celulares/tablets o currículo fica estreito na tela; para o PDF sair
    // sempre igual ao do desktop, fixamos a largura (A4 ≈ 794px) só durante a captura.
    el.classList.add('is-exporting');
    let canvas, cortesCss, alturaCss;
    try {
      // Medidos com a largura de exportação já aplicada, a mesma da captura.
      cortesCss = coletarPontosDeCorte(el);
      alturaCss = el.getBoundingClientRect().height;
      canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, windowWidth: 1024 });
    } finally {
      el.classList.remove('is-exporting');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const larguraMm = pdf.internal.pageSize.getWidth();
    const alturaMm = pdf.internal.pageSize.getHeight();
    const mmPorPx = larguraMm / canvas.width;
    const pxPorMm = 1 / mmPorPx;
    const escala = canvas.height / alturaCss;

    // A 1ª página começa no topo (cabeçalho encostado na borda); as demais
    // ganham margem em cima. Todas deixam margem embaixo.
    const paginas = calcularPaginasPDF(
      canvas.height,
      (alturaMm - PDF_MARGEM_INFERIOR_MM) * pxPorMm,
      (alturaMm - PDF_MARGEM_SUPERIOR_MM - PDF_MARGEM_INFERIOR_MM) * pxPorMm,
      cortesCss.map(y => y * escala)
    );

    paginas.forEach(([inicio, fim], i) => {
      const fatia = document.createElement('canvas');
      fatia.width = canvas.width;
      fatia.height = fim - inicio;
      const ctx = fatia.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, fatia.width, fatia.height);
      ctx.drawImage(canvas, 0, inicio, canvas.width, fatia.height, 0, 0, canvas.width, fatia.height);

      if (i > 0) pdf.addPage();
      const topoMm = i > 0 ? PDF_MARGEM_SUPERIOR_MM : 0;
      pdf.addImage(fatia.toDataURL('image/png'), 'PNG', 0, topoMm, larguraMm, fatia.height * mmPorPx);
    });

    pdf.save(`curriculo_${profile?.nome?.replace(/\s+/g, '_') || 'aluno'}.pdf`);
  } catch (err) {
    console.error('Erro ao exportar PDF:', err);
    const detail = err?.message ? `\n\nDetalhe técnico: ${err.message}` : '';
    alert(`Não foi possível gerar o arquivo PDF. Verifique sua conexão com a internet e tente novamente.${detail}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  }
}

// ---------- Paginação do PDF ----------
const PDF_MARGEM_SUPERIOR_MM = 12;
const PDF_MARGEM_INFERIOR_MM = 10;

// Posições (px, a partir do topo de `el`) onde é seguro trocar de página:
// início de cada seção, de cada item e de cada grupo de habilidades.
// O primeiro item logo após o título da seção fica de fora, para o título
// nunca ficar sozinho no fim de uma página.
function coletarPontosDeCorte(el) {
  const topo = el.getBoundingClientRect().top;
  const pontos = [];
  el.querySelectorAll('.cv-section, .cv-section .item, .cv-section .skill-category').forEach(n => {
    if (n.previousElementSibling?.tagName === 'H2') return;
    pontos.push(n.getBoundingClientRect().top - topo);
  });
  return pontos;
}

// Divide uma imagem de `alturaTotal` px em páginas: [[inicio, fim], ...].
// Cada página termina no último ponto de corte que cabe nela; se nenhum
// ponto cabe na metade de baixo da página (um item maior que meia página),
// corta no limite da página para não desperdiçar espaço.
function calcularPaginasPDF(alturaTotal, alturaPrimeira, alturaDemais, cortes) {
  const paginas = [];
  let inicio = 0;
  while (alturaTotal - inicio > 1) {
    const disponivel = paginas.length ? alturaDemais : alturaPrimeira;
    const limite = inicio + disponivel;
    if (limite >= alturaTotal) {
      paginas.push([inicio, alturaTotal]);
      break;
    }
    const minimo = inicio + disponivel * 0.5;
    const cabem = cortes.filter(c => c > minimo && c <= limite);
    const fim = Math.floor(cabem.length ? Math.max(...cabem) : limite);
    paginas.push([inicio, fim]);
    inicio = fim;
  }
  return paginas;
}

// Carrega um módulo ESM tentando algumas fontes diferentes, já que CDNs
// podem falhar de forma intermitente ou ter problemas com o "+esm" de
// pacotes grandes/bundlados.
async function loadModuleWithFallback(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      return await import(/* @vite-ignore */ url);
    } catch (err) {
      console.warn(`Falha ao carregar módulo de ${url}:`, err);
      lastError = err;
    }
  }
  throw lastError || new Error('Não foi possível carregar o módulo.');
}

async function exportDOCX(includeLogo = true) {
  const btn = document.getElementById('btnExportDocx');
  const originalBtnHtml = btn ? btn.innerHTML : null;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-bold ph-circle-notch" style="font-size:18px;"></i> Gerando...';
  }

  try {
    const docxMod = await loadModuleWithFallback([
      'https://cdn.jsdelivr.net/npm/docx@9.0.2/+esm',
      'https://cdn.jsdelivr.net/npm/docx@9.0.2/build/index.mjs',
      'https://esm.sh/docx@9.0.2',
      'https://unpkg.com/docx@9.0.2/build/index.mjs'
    ]);
    const {
      Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun,
      Table, TableRow, TableCell, WidthType, VerticalAlign, BorderStyle
    } = docxMod;

    const fileSaverMod = await loadModuleWithFallback([
      'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/+esm',
      'https://esm.sh/file-saver@2.0.5',
      'https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js'
    ]);
    const saveAs = fileSaverMod.saveAs || fileSaverMod.default?.saveAs || fileSaverMod.default;

    const BRAND = '7A001E'; // bordô UNICAP (--unicap-600)
    const MUTED = '71717A'; // --gray-500

    const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '';
    const isTrue = (v) => v === true || v === 'true';
    const heading = (text) => new Paragraph({
      children: [new TextRun({ text, bold: true, size: 26, color: BRAND })],
      spacing: { before: 260, after: 120 },
      border: { bottom: { color: BRAND, space: 4, style: 'single', size: 6 } }
    });

    const children = [];

    // Header: logo pequena ao lado do nome (tabela sem bordas), ou apenas
    // o nome centralizado caso a logo esteja desativada.
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    let logoBuffer = null;
    if (includeLogo) {
      try {
        const res = await fetch(LOGO_PATH);
        if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar a logo`);
        logoBuffer = await res.arrayBuffer();
      } catch (err) {
        console.warn('Não foi possível incluir a logo no DOCX:', err);
      }
    }

    const nameParagraph = new Paragraph({
      children: [new TextRun({ text: profile?.nome || 'Seu Nome', bold: true, size: 44 })],
      spacing: { after: 40 }
    });
    const courseParagraph = profile?.curso
      ? new Paragraph({ children: [new TextRun({ text: profile.curso, size: 24, color: BRAND })] })
      : null;

    if (logoBuffer) {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 12, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new ImageRun({ data: logoBuffer, type: 'png', transformation: { width: 40, height: 40 } })]
                })]
              }),
              new TableCell({
                width: { size: 88, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: courseParagraph ? [nameParagraph, courseParagraph] : [nameParagraph]
              })
            ]
          })
        ]
      }));
      children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: profile?.nome || 'Seu Nome', bold: true, size: 48 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 }
      }));
      if (profile?.curso) {
        children.push(new Paragraph({
          children: [new TextRun({ text: profile.curso, size: 26, color: BRAND })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 }
        }));
      }
    }

    const contactParts = [
      profile?.telefone,
      profile?.cidade ? `${profile.cidade}${profile.estado ? ' - ' + profile.estado : ''}` : '',
      profile?.linkedin,
      profile?.github,
      profile?.portfolio
    ].filter(Boolean);
    if (contactParts.length) {
      children.push(new Paragraph({
        children: [new TextRun({ text: contactParts.join('  |  '), size: 20, color: MUTED })],
        alignment: logoBuffer ? AlignmentType.LEFT : AlignmentType.CENTER,
        spacing: { after: 200 }
      }));
    }

    // Bio
    if (profile?.bio) {
      children.push(heading('SOBRE MIM'));
      children.push(new Paragraph({ children: [new TextRun({ text: profile.bio, size: 22 })], spacing: { after: 160 } }));
    }

    // Experiências
    if (profile?.experiencias?.length) {
      children.push(heading('EXPERIÊNCIA PROFISSIONAL'));
      profile.experiencias.forEach(e => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `${e.cargo} — ${e.empresa}`, bold: true, size: 24 })],
          spacing: { before: 100 }
        }));
        const atual = isTrue(e.atual);
        children.push(new Paragraph({
          children: [new TextRun({
            text: `${formatDate(e.data_inicio)} — ${atual ? 'Presente' : (e.data_fim ? formatDate(e.data_fim) : 'Presente')}`,
            size: 20, color: MUTED, italics: true
          })]
        }));
        if (e.descricao) {
          children.push(new Paragraph({ children: [new TextRun({ text: e.descricao, size: 22 })], spacing: { after: 100 } }));
        }
      });
    }

    // Formação
    if (profile?.formacoes?.length) {
      children.push(heading('FORMAÇÃO ACADÊMICA'));
      profile.formacoes.forEach(e => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `${e.nivel || ''}${e.curso ? ` em ${e.curso}` : ''}`, bold: true, size: 24 })],
          spacing: { before: 100 }
        }));
        if (e.instituicao) {
          children.push(new Paragraph({ children: [new TextRun({ text: e.instituicao, size: 22, color: BRAND })] }));
        }
        children.push(new Paragraph({
          children: [new TextRun({
            text: `${e.ano_inicio || ''}${e.ano_inicio ? ' — ' : ''}${e.ano_conclusao || 'Em curso'}`,
            size: 20, color: MUTED, italics: true
          })],
          spacing: { after: 100 }
        }));
      });
    }

    // Habilidades
    if (profile?.habilidades?.length) {
      children.push(heading('HABILIDADES'));
      ['Técnica', 'Idioma', 'Soft Skill', 'Ferramenta'].forEach(cat => {
        const items = profile.habilidades.filter(h => h.categoria === cat);
        if (!items.length) return;
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${cat}: `, bold: true, size: 22 }),
            new TextRun({ text: items.map(s => `${s.nome} (${s.nivel})`).join(', '), size: 22 })
          ],
          spacing: { after: 80 }
        }));
      });
    }

    // Projetos
    if (profile?.projetos?.length) {
      children.push(heading('PROJETOS'));
      profile.projetos.forEach(p => {
        children.push(new Paragraph({
          children: [new TextRun({ text: (p.titulo || '') + (p.link_github ? `  (${p.link_github})` : '') + (p.link_demo ? `  (${p.link_demo})` : ''), bold: true, size: 24 })],
          spacing: { before: 100 }
        }));
        if (p.descricao) {
          children.push(new Paragraph({ children: [new TextRun({ text: p.descricao, size: 22 })], spacing: { after: 100 } }));
        }
      });
    }

    // Certificados
    if (profile?.certificacoes?.length) {
      children.push(heading('CERTIFICAÇÕES'));
      profile.certificacoes.forEach(c => {
        children.push(new Paragraph({
          children: [new TextRun({ text: c.nome + (c.instituicao ? ` — ${c.instituicao}` : ''), bold: true, size: 24 })],
          spacing: { before: 100 }
        }));
        const semValidade = isTrue(c.sem_validade);
        const dateLine = [
          c.data_emissao ? formatDate(c.data_emissao) : '',
          semValidade ? 'Sem validade' : (c.data_validade ? `Válido até ${formatDate(c.data_validade)}` : '')
        ].filter(Boolean).join(' — ');
        if (dateLine) {
          children.push(new Paragraph({ children: [new TextRun({ text: dateLine, size: 20, color: MUTED, italics: true })] }));
        }
        if (c.carga_horaria) {
          children.push(new Paragraph({ children: [new TextRun({ text: `${c.carga_horaria} horas`, size: 22 })], spacing: { after: 100 } }));
        }
      });
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `curriculo_${(profile?.nome || 'aluno').trim().replace(/\s+/g, '_')}.docx`);
  } catch (err) {
    console.error('Erro ao exportar DOCX:', err);
    const detail = err?.message ? `\n\nDetalhe técnico: ${err.message}` : '';
    alert(`Não foi possível gerar o arquivo DOCX. Verifique sua conexão com a internet e tente novamente.${detail}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  }
}
