// ============================================================
// Retenção LGPD — anonimiza titulares cujo prazo de guarda venceu
// ============================================================
// Regras (docs/lgpd/politica-de-retencao.md):
//  - cliente/funcionário/fornecedor excluídos (soft delete) há mais de
//    RETENCAO_DIAS (padrão 1825 = 5 anos: prescrição civil/fiscal) -> anonimiza;
//  - convidados de eventos encerrados há mais de RETENCAO_CONVITES_DIAS
//    (padrão 180) -> anonimiza (a lista só serve à portaria do evento).
// Nunca roda sozinho: é chamado pelo script `npm run purge:retencao`.
// ============================================================
const { Op } = require('sequelize');
const { Cliente, Funcionario, Fornecedor, Convite, Evento } = require('../models');
const lgpdService = require('./lgpdService');
const auditoria = require('./auditoriaService');

const PADRAO_RETENCAO_DIAS = 1825;
const PADRAO_RETENCAO_CONVITES_DIAS = 180;
const MINIMO_DIAS = 30; // trava contra typo (ex.: RETENCAO_DIAS=1 apagaria quase tudo)
const DIA_MS = 24 * 60 * 60 * 1000;

function lerDias(valor, padrao, nome) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return padrao;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < MINIMO_DIAS) {
    throw new Error(`${nome} inválido: informe um inteiro >= ${MINIMO_DIAS} (dias).`);
  }
  return n;
}

function lerConfig(env = process.env) {
  return {
    retencaoDias: lerDias(env.RETENCAO_DIAS, PADRAO_RETENCAO_DIAS, 'RETENCAO_DIAS'),
    retencaoConvitesDias: lerDias(env.RETENCAO_CONVITES_DIAS, PADRAO_RETENCAO_CONVITES_DIAS, 'RETENCAO_CONVITES_DIAS'),
  };
}

const ENTIDADES_SOFT_DELETE = [
  ['cliente', () => Cliente],
  ['funcionario', () => Funcionario],
  ['fornecedor', () => Fornecedor],
];

async function listarCandidatos({ retencaoDias, retencaoConvitesDias, agora }) {
  const limiteTitulares = new Date(agora.getTime() - retencaoDias * DIA_MS);
  const limiteConvites = new Date(agora.getTime() - retencaoConvitesDias * DIA_MS);
  const candidatos = [];

  for (const [tipo, modelo] of ENTIDADES_SOFT_DELETE) {
    // eslint-disable-next-line no-await-in-loop
    const linhas = await modelo().unscoped().findAll({
      where: { deletadoEm: { [Op.lt]: limiteTitulares }, anonimizadoEm: null },
      attributes: ['id', 'empresaId'],
    });
    linhas.forEach((l) => candidatos.push({ tipo, id: l.id, empresaId: l.empresaId, regra: 'excluido_alem_do_prazo' }));
  }

  const eventosAntigos = await Evento.unscoped().findAll({
    where: { horarioTermino: { [Op.lt]: limiteConvites } },
    attributes: ['id'],
  });
  if (eventosAntigos.length > 0) {
    const convites = await Convite.unscoped().findAll({
      where: { eventoId: eventosAntigos.map((e) => e.id), anonimizadoEm: null },
      attributes: ['id', 'empresaId'],
    });
    convites.forEach((c) => candidatos.push({ tipo: 'convidado', id: c.id, empresaId: c.empresaId, regra: 'evento_encerrado_alem_do_prazo' }));
  }
  return candidatos;
}

/**
 * @param {{dryRun?:boolean, config?:object, agora?:Date, log?:Function}} opcoes
 *   dryRun é true por padrão: só conta, não altera nada.
 */
async function executarRetencao({ dryRun = true, config = lerConfig(), agora = new Date(), log = () => {} } = {}) {
  const candidatos = await listarCandidatos({ ...config, agora });
  const resumo = { dryRun, candidatos: candidatos.length, anonimizados: 0, bloqueados: 0, falhas: 0, porTipo: {} };
  candidatos.forEach((c) => { resumo.porTipo[c.tipo] = (resumo.porTipo[c.tipo] || 0) + 1; });

  if (dryRun) {
    log(`[dry-run] ${candidatos.length} titular(es) seriam anonimizados: ${JSON.stringify(resumo.porTipo)}`);
    return resumo;
  }

  for (const c of candidatos) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await lgpdService.anonimizarTitular(c.tipo, c.id);
      if (r.ok) {
        resumo.anonimizados += 1;
        // eslint-disable-next-line no-await-in-loop
        await auditoria.registrar({
          empresaId: c.empresaId, acao: 'retencao.titular.anonimizado', entidade: c.tipo, entidadeId: c.id,
          detalhes: { origem: 'purge', regra: c.regra },
        });
      } else {
        resumo.bloqueados += 1; // ex.: evento futuro vinculado; tenta de novo na próxima execução
      }
    } catch (error) {
      resumo.falhas += 1;
      log(`falha ao anonimizar ${c.tipo} ${c.id}: ${error.name}`); // sem mensagem do driver
    }
  }
  log(`anonimizados=${resumo.anonimizados} bloqueados=${resumo.bloqueados} falhas=${resumo.falhas}`);
  return resumo;
}

module.exports = { executarRetencao, lerConfig, listarCandidatos, PADRAO_RETENCAO_DIAS, PADRAO_RETENCAO_CONVITES_DIAS, MINIMO_DIAS };
