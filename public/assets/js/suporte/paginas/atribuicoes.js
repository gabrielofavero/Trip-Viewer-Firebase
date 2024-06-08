function _openAtribuicoes() {
    const page = window.location.href.split('/').pop();
    const title = '';
    const buttons = [{ type: 'ok' }];
  
    let content = '';
    let atribuicoes = [];
  
    const logotipo = `<strong>Logotipo: </strong> <a href="https://br.freepik.com/vetores-gratis/marketing-de-midia-social-conjunto-de-icones_5825519.htm#query=briefcase&position=9&from_view=search&track=sph" target="_blank">studiogstock</a> (Adaptado)`;
    const imagemDeFundo = `<strong>Imagem de Fundo: </strong> <a href="https://br.freepik.com/fotos-gratis/femininos-turistas-na-mao-tem-um-mapa-de-viagem-feliz_3953407.htm#query=viagem&position=14&from_view=search&track=sph" target="_blank">jcomp</a> (Freepik)`;
    const formularios = `<strong>Formulários: </strong> <a href="https://github.com/nielsVoogt/nice-forms.css" target="_blank">Niels Voogt</a> (Adaptado)`;
    const calendario = `<strong>Calendário: </strong> <a href="https://www.cssscript.com/minimal-calendar-ui-generator/" target="_blank">niinpatel</a> (Adaptado)`
    const accordion = `<strong>Accordion: </strong> <a href="https://github.com/nielsVoogt/nice-forms.css" target="_blank">Niels Voogt</a> (Adaptado)`
  
    atribuicoes.push(logotipo);
  
    if (page.includes('index')) {
      atribuicoes.push(imagemDeFundo);
    } else if (page.includes('editar-')) {
      atribuicoes.push(imagemDeFundo);
      atribuicoes.push(formularios);
    } else if (page.includes('viagem')) {
      atribuicoes.push(imagemDeFundo);
      atribuicoes.push(calendario);
    } else if (page.includes('destinos')) {
      atribuicoes.push(imagemDeFundo);
      atribuicoes.push(accordion);
    }
  
    content = atribuicoes.join('<br>');
  
    _displayMessage(title, content, { buttons: buttons });
  }