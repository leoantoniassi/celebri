// ============================================================
// Serviço LGPD — exportação e anonimização de titulares
// ============================================================
// Titulares tratados: cliente, funcionário, convidado (Convite) e fornecedor.
// A anonimização substitui os campos pessoais por valores neutros e
// irreversíveis (nada é guardado para recompor o original) e MANTÉM o que a
// lei exige guardar: orçamentos, eventos, valores e documentos fiscais/contratuais
// continuam, apontando para um titular anonimizado (LGPD art. 16, I e art. 7º, II).
// Sem criptografia de colunas nesta rodada (decisão registrada em docs/lgpd).
// ============================================================
const crypto = require('crypto');
const { Op, Transaction } = require('sequelize');
const sequelize = require('../config/database');
const {
  Cliente, Funcionario, Fornecedor, Convite, Usuario, Evento, Orcamento, Documento, Escala, CategoriaFornecedor, Funcao,
} = require('../models');

const TIPOS = ['cliente', 'funcionario', 'convidado', 'fornecedor'];
const NOME_ANONIMO = 'Titular anonimizado';
const TELEFONE_ANONIMO = '00000000000';
const LIMITE_RELACIONADOS = 1000;

const MODELOS = {
  cliente: () => Cliente,
  funcionario: () => Funcionario,
  convidado: () => Convite,
  fornecedor: () => Fornecedor,
};

const aleatorio = (bytes = 8) => crypto.randomBytes(bytes).toString('hex');
const emailAnonimo = () => `anon-${aleatorio(8)}@anonimizado.invalid`;
const idAnonimo = () => `ANON-${aleatorio(6)}`; // 17 caracteres: cabe em CPF/CNPJ (20)

/** Cópia só com os campos pedidos (nunca devolve a instância inteira). */
function escolher(registro, campos) {
  if (!registro) return null;
  const origem = typeof registro.get === 'function' ? registro.get({ plain: true }) : registro;
  return campos.reduce((acc, c) => { acc[c] = origem[c] === undefined ? null : origem[c]; return acc; }, {});
}

// Inclui registros em soft delete: o titular tem direito aos dados mesmo após a exclusão.
const comTudo = (Model) => Model.unscoped();

/** Evento ainda por vir ou em andamento, não cancelado, entre os ids informados. */
async function contarEventosAtivos(where, transaction) {
  return Evento.count({
    where: { ...where, status: 'pendente', horarioTermino: { [Op.gt]: new Date() } },
    transaction,
  });
}

// ── Exportação ───────────────────────────────────────────────

const CAMPOS = {
  cliente: ['id', 'nome', 'email', 'rgCpf', 'telefone', 'telefoneResidencial', 'criadoEm', 'atualizadoEm', 'deletadoEm', 'anonimizadoEm'],
  funcionario: ['id', 'nome', 'email', 'telefone', 'telefoneResidencial', 'funcaoId', 'criadoEm', 'atualizadoEm', 'deletadoEm', 'anonimizadoEm'],
  convidado: ['id', 'eventoId', 'nome', 'telefone', 'qtdPessoas', 'qtdEntrou', 'criadoEm', 'atualizadoEm', 'deletadoEm', 'anonimizadoEm'],
  fornecedor: ['id', 'nome', 'email', 'cnpj', 'telefone', 'categoriaId', 'criadoEm', 'atualizadoEm', 'deletadoEm', 'anonimizadoEm'],
};

const RESUMO_EVENTO = ['id', 'nome', 'dataEvento', 'horarioTermino', 'status'];

