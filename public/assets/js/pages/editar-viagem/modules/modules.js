const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

const FIREBASE_IMAGE_ORIGIN = 'https://firebasestorage.googleapis.com/v0/b/trip-viewer-tcc.appspot.com/';

var PROGRAMACAO = {};

var FIREBASE_IMAGES = {
  background: false,
  claro: false,
  escuro: false
}

// Viagem Existente
function _loadTripData(FIRESTORE_DATA) {
  try {
    _loadDadosBasicosViagemData(FIRESTORE_DATA);
    _loadCompartilhamentoData(FIRESTORE_DATA);
    _loadCustomizacaoData(FIRESTORE_DATA);
    _loadMeiosDeTransporteData(FIRESTORE_DATA);
    _loadHospedagemData(FIRESTORE_DATA);
    _loadProgramacaoData(FIRESTORE_DATA);
    _loadDestinosData(FIRESTORE_DATA);
    _loadLineupData(FIRESTORE_DATA);
    _loadGaleriaData(FIRESTORE_DATA);

  } catch (e) {
    _displayErrorMessage(e);
    throw e;
  }
}

// Nova Viagem
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
    box.innerHTML += `
    <div id="programacao-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-programacao-${i}">
      <button id="programacao-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
        data-bs-target="#collapse-programacao-${i}" aria-expanded="false"
        aria-controls="collapse-programacao-${i}">
        ${date}
      </button>
    </h2>
    <div id="collapse-programacao-${i}" class="accordion-collapse collapse"
      aria-labelledby="heading-programacao-${i}" data-bs-parent="#programacao-box">
      <div class="accordion-body">
        <h1 class="item-title"></h1>

        <div class="nice-form-group">
          <label>Título <span class="opcional"> (Opcional)</span></label>
          <input id="programacao-inner-title-${i}" type="text" />
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
    if (PROGRAMACAO && PROGRAMACAO[formatted]) {
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
}

function _loadDestinos() {
  const userDestinations = localStorage.getItem('userDestinations');
  const myDestinations = userDestinations ? JSON.parse(userDestinations) : [];

  if (myDestinations && myDestinations.length > 0) {
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
    <div id="transporte-${i}" class="accordion-item">
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
          <legend>Ida ou Volta</legend>
          <div class="nice-form-group">
            <input type="radio" name="idaVolta-${i}" id="ida-${i}" ${checkedIda} />
            <label for="ida-${i}">Ida</label>
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
            <label>⠀</label>
            <input class="flex-input time" id="partida-horario-${i}" type="time" value="00:00" />
          </div>
        </div>

        <div class="side-by-side-box">
          <div class="nice-form-group side-by-side">
            <label>Chegada</label>
            <input class="flex-input" id="chegada-${i}" type="date" value="${day}" />
          </div>
          <div class="nice-form-group side-by-side">
            <label>⠀</label>
            <input class="flex-input time" id="chegada-horario-${i}" type="time" value="00:30" />
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
          </select>
        </div>

        <div class="nice-form-group">
          <label>Nome da Empresa <span class="opcional"> (Opcional)</span></label>
          <input id="empresa-${i}" type="text" placeholder="Empresa de Transporte" />
        </div>

        <div class="nice-form-group">
          <label>Código da Reserva <span class="opcional"> (Opcional)</span></label>
          <input id="reserva-transp-${i}" type="text" placeholder="#ABC123" />
        </div>

        <div class="nice-form-group">
          <label>Cidade de Partida <span class="opcional"> (Opcional)</span></label>
          <input id="cidade-partida-${i}" type="text" placeholder="Belo Horizonte" />
        </div>

        <div class="nice-form-group">
          <label>Cidade de Chegada <span class="opcional"> (Opcional)</span></label>
          <input id="cidade-chegada-${i}" type="text" placeholder="Las Vegas" />
        </div>

        <div class="nice-form-group">
          <label>Ponto de Partida <span class="opcional"> (Opcional)</span></label>
          <input id="ponto-partida-${i}" type="text" placeholder="Aeroporto de Confins" />
        </div>

        <div class="nice-form-group">
          <label>Ponto de Chegada <span class="opcional"> (Opcional)</span></label>
          <input id="ponto-chegada-${i}" type="text" placeholder="Aeroporto Henry Field" />
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

}

function _addHospedagem() {
  var i = 1;
  while (document.getElementById('hospedagem-' + i)) {
    i++;
  }

  $('#hospedagem-box').append(`
    <div id="hospedagem-${i}" class="accordion-item">
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
            <label>⠀</label>
            <input class="flex-input time" id="check-in-horario-${i}" type="time" value="14:00" />
          </div>
        </div>

        <div class="side-by-side-box">
          <div class="nice-form-group side-by-side">
            <label>Check-Out</label>
            <input class="flex-input" id="check-out-${i}" type="date" value="${TOMORROW}" />
          </div>
          <div class="nice-form-group side-by-side">
            <label>⠀</label>
            <input class="flex-input time" id="check-out-horario-${i}" type="time" value="12:00" />
          </div>
        </div>

        <div class="nice-form-group">
        <label>Imagem</label>
        <select id="hospedagem-codigo-${i}">
          <option value="generico">Imagem Padrão</option>
          <option value="airbnb">Airbnb</option>
          <option value="booking">Booking</option>
          <option value="decolar">Decolar.com</option>
          <option value="desertroseresort">Desert Rose Resort</option>
          <option value="even">Even</option>
          <option value="expedia">Expedia</option>
          <option value="hilton">Hilton</option>
          <option value="host">Host</option>
          <option value="hotelsCom">Hotels.com</option>
          <option value="hyatt">Hyatt</option>
          <option value="ibis">Ibis</option>
          <option value="ibisStyles">Ibis Styles</option>
          <option value="ibistBudget">Ibis Budget</option>
          <option value="intercontinental">Ibis Continental</option>
          <option value="mariott">Mariott</option>
          <option value="mercure">Mercure</option>
          <option value="nyny">New York New York</option>
          <option value="sheraton">Sheraton</option>
          <option value="tripadvisor">Trip Advisor</option>
        </select>
      </div>

      <div class="nice-form-group">
        <label>Código da Reserva <span class="opcional"> (Opcional)</span></label>
        <input id="reserva-hospedagem-${i}" type="text" placeholder="#ABC123" />
      </div>

        <div class="nice-form-group">
          <label>Link da Reserva <span class="opcional"> (Opcional)</span></label>
          <input id="link-hospedagem-${i}" type="url" placeholder="www.google.com" value=""
            class="icon-right" />
        </div>
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
  <div id="lineup-${i}" class="accordion-item">
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

}

function _addGaleria() {
  var i = 1;
  while (document.getElementById('galeria-' + i)) {
    i++;
  }

  $('#galeria-box').append(`
    <div id="galeria-${i}" class="accordion-item">
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

  document.getElementById(`upload-galeria-${i}`).addEventListener('change', function (event) {
    _checkFileSize(`galeria-${i}`);
  });

  document.getElementById(`galeria-titulo-${i}`).addEventListener('change', function () {
    document.getElementById(`galeria-title-${i}`).innerText = document.getElementById(`galeria-titulo-${i}`).value;
  });
}

// Deletar
function _deleteType(tipo) {
  const div = document.getElementById(tipo);
  div.parentNode.removeChild(div);
}

function _deleteGaleria(i) {
  const id = `galeria-${i}`;
  _removeImageSelectorListeners(id);
  const div = document.getElementById(id);
  div.parentNode.removeChild(div);

}

// Módulos: Viagem Existente
function _loadDadosBasicosViagemData(FIRESTORE_DATA) {
  document.getElementById('titulo').value = FIRESTORE_DATA.titulo;
  document.getElementById('moeda').value = FIRESTORE_DATA.moeda;

  document.getElementById('inicio').value = _formatFirestoreDate(FIRESTORE_DATA.inicio, 'yyyy-mm-dd');
  document.getElementById('fim').value = _formatFirestoreDate(FIRESTORE_DATA.fim, 'yyyy-mm-dd');

  document.getElementById('quantidadePessoas').value = FIRESTORE_DATA.quantidadePessoas;
}

function _loadCompartilhamentoData(FIRESTORE_DATA) {
  document.getElementById('habilitado-publico').checked = FIRESTORE_DATA.compartilhamento.ativo;
  const editores = FIRESTORE_DATA.compartilhamento.editores;

  if (editores && editores.length > 0) {
    document.getElementById('habilitado-editores').checked = true;
    for (let i = 1; i <= editores.length; i++) {
      _addEditores();
      document.getElementById(`editores-email-${i}`).value = editores[i - 1];
    }
  }
}

function _loadCustomizacaoData(FIRESTORE_DATA) {
  // Imagens
  const background = FIRESTORE_DATA.imagem.background;
  const logoClaro = FIRESTORE_DATA.imagem.claro;
  const logoEscuro = FIRESTORE_DATA.imagem.escuro;
  const altura = FIRESTORE_DATA.imagem.altura;

  if (FIRESTORE_DATA.imagem.ativo === true) {
    document.getElementById('habilitado-imagens').checked = true;
    document.getElementById('habilitado-imagens-content').style.display = 'block';
  }

  if (background) {
    document.getElementById('link-background').value = background;
  }

  if (logoClaro) {
    document.getElementById('link-logo-light').value = logoClaro;
  }

  if (logoEscuro) {
    document.getElementById('link-logo-dark').value = logoEscuro;
  }

  if (altura) {
    const alturaValue = altura.replace('px', '');
    if (alturaValue > 25 && alturaValue < 500) {
      document.getElementById('logo-tamanho').value = alturaValue / 25;
      document.getElementById('logo-tamanho-tooltip').innerText = `(${altura})`;
    }
  }

  if (background.includes(FIREBASE_IMAGE_ORIGIN)) {
    FIREBASE_IMAGES.background = true;
  }

  if (logoClaro.includes(FIREBASE_IMAGE_ORIGIN)) {
    FIREBASE_IMAGES.claro = true;
  }

  if (logoEscuro.includes(FIREBASE_IMAGE_ORIGIN)) {
    FIREBASE_IMAGES.escuro = true;
  }


  // Cores
  const claro = document.getElementById('claro');
  const escuro = document.getElementById('escuro');

  const claroFB = FIRESTORE_DATA.cores.claro;
  const escuroFB = FIRESTORE_DATA.cores.escuro

  if (FIRESTORE_DATA.cores.ativo === true) {
    document.getElementById('habilitado-cores').checked = true;
    claro.value = claroFB;
    escuro.value = escuroFB;
    document.getElementById('habilitado-cores-content').style.display = 'block';
  }

  // Links Personalizados
  const attachments = FIRESTORE_DATA.links.attachments;
  const drive = FIRESTORE_DATA.links.drive;
  const maps = FIRESTORE_DATA.links.maps;
  const pdf = FIRESTORE_DATA.links.pdf;
  const ppt = FIRESTORE_DATA.links.ppt;
  const sheet = FIRESTORE_DATA.links.sheet;
  const vacina = FIRESTORE_DATA.links.vacina;

  if (FIRESTORE_DATA.links.ativo === true) {
    document.getElementById('habilitado-imagens').checked = true;
  }

  if (attachments) {
    document.getElementById('link-attachments').value = attachments;
  }

  if (drive) {
    document.getElementById('link-drive').value = drive;
  }

  if (maps) {
    document.getElementById('link-maps').value = maps;
  }

  if (pdf) {
    document.getElementById('link-pdf').value = pdf;
  }

  if (ppt) {
    document.getElementById('link-ppt').value = ppt;
  }

  if (sheet) {
    document.getElementById('link-sheet').value = sheet;
  }

  if (vacina) {
    document.getElementById('link-vacina').value = vacina;
  }
}

function _loadMeiosDeTransporteData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.transportes === true) {
    document.getElementById('habilitado-transporte').checked = true;
    document.getElementById('habilitado-transporte-content').style.display = 'block';
    document.getElementById('transporte-adicionar-box').style.display = 'block';
  }

  const transporteSize = FIRESTORE_DATA?.transportes?.datas.length;
  if (transporteSize > 0) {
    for (let i = 1; i <= transporteSize; i++) {
      const j = i - 1;
      _addTransporte();

      switch (FIRESTORE_DATA.transportes.idaVolta[j]) {
        case 'ida':
          document.getElementById(`ida-${i}`).checked = true;
          break;
        case 'volta':
          document.getElementById(`volta-${i}`).checked = true;
      }

      const partida = _convertFromFirestoreDate(FIRESTORE_DATA.transportes.datas[j].partida);
      const chegada = _convertFromFirestoreDate(FIRESTORE_DATA.transportes.datas[j].chegada);

      if (partida) {
        document.getElementById(`partida-${i}`).value = _jsDateToDate(partida, 'yyyy-mm-dd');
        document.getElementById(`partida-horario-${i}`).value = _jsDateToTime(partida);
      }

      if (chegada) {
        document.getElementById(`chegada-${i}`).value = _jsDateToDate(chegada, 'yyyy-mm-dd');
        document.getElementById(`chegada-horario-${i}`).value = _jsDateToTime(chegada);
      }

      if (FIRESTORE_DATA.transportes.transportes[j]) {
        document.getElementById(`transporte-codigo-${i}`).value = FIRESTORE_DATA.transportes.transportes[j];
      }

      const empresa = FIRESTORE_DATA.transportes.empresas[j];
      if (empresa) {
        document.getElementById(`empresa-${i}`).value = _firstCharToUpperCase(empresa);
      }

      const reserva = FIRESTORE_DATA.transportes.reservas[j];
      if (reserva) {
        document.getElementById(`reserva-transp-${i}`).value = reserva;
      }

      const trajeto = FIRESTORE_DATA.transportes.trajetos[j];
      if (trajeto && trajeto.includes(' → ')) {
        document.getElementById(`transporte-title-${i}`).innerText = trajeto;
        document.getElementById(`cidade-partida-${i}`).value = trajeto.split(' → ')[0];
        document.getElementById(`cidade-chegada-${i}`).value = trajeto.split(' → ')[1];
      }

      const pontoPartida = FIRESTORE_DATA.transportes.pontos[j].partida;
      const pontoChegada = FIRESTORE_DATA.transportes.pontos[j].chegada;

      if (pontoPartida) {
        document.getElementById(`ponto-partida-${i}`).value = pontoPartida;
      }

      if (pontoChegada) {
        document.getElementById(`ponto-chegada-${i}`).value = pontoChegada;
      }

      document.getElementById(`cidade-partida-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
      document.getElementById(`cidade-chegada-${i}`).addEventListener('change', () => _updateTransporteTitle(i));
    }
  }
}

function _loadHospedagemData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.hospedagens === true) {
    document.getElementById('habilitado-hospedagem').checked = true;
    document.getElementById('habilitado-hospedagem-content').style.display = 'block';
    document.getElementById('hospedagem-adicionar-box').style.display = 'block';
  }

  const hospedagemSize = FIRESTORE_DATA.hospedagens.hospedagem.length;
  if (hospedagemSize > 0) {
    for (let i = 1; i <= hospedagemSize; i++) {
      const j = i - 1;
      _addHospedagem();

      const hospedagemTitle = document.getElementById(`hospedagem-title-${i}`);
      const hospedagemNome = document.getElementById(`hospedagem-nome-${i}`);

      const hospedagem = FIRESTORE_DATA.hospedagens.hospedagem[j];
      if (hospedagem) {
        hospedagemNome.value = hospedagem;
        hospedagemTitle.innerText = hospedagem;
      }

      const endereco = FIRESTORE_DATA.hospedagens.endereco[j];
      if (endereco) {
        document.getElementById(`hospedagem-endereco-${i}`).value = endereco;
      }

      const dataCheckIn = _convertFromFirestoreDate(FIRESTORE_DATA.hospedagens.datas[j].checkin);
      const dataCheckOut = _convertFromFirestoreDate(FIRESTORE_DATA.hospedagens.datas[j].checkout)

      if (dataCheckIn) {
        const dataFormattedCheckIn = _jsDateToDate(dataCheckIn, 'yyyy-mm-dd');
        const horarioCheckIn = _jsDateToTime(dataCheckIn);
        document.getElementById(`check-in-${i}`).value = dataFormattedCheckIn;
        document.getElementById(`check-in-horario-${i}`).value = horarioCheckIn;
      }

      if (dataCheckOut) {
        const dataFormattedCheckOut = _jsDateToDate(dataCheckOut, "yyyy-mm-dd");
        const horarioCheckOut = _jsDateToTime(dataCheckOut);

        document.getElementById(`check-out-${i}`).value = dataFormattedCheckOut;
        document.getElementById(`check-out-horario-${i}`).value = horarioCheckOut;
      }

      const codigo = FIRESTORE_DATA.hospedagens.codigos[j];
      if (codigo) {
        document.getElementById(`hospedagem-codigo-${i}`).value = codigo;
      }

      const reserva = FIRESTORE_DATA.hospedagens.reservas[j];
      if (reserva) {
        document.getElementById(`reserva-hospedagem-${i}`).value = reserva;
      }

      const link = FIRESTORE_DATA.hospedagens.links[j];
      if (link) {
        document.getElementById(`link-hospedagem-${i}`).value = link;
      }

      hospedagemNome.addEventListener('change', function () {
        hospedagemTitle.innerText = hospedagemNome.value;
      });

    }
  }
}

function _loadProgramacaoData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.programacao === true) {
    document.getElementById('habilitado-programacao').checked = true;
    document.getElementById('habilitado-programacao-content').style.display = 'block';
  }
  _loadProgramacao();

  let i = 1;

  while (document.getElementById(`programacao-title-${i}`)) {
    let prog = {};
    const j = i - 1;
    let progTitle = j;

    const data = FIRESTORE_DATA.programacoes.programacao[j]?.data;
    if (data) {
      const formatted = _formatFirestoreDate(data, 'dd/mm/yyyy');
      prog.data = formatted;
      progTitle = _removeSlashesFromDate(formatted);
    }

    const titulo = FIRESTORE_DATA.programacoes.programacao[j]?.titulo;
    if (titulo) {
      document.getElementById(`programacao-inner-title-${i}`).value = titulo;
      prog.titulo = titulo;
    }

    const manha = FIRESTORE_DATA.programacoes.programacao[j]?.manha;
    if (manha && manha.length > 0) {
      for (let k = 1; k <= manha.length; k++) {
        document.getElementById(`manha-${k}-${i}`).value = manha[k - 1];
        prog[`manha-${k}`] = manha[k - 1];
      }
    }

    const tarde = FIRESTORE_DATA.programacoes.programacao[j]?.tarde;
    if (tarde && tarde.length > 0) {
      for (let k = 1; k <= tarde.length; k++) {
        document.getElementById(`tarde-${k}-${i}`).value = tarde[k - 1];
        prog[`tarde-${k}`] = tarde[k - 1];
      }
    }

    const noite = FIRESTORE_DATA.programacoes.programacao[j]?.noite;
    if (noite && noite.length > 0) {
      for (let k = 1; k <= noite.length; k++) {
        document.getElementById(`noite-${k}-${i}`).value = noite[k - 1];
        prog[`noite-${k}`] = noite[k - 1];
      }
    }

    PROGRAMACAO[progTitle] = prog;
    i++;
  }
}

function _loadDestinosData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.destinos === true) {
    const habilitadoDestinos = document.getElementById('habilitado-destinos');

    if (habilitadoDestinos) {
      habilitadoDestinos.checked = true;
    }

    document.getElementById('habilitado-destinos-content').style.display = 'block';
    document.getElementById('sem-destinos').style.display = 'none';
    document.getElementById('com-destinos').style.display = 'block';
    document.getElementById('destinos-adicionar-box').style.display = 'block';
  } else {
    document.getElementById('sem-destinos').style.display = 'block';
    document.getElementById('com-destinos').style.display = 'none';
    document.getElementById('destinos-adicionar-box').style.display = 'none';
  }

  const cidades = FIRESTORE_DATA.destinos;

  _loadDestinos();

  if (cidades && cidades.length > 0) {
    for (let i = 1; i <= cidades.length; i++) {
      const j = i - 1;
      const id = cidades[j].destinosID;

      if (i === 1) {
        _setDestinoSelectValue(1, id);
      } else {
        _addDestinos();
        _setDestinoSelectValue(i, id);
      }
    }
  }
}

function _loadLineupData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.lineup === true) {
    document.getElementById('habilitado-lineup').checked = true;
    document.getElementById('habilitado-lineup-content').style.display = 'block';
    document.getElementById('lineup-adicionar-box').style.display = 'block';

    const keys = Object.keys(FIRESTORE_DATA.lineup);
    if (keys.length > 0) {
      let i = 1;
      for (const key of keys) {
        const size = FIRESTORE_DATA.lineup[key].nome.length;
        for (let j = 0; j < size; j++, i++) {
          _addLineup();
  
          const nome = FIRESTORE_DATA.lineup[key].nome;
          if (nome && nome[j]) {
            document.getElementById(`lineup-nome-${i}`).value = nome[j];
            document.getElementById(`lineup-title-${i}`).innerText = nome[j];
          }

          const headliner = FIRESTORE_DATA.lineup[key].head;
          if (headliner && headliner[j]) {
            document.getElementById(`lineup-headliner-${i}`).checked = headliner[j];
            document.getElementById(`lineup-title-${i}`).innerText += ' ⭐';
          }
  
          document.getElementById(`lineup-local-${i}`).value = key;
  
          const genero = FIRESTORE_DATA.lineup[key].descricao;
          if (genero && genero[j]) {
            document.getElementById(`lineup-descricao-${i}`).value = genero[j];
          }
  
          const palco = FIRESTORE_DATA.lineup[key].palco;
          if (palco && palco[j]) {
            document.getElementById(`lineup-palco-${i}`).value = palco[j];
          }
  
          const data = FIRESTORE_DATA.lineup[key].data;
          if (data && data[j]) {
            document.getElementById(`lineup-data-${i}`).value = data[j];
          }
  
          const inicio = FIRESTORE_DATA.lineup[key].inicio;
          if (inicio && inicio[j]) {
            document.getElementById(`lineup-inicio-${i}`).value = inicio[j];
          }
  
          const fim = FIRESTORE_DATA.lineup[key].fim;
          if (fim && fim[j]) {
            document.getElementById(`lineup-fim-${i}`).value = fim[j];
          }
  
          const midia = FIRESTORE_DATA.lineup[key].hyperlink.video;
          if (midia && midia[j]) {
            document.getElementById(`lineup-midia-${i}`).value = midia[j];
          }
  
          const nota = FIRESTORE_DATA.lineup[key].nota;
          if (nota && nota[j]) {
            document.getElementById(`lineup-nota-${i}`).value = nota[j];
          }
        }
      }
    }
  }
}

function _loadGaleriaData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.galeria === true) {
    document.getElementById('habilitado-galeria').checked = true;
    document.getElementById('habilitado-galeria-content').style.display = 'block';
    document.getElementById('galeria-adicionar-box').style.display = 'block';
  }

  const galeriaSize = FIRESTORE_DATA.galeria?.imagens.length;
  if (galeriaSize > 0) {
    for (let i = 1; i <= galeriaSize; i++) {
      const j = i - 1;
      _addGaleria();

      const titulo = FIRESTORE_DATA.galeria.imagens[j].titulo;
      if (titulo) {
        document.getElementById(`galeria-titulo-${i}`).value = titulo;
        document.getElementById(`galeria-title-${i}`).innerText = titulo;
      }

      const filtro = FIRESTORE_DATA.galeria.imagens[j].filtro;
      if (filtro) {
        document.getElementById(`galeria-categoria-${i}`).value = filtro;
      }

      const descricao = FIRESTORE_DATA.galeria.imagens[j].descricao;
      if (descricao) {
        document.getElementById(`galeria-descricao-${i}`).value = descricao;
      }

      const link = FIRESTORE_DATA.galeria.imagens[j].link;
      if (link) {
        document.getElementById(`link-galeria-${i}`).value = link;
      }

    }
  }
}

function _updateTransporteTitle(i) {
  const cidadePartida = document.getElementById(`cidade-partida-${i}`).value;
  const cidadeChegada = document.getElementById(`cidade-chegada-${i}`).value;

  if (!cidadePartida || !cidadeChegada) return;
  document.getElementById(`transporte-title-${i}`).innerText = `${cidadePartida} → ${cidadeChegada}`;
}

function _formatAltura(value) {
  if (value == 0) {
    value = 1;
    document.getElementById('logo-tamanho').value = value;
  }
  document.getElementById('logo-tamanho-tooltip').innerText = `(${value * 25}px)`
}

// Destinos: Funções Genéricas
function _buildDestinosSelect() {
  const userDestinations = localStorage.getItem('userDestinations');
  const myDestinations = userDestinations ? JSON.parse(userDestinations) : [];
  const childs = _getChildIDs('com-destinos');

  let used = [];

  for (const child of childs) {
    const i = child.split('-')[2];
    const selectDiv = document.getElementById(`select-destinos-${i}`);
    const value = selectDiv.value;
    if (value) {
      used.push(value);
    }
  }

  for (const child of childs) {
    const i = child.split('-')[2];
    const selectDiv = document.getElementById(`select-destinos-${i}`);
    const value = selectDiv.value;

    let options = '<option value="">Selecione um Destino</option>';
    for (let j = 0; j < myDestinations.length; j++) {
      const code = myDestinations[j].code;
      if (value == code || !used.includes(code)) {
        const selected = value === code ? ' selected' : '';
        options += `<option value="${code}"${selected}>${myDestinations[j].titulo}</option>`;
      }
    }

    if (options === '<option value="">Selecione um Destino</option>') {
      _deletePasseio(i);
      document.getElementById('todos-destinos-utilizados').style.display = 'block';
    } else {
      selectDiv.innerHTML = options;
      document.getElementById('todos-destinos-utilizados').style.display = 'none';
    }
  }
}

function _buildLineupSelects() {
  const lineupChilds = _getChildIDs('lineup-box');
  let lineupSelectBoxes = [];
  let lineupSelects = [];

  for (const child of lineupChilds) {
    const i = child.split('-')[1];
    lineupSelectBoxes.push(`lineup-local-box-${i}`);
    lineupSelects.push(`lineup-local-${i}`);
  }

  if (document.getElementById('habilitado-destinos').checked && document.getElementById('habilitado-lineup').checked) {

    const destinoChilds = _getChildIDs('com-destinos');
    let options = '<option value="generico">Destino Não Especificado</option>';

    for (const child of destinoChilds) {
      const i = child.split('-')[2];
      const selectDiv = document.getElementById(`select-destinos-${i}`);
      const text = selectDiv.options[selectDiv.selectedIndex].text;
      const value = selectDiv[selectDiv.selectedIndex].value;
      if (value) {
        options += `<option value="${value}">${text}</option>`;
      }
    }

    for (const selectDiv of lineupSelects) {
      const div = document.getElementById(selectDiv);
      const value = div.value;
      div.innerHTML = options;
      div.value = value;
    }

  } else {
    for (const box of lineupSelectBoxes) {
      document.getElementById(box).style.display = 'none';
    }
  }
}

function _setDestinoSelectValue(i, value) {
  document.getElementById(`select-destinos-${i}`).value = value;
  _buildDestinosSelect();
}

function _deletePasseio(i) {
  _deleteType(`com-destinos-${i}`);
  _buildDestinosSelect();
}