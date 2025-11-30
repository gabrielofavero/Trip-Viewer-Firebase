var DESTINOS = [];
var DATAS = [];

function _loadNewTrip() {
  _loadDadosBasicosNewTrip();
  _loadProgramacao();
  _loadDestinos();
}

function _loadDadosBasicosNewTrip() {
  getID('inicio').value = TODAY;
  getID('fim').value = TOMORROW;

  getID('moeda').value = 'BRL';
}

function _addTransporte() {
  const j = _getNextJ('transporte-box');

  $('#transporte-box').append(`
  <div id="transporte-inner-box-${j}" class="inner-box draggable">
        <div id="transporte-${j}" class="accordion-item accordion-transporte accordion-draggable" >
        <h2 class="accordion-header" id="heading-transporte-${j}">
          <button id="transporte-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapse-transporte-${j}" aria-expanded="false" aria-controls="collapse-transporte-${j}">
            ${translate('trip.transportation.title')} ${j}
          </button>
        </h2>
        <div id="collapse-transporte-${j}" class="accordion-collapse collapse"
          aria-labelledby="heading-transporte-${j}" data-bs-parent="#transporte-box">
            <div class="accordion-body">
              <div class="nice-form-group" style="display: none">
              <label>${translate('labels.id')}</label>
              <input id="transporte-id-${j}" type="text" disabled />
            </div>

            <fieldset class="nice-form-group" id="idaVolta-box-${j}">
              <div class="nice-form-group" style="margin-top: -15px">
                <input type="radio" name="idaVolta-${j}" id="ida-${j}" ${j === 1 ? 'checked' : ''} />
                <label for="ida-${j}">${translate('trip.transportation.departure')}</label>
              </div>
    
              <div class="nice-form-group">
                <input type="radio" name="idaVolta-${j}" id="durante-${j}"/>
                <label for="durante-${j}">${translate('trip.transportation.during')}</label>
              </div>
    
              <div class="nice-form-group">
                <input type="radio" name="idaVolta-${j}" id="volta-${j}" ${j != 1 ? 'checked' : ''} />
                <label for="volta-${j}">${translate('trip.transportation.return')}</label>
              </div>
            </fieldset>

            <div class="nice-form-group" id="people-box-${j}">
              <label>${translate('labels.person')}</label>
              <select ${getID('people-view').checked ? 'required' : ""} class="editar-select" id="transporte-pessoa-select-${j}" style="display: none;"></select>
              <input class="nice-form-group" id="transporte-pessoa-${j}" type="text" placeholder="${translate('labels.person')}" />
            </div>

            <div class="nice-form-group">
              <label>Ponto de Partida <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="ponto-partida-${j}" type="text" placeholder="Belo Horizonte" />
            </div>

            <div class="nice-form-group">
              <label>Ponto de Chegada <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="ponto-chegada-${j}" type="text" placeholder="Las Vegas" />
            </div>
    
            <div class="side-by-side-box">
              <div class="nice-form-group side-by-side">
                <label>${translate('trip.transportation.departure')}</label>
                <input required class="flex-input" id="partida-${j}" type="date" />
              </div>
              <div class="nice-form-group side-by-side">
                <input required class="flex-input mini-box" id="partida-horario-${j}" type="time" value="00:00" />
              </div>
            </div>
    
            <div class="side-by-side-box">
              <div class="nice-form-group side-by-side">
                <label>${translate('trip.transportation.arrival')}</label>
                <input required class="flex-input" id="chegada-${j}" type="date" />
              </div>
              <div class="nice-form-group side-by-side">
                <input required class="flex-input mini-box" id="chegada-horario-${j}" type="time" value="00:30" />
              </div>
            </div>
    
            <div class="nice-form-group">
              <label>Meio de Transporte</label>
              <select class="editar-select" required id="transporte-tipo-${j}">
                <option value="voo">${translate('trip.transportation.type.flight')}</option>
                <option value="carro">${translate('trip.transportation.type.car')}</option>
                <option value="onibus">${translate('trip.transportation.type.bus')}</option>
                <option value="bondinho">${translate('trip.transportation.type.cable_car')}</option>
                <option value="helicoptero">${translate('trip.transportation.type.helicopter')}</option>
                <option value="locomotiva">${translate('trip.transportation.type.train')}</option>
                <option value="metro">${translate('trip.transportation.type.subway')}</option>
                <option value="moto">${translate('trip.transportation.type.motocycle')}</option>
                <option value="navio">${translate('trip.transportation.type.ship')}</option>
                <option value="trem-bala">${translate('trip.transportation.type.bullet_train')}</option>
                <option value="outro">${translate('labels.other')}</option>
              </select>
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.other')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input class="flex-input" id="transporte-duracao-${j}" type="time" />
            </div>

            <div class="nice-form-group" id="empresa-select-form-group-${j}">
              <label>${translate('labels.company')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <select class="editar-select" id="empresa-select-${j}" style="display: none;"></select>
              <input class="nice-form-group" id="empresa-${j}" type="text" placeholder="${translate('labels.company')}" />
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.reservation.code')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="reserva-transporte-${j}" type="text" placeholder="ABC123" />
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.reservation.link')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="transporte-link-${j}" type="url" placeholder="https://www.google.com/" value=""
                class="icon-right" />
            </div>
    
          </div>
    
          <div class="button-box-right-formatted">
            <button id="remove-transporte-${j}" class="btn btn-basic btn-format">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" fill-rule="evenodd"
                    d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z"
                    clip-rule="evenodd"></path>
            </svg>
            </button>
          </div>
    
        </div>
      </div>
      <i class="iconify drag-icon" data-icon="mdi:drag"></i>
    </div>
      `);

  getID(`transporte-id-${j}`).value = _getCategoriaID('transporte', j);
  getID(`ponto-partida-${j}`).value = j == 1 ? "" : getID(`ponto-chegada-${j-1}`).value;
  getID(`ponto-chegada-${j}`).value = j == 2 ? getID(`ponto-partida-${j-1}`).value : "";
  getID(`partida-${j}`).value = j == 1 ? getID('inicio').value : j == 2 ? getID('fim').value : getID(`chegada-${j-1}`).value;
  getID(`chegada-${j}`).value = getID(`partida-${j}`).value;

  _loadTransporteListeners(j);
  _loadTransporteVisibility(j);
  _applyTransportationTypeVisualization(j);
  _addRemoveTransporteListener(j);
  _addSelectorDS('transporte-pessoa', `transporte-pessoa-select-${j}`, `transporte-pessoa-${j}`, `_updateTransporteTitle(${j})`);
}

