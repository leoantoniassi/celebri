# Política de Privacidade

> **Modelo — requer revisão jurídica antes do uso.** Versão dos termos/política: **1.0** · Vigência: `[DATA]`

**Controlador dos dados:** `[NOME DA EMPRESA]`, CNPJ `[CNPJ]`, `[ENDEREÇO]`.
**Encarregado (DPO):** `[NOME DO ENCARREGADO]` — `[E-MAIL DO ENCARREGADO]`.

Esta política explica como o buffet `[NOME DA EMPRESA]` ("nós") trata dados pessoais no sistema Celebri, em conformidade com a
Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD). O fornecedor da plataforma Celebri atua como **operador**, tratando os dados
em nosso nome e segundo nossas instruções.

## 1. Dados que coletamos, por categoria

| Categoria | Dados | Origem |
|---|---|---|
| **Clientes** (contratantes) | nome, CPF/RG, e-mail, telefone(s); eventos, orçamentos e documentos/contratos vinculados | informados pelo próprio cliente ou pela nossa equipe |
| **Funcionários** | nome, e-mail, telefone(s), função, escalas, confirmação e check-in em eventos; conta de acesso ao aplicativo | informados por nós/por você |
| **Fornecedores** | nome (ou razão social), CNPJ, e-mail, telefone, categoria | informados por nós/pelo fornecedor |
| **Convidados** | nome, telefone (opcional), quantidade de pessoas do convite, entradas registradas na portaria (QR code) | informados pelo contratante do evento ou pela nossa equipe |
| **Usuários do sistema** (gerentes/operadores) | nome, e-mail, papel de acesso, senha (guardada apenas como *hash*), data/versão do aceite dos termos | informados no cadastro/convite |
| **Registros (logs)** | data/hora, IP, ação realizada (login, troca de senha, acesso a documento, exportação/anonimização) e identificador interno da conta — **sem** e-mail, CPF, telefone ou senha | gerados automaticamente |

Não coletamos dados pessoais sensíveis (art. 5º, II) nem tratamos dados identificados de crianças. Se o nome de um menor constar numa lista de
convidados, o tratamento ocorre no melhor interesse do menor e com o consentimento do responsável (art. 14), dado ao contratante do evento.

## 2. Finalidades e bases legais (art. 7º)

| Categoria | Finalidades | Base legal |
|---|---|---|
| Clientes | elaborar orçamento, contratar e executar o evento, cobrar, emitir documentos fiscais, atender solicitações | **V** (execução de contrato e procedimentos preliminares); **II** (obrigações fiscais/legais); **VI** (exercício regular de direitos em processos) |
| Funcionários | escalar equipe, comunicar convocações, controlar presença, obrigações trabalhistas e previdenciárias | **V** (contrato de trabalho/prestação de serviço); **II** (obrigação legal); **IX** (legítimo interesse — segurança e organização do evento) |
| Fornecedores | contratar, pagar, comunicar | **V**; **II** (fiscal/contábil) |
| Convidados | organizar a lista do evento, controlar a entrada (segurança) e enviar o convite | **IX** (legítimo interesse do buffet e do contratante na organização e segurança do evento), após informar o convidado (ver `termo-de-uso-e-consentimento.md`). Quando o dado for opcional (telefone p/ WhatsApp), pode-se usar **I** (consentimento) |
| Usuários do sistema | autenticar, controlar permissões, proteger contas | **V** e **IX** (segurança); **I** para o aceite dos termos |
| Logs de acesso e auditoria | segurança, prevenção a fraudes, investigação de incidentes, atender à lei | **II** (Marco Civil da Internet, art. 15) e **IX** |

Não vendemos dados pessoais nem os usamos para publicidade de terceiros.

## 3. Com quem compartilhamos