async function relacionadosCliente(id) {
  const [eventos, orcamentos, documentos] = await Promise.all([
    comTudo(Evento).findAll({ where: { clienteId: id }, limit: LIMITE_RELACIONADOS, order: [['dataEvento', 'DESC']] }),
    comTudo(Orcamento).findAll({ where: { clienteId: id }, limit: LIMITE_RELACIONADOS, order: [['criadoEm', 'DESC']] }),
    comTudo(Documento).findAll({ where: { clienteId: id }, limit: LIMITE_RELACIONADOS, order: [['criadoEm', 'DESC']] }),
  ]);
  return {
    eventos: eventos.map((e) => escolher(e, [...RESUMO_EVENTO, 'qtdPessoas', 'valorOrcamento'])),
    orcamentos: orcamentos.map((o) => escolher(o, ['id', 'nome', 'valorTotal', 'status', 'dataEvento', 'criadoEm'])),
    // Só metadados: o caminho do arquivo no servidor não é dado do titular.
    documentos: documentos.map((d) => escolher(d, ['id', 'nomeArquivo', 'tipoArquivo', 'eventoId', 'criadoEm'])),
  };
}

async function relacionadosFuncionario(funcionario) {
  const [escalas, usuario, funcao] = await Promise.all([
    comTudo(Escala).findAll({ where: { funcionarioId: funcionario.id }, limit: LIMITE_RELACIONADOS }),
    Usuario.findOne({ where: { funcionarioId: funcionario.id } }),
    Funcao.findOne({ where: { id: funcionario.funcaoId } }),
  ]);
  const ids = [...new Set(escalas.map((e) => e.eventoId))];
  const eventos = ids.length ? await comTudo(Evento).findAll({ where: { id: ids } }) : [];
  return {
    funcao: funcao ? { id: funcao.id, nome: funcao.nome } : null,
    escala: escalas.map((e) => escolher(e, ['id', 'eventoId', 'funcaoId', 'confirmacao', 'confirmadoEm', 'checkinEm', 'observacoes'])),
    eventos: eventos.map((e) => escolher(e, RESUMO_EVENTO)),
    // Conta de acesso do próprio titular; sem senha, tokens ou hashes.
    usuario: escolher(usuario, ['id', 'nome', 'email', 'role', 'status', 'criadoEm', 'termosAceitosEm', 'termosVersao']),
  };
}

async function relacionadosConvidado(convite) {
  const evento = await comTudo(Evento).findOne({ where: { id: convite.eventoId } });
  return { evento: escolher(evento, RESUMO_EVENTO) };
}

async function relacionadosFornecedor(fornecedor) {
  const categoria = await CategoriaFornecedor.findOne({ where: { id: fornecedor.categoriaId } });
  return { categoria: categoria ? { id: categoria.id, nome: categoria.nome } : null };
}

/**
 * Todos os dados do titular dentro do tenant atual (o escopo vem do contexto da requisição).
 * @returns {Promise<object|null>} null se o titular não existe neste tenant
 */
async function exportarTitular(tipo, id) {
  const Model = MODELOS[tipo]();
  const registro = await comTudo(Model).findOne({ where: { id } });
  if (!registro) return null;

  const relacionados = {
    cliente: () => relacionadosCliente(id),
    funcionario: () => relacionadosFuncionario(registro),
    convidado: () => relacionadosConvidado(registro),
    fornecedor: () => relacionadosFornecedor(registro),
  }[tipo]();

  return {
    geradoEm: new Date().toISOString(),
    titular: { tipo, id },
    dados: escolher(registro, CAMPOS[tipo]),
    relacionados: await relacionados,
    observacao: 'Dados mantidos por obrigação legal/contratual (orçamentos, eventos, documentos) estão listados como resumo.',
  };
}

// ── Anonimização ─────────────────────────────────────────────

const ANONIMIZADORES = {
  cliente: () => ({
    nome: NOME_ANONIMO, email: null, rgCpf: idAnonimo(), telefone: TELEFONE_ANONIMO, telefoneResidencial: null,
  }),
  funcionario: () => ({
    nome: NOME_ANONIMO, email: null, telefone: null, telefoneResidencial: null,
  }),
  convidado: () => ({
    // O token do QR deixa de valer: não deve poder ser usado para recompor a pessoa.
    nome: NOME_ANONIMO, telefone: null, token: aleatorio(32),
  }),
  fornecedor: () => ({
    nome: NOME_ANONIMO, email: emailAnonimo(), cnpj: idAnonimo(), telefone: TELEFONE_ANONIMO,
  }),
};