function _addHospedagens() {
  const inicioFim = _getNextCategoriaInicioFim('hospedagens', 'check-out');
  const j = _getNextJ('hospedagens-box');
  $('#hospedagens-box').append(`
      <div id="hospedagens-inner-box-${j}" class="inner-box draggable">
        <div id="hospedagens-${j}" class="accordion-item accordion-hospedagens accordion-draggable" >
        <h2 class="accordion-header" id="heading-hospedagens-${j}">
          <button id="hospedagens-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
            data-bs-target="#collapse-hospedagens-${j}" aria-expanded="false" aria-controls="collapse-hospedagens-${j}">
            ${translate('trip.accommodation.accommodation')} ${j}
          </button>
        </h2>
        <div id="collapse-hospedagens-${j}" class="accordion-collapse collapse"
          aria-labelledby="heading-hospedagens-${j}" data-bs-parent="#hospedagens-box">
            <div class="accordion-body">
              <div class="nice-form-group" style="display: none">
              <label>${translate('labels.id')}</label>
              <input id="hospedagens-id-${j}" type="text" disabled />
            </div>

            <div class="nice-form-group">
              <input id="hospedagens-cafe-${j}" type="checkbox" class="switch">
              <label for="hospedagens-cafe-${j}">
                ${translate('trip.accommodation.breakfast')}
              </label>
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.name')}</label>
              <input required id="hospedagens-nome-${j}" type="text" placeholder="${translate('trip.accommodation.name_placeholder')}" />
            </div>
    
            <div class="nice-form-group">
              <label>${translate('labels.address')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="hospedagens-endereco-${j}" type="text" placeholder="${translate('trip.accommodation.address_placeholder')}" />
            </div>
    
            <div class="side-by-side-box">
              <div class="nice-form-group side-by-side">
                <label>${translate('trip.accommodation.checkin')}</label>
                <input class="flex-input" id="check-in-${j}" type="date" value="${inicioFim.inicio}" />
              </div>
              <div class="nice-form-group side-by-side">
                <input class="flex-input mini-box" id="check-in-horario-${j}" type="time" value="14:00" />
              </div>
            </div>
    
            <div class="side-by-side-box">
              <div class="nice-form-group side-by-side">
                <label>${translate('trip.accommodation.checkout')}</label>
                <input class="flex-input" id="check-out-${j}" type="date" value="${inicioFim.fim}" />
              </div>
              <div class="nice-form-group side-by-side">
                <input class="flex-input mini-box" id="check-out-horario-${j}" type="time" value="12:00" />
              </div>
            </div>
    
            <div class="nice-form-group">
              <label>${translate('labels.description.title')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="hospedagens-descricao-${j}" type="text" placeholder="${translate('trip.accommodation.description_placeholder')}" />
            </div>

            <div class="nice-form-group">
              <label>${translate('labels.reservation.code')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="reserva-hospedagens-${j}" type="text" placeholder="ABC123" />
            </div>
      
            <div class="nice-form-group">
              <label>${translate('labels.reservation.link')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <input id="reserva-hospedagens-link-${j}" type="url" placeholder="https://www.google.com/" value=""
                class="icon-right" />
            </div>

            <div class="nice-form-group customization-box" id="hospedagens-${j}-box">
              <label>${translate('labels.image.title_plural')} <span class="opcional"> (${translate('labels.optional')})</span></label>
              <button id="imagens-hospedagem-button-${j}" onclick="_openImagensHospedagem(${j})" class="btn input-botao" style="margin-top:0px">${translate('labels.image.add_title')}</button>
            </div>
              
          </div>
      
            <div class="button-box-right-formatted">
              <button id="remove-hospedagens-${j}" class="btn btn-basic btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" fill-rule="evenodd"
                    d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z"
                    clip-rule="evenodd"></path>
              </svg>
              </button>
            </div>
          
        </div>
        </div>
        <i class="iconify drag-icon" data-icon="mdi:drag"></i>
      </div>
      `);

  getID(`hospedagens-id-${j}`).value = _getCategoriaID('hospedagens', j);
  _addRemoveChildListener('hospedagens', j, `_removeHospedagemImagens(${j})`);
  _loadHospedagemListeners(j);
  HOSPEDAGEM_IMAGENS[j] = [];
}

