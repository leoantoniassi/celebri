# Plano de Resposta a Incidentes de Segurança

> **Modelo — requer revisão jurídica.** Prazos de comunicação devem ser confirmados com o advogado/DPO e a norma ANPD vigente na data do incidente.

## 1. Quando usar

Qualquer evento que comprometa **confidencialidade, integridade ou disponibilidade** de dados pessoais: acesso indevido ao banco/painel, vazamento de
planilha ou backup, perda de celular com sessão aberta, envio de e-mail ao destinatário errado, ransomware, conta de gerente comprometida, falha que
exponha dados de outro buffet (quebra de isolamento entre empresas).

## 2. Responsáveis

| Papel | Responsabilidade | Nome / contato |
|---|---|---|
| **Coordenador do incidente** (gerente geral) | decide contenção e comunicações | `[NOME]` — `[TELEFONE]` |
| **Encarregado (DPO)** | avalia risco, redige/envia comunicação à ANPD e aos titulares | `[NOME]` — `[E-MAIL DO ENCARREGADO]` |
| **Responsável técnico (TI)** | contenção, investigação, restauração | `[NOME]` — `[TELEFONE]` |
| **Jurídico** | enquadramento legal e revisão dos comunicados | `[NOME/ESCRITÓRIO]` |

## 3. Fluxo e prazos (marcar horário de cada passo)

| # | Etapa | Meta | O que fazer |
|---|---|---|---|
| 1 | **Detecção e registro** | imediato | Quem percebeu avisa o coordenador e o DPO. Abrir registro (data/hora, quem, o quê, como foi descoberto). Guardar evidências; não apagar logs. |
| 2 | **Contenção** | até 4 h | Revogar acessos: redefinir senhas (a troca de senha/suspensão da empresa já derruba sessões — `tokenVersion`), trocar `JWT_SECRET` se houver suspeita de vazamento do segredo (derruba **todas** as sessões), trocar credenciais de banco/SMTP, isolar servidor, bloquear IP, remover arquivo exposto. Suspender a empresa afetada se necessário (`PATCH /api/empresas/:id/status`). |
| 3 | **Investigação** | até 24–48 h | Consultar a tabela `auditoria` (logins, acessos a documentos, exportações), logs do servidor/proxy e do banco. Descobrir: quais dados, de quais titulares, quantos, desde quando, vetor de ataque. |
| 4 | **Avaliação de risco** | até 48 h | Há **risco ou dano relevante** aos titulares (art. 48)? Considere: volume, categoria (CPF, telefone, documentos/contratos), se os dados estavam legíveis, se envolve crianças, possibilidade de fraude/discriminação/constrangimento. Registrar a decisão e a justificativa. |
| 5 | **Comunicação à ANPD** (se houver risco/dano relevante) | **3 dias úteis** a partir do conhecimento (Resolução CD/ANPD nº 15/2024 — confirmar vigência) | Enviar pelo canal oficial da ANPD. Conteúdo mínimo: descrição da natureza dos dados, titulares afetados, medidas técnicas, riscos, motivos de eventual demora, medidas adotadas/a adotar, contato do DPO. Complementar se faltarem informações. |
| 6 | **Comunicação aos titulares** (se houver risco/dano relevante) | mesmo prazo, em **prazo razoável** (art. 48) e em linguagem clara | E-mail/telefone, com o modelo abaixo. Se for um buffet cliente da plataforma, o provedor (operador) comunica o controlador **imediatamente** e o controlador comunica ANPD/titulares. |
| 7 | **Erradicação e recuperação** | conforme o caso | Corrigir a causa; restaurar de backup íntegro se houver perda/corrupção (seção 5); reaplicar anonimizações pendentes; monitorar reincidência por 30 dias. |
| 8 | **Pós-incidente** | até 15 dias | Relatório final (linha do tempo, causa raiz, impacto, lições). Atualizar controles, treinar equipe e revisar este plano. Guardar o registro por 5 anos. |

## 4. Modelo de comunicado ao titular

> **Assunto:** Comunicado de incidente de segurança — `[NOME DA EMPRESA]`
>
> Prezado(a) `[NOME]`,
>
> Informamos que, em `[DATA]`, identificamos um incidente de segurança que afetou `[descrever de forma simples]`.
> **Dados envolvidos:** `[ex.: nome, telefone, e-mail]`. **Não foram afetados:** `[ex.: senhas, dados de pagamento]`.
> **O que já fizemos:** `[medidas de contenção]`. **Riscos possíveis:** `[ex.: contatos indevidos, tentativas de golpe]`.
> **O que recomendamos:** `[ex.: desconfie de mensagens pedindo dados ou pagamentos; não clique em links suspeitos]`.
> Comunicamos também a Autoridade Nacional de Proteção de Dados (ANPD).
> Dúvidas: `[NOME DO ENCARREGADO]` — `[E-MAIL DO ENCARREGADO]` — `[TELEFONE]`.

## 5. Restauração

1. Preservar uma cópia forense do estado atual antes de restaurar (se possível).
2. Escolher o backup **anterior** ao incidente e íntegro (`scripts/verificar-backup.sh arquivo`).
3. Restaurar **primeiro em banco novo**: `scripts/restore.sh --arquivo <dump> --banco celebri_restaurado`; validar dados e a aplicação contra ele.
4. Só então promover (apontar `DB_NAME`) ou sobrescrever produção com `--confirmar` (pede confirmação explícita).
5. Reaplicar o que foi feito depois do backup: anonimizações e exclusões registradas em `auditoria` (`lgpd.titular.anonimizado`, `retencao.titular.anonimizado`) — **não reintroduza dados de quem pediu eliminação**.
6. Trocar segredos e forçar novo login (`tokenVersion`/`JWT_SECRET`). Documentar a restauração.

Detalhes e rotina de teste: `politica-de-backup.md`.

## 6. Registro de incidentes (modelo)

| Data | Descrição | Dados/titulares | Risco relevante? | ANPD comunicada (data) | Titulares comunicados (data) | Ações | Responsável |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 7. Testes do plano

Simulação (*tabletop*) **semestral**: escolher um cenário (ex.: planilha de convidados enviada ao destinatário errado), percorrer o fluxo e anotar o tempo gasto em cada etapa.