* **Provedor de e-mail (SMTP):** enviamos convites de acesso, códigos de primeiro acesso e redefinição de senha pelo servidor SMTP configurado
  por `[NOME DA EMPRESA]`. O e-mail do destinatário e o texto da mensagem trafegam por esse provedor.
* **WhatsApp (link `wa.me`):** ao usar o botão "enviar convite pelo WhatsApp", o sistema abre o WhatsApp do usuário com o telefone do convidado e uma
  mensagem; o envio e o tratamento posterior passam a seguir a política do WhatsApp/Meta.
* **Provedor de hospedagem/nuvem e de backup:** `[PROVEDOR]`, como operador, para armazenar o sistema e as cópias de segurança.
* **Autoridades e Poder Judiciário**, quando exigido por lei ou ordem.
* **Contador/assessoria fiscal:** `[SE APLICÁVEL]`, para cumprir obrigações fiscais.

Transferência internacional (hospedagem/e-mail fora do Brasil): `[INFORMAR PAÍS/PROVEDOR E GARANTIAS — art. 33]`.

## 4. Por quanto tempo guardamos

Guardamos os dados pelo tempo necessário às finalidades acima e aos prazos legais. Resumo (detalhes em `politica-de-retencao.md`):
cadastros excluídos são anonimizados após 5 anos; convidados, 180 dias após o evento; registros de auditoria, 12 meses; dados fiscais, pelo prazo legal.
A anonimização por prazo é executada por rotina operada pelo responsável de TI (não é instantânea ao vencer o prazo), e arquivos de documentos enviados são removidos manualmente ao fim do prazo.
Depois disso, **eliminamos ou anonimizamos** os dados.

## 5. Seus direitos (art. 18)

Você pode solicitar, a qualquer tempo e mediante requisição: **(I)** confirmação de que tratamos seus dados; **(II)** acesso; **(III)** correção;
**(IV)** anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade; **(V)** portabilidade;
**(VI)** eliminação dos dados tratados com consentimento; **(VII)** informação sobre com quem compartilhamos; **(VIII)** informação sobre a
possibilidade de não consentir e suas consequências; **(IX)** revogação do consentimento. Também pode peticionar à ANPD.

**Como exercer:** envie e-mail para `[E-MAIL DO ENCARREGADO]` identificando-se (podemos pedir um documento para evitar fraudes). Respondemos em até
**15 dias** (art. 19, II). Internamente, o gerente atende usando a exportação (`/api/lgpd/titulares/:tipo/:id/exportar`) e a anonimização
(`/api/lgpd/titulares/:tipo/:id/anonimizar`) do sistema.

**Limites:** não podemos eliminar dados que a lei nos obriga a manter (por exemplo, registros fiscais e contratuais — art. 16, I) nem enquanto
houver evento futuro contratado; nesses casos, informamos o motivo e anonimizamos o restante.

## 6. Segurança

Adotamos medidas técnicas e administrativas proporcionais ao risco: autenticação com senha forte (hash bcrypt) e sessão com expiração e revogação;
limite de tentativas e bloqueio temporário de contas; separação dos dados por empresa (multi-tenant); controle de papéis (gerente, operador,
equipe de campo); acesso restrito a documentos; registro de ações sensíveis; HTTPS; cabeçalhos de segurança; backups periódicos (criptografados quando a senha de backup está configurada);
teste de restauração. Em caso de incidente, seguimos o `plano-de-resposta-a-incidentes.md` e comunicamos a ANPD e os titulares nos termos do art. 48.

## 7. Cookies e armazenamento local

O sistema usa o armazenamento do navegador (token de sessão e preferência de tema) apenas para funcionar; não usa cookies de publicidade.

## 8. Alterações

Podemos atualizar esta política. A versão vigente consta no topo; mudanças relevantes serão comunicadas e, quando necessário, será pedido novo aceite.

## 9. Contato

`[NOME DO ENCARREGADO]` · `[E-MAIL DO ENCARREGADO]` · `[TELEFONE]`
