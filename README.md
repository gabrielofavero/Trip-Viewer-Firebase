![alt text](https://i.imgur.com/jm7wA0u.png)

# Tarefas

- 🐞: Bug
- 🏆: Feature
- 📈: Improvement
- ⚔️: Epic
- 🚦: Bloqueado
- ❓: Sem solução aparente

## Doing

- 🐞 Corrigir carregamento problemático de destino

## To-Do

### Prioridade Alta

- 🐞 Corrigir erros de CSS causados por unificação de CSSs de edição
- 🏆 Adicionar opção de arrastar accordions (Mobile);
- 🏆 Criar boxes de visualização
  - Hospedagens, Transportes;
  - Inspirar em Booking / Hotéis.com / Skyscanner / Airbnb
- 📈 Ícone Customizado
  - Verificar se é possível;
- 📈 Bloqueio upload
  - Já está parcialmente implementado
- ⚔️ Melhorias Back-End
  - Código duplicado, Code smells e otimizações (Implementar Sonar);
  - Verificar viabilidade e, se possível, implementar React.js

### Prioridade Média

- 📈 Tornar módulo de programação mais personalizável;
  - Incluir Horário;
  - Permitir adicionar itens
- 📈 Tornar módulo de transporte mais automatizado
  - Se user clicou em volta e não há dados, reverte tudo da ida
- 🏆 Adicionar opções re re-ordenação de destinos
  - Na tela de edição e viagens;
  - Ordenação por nota e por nome (↑↓);
- 📈 Melhorar listas do index;
  - Ordenar por data (crescente) em viagens;
  - Adicionar Viagens anteriores em viagens;
  - Ordernar por data de atualização em Destinos e Listagens
- 🏆 Criar botões triplos no modal quando salvar
  - Reeditar (sem fundo)
  - Home (cinza)
  - Visualizar (roxo);
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

### Prioridade Baixa

- 🐞 O loading em viagens não está pegando a cor customizada;
- 🐞 Ao fazer o switch de visibilidade dentro de um lightbox, não é mantido ao sair;
  - Colocar booleano no método de switch se é um lightbox;
  - Salva localmente;
  - Ao fechar lightbox, verifica a variável, aplica e a limpa
- 🐞 Botão de "transportation" em viagem.html não está deselecionando corretamente;
- 🏆 Criar Keypoints personalizáveis;
- 📈 Validar inputs de links;
  - URLS;
  - Emojis (Atualmente apaga carateres inválidos. Verificar se pode de fato bloquear de aparecer no input)
- 📈 Centralizar demo-box nas telas de edição quando em modo tablet;
- ⚔️ Migrar Projeto para outro domínio;
- 🏆 Consertar gráfico de cities (está estático no viagens.html);
- 🏆 Animações em todo o site;
- 🐞 Nem todos os hrefs estão indo para as categorias (telas de edição);
- 🏆 Adicionar mensagem customizada para erro no upload de imagens.

## Done

### Março 2024

- 🐞 Corrigir bug de login no safari (provavelmente relacionado com animação no index);
- 🏆 Adicionada opção de arrastar accordions (Desktop);
- 🐞 Corrigido ":" quando título não é preenchido
- 🐞 Corrigir problema no carregamento de lineup

### Fevereiro 2024

- 🏆 Mini melhoria de front mobile
- 🏆 Adicionada forma de deletar passeios / viagens
- 🏆 Criado Módulo de Galeria
- 🐞 Dados estavam se perdendo no load do editar-viagem quando o user não deixava o dado ativo
- 🐞 Ajustada posição do night mode em editar-viagem e editar-passeio
- 🏆 Colocada seta de voltar em editar-viagens e editar-passeios
- 🐞 Corrigido Título de modal desformatado
- 🏆 Adicionada Transparência em background mobile
- 🏆 Reeditar agora não retoma a home caso tenha dado erro no salvamento
- ⚔️ Testagem Geral e bug fixes
- 📈 Condensados CSSs de editar-viagem e editar-passeio em CSSs únicos (editar.css e editar-dark.css)
- 📈 Validar Inputs em Adicionar Passeio (Remover os que já foram preenchidos)
- ⚔️ Passeios renomeado para Destinos
- 🐞 Link de transporte não deveria ser obrigatório
- 🐞 Imagem de meio de transporte não carregou corretamente (Exemplo: Lolla 2024)
- 🏆 Criar Função de Listas de Destinos
- 🏆 Migrar Lineup para Viagens (Remover de Destinos)
- 🐞 Fazer título da imagem também mudar no accordeon
- 🏆 Adicionar animações no index.html;

### Janeiro 2024

- ⚔️ Migração do Projeto para Plano Spark;
- 🏆 Limitação do tamanho de upload + forma no backend para deixar mais seguro;
- 🐞 Correção de Loading no index finalizando antes de carregar a lista de viagens/passeios;
- 🏆 Criar opção de fornecer link de imagem ao invés de upload;
- 🏆 Adicionar suporte a links personalizáveis;
- 🏆 Implementar Set para links personalizáveis;
- 🏆 Implementar modo ativo/inativo em links, imagens e cores para não perder os dados do user caso ele só queira mudar a exibição.
- 📈 Redução do CSS em modo escuro
- 📈 Editada caixa de perfil no index para tratar strings muito longas;
- 🐞 Ajustar Links para a home (Apenas o texto tripviewer é clicável em algumas páginas. Falta o logo)

### Dezembro 2023

- 🐞 Consertada posição do select de transporte de editar-viagem;
- 🏆 Criadas funções de front-end para edição de viagens e passeios;
- 🏆 Criado sistema de imagens;
- 🏆 Implementado compartilhamento de viagens via botão no viagem.html.
- 🏆 Implementado get de imagens em viagem.html;
- 🏆 Implementados bloqueios de edição de viagens e passeios;
- 🏆 Night Mode interativo do user;
- 📈 Linkado e validado funções de back-end para edição de viagens e passeios;
- ⚔️ Otimizado BD (simplificar estrutura);
- ⚔️ Security Overhaul.

### Novembro 2023

- 📈 Automatizadas cores tema definidas pelo usuário;
- 🐞 Corrigido bugs do modo escuro;
- 🏆 Criada Página de Login;
- 🏆 Criada Página de Usuário logado;
- 🏆 Criado sistema de compartilhamento de viagens via link (URL do viagem.html e botão no index.html);
- 🏆 Criada funcionalidade "Minhas Viagens";
- 🏆 Criada página de edição/criação de viagens;
- 🏆 Criada página de edição/criação de passeios;
- 🏆 Criada página de configurações;
- 🏆 Criadas funções de front-end para o index.html;

### Outubro 2023

- 🏆 Migração de 'Transporte' ao Firestore;
- 🏆 Criação de artes de transporte / hospedagem;
- 🏆 Migração de Jsons de configuração ao Firestore;
- 🏆 Migração de 'Hospedagem' ao Firestore;
- 📈 Remoção de métodos descontinuados;
- 🏆 Migração de  'Resumo'(Keypoints) ao Firestore;
- 🏆 Criação de tratamento para falha de conexão com o banco de dados;
- 🏆 Inserção de calendário dinâmico (swiper);
- 🐞 Bug Fixes diversos;
- 🏆 Logo Interativo de acordo com a cor definida pelo usuário;
- 🏆 Criado esqueleto para a Home Page (Login);
- 🐞 Corrigido bugs do modo escuro;
- 🏆 Inserção de autenticação no back-end e front-end;

### Setembro 2023

- 🏆 Migração de 'Passeios' ao Firestore;
- 🏆 Migração de 'Programação' ao Firestore;

### Anteriormente

- ⚔️ Criação de Git do projeto;
- ⚔️ Criação de projeto no Firebase;
- ⚔️ Criação de banco de dados Firestore;
- ⚔️ Importação de HTML, CSS e JS do projeto estático;
- ⚔️ Desenvolvimento de estrutura básica do back-end via Cloud Functions (NodeJS com TypeScript);
- ⚔️ Criação de funções de leitura principais no back-end (get.ts);

## Cannot Reproduce

- 🐞 Corrigir playlist do spotify não carregando
- 🐞 Ícone do user não carrega corretamente no primeiro login
