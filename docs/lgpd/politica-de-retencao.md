# Política de Retenção e Anonimização

> **Prazos propostos — requer revisão jurídica/contábil.** Versão 1.0. Os prazos padrão do sistema estão em `backend/src/services/retencaoService.js`
> e podem ser ajustados por variável de ambiente.

## 1. Princípios

* Guardar somente o necessário (minimização, art. 6º, III) e pelo menor tempo compatível com a finalidade e a lei.
* **Anonimizar em vez de apagar** quando a linha precisa continuar existindo (histórico financeiro, vínculos entre eventos, orçamentos).
* Nada de dados pessoais em logs/auditoria.

## 2. Prazos por categoria

| Categoria / dado | Prazo proposto | Gatilho | Fundamento / justificativa |
|---|---|---|---|
| Cliente (cadastro) | **5 anos** após exclusão do cadastro (padrão `RETENCAO_DIAS=1825`) | `deletadoEm` | Prescrição civil/cobrança e obrigações fiscais (5 anos; CTN art. 173/174) |
| Orçamentos, eventos, valores | **5 anos** após o evento (fiscal/contábil), **sem** dados pessoais após anonimização do cliente | data do evento | Obrigação legal (art. 7º, II; art. 16, I) |
| Documentos/contratos do cliente | **5 anos** após o término do contrato; depois, apagar o arquivo **manualmente** (o sistema não apaga arquivos automaticamente) | término do contrato | Exercício regular de direitos (art. 7º, VI) |
| Funcionário (cadastro, escala) | **5 anos** após desligamento (padrão `RETENCAO_DIAS`); **verificar prazo trabalhista/previdenciário do contador** | `deletadoEm` | Obrigações trabalhistas; prescrição (CF art. 7º, XXIX) |
| Fornecedor | **5 anos** após exclusão | `deletadoEm` | Fiscal/contábil |
| Convidados (lista e telefone) | **180 dias** após o evento (padrão `RETENCAO_CONVITES_DIAS=180`) | fim do evento | Só serve à organização/portaria; prazo cobre reclamações e segurança |
| Usuário do sistema (conta) | enquanto durar o vínculo; após remoção, nenhum dado pessoal remanescente (a conta é apagada) | remoção do usuário | Finalidade encerrada |
| Aceite dos termos (data/versão) | enquanto a conta existir | — | Prova do consentimento |
| Auditoria (`auditoria`) | **12 meses**, por limpeza **manual** (seção 4; não há rotina automática) (mínimo legal de 6 meses para registros de acesso — Marco Civil, art. 15) | `aud_criado_em` | Segurança e investigação. Sem dados pessoais diretos |
| Backups | **30 dias** (diário) + **12 meses** (mensal, se adotado) | data do backup | Ver `politica-de-backup.md` |
| E-mails de convite/redefinição | tokens expiram em 24 h (convite) e 1 h (redefinição); guardados apenas como hash | expiração | Minimização |

## 3. Regra de anonimização

Quando o prazo vence — ou o titular pede (art. 18, IV/VI) e não há impedimento legal — o dado pessoal é **substituído de forma irreversível**:

| Titular | O que muda | O que permanece |
|---|---|---|
| Cliente | nome → "Titular anonimizado"; CPF/RG → `ANON-<aleatório>`; e-mail e telefone residencial → nulos; telefone → `00000000000`; marcado `anonimizadoEm`; sai das listagens | eventos, orçamentos, valores e documentos vinculados (obrigação legal) |
| Funcionário | nome, e-mail, telefones; a conta de login vinculada é anonimizada, sem senha e com sessões revogadas | escalas e presenças (sem identificação) |
| Fornecedor | nome, e-mail → `anon-<aleatório>@anonimizado.invalid`, CNPJ → `ANON-<aleatório>`, telefone | histórico |
| Convidado | nome, telefone nulo; token do QR trocado (convite deixa de valer) | quantidades (estatística do evento) |

**Impedimentos:** o sistema recusa (HTTP 409) anonimizar titular com **evento futuro ou em andamento** ativo, e funcionário com **conta de gerente**.
No purge, esses casos são apenas contados e reavaliados na execução seguinte.

## 4. Como executar o purge

```bash
cd backend
npm run purge:retencao                 # SIMULAÇÃO (padrão): só lista quantos seriam anonimizados
npm run purge:retencao -- --executar   # aplica de verdade (irreversível)
```

* **Nunca roda automaticamente.** Rotina sugerida: mensal, pelo responsável de TI — primeiro a simulação, conferir os números, depois `--executar`.
* Ajuste fino: `RETENCAO_DIAS` e `RETENCAO_CONVITES_DIAS` (mínimo 30 dias, para evitar erro de digitação).
* Cada anonimização grava na tabela `auditoria` (`retencao.titular.anonimizado`), sem dados pessoais.
* Faça **backup antes** de executar.

### Limpeza da auditoria (manual)

O purge não apaga registros de `auditoria`. Anualmente (ou mensalmente), após backup, remova o que passou de 12 meses:

```sql
DELETE FROM auditoria WHERE aud_criado_em < NOW() - INTERVAL '12 months';
```

## 5. Revisão

Revisar esta política anualmente ou quando a lei mudar. Responsável: `[NOME DO ENCARREGADO]`.
