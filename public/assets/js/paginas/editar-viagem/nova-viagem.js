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

          <div class="nice-form-group" id="programacao-local-box-${j}" style="display: ${_getDestinosAtivosSelectVisibility()}">
            <label>Local<span class="opcional"> (Opcional)</span></label>
            <fieldset class="nice-form-group destinos-checkboxes" id="programacao-local-${j}">
              ${_getDestinosAtivosCheckboxOptions('programacao', j)}
            </fieldset>
          </div>

          <div class="nice-form-group">
            <label>Título<span class="opcional"> (Opcional)</span></label>
              <select class="editar-select" id="programacao-inner-title-select-${j}" style="display: block;">
                ${_getProgramacaoTitleSelectOptions()}
              </select>  
            <input class="nice-form-group" id="programacao-inner-title-${j}" type="text" placeholder="São Paulo" style="display: none;">
          </div>

          <div class='turno-box' id='programacao-madrugada-${j}' style="display: none;">
            <label>Madrugada</label>
            <div class="inner-programacao" id="inner-programacao-madrugada-${j}"></div>
          </div>

          <div class='turno-box' id='programacao-manha-${j}' style="display: none;">
            <label>Manhã</label>
            <div class="inner-programacao" id="inner-programacao-manha-${j}"></div>
          </div>

          <div class='turno-box' id='programacao-tarde-${j}' style="display: none;">
            <label>Tarde</label>
            <div class="inner-programacao" id="inner-programacao-tarde-${j}"></div>
          </div>

          <div class='turno-box' id='programacao-noite-${j}' style="display: none;">
            <label>Noite</label>
            <div class="inner-programacao" id="inner-programacao-noite-${j}"></div>
          </div>

          <div class="button-box" id="programacao-adicionar-box-${j}" style="display: block; margin-top: 24px">
            <button id="programacao-adicionar-${j}" class="btn btn-purple" onclick="_openInnerProgramacao(${j})">
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
    </div>`
  }

  for (const child of _getChildIDs('programacao-box')) {
    const j = _getJ(child);
    getID(`programacao-inner-title-select-${j}`).addEventListener('change', () => _updateProgramacaoTitle(j))
    getID(`programacao-inner-title-${j}`).addEventListener('change', () => _updateProgramacaoTitle(j))
    _loadProgramacaoListeners(j);
  }
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

  for (const child of _getChildIDs('destinos-checkboxes')) {
    const j = _getJ(child);
    getID(`check-destinos-${j}`).addEventListener('change', () => _updateDestinosAtivosHTMLs())
  }
}

function _addTransporte() {
  const j = _getNextJ('transporte-box')
  var checkedIda = '';
  var checkedVolta = '';
  var day = '';

  if (j === 1) {
    checkedIda = 'checked';
    day = getID('inicio').value;
  } else {
    checkedVolta = 'checked';
    day = getID('fim').value;
  }

  $('#transporte-box').append(`
      <div id="transporte-${j}" class="accordion-item accordion-transporte" >
      <h2 class="accordion-header" id="heading-transporte-${j}">
        <button id="transporte-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-transporte-${j}" aria-expanded="false" aria-controls="collapse-transporte-${j}">
          Trajeto ${j}
        </button>
      </h2>
      <div id="collapse-transporte-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-transporte-${j}" data-bs-parent="#transporte-box">
          <div class="accordion-body">
            <div class="nice-form-group" style="display: none">
            <label>Identificador</label>
            <input id="transporte-id-${j}" type="text" disabled />
          </div>

          <fieldset class="nice-form-group" id="idaVolta-box-${j}">
            <div class="nice-form-group" style="margin-top: -15px">
              <input type="radio" name="idaVolta-${j}" id="ida-${j}" ${checkedIda} />
              <label for="ida-${j}">Ida</label>
            </div>
  
            <div class="nice-form-group">
              <input type="radio" name="idaVolta-${j}" id="durante-${j}"/>
              <label for="durante-${j}">Durante a Viagem</label>
            </div>
  
            <div class="nice-form-group">
              <input type="radio" name="idaVolta-${j}" id="volta-${j}" ${checkedVolta} />
              <label for="volta-${j}">Volta</label>
            </div>
          </fieldset>

          <div class="nice-form-group">
            <label>Ponto de Partida <span class="opcional"> (Opcional)</span></label>
            <input id="ponto-partida-${j}" type="text" placeholder="Belo Horizonte" />
          </div>

          <div class="nice-form-group">
            <label>Ponto de Chegada <span class="opcional"> (Opcional)</span></label>
            <input id="ponto-chegada-${j}" type="text" placeholder="Las Vegas" />
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Partida</label>
              <input required class="flex-input" id="partida-${j}" type="date" value="${day}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input required class="flex-input mini-box" id="partida-horario-${j}" type="time" value="00:00" />
            </div>
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Chegada</label>
              <input required class="flex-input" id="chegada-${j}" type="date" value="${day}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input required class="flex-input mini-box" id="chegada-horario-${j}" type="time" value="00:30" />
            </div>
          </div>
  
          <div class="nice-form-group">
            <label>Meio de Transporte</label>
            <select class="editar-select" required id="transporte-tipo-${j}">
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
            <input class="flex-input" id="transporte-duracao-${j}" type="time" />
          </div>

          <div class="nice-form-group" id="empresa-select-form-group-${j}">
            <label>Nome da Empresa <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="empresa-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="empresa-${j}" type="text" placeholder="Empresa de Transporte" />
          </div>

          <div class="nice-form-group">
            <label>Código da Reserva <span class="opcional"> (Opcional)</span></label>
            <input id="reserva-transporte-${j}" type="text" placeholder="ABC123" />
          </div>

          <div class="nice-form-group">
            <label>Link da Reserva <span class="opcional"> (Opcional)</span></label>
            <input id="transporte-link-${j}" type="url" placeholder="https://www.google.com/" value=""
              class="icon-right" />
          </div>
  
        </div>
  
        <div class="deletar-box">
          <button id="remove-transporte-${j}" class="btn btn-secondary">
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

  _loadTransporteListeners(j);
  _addRemoveChildListener('transporte', j);
  _loadTransporteVisibility(j);
  _applyIdaVoltaVisibility(j);
}

function _addHospedagens() {
  const j = _getNextJ('hospedagens-box');
  $('#hospedagens-box').append(`
      <div id="hospedagens-${j}" class="accordion-item accordion-hospedagens" >
      <h2 class="accordion-header" id="heading-hospedagens-${j}">
        <button id="hospedagens-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-hospedagens-${j}" aria-expanded="false" aria-controls="collapse-hospedagens-${j}">
          Hospedagem ${j}
        </button>
      </h2>
      <div id="collapse-hospedagens-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-hospedagens-${j}" data-bs-parent="#hospedagens-box">
          <div class="accordion-body">
            <div class="nice-form-group" style="display: none">
            <label>Identificador</label>
            <input id="hospedagens-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group">
            <input id="hospedagens-cafe-${j}" type="checkbox" class="switch">
            <label for="hospedagens-cafe-${j}">
              Café da Manhã Incluso
            </label>
          </div>

          <div class="nice-form-group">
            <label>Nome da Hospedagem</label>
            <input required id="hospedagens-nome-${j}" type="text" placeholder="Casa da Fernanda" />
          </div>
  
          <div class="nice-form-group">
            <label>Endereço</label>
            <input required id="hospedagens-endereco-${j}" type="text" placeholder="Rua ABC, número 0" />
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Check-In</label>
              <input class="flex-input" id="check-in-${j}" type="date" value="${TODAY}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input class="flex-input mini-box" id="check-in-horario-${j}" type="time" value="14:00" />
            </div>
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Check-Out</label>
              <input class="flex-input" id="check-out-${j}" type="date" value="${TOMORROW}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input class="flex-input mini-box" id="check-out-horario-${j}" type="time" value="12:00" />
            </div>
          </div>
  
          <div class="nice-form-group">
            <label>Descrição <span class="opcional"> (Opcional)</span></label>
            <input id="hospedagens-descricao-${j}" type="text" placeholder="Quarto Duplo, camas King" />
          </div>
    
          <div class="nice-form-group">
            <label>Link da Reserva <span class="opcional"> (Opcional)</span></label>
            <input id="reserva-hospedagens-link-${j}" type="url" placeholder="https://www.google.com/" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group customization-box" id="hospedagens-${j}-box">
            <label>Imagem <span class="opcional"> (Opcional)</span></label>
            <input id="upload-hospedagens-${j}" class="imagem-uploadbox" type="file" accept=".jpg, .jpeg, .png" />
            <p id="upload-hospedagens-${j}-size-message" class="message-text"> <i class='red'>*</i> Insira uma imagem de até 1.5MB</p>
          </div>

          <div class="nice-form-group">
            <input id="link-hospedagens-${j}" class="imagem-input" type="url" placeholder="https://link.com/imagem.jpg" value=""
              class="icon-right">
          </div>

          <fieldset class="nice-form-group imagem-checkbox" id="upload-checkbox-hospedagens-${j}">
            <div class="nice-form-group">
              <input type="radio" name="type-hospedagens-${j}" id="enable-link-hospedagens-${j}" checked>
              <label for="enable-link-hospedagens-${j}">Fornecer link</label>
            </div>

            <div class="nice-form-group">
              <input type="radio" name="type-hospedagens-${j}" id="enable-upload-hospedagens-${j}">
              <label for="enable-upload-hospedagens-${j}">Carregar imagem <span class="opcional"> (Até 1.5MB)</span></label>
            </div>
          </fieldset>
            
          </div>
    
          <div class="deletar-box">
            <button id="remove-hospedagens-${j}" class="btn btn-secondary">
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

  _loadImageSelector(`hospedagens-${j}`);
  _addRemoveChildListener('hospedagens', j);
}

function _addEditores() {
  const j = _getNextJ('habilitado-editores-content');
  $('#habilitado-editores-content').append(`
    <div class="nice-form-group" id="editores-${j}">
      <label>Editor ${j}</label>
      <input
        id="editores-email-${j}"
        type="email"
        placeholder="Email cadastrado no TripViewer"
        value=""
        class="icon-left"
      />
    </div>
    `);
}

function _addLineup() {
  const j = _getNextJ('lineup-box');
  $('#lineup-box').append(`
    <div id="lineup-${j}" class="accordion-item accordion-lineup" >
      <h2 class="accordion-header" id="heading-lineup-${j}">
        <button id="lineup-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-lineup-${j}" aria-expanded="true" aria-controls="collapse-lineup-${j}">
          Banda / Artista ${j}
        </button>
      </h2>
      <div id="collapse-lineup-${j}" class="accordion-collapse collapse" aria-labelledby="heading-lineup-${j}"
        data-bs-parent="#lineup-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="lineup-headliner-${j}" class="switch" />
            <label for="lineup-headliner-${j}">
              Headliner
            </label>
          </div>
  
          <div class="nice-form-group">
            <label>Nome</label>
            <input required id="lineup-nome-${j}" type="text" placeholder="Games We Play" />
          </div>
  
          <div class="nice-form-group" id="lineup-local-box-${j}">
            <label>Local</label>
            <select class="editar-select" id="lineup-local-${j}" style="display: ${_getDestinosAtivosSelectVisibility()}">
              ${_getDestinosAtivosSelectOptions()}
            </select>
          </div>

          <div class="nice-form-group" id="lineup-genero-select-form-group-${j}">
            <label>Gênero <span class="opcional"> (Opcional)</span></label>
            <select id="lineup-genero-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="lineup-genero-${j}" type="text" placeholder="Pop Punk" />
          </div>

          <div class="nice-form-group" id="lineup-palco-select-form-group-${j}">
            <label>Palco <span class="opcional"> (Opcional)</span></label>
            <select id="lineup-palco-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="lineup-palco-${j}" type="text" placeholder="Stripe Stage" />
          </div>
  
          <div class="nice-form-group side-by-side">
            <label>Data <span class="opcional"> (Opcional)</span></label>
            <input class="flex-input" id="lineup-data-${j}" type="date" value="">
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Início <span class="opcional"> (Opcional)</span></label>
              <input id="lineup-inicio-${j}" type="time" value="" />
            </div>
  
            <div class="nice-form-group side-by-side">
              <label>Fim <span class="opcional"> (Opcional)</span></label>
              <input id="lineup-fim-${j}" type="time" value="" />
            </div>
          </div>
  
          <div class="nice-form-group">
            <label>Playlist ou Página do Artista <span class="opcional"> (Opcional)</span></label>
            <input id="lineup-midia-${j}" type="url"
              placeholder="https://open.spotify.com/playlist/16mG20ZrC9QttUB6Sozqep?si=da0794cde4914a17"
              value="" class="icon-right" />
            <div class="legenda">Apenas links Spotify</div>
          </div>
  
          <div class="nice-form-group">
            <label>Prioridade <span class="opcional">(Opcional)</span></label>
            <select class="editar-select" id="lineup-nota-${j}">
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
          <button id="remove-lineup-${j}" class="btn btn-secondary">
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

  _loadLineupListeners(j);
  _addRemoveChildListener('lineup', j);
}

function _addGaleria() {
  const j = _getNextJ('galeria-box');
  $('#galeria-box').append(`
      <div id="galeria-${j}" class="accordion-item accordion-galeria" >
      <h2 class="accordion-header" id="heading-galeria-${j}">
        <button id="galeria-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-galeria-${j}" aria-expanded="false" aria-controls="collapse-hospedagens-${j}">
          Imagem ${j}
        </button>
      </h2>
      <div id="collapse-galeria-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-galeria-${j}" data-bs-parent="#galeria-box">
        <div class="accordion-body">
          <div class="nice-form-group">
            <label>Título</label>
            <input required id="galeria-titulo-${j}" type="text" placeholder="Lineup por dia" />
          </div>

          <div class="nice-form-group" id="galeria-select-form-group-${j}">
            <label>Categoria <span class="opcional"> (Opcional)</span></label>
            <select id="galeria-categoria-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="galeria-categoria-${j}" type="text" placeholder="Mapa" />
          </div>
    
          <div class="nice-form-group">
            <label>Descrição <span class="opcional"> (Opcional)</span></label>
            <input id="galeria-descricao-${j}" type="text" placeholder="Mapa oficial do evento" />
          </div>
    
          <div class="nice-form-group customization-box" id="galeria-${j}-box">
            <label>Imagem</label>
            <input id="upload-galeria-${j}" class="imagem-uploadbox" type="file" accept=".jpg, .jpeg, .png" />
            <div id="upload-galeria-${j}-size-message" class="message-text"> <i class='red'>*</i> Insira uma imagem de até 1.5MB</div>
          </div>
    
          <div class="nice-form-group">
            <input id="link-galeria-${j}" class="imagem-input" type="url" placeholder="https://link.com/imagem.jpg" value=""
              class="icon-right">
          </div>
    
          <fieldset class="nice-form-group imagem-checkbox">
            <div class="nice-form-group enable-link">
              <input type="radio" name="type-galeria-${j}" id="enable-link-galeria-${j}" checked>
              <label for="enable-link-galeria-${j}">Fornecer link</label>
            </div>
    
            <div class="nice-form-group">
              <input type="radio" name="type-galeria-${j}" id="enable-upload-galeria-${j}">
              <label for="enable-upload-galeria-${j}">Carregar imagem <span class="opcional"> (Até 1.5MB)</span></label>
            </div>
          </fieldset>
    
          </div>
  
        <div class="deletar-box">
          <button id="remove-galeria-${j}" class="btn btn-secondary">
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
  _addRemoveChildListener('galeria', j);
}