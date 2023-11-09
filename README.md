![alt text](https://github.com/gabrielofavero/Trip-Viewer-Firebase/blob/master/public/assets/img/logo-full.png?raw=true)

# Tarefas

## Doing
- Criar funcionalidade "Minhas Viagens";
- Criar página de configurações;
- Implementar compartilhamento de viagens via botão no viagem.html.

## To-Do
- Criar página de edição/criação de viagens;
- Criar página de edição/criação de passeios;
- Inserir API Google Maps para busca de passeios;

## Done
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

## 03/10/2023
- Migrar 'Hospedagem' ao Firestore;
- Remover métodos descontinuados;
- Migrar 'Resumo'(Keypoints) ao Firestore;
- Criar tratamento para falha de conexão com o banco de dados;

## 02/10/2023
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
