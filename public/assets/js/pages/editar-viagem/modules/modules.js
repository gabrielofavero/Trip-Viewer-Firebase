const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

const FIREBASE_IMAGE_ORIGIN = 'https://firebasestorage.googleapis.com/v0/b/trip-viewer-tcc.appspot.com/';

var PASSEIOS_SELECT_OPTIONS = "";
var PROGRAMACAO = {};

var FIREBASE_IMAGES = {
  background: false,
  claro: false,
  escuro: false
}

// Viagem Existente
function _loadTripData(FIRESTORE_DATA) {
  try {
    _loadDadosBasicosData(FIRESTORE_DATA);
    _loadCompartilhamentoData(FIRESTORE_DATA);
    _loadCustomizacaoData(FIRESTORE_DATA);
    _loadMeiosDeTransporteData(FIRESTORE_DATA);
    _loadHospedagemData(FIRESTORE_DATA);
    _loadProgramacaoData(FIRESTORE_DATA);
    _loadPasseiosData(FIRESTORE_DATA);

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


// Métodos Gerais
function _add(type) {
  const dynamicFunctionName = `_add${type}`;
  if (typeof window[dynamicFunctionName] === 'function') {
    window[dynamicFunctionName]();
  } else {
    _logger(ERROR, `${dynamicFunctionName} is not defined.`);
  }
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

function _loadPasseios(newTrip = true) {
  const placesList = localStorage.getItem('placesList');
  const myPlaces = placesList ? JSON.parse(placesList) : [];

  if (myPlaces && myPlaces.length > 0) {
    document.getElementById('sem-passeios').style.display = 'none';

    const comPasseios = document.getElementById('com-passeios');
    comPasseios.style.display = 'block';

    for (const place of myPlaces) {
      if (!PASSEIOS_SELECT_OPTIONS.includes(place.code)) {
        PASSEIOS_SELECT_OPTIONS += `<option value="${place.code}">${place.titulo}</option>`
      }
    }

    let i = 1;
    const options = '<option value="0"></option>' + PASSEIOS_SELECT_OPTIONS;
    while (document.getElementById(`select-passeios-${i}`)) {
      document.getElementById(`select-passeios-${i}`).innerHTML = options;
      i++;
    }

  } else if (newTrip) {
    document.getElementById('sem-passeios').style.display = 'block';
    document.getElementById('com-passeios').style.display = 'none';
    document.getElementById('passeios-adicionar-box').style.display = 'none';
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
          <input required id="link-hospedagem-${i}" type="url" placeholder="www.google.com" value=""
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

function _addPasseios(id) {
  let i = 1;
  while (document.getElementById(`select-passeios-${i}`)) {
    i++;
  };

  $('#com-passeios').append(`
  <br><br><select class="mini-select" id="select-passeios-${i}">
  '<option value="0"></option>'
    ${PASSEIOS_SELECT_OPTIONS}
  </select>
  `);

  if (id) {
    _setSelectedPasseios(id, i);
  }
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

// Deletar
function _deleteType(tipo) {
  const div = document.getElementById(tipo);
  div.parentNode.removeChild(div);
}

// Módulos: Viagem Existente
function _loadDadosBasicosData(FIRESTORE_DATA) {
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

  const logoTamanho = document.getElementById('logo-tamanho');
  const alturaArray = Array.from(logoTamanho.options).map(option => option.value);

  if (FIRESTORE_DATA.imagem.ativo === true) {
    document.getElementById('habilitado-imagens').checked = true;
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

  if (altura && alturaArray.includes(altura)) {
    logoTamanho.value = altura;
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

    const transporteSize = FIRESTORE_DATA.transportes.datas.length;
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
}

function _loadHospedagemData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.hospedagens === true) {
    document.getElementById('habilitado-hospedagem').checked = true;
    document.getElementById('habilitado-hospedagem-content').style.display = 'block';
    document.getElementById('hospedagem-adicionar-box').style.display = 'block';

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
}

function _loadProgramacaoData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.programacao === true) {
    document.getElementById('habilitado-programacao').checked = true;
    document.getElementById('habilitado-programacao-content').style.display = 'block';
    _loadProgramacao();

    let i = 1;

    while (document.getElementById(`programacao-title-${i}`)) {
      let prog = {};
      const j = i - 1;
      let progTitle = j;

      const data = FIRESTORE_DATA.programacoes.programacao[j].data;
      if (data) {
        const formatted = _formatFirestoreDate(data, 'dd/mm/yyyy');
        prog.data = formatted;
        progTitle = _removeSlashesFromDate(formatted);
      }

      const titulo = FIRESTORE_DATA.programacoes.programacao[j].titulo;
      if (titulo) {
        document.getElementById(`programacao-inner-title-${i}`).value = titulo;
        prog.titulo = titulo;
      }

      const manha = FIRESTORE_DATA.programacoes.programacao[j].manha;
      if (manha && manha.length > 0) {
        for (let k = 1; k <= manha.length; k++) {
          document.getElementById(`manha-${k}-${i}`).value = manha[k - 1];
          prog[`manha-${k}`] = manha[k - 1];
        }
      }

      const tarde = FIRESTORE_DATA.programacoes.programacao[j].tarde;
      if (tarde && tarde.length > 0) {
        for (let k = 1; k <= tarde.length; k++) {
          document.getElementById(`tarde-${k}-${i}`).value = tarde[k - 1];
          prog[`tarde-${k}`] = tarde[k - 1];
        }
      }

      const noite = FIRESTORE_DATA.programacoes.programacao[j].noite;
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
}

function _loadPasseiosData(FIRESTORE_DATA) {
  if (FIRESTORE_DATA.modulos.passeios === true) {
    document.getElementById('habilitado-passeios').checked = true;
    document.getElementById('habilitado-passeios-content').style.display = 'block';
    document.getElementById('sem-passeios').style.display = 'none';
    document.getElementById('com-passeios').style.display = 'block';
    document.getElementById('passeios-adicionar-box').style.display = 'block';

    const cidades = FIRESTORE_DATA.cidades;

    if (cidades && cidades > 0) {
      for (const cidade of cidades) {
        const id = cidade.passeiosID;
        PASSEIOS_SELECT_OPTIONS += `<option value="${id}">${cidade.passeios.titulo}</option>`;
      }
    }

    _loadPasseios(true);

    if (cidades && cidades.length > 0) {
      for (let i = 1; i <= cidades.length; i++) {
        const j = i - 1;
        const id = cidades[j].passeiosID;

        if (i === 1) {
          _setSelectedPasseios(id, i);
        } else {
          _addPasseios(id);
        }
      }
    }
  } else {
    _loadPasseios();
  }

}

function _setSelectedPasseios(optionValue, index) {
  var selectElement = document.getElementById(`select-passeios-${index}`);
  for (var i = 0; i < selectElement.options.length; i++) {
    if (selectElement.options[i].value === optionValue) {
      selectElement.options[i].selected = true;
      break;
    }
  }
}

function _updateTransporteTitle(i) {
  const cidadePartida = document.getElementById(`cidade-partida-${i}`).value;
  const cidadeChegada = document.getElementById(`cidade-chegada-${i}`).value;

  if (!cidadePartida || !cidadeChegada) return;
  document.getElementById(`transporte-title-${i}`).innerText = `${cidadePartida} → ${cidadeChegada}`;
}