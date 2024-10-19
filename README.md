![alt text](https://i.imgur.com/vejNzOv.png)

# Tarefas

| Ícone | Título  | Código | Total | Finalizados | Pendentes |
| ------ | -------- | ------- | ----- | ----------- | --------- |
| 🐞     | Bug      | B000    | 59    | 53          | 6         |
| 🏆     | Feature  | F000    | 65    | 54          | 11         |
| 📈     | Melhoria | M000    | 86    | 70          | 16        |
| ⚔️   | Épico   | E000    | 25    | 16          | 9         |

- 🚦: Bloqueado
- ❔: Sem solução aparente
- ❗️: Crítico (deploy em produção)

## Doing

## To-Do

### Prioridade Alta

- 🐞 **B057:** Carregamento demorado em index.html não mostrando elementos corretamente
- 🏆 **F063:** Permitir adicionar múltiplas regiões em um destino (editar-destino.html)
- 🏆 **F062:** Permitir personalizar viagem para que apenas exiba em modo escuro ou modo diurno
- 📈 **M085:** Melhoria no pop-up de erro
  - *Forçar Refresh (Home ou tentar novamente)*
  - *Tentar novamente habilitado primeiro load, desabilitado posterior*
  - *Mensagem em inglês no final e com destaque diferente*
  - *Assegurar que sempre mostrará uma notifação ao usuário*
- ⚔️ **E021:** Implementação: Lineup em viagens.html
  - *Ao invés de estar em Destinos, é uma nova categoria*
  - *Exibe lista de artistas como um lineup de festival (Exemplo: Site RiR)*
  - *Quadro de Horários interativo (Exemplo: App Lollapalooza)*
  - *Lineup e Horários separados por Tab semelhante a de gastos.html*
  - *Select com os dias de festival, mas com geral em default*
  - *Edição de forma semelhante ao de programação, com a diferença que a data é customizável* 

### Prioridade Média

- 📈 **M086:** Melhor exibição de destinos (editar-viagem.html)
  - *Itens selecionados mostrados primeiro (apenas no load inicial)*
  - *Melhor exibição de várias regiões (carrosel talvez)*
- 🏆 **F065:** Mostrar se hospedagem foi paga com antecedência ou não
- 🐞 **B058:** Viagem atual aparecendo como anterior (index.html)
- 🏆 **F061:** Renomear todas as páginas html para nomes em inglês
  - *Adicionar imagem e descrição*
- 📈 **M020:** Módulo de transporte mais automatizado
  - *Se user clicou em volta e não há dados, reverte tudo da ida*
- 🏆 **F046:** Criação de opções de re-ordenação de destinos
  - *Na tela de edição e viagens*
  - *Ordenação por nota e por nome (↑↓)*
- 📈 **M021:** Melhoria de "Minhas Viagens / Destinos / Listas do index.html
  - *Ordenar por data (crescente) em viagens*
  - *Adicionar Viagens anteriores em viagens*
  - *Ordernar por data de atualização em Destinos e Listagens*
- ⚔️ **E014:** Implementação: Lista de desejos
  - *Procurar template na web e aplicar (colocar fonte nos créditos)*
- ⚔️🚦 **E016:** Novo Front-End: Destinos.html
  - *Aguardando Guilherme desenvolver nova versão do template*
- ⚔️🚦**E017:** Novo Front-End: Viagens.html
  - *Aguardando template do Guilherme*
- ⚔️🚦 **E018:** Novo Front-End: Index.html
  - *Aguardando template do Guilherme*
- ⚔️ **E019:** Melhorias JavaScript
  - *Código duplicado*
  - *Code smells*
  - *Refatorações*
  - *Sonarqube*
- ⚔️ **E024:** Migração de projeto para React
- ⚔️ **E025:** Implementação iOs e Android

### Prioridade Baixa

- 🐞 **B057:** Calendário com bordas brancas temporariamente quando é feito o switch para modo noturno (viagem.html)
- 🐞 **B024:** Correção de deseleção incorreta no botão de ID "transportation" em viagem.html
- 🏆 **F043:** Criação de Keypoints personalizáveis
- 📈 **M018:** Melhoria de centralização do elemento demo-box nas telas de edição quando em modo tablet
- 🐞 **B023:** Correção de gráfico de dias por cidade estático no viagens.html
- 🏆 **F044:** Criação de animações em todo o site
- 🐞 **B022:** Correção de erro em que nem todos os hrefs irem para as categorias (telas de editar)
- 📈 **M034:** Alteração de botão de Voltar (←) para o canto esquerdo da tela em index.html
- 📈 **M037:** Melhoria de aumento de espaçamento nas boxes de destinos em viagem.html
- 📈 **M041:** Melhoria na validação de campos ausentes em páginas de editar para exibir o título do item (quando houver)
- 📈 **M042:** Melhoria no salvamento de páginas de editar para não fazer chamada no firebase se não houverem mudanças
- 🏆 **F051:** Implementação embed de Deezer, Instagram (post/reels) e Apple Music em destinos
  - *Tanto destinos.html quanto editar-destinos.html*
- 📈 **M045:** Exibição de nota dentro do accordion de editar-destinos e ordenação por Nota + título
- 📈 **M047:** Troca de mensagens em modal para mensagens em bottomsheet
- 📈 **M054:** Melhoria de funções relacionadas ao getJs para mais cenários
- 🏆 **F055:** Implementação de função de getKs
- 📈 **M046:** Limpeza de propriedades não utilizadas nos CSS da aplicação
- 📈 **M055:** Melhoria de todas as mudanças de dark mode serem aplicadas via js
- 📈 **M058:** Modularização de arquivos de CSS para diminuir redundâncias
  -*Também será preciso alterar a função que calcula o dark mode*
- 🏆 **F057:** Visualização de destino isolado em pagina de viagem (renomear pagina de viagem para visualizar)
- 📈 **M069:** Timer de carregamento desabilitado por padrão
- 🏆 **F060:** Permitir alternar entre categorias de destinos dentro de uma das páginas

## Done

### Outubro 2024
- 🐞 **B056:** Erros Dynamic Select:
  - *Erro ao tentar transferir destino*;
  - *Erro de ordenação (não está crescente)*
  - *Muitos refreshs causando demora no carregamento inicial*
- 🐞 **B055:** Hotfixes
  - *Erro ao salvar viagem (módulo lineup sendo chamado mesmo após ser descontinuado)*
  - *Erro títulos e ícones em Gastos não aparecerem*
  - *Erro no carregamento do sortable.min.js*
  - *Switchs de Customização não carregando corretamente*
- 🏆 **F064:** Desabilitar zoom quando em webview

### Setembro 2024

- 📈 **M071:** Incluir código de reserva em Hospedagens
- 📈 **M073:** Se apenas um destino, renomear viagem.html de "destinos" para nome do destino
- 🐞 **B047:** Programação em viagem.html não mostra horário inicial se o final está ausente
- 🏆 **F059:** Permitir visualizar destinos diretamente (sem listas)
- 📈 **M023:** Arrastamento de Accordions (Programação)
- 📈 **M075:** Ajustes index.html
  - *Remover "Visualizar Viagem"*
  - *Adicionar "Ajustes de Conta" + Diferentes animações para cada rota*
  - *Ajustar largura dos textos de menu para deixar ícones na mesma posição*
- 📈 **M079:** Login por redirecionamento
- 📈 **M078:** Checkbox de "Trocar nome da atividade para ***" dentro de "Associar Item"
- 📈 **M074:** Botão de troca de programação (editar-viagem.html)
- 🐞 **B051:** Correção de destino desabilitado não auto apagar template vazio
- 📈 **M080:** Botão de troca de destino (editar-destino.html)
- 📈 **M081:** Reimplementação do Dynamic Select para facilitar manutenção
- 📈 **M035:** Dynamic Select de Região em editar-destinos.html ser geral, ao invés de separado por categoria
- 🐞 **B047:** Ao excluir item em página de editar, o listener do "Outro" de região para de funcionar
- 📈 **M066:** Tamanho de logotipo automático em viagens.html
- 🐞 **B053:** Erros nas funções de get e set de dados do banco
- 🐞 **B050:** Lista de destinos em "destinos.html" não ordena corretamente após um item "?"
- 🐞 **B052:** Não é possível desabilitar gastos em editar-viagem.html
- 📈 **M061:** Substituição de modal de deleção de página de editar por mensagem nativa
- 📈 **M082:** Pack de melhorias e fixes 09/24 (pré deploy em prod)
  - *Visualizar Destino ao salvar (editar-destino.html)*
  - *Dados da viagem descrentralizados (viagem.html)*
  - *Ajuste de responsividade em hospedagens (viagem.html)*
  - *Valor não aparece em novo destino (editar-destino.html)*
  - *Cancelar não volta para a home (editar-destino.html)*
  - *Tratamento em viagens e editar-viagem para ignorar destino não existente*
  - *Listagem existente não carrega (editar-listagem.html)*
  - *Primeiro set não funciona por "Usuário Não Autenticado" (editar-destino.html)*
- 📈 **M084:** Melhor exibição de checkboxes de destinos (editar-viagem.html e editar-listagem.html)
- 📈 **M083:** Data usando select de acordo com o período da viagem (editar-viagem.html)
- 🐞 **B054:** Correção na exibição de lineup (editar-viagem.html)

### Agosto 2024

- 📈 **M070:** Aumentar tamanho das listas em index.html + reordenar para viagens mais próximas primeiro
- 🏆 **F058:** Inserir item de viagens anteriores em index.html
- 🐞 **B048:** Programação não está carregando corretamente no dark mode

### Julho 2024

- 🐞 **B046:** Pacote de hot fixes 07/2024
  - *Login por pop-up no domínio novo (temporário)*
  - *Correção de erros na exibição de destinos*
  - *Correção de erros na criação de novas viagens*

### Junho 2024

- 🐞 **B042:** Correção de listeners em editar-viagem (inicio, fim, reloadProgramacao) não estarem funcionando
- 📈 **M019:** Módulo de programação mais personalizável
  - *Inclusão de Horário*
  - *Automação Título*
  - *Quantidade dinâmica de itens*
  - *Novo design na programação por dia em viagens.html*
  - *Possibilidade de abrir um item associado a programação em viagens.html (destino, hospedagem ou transporte)*
- 📈 **M048:** Melhoria de indicador visual para várias cidades no calendário de programações
- 🐞 **B043:** Correção de hero incorreto no dark mode + margens desproporcionais em viagens.html
- 📈 **M022:** Melhoria de calendário em viagem.html para não ter bordas duplicadas
- 🐞 **B044:** Correções de Tela de Editar (transporte simplificado, viagem sem programação e listener de fim)
- 🐞 **B045:** Correções de Dark Mode (Logo em viagem.html e imagem de fundo em index.html)
- 📈 **M056:** Reorganização de arquivos + aquivos de configuração locais (remoção de chamada desnecessária ao Firestore)
- 📈 **M057:** Melhoria no calendário de programação para incluir múltiplas cores
- 🏆 **F050:** Criação de chamada de API / Cloud Function para transformar link TikTok mobile em link desktop
- 📈 **M059:** Melhorias Backend: Funções de suporte (Cors, Usuários, get/set dados) e formatação
- 🏆 **F056:** Verificação se houve mudanças nas páginas de editar
- 📈 **M062:** Inserção de carregamento de config dentro do main
- 📈 **M060:** Melhoria de métodos de set em editar
- ⚔️ **E015:** Implementação: Gastos
  - *Template de Front-End*
  - *API para obter cotações de turismo em tempo real*
  - *Implementar campo de valor em Transporte e Hospedagem (Editar Viagem)*
  - *Implementar categoria de Gastos em Editar Viagem*
    - *Gastos Prévios e Gastos Durante a Viagem*
    - *Separar por categoria*
    - *Auto importar de Transporte e Hospedagem (listener caso altere em um dos lados)*
  - *Aplicar template em página de viagem*
- 🐞 **B025:** Correção de, ao fazer o switch de visibilidade dentro de um lightbox, não ser mantido ao sair
- 📈 **M063:** Melhoria de performace Firebase (atualização de versão do CLI)
- 📈 **M064:** Ajuste no tratamento de mensagem de erros
- 📈 **M065:** Gastos agora exibem moeda em todos os valores da tabela
- 📈 **M067:** Melhorias páginas que usam lightbox (gastos.html e destinos.html)
- *Páginas, quando carregadas fora do lightbox, não irão exibir botão de voltar*
- *Redirecionamento condicional de páginas*
- 📈 **M068:** Melhoria accordions e mídias em destinos.html
- *Página agora apenas exibe um accordion por vez*
- *Mídias agora não se cruzam (reprodução simultânea)*
- ⚔️ **E022:** Funções de migrações (Cloud Functions)
- ⚔️ **E013:** Migração do Projeto
  - *Criação de ambientes dev e prd*
  - *Criação de branch de develop*
  - *Depreciação do trip-viewer-tcc (redirecionamento para prd)*
  - *Criação de domínio personalizado para prd*

### Maio 2024

- 📈 **M028:** Melhoria na função de compartilhar para exibir texto adaptado (viagem/listagem)
- 🐞 **B029:** Correção de listas no index.html exibirem "Sem dados" mesmo quando carregamento não acabou
- 🏆 **F048:** Dynamic Select de "Valor" em editar-destinos.html
- 📈 **M029:** Otimizar destinos.html para receber do localStorage apenas os dados necessários
- 🐞 **B030:** Correção de erros em novas viagens de editar-viagens.html
- 🏆 **F049:** Dynamic Select de "Região" em editar-destinos.html
- 📈 **M029:** Melhoria de, se o usuário apaga todos os itens de uma categoria, ela é automaticamente desabilitada
- ⚔️ **E020:** Criação de box de visualização de Hospedagens em viagens.html
- 📈 **M032:** Quando um novo item da categoria é adicionado, os accordions da categoria são fechados
- 🐞 **B032:** Correção de páginas de editar não estaren exibindo/importando corretamente dados dos selects dinâmicos
- 🐞 **B033:** Correção em que usuários podiam acessar livremente um editar de outro usuário
  - *O sistema (firestore rules) já possuia bloqueios para impedir o salvamento, mas o front-end também deve fazer uma pré-verificação*
- 🐞 **B034:** Correção Novos itens com dynamic selects (Galeria, Lineup e Região) não estarem carregando o select
- 📈 **M038:** Melhorar pop-ups de mensagem para incluir tanto mensagens comuns (fecháveis) quanto de erro
- 🏆 **F053:** Implementação no Firestore e Firestore Rules para habilitar/desabilitar cadastro de usuários
- 📈 **M039:** Melhoria no sistema de abrir-fechar cadastro de usuários para implementar mensagem customizada
- 🏆 **F045:** Criação de mensagem customizada para erro no upload de imagens
- 📈 **M030:** Em vez de campo de duração em editar-viagem.html, ter campo de fuso horário e calcular duração automaticamente
- 🐞 **B036:** Correção automações no módulo de transportes em editar-viagem.html não estarem carregando no primeiro load
- 📈 **M033:** Inclusão de botões em modais de mensagem
  - *Informação fecha e erro vai para a home*
- 📈 **M040:** Validação de input de Link e Embed em editar-destinos.html
- 📈 **M017:** Validação de inputs nas páginas de editar
  - *Emojis, Links Genéricos, Links de Imagens, Links de Playlists e Links de Vídeos*
- 📈 **M031:** Melhoria de opção de zoom no card de hospedagem em viagem.html
- 📈 **M026:** Novo ícone de "Novo" em destinos.html
- 📈 **M044:** Melhoria de espaçamentos em páginas de editar
- ⚔️ **E023:** Destinos v1.1
- 📈 **M043:** Melhoria visual em destinos.html e destinos.js
- 🐞 **B039:** Correção de função de aplicar cores customizadas em classes não funcionar mais de uma vez para algumas propriedades
- 🐞 **B040:** Remoção de função de arrastamento de accordion
  - *Não funcionava como o esperado no Desktop e não funcionava no Mobile*
  - *Reimplementar posteriormente*
- 🐞 **B035:** Correção de programação em editar-viagem.html não mostrar título completo no carregamento
- 📈 **M050:** Melhoria no módulo de destinos (editar)
  - *Troca de selects por check-boxes*
  - *Função de busca*
- 📈 **M049:** Adição de dark-mode para zoom de hospedagens/galerias
- 🏆 **F052:** Criação de botão de atribuições no footer que coloca todas os créditos em um modal
- 🐞 **B027:** Correção de dados de destinos não serem salvos se categoria for desabilitada
- 📈 **M051:** Reorganizção de destinos para armazenar dados em objetos
- 📈 **M052:** Redução do tamanho do box de mídia mobile em página de destinos para melhorar visualização desktop
- 🐞 **B038:** Correção de mensagem customizada de erro de carregamento de listas não aparecer (index.html)
- 🐞 **B037:** Correções visuais em páginas de editar
  - Barra de scroll  não ser clicável
  - Botão de salvar não acessível no mobile (navegador)
- 🐞 **B041:** Correção salvamento de viagens retornar NaN na data da programação
  - *O título completo apenas aparece quando o usuário edita o input (listener)*
- 📈 **M053:** Possibilidade de incluir mais de um local para o mesmo dia de programação
- 🏆 **F054:** Implementar sistema de IDs para transporte e hospedagem, para poderem ser utilizados como referência em programacao
- 📈 **M036:** Melhoria no CSS de destinos para que tabela não desformate em zooms menores que 100%

### Abril 2024

- 🐞 **B021:** Erro de viagens públicas aparecendo como privadas (Rules do Firestore)
- 📈 **M013:** Bloqueio upload / Melhoria de segurança
  - *Criação de sistema de permissões no banco e storage rules*
  - *Exibição HTML interativa de acordo com a permissão*
  - *Sistema inteligente de uploads, com exclusão de imagens não utilizadas*
  - *Sistema de inserção de imagens customizadas de acordo com a página (hospedagens e galeria para o caso de editar-viagens)*
  - *Ajustes na página de viagem para receber a nova estrutura de imagem*
- 📈 **M014:** Melhorias editar-viagem
  - *Selects dinâmicos para que user possa escolher entre os dados já cadastrados (Galeria e Lineup)*
  - *Automações para facilitar preenchimento de dados e visualização*
- 📈 **M015:** Melhoria em Destinos do viagens.html
  - *Se houver uma quantidade ímpar de categorias, centraliza os itens (melhoria de visibilidade no desktop)*
  - *Se só houver destinos para uma cidade e só houver uma categoria, o título é ocultado*
- 🐞 **B020:** Correção de loading as vezes carregar eternamente
- 🐞 **B019:** Correção de tamanho de botões de deleção em editar-x.html
- ⚔️ **E012:** Criação de box de visualização de Transportes em viagens.html
- 🏆 **F041:** Criação botão de compartilhar para viagens.html
- 📈 **M016:** Refatoramento: utilizar método getID e otimizar arquivos de editar
- 🏆 **F042:** Criar moeda customizável para Destinos
- 📈 **M025:** Novo ícone de "Novo" editar-destinos.html
- 🐞❗️**B028:** Correção de caregamento de listagens
- 🐞 **B026:** Correção de loading em viagens não estar pegando a cor customizada
  - Aplicado, mas a cor só é exibida em loadings após o inicial
  - A maior parte do loading é a para ter dados do Firestore. Só com eles é possível obter a cor customizada
- 📈 **M027:** Melhoria de responsividade das barras de viagem do index.html

### Março 2024

- 🐞 **B018:** Correção de bug de login no safari (provavelmente relacionado com animação no index)
- 🏆 **F038:** Criação de opção de arrastar accordions (Desktop)
- 🐞 **B017:** Correção de ":" quando título não é preenchido
- 🐞 **B016:** Corrreção de problema no carregamento de lineup
- 📈 **M011:** Melhoria de performance em destinos.html
  - *Restringir carregamento de embeds para apenas quando o accordeon é aberto*
- 🐞 **B015:** Correção de ícone do TripViewer em destinos.html estar indo para a home e dentro do lightbox
- 📈 **M012:** Melhor organização de JavaScript relacionados a destinos.html
- 🐞 **B014:** Correção de erros de CSS causados por unificação de CSSs de edição
- 🏆 **F039:** Criação de botões triplos no modal quando salvar
  - *Reeditar (sem fundo)*
  - *Home (cinza)*
  - *Visualizar (roxo)*
- 🏆 **F040:** Criação de mensagem de "Documento Privado"
- 🐞 **B013:** Correção de embeds de destino.html estarem fora de ordem

### Fevereiro 2024

- 📈 **M006:** Mini melhoria de front mobile
- 🏆 **F032:** Criação de forma de deletar passeios / viagens
- 🏆 **F033:** Criação de Módulo de Galeria
- 🐞 **B012:** Correção de dados se perdendo no load do editar-viagem quando o user não deixa o dado ativo
- 🐞 **B011:** Ajuste posição do night mode em editar-viagem e editar-passeio
- 🏆 **F034:** Criação de seta de voltar em editar-viagens e editar-passeios
- 🐞 **B010:** Correção de Título de modal desformatado
- 📈 **M007:** Melhoria de Transparência aumentada em background mobile
- 📈 **M008:** Melhoria de botão de Reeditar não retornar a home caso tenha dado erro no salvamento
- ⚔️ **E010:** Testagem Geral e bug fixes
- 📈 **M009:** Condensação de CSSs de editar-viagem e editar-passeio em CSSs únicos (editar.css e editar-dark.css)
- 📈 **M010:** Validação de Inputs em Adicionar Passeio (Remover os que já foram preenchidos)
- ⚔️ **E011:** Mudança de nome de "Passeios" para "Destinos"
- 🐞 **B009:** Correção de Link de transporte não deveria ser obrigatório
- 🐞 **B008:** Correção de imagem de meio de transporte não carregando corretamente (Exemplo: Lolla 2024)
- 🏆 **F035:** Criação de Função de Listas de Destinos
- 🏆 **F036:** Migração de Lineup para Viagens (Remover de Destinos)
- 🐞 **B007:** Fazer título da imagem também mudar no accordeon
- 🏆 **F037:** Criação de animações no index.html

### Janeiro 2024

- ⚔️ **E009:** Migração do Projeto para Plano Spark
- 🏆 **F027:** Criação de Limitação do tamanho de upload + forma no backend para deixar mais seguro
- 🐞 **B006:** Correção de Loading no index finalizando antes de carregar a lista de viagens/passeios
- 🏆 **F028:** Criação de opção de fornecer link de imagem ao invés de upload
- 🏆 **F029:** Criação de suporte a links personalizáveis
- 🏆 **F030:** Criação de Set para links personalizáveis
- 🏆 **F031:** Criação de modo ativo/inativo em links, imagens e cores
  - *Para não perder os dados do user caso ele só queira mudar a exibição*
- 📈 **M004:** Redução do CSS em modo escuro
- 📈 **M005:** Edição de caixa de perfil no index para tratar strings muito longas
- 🐞 **B005:** Ajuste de Links para a home
  - *Apenas o texto tripviewer é clicável em algumas páginas. Falta o logo*

### Dezembro 2023

- 🐞 **B004:** Correção de posição do select de transporte de editar-viagem
- 🏆 **F021:** Criação de funções de front-end para edição de viagens e passeios
- 🏆 **F022:** Criação de sistema de imagens
- 🏆 **F023:** Criação de compartilhamento de viagens via botão no viagem.html
- 🏆 **F024:** Criação de get de imagens em viagem.html
- 🏆 **F025:** Criação de bloqueios de edição de viagens e passeios
- 🏆 **F026:** Implementação de Night Mode interativo do user
- 📈 **M003:** Melhoria de Linkar e validar funções de back-end para edição de viagens e passeios
- ⚔️ **E007:** Simplificação de estrutura do BD
- ⚔️ **E008:** Reimplementação da segurança da aplicação

### Novembro 2023

- 📈 **M002:** Automação de cores tema definidas pelo usuário
- 🐞 **B003:** Correção de bugs do modo escuro
- 🏆 **F013:** Criação de Página de Login
- 🏆 **F014:** Criação de Página de Usuário logado
- 🏆 **F015:** Criação de sistema de compartilhamento de viagens via link
  - *URL do viagem.html e botão no index.html*
- 🏆 **F016:** Criação de funcionalidade "Minhas Viagens"
- 🏆 **F017:** Criação de página de edição/criação de viagens
- 🏆 **F018:** Criação de página de edição/criação de passeios
- 🏆 **F019:** Criação de página de configurações
- 🏆 **F020:** Criação de funções de front-end para o index.html

### Outubro 2023

- 🏆 **F003:** Migração de 'Transporte' ao Firestore
- 🏆 **F004:** Criação de artes de transporte / hospedagem
- 🏆 **F005:** Migração de Jsons de configuração ao Firestore
- 🏆 **F006:** Migração de 'Hospedagem' ao Firestore
- 📈 **M001:** Remoção de métodos descontinuados
- 🏆 **F007:** Migração de  'Resumo'(Keypoints) ao Firestore
- 🏆 **F008:** Criação de tratamento para falha de conexão com o banco de dados
- 🏆 **F009:** Inserção de calendário dinâmico (swiper)
- 🐞 **B002:** Correção de Bug Fixes diversos
- 🏆 **F010:** Implementação de Logo Interativo de acordo com a cor definida pelo usuário
- 🏆 **F011:** Criação de esqueleto para a Home Page (Login)
- 🐞 **B001:** Correção de bugs do modo escuro
- 🏆 **F012:** Inserção de autenticação no back-end e front-end

### Setembro 2023

- 🏆 **F001:** Migração de 'Passeios' ao Firestore
- 🏆 **F002:** Migração de 'Programação' ao Firestore

### Anteriormente

- ⚔️ **E001:** Criação de Git do projeto
- ⚔️ **E002:** Criação de projeto no Firebase
- ⚔️ **E003:** Criação de banco de dados Firestore
- ⚔️ **E004:** Importação de HTML, CSS e JS do projeto estático
- ⚔️ **E005:** Desenvolvimento de estrutura básica do back-end via Cloud Functions (NodeJS com TypeScript)
- ⚔️ **E006:** Criação de funções de leitura principais no back-end (get.ts)

### Descartados

- 🏆 **F046:** Firebase Firestore Rules no Front-End
  - *Risco de segurança expor ao user as regras*
- 🐞❔ **B031:** Correção de imagem de galeria de twitter abrir com proporções erradas no GLightbox
- 📈 **M072:** Melhorar ajuste de datas automáticas em editar viagens
- 📈 **M076:** Automatizar restore de dados de PRD para DEV (semanalmente) + Função Manual
- 📈 **M077:** Backups de PRD semanais + Exclusão do mais antigo (Apenas 3 semanas)