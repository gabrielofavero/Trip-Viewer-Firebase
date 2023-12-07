![alt text](https://i.imgur.com/jm7wA0u.png)

# Tarefas

## Doing
- Linkar e validar funções de back-end para edição de viagens e passeios;


## To-Do
- Implementar get de imagens em viagem.html;
- Implementar bloqueios de edição de viagens e passeios;


## Done

### Semana 03/12/2023 - 09/12/2023
- Criadas funções de front-end para edição de viagens e passeios;
- Criado sistema de imagens;
- Implementado compartilhamento de viagens via botão no viagem.html.

### Semana 19/11/2023 - 25/11/2023
- Criada página de edição/criação de viagens;
- Criada página de edição/criação de passeios;
- Criada página de configurações;
- Criadas funções de front-end para o index.html;

### 13/11/2023
- Criada funcionalidade "Minhas Viagens";

### 09/11/2023
- Criada Página de Login;
- Criada Página de Usuário logado;
- Criado sistema de compartilhamento de viagens via link (URL do viagem.html e botão no index.html);

### 07/11/2023
- Automatizadas cores tema definidas pelo usuário;
- Corrigido bugs do modo escuro;

### 31/10/2023
- Criado esqueleto para a Home Page (Login);
- Corrigido bugs do modo escuro;
- Inserir autenticação no back-end e front-end;

### 29/10/2023
- Bug Fixes;
- Logo Interativo de acordo com a cor definida pelo usuário;

### 04/10/2023
- Inserir calendário dinâmico (swiper);

### 03/10/2023
- Migrar 'Hospedagem' ao Firestore;
- Remover métodos descontinuados;
- Migrar 'Resumo'(Keypoints) ao Firestore;
- Criar tratamento para falha de conexão com o banco de dados;

### 02/10/2023
- Migrar 'Transporte' ao Firestore;
- Criar artes de transporte / hospedagem;
- Migrar Jsons de configuração ao Firestore;

### 29/09/2023
- Migrar 'Passeios' ao Firestore;
- Migrar 'Programação' ao Firestore;

### Anteriormente
- Criar Git do projeto;
- Criar projeto no Firebase;
- Criar banco de dados Firestore;
- Importar HTML, CSS e JS do projeto estático;
- Desenvolver estrutura básica do back-end via Cloud Functions (NodeJS com TypeScript);
- Criar funções de leitura principais no back-end (get.ts);

# Bugs Não Críticos Conhecidos
- Em dispositivos iOS, acima da barra superior existe uma área transparente que não é coberta pelo background;
- O loading em viagens não está pegando a cor customizada;
- Ao editar a cor no passeio, ela não é salva globalmente;
- Botão de "transportation" em viagem.html não está deselecionando corretamente;
- Botão 'x' em viagem.html (sair do menu em modo mobile) deveria ter color preto quando selecionado;

# Possíveis Melhorias Futuras
- Criar Keypoints personalizáveis.
- Otimizar BD (simplificar estrutura);
- Substituir títulos de accordeons no editar-viagens;
- Validar inputs de links;
- Adicionar opção de excluir accordion;
- Melhorar fundo cinza do "Adicionar ---" em editar-viagens / editar-passeios;
- Remover o auto selecionar de accordions quando um módulo é habilitado em editar-viagens / editar-passeios.
- Editar caixa de perfil no index para tratar strings muito longas;
- Adicionar animações no index.html;
- Centralizar demo-box no editar-viagens / editar-passeios quando em modo tablet;
- Fazer ícone Trip Viewer + texto redirecionar para index.html;
- Limitar tamanho de upload + forma no backend para deixar mais seguro;
- Criar forma de restaurar imagem previamente carregada na edição
- Excluir passeio do select caso ele já tenha sido selecionado anteriormente
- Adicionar forma de deletar passeio em editar-viagens
- Mudar on change do module de editar viagens para adição no lugar de load