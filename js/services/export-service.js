// ============================================
// Exportação PDF e DOCX
// ============================================
const LOGO_PATH = 'img/asabranca_Unicap.png';

function renderCVPreview(profile, showLogo = true) {
  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };
  const isTrue = (v) => v === true || v === 'true';

  let html = `<div class="cv-preview">`;
  // Header
  html += `<div class="cv-header">
    <div class="cv-header-top">
      ${showLogo ? `<img class="cv-logo" src="${LOGO_PATH}" alt="UNICAP">` : ''}
      <div class="cv-header-text">
        <h1>${profile.nome || 'Seu Nome'}</h1>
        <div class="course">${profile.curso || ''}</div>
      </div>
    </div>
    <div class="contacts">
      ${profile.telefone ? `<span><strong>Telefone:</strong> ${profile.telefone}</span>` : ''}
      ${profile.cidade ? `<span><strong>Localização:</strong> ${profile.cidade}${profile.estado ? ' - ' + profile.estado : ''}</span>` : ''}
      ${profile.linkedin ? `<span><strong>LinkedIn:</strong> ${profile.linkedin}</span>` : ''}
      ${profile.github ? `<span><strong>GitHub:</strong> ${profile.github}</span>` : ''}
      ${profile.portfolio ? `<span><strong>Portfólio:</strong> ${profile.portfolio}</span>` : ''}
    </div>
  </div>`;

  // Bio
  if (profile.bio) {
    html += `<div class="cv-section"><h2>SOBRE MIM</h2><p>${profile.bio}</p></div>`;
  }

  // Experiências
  if (profile.experiencias?.length) {
    html += `<div class="cv-section"><h2>EXPERIÊNCIA PROFISSIONAL</h2>`;
    profile.experiencias.forEach(e => {
      html += `<div class="item">
        <h3>${e.cargo} — ${e.empresa}</h3>
        <div class="date">${formatDate(e.data_inicio)} — ${isTrue(e.atual) ? 'Presente' : (e.data_fim ? formatDate(e.data_fim) : 'Presente')}${isTrue(e.atual) ? ' <span class="badge badge-green">Atual</span>' : ''}</div>
        ${e.descricao ? `<div class="desc">${e.descricao}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // Formação
  if (profile.formacao?.length) {
    html += `<div class="cv-section"><h2>FORMAÇÃO ACADÊMICA</h2>`;
    profile.formacao.forEach(e => {
      html += `<div class="item">
        <h3>${e.grau} em ${e.area_estudo}</h3>
        <div class="subtitle">${e.instituicao}</div>
        <div class="date">${formatDate(e.data_inicio)} — ${isTrue(e.atual) ? 'Em curso' : (e.data_fim ? formatDate(e.data_fim) : 'Presente')}${isTrue(e.atual) ? ' <span class="badge badge-green">Em curso</span>' : ''}</div>
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
        ${items.map(s => `<span class="skill-chip">${s.nome} <small>(${s.nivel})</small></span>`).join('')}
      </div></div>`;
    });
    html += `</div>`;
  }

  // Projetos
  if (profile.projetos?.length) {
    html += `<div class="cv-section"><h2>PROJETOS</h2>`;
    profile.projetos.forEach(p => {
      html += `<div class="item">
        <h3>${p.nome}${p.url ? ` <a href="${p.url}" target="_blank" style="font-size:12px">↗</a>` : ''}</h3>
        ${p.descricao ? `<div class="desc">${p.descricao}</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // Certificados
     if (profile.certificados?.length) {
    html += `<div class="cv-section"><h2>CERTIFICAÇÕES</h2>`;
    profile.certificados.forEach(c => {
      html += `<div class="item">
        <h3>${c.nome}${c.emissor ? ` — ${c.emissor}` : ''}${c.url ? ` <a href="${c.url}" target="_blank" style="font-size:12px">↗</a>` : ''}</h3>
        <div class="date">
          ${c.data_emissao ? formatDate(c.data_emissao) : ''}
          ${isTrue(c.sem_validade) ? ' <span class="badge badge-green">Sem validade</span>' : (c.data_validade ? ` — Válido até ${formatDate(c.data_validade)}` : '')}
        </div>
        ${c.carga_horaria ? `<div class="desc">${c.carga_horaria} horas</div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

async function exportPDF() {
  const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
  const { default: jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');

  const el = document.getElementById('cvContent');
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const w = pdf.internal.pageSize.getWidth();
  const h = (canvas.height * w) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, w, h);
  pdf.save(`curriculo_${profile?.nome?.replace(/\s+/g, '_') || 'aluno'}.pdf`);
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

    const BRAND = '6B001B'; // vinho UNICAP (--unicap-600)
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
    if (profile?.formacao?.length) {
      children.push(heading('FORMAÇÃO ACADÊMICA'));
      profile.formacao.forEach(e => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `${e.grau} em ${e.area_estudo}`, bold: true, size: 24 })],
          spacing: { before: 100 }
        }));
        if (e.instituicao) {
          children.push(new Paragraph({ children: [new TextRun({ text: e.instituicao, size: 22, color: BRAND })] }));
        }
        const emCurso = isTrue(e.atual);
        children.push(new Paragraph({
          children: [new TextRun({
            text: `${formatDate(e.data_inicio)} — ${emCurso ? 'Em curso' : (e.data_fim ? formatDate(e.data_fim) : 'Presente')}`,
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
          children: [new TextRun({ text: p.nome + (p.url ? `  (${p.url})` : ''), bold: true, size: 24 })],
          spacing: { before: 100 }
        }));
        if (p.descricao) {
          children.push(new Paragraph({ children: [new TextRun({ text: p.descricao, size: 22 })], spacing: { after: 100 } }));
        }
      });
    }

    // Certificados
    if (profile?.certificados?.length) {
      children.push(heading('CERTIFICAÇÕES'));
      profile.certificados.forEach(c => {
        children.push(new Paragraph({
          children: [new TextRun({ text: c.nome + (c.emissor ? ` — ${c.emissor}` : ''), bold: true, size: 24 })],
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
