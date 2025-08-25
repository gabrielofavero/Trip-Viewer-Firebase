const ATRIBUICAO_LOGO = `<strong>${translate('labels.logo')}: </strong> <a href="https://br.freepik.com/vetores-gratis/marketing-de-midia-social-conjunto-de-icones_5825519.htm#query=briefcase&position=9&from_view=search&track=sph" target="_blank">studiogstock</a> (${translate('labels.adapted')})`;
const ATRIBUICAO_BACKGROUND = `<strong>${translate('labels.image.background')}: </strong> <a href="https://br.freepik.com/fotos-gratis/femininos-turistas-na-mao-tem-um-mapa-de-viagem-feliz_3953407.htm#query=viagem&position=14&from_view=search&track=sph" target="_blank">jcomp</a> (Freepik)`;
const ATRIBUICAO_FORMS = `<strong>${translate('labels.forms')}: </strong> <a href="https://github.com/nielsVoogt/nice-forms.css" target="_blank">Niels Voogt</a> (${translate('labels.adapted')})`;
const ATRIBUICAO_CALENDAR = `<strong>${translate('labels.calendar')}: </strong> <a href="https://www.cssscript.com/minimal-calendar-ui-generator/" target="_blank">niinpatel</a> (${translate('labels.adapted')})`
const ATRIBUICAO_ACCORDION = `<strong>${translate('labels.accordion')}: </strong> <a href="https://github.com/nielsVoogt/nice-forms.css" target="_blank">Niels Voogt</a> (${translate('labels.adapted')})`
const ATRIBUICAO_DASHBOARD = `<strong>${translate('labels.dashboard')}: </strong> <a href="https://codepen.io/dudebro69/pen/jOvEaVe" target="_blank">dudebro</a> (${translate('labels.adapted')})`
const ATRIBUICAO_ABAS = `<strong>${translate('labels.tabs')}: </strong> <a href="https://codepen.io/havardob/pen/ExVaELV" target="_blank">Håvard Brynjulfsen</a> (${translate('labels.adapted')})`
const ATRIBUICAO_COTACAO = `<strong>${translate('trip.expenses.exchange_rate_api')}: </strong> <a href="https://docs.awesomeapi.com.br/api-de-moedas" target="_blank">Ranielly Ferreira</a> (${translate('labels.adapted')})`
const ATRIBUICAO_PIN = `<strong>${translate('trip.expenses.pin.title')}: </strong> <a href="https://codepen.io/the_anshulkumar/pen/RKzYKj" target="_blank">Anshul Kumar</a> (${translate('labels.adapted')})`

function _openAtribuicoes() {
    const page = window.location.href.split('/').pop().split('?')[0].replace('.html', '');
    const atribuicoes = [];
  
    atribuicoes.push(ATRIBUICAO_LOGO);

    switch (page) {
      case 'index':
        atribuicoes.push(ATRIBUICAO_BACKGROUND);
        break;
      case 'editar-viagem':
      case 'editar-destino':
      case 'editar-listagem':
        atribuicoes.push(ATRIBUICAO_BACKGROUND);
        atribuicoes.push(ATRIBUICAO_FORMS);
        break;
      case 'viagem':
        atribuicoes.push(ATRIBUICAO_BACKGROUND);
        atribuicoes.push(ATRIBUICAO_CALENDAR);
        break;
      case 'destinos':
        atribuicoes.push(ATRIBUICAO_BACKGROUND);
        atribuicoes.push(ATRIBUICAO_ACCORDION);
        break;
      case 'gastos':
        atribuicoes.push(ATRIBUICAO_PIN);
        atribuicoes.push(ATRIBUICAO_ABAS);
        atribuicoes.push(ATRIBUICAO_DASHBOARD);
        atribuicoes.push(ATRIBUICAO_COTACAO);
        break;
    }

    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = translate('labels.credits');
    propriedades.conteudo = atribuicoes.join('<br>');
    propriedades.botoes = [];
  
    _displayFullMessage(propriedades);
  }