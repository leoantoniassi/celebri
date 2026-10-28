# DOCUMENTAÇÃO DO PROJETO CELEBRI

> **Como rodar o ambiente local:** copie `.env.example` para `.env`, ajuste
> `DB_PASS`/`JWT_SECRET` e rode o script de subida — sobe os containers,
> aplica as migrations pendentes e roda o seed em um único passo.
> - PowerShell (Windows): `.\dev-up.ps1`
>
> O script sobe o `docker-compose.yml` **junto com** o override
> `docker-compose.dev.yml`. No compose principal não publica Postgres nem API;
> o override de dev publica tudo em loopback (`127.0.0.1`).
>
> | Serviço   | Dev (Vite + HMR)                                    | Produção (nginx)                        |
> | :-------- | :-------------------------------------------------- | :-------------------------------------- |
> | Frontend  | `http://localhost:8080` → container `5173` (Vite)  | `http://localhost:8080` → container `8080` |
> | API       | `http://127.0.0.1:3001/api/health`                  | não publicada (só via proxy do nginx)   |
> | Postgres  | `127.0.0.1:5432`                                    | não publicada                           |
>
> A porta do frontend no host é configurável por `WEB_PORT` (padrão `8080`).
>
> ⚠️ O override de dev usa a tag YAML `!override` (Docker Compose **>= 2.24**)
> para **substituir** — e não somar — a lista de `ports` do compose principal.
> Sem essa tag o Compose concatena as duas listas, o frontend fica com duas
> bindings na mesma porta do host e a subida falha com
> `Bind for 127.0.0.1:8080 failed: port is already allocated`.

### Problemas comuns

**O código de primeiro acesso não chega no app Celebri Staff.**
O e-mail sai pela rota `POST /api/auth/primeiro-acesso/codigo`. As causas, em ordem de frequência:

1. **SMTP não configurado.** O log da API mostra
   `[Email] SMTP não configurado (EMAIL_HOST vazio)`. No dev, o serviço
   **Mailpit** (definido no `docker-compose.dev.yml`) resolve: o e-mail é
   capturado em `http://localhost:8025`. Em produção, defina `EMAIL_HOST`,
   `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` e `EMAIL_FROM` no `.env` — a API
   **não sobe** em `NODE_ENV=production` sem SMTP, porque sem ele o funcionário
   nunca consegue criar a senha.
2. **A flag de log não chega no container.** `DEV_LOG_CODIGO_ACESSO=true` só
   funciona se a variável for encaminhada ao serviço `backend` no
   `docker-compose.yml` e se `NODE_ENV` não for `production`. Com a flag
   ligada, o código aparece em `docker compose logs backend`.
3. **O SMTP está configurado mas falhou.** O log mostra
   `[Email] Falha ao enviar código: <código>` (credenciais recusadas, porta
   errada, provedor fora do ar). Para testar o caminho completo sem tocar no
   app (roda na máquina, não no container):
   `node backend/scripts/dev/test_email.js --enviar` — no dev ele usa o
   Mailpit local (`127.0.0.1:1025`).

## 1. Introdução

O _Projeto Celebri_ tem como objetivo desenvolver um sistema completo para a gestão de eventos e controle administrativo da equipe. A ausência de um fluxo centralizado para gerenciar contratos, informações de clientes e a escala de funcionários pode gerar desorganização e impactar a qualidade dos serviços prestados em eventos.

A solução proposta utiliza uma arquitetura web moderna para centralizar os dados, facilitando a comunicação com os clientes (incluindo integração ágil via WhatsApp), o armazenamento seguro de documentos e a categorização eficiente dos colaboradores envolvidos em cada evento.

---

### • Objetivos

#### Objetivo Geral

Desenvolver um sistema web funcional para gerenciar clientes, funcionários, documentos, orçamentos, estoque e informações de eventos, otimizando a organização e a comunicação da empresa.

#### Objetivos Específicos

- Cadastrar e gerenciar o fluxo de clientes, permitindo contato direto via WhatsApp.
- Categorizar e registrar funcionários com base em suas funções operacionais (ex: recreadores, cozinheiros, garçons).
- Fornecer um ambiente seguro para o armazenamento e gerenciamento de documentos e contratos.
- Centralizar todos os detalhes e requisitos específicos de cada evento realizado.
- Cadastrar e gerenciar o fluxo de orçamentos
- Cadastrar e gerenciar o fluxo de estoque

