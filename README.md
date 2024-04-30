![alt text](https://i.imgur.com/vejNzOv.png)

# Tarefas

### Legenda

| Ícone | Título  | Código | Total | Feitos | Pendentes |
| ------ | -------- | ------- | ----- | ------ | --------- |
| 🐞     | Bug      | B000    | 28    | 21     | 7         |
| 🏆     | Feature  | F000    | 48    | 42     | 6         |
| 📈     | Melhoria | M000    | 28    | 16     | 11        |
| ⚔️   | Épico   | E000    | 20    | 12     | 8         |

### Status

- 🚦: Bloqueado
- ❔: Sem solução aparente
- ❗️: Crítico

## Doing

- 📈 **M027:** Melhoria de responsividade das barras de viagem do index.html
- 📈 **M028:** Melhoria no carregamento do index.com para não exibir "Sem Viagens" quando o carregamento não tiver acabado
- 🏆 **F048:** Dynamic Select em editar-destinos.html

## To-Do

### Prioridade Alta

- ⚔️ **E020:** Criação de box de visualização de Hospedagens em viagens.html;
- 📈 **M023:** Melhorias no arrastamento de accordions (páginas de editar)
  - *Criação de opção de arrastar accordions (Mobile);*
  - *Desabilitar arrastamento quando accordion está aberto*

### Prioridade Média

- 🏆 **F046:** Firebase Firestore Rules no Front-End
- 📈 **M019:** Melhoria de tornar módulo de programação mais personalizável;
  - *Incluir Horário;*
  - *Permitir adicionar itens*
- 📈 **M020:** Melhoria de tornar módulo de transporte mais automatizado
  - *Se user clicou em volta e não há dados, reverte tudo da ida*
- 🏆 **F047:** Criação de opções de re-ordenação de destinos
  - *Na tela de edição e viagens;*
  - *Ordenação por nota e por nome (↑↓);*
- 📈 **M021:** Melhoria de listas (Minhas viagens, passeios e listas) do index.html;
  - *Ordenar por data (crescente) em viagens;*
  - *Adicionar Viagens anteriores em viagens;*
  - *Ordernar por data de atualização em Destinos e Listagens*
- ⚔️ **E014:** Implementação: Lista de desejos;
  - *Procurar template na web e aplicar (colocar fonte nos créditos)*
- ⚔️ **E015:** Implementação: Gastos;
  - *Procurar template na web e aplicar (colocar fonte nos créditos)*
- 📈 **M022:** Melhoria: Lineup.
  - *Categoria nova;*
  - *Lineup Dinâmico que abre modal;*
  - *Quadro de horários vibe App Lollapalooza;*
- ⚔️ **E016:** Novo Front-End: Destinos.html;
  - *Guilherme já fez um template. Ver se está finalizado*
- ⚔️🚦**E017:** Novo Front-End: Viagens.html;
  - *Aguardando template do Guilherme*
- ⚔️🚦 **E018:** Novo Front-End: Index.html.
  - *Aguardando template do Guilherme*
- ⚔️ **E019:** Melhorias JavaScript.
  - *Código duplicado;*
  - *Code smells;*
  - *Refatorações;*
  - *Sonarqube.*

### Prioridade Baixa

- 🐞 **B027:** Correção de dados de lineup não serem salvos se desabilitado
- 🐞 **B025:** Correção de, ao fazer o switch de visibilidade dentro de um lightbox, não ser mantido ao sair;
  - *Colocar booleano no método de switch se é um lightbox;*
  - *Salva localmente;*
  - *Ao fechar lightbox, verifica a variável, aplica e a limpa*
- 🐞 **B024:** Correção de deseleção incorreta no botão de de "transportation" em viagem.html;
- 🏆 **F043:** Criação de Keypoints personalizáveis;
- 📈 **M017:** Validação de inputs de links;
  - *URLS;*
  - *Emojis (Atualmente apaga carateres inválidos. Verificar se pode de fato bloquear de aparecer no input)*
- 📈 **M018:** Melhoria de centralização do elemento demo-box nas telas de edição quando em modo tablet;
- ⚔️ **E013:** Migração de projeto para outro domínio;
- 🐞 **B023:** Correção de gráfico de cities (está estático no viagens.html);
- 🏆 **F044:** Criação de animações em todo o site;
- 🐞 **B022:** Correção de erro de nem todos os hrefs estarem indo para as categorias (telas de edição);
- 🏆 **F045:** Criação de mensagem customizada para erro no upload de imagens.
- 📈 **M026:** Novo ícone de "Novo" destinos.html

## Done

### Abril 2024

- 🐞 **B021:** Erro de viagens públicas aparecendo como privadas (Rules do Firestore)
- 📈 **M013:** Bloqueio upload / Melhoria de segurança;
  - *Criação de sistema de permissões no banco e storage rules;*
  - *Exibição HTML interativa de acordo com a permissão*
  - *Sistema inteligente de uploads, com exclusão de imagens não utilizadas*
  - *Sistema de inserção de imagens customizadas de acordo com a página (hospedagens e galeria para o caso de editar-viagens)*
  - *Ajustes na página de viagem para receber a nova estrutura de imagem*
- 📈 **M014:** Melhorias editar-viagem
  - *Selects dinâmicos para que user possa escolher entre os dados já cadastrados (Galeria e Lineup);*
  - *Automações para facilitar preenchimento de dados e visualização;*
- 📈 **M015:** Melhoria em Destinos do viagens.html;
  - *Se houver uma quantidade ímpar de categorias, centraliza os itens (melhoria de visibilidade no desktop);*
  - *Se só houver destinos para uma cidade e só houver uma categoria, o título é ocultado*
- 🐞 **B020:** Correção de loading as vezes carregar eternamente;
- 🐞 **B019:** Correção de tamanho de botões de deleção em editar-x.html;
- ⚔️ **E012:** Criação de box de visualização de Transportes em viagens.html;
- 🏆 **F041:** Criação botão de compartilhar para viagens.html;
- 📈 **M016:** Refatoramento: utilizar método getID e otimizar arquivos de editar;
- 🏆 **F042:** Criar moeda customizável para Destinos
- 📈 **M025:** Novo ícone de "Novo" editar-destinos.html e destinos.html
- 🐞❗️**B028:** Correção de caregamento de listagens
- 🐞 **B026:** Correção de loading em viagens não estar pegando a cor customizada;
  - Aplicado, mas a cor só é exibida em loadings após o inicial;
  - A maior parte do loading é a para ter dados do Firestore. Só com eles é possível obter a cor customizada

### Março 2024

- 🐞 **B018:** Correção de bug de login no safari (provavelmente relacionado com animação no index);
- 🏆 **F038:** Criação de opção de arrastar accordions (Desktop);
- 🐞 **B017:** Correção de ":" quando título não é preenchido;
- 🐞 **B016:** Corrreção de problema no carregamento de lineup;
- 📈 **M011:** Melhoria de performance em destinos.html;
  - *Restringir carregamento de embeds para apenas quando o accordeon é aberto*
- 🐞 **B015:** Correção de ícone do TripViewer em destinos.html estar indo para a home e dentro do lightbox;
- 📈 **M012:** Melhor organização de JavaScript relacionados a destinos.html
- 🐞 **B014:** Correção de erros de CSS causados por unificação de CSSs de edição
- 🏆 **F039:** Criação de botões triplos no modal quando salvar
  - *Reeditar (sem fundo)*
  - *Home (cinza)*
  - *Visualizar (roxo);*
- 🏆 **F040:** Criação de mensagem de "Documento Privado"
- 🐞 **B013:** Correção de embeds de destino.html estarem fora de ordem

### Fevereiro 2024

- 📈 **M006:** Mini melhoria de front mobile;
- 🏆 **F032:** Criação de forma de deletar passeios / viagens;
- 🏆 **F033:** Criação de Módulo de Galeria;
- 🐞 **B012:** Correção de dados se perdendo no load do editar-viagem quando o user não deixa o dado ativo;
- 🐞 **B011:** Ajuste posição do night mode em editar-viagem e editar-passeio;
- 🏆 **F034:** Criação de seta de voltar em editar-viagens e editar-passeios;
- 🐞 **B010:** Correção de Título de modal desformatado;
- 📈 **M007:** Melhoria de Transparência aumentada em background mobile;
- 📈 **M008:** Melhoria de botão de Reeditar não retornar a home caso tenha dado erro no salvamento;
- ⚔️ **E010:** Testagem Geral e bug fixes;
- 📈 **M009:** Condensação de CSSs de editar-viagem e editar-passeio em CSSs únicos (editar.css e editar-dark.css);
- 📈 **M010:** Validação de Inputs em Adicionar Passeio (Remover os que já foram preenchidos);
- ⚔️ **E011:** Mudança de nome de "Passeios" para "Destinos";
- 🐞 **B009:** Correção de Link de transporte não deveria ser obrigatório;
- 🐞 **B008:** Correção de imagem de meio de transporte não carregando corretamente (Exemplo: Lolla 2024);
- 🏆 **F035:** Criação de Função de Listas de Destinos;
- 🏆 **F036:** Migração de Lineup para Viagens (Remover de Destinos);
- 🐞 **B007:** Fazer título da imagem também mudar no accordeon;
- 🏆 **F037:** Criação de animações no index.html.

### Janeiro 2024

- ⚔️ **E009:** Migração do Projeto para Plano Spark;
- 🏆 **F027:** Criação de Limitação do tamanho de upload + forma no backend para deixar mais seguro;
- 🐞 **B006:** Correção de Loading no index finalizando antes de carregar a lista de viagens/passeios;
- 🏆 **F028:** Criação de opção de fornecer link de imagem ao invés de upload;
- 🏆 **F029:** Criação de suporte a links personalizáveis;
- 🏆 **F030:** Criação de Set para links personalizáveis;
- 🏆 **F031:** Criação de modo ativo/inativo em links, imagens e cores;
  - *Para não perder os dados do user caso ele só queira mudar a exibição;*
- 📈 **M004:** Redução do CSS em modo escuro;
- 📈 **M005:** Edição de caixa de perfil no index para tratar strings muito longas;
- 🐞 **B005:** Ajuste de Links para a home.
  - *Apenas o texto tripviewer é clicável em algumas páginas. Falta o logo.*

### Dezembro 2023

- 🐞 **B004:** Correção de posição do select de transporte de editar-viagem;
- 🏆 **F021:** Criação de funções de front-end para edição de viagens e passeios;
- 🏆 **F022:** Criação de sistema de imagens;
- 🏆 **F023:** Criação de compartilhamento de viagens via botão no viagem.html.
- 🏆 **F024:** Criação de get de imagens em viagem.html;
- 🏆 **F025:** Criação de bloqueios de edição de viagens e passeios;
- 🏆 **F026:** Implementação de Night Mode interativo do user;
- 📈 **M003:** Melhoria de Linkar e validar funções de back-end para edição de viagens e passeios;
- ⚔️ **E007:** Simplificação de estrutura do BD;
- ⚔️ **E008:** Reimplementação da segurança da aplicação.

### Novembro 2023

- 📈 **M002:** Automação de cores tema definidas pelo usuário;
- 🐞 **B003:** Correção de bugs do modo escuro;
- 🏆 **F013:** Criação de Página de Login;
- 🏆 **F014:** Criação de Página de Usuário logado;
- 🏆 **F015:** Criação de sistema de compartilhamento de viagens via link;
  - *URL do viagem.html e botão no index.html;*
- 🏆 **F016:** Criação de funcionalidade "Minhas Viagens";
- 🏆 **F017:** Criação de página de edição/criação de viagens;
- 🏆 **F018:** Criação de página de edição/criação de passeios;
- 🏆 **F019:** Criação de página de configurações;
- 🏆 **F020:** Criação de funções de front-end para o index.html;

### Outubro 2023

- 🏆 **F003:** Migração de 'Transporte' ao Firestore;
- 🏆 **F004:** Criação de artes de transporte / hospedagem;
- 🏆 **F005:** Migração de Jsons de configuração ao Firestore;
- 🏆 **F006:** Migração de 'Hospedagem' ao Firestore;
- 📈 **M001:** Remoção de métodos descontinuados;
- 🏆 **F007:** Migração de  'Resumo'(Keypoints) ao Firestore;
- 🏆 **F008:** Criação de tratamento para falha de conexão com o banco de dados;
- 🏆 **F009:** Inserção de calendário dinâmico (swiper);
- 🐞 **B002:** Correção de Bug Fixes diversos;
- 🏆 **F010:** Implementação de Logo Interativo de acordo com a cor definida pelo usuário;
- 🏆 **F011:** Criação de esqueleto para a Home Page (Login);
- 🐞 **B001:** Correção de bugs do modo escuro;
- 🏆 **F012:** Inserção de autenticação no back-end e front-end.

### Setembro 2023

- 🏆 **F001:** Migração de 'Passeios' ao Firestore;
- 🏆 **F002:** Migração de 'Programação' ao Firestore.

### Anteriormente

- ⚔️ **E001:** Criação de Git do projeto;
- ⚔️ **E002:** Criação de projeto no Firebase;
- ⚔️ **E003:** Criação de banco de dados Firestore;
- ⚔️ **E004:** Importação de HTML, CSS e JS do projeto estático;
- ⚔️ **E005:** Desenvolvimento de estrutura básica do back-end via Cloud Functions (NodeJS com TypeScript);
- ⚔️ **E006:** Criação de funções de leitura principais no back-end (get.ts).
