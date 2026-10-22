// ============================================================
// Smoke test do SMTP de desenvolvimento
// ============================================================
// Envia e-mails REAIS pelo SMTP configurado. Exige confirmação explícita
// (--enviar) e nunca imprime credenciais.
//
//   node backend/scripts/dev/test_email.js --enviar
//   node backend/scripts/dev/test_email.js --enviar --destino=alguem@exemplo.com
//
// No ambiente de dev o SMTP é o Mailpit do docker-compose.dev.yml, publicado
// em 127.0.0.1:1025: a mensagem aparece em http://localhost:8025.
// O script roda na máquina de dev (o .dockerignore tira scripts/dev da imagem).
// ============================================================
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { enviarConvite, enviarCodigoPrimeiroAcesso } = require('../../src/services/emailService');
const { smtpConfigurado, remetente } = require('../../src/config/email');

// Mailpit do compose de dev: SMTP em 127.0.0.1:1025, sem autenticação.
const SMTP_DEV = { host: '127.0.0.1', port: '1025', email: 'dev@celebri.local' };

const args = process.argv.slice(2);
const confirmar = args.includes('--enviar');
const destinoArg = args.find((a) => a.startsWith('--destino='));
let destinatario = destinoArg ? destinoArg.slice('--destino='.length).trim() : '';

// Envia um e-mail REAL via SMTP configurado: exige confirmação explícita
// (--enviar) e só escreve para o próprio remetente (EMAIL_USER). Nunca
// imprime credenciais.
if (!confirmar) {
  console.error('Este script envia um e-mail real pelo SMTP configurado. Rode com --enviar para confirmar.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('Recusado: script de desenvolvimento, não use com NODE_ENV=production.');
  process.exit(1);
}

if (!smtpConfigurado()) {
  // Sem SMTP no .env, e fora de produção, usa o Mailpit do compose de dev.
  console.warn('SMTP não configurado no .env — usando o Mailpit local (127.0.0.1:1025).');
  process.env.EMAIL_HOST = SMTP_DEV.host;
  process.env.EMAIL_PORT = SMTP_DEV.port;
  if (!process.env.EMAIL_FROM) process.env.EMAIL_FROM = remetente({});
  if (!destinatario) destinatario = SMTP_DEV.email;
}

if (!destinatario) {
  console.error('Sem destinatário: informe --destino=email ou defina EMAIL_USER no .env.');
  process.exit(1);
}

async function testEmail() {
  try {
    console.log('Tentando enviar e-mail de convite...');
    await enviarConvite({
      nome: 'Teste Local',
      email: destinatario, // manda para o próprio remetente para testar
      token: '1234567890abcdef',
    });
    console.log('E-mail de convite enviado com sucesso!');
  } catch (error) {
    // Só código e mensagem: o objeto de erro completo pode carregar host/usuário SMTP.
    console.error('Erro ao enviar e-mail de convite:', error.code || '', error.message);
    process.exitCode = 1;
    return;
  }

  try {
    console.log('Tentando enviar e-mail de código de primeiro acesso...');
    await enviarCodigoPrimeiroAcesso({
      nome: 'Teste Local',
      email: destinatario,
      codigo: '123456',
    });
    console.log('E-mail de código enviado com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar e-mail de código:', error.code || '', error.message);
    process.exitCode = 1;
    return;
  }

  console.log('Tudo certo. Confira a caixa de entrada (no dev: http://localhost:8025).');
}

testEmail();
