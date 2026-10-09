// ============================================================
// CELEBRI — Resolução da configuração de SSL do PostgreSQL
// ============================================================
// Regras:
//  - DB_SSL=true/false é sempre respeitado quando definido.
//  - Sem DB_SSL: SSL liga só em NODE_ENV=production E quando o host do banco
//    é externo (o Postgres interno do compose — db/postgres/localhost — não
//    tem TLS).
//  - Com SSL: se houver DB_SSL_CA (conteúdo PEM ou caminho de arquivo), o
//    certificado é verificado (rejectUnauthorized: true).
//  - Sem CA, o certificado é verificado contra as CAs do sistema, a menos
//    que DB_SSL_REJECT_UNAUTHORIZED=false seja definido EXPLICITAMENTE
//    (inseguro; gera aviso no log de start).
// ============================================================
const fs = require('fs');

const HOSTS_INTERNOS = new Set(['db', 'localhost', 'postgres', '127.0.0.1', '::1']);

function lerBooleano(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return undefined;
  const v = String(valor).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(v)) return true;
  if (['false', '0', 'no'].includes(v)) return false;
  return undefined;
}

function hostEhInterno(host) {
  return !host || HOSTS_INTERNOS.has(String(host).trim().toLowerCase());
}

function lerCa(valor) {
  const v = String(valor).trim();
  if (v.includes('-----BEGIN')) return v.replace(/\\n/g, '\n');
  try {
    return fs.readFileSync(v, 'utf8');
  } catch (erro) {
    throw new Error(`DB_SSL_CA: não foi possível ler o arquivo "${v}" (${erro.code || erro.message}).`);
  }
}

/**
 * Devolve o objeto `ssl` para o dialectOptions do pg, ou null (sem SSL).
 * `avisar` recebe mensagens de alerta (por padrão console.warn).
 */
function resolverSsl(env = process.env, avisar = console.warn) {
  const explicito = lerBooleano(env.DB_SSL);
  const producao = String(env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const usarSsl = explicito !== undefined ? explicito : producao && !hostEhInterno(env.DB_HOST);
  if (!usarSsl) {
    // Downgrade explícito: conexão em texto claro com banco externo em produção.
    if (explicito === false && producao && !hostEhInterno(env.DB_HOST)) {
      avisar('⚠️  DB_SSL=false em produção com banco externo: a conexão (inclusive a senha) trafega sem criptografia.');
    }
    return null;
  }

  const ca = env.DB_SSL_CA && String(env.DB_SSL_CA).trim() ? lerCa(env.DB_SSL_CA) : null;
  if (ca) return { require: true, rejectUnauthorized: true, ca };

  if (lerBooleano(env.DB_SSL_REJECT_UNAUTHORIZED) === false) {
    avisar('⚠️  DB_SSL_REJECT_UNAUTHORIZED=false: o certificado do banco NÃO está sendo verificado (vulnerável a MITM). Defina DB_SSL_CA.');
    return { require: true, rejectUnauthorized: false };
  }
  return { require: true, rejectUnauthorized: true };
}

module.exports = { resolverSsl, hostEhInterno, HOSTS_INTERNOS };
