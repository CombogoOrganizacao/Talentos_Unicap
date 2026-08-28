document.getElementById('telefone').addEventListener('input', function(e) {
  let value = e.target.value.replace(/\D/g, ''); // remove tudo que não é número
  value = value.slice(0, 11); // limita a 11 dígitos

  if (value.length > 10) {
    // celular: (81) 99999-9999
    value = value.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  } else if (value.length > 6) {
    // fixo: (81) 9999-9999
    value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else if (value.length > 2) {
    value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (value.length > 0) {
    value = value.replace(/^(\d{0,2})/, '($1');
  }

  e.target.value = value;
});