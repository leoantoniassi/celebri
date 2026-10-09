require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { enviarConvite } = require('../../src/services/emailService');

// Envia um e-mail REAL via SMTP configurado: exige confirmação explícita (--enviar)
// e só escreve para o próprio remetente (EMAIL_USER). Nunca imprime credenciais.
if (!process.argv.includes('--enviar')) {
  console.error('Este script envia um e-mail real para EMAIL_USER. Rode com --enviar para confirmar.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('Recusado: script de desenvolvimento, não use com NODE_ENV=production.');
  process.exit(1);
}

async function testEmail() {
  try {
    console.log("Tentando enviar e-mail...");
    await enviarConvite({
      nome: 'Teste Local',
      email: process.env.EMAIL_USER, // manda para o próprio remetente para testar
      token: '1234567890abcdef'
    });
    console.log("E-mail enviado com sucesso!");
  } catch (error) {
    // Só código e mensagem: o objeto de erro completo pode carregar host/usuário SMTP.
    console.error("Erro ao enviar e-mail:", error.code || "", error.message);
    process.exitCode = 1;
  }
}

testEmail();