async function bloqueioPorEventoFuturo(tipo, registro, transaction) {
  if (tipo === 'cliente') return contarEventosAtivos({ clienteId: registro.id }, transaction);
  if (tipo === 'convidado') return contarEventosAtivos({ id: registro.eventoId }, transaction);
  if (tipo === 'funcionario') {
    const escalas = await comTudo(Escala).findAll({ where: { funcionarioId: registro.id }, attributes: ['eventoId'], transaction });
    const ids = [...new Set(escalas.map((e) => e.eventoId))];
    return ids.length ? contarEventosAtivos({ id: ids }, transaction) : 0;
  }
  return 0;
}

/** Anonimiza a conta de login ligada ao funcionário (nome/e-mail pessoais). */
async function anonimizarUsuarioDoFuncionario(funcionarioId, transaction) {
  const usuario = await Usuario.findOne({ where: { funcionarioId }, transaction, lock: Transaction.LOCK.UPDATE });
  if (!usuario) return false;
  await usuario.update({
    nome: NOME_ANONIMO,
    email: emailAnonimo(),
    senha: null,
    status: 'pendente',
    conviteToken: null,
    conviteExpiracao: null,
    resetToken: null,
    resetExpiracao: null,
    codigoHash: null,
    codigoExpiracao: null,
    tokenVersion: (usuario.tokenVersion || 0) + 1, // derruba sessões abertas
  }, { transaction });
  return true;
}

/**
 * Anonimiza o titular numa transação. Nunca apaga linhas: preserva vínculos e dados financeiros.
 * @returns {Promise<{ok:true, ...}|{ok:false, motivo:'nao_encontrado'|'ja_anonimizado'|'evento_futuro'|'conta_gestora', mensagem:string}>}
 */
async function anonimizarTitular(tipo, id) {
  const Model = MODELOS[tipo]();

  const resultado = await sequelize.transaction(async (transaction) => {
    const registro = await comTudo(Model).findOne({ where: { id }, transaction, lock: Transaction.LOCK.UPDATE });
    if (!registro) return { ok: false, motivo: 'nao_encontrado', mensagem: 'Titular não encontrado.' };
    if (registro.anonimizadoEm) return { ok: false, motivo: 'ja_anonimizado', mensagem: 'Titular já anonimizado.' };

    const eventos = await bloqueioPorEventoFuturo(tipo, registro, transaction);
    if (eventos > 0) {
      return {
        ok: false,
        motivo: 'evento_futuro',
        mensagem: 'Há evento futuro ou em andamento vinculado a este titular. Conclua ou cancele o evento antes de anonimizar.',
      };
    }

    if (tipo === 'funcionario') {
      const conta = await Usuario.findOne({ where: { funcionarioId: id }, attributes: ['id', 'role'], transaction });
      if (conta && ['gerente', 'admin', 'super_admin'].includes(conta.role)) {
        return {
          ok: false,
          motivo: 'conta_gestora',
          mensagem: 'Este funcionário tem conta de gerente. Remova ou rebaixe o usuário antes de anonimizar.',
        };
      }
    }

    const agora = new Date();
    const campos = { ...ANONIMIZADORES[tipo](), anonimizadoEm: agora, atualizadoEm: agora };
    // Titular anonimizado sai das listagens (soft delete), mas o vínculo com eventos/orçamentos permanece.
    if (tipo !== 'convidado' && !registro.deletadoEm) campos.deletadoEm = agora;
    await registro.update(campos, { transaction });

    const contaAnonimizada = tipo === 'funcionario' ? await anonimizarUsuarioDoFuncionario(id, transaction) : false;
    return { ok: true, empresaId: registro.empresaId, contaAnonimizada };
  });

  // Registro FORA do banco (log da aplicação): se o banco for restaurado de um backup anterior,
  // este rastro (só tipo + id + data, sem dado pessoal) permite reaplicar a anonimização.
  if (resultado.ok) console.log(`[lgpd] titular anonimizado tipo=${tipo} id=${id} em=${new Date().toISOString()}`);
  return resultado;
}

module.exports = {
  TIPOS,
  exportarTitular,
  anonimizarTitular,
  NOME_ANONIMO,
};