function _loadDestinos() {
  if (!DESTINOS || DESTINOS.length === 0) return;

  let destinos = DESTINOS;
  destinos.sort((a, b) => a.titulo.localeCompare(b.titulo));
  getID('sem-destinos').style.display = 'none';
  getID('com-destinos').style.display = 'block';

  const fieldset = getID('destinos-checkboxes');
  fieldset.innerHTML = '';
  for (let j = 1; j <= destinos.length; j++) {
    const i = j - 1;
    fieldset.innerHTML += _getDestinosItemCheckbox(j, destinos[i].code, destinos[i].titulo);
  }

  getID('habilitado-destinos')?.addEventListener('change', () => _updateDestinosAtivosHTMLs());
  for (const child of _getChildIDs('destinos-checkboxes')) {
    getID(`check-destinos-${_getJ(child)}`).addEventListener('change', () => _updateDestinosAtivosHTMLs())
  }
}

function _loadProgramacao() {
  const inicio = getID('inicio').value;
  const fim = getID('fim').value;

  DATAS = _getArrayOfDates(_formattedDateToDate(inicio), _formattedDateToDate(fim));

  const programacaoBox = getID('programacao-box');
  programacaoBox.innerHTML = '';

  for (let j = 1; j <= DATAS.length; j++) {
    const data = DATAS[j - 1];
    let dataFormatada = _getDateTitle(data, 'weekday_day_month');

    programacaoBox.innerHTML += `
      <div id="programacao-${j}" class="accordion-item accordion-programacao" >
      <h2 class="accordion-header" id="heading-programacao-${j}">
        <button id="programacao-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-programacao-${j}" aria-expanded="false"
          aria-controls="collapse-programacao-${j}">
          ${dataFormatada}
        </button>
      </h2>
      <div id="collapse-programacao-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-programacao-${j}" data-bs-parent="#programacao-box">
        <div class="accordion-body">

          <div class="nice-form-group" id="programacao-local-box-${j}" style="display: ${_getDestinosAtivosSelectVisibility()}">
            <label>${translate('destination.title')}<span class="opcional"> (${translate('labels.optional')})</span></label>
            <fieldset class="nice-form-group destinos-checkboxes" id="programacao-local-${j}">
              ${_getDestinosAtivosCheckboxOptions('programacao', j)}
            </fieldset>
          </div>

          <div class="nice-form-group">
            <label>${translate('labels.title')}<span class="opcional"> (${translate('labels.optional')})</span></label>
              <select class="editar-select" id="programacao-inner-title-select-${j}" style="display: block;">
                ${_getProgramacaoTitleSelectOptions()}
              </select>  
            <input class="nice-form-group" id="programacao-inner-title-${j}" maxlength="25" type="text" placeholder="São Paulo" style="display: none;">
          </div>

          <div class='turno-box' id='programacao-madrugada-${j}'>
            <label>${translate('datetime.time_of_day.early_hours')}</label>
            <div class="inner-programacao draggable-area" data-group="programacao-${j}" id="inner-programacao-madrugada-${j}"></div>
          </div>

          <div class='turno-box' id='programacao-manha-${j}'>
            <label>${translate('datetime.time_of_day.morning')}</label>
            <div class="inner-programacao draggable-area" data-group="programacao-${j}" id="inner-programacao-manha-${j}"></div>
          </div>

          <div class='turno-box' id='programacao-tarde-${j}'>
            <label>${translate('datetime.time_of_day.afternoon')}</label>
            <div class="inner-programacao draggable-area" data-group="programacao-${j}" id="inner-programacao-tarde-${j}"></div>
          </div>

          <div class='turno-box' id='programacao-noite-${j}'>
            <label>${translate('datetime.time_of_day.evening')}</label>
            <div class="inner-programacao draggable-area" data-group="programacao-${j}" id="inner-programacao-noite-${j}"></div>
          </div>

          <div class="button-box-right-formatted" id="programacao-adicionar-box-${j}" style="display: block; margin-top: 24px">
            <button id="programacao-adicionar-${j}" class="btn btn-theme" onclick="_openInnerProgramacao(${j})">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">
                  <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12Zm10-8a8 8 0 1 0 0 16a8 8 0 0 0 0-16Z">
                  </path>
                  <path d="M13 7a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7Z">
                  </path>
                </g>
              </svg>
              ${translate('labels.add')}
            </button>
          </div>

        </div>
      </div>
    </div>`
  }

  for (const child of _getChildIDs('programacao-box')) {
    const j = _getJ(child);
    getID(`programacao-inner-title-select-${j}`).addEventListener('change', () => _updateProgramacaoTitle(j))
    getID(`programacao-inner-title-${j}`).addEventListener('change', () => _updateProgramacaoTitle(j))
    _loadProgramacaoListeners(j);
  }
  
  getID('habilitado-programacao').addEventListener('change', () => _reloadProgramacao());
}

