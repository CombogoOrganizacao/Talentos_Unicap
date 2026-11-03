// ============================================
// MINHAS CANDIDATURAS (visão do aluno)
// ============================================
(function () {
  "use strict";

  const container = document.getElementById("candidaturasContainer");
  const template = document.getElementById("candidaturaTemplate");

  const BADGE_STATUS = {
    ENVIADA: "badge-blue",
    EM_ANALISE: "badge-orange",
    SELECIONADO: "badge-green",
    RECUSADO: "badge-red",
    CANCELADA: "badge-gray"
  };

  const MODALIDADE = { PRESENCIAL: "Presencial", REMOTO: "Remoto", HIBRIDO: "Híbrido" };

  function esc(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // "2026-10-30" -> "30/10/2026" (sem o erro de fuso que mostra um dia a menos)
  function formatarData(data) {
    if (!data) return "";
    const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data));
    if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`;
    const d = new Date(data);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
  }

  function aviso(html, classe) {
    container.innerHTML = `<div class="${classe || "aviso-vazio"}">${html}</div>`;
  }

  async function iniciar() {
    const tipo = await Auth._detectarTipoConta();

    if (!tipo) {
      window.location.href = "login.html";
      return;
    }
    if (tipo === "empresa") {
      window.location.href = "lista-vagas.html";
      return;
    }

    await carregar();
  }

  async function carregar() {
    const resultado = await CandidaturaService.minhas();

    if (resultado && resultado.error) {
      aviso(`Erro ao carregar candidaturas: ${esc(resultado.error)}`, "aviso-erro");
      return;
    }

    if (!resultado.length) {
      aviso(`Você ainda não se candidatou a nenhuma vaga.<br><br>
        <a class="btn btn-primary" href="lista-vagas.html">Ver vagas disponíveis</a>`);
      return;
    }

    container.innerHTML = "";
    resultado.forEach((c) => container.appendChild(montarCard(c)));
  }

  function montarCard(c) {
    const node = template.content.cloneNode(true);
    const q = (role) => node.querySelector(`[data-role="${role}"]`);
    const vaga = c.vagas || {};

    q("titulo").textContent = vaga.titulo || "Vaga";
    q("empresa").textContent = vaga.empresa || "";
    q("modalidade").textContent = MODALIDADE[vaga.modalidade] ? "💼 " + MODALIDADE[vaga.modalidade] : "";
    q("local").textContent = vaga.local ? "📍 " + vaga.local : "";
    q("remuneracao").textContent = vaga.remuneracao ? "$ " + vaga.remuneracao : "";
    q("data").textContent = formatarData(c.data_candidatura);
    q("prazo").textContent = vaga.periodo_fim ? `Seleção até ${formatarData(vaga.periodo_fim)}` : "";

    const badge = q("status");
    badge.textContent = CandidaturaService.textoStatus(c.status);
    badge.classList.add(BADGE_STATUS[c.status] || "badge-gray");

    // avisos sobre a situação da vaga
    const aviso = q("aviso");
    if (vaga.status === "FECHADA") {
      aviso.textContent = "Esta vaga foi encerrada pela empresa.";
      aviso.hidden = false;
    } else if (vaga.status === "PAUSADA") {
      aviso.textContent = "Esta vaga está temporariamente pausada.";
      aviso.hidden = false;
    }

    // ações
    const botaoCancelar = q("cancelar");
    const podeCancelar = c.status === "ENVIADA" || c.status === "EM_ANALISE";

    if (podeCancelar) {
      botaoCancelar.addEventListener("click", () => cancelar(c.id, botaoCancelar));
    } else {
      botaoCancelar.remove();
    }

    if (c.status === "CANCELADA" && vaga.status === "ABERTA") {
      q("reenviar").hidden = false;
    }

    return node;
  }

  async function cancelar(candidaturaId, botao) {
    if (!confirm("Deseja cancelar esta candidatura?")) return;

    botao.disabled = true;
    const resultado = await CandidaturaService.cancelar(candidaturaId);

    if (resultado && resultado.error) {
      alert(resultado.error);
      botao.disabled = false;
      return;
    }

    await carregar();
  }

  iniciar();
})();
