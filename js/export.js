// ============================================
// Exportação PDF e DOCX
// ============================================
function renderCVPreview(profile) {
  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };
  const isTrue = (v) => v === true || v === 'true';

  let html = `<div class="cv-preview">`;
  // Header
  html += `<div class="cv-header">
    <h1>${profile.nome || 'Seu Nome'}</h1>
    <div class="course">${profile.curso || ''}</div>
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
        <h3>${c.nome}${c.emissor ? ` — ${c.emissor}` : ''}</h3>
        <div class="date">${c.data_emissao ? formatDate(c.data_emissao) : ''}</div>
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

async function exportDOCX() {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('https://cdn.jsdelivr.net/npm/docx@9.0.2/+esm');
  const { saveAs } = await import('https://cdn.jsdelivr.net/npm/file-saver@2.0.5/+esm');

  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '';
  const children = [];

  // Header
  children.push(new Paragraph({ children: [new TextRun({ text: profile?.nome || 'Seu Nome', bold: true, size: 48 })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }));
  if (profile?.curso) children.push(new Paragraph({ children: [new TextRun({ text: profile.curso, size: 28, color: '1E40AF' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));

  const contact = [profile?.telefone, profile?.cidade ? `${profile.cidade}${profile.estado ? ' - ' + profile.estado : ''}` : ''].filter(Boolean).join(' | ');
  if (contact) children.push(new Paragraph({ children: [new TextRun({ text: contact, size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }));

  // Bio
  if (profile?.bio) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'SOBRE MIM', bold: true, size: 28, color: '1E40AF' })], spacing: { before: 200, after: 100 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: profile.bio, size: 22 })], spacing: { after: 200 } }));
  }

  // Experiências
  if (profile?.experiencias?.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'EXPERIÊNCIA PROFISSIONAL', bold: true, size: 28, color: '1E40AF' })], spacing: { before: 200, after: 100 } }));
    profile.experiencias.forEach(e => {
      children.push(new Paragraph({ children: [new TextRun({ text: `${e.cargo} — ${e.empresa}`, bold: true, size: 24 })], spacing: { before: 100 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: `${formatDate(e.data_inicio)} — ${e.data_fim ? formatDate(e.data_fim) : 'Presente'}`, size: 20, color: '6B7280', italics: true })] }));
      if (e.descricao) children.push(new Paragraph({ children: [new TextRun({ text: e.descricao, size: 22 })], spacing: { after: 100 } }));
    });
  }

  // Habilidades
  if (profile?.habilidades?.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'HABILIDADES', bold: true, size: 28, color: '1E40AF' })], spacing: { before: 200, after: 100 } }));
    ['Técnica', 'Idioma', 'Soft Skill', 'Ferramenta'].forEach(cat => {
      const items = profile.habilidades.filter(h => h.categoria === cat);
      if (!items.length) return;
      children.push(new Paragraph({ children: [new TextRun({ text: `${cat}: ${items.map(s => s.nome).join(', ')}`, size: 22 })], spacing: { after: 50 } }));
    });
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `curriculo_${profile?.nome?.replace(/\s+/g, '_') || 'aluno'}.docx`);
}