function _addGaleria() {
  const j = _getNextJ('galeria-box');
  $('#galeria-box').append(`
      <div id="galeria-${j}" class="accordion-item accordion-galeria" >
      <h2 class="accordion-header" id="heading-galeria-${j}">
        <button id="galeria-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-galeria-${j}" aria-expanded="false" aria-controls="collapse-hospedagens-${j}">
          ${translate('labels.image.title')} ${j}
        </button>
      </h2>
      <div id="collapse-galeria-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-galeria-${j}" data-bs-parent="#galeria-box">
        <div class="accordion-body">
          <div class="nice-form-group">
            <label>${translate('labels.title')}</label>
            <input required id="galeria-titulo-${j}" type="text" placeholder="${translate('destination.lineup.title')}" />
          </div>

          <div class="nice-form-group" id="galeria-select-form-group-${j}">
            <label>${translate('labels.type')} <span class="opcional"> (${translate('labels.optional')})</span></label>
            <select id="galeria-categoria-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="galeria-categoria-${j}" type="text" placeholder="${translate('destination.map.title')}" />
          </div>
    
          <div class="nice-form-group">
            <label>${translate('labels.description.title.title')} <span class="opcional"> (${translate('labels.optional')})</span></label>
            <input id="galeria-descricao-${j}" type="text" placeholder="${translate('trip.gallery.description_placeholder')}" />
          </div>
    
          <div class="nice-form-group customization-box" id="galeria-${j}-box">
            <label>${translate('labels.image.title')}</label>
            <input id="upload-galeria-${j}" class="imagem-uploadbox" type="file" accept=".jpg, .jpeg, .png" />
            <div id="upload-galeria-${j}-size-message" class="message-text"> <i class='red'>*</i> ${translate('labels.image.upload_limit')}</div>
          </div>
    
          <div class="nice-form-group">
            <input id="link-galeria-${j}" class="imagem-input" type="url" placeholder="${translate('labels.image.placeholder')}" value=""
              class="icon-right">
          </div>
    
          <fieldset class="nice-form-group imagem-checkbox">
            <div class="nice-form-group enable-link">
              <input type="radio" name="type-galeria-${j}" id="enable-link-galeria-${j}" checked>
              <label for="enable-link-galeria-${j}">${translate('labels.image.link')}</label>
            </div>
    
            <div class="nice-form-group">
              <input type="radio" name="type-galeria-${j}" id="enable-upload-galeria-${j}">
              <label for="enable-upload-galeria-${j}">${translate('labels.image.upload')} <span class="opcional"> (${translate('labels.image.upload_limit')})</span></label>
            </div>
          </fieldset>
    
          </div>
  
        <div class="button-box-right-formatted">
          <button id="remove-galeria-${j}" class="btn btn-basic btn-format">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" fill-rule="evenodd"
                d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z"
                clip-rule="evenodd"></path>
          </svg>
          </button>
        </div>
        
      </div>
    </div>
      `);

  _loadImageSelector(`galeria-${j}`);
  _loadGaleriaListeners(j);
  _addRemoveGaleriaListener(j);
  _addSelectorDS('galeria-categoria', `galeria-categoria-select-${j}`, `galeria-categoria-${j}`);
}