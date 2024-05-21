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

  getID('moeda').value = 'R$';
  getID('quantidadePessoas').value = 1;
}

function _loadProgramacao() {
  const inicio = getID('inicio').value;
  const fim = getID('fim').value;

  DATAS = _getArrayOfDates(inicio, fim);

  const programacaoBox = getID('programacao-box');
  programacaoBox.innerHTML = '';

  for (let j = 1; j <= DATAS.length; j++) {
    const data = DATAS[j - 1];
    let dataFormatada = _jsDateToDayOfTheWeekAndDateTitle(data);

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
          <h1 class="item-title"></h1>

          <div class="nice-form-group">
            <label>Local / Título <span class="opcional"> (Opcional)</span></label>
            <input id="programacao-inner-title-${j}" type="text" placeholder="São Paulo" />
          </div>

          <div class="inner-programacao" id="inner-programacao-${j}"></div>

          <div class="button-box" id="programacao-adicionar-box-${j}" style="display: block;">
            <button id="programacao-adicionar-${j}" class="btn btn-purple" onclick="_addInnerProgramacaoButton(${j})">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">
                  <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12Zm10-8a8 8 0 1 0 0 16a8 8 0 0 0 0-16Z">
                  </path>
                  <path d="M13 7a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7Z">
                  </path>
                </g>
              </svg>
              Adicionar Programação
            </button>
          </div>

        </div>
      </div>
    </div>
      `
  }

  for (const child of _getChildIDs('programacao-box')) {
    const j = child.split('-')[child.split('-').length - 1];
    getID(`programacao-inner-title-${j}`).addEventListener('change', () => _updateProgramacaoTitle(j))
  }
}

function _loadDestinos() {
  if (DESTINOS && DESTINOS.length > 0) {
    let destinos = DESTINOS;
    destinos.sort((a, b) => a.titulo.localeCompare(b.titulo));
    getID('sem-destinos').style.display = 'none';
    getID('com-destinos').style.display = 'block';

    const fieldset = getID('destinos-checkboxes');
    fieldset.innerHTML = '';
    for (let j=1; j < destinos.length; j++) {
      const i = j - 1;
      fieldset.innerHTML += `<div class="nice-form-group" id="checkbox-${j}">
                              <input type="checkbox" id="check-${j}" value="${destinos[i].code}">
                              <label id=check-label-${j} for="check-${j}">${destinos[i].titulo}</label>
                             </div>`
    }
  }
}

function _addTransporte() {
  var i = 1;
  while (getID('transporte-' + i)) {
    i++;
  }

  var checkedIda = '';
  var checkedVolta = '';
  var day = '';

  if (i === 1) {
    checkedIda = 'checked';
    day = getID('inicio').value;
  } else {
    checkedVolta = 'checked';
    day = getID('fim').value;
  }

  $('#transporte-box').append(`
      <div id="transporte-${i}" class="accordion-item accordion-transporte" >
      <h2 class="accordion-header" id="heading-transporte-${i}">
        <button id="transporte-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-transporte-${i}" aria-expanded="false" aria-controls="collapse-transporte-${i}">
          Trajeto ${i}
        </button>
      </h2>
      <div id="collapse-transporte-${i}" class="accordion-collapse collapse"
        aria-labelledby="heading-transporte-${i}" data-bs-parent="#transporte-box">
        <div class="accordion-body">
          <fieldset class="nice-form-group" id="idaVolta-box-${i}">
            <div class="nice-form-group" style="margin-top: -15px">
              <input type="radio" name="idaVolta-${i}" id="ida-${i}" ${checkedIda} />
              <label for="ida-${i}">Ida</label>
            </div>
  
            <div class="nice-form-group">
              <input type="radio" name="idaVolta-${i}" id="durante-${i}"/>
              <label for="durante-${i}">Durante a Viagem</label>
            </div>
  
            <div class="nice-form-group">
              <input type="radio" name="idaVolta-${i}" id="volta-${i}" ${checkedVolta} />
              <label for="volta-${i}">Volta</label>
            </div>
          </fieldset>

          <div class="nice-form-group">
            <label>Ponto de Partida <span class="opcional"> (Opcional)</span></label>
            <input id="ponto-partida-${i}" type="text" placeholder="Belo Horizonte" />
          </div>

          <div class="nice-form-group">
            <label>Ponto de Chegada <span class="opcional"> (Opcional)</span></label>
            <input id="ponto-chegada-${i}" type="text" placeholder="Las Vegas" />
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Partida</label>
              <input required class="flex-input" id="partida-${i}" type="date" value="${day}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input required class="flex-input mini-box" id="partida-horario-${i}" type="time" value="00:00" />
            </div>
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Chegada</label>
              <input required class="flex-input" id="chegada-${i}" type="date" value="${day}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input required class="flex-input mini-box" id="chegada-horario-${i}" type="time" value="00:30" />
            </div>
          </div>
  
          <div class="nice-form-group">
            <label>Meio de Transporte</label>
            <select required id="transporte-tipo-${i}">
              <option value="voo">Avião</option>
              <option value="carro">Carro</option>
              <option value="onibus">Ônibus</option>
              <option value="bondinho">Bondinho</option>
              <option value="helicoptero">Helicóptero</option>
              <option value="locomotiva">Locomotiva</option>
              <option value="metro">Metrô</option>
              <option value="moto">Moto</option>
              <option value="navio">Navio</option>
              <option value="trem-bala">Trem Bala</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div class="nice-form-group">
            <label>Duração <span class="opcional"> (Opcional)</span></label>
            <input class="flex-input" id="transporte-duracao-${i}" type="time" />
          </div>

          <div class="nice-form-group" id="empresa-select-form-group-${i}">
            <label>Nome da Empresa <span class="opcional"> (Opcional)</span></label>
            <select id="empresa-select-${i}" style="display: none;"></select>
            <input class="nice-form-group" id="empresa-${i}" type="text" placeholder="Empresa de Transporte" />
          </div>

          <div class="nice-form-group">
            <label>Código da Reserva <span class="opcional"> (Opcional)</span></label>
            <input id="reserva-transporte-${i}" type="text" placeholder="ABC123" />
          </div>

          <div class="nice-form-group">
            <label>Link da Reserva <span class="opcional"> (Opcional)</span></label>
            <input id="transporte-link-${i}" type="url" placeholder="https://www.google.com/" value=""
              class="icon-right" />
          </div>
  
        </div>
  
        <div class="deletar-box">
          <button id="remove-transporte-${i}" class="btn btn-secondary">
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

  _loadTransporteListeners(i);
  _addRemoveChildListener('transporte', i);
  _loadTransporteVisibility(i);
  _applyIdaVoltaVisibility(i);
}

function _addHospedagens() {
  var i = 1;
  while (getID('hospedagens-' + i)) {
    i++;
  }

  $('#hospedagens-box').append(`
      <div id="hospedagens-${i}" class="accordion-item accordion-hospedagens" >
      <h2 class="accordion-header" id="heading-hospedagens-${i}">
        <button id="hospedagens-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-hospedagens-${i}" aria-expanded="false" aria-controls="collapse-hospedagens-${i}">
          Hospedagem ${i}
        </button>
      </h2>
      <div id="collapse-hospedagens-${i}" class="accordion-collapse collapse"
        aria-labelledby="heading-hospedagens-${i}" data-bs-parent="#hospedagens-box">
        <div class="accordion-body">
          <div class="nice-form-group">
            <input id="hospedagens-cafe-${i}" type="checkbox" class="switch">
            <label for="hospedagens-cafe-${i}">
              Café da Manhã Incluso
            </label>
          </div>

          <div class="nice-form-group">
            <label>Nome da Hospedagem</label>
            <input required id="hospedagens-nome-${i}" type="text" placeholder="Casa da Fernanda" />
          </div>
  
          <div class="nice-form-group">
            <label>Endereço</label>
            <input required id="hospedagens-endereco-${i}" type="text" placeholder="Rua ABC, número 0" />
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Check-In</label>
              <input class="flex-input" id="check-in-${i}" type="date" value="${TODAY}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input class="flex-input mini-box" id="check-in-horario-${i}" type="time" value="14:00" />
            </div>
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Check-Out</label>
              <input class="flex-input" id="check-out-${i}" type="date" value="${TOMORROW}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input class="flex-input mini-box" id="check-out-horario-${i}" type="time" value="12:00" />
            </div>
          </div>
  
          <div class="nice-form-group">
            <label>Descrição <span class="opcional"> (Opcional)</span></label>
            <input id="hospedagens-descricao-${i}" type="text" placeholder="Quarto Duplo, camas King" />
          </div>
    
          <div class="nice-form-group">
            <label>Link da Reserva <span class="opcional"> (Opcional)</span></label>
            <input id="reserva-hospedagens-link-${i}" type="url" placeholder="https://www.google.com/" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group customization-box" id="hospedagens-${i}-box">
            <label>Imagem <span class="opcional"> (Opcional)</span></label>
            <input id="upload-hospedagens-${i}" class="imagem-uploadbox" type="file" accept=".jpg, .jpeg, .png" />
            <p id="upload-hospedagens-${i}-size-message" class="message-text"> <i class='red'>*</i> Insira uma imagem de até 1.5MB</p>
          </div>

          <div class="nice-form-group">
            <input id="link-hospedagens-${i}" class="imagem-input" type="url" placeholder="https://link.com/imagem.jpg" value=""
              class="icon-right">
          </div>

          <fieldset class="nice-form-group imagem-checkbox" id="upload-checkbox-hospedagens-${i}">
            <div class="nice-form-group">
              <input type="radio" name="type-hospedagens-${i}" id="enable-link-hospedagens-${i}" checked>
              <label for="enable-link-hospedagens-${i}">Fornecer link</label>
            </div>

            <div class="nice-form-group">
              <input type="radio" name="type-hospedagens-${i}" id="enable-upload-hospedagens-${i}">
              <label for="enable-upload-hospedagens-${i}">Carregar imagem <span class="opcional"> (Até 1.5MB)</span></label>
            </div>
          </fieldset>
            
          </div>
    
          <div class="deletar-box">
            <button id="remove-hospedagens-${i}" class="btn btn-secondary">
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

  _loadImageSelector(`hospedagens-${i}`);
  _addRemoveChildListener('hospedagens', i);
}

function _addDestinos() {
  let i = 1;
  while (getID(`select-destinos-${i}`)) {
    i++;
  };

  $('#com-destinos').append(`
    <div class="nice-form-group" id="com-destinos-${i}">
      <select id="select-destinos-${i}" class="editar-select">
        <option value="">Selecione um Destino</option>
      </select>

      <div class="deletar-box-destinos">
        <button id="remove-destinos-${i}" class="btn btn-secondary" onclick="_deleteDestino(${i})">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>

    </div>
    `);

  getID(`select-destinos-${i}`).addEventListener('change', () => {
    _buildDestinosSelect();
    _buildLineupSelects();
  });

  _buildDestinosSelect();
}

function _addEditores() {
  let i = 1;
  while (getID(`editores-email-${i}`)) {
    i++;
  };

  $('#habilitado-editores-content').append(`
    <div class="nice-form-group" id="editores-${i}">
      <label>Editor ${i}</label>
      <input
        id="editores-email-${i}"
        type="email"
        placeholder="Email cadastrado no TripViewer"
        value=""
        class="icon-left"
      />
    </div>
    `);
}

function _addLineup() {
  let i = 1;
  while (getID(`lineup-${i}`)) {
    i++;
  }

  $('#lineup-box').append(`
    <div id="lineup-${i}" class="accordion-item accordion-lineup" >
      <h2 class="accordion-header" id="heading-lineup-${i}">
        <button id="lineup-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-lineup-${i}" aria-expanded="true" aria-controls="collapse-lineup-${i}">
          Banda / Artista ${i}
        </button>
      </h2>
      <div id="collapse-lineup-${i}" class="accordion-collapse collapse" aria-labelledby="heading-lineup-${i}"
        data-bs-parent="#lineup-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="lineup-headliner-${i}" class="switch" />
            <label for="lineup-headliner-${i}">
              Headliner
            </label>
          </div>
  
          <div class="nice-form-group">
            <label>Nome</label>
            <input required id="lineup-nome-${i}" type="text" placeholder="Games We Play" />
          </div>
  
          <div class="nice-form-group" id="lineup-local-box-${i}">
            <label>Local</label>
            <select id="lineup-local-${i}">
              <option value="generico">Destino Não Especificado</option>
            </select>
          </div>

          <div class="nice-form-group" id="lineup-genero-select-form-group-${i}">
            <label>Gênero <span class="opcional"> (Opcional)</span></label>
            <select id="lineup-genero-select-${i}" style="display: none;"></select>
            <input class="nice-form-group" id="lineup-genero-${i}" type="text" placeholder="Pop Punk" />
          </div>

          <div class="nice-form-group" id="lineup-palco-select-form-group-${i}">
            <label>Palco <span class="opcional"> (Opcional)</span></label>
            <select id="lineup-palco-select-${i}" style="display: none;"></select>
            <input class="nice-form-group" id="lineup-palco-${i}" type="text" placeholder="Stripe Stage" />
          </div>
  
          <div class="nice-form-group side-by-side">
            <label>Data <span class="opcional"> (Opcional)</span></label>
            <input class="flex-input" id="lineup-data-${i}" type="date" value="">
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Início <span class="opcional"> (Opcional)</span></label>
              <input id="lineup-inicio-${i}" type="time" value="" />
            </div>
  
            <div class="nice-form-group side-by-side">
              <label>Fim <span class="opcional"> (Opcional)</span></label>
              <input id="lineup-fim-${i}" type="time" value="" />
            </div>
          </div>
  
          <div class="nice-form-group">
            <label>Playlist ou Página do Artista <span class="opcional"> (Opcional)</span></label>
            <input id="lineup-midia-${i}" type="url"
              placeholder="https://open.spotify.com/playlist/16mG20ZrC9QttUB6Sozqep?si=da0794cde4914a17"
              value="" class="icon-right" />
            <div class="legenda">Apenas links Spotify</div>
          </div>
  
          <div class="nice-form-group">
            <label>Prioridade <span class="opcional">(Opcional)</span></label>
            <select class="editar-select" id="lineup-nota-${i}">
            <option value="?">Desconhecido</option>
            <option value="5">5 - Artista Excelente!</option>
            <option value="4">4 - Ótimo Artista</option>
            <option value="3">3 - Artista Razoável</option>
            <option value="2">2 - Baixa Prioridade</option>
            <option value="1">1 - Não Recomendado</option>
            </select>
          </div>
  
        </div>
  
        <div class="deletar-box">
          <button id="remove-lineup-${i}" class="btn btn-secondary">
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

  _buildLineupSelects();
  _loadLineupListeners(i);
  _addRemoveChildListener('lineup', i);
}

function _addGaleria() {
  var i = 1;
  while (getID('galeria-' + i)) {
    i++;
  }

  $('#galeria-box').append(`
      <div id="galeria-${i}" class="accordion-item accordion-galeria" >
      <h2 class="accordion-header" id="heading-galeria-${i}">
        <button id="galeria-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-galeria-${i}" aria-expanded="false" aria-controls="collapse-hospedagens-${i}">
          Imagem ${i}
        </button>
      </h2>
      <div id="collapse-galeria-${i}" class="accordion-collapse collapse"
        aria-labelledby="heading-galeria-${i}" data-bs-parent="#galeria-box">
        <div class="accordion-body">
          <div class="nice-form-group">
            <label>Título</label>
            <input required id="galeria-titulo-${i}" type="text" placeholder="Lineup por dia" />
          </div>

          <div class="nice-form-group" id="galeria-select-form-group-${i}">
            <label>Categoria <span class="opcional"> (Opcional)</span></label>
            <select id="galeria-categoria-select-${i}" style="display: none;"></select>
            <input class="nice-form-group" id="galeria-categoria-${i}" type="text" placeholder="Mapa" />
          </div>
    
          <div class="nice-form-group">
            <label>Descrição <span class="opcional"> (Opcional)</span></label>
            <input id="galeria-descricao-${i}" type="text" placeholder="Mapa oficial do evento" />
          </div>
    
          <div class="nice-form-group customization-box" id="galeria-${i}-box">
            <label>Imagem</label>
            <input id="upload-galeria-${i}" class="imagem-uploadbox" type="file" accept=".jpg, .jpeg, .png" />
            <div id="upload-galeria-${i}-size-message" class="message-text"> <i class='red'>*</i> Insira uma imagem de até 1.5MB</div>
          </div>
    
          <div class="nice-form-group">
            <input id="link-galeria-${i}" class="imagem-input" type="url" placeholder="https://link.com/imagem.jpg" value=""
              class="icon-right">
          </div>
    
          <fieldset class="nice-form-group imagem-checkbox">
            <div class="nice-form-group enable-link">
              <input type="radio" name="type-galeria-${i}" id="enable-link-galeria-${i}" checked>
              <label for="enable-link-galeria-${i}">Fornecer link</label>
            </div>
    
            <div class="nice-form-group">
              <input type="radio" name="type-galeria-${i}" id="enable-upload-galeria-${i}">
              <label for="enable-upload-galeria-${i}">Carregar imagem <span class="opcional"> (Até 1.5MB)</span></label>
            </div>
          </fieldset>
    
          </div>
  
        <div class="deletar-box">
          <button id="remove-galeria-${i}" class="btn btn-secondary">
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

  _loadImageSelector(`galeria-${i}`);
  _loadGaleriaListeners(i);
  _addRemoveChildListener('galeria', i);
}