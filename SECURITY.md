# Política de Segurança

## Como reportar uma vulnerabilidade

> **ATENÇÃO (mantenedor): o contato abaixo é um PLACEHOLDER (`EXEMPLO.com.br`). Substitua por um e-mail real e habilite o *Private Vulnerability Reporting* do repositório antes de publicar.**

Não abra uma issue pública. Envie o relato em particular para
**seguranca@EXEMPLO.com.br** (placeholder: substitua pelo contato real antes de publicar)
ou use "Report a vulnerability" na aba *Security* do repositório (GitHub Private Vulnerability Reporting).

Inclua: descrição, passos para reproduzir, impacto estimado, versão/commit afetado e, se possível, prova de conceito.
Não inclua dados reais de clientes.

## Escopo

Em escopo: API (`backend/`), frontend (`frontend/`), configuração Docker/nginx e scripts de banco deste repositório.
Fora de escopo: engenharia social, DoS volumétrico, vulnerabilidades em dependências já sem exploração
possível no projeto, serviços de terceiros (hospedagem, e-mail) e o app mobile (repositório separado).

## Prazos (SLA)

| Etapa | Prazo |
|---|---|
| Confirmação de recebimento | até 3 dias úteis |
| Triagem e classificação de severidade | até 7 dias úteis |
| Correção de severidade crítica/alta | até 30 dias |
| Correção de severidade média/baixa | próxima release planejada (até 90 dias) |

Pedimos divulgação coordenada: aguarde a correção ou 90 dias antes de divulgar publicamente.

## Recompensas

Este projeto não oferece programa de recompensa (bug bounty); agradecemos o crédito público, se desejado.

## Versões suportadas

Apenas a branch `main` recebe correções de segurança.

## Dados pessoais

Se o incidente envolver dados pessoais (LGPD), o plano de resposta e o prazo de comunicação à ANPD
seguem a documentação em `docs/lgpd/` (quando disponível).
