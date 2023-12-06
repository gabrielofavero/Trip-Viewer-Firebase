const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

var PASSEIOS_SELECT_OPTIONS = "";
var PROGRAMACAO = {};

// Passeio Existente
function _loadPlacesData(FIRESTORE_PLACES_DATA) {
  try {
    // _loadDadosBasicosData(FIRESTORE_PLACES_DATA);
    // _loadCompartilhamentoData(FIRESTORE_PLACES_DATA);
    // _loadCustomizacaoData(FIRESTORE_PLACES_DATA);
    // _loadMeiosDeTransporteData(FIRESTORE_PLACES_DATA);
    // _loadHospedagemData(FIRESTORE_PLACES_DATA);
    // _loadProgramacaoData(FIRESTORE_PLACES_DATA);
    // _loadPasseiosData(FIRESTORE_PLACES_DATA);

  } catch (e) {
    _displayErrorMessage(e);
    throw e;
  }


}

// Novo Passeio
function _loadDadosBasicosNewPlaces() {
  const inicio = document.getElementById('inicio');
  const fim = document.getElementById('fim');

  inicio.value = TODAY;
  fim.value = TOMORROW;
}


// Adicionar
function _addRestaurante() {
  let i = 1;
  while (document.getElementById(`restaurantes-${i}`)) {
    i++;
  }

  $('#restaurantes-box').append(`
  <div id="restaurantes-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-restaurantes-${i}">
      <button id="restaurantes-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
        data-bs-target="#collapse-restaurantes-${i}" aria-expanded="true"
        aria-controls="collapse-restaurantes-${i}">
        Restaurante ${i}
      </button>
    </h2>
    <div id="collapse-restaurantes-${i}" class="accordion-collapse collapse"
      aria-labelledby="heading-restaurantes-${i}" data-bs-parent="#restaurantes-box">
      <div class="accordion-body">
        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="restaurantes-nome-${i}" type="text" placeholder="Salumeria Central" />
        </div>

        <div class="nice-form-group">
          <label>Descrição</label>
          <textarea id="restaurantes-descricao-${i}" rows="3"
            placeholder="Restaurante famoso por seus embutidos. Oferece feijoada à vontade nos domingos."></textarea>
        </div>

        <div class="nice-form-group">
          <label>Link <span class="opcional"> (Opcional)</span></label>
          <input id="restaurantes-link-${i}" type="url"
            placeholder="https://www.instagram.com/salumeria.central/" value="" class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Região <span class="opcional"> (Opcional)</span></label>
          <input id="restaurantes-regiao-${i}" type="text" placeholder="Sapucaí" />
        </div>

        <div class="nice-form-group">
          <label>Valor Aproximado <span class="opcional"> (Opcional)</span></label>
          <input id="restaurantes-valor-${i}" type="text" placeholder="R$50 - R$100" />
        </div>

        <div class="nice-form-group">
          <label>Vídeo ou Playlist <span class="opcional"> (TikTok, YouTube ou Spotify)</span></label>
          <input id="restaurantes-midia-${i}" type="url"
            placeholder="https://www.youtube.com/watch?v=GAirUeYBvQI" value="" class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Nota / Interesse <span class="opcional"> (de 0 a 100)</span></label>
          <input required id="restaurantes-nota-${i}" type="number" placeholder="90" min="0" max="100" />
        </div>
      </div>

      <div class="deletar-box">
        <button id="restaurantes-deletar-${i}" class="btn btn-secondary" onclick="_deleteType('restaurantes-${i}')">
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

  const nome = document.getElementById(`restaurantes-nome-${i}`);
  nome.addEventListener('change', function () {
    document.getElementById(`restaurantes-title-${i}`).innerText = nome.value;
  });
}

function _addLanche() {
  let i = 1;
  while (document.getElementById(`lanches-${i}`)) {
    i++;
  }

  $('#lanches-box').append(`
  <div id="lanches-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-lanches-${i}">
      <button id="lanches-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
        data-bs-target="#collapse-lanches-${i}" aria-expanded="true" aria-controls="collapse-lanches-${i}">
        Lanche ${i}
      </button>
    </h2>
    <div id="collapse-lanches-${i}" class="accordion-collapse collapse" aria-labelledby="heading-lanches-${i}"
      data-bs-parent="#lanches-box">
      <div class="accordion-body">
        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="lanches-nome-${i}" type="text" placeholder="BotaniKafé" />
        </div>

        <div class="nice-form-group">
          <label>Descrição</label>
          <textarea id="lanches-descricao-${i}" rows="3"
            placeholder="Bastante conhecido pelo ovo porchê, bowls e smoothies, é um excelente lugar para brunchs."></textarea>
        </div>

        <div class="nice-form-group">
          <label>Link <span class="opcional"> (Opcional)</span></label>
          <input id="lanches-link-${i}" type="url" placeholder="https://www.instagram.com/botanikafe/" value=""
            class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Região <span class="opcional"> (Opcional)</span></label>
          <input id="lanches-regiao-${i}" type="text" placeholder="Jardim Paulista" />
        </div>

        <div class="nice-form-group">
          <label>Valor Aproximado <span class="opcional"> (Opcional)</span></label>
          <input id="lanches-valor-${i}" type="text" placeholder="R$50 - R$100" />
        </div>

        <div class="nice-form-group">
          <label>Vídeo ou Playlist <span class="opcional"> (TikTok, YouTube ou Spotify)</span></label>
          <input id="lanches-midia-${i}" type="url"
            placeholder="https://www.tiktok.com/@viajeparacomer/video/7172239210282274053?q=bottanikafe&t=1700768671502"
            value="" class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Nota / Interesse <span class="opcional"> (de 0 a 100)</span></label>
          <input required id="lanches-nota-${i}" type="number" placeholder="80" min="0" max="100" />
        </div>
      </div>

      <div class="deletar-box">
        <button id="lanches-deletar-${i}" class="btn btn-secondary" onclick="_deleteType('lanches-${i}')">
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

  const nome = document.getElementById(`lanches-nome-${i}`);
  nome.addEventListener('change', function () {
    document.getElementById(`lanches-title-${i}`).innerText = nome.value;
  });
}

function _addSaida() {
  let i = 1;
  while (document.getElementById(`saidas-${i}`)) {
    i++;
  }

  $('#saidas-box').append(`
  <div id="saidas-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-saidas-${i}">
      <button id="saidas-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
        data-bs-target="#collapse-saidas-${i}" aria-expanded="true" aria-controls="collapse-saidas-${i}">
        Saída ${i}
      </button>
    </h2>
    <div id="collapse-saidas-${i}" class="accordion-collapse collapse" aria-labelledby="heading-saidas-${i}"
      data-bs-parent="#saidas-box">
      <div class="accordion-body">
        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="saidas-nome-${i}" type="text" placeholder="Omalleys" />
        </div>

        <div class="nice-form-group">
          <label>Descrição</label>
          <textarea id="saidas-descricao-${i}" rows="3"
            placeholder="Pub irlandês autêntico e próximo da paulista. Cervejas diferentes, drinks e comida irlandesa. English Karaoke nas segundas."></textarea>
        </div>

        <div class="nice-form-group">
          <label>Link <span class="opcional"> (Opcional)</span></label>
          <input id="saidas-link-${i}" type="url" placeholder="https://www.instagram.com/omalleysbar/" value=""
            class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Região <span class="opcional"> (Opcional)</span></label>
          <input id="saidas-regiao-${i}" type="text" placeholder="Jardim Paulista" />
        </div>

        <div class="nice-form-group">
          <label>Valor Aproximado <span class="opcional"> (Opcional)</span></label>
          <input id="saidas-valor-${i}" type="text" placeholder="R$50 - R$100" />
        </div>

        <div class="nice-form-group">
          <label>Vídeo ou Playlist <span class="opcional"> (TikTok, YouTube ou Spotify)</span></label>
          <input id="saidas-midia-${i}" type="url" placeholder="https://www.youtube.com/watch?v=M1qd2Y2T4ZA"
            value="" class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Nota / Interesse <span class="opcional"> (de 0 a 100)</span></label>
          <input required id="saidas-nota-${i}" type="number" placeholder="80" min="0" max="100" />
        </div>

      </div>

      <div class="deletar-box">
        <button id="saidas-deletar-${i}" class="btn btn-secondary" onclick="_deleteType('saidas-${i}')">
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

  const nome = document.getElementById(`saidas-nome-${i}`);
  nome.addEventListener('change', function () {
    document.getElementById(`saidas-title-${i}`).innerText = nome.value;
  });
}

function _addTurismo() {
  let i = 1;
  while (document.getElementById(`turismo-${i}`)) {
    i++;
  }

  $('#turismo-box').append(`
  <div id="turismo-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-turismo-${i}">
      <button id="turismo-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
        data-bs-target="#collapse-turismo-${i}" aria-expanded="true" aria-controls="collapse-turismo-${i}">
        Turismo ${i}
      </button>
    </h2>
    <div id="collapse-turismo-${i}" class="accordion-collapse collapse" aria-labelledby="heading-turismo-${i}"
      data-bs-parent="#turismo-box">
      <div class="accordion-body">
        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="turismo-nome-${i}" type="text" placeholder="Las Vegas Sign" />
        </div>

        <div class="nice-form-group">
          <label>Descrição</label>
          <textarea id="turismo-descricao-${i}" rows="3"
            placeholder="Famosa placa de Las Vegas. Costuma ter fila, então importante chegar cedo."></textarea>
        </div>

        <div class="nice-form-group">
          <label>Link <span class="opcional"> (Opcional)</span></label>
          <input id="turismo-link-${i}" type="url" placeholder="https://maps.app.goo.gl/on4sJh1d2RNhvPXf6"
            value="" class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Região <span class="opcional"> (Opcional)</span></label>
          <input id="turismo-regiao-${i}" type="text" placeholder="Centro da Cidade" />
        </div>

        <div class="nice-form-group">
          <label>Valor <span class="opcional"> (Opcional)</span></label>
          <input id="turismo-valor-${i}" type="text" placeholder="Gratuito" />
        </div>

        <div class="nice-form-group">
          <label>Vídeo ou Playlist <span class="opcional"> (TikTok, YouTube ou Spotify)</span></label>
          <input id="turismo-midia-${i}" type="url"
            placeholder="https://www.tiktok.com/@pompsie/video/7214164412616166699?q=las%20vegas%20sign&t=1700778158244"
            value="" class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Nota / Interesse <span class="opcional"> (de 0 a 100)</span></label>
          <input required id="turismo-nota-${i}" type="number" placeholder="65" min="0" max="100" />
        </div>
      </div>

      <div class="deletar-box">
        <button id="turismo-deletar-${i}" class="btn btn-secondary" onclick="_deleteType('turismo-${i}')">
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

  const nome = document.getElementById(`turismo-nome-${i}`);
  nome.addEventListener('change', function () {
    document.getElementById(`turismo-title-${i}`).innerText = nome.value;
  });
}

function _addLoja() {
  let i = 1;
  while (document.getElementById(`lojas-${i}`)) {
    i++;
  }

  $('#lojas-box').append(`
  <div id="lojas-${i}" class="accordion-item">
    <h2 class="accordion-header" id="heading-lojas-${i}">
      <button id="lojas-title-${i}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
        data-bs-target="#collapse-lojas-${i}" aria-expanded="true" aria-controls="collapse-lojas-${i}">
        Loja ${i}
      </button>
    </h2>
    <div id="collapse-lojas-${i}" class="accordion-collapse collapse" aria-labelledby="heading-lojas-${i}"
      data-bs-parent="#lojas-box">
      <div class="accordion-body">
        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="lojas-nome-${i}" type="text" placeholder="Las Vegas North Premium Outlets" />
        </div>

        <div class="nice-form-group">
          <label>Descrição</label>
          <textarea id="lojas-descricao-${i}" rows="3"
            placeholder="Centro de compras. Possui loja da Forever 21, Calvin Klein, Lacoste, entre outros."></textarea>
        </div>

        <div class="nice-form-group">
          <label>Link <span class="opcional"> (Opcional)</span></label>
          <input id="lojas-link-${i}" type="url"
            placeholder="https://www.premiumoutlets.com/outlet/las-vegas-north" value=""
            class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Região <span class="opcional"> (Opcional)</span></label>
          <input id="lojas-regiao-${i}" type="text" placeholder="Las Vegas Strip (Norte)" />
        </div>

        <div class="nice-form-group">
          <label>Valor Aproximado <span class="opcional"> (Opcional)</span></label>
          <input id="lojas-valor-${i}" type="text" placeholder="O valor varia conforme a loja" />
        </div>

        <div class="nice-form-group">
          <label>Vídeo ou Playlist <span class="opcional"> (TikTok, YouTube ou Spotify)</span></label>
          <input id="lojas-midia-${i}" type="url" placeholder="https://www.youtube.com/watch?v=2LVCuEXZ3bk"
            value="" class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Nota / Interesse <span class="opcional"> (de 0 a 100)</span></label>
          <input required id="lojas-nota-${i}" type="number" placeholder="65" min="0" max="100" />
        </div>
      </div>

      <div class="deletar-box">
        <button id="lojas-deletar-${i}" class="btn btn-secondary" onclick="_deleteType('lojas-${i}')">
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

  const nome = document.getElementById(`lojas-nome-${i}`);
  nome.addEventListener('change', function () {
    document.getElementById(`lojas-title-${i}`).innerText = nome.value;
  });
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

        <div class="nice-form-group">
          <label>Gênero <span class="opcional"> (Opcional)</span></label>
          <input id="lineup-descricao-${i}" type="text" placeholder="Pop Punk Gen-Z" />
        </div>

        <div class="nice-form-group">
          <label>Palco <span class="opcional"> (Opcional)</span></label>
          <input id="lineup-palco-${i}" type="text" placeholder="Stripe Stage" />
        </div>

        <div class="side-by-side-box">
          <div class="nice-form-group side-by-side">
            <label>Início <span class="opcional"> (Opcional)</span></label>
            <input id="lineup-inicio-${i}" type="time" value="11:15" />
          </div>

          <div class="nice-form-group side-by-side">
            <label>Fim <span class="opcional"> (Opcional)</span></label>
            <input id="lineup-fim-${i}" type="time" value="11:45" />
          </div>
        </div>

        <div class="nice-form-group">
          <label>Link Spotify <span class="opcional"> (Playlist ou página do artista)</span></label>
          <input id="lineup-midia-${i}" type="url"
            placeholder="https://open.spotify.com/playlist/16mG20ZrC9QttUB6Sozqep?si=da0794cde4914a17"
            value="" class="icon-right" />
        </div>

        <div class="nice-form-group">
          <label>Nota / Interesse <span class="opcional"> (de 0 a 100)</span></label>
          <input required id="lineup-nota-1" type="number" placeholder="95" min="0" max="100" />
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

  const nome = document.getElementById(`lineup-nome-${i}`);
  nome.addEventListener('change', function () {
    document.getElementById(`lineup-title-${i}`).innerText = nome.value;
  });
}

// Deletar
function _deleteType(tipo) {
  const div = document.getElementById(tipo);
  div.parentNode.removeChild(div);
}