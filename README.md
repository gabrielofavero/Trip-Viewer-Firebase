![alt text](https://i.imgur.com/vejNzOv.png)

# Tarefas

- 🐞: Bug
- 🏆: Feature
- 📈: Improvement
- ⚔️: Epic
- 🚦: Bloqueado
- ❓: Sem solução aparente

## Doing

- 📈 Bloqueio upload / Melhoria de segurança;

  - Atualizar Regras Storage
  - Criar sistema de permissões
  - Validar / Consertar fluxo de upload
  - Consertar função de checar e apagar
  - Consertar apagar tudo (viagem/listagem)
  - implementar em listagens
  - Adaptar em viagens
- 🏆 Criação de boxes de visualização;

  - Hospedagens, Transportes;
  - Inspirar em Booking / Hotéis.com / Skyscanner / Airbnb

## To-Do

### Prioridade Alta

- 🏆 Criação de opção de arrastar accordions (Mobile);
- 📈 Ícone Customizado em viagens.html;
  - Verificar se é possível;
- 🐞 Correção de dados de lineup não serem salvos se desabilitado

### Prioridade Média

- 📈 Melhoria de tornar módulo de programação mais personalizável;
  - Incluir Horário;
  - Permitir adicionar itens
- 📈 Melhoria de tornar módulo de transporte mais automatizado
  - Se user clicou em volta e não há dados, reverte tudo da ida
- 🏆 Criação de opções re re-ordenação de destinos
  - Na tela de edição e viagens;
  - Ordenação por nota e por nome (↑↓);
- 📈 Melhoria de listas do index;
  - Ordenar por data (crescente) em viagens;
  - Adicionar Viagens anteriores em viagens;
  - Ordernar por data de atualização em Destinos e Listagens
- ⚔️ Implementação: Lista de desejos;
  - Procurar template na web e aplicar (colocar fonte nos créditos)
- ⚔️ Implementação: Gastos;
  - Procurar template na web e aplicar (colocar fonte nos créditos)
- ⚔️ Implementação: Lineup.
  - Categoria nova;
  - Lineup Dinâmico que abre modal;
  - Quadro de horários vibe App Lollapalooza;
- ⚔️ Novo Front-End: Destinos.html;
  - Guilherme já fez um template. Ver se está finalizado
- ⚔️ Novo Front-End: Viagens.html;
  - 🚦Aguardando template do Guilherme
- ⚔️ Novo Front-End: Index.html.
  - 🚦Aguardando template do Guilherme
- ⚔️ Melhorias Back-End.
  - Código duplicado;
  - Code smells;
  - Refatorações;
  - Sonarqube.

### Prioridade Baixa

- 🐞 Correção de loading em viagens não estar pegando a cor customizada;
- 🐞 Correção de, ao fazer o switch de visibilidade dentro de um lightbox, não ser mantido ao sair;
  - Colocar booleano no método de switch se é um lightbox;
  - Salva localmente;
  - Ao fechar lightbox, verifica a variável, aplica e a limpa
- 🐞 Correção de deseleção incorreta no botão de de "transportation" em viagem.html;
- 🏆 Criação de Keypoints personalizáveis;
- 📈 Validação de inputs de links;
  - URLS;
  - Emojis (Atualmente apaga carateres inválidos. Verificar se pode de fato bloquear de aparecer no input)
- 📈 Melhoria de centralização do elemento demo-box nas telas de edição quando em modo tablet;
- ⚔️ Migração de projeto para outro domínio;
- 🐞 Correção de gráfico de cities (está estático no viagens.html);
- 🏆 Criação de animações em todo o site;
- 🐞 Correção de erro de nem todos os hrefs estarem indo para as categorias (telas de edição);
- 🏆 Criação de mensagem customizada para erro no upload de imagens.

## Done

### Abril 2024

- 🐞 Erro de viagens públicas aparecendo como privadas (Rules do Firestore)
  - Solução Parcial (liberação de permissões)

### Março 2024

- 🐞 Correção de bug de login no safari (provavelmente relacionado com animação no index);
- 🏆 Criação de opção de arrastar accordions (Desktop);
- 🐞 Correção de ":" quando título não é preenchido;
- 🐞 Corrreção de problema no carregamento de lineup;
- 📈 Melhoria de performance em destinos.html;
  - Restringir carregamento de embeds para apenas quando o accordeon é aberto
- 🐞 Correção de ícone do TripViewer em destinos.html estar indo para a home e dentro do lightbox;
- 📈 Melhor organização de JavaScript relacionados a destinos.html
- 🐞 Correção de erros de CSS causados por unificação de CSSs de edição
- 🏆 Criação de botões triplos no modal quando salvar
  - Reeditar (sem fundo)
  - Home (cinza)
  - Visualizar (roxo);
- 🏆 Criação de mensagem de "Documento Privado"
- 🐞 Correção de embeds de destino.html estarem fora de ordem

### Fevereiro 2024

- 📈 Mini melhoria de front mobile;
- 🏆 Criação de forma de deletar passeios / viagens;
- 🏆 Criação de Módulo de Galeria;
- 🐞 Correção de dados se perdendo no load do editar-viagem quando o user não deixa o dado ativo;
- 🐞 Ajuste posição do night mode em editar-viagem e editar-passeio;
- 🏆 Criação de seta de voltar em editar-viagens e editar-passeios;
- 🐞 Correção de Título de modal desformatado;
- 📈 Melhoria de Transparência aumentada em background mobile;
- 📈 Melhoria de botão de Reeditar não retornar a home caso tenha dado erro no salvamento;
- ⚔️ Testagem Geral e bug fixes;
- 📈 Condensação de CSSs de editar-viagem e editar-passeio em CSSs únicos (editar.css e editar-dark.css);
- 📈 Validação de Inputs em Adicionar Passeio (Remover os que já foram preenchidos);
- ⚔️ Mudança de nome de "Passeios" para "Destinos";
- 🐞 Correção de Link de transporte não deveria ser obrigatório;
- 🐞 Correção de imagem de meio de transporte não carregando corretamente (Exemplo: Lolla 2024);
- 🏆 Criação de Função de Listas de Destinos;
- 🏆 Migração de Lineup para Viagens (Remover de Destinos);
- 🐞 Fazer título da imagem também mudar no accordeon;
- 🏆 Criação de animações no index.html.

### Janeiro 2024

- ⚔️ Migração do Projeto para Plano Spark;
- 🏆 Criação de Limitação do tamanho de upload + forma no backend para deixar mais seguro;
- 🐞 Correção de Loading no index finalizando antes de carregar a lista de viagens/passeios;
- 🏆 Criação de opção de fornecer link de imagem ao invés de upload;
- 🏆 Criação de suporte a links personalizáveis;
- 🏆 Criação de Set para links personalizáveis;
- 🏆 Criação de modo ativo/inativo em links, imagens e cores;
  - Para não perder os dados do user caso ele só queira mudar a exibição;
- 📈 Redução do CSS em modo escuro;
- 📈 Edição de caixa de perfil no index para tratar strings muito longas;
- 🐞 Ajuste de Links para a home.
  - Apenas o texto tripviewer é clicável em algumas páginas. Falta o logo.

### Dezembro 2023

- 🐞 Correção de posição do select de transporte de editar-viagem;
- 🏆 Criação de funções de front-end para edição de viagens e passeios;
- 🏆 Criação de sistema de imagens;
- 🏆 Criação de compartilhamento de viagens via botão no viagem.html.
- 🏆 Criação de get de imagens em viagem.html;
- 🏆 Criação de bloqueios de edição de viagens e passeios;
- 🏆 Implementação de Night Mode interativo do user;
- 📈 Melhoria de Linkar e validar funções de back-end para edição de viagens e passeios;
- ⚔️ Simplificação de estrutura do BD;
- ⚔️ Reimplementação da segurança da aplicação.

### Novembro 2023

- 📈 Automação de cores tema definidas pelo usuário;
- 🐞 Correção de bugs do modo escuro;
- 🏆 Criação de Página de Login;
- 🏆 Criação de Página de Usuário logado;
- 🏆 Criação de sistema de compartilhamento de viagens via link;
  - URL do viagem.html e botão no index.html;
- 🏆 Criação de funcionalidade "Minhas Viagens";
- 🏆 Criação de página de edição/criação de viagens;
- 🏆 Criação de página de edição/criação de passeios;
- 🏆 Criação de página de configurações;
- 🏆 Criação de funções de front-end para o index.html;

### Outubro 2023

- 🏆 Migração de 'Transporte' ao Firestore;
- 🏆 Criação de artes de transporte / hospedagem;
- 🏆 Migração de Jsons de configuração ao Firestore;
- 🏆 Migração de 'Hospedagem' ao Firestore;
- 📈 Remoção de métodos descontinuados;
- 🏆 Migração de  'Resumo'(Keypoints) ao Firestore;
- 🏆 Criação de tratamento para falha de conexão com o banco de dados;
- 🏆 Inserção de calendário dinâmico (swiper);
- 🐞 Correção de Bug Fixes diversos;
- 🏆 Implementação de Logo Interativo de acordo com a cor definida pelo usuário;
- 🏆 Criação de esqueleto para a Home Page (Login);
- 🐞 Correção de bugs do modo escuro;
- 🏆 Inserção de autenticação no back-end e front-end.

### Setembro 2023

- 🏆 Migração de 'Passeios' ao Firestore;
- 🏆 Migração de 'Programação' ao Firestore.

### Anteriormente

- ⚔️ Criação de Git do projeto;
- ⚔️ Criação de projeto no Firebase;
- ⚔️ Criação de banco de dados Firestore;
- ⚔️ Importação de HTML, CSS e JS do projeto estático;
- ⚔️ Desenvolvimento de estrutura básica do back-end via Cloud Functions (NodeJS com TypeScript);
- ⚔️ Criação de funções de leitura principais no back-end (get.ts).

## Cannot Reproduce

- 🐞 Correção de playlist do spotify não carregando;
- 🐞 Correção de erro de ícone do user não carregar corretamente no primeiro login;
- 🐞 Correção de erro de, ao editar a cor no passeio, ela não é salva globalmente;