---

### • Metodologia

Para o desenvolvimento deste projeto, serão utilizadas as seguintes tecnologias e ferramentas:

- _Frontend:_ React ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB), Vite ![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat-square&logo=vite&logoColor=FFD62E), Tailwind CSS ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
- _Backend:_ Node.js ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white), Express ![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white), Sequelize (ORM) ![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=flat-square&logo=Sequelize&logoColor=white)
- _Banco de Dados:_ Banco de Dados Relacional PostgreSQL ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
- _Infraestrutura:_ Docker ![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=flat-square&logo=docker&logoColor=white), Kubernetes ![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square&logo=kubernetes&logoColor=white)
- _Testes de API:_ Postman ![Postman](https://img.shields.io/badge/Postman-FF6C37?style=flat-square&logo=Postman&logoColor=white)
- _Controle de Versão:_ Git ![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white) e GitHub ![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat-square&logo=github&logoColor=white)
- _Planejamento:_ [Trello [![Trello](https://img.shields.io/badge/Trello-0052CC?style=flat-square&logo=trello&logoColor=white)]](https://trello.com/invite/b/69b01781ad27faa14e8f2979/ATTI501c15076f0c0d4f15156e5725ece7a2E7879269/alegria)
- _UI/UX:_ [Figma [![Figma](https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white)]](https://www.figma.com/design/P2VpQg6U8RSotlZyeOTYm1/Projeto---Alegria?node-id=0-1&t=rr3EdkAum2STFL6b-1)
- _Metodologia de Desenvolvimento:_ Kanban — abordagem ágil baseada na visualização contínua do fluxo de trabalho, promovendo a eficiência e entregas contínuas.

---

## 2. Requisitos

### • Requisitos Funcionais

- _RF1:_ O sistema deve permitir o CRUD (Criação, Leitura, Atualização e Exclusão) de Clientes, registrando Nome, E-mail, RG/CPF e Número de telefone.
- _RF2:_ O sistema deve possuir uma função/botão de atalho para enviar mensagens diretamente para o WhatsApp do cliente cadastrado, funcionário cadastrado ou cliente associado a um evento.
- _RF3:_ O sistema deve permitir o CRUD de Funcionários, com campos para categorização por funções (ex: recreadores, cozinheiros, garçons, etc.).
- _RF4:_ O sistema deve possuir um módulo de gerenciamento de documentos que suporte upload físico e registros de links/URLs externas (como PDFs, imagens).
- _RF5:_ O sistema deve permitir o CRUD de Eventos, registrando data, local, funcionários alocados e informações gerais. Os status dos eventos devem seguir um ciclo de vida (`pendente`, `concluido`, `cancelado`), com transição automática para `concluido` após a data do evento passar.
- _RF6:_ O sistema deve permitir o CRUD de Orçamentos, registrando valor total, data de validade, status (pendente, aprovado, reprovado) e informações gerais.
- _RF7:_ O sistema deve permitir o CRUD de Locais de Eventos, com busca automática de endereço via CEP utilizando a API ViaCEP.
- _RF8:_ O sistema deve permitir o CRUD de Fornecedores, com categorização e botão de atalho rápido para contato via WhatsApp.
- _RF9:_ O sistema deve permitir o CRUD de Catálogos de Serviços/Buffet, registrando título, descrição, preço base e link externo.
- _RF10:_ O sistema deve possuir controle de usuários do sistema, permitindo o gerenciamento de contas administrativas divididas nos perfis de `gerente` e `operador`.
- _RF11:_ O sistema deve possuir um Dashboard Analítico com métricas rápidas (total de clientes, funcionários, próximos eventos e orçamentos pendentes) e três gráficos integrados (Sazonalidade de eventos, Uso da infraestrutura por local e Dispersão de convidados vs. custo).

### • Requisitos Não Funcionais

- _RNF1: Usabilidade_ — A interface (desenvolvida em React) deve ser intuitiva, responsiva e de fácil navegação para a equipe administrativa.
- _RNF2: Desempenho_ — As requisições (gerenciadas pelo Node.js) devem possuir tempo de resposta ágil, garantindo fluidez no uso diário.
- _RNF3: Integridade_ — O banco de dados relacional deve garantir a consistência das informações, relacionando corretamente clientes aos seus contratos e eventos.
- _RNF4: Segurança_ — Os dados sensíveis dos clientes (como RG/CPF e contratos) devem ser armazenados com proteção contra acessos não autorizados.

---

## 3. Modelo de Casos de Uso

![Diagrama de Casos de Uso](/img/casosUso.png)

### Casos de Uso de Alto Nível

- **Gerenciar Clientes:** Permite cadastrar, visualizar, editar e remover clientes do sistema.
- **Contatar via WhatsApp:** Ação rápida para abrir o chat do WhatsApp utilizando o número registrado no cadastro de clientes, funcionários ou eventos.
- **Gerenciar Funcionários:** Registra novos colaboradores e os categoriza por suas respectivas funções.
- **Gerenciar Documentos:** Permite o upload físico, armazenamento de URLs externas e gerenciamento de arquivos de contratos vinculados a clientes ou eventos.
- **Gerenciar Estoque:** Registra as entradas, saídas e controle de inventário de produtos e insumos, garantindo o controle com base na quantidade, unidade de medida e custos.
- **Gerenciar Orçamentos:** Permite criar, editar, enviar e acompanhar o status de orçamentos para potenciais eventos.
- **Gerenciar Eventos:** Cria e gerencia eventos, definindo data, local, convidados e associando o cliente responsável e a equipe alocada na escala.
- **Gerenciar Locais:** Permite o cadastro e controle de locais com autocompletar de endereços via CEP.
- **Gerenciar Fornecedores:** Controle de fornecedores com atalhos de contato rápido e categorização.
- **Gerenciar Catálogos:** Gerenciamento dos serviços e buffets ofertados pela empresa.
- **Gerenciar Usuários:** Permite que gerentes gerenciem as credenciais e permissões dos operadores e gerentes do sistema.
- **Visualizar Dashboard:** Apresentação gráfica e visual de sazonalidade, distribuição de eventos e estatísticas operacionais na página inicial.

---

## 4. Modelo do Banco de Dados Relacional

O banco de dados relacional é estruturado em **PostgreSQL 15**, com suporte nativo a arquitetura **SaaS Multi-tenant** (isolamento de registros por `emp_id`), chaves primárias em UUID e soft delete (`deletado_em`), garantindo rastreabilidade, consistência e total segurança jurídica (LGPD).

> **Empresas:** Armazena os buffets contratantes do SaaS White Label (nome, CNPJ, logotipo, cores institucionais e configurações de escala).

> **Usuários:** Armazena os usuários com controle de acesso por perfis (`gerente` e `operador`) e vínculo corporativo.

> **Clientes:** Armazena clientes contratantes de festas (Nome, E-mail, RG/CPF, Telefone).

> **Funcionários & Funções:** Armazena os colaboradores da equipe e suas funções operacionais vinculadas aos módulos do aplicativo Celebri Staff (`portaria`, `garcom`, `cozinha`).

> **Produtos & Categorias:** Armazena o inventário de itens disponíveis no estoque (custos, quantidades e unidade de medida).

> **Orçamentos:** Registra propostas financeiras comerciais com itens detalhados do estoque e status.

> **Eventos:** Registra eventos agendados, vinculados ao cliente, local e orçamento, consolidando contagem de convidados.

> **Escala:** Alocação de colaboradores em eventos com verificação de conflitos de horário, confirmação de presença e check-in operacional.

> **Convites:** Registro de convidados por evento com emissão de QR Code criptográfico dinâmico (com suporte a famílias e entradas parciais).

> **Mesas & Pedidos:** Mapeamento tátil de layout do salão e comandas eletrônicas emitidas por garçons para a cozinha com alertas de alergia alimentar.

> **Serviços de Evento:** Cardápio e cronograma de fornecimento com horário previsto.

> **Locais:** Salões e espaços de festas com endereço e capacidade máxima.

> **Fornecedores & Catálogos:** Parceiros de suprimentos e serviços ofertados aos clientes.

> **Auditoria:** Registro imutável de eventos de autenticação, acessos a dados e ações sob a LGPD.

![Diagrama do Banco de Dados Relacional](img/projeto_mais_alegria-diagrama-tabelas.png)

---

## 5. Diagrama de Relacionamentos (Entidade-Relacionamento)

O modelo físico segue a estrutura relacional padrão, utilizando tabelas interligadas por chaves primárias (PK) e estrangeiras (FK).

### Principais Relacionamentos

- **Clientes ↔ Orçamentos:** 1:N (Um cliente pode ter vários orçamentos associados, mas cada orçamento pertence a um único cliente).

- **Clientes ↔ Eventos:** 1:N (Um cliente pode contratar vários eventos, mas um evento específico pertence a um único cliente).

- **Orçamentos ↔ Eventos:** 1:N (Um evento pode opcionalmente herdar as informações de um orçamento previamente aprovado).

- **Clientes ↔ Documentos:** 1:N (Um cliente pode ter vários documentos/contratos gerais anexados ao seu perfil).

- **Eventos ↔ Documentos:** 1:N (Um evento pode ter arquivos e contratos específicos anexados a ele).

- **Eventos ↔ Funcionários:** N:M (Um evento possui vários funcionários alocados, e um funcionário pode trabalhar em vários eventos). Relacionamento resolvido através da tabela intermediária `escala`.

- **Eventos ↔ Produtos:** N:M (Um evento utilizará/consumirá vários produtos, e um produto pode ser utilizado em vários eventos). Relacionamento resolvido através da tabela intermediária `evento_produto`.

- **Orçamentos ↔ Produtos:** N:M (Um orçamento pode conter a previsão de vários produtos, e um produto pode constar em diversos orçamentos). Relacionamento resolvido através da tabela intermediária `orcamento_produto`.

---

## 6. Regras de Negócio (Principais)

### RN1: Cadastro Único

- Não será permitido o cadastro de dois clientes com o mesmo RG/CPF ou e-mail.
- Não será permitido o cadastro de dois funcionários com o mesmo e-mail.

### RN2: Alocação em Eventos

- Um funcionário não pode ser alocado em dois eventos que ocorram no mesmo dia (das 00h00 às 23h59).

### RN3: Gestão de Documentos

- Apenas usuários com perfil de "Gerente" podem excluir contratos já assinados e anexados ao sistema.
- O sistema deve aceitar formatos padronizados para documentos (ex: `.pdf`, `.jpg`, `.png`) ou referências via URLs externas.

### RN4: Controle de Público

- Quando o evento tiver mais de 50 pessoas na festa ou evento é necessário identificar o número de crianças, adultos e bebês.

---

## 7. Estudo de Viabilidade

### Viabilidade de Mercado

O setor de eventos (festas infantis, casamentos, confraternizações) exige alto nível de organização. A criação de um sistema próprio para o **Projeto Celebri** reduzirá falhas de comunicação, perda de contratos e conflitos de agenda, tornando a empresa mais ágil, profissional e competitiva no mercado.

### Viabilidade de Recursos

- **Humanos:** Desenvolvedores (Frontend React e Backend Node.js), Product Owner/Scrum Master para gerenciar as entregas e equipe de testes.
- **Tecnológicos:** React, Tailwind CSS, Node.js, Express, Sequelize, PostgreSQL, Docker, Postman para testes de API e Trello para gestão ágil.
- **Financeiros:** Custos focados em hospedagem em nuvem e horas de desenvolvimento, utilizando frameworks de código aberto que reduzem despesas com licenciamento.

### Viabilidade Operacional

O fluxo operacional se tornará muito mais intuitivo:

1. O cliente entra em contato e é cadastrado (com opção de acionamento rápido via WhatsApp).
2. Um orçamento é gerado no sistema.
3. Após a aprovação do orçamento, o evento é oficialmente criado e agendado.
4. O contrato em PDF é anexado ao perfil do cliente.
5. Funcionários são alocados no evento de acordo com a função necessária (recreadores, garçons, etc.).

### Conclusão

O projeto é altamente viável, pois resolve dores reais de gestão de eventos utilizando tecnologias de mercado consolidadas, seguras e escaláveis.

---

## 8. Regras de Negócio (Modelo Canvas)

![Modelo Canvas](img/modeloCanva.png)

### RN1: Acesso e Autenticação

- O sistema deve possuir níveis de acesso. Apenas usuários com perfil de "Gerente" podem gerenciar outros usuários, aprovar orçamentos, excluir clientes ou apagar documentos.

### RN2: Fluxo de Orçamentos e Eventos

- (Regra descontinuada: A vinculação obrigatória de orçamentos aprovados foi removida para simplificar o fluxo operacional).

### RN3: Alocação de Funcionários

- O sistema deve impedir a alocação de um mesmo funcionário em dois eventos distintos que ocorram no mesmo dia.
- O modal de criação de escala na visualização de detalhes do evento permite filtrar colaboradores por função operacional e exibe em formato checkbox somente os funcionários que estão disponíveis (que não estão escalados em nenhum outro evento naquele mesmo dia).

### RN4: Gestão de Contratos (Documentos)

- Todo evento deve estar atrelado a um contrato digitalizado ou link de acesso. O sistema deve aceitar extensões seguras e comuns, como `.pdf`, `.png` e `.jpg`.

---

## 9. Design & Identidade Visual

O design do **Projeto Celebri** une profissionalismo com uma estética moderna e acolhedora, com suporte pleno a **White Label** para buffets assinantes.

- **Marca Oficial Celebri:**
  - **Logo:** `logo-confetti.svg` (badge navy com "C" em gradiente e confetes).
  - **Paleta Institucional Oficial:**
    - 🔹 **Ciano (Primária/Destaque 1):** `#1CEAFF` | **RGB:** `28, 234, 255`
    - 🟣 **Magenta (Secundária/Destaque 2):** `#FF45FF` | **RGB:** `255, 69, 255`
    - 🌌 **Navy (Fundo/Superfície):** `#0E1A3A` | `#16254F`
    - 🎨 **White Label Dinâmico:** Buffets assinantes podem personalizar suas cores primárias e secundárias pelo painel web.
- **Tipografia Oficial:** **Plus Jakarta Sans** (títulos e headlines) e **Inter** (corpo de texto e dados operacionais).
- **Layout:** Totalmente responsivo no painel web (React + Tailwind CSS) e aplicativo móvel (.NET MAUI) integrado para a equipe de salão.

---

## 10. Protótipo

Acesse o design e protótipo completo no [Figma](https://www.figma.com/design/P2VpQg6U8RSotlZyeOTYm1/Projeto---Alegria?node-id=0-1&t=rr3EdkAum2STFL6b-1).

---

## 11. Aplicação

A aplicação será construída com uma arquitetura dividida: o Frontend dinâmico em **React** e o Backend robusto em **Node.js**. A comunicação entre eles ocorrerá via API RESTful. Para garantir a confiabilidade dos dados, todas as rotas (CRUD de clientes, eventos, etc.) serão testadas exaustivamente utilizando o **Postman** antes de serem integradas à interface. O fluxo de trabalho seguirá a metodologia **Kanban**, com as tarefas organizadas e monitoradas através de um quadro no **[Trello](https://trello.com/invite/b/69b01781ad27faa14e8f2979/ATTI501c15076f0c0d4f15156e5725ece7a2E7879269/alegria)**.

---

## 12. Considerações Finais

O sistema do **Projeto Celebri** centralizará as operações da empresa, substituindo planilhas soltas e pastas físicas por uma solução digital integrada. Com um banco de dados relacional bem estruturado e funcionalidades focadas na agilidade (como o atalho do WhatsApp e a gestão rápida de orçamentos), a equipe economizará tempo administrativo, podendo focar no que realmente importa: entregar eventos inesquecíveis aos seus clientes.

## 13. Módulo de Estatística Descritiva

Com base na amostragem de dados fictícios do banco de dados (20 registros de eventos e orçamentos), foram calculadas as seguintes estatísticas descritivas para apoiar o planejamento operacional do sistema:

### 13.1 Medidas de Tendência Central (Média, Mediana e Moda)
Foram selecionadas cinco variáveis principais (quatro quantitativas e uma qualitativa) para esta análise:

| Variável | Tipo | Média | Mediana | Moda | Tipo de Moda |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Qtd. Total de Pessoas** (`evt_qtd_pessoas`) | Quantitativa Discreta | 108,50 | 107,50 | N/A | Amodal |
| **Qtd. de Adultos** (`evt_qtd_adultos`) | Quantitativa Discreta | 86,50 | 87,50 | 70, 90, 100, 110 | Multimodal |
| **Qtd. de Crianças** (`evt_qtd_criancas`) | Quantitativa Discreta | 17,85 | 15,00 | 8, 15, 25 | Multimodal |
| **Valor Total Orçado** (`orc_valor_total`) | Quantitativa Contínua | R$ 5.737,90 | R$ 5.404,50 | N/A | Amodal |
| **Status do Evento** (`evt_status`) | Qualitativa Nominal | N/A | N/A | 'pendente' | Unimodal (freq. 11) |

#### Interpretação
* **Qtd. Total de Pessoas e Valor Orçado**: Apresentam distribuição amodal por serem variáveis contínuas ou de ampla variação, com médias de 108,50 pessoas e R$ 5.737,90 por orçamento, respectivamente.
* **Qtd. de Adultos e Crianças**: A distribuição é multimodal, mostrando tamanhos padrões recorrentes de grupos de convidados (especialmente de crianças, que se concentram em 8, 15 ou 25 convidados por festa).
* **Status do Evento**: O status 'pendente' é a moda da base, refletindo a grande quantidade de eventos em fase de planejamento e agendamentos futuros.

---

### 13.2 Medidas de Variabilidade e Dispersão
Foi conduzido um estudo de dispersão sobre três variáveis quantitativas:

| Variável | Média | Variância Amostral | Desvio Padrão Amostral | Coeficiente de Variação (CV) |
| :--- | :---: | :---: | :---: | :---: |
| **Qtd. Total de Pessoas** (`evt_qtd_pessoas`) | 108,50 | 1.797,63 | 42,40 pessoas | 39,08% |
| **Qtd. de Adultos** (`evt_qtd_adultos`) | 86,50 | 1.089,74 | 33,01 adultos | 38,16% |
| **Qtd. de Crianças** (`evt_qtd_criancas`) | 17,85 | 72,45 | 8,51 crianças | **47,68%** |

#### Análise do Coeficiente de Variação (CV)
* **Maior Variabilidade Relativa**: **Quantidade de Crianças (`evt_qtd_criancas`)** com **47,68%**. O público infantil varia substancialmente de evento para evento, apresentando menor homogeneidade.
* **Menor Variabilidade Relativa**: **Quantidade de Adultos (`evt_qtd_adultos`)** com **38,16%**. O público de adultos é o componente mais uniforme/estável no porte das festas contratadas.

---

### 13.3 Rol de Dados Brutos Utilizados

Os dados brutos coletados da semente inicial (`database/seed.sql`) do banco de dados e utilizados para todas as fórmulas e tabelas acima são:

1. **Quantidade Total de Pessoas (`evt_qtd_pessoas`)**:  
   `[150, 80, 120, 50, 200, 95, 60, 115, 130, 45, 175, 70, 105, 90, 140, 65, 85, 110, 160, 125]`

2. **Quantidade de Adultos (`evt_qtd_adultos`)**:  
   `[110, 65, 90, 40, 160, 75, 50, 95, 100, 35, 140, 60, 85, 70, 110, 55, 70, 90, 130, 100]`

3. **Quantidade de Crianças (`evt_qtd_criancas`)**:  
   `[35, 10, 25, 8, 30, 15, 10, 15, 25, 8, 30, 8, 15, 18, 25, 8, 12, 15, 25, 20]`

4. **Valor Total Orçado (`orc_valor_total`)**:  
   `[9225.00, 5426.00, 5725.00, 3368.00, 3339.00, 5356.00, 5383.00, 4042.00, 7947.00, 3546.00, 6028.00, 2232.00, 8889.00, 8479.00, 4415.00, 2975.00, 7400.00, 2689.00, 9864.00, 8430.00]`

5. **Status do Evento (`evt_status`)**:  
   `['pendente', 'concluido', 'pendente', 'pendente', 'pendente', 'pendente', 'cancelado', 'pendente', 'pendente', 'concluido', 'pendente', 'pendente', 'pendente', 'cancelado', 'cancelado', 'cancelado', 'cancelado', 'pendente', 'pendente', 'concluido']`

---


## 14. Referências Bibliográficas

- Documentação Oficial do React: https://pt-br.reactjs.org/
- Documentação Oficial do Node.js: https://nodejs.org/pt-br/docs/
- Documentação do Postman: https://learning.postman.com/docs/introduction/overview/
