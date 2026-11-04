// ============================================
// Utils - máscaras de campos de formulário
// (equivalente em espírito ao Util/CnpjValidator.java do backend: helpers
// puros e reutilizáveis, sem dependência de API ou de tela específica)
// ============================================

function formatarTelefone(valorDigitado) {
  let value = valorDigitado.replace(/\D/g, '').slice(0, 11);
  if (value.length > 10) {
    value = value.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  } else if (value.length > 6) {
    value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else if (value.length > 2) {
    value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (value.length > 0) {
    value = value.replace(/^(\d{0,2})/, '($1');
  }
  return value;
}

function formatarCnpj(valorDigitado) {
  let v = valorDigitado.replace(/\D/g, '').slice(0, 14);
  if (v.length > 12) {
    v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
  } else if (v.length > 8) {
    v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
  } else if (v.length > 5) {
    v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  }
  return v;
}

// Liga a máscara a um <input>, reaplicando o formato a cada tecla digitada.
function aplicarMascara(input, formatador) {
  if (!input) return;
  input.addEventListener('input', (e) => {
    e.target.value = formatador(e.target.value);
  });
}

// Auto-inicialização: qualquer página com #telefone e/ou #cnpj já ganha a
// máscara sem precisar chamar nada manualmente.
document.addEventListener('DOMContentLoaded', () => {
  aplicarMascara(document.getElementById('telefone'), formatarTelefone);
  aplicarMascara(document.getElementById('cnpj'), formatarCnpj);
});
