(function () {
  "use strict";

  // ---------- 1. Recuperar dados da vaga ----------
  function getVagaData() {
    // Prioridade 1: querystring (?vaga=base64json)
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("vaga");
    if (encoded) {
      try {
        return JSON.parse(decodeURIComponent(escape(atob(encoded))));
      } catch (err) {
        console.warn("Não foi possível decodificar os dados da URL.", err);
      }
    }

    // Prioridade 2: procura no localStorage qualquer item que pareça uma vaga
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const raw = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(raw);
          const candidate = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
          if (candidate && typeof candidate === "object") {
            const flatTest = JSON.stringify(candidate).toLowerCase();
            if (flatTest.includes("titulo") || flatTest.includes("title")) {
              console.log("Vaga encontrada na chave:", key);
              return candidate;
            }
          }
        } catch (_) {
          /* valor não é JSON, ignora */
        }
      }
    } catch (err) {
      console.warn("Não foi possível ler o localStorage.", err);
    }

    return {};
  }

  const vagaRaw = getVagaData();
  console.log("DADOS DA VAGA:", vagaRaw);

  // Achata objetos aninhados: {a:{b:1}} vira {b:1}
  function flatten(obj, out = {}) {
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, out);
      else out[k] = v;
    });
    return out;
  }
  const flat = flatten(vagaRaw);

  // Campos terminados em "id" (id, empresa_id, empresaId...) nunca são texto para exibir
  const isIdKey = (k) => /(^|_)id$/i.test(k) || /[a-z]Id$/.test(k);

  // Procura o primeiro campo cujo nome contenha algum dos trechos (respeitando a ordem)
  const pick = (...parts) => {
    for (const p of parts) {
      for (const [k, v] of Object.entries(flat)) {
        if (isIdKey(k)) continue;
        if (!k.toLowerCase().includes(p)) continue;
        if (v === null || v === undefined || v === "") continue;
        if (Array.isArray(v)) {
          if (v.length) return v.join("\n");
          continue;
        }
        return String(v);
      }
    }
    return "";
  };

  const vaga = {
    titulo:      pick("titulo", "title", "cargo"),
    empresa:     pick("empresa_nome", "empresanome", "nome_empresa", "nomeempresa", "empresa", "company", "depart", "setor"),
    carga:       pick("carga_horaria", "cargahoraria", "carga", "horas"),
    remuneracao: pick("remunera", "bolsa", "salario", "valor"),
    local:       pick("local", "modalidade", "cidade"),
    periodoFim:  pick("periodofim", "periodo_fim", "datafim", "data_fim", "prazo", "limite", "encerr"),
    contato:     pick("contato", "link", "email"),
    requisitos:  pick("requisito", "habilidade"),
    descricao:   pick("descri"),
    area:        pick("area", "curso", "categoria")
  };

  // ---------- 2. Helpers ----------
  function formatDateBR(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = String(isoDate).slice(0, 10).split("-");
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
  }

  function tipoVagaFromTitulo(titulo) {
    const t = (titulo || "").toLowerCase();
    if (t.includes("trainee")) return "TRAINEE";
    if (t.includes("emprego") || t.includes("efetiv") || t.includes("clt")) return "EMPREGO";
    return "ESTÁGIO";
  }

  const prazoFim = formatDateBR(vaga.periodoFim);
  const tipoVaga = tipoVagaFromTitulo(vaga.titulo);
  const linkCandidatura = vaga.contato || "vagas.unicap.br";

  // Linhas de meta (só as que têm dado)
  const metaItems = [
    vaga.carga ? "⏱ " + vaga.carga : "",
    vaga.remuneracao ? "$ " + vaga.remuneracao : "",
    vaga.local ? "📍 " + vaga.local : ""
  ].filter(Boolean);

  // ---------- 3. Preencher o card visual ----------
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  setText("postTitulo", vaga.titulo || "");
  setText("postEmpresa", vaga.empresa || "");
  setText("postTipoPill", tipoVaga);
  setText("postCarga", vaga.carga ? "⏱ " + vaga.carga : "");
  setText("postSalario", vaga.remuneracao ? "$ " + vaga.remuneracao : "");
  setText("postLocal", vaga.local ? "📍 " + vaga.local : "");
  setText("postPrazo", prazoFim ? `Seleção até ${prazoFim}` : "");
  setText("postCtaLabel", `CANDIDATE-SE! ${linkCandidatura.toUpperCase()}`);

  // ---------- 4. Montar legenda ----------
  function bulletList(text) {
    if (!text) return "";
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith("•") ? l : `✅ ${l.replace(/^•\s*/, "")}`))
      .join("\n");
  }

  function buildHashtags() {
    const base = ["#VagasUNICAP", "#UniversidadeCatolica"];
    const tipoTag = "#" + tipoVaga.charAt(0) + tipoVaga.slice(1).toLowerCase();
    const areaWords = (vaga.area || "").split(/[\s/]+/).filter((w) => w.length > 2).slice(0, 2);
    const areaTags = areaWords.map((w) => "#" + w.replace(/[^\p{L}0-9]/gu, ""));
    const localTag = (vaga.local || "").includes("Recife") ? "#Recife" : null;
    const tags = [...base, tipoTag, ...areaTags, "#Oportunidade"];
    if (localTag) tags.push(localTag);
    return [...new Set(tags)].slice(0, 8);
  }

  function buildLegenda() {
    const hashtags = buildHashtags();
    const linhas = [
      "🔶 OPORTUNIDADE DE " + tipoVaga + " NA UNICAP!",
      "",
      `Estamos selecionando estudantes para a vaga de ${vaga.titulo || "—"}. ${vaga.descricao ? vaga.descricao : "Se você deseja atuar com tecnologias modernas e fazer a diferença em projetos reais, seu lugar é aqui!"}`,
      ""
    ];

    const detalhes = [];
    if (vaga.empresa) detalhes.push(`🏢 Empresa: ${vaga.empresa}`);
    if (vaga.carga) detalhes.push(`⏱ Carga Horária: ${vaga.carga}`);
    if (vaga.remuneracao) detalhes.push(`💰 Bolsa: ${vaga.remuneracao}`);
    if (vaga.local) detalhes.push(`📍 Local: ${vaga.local}`);
    if (detalhes.length) linhas.push(...detalhes, "");

    if (vaga.requisitos) {
      linhas.push("Requisitos principais:", bulletList(vaga.requisitos), "");
    }

    if (prazoFim) linhas.push(`⏳ Inscrições abertas até ${prazoFim}.`, "");

    linhas.push(
      `🔗 Candidate-se enviando seu currículo pelo portal Talentos UNICAP: ${linkCandidatura}`,
      "",
      hashtags.join(" ")
    );
    return linhas.join("\n");
  }

  const legendaTexto = document.getElementById("legendaTexto");
  legendaTexto.value = buildLegenda();

  // ---------- 5. Copiar para a área de transferência ----------
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const tmp = document.createElement("textarea");
        tmp.value = text;
        tmp.style.position = "fixed";
        tmp.style.opacity = "0";
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Hashtags sugeridas (chips clicáveis)
  const hashtagListEl = document.getElementById("hashtagList");
  buildHashtags().forEach((tag) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "hashtag-chip";
    chip.textContent = tag;
    chip.addEventListener("click", () => {
      copyToClipboard(tag).then(() => {
        const original = chip.textContent;
        chip.classList.add("is-copied");
        chip.textContent = "Copiado!";
        setTimeout(() => {
          chip.classList.remove("is-copied");
          chip.textContent = original;
        }, 1200);
      });
    });
    hashtagListEl.appendChild(chip);
  });

  const btnCopiarLegenda = document.getElementById("btnCopiarLegenda");
  btnCopiarLegenda.addEventListener("click", () => {
    copyToClipboard(legendaTexto.value).then(() => {
      const original = btnCopiarLegenda.innerHTML;
      btnCopiarLegenda.classList.add("is-success");
      btnCopiarLegenda.textContent = "Legenda copiada!";
      setTimeout(() => {
        btnCopiarLegenda.classList.remove("is-success");
        btnCopiarLegenda.innerHTML = original;
      }, 1600);
    });
  });

  // ---------- 6. Toggle de formato Feed / Story ----------
  const postCard = document.getElementById("postCard");
  const formatTag = document.getElementById("formatTag");
  const formatBtns = document.querySelectorAll(".format-btn");

  formatBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      formatBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const format = btn.dataset.format;
      postCard.dataset.format = format;
      formatTag.textContent = format === "story" ? "Story 1080×1920" : "Feed 1080×1080";
    });
  });

  // ---------- 7. Download do card como JPEG (Canvas API) ----------
  const canvas = document.getElementById("exportCanvas");
  const ctx = canvas.getContext("2d");

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let lines = [];
    words.forEach((word) => {
      const testLine = line ? line + " " + word : word;
      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });
    if (line) lines.push(line);
    lines.forEach((l, i) => context.fillText(l, x, y + i * lineHeight));
    return lines.length;
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawCard(format) {
    const isStory = format === "story";
    const W = 1080;
    const H = isStory ? 1920 : 1080;
    canvas.width = W;
    canvas.height = H;

    const pad = 64;

    // Fundo em degradê (cores oficiais UNICAP)
    const grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
    grad.addColorStop(0, "#7A001E");
    grad.addColorStop(1, "#570016");
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 44);
    ctx.fill();

    // Topo: marca + pill
    ctx.fillStyle = "#ffffff22";
    ctx.beginPath();
    ctx.arc(pad + 26, pad + 26, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#D97706";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pad + 26, pad + 26, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 26px Inter, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Talentos UNICAP", pad + 64, pad + 18);
    ctx.fillStyle = "#D97706";
    ctx.font = "700 14px Inter, Arial, sans-serif";
    ctx.fillText("VAGAS EXCLUSIVAS", pad + 64, pad + 44);

    const pillText = tipoVaga;
    ctx.font = "700 18px Inter, Arial, sans-serif";
    const pillWidth = ctx.measureText(pillText).width + 40;
    const pillX = W - pad - pillWidth;
    const pillY = pad;
    ctx.fillStyle = "#D97706";
    roundRect(ctx, pillX, pillY, pillWidth, 44, 22);
    ctx.fill();
    ctx.fillStyle = "#570016";
    ctx.textAlign = "center";
    ctx.fillText(pillText, pillX + pillWidth / 2, pillY + 22);
    ctx.textAlign = "left";

    // Título
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 54px Inter, Arial, sans-serif";
    ctx.textBaseline = "alphabetic";
    const titleY = isStory ? H * 0.42 : pad + 220;
    const linesUsed = wrapText(ctx, vaga.titulo || "", pad, titleY, W - pad * 2, 62);

    // Empresa (opcional)
    let cursorY = titleY + linesUsed * 62 + 20;
    if (vaga.empresa) {
      ctx.fillStyle = "#D97706";
      ctx.font = "700 30px Inter, Arial, sans-serif";
      ctx.fillText(vaga.empresa, pad, cursorY);
    }

    // Divisória
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, cursorY + 36);
    ctx.lineTo(W - pad, cursorY + 36);
    ctx.stroke();

    // Meta (só o que existe)
    cursorY += 90;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "500 26px Inter, Arial, sans-serif";
    metaItems.forEach((item) => {
      ctx.fillText(item, pad, cursorY);
      cursorY += 46;
    });

    if (prazoFim) {
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "500 24px Inter, Arial, sans-serif";
      ctx.fillText(`Seleção até ${prazoFim}`, pad, cursorY + 8);
    }

    // CTA
    const ctaH = 76;
    const ctaY = H - pad - ctaH;
    ctx.fillStyle = "#D97706";
    roundRect(ctx, pad, ctaY, W - pad * 2, ctaH, ctaH / 2);
    ctx.fill();
    ctx.fillStyle = "#570016";
    ctx.font = "700 26px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`CANDIDATE-SE! ${linkCandidatura.toUpperCase()} →`, W / 2, ctaY + ctaH / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  const btnBaixar = document.getElementById("btnBaixar");
  btnBaixar.addEventListener("click", () => {
    const currentFormat = postCard.dataset.format || "feed";
    drawCard(currentFormat);

    canvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeTitulo = (vaga.titulo || "vaga").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
        a.href = url;
        a.download = `talentos-unicap-${safeTitulo}-${currentFormat}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.95
    );
  });
})();