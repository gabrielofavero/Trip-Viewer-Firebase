function _loadNewTrip() {
  _loadDadosBasicosNewTrip();
  _loadProgramacao();
  _loadDestinos();
}

function _loadDadosBasicosNewTrip() {
  document.getElementById('inicio').value = TODAY;
  document.getElementById('fim').value = TOMORROW;

  document.getElementById('moeda').value = 'R$';
  document.getElementById('quantidadePessoas').value = 1;
}

function _loadProgramacao() {
  const inicio = document.getElementById('inicio').value;
  const fim = document.getElementById('fim').value;

  const dates = _getArrayOfFormattedDates(inicio, fim);

  const box = document.getElementById('programacao-box');
  box.innerHTML = '';

  var newDates = [];

  for (let i = 1; i <= dates.length; i++) {
    const date = _changeFormat(dates[i - 1], 'dd/mm/yyyy');
    let title = date;

    if (PROGRAMACAO && PROGRAMACAO[i] && PROGRAMACAO[i].titulo) {
      title = `${PROGRAMACAO[i].titulo}: ${date}`;
    }

    box.innerHTML += `
      <div id="programacao-${i}" class="accordion-item accordion-programacao" draggable="true">
      <h2 class="accordion-header" id="heading-programacao-${i}">
        <button id="programacao-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-programacao-${i}" aria-expanded="false"
          aria-controls="collapse-programacao-${i}">
          ${title}
        </button>
      </h2>
      <div id="collapse-programacao-${i}" class="accordion-collapse collapse"
        aria-labelledby="heading-programacao-${i}" data-bs-parent="#programacao-box">
        <div class="accordion-body">
          <h1 class="item-title"></h1>

          <div class="nice-form-group">
            <label>Local / Título <span class="opcional"> (Opcional)</span></label>
            <input id="programacao-inner-title-${i}" type="text" placeholder="São Paulo" />
          </div>
  
          <div class="nice-form-group">
            <label>Manhã</label>
            <input id="manha-1-${i}" type="text" placeholder="Fazer isso" /><br><br>
            <input id="manha-2-${i}" type="text" placeholder="Depois aquilo" /><br><br>
            <input id="manha-3-${i}" type="text" placeholder="Por fim, isso" />
          </div>
  
          <div class="nice-form-group">
            <label>Tarde</label>
            <input id="tarde-1-${i}" type="text" placeholder="Fazer isso" /><br><br>
            <input id="tarde-2-${i}" type="text" placeholder="Depois aquilo" /><br><br>
            <input id="tarde-3-${i}" type="text" placeholder="Por fim, isso" />
          </div>
  
          <div class="nice-form-group">
            <label>Noite</label>
            <input id="noite-1-${i}" type="text" placeholder="Fazer isso" /><br><br>
            <input id="noite-2-${i}" type="text" placeholder="Depois aquilo" /><br><br>
            <input id="noite-3-${i}" type="text" placeholder="Por fim, isso" />
          </div>

        </div>
      </div>
    </div>
      `
    newDates.push(_removeSlashesFromDate(date));
  }

  for (let i = 1; i <= newDates.length; i++) {
    const formatted = newDates[i - 1];
    if (PROGRAMACAO && PROGRAMACAO[i, formatted]) {
      _updateProgramacaoTitle(i, formatted)
      document.getElementById(`programacao-inner-title-${i}`).value = PROGRAMACAO[formatted].titulo || '';
      document.getElementById(`manha-1-${i}`).value = PROGRAMACAO[formatted][`manha-1`] || '';
      document.getElementById(`manha-2-${i}`).value = PROGRAMACAO[formatted][`manha-2`] || '';
      document.getElementById(`manha-3-${i}`).value = PROGRAMACAO[formatted][`manha-3`] || '';
      document.getElementById(`tarde-1-${i}`).value = PROGRAMACAO[formatted][`tarde-1`] || '';
      document.getElementById(`tarde-2-${i}`).value = PROGRAMACAO[formatted][`tarde-2`] || '';
      document.getElementById(`tarde-3-${i}`).value = PROGRAMACAO[formatted][`tarde-3`] || '';
      document.getElementById(`noite-1-${i}`).value = PROGRAMACAO[formatted][`noite-1`] || '';
      document.getElementById(`noite-2-${i}`).value = PROGRAMACAO[formatted][`noite-2`] || '';
      document.getElementById(`noite-3-${i}`).value = PROGRAMACAO[formatted][`noite-3`] || '';
    }
  }

  for (const child of _getChildIDs('programacao-box')) {
    const i = child.split('-')[child.split('-').length - 1];
    document.getElementById(`programacao-inner-title-${i}`).addEventListener('change', () => _updateProgramacaoTitle(i))
  }
}

function _loadDestinos() {
  if (DESTINOS && DESTINOS.length > 0) {
    document.getElementById('sem-destinos').style.display = 'none';
    document.getElementById('com-destinos').style.display = 'block';

    const first = document.getElementById(`select-destinos-1`);

    if (first) {
      first.addEventListener('change', () => {
        _buildDestinosSelect();
        _buildLineupSelects();
      });
    }
    _buildDestinosSelect();
  }
}

function _addTransporte() {
  var i = 1;
  while (document.getElementById('transporte-' + i)) {
    i++;
  }

  var checkedIda = '';
  var checkedVolta = '';
  var day = '';

  if (i === 1) {
    checkedIda = 'checked';
    day = document.getElementById('inicio').value;
  } else {
    checkedVolta = 'checked';
    day = document.getElementById('fim').value;
  }

  $('#transporte-box').append(`
      <div id="transporte-${i}" class="accordion-item accordion-transporte" draggable="true">
      <h2 class="accordion-header" id="heading-transporte-${i}">
        <button id="transporte-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-transporte-${i}" aria-expanded="false" aria-controls="collapse-transporte-${i}">
          Trajeto ${i}
        </button>
      </h2>
      <div id="collapse-transporte-${i}" class="accordion-collapse collapse"
        aria-labelledby="heading-transporte-${i}" data-bs-parent="#transporte-box">
        <div class="accordion-body">
          <fieldset class="nice-form-group">
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
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Partida</label>
              <input class="flex-input" id="partida-${i}" type="date" value="${day}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input class="flex-input mini-box" id="partida-horario-${i}" type="time" value="00:00" />
            </div>
          </div>
  
          <div class="side-by-side-box">
            <div class="nice-form-group side-by-side">
              <label>Chegada</label>
              <input class="flex-input" id="chegada-${i}" type="date" value="${day}" />
            </div>
            <div class="nice-form-group side-by-side">
              <input class="flex-input mini-box" id="chegada-horario-${i}" type="time" value="00:30" />
            </div>
          </div>
  
          <div class="nice-form-group">
            <label>Meio de Transporte</label>
            <select id="transporte-codigo-${i}">
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
            <label>Ponto de Partida <span class="opcional"> (Opcional)</span></label>
            <input id="ponto-partida-${i}" type="text" placeholder="Belo Horizonte" />
          </div>
  
          <div class="nice-form-group">
            <label>Ponto de Chegada <span class="opcional"> (Opcional)</span></label>
            <input id="ponto-chegada-${i}" type="text" placeholder="Las Vegas" />
          </div>

          <div class="nice-form-group" id="empresa-select-form-group-${i}">
            <label>Nome da Empresa <span class="opcional"> (Opcional)</span></label>
            <select id="empresa-select-${i}" style="display: none;"></select>
            <input class="nice-form-group" id="empresa-${i}" type="text" placeholder="Empresa de Transporte" />
          </div>

          <div class="nice-form-group">
            <label>Código da Reserva <span class="opcional"> (Opcional)</span></label>
            <input id="reserva-transp-${i}" type="text" placeholder="ABC123" />
          </div>

          <div class="nice-form-group">
            <label>Link da Reserva <span class="opcional"> (Opcional)</span></label>
            <input id="link-transp-${i}" type="url" placeholder="www.google.com" value=""
              class="icon-right" />
          </div>
  
        </div>
  
        <div class="deletar-box">
          <button id="transporte-deletar-${i}" class="btn btn-secondary" onclick="_deleteType('transporte-${i}')">
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

  _addDragListeners('transporte');
  _loadTransporteVisibility(i);
  _addTransporteListeners(i);
}

function _addHospedagem() {
  var i = 1;
  while (document.getElementById('hospedagem-' + i)) {
    i++;
  }

  $('#hospedagem-box').append(`
      <div id="hospedagem-${i}" class="accordion-item accordion-hospedagem" draggable="true">
      <h2 class="accordion-header" id="heading-hospedagem-${i}">
        <button id="hospedagem-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-hospedagem-${i}" aria-expanded="false" aria-controls="collapse-hospedagem-${i}">
          Hospedagem ${i}
        </button>
      </h2>
      <div id="collapse-hospedagem-${i}" class="accordion-collapse collapse"
        aria-labelledby="heading-hospedagem-${i}" data-bs-parent="#hospedagem-box">
        <div class="accordion-body">
          <div class="nice-form-group">
            <label>Nome da Hospedagem</label>
            <input required id="hospedagem-nome-${i}" type="text" placeholder="Casa da Fernanda" />
          </div>
  
          <div class="nice-form-group">
            <label>Endereço</label>
            <input required id="hospedagem-endereco-${i}" type="text" placeholder="Rua ABC, número 0" />
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
          <label>Código da Reserva <span class="opcional"> (Opcional)</span></label>
          <input id="reserva-hospedagem-${i}" type="text" placeholder="#ABC123" />
        </div>

        <div class="nice-form-group">
          <label>Descrição <span class="opcional"> (Opcional)</span></label>
          <input id="reserva-descricao-${i}" type="text" placeholder="Quarto Duplo, camas King" />
        </div>
  
        <div class="nice-form-group">
          <label>Link da Reserva <span class="opcional"> (Opcional)</span></label>
          <input id="link-reserva-hospedagem-${i}" type="url" placeholder="www.google.com" value=""
            class="icon-right" />
        </div>

        <div class="nice-form-group customization-box" id="hospedagem-${i}-box">
          <label>Imagem <span class="opcional"> (Opcional)</span></label>
          <input id="upload-hospedagem-${i}" type="file" accept=".jpg" />
          <p id="upload-hospedagem-${i}-size-message" class="message-text"> <i class='red'>*</i> Insira uma imagem de até 1MB</p>
        </div>

        <div class="nice-form-group">
          <input id="link-hospedagem-${i}" type="url" placeholder="https://link.com/imagem.jpg" value=""
            class="icon-right">
        </div>

        <fieldset class="nice-form-group" id="upload-checkbox-hospedagem-${i}">
          <div class="nice-form-group">
            <input type="radio" name="type-hospedagem-${i}" id="enable-link-hospedagem-${i}" checked>
            <label for="enable-link-hospedagem-${i}">Fornecer link</label>
          </div>

          <div class="nice-form-group">
            <input type="radio" name="type-hospedagem-${i}" id="enable-upload-hospedagem-${i}">
            <label for="enable-upload-hospedagem-${i}">Carregar imagem <span class="opcional"> (Até 1MB)</span></label>
          </div>
        </fieldset>
          
        </div>
  
        <div class="deletar-box">
          <button id="hospedagem-deletar-${i}" class="btn btn-secondary" onclick="_deleteType('hospedagem-${i}')">
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

  _addDragListeners('hospedagem');
  _loadImageSelector(`hospedagem-${i}`);
}

function _addDestinos() {
  let i = 1;
  while (document.getElementById(`select-destinos-${i}`)) {
    i++;
  };

  $('#com-destinos').append(`
    <div class="nice-form-group" id="com-destinos-${i}">
      <select id="select-destinos-${i}">
        <option value="">Selecione um Destino</option>
      </select>
      <div class="deletar-box">
        <button id="destinos-deletar-${i}" class="btn btn-secondary" onclick="_deletePasseio(${i})">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    </div>
    `);

  document.getElementById(`select-destinos-${i}`).addEventListener('change', () => {
    _buildDestinosSelect();
    _buildLineupSelects();
  });

  _buildDestinosSelect();
}

function _addEditores() {
  let i = 1;
  while (document.getElementById(`editores-email-${i}`)) {
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
  while (document.getElementById(`lineup-${i}`)) {
    i++;
  }

  $('#lineup-box').append(`
    <div id="lineup-${i}" class="accordion-item accordion-lineup" draggable="true">
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
  
          <div class="nice-form-group">
            <label>Gênero <span class="opcional"> (Opcional)</span></label>
            <input id="lineup-descricao-${i}" type="text" placeholder="Pop Punk Gen-Z" />
          </div>
  
          <div class="nice-form-group">
            <label>Palco <span class="opcional"> (Opcional)</span></label>
            <input id="lineup-palco-${i}" type="text" placeholder="Stripe Stage" />
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
            <label>Link Spotify <span class="opcional"> (Playlist ou página do artista)</span></label>
            <input id="lineup-midia-${i}" type="url"
              placeholder="https://open.spotify.com/playlist/16mG20ZrC9QttUB6Sozqep?si=da0794cde4914a17"
              value="" class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>Nota / Interesse <span class="opcional"> (de 0% a 100%)</span></label>
            <select id="lineup-nota-${i}">
              <option value="?">Desconhecido</option>
              <option value="!">100%</option>
              <option value="1">75%</option>
              <option value="2">50%</option>
              <option value="3">25%</option>
              <option value="4">0%</option>
            </select>
          </div>
  
        </div>
  
        <div class="deletar-box">
          <button id="lineup-deletar-${i}" class="btn btn-secondary" onclick="_deleteType('lineup-${i}')">
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

  const nome = document.getElementById(`lineup-nome-${i}`);
  const title = document.getElementById(`lineup-title-${i}`);
  const headliner = document.getElementById(`lineup-headliner-${i}`);
  nome.addEventListener('change', function () {
    title.innerText = nome.value;
    if (headliner.checked) {
      title.innerText += ' ⭐';
    }
  });
  headliner.addEventListener('change', function () {
    title.innerText = nome.value;
    if (headliner.checked) {
      title.innerText += ' ⭐';
    }
  });

  _addDragListeners('lineup');
}

function _addGaleria() {
  var i = 1;
  while (document.getElementById('galeria-' + i)) {
    i++;
  }

  $('#galeria-box').append(`
      <div id="galeria-${i}" class="accordion-item accordion-galeria" draggable="true">
      <h2 class="accordion-header" id="heading-galeria-${i}">
        <button id="galeria-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-galeria-${i}" aria-expanded="false" aria-controls="collapse-hospedagem-${i}">
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
  
          <div class="nice-form-group">
            <label>Categoria</label>
            <input required id="galeria-categoria-${i}" type="text" placeholder="Lineup" />
          </div>
  
        <div class="nice-form-group">
          <label>Descrição <span class="opcional"> (Opcional)</span></label>
          <input id="galeria-descricao-${i}" type="text" placeholder="Lineup oficial para os três dias de evento" />
        </div>
  
        <div class="nice-form-group customization-box" id="galeria-${i}-box">
          <label>Imagem</label>
          <input id="upload-galeria-${i}" type="file" accept=".jpg" />
          <div id="upload-galeria-${i}-size-message" class="message-text"> <i class='red'>*</i> Insira uma imagem de até 1MB</div>
        </div>
  
        <div class="nice-form-group">
          <input id="link-galeria-${i}" type="url" placeholder="https://link.com/imagem.jpg" value=""
            class="icon-right">
        </div>
  
        <fieldset class="nice-form-group">
          <div class="nice-form-group enable-link">
            <input type="radio" name="type-galeria-${i}" id="enable-link-galeria-${i}" checked>
            <label for="enable-link-galeria-${i}">Fornecer link</label>
          </div>
  
          <div class="nice-form-group">
            <input type="radio" name="type-galeria-${i}" id="enable-upload-galeria-${i}">
            <label for="enable-upload-galeria-${i}">Carregar imagem <span class="opcional"> (Até 1MB)</span></label>
          </div>
        </fieldset>
  
        </div>
  
        <div class="deletar-box">
          <button id="galeria-deletar-${i}" class="btn btn-secondary" onclick="_deleteGaleria(${i})">
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

  document.getElementById(`galeria-titulo-${i}`).addEventListener('change', function () {
    document.getElementById(`galeria-title-${i}`).innerText = document.getElementById(`galeria-titulo-${i}`).value;
  });

  _addDragListeners('galeria');
}