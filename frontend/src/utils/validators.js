export const validarCpfCnpj = (val) => {
  if (!val) return false;
  const doc = val.replace(/\D/g, '');
  
  if (doc.length === 11) {
    if (/^(\d)\1{10}$/.test(doc)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(doc.substring(i-1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(doc.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(doc.substring(i-1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(doc.substring(10, 11));
  } else if (doc.length === 14) {
    if (/^(\d)\1{13}$/.test(doc)) return false;
    let size = doc.length - 2;
    let numbers = doc.substring(0, size);
    let digits = doc.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    
    size += 1;
    numbers = doc.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    return result === parseInt(digits.charAt(1));
  }
  return false;
};

/** Aceita só URLs http(s) absolutas (bloqueia javascript:, data:, file: etc.). Vazio é válido (campo opcional). */
export const urlHttpValida = (valor) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return true;
  try {
    const url = new URL(texto);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
  } catch {
    return false;
  }
};
