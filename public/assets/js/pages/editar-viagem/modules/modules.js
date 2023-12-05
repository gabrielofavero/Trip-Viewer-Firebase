const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

var NEW_SELECT;

// Carregar
function _loadDadosBasicosNewTrip() {
    const inicio = document.getElementById('inicio');
    const fim = document.getElementById('fim');

    inicio.value = TODAY;
    fim.value = TOMORROW;
}

function _loadProgramacao(){
  const inicio = document.getElementById('inicio').value;
  const fim = document.getElementById('fim').value;

  const dates = _getArrayOfFormattedDates(inicio, fim);

  const box = document.getElementById('programacao-box');
  box.innerHTML = '';

  for (let i = 1; i <= dates.length; i++) {
    const date = _changeFormat(dates[i-1], 'dd/mm/yyyy');
    box.innerHTML += `
    <div id="programacao-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-programacao-${i}">
      <button id="programacao-title" class="accordion-button" type="button" data-bs-toggle="collapse"
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
          <input id="programacao-title-${i}" type="text" />
        </div>

        <div class="nice-form-group">
          <label>Manhã</label>
          <input required id="manha-${i}-1" type="text" placeholder="Fazer isso" /><br><br>
          <input required id="manha-${i}-2" type="text" placeholder="Depois aquilo" /><br><br>
          <input required id="manha-${i}-3" type="text" placeholder="Por fim, isso" />
        </div>

        <div class="nice-form-group">
          <label>Tarde</label>
          <input required id="tarde-${i}-1" type="text" placeholder="Fazer isso" /><br><br>
          <input required id="tarde-${i}-2" type="text" placeholder="Depois aquilo" /><br><br>
          <input required id="tarde-${i}-3" type="text" placeholder="Por fim, isso" />
        </div>

        <div class="nice-form-group">
          <label>Noite</label>
          <input required id="noite-${i}-1" type="text" placeholder="Fazer isso" /><br><br>
          <input required id="noite-${i}-2" type="text" placeholder="Depois aquilo" /><br><br>
          <input required id="noite-${i}-3" type="text" placeholder="Por fim, isso" />
        </div>
      </div>
    </div>
  </div>
    `
  }
}

function _loadPasseios(){
  const placesList = localStorage.getItem('placesList');
  const myPlaces = placesList ? JSON.parse(placesList) : [];

  if (myPlaces && myPlaces.length > 0) {
    document.getElementById('sem-passeios').style.display = 'none';

    const comPasseios = document.getElementById('com-passeios');
    comPasseios.style.display = 'block';

    NEW_SELECT = '<option value="0">Selecione um Passeio</option>';

    for (const place of myPlaces) {
      NEW_SELECT += `<option value="${place.id}">${place.titulo}</option>`
    }
    
    let i = 1;
    while (document.getElementById(`select-passeios-${i}`)) {
      document.getElementById(`select-passeios-${i}`).innerHTML = NEW_SELECT;
      i++;
    }

  } else {
    document.getElementById('sem-passeios').style.display = 'block';
    document.getElementById('com-passeios').style.display = 'none';
    document.getElementById('passeios-adicionar-box').style.display = 'none';
  }

}

// Adicionar
function _addTransporte(){
    var i = 1;
    while (document.getElementById('transporte-'+i)) {
        i++;
    }

    document.getElementById('transporte-box').innerHTML += `
    <div id="transporte-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-transporte-${i}">
      <button id="transporte-title" class="accordion-button" type="button" data-bs-toggle="collapse"
        data-bs-target="#collapse-transporte-${i}" aria-expanded="false" aria-controls="collapse-transporte-${i}">
        Trajeto ${i}
      </button>
    </h2>
    <div id="collapse-transporte-${i}" class="accordion-collapse collapse"
      aria-labelledby="heading-transporte-${i}" data-bs-parent="#transporte-box">
      <div class="accordion-body">
        <div class="side-by-side-box">
          <div class="nice-form-group side-by-side">
            <label>Partida</label>
            <input class="flex-input" id="partida-${i}" type="date" value="${TODAY}" />
          </div>
          <div class="nice-form-group side-by-side">
            <label>⠀</label>
            <input class="flex-input time" id="partida-horario-${i}" type="time" value="00:00" />
          </div>
        </div>

        <div class="side-by-side-box">
          <div class="nice-form-group side-by-side">
            <label>Chegada</label>
            <input class="flex-input" id="chegada-${i}" type="date" value="${TODAY}" />
          </div>
          <div class="nice-form-group side-by-side">
            <label>⠀</label>
            <input class="flex-input time" id="chegada-horario-${i}" type="time" value="00:30" />
          </div>
        </div>

        <fieldset class="nice-form-group">
          <legend>Meio de Transporte</legend>
          <div class="nice-form-group">
            <input type="radio" name="radio" id="voo-${i}" />
            <label for="voo-${i}">Voo</label>
          </div>

          <div class="nice-form-group">
            <input type="radio" name="radio" id="carro-${i}" />
            <label for="carro-${i}">Carro</label>
          </div>

          <div class="nice-form-group">
            <input type="radio" name="radio" id="onibus-${i}" />
            <label for="onibus-${i}">Ônibus</label>
          </div>
        </fieldset>

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
    `;

}

function _addHospedagem(){
    var i = 1;
    while (document.getElementById('hospedagem-'+i)) {
        i++;
    }

    document.getElementById('hospedagem-box').innerHTML += `
    <div id="hospedagem-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-hospedagem-${i}">
      <button id="hospedagem-title" class="accordion-button" type="button" data-bs-toggle="collapse"
        data-bs-target="#collapse-hospedagem-${i}" aria-expanded="false" aria-controls="collapse-hospedagem-${i}">
        Hospedagem ${i}
      </button>
    </h2>
    <div id="collapse-hospedagem-${i}" class="accordion-collapse collapse"
      aria-labelledby="heading-hospedagem-${i}" data-bs-parent="#hospedagem-box">
      <div class="accordion-body">
        <div class="nice-form-group">
          <label>Nome da Hospedagem</label>
          <input required id="hospedagem-${i}" type="text" placeholder="Casa da Fernanda" />
        </div>

        <div class="nice-form-group">
          <label>Endereço</label>
          <input required id="cidade-partida-${i}" type="text" placeholder="Rua ABC, número 0" />
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
    `  
}

function _addPasseios(){
  let i = 1;
  while (document.getElementById(`select-passeios-${i}`)) {
    i++;
  };

  document.getElementById('com-passeios').innerHTML += `
  <select id="select-passeios-${i}">
    <option value="0">Selecione um Passeio</option>
    ${NEW_SELECT}
  </select>
  `
}


// Deletar
function _deleteType(tipo) {
    const div = document.getElementById(tipo);
    div.parentNode.removeChild(div);
}