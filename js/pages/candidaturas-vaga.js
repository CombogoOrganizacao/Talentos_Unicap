// ============================================
// CANDIDATOS DA VAGA (visão da empresa)
// Lista ordenada do melhor encaixe para o pior.
// ============================================
(function () {
  "use strict";

  const container = document.getElementById("candidatosContainer");
  const template = document.getElementById("candidatoTemplate");
  const resumoMelhor = document.getElementById("resumoMelhor");
  const toolbar = document.getElementById("toolbar");
  const filtroStatus = document.getElementById("filtroStatus");
  const mostrarCanceladas = document.getElementById("mostrarCanceladas");

  const params = new URLSearchParams(window.location.search);
  const vagaId = params.get("vaga");

  let candidatos = [];
  let vagaTemRequisitos = false;

  const BADGE_STATUS = {
    ENVIADA: "badge-blue",
    EM_ANALISE: "badge-orange",
    SELECIONADO: "badge-green",
    RECUSADO: "badge-red",
    CANCELADA: "badge-gray"
  };

  // ---------- helpers ----------
  function esc(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatarData(data) {
    if (!data) return "-";
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  }

  function aviso(html, classe) {
    container.innerHTML = `<p class="${classe || "aviso-vazio"}">${html}</p>`;
  }

  function chips(lista, classe) {
    return (lista || [])
      .map((item) => `<span class="skill-chip ${classe}">${classe === "ok" ? "✓" : "✗"} ${esc(item)}</span>`)
      .join("");
  }

  function nivel(score) {
    if (score >= 70) return "nivel-alto";
    if (score >= 40) return "nivel-medio";
    return "nivel-baixo";
  }

  // ---------- carregar ----------
  async function iniciar() {
    const tipo = await Auth._detectarTipoConta();

    if (!tipo) {
      window.location.href = "login.html";
      return;
    }
    if (tipo !== "empresa") {
      window.location.href = "lista-vagas.html";
      return;
    }
    if (!vagaId) {
      aviso("Nenhuma vaga foi informada.");
      return;
    }

    await Promise.all([carregarVaga(), carregarCandidatos()]);
  }

  async function carregarVaga() {
    const vaga = await APIEmpresa.vagas.buscarPorId(vagaId);

    if (!vaga || vaga.error) {
      document.getElementById("subtituloVaga").textContent = "";
      return;
    }

    document.getElementById("tituloVaga").textContent = vaga.titulo || "Candidatos da vaga";
    document.getElementById("subtituloVaga").textContent =
      "Os candidatos aparecem do melhor encaixe para o pior, comparando o perfil de cada aluno com os requisitos da vaga.";

    const requisitos = (vaga.vaga_habilidades || []).map((x) => x.habilidade);
    vagaTemRequisitos = requisitos.length > 0;

    const box = document.getElementById("vagaRequisitos");
    if (vagaTemRequisitos) {
      box.innerHTML =
        `<p class="skill-grupo-titulo">Requisitos da vaga</p>` +
        requisitos.map((r) => `<span class="tag">${esc(r)}</span>`).join("");
      box.hidden = false;
    }
  }

  async function carregarCandidatos() {
    const resultado = await CandidaturaService.candidatosDaVaga(vagaId);

    if (resultado && resultado.error) {
      aviso(esc(resultado.error), "aviso-erro");
      return;
    }

    candidatos = resultado;
    toolbar.hidden = !candidatos.length;
    render();
  }

  // ---------- render ----------
  function resumoDoMelhor(lista) {
    const melhor = lista.find((c) => c.status !== "CANCELADA");

    if (!melhor) {
      resumoMelhor.hidden = true;
      return;
    }

    const compat = melhor.compat || {};
    const detalhe = vagaTemRequisitos
      ? `Atende ${compat.atendidos ? compat.atendidos.length : 0} de ${compat.total_requisitos || 0} requisitos da vaga.`
      : "Esta vaga não tem requisitos cadastrados, então o ranking considera só o perfil do aluno.";

    resumoMelhor.innerHTML =
      `🏆 Melhor encaixe até agora: <strong>${esc(melhor.nome || "Aluno")}</strong> ` +
      `com <strong>${compat.score ?? 0}%</strong> de compatibilidade.` +
      `<small>${esc(detalhe)}</small>`;
    resumoMelhor.hidden = false;
  }

  function render() {
    const status = filtroStatus.value;
    const comCanceladas = mostrarCanceladas.checked;

    const lista = candidatos.filter((c) => {
      if (c.status === "CANCELADA" && !comCanceladas) return false;
      if (status && c.status !== status) return false;
      return true;
    });

    resumoDoMelhor(candidatos);

    if (!candidatos.length) {
      aviso("Ainda não existem candidatos para esta vaga.");
      return;
    }

    if (!lista.length) {
      aviso("Nenhum candidato com esse filtro.");
      return;
    }

    container.innerHTML = "";
    const idMelhor = (candidatos.find((c) => c.status !== "CANCELADA") || {}).id;

    lista.forEach((c) => container.appendChild(montarCard(c, c.id === idMelhor)));
  }

  function montarCard(c, ehMelhor) {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".candidato-card");
    const q = (role) => node.querySelector(`[data-role="${role}"]`);
    const compat = c.compat || {};
    const score = Number(compat.score) || 0;
    const cancelada = c.status === "CANCELADA";

    if (cancelada) card.classList.add("is-cancelada");
    if (ehMelhor && !cancelada) {
      card.classList.add("is-melhor");
      q("melhor").hidden = false;
    }

    q("nome").textContent = c.nome || "Aluno";

    const sub = [c.curso, c.periodo ? `${c.periodo}º período` : "", [c.cidade, c.estado].filter(Boolean).join(" - ")]
      .filter(Boolean)
      .join(" • ");
    q("subtitulo").textContent = sub || "Perfil ainda sem curso informado";

    // compatibilidade
    const blocoCompat = q("compat");
    blocoCompat.classList.add(nivel(score));
    q("score").textContent = `${score}%`;
    q("barra").style.width = `${Math.min(100, score)}%`;
    if (compat.sem_requisitos) q("rotulo").textContent = "perfil (vaga sem requisitos)";

    if (compat.atendidos && compat.atendidos.length) {
      q("atendidos").innerHTML = chips(compat.atendidos, "ok");
      q("grupo-atendidos").hidden = false;
    }
    if (compat.faltando && compat.faltando.length) {
      q("faltando").innerHTML = chips(compat.faltando, "falta");
      q("grupo-faltando").hidden = false;
    }

    if (c.mensagem) {
      q("mensagem").textContent = c.mensagem;
      q("mensagem").hidden = false;
    }

    q("data").textContent = formatarData(c.data_candidatura);

    const badge = q("status");
    badge.textContent = CandidaturaService.textoStatus(c.status);
    badge.classList.add(BADGE_STATUS[c.status] || "badge-gray");

    const contato = [c.telefone, c.disponivel_estagio ? "Disponível para estágio" : ""].filter(Boolean).join(" • ");
    q("contato").textContent = contato;

    // currículo (abre mesmo com o perfil oculto, porque o aluno se candidatou)
    const link = q("curriculo");
    if (c.aluno_id && !cancelada) {
      link.href =
        `curriculo-empresa.html?slug=${encodeURIComponent(c.aluno_id)}&vaga=${encodeURIComponent(vagaId)}`;
    } else {
      link.removeAttribute("href");
      link.textContent = cancelada ? "Candidatura cancelada" : "Currículo indisponível";
      link.style.opacity = "0.6";
      link.style.pointerEvents = "none";
    }

    // botões de decisão
    node.querySelectorAll("[data-action]").forEach((btn) => {
      const novoStatus = btn.dataset.action;

      if (cancelada) {
        btn.remove();
        return;
      }
      if (novoStatus === c.status) {
        btn.disabled = true;
      }
      btn.addEventListener("click", () => alterarStatus(c, novoStatus, btn));
    });

    return node;
  }

  async function alterarStatus(c, status, botao) {
    const perguntas = {
      EM_ANALISE: `Colocar a candidatura de ${c.nome || "este aluno"} em análise?`,
      SELECIONADO: `Selecionar ${c.nome || "este aluno"} para a vaga?`,
      RECUSADO: `Recusar a candidatura de ${c.nome || "este aluno"}?`
    };

    if (!confirm(perguntas[status])) return;

    botao.disabled = true;
    const resultado = await CandidaturaService.atualizarStatus(c.id, status);

    if (resultado && resultado.error) {
      alert(resultado.error);
      botao.disabled = false;
      return;
    }

    await carregarCandidatos();
  }

  filtroStatus.addEventListener("change", render);
  mostrarCanceladas.addEventListener("change", render);

  iniciar();
})();
