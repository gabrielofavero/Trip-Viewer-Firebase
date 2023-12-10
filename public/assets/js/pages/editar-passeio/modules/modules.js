const TODAY = _getTodayFormatted();
const TOMORROW = _getTomorrowFormatted();

var PASSEIOS_SELECT_OPTIONS = "";
var PROGRAMACAO = {};

// Passeio Existente
function _loadPlacesData(FIRESTORE_PLACES_DATA) {
  try {
    _loadDadosBasicosData(FIRESTORE_PLACES_DATA);
    _loadRestaurantesData(FIRESTORE_PLACES_DATA);
    _loadLanchesData(FIRESTORE_PLACES_DATA);
    _loadSaidasData(FIRESTORE_PLACES_DATA);
    _loadTurismoData(FIRESTORE_PLACES_DATA);
    _loadLojasData(FIRESTORE_PLACES_DATA);
    _loadMapaData(FIRESTORE_PLACES_DATA);
    _loadLineupData(FIRESTORE_PLACES_DATA);

  } catch (e) {
    _displayErrorMessage(e);
    throw e;
  }


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
          <input type="checkbox" id="restaurantes-novo-${i}" class="switch" />
          <label for="restaurantes-novo-${i}">
            Novo
          </label>
        </div>

        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="restaurantes-nome-${i}" type="text" placeholder="Salumeria Central" />
        </div>

        <div class="nice-form-group">
          <label>Emoji <span class="opcional"> (Opcional)</span></label>
          <input id="restaurantes-emoji-${i}" type="text" placeholder="🥩" />
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
        <label>Nota / Interesse <span class="opcional"> (de 0% a 100%)</span></label>
          <select id="restaurantes-nota-${i}">
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
        <input type="checkbox" id="lanches-novo-${i}" class="switch" />
        <label for="lanches-novo-${i}">
          Novo
        </label>
      </div>

        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="lanches-nome-${i}" type="text" placeholder="BotaniKafé" />
        </div>

        <div class="nice-form-group">
          <label>Emoji <span class="opcional"> (Opcional)</span></label>
          <input id="lanches-emoji-${i}" type="text" placeholder="🥢" />
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
        <label>Nota / Interesse <span class="opcional"> (de 0% a 100%)</span></label>
          <select id="lanches-nota-${i}">
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
        <input type="checkbox" id="saidas-novo-${i}" class="switch" />
        <label for="saidas-novo-${i}">
          Novo
        </label>
      </div>

        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="saidas-nome-${i}" type="text" placeholder="Omalleys" />
        </div>

        <div class="nice-form-group">
          <label>Emoji <span class="opcional"> (Opcional)</span></label>
          <input id="saidas-emoji-${i}" type="text" placeholder="🍺" />
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
        <label>Nota / Interesse <span class="opcional"> (de 0% a 100%)</span></label>
          <select id="saidas-nota-${i}">
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
        <input type="checkbox" id="turismo-novo-${i}" class="switch" />
        <label for="turismo-novo-${i}">
          Novo
        </label>
      </div>

        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="turismo-nome-${i}" type="text" placeholder="Las Vegas Sign" />
        </div>

        <div class="nice-form-group">
          <label>Emoji <span class="opcional"> (Opcional)</span></label>
          <input id="turismo-emoji-${i}" type="text" placeholder="🎰" />
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
        <label>Nota / Interesse <span class="opcional"> (de 0% a 100%)</span></label>
          <select id="turismo-nota-${i}">
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
        <input type="checkbox" id="lojas-novo-${i}" class="switch" />
        <label for="lojas-novo-${i}">
          Novo
        </label>
      </div>

        <div class="nice-form-group">
          <label>Nome</label>
          <input required id="lojas-nome-${i}" type="text" placeholder="Las Vegas North Premium Outlets" />
        </div>

        <div class="nice-form-group">
          <label>Emoji <span class="opcional"> (Opcional)</span></label>
          <input id="lojas-emoji-${i}" type="text" placeholder="🛍️" />
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
        <label>Nota / Interesse <span class="opcional"> (de 0% a 100%)</span></label>
          <select id="lojas-nota-${i}">
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
          <label>Nota / Interesse <span class="opcional"> (de 0% a 100%)</span></label>
          <input required id="lineup-nota-${i}" type="text" placeholder="100%" />
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

// Módulos: Passeio Existente
function _loadDadosBasicosData(FIRESTORE_PLACES_DATA) {
  document.getElementById('titulo').value = FIRESTORE_PLACES_DATA.titulo;
  document.getElementById('moeda').value = FIRESTORE_PLACES_DATA.moeda;
}

function _loadRestaurantesData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.restaurantes === true) {
    document.getElementById('habilitado-restaurantes').checked = true;
    document.getElementById('habilitado-restaurantes-content').style.display = 'block';
    document.getElementById('restaurantes-adicionar-box').style.display = 'block';

    const restaurantesSize = FIRESTORE_PLACES_DATA.restaurantes.nome.length;
    if (restaurantesSize > 0) {
      for (let i = 1; i <= restaurantesSize; i++) {
        const j = i - 1;
        _addRestaurante();

        const novo = FIRESTORE_PLACES_DATA.restaurantes.novo;
        if (novo && novo[j] && novo[j] === '✔'){
          document.getElementById(`restaurantes-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.restaurantes.nome;
        if (nome && nome[j]){
          document.getElementById(`restaurantes-nome-${i}`).value = nome[j];
          document.getElementById(`restaurantes-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.restaurantes.emoji;
        if (emoji && emoji[j]){
          document.getElementById(`restaurantes-emoji-${i}`).value = emoji[j];
        }

        const descricao = FIRESTORE_PLACES_DATA.restaurantes.descricao;
        if (descricao && descricao[j]){
          document.getElementById(`restaurantes-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.restaurantes.hyperlink.name;
        if (link && link[j]){
          document.getElementById(`restaurantes-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.restaurantes.regiao;
        if (regiao && regiao[j]){
          document.getElementById(`restaurantes-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.restaurantes.valor;
        if (valor && valor[j]) {
          document.getElementById(`restaurantes-valor-${i}`).value = valor[j];
        }         

        const midia = FIRESTORE_PLACES_DATA.restaurantes.hyperlink.video;
        if (midia && midia[j]){
          document.getElementById(`restaurantes-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.restaurantes.nota;
        if (nota && nota[j]){
          document.getElementById(`restaurantes-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadLanchesData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.lanches === true) {
    document.getElementById('habilitado-lanches').checked = true;
    document.getElementById('habilitado-lanches-content').style.display = 'block';
    document.getElementById('lanches-adicionar-box').style.display = 'block';

    const lanchesSize = FIRESTORE_PLACES_DATA.lanches.nome.length;
    if (lanchesSize > 0) {
      for (let i = 1; i <= lanchesSize; i++) {
        const j = i - 1;
        _addLanche();

        const novo = FIRESTORE_PLACES_DATA.lanches.novo;
        if (novo && novo[j] && novo[j] === '✔'){
          document.getElementById(`lanches-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.lanches.nome;
        if (nome && nome[j]){
          document.getElementById(`lanches-nome-${i}`).value = nome[j];
          document.getElementById(`lanches-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.lanches.emoji;
        if (emoji && emoji[j]){
          document.getElementById(`lanches-emoji-${i}`).value = emoji[j];
        }

        const descricao = FIRESTORE_PLACES_DATA.lanches.descricao;
        if (descricao && descricao[j]){
          document.getElementById(`lanches-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.lanches.hyperlink.name;
        if (link && link[j]){
          document.getElementById(`lanches-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.lanches.regiao;
        if (regiao && regiao[j]){
          document.getElementById(`lanches-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.lanches.valor;
        if (valor && valor[j]) {
          document.getElementById(`lanches-valor-${i}`).value = valor[j];
        }         

        const midia = FIRESTORE_PLACES_DATA.lanches.hyperlink.video;
        if (midia && midia[j]){
          document.getElementById(`lanches-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.lanches.nota;
        if (nota && nota[j]){
          document.getElementById(`lanches-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadSaidasData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.saidas === true) {
    document.getElementById('habilitado-saidas').checked = true;
    document.getElementById('habilitado-saidas-content').style.display = 'block';
    document.getElementById('saidas-adicionar-box').style.display = 'block';

    const saidasSize = FIRESTORE_PLACES_DATA.saidas.nome.length;
    if (saidasSize > 0) {
      for (let i = 1; i <= saidasSize; i++) {
        const j = i - 1;
        _addSaida();

        const novo = FIRESTORE_PLACES_DATA.saidas.novo;
        if (novo && novo[j] && novo[j] === '✔'){
          document.getElementById(`saidas-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.saidas.nome;
        if (nome && nome[j]){
          document.getElementById(`saidas-nome-${i}`).value = nome[j];
          document.getElementById(`saidas-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.saidas.emoji;
        if (emoji && emoji[j]){
          document.getElementById(`saidas-emoji-${i}`).value = emoji[j];
        }

        const descricao = FIRESTORE_PLACES_DATA.saidas.descricao;
        if (descricao && descricao[j]){
          document.getElementById(`saidas-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.saidas.hyperlink.name;
        if (link && link[j]){
          document.getElementById(`saidas-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.saidas.regiao;
        if (regiao && regiao[j]){
          document.getElementById(`saidas-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.saidas.valor;
        if (valor && valor[j]) {
          document.getElementById(`saidas-valor-${i}`).value = valor[j];
        }         

        const midia = FIRESTORE_PLACES_DATA.saidas.hyperlink.video;
        if (midia && midia[j]){
          document.getElementById(`saidas-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.saidas.nota;
        if (nota && nota[j]){
          document.getElementById(`saidas-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadTurismoData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.turismo === true) {
    document.getElementById('habilitado-turismo').checked = true;
    document.getElementById('habilitado-turismo-content').style.display = 'block';
    document.getElementById('turismo-adicionar-box').style.display = 'block';

    const turismoSize = FIRESTORE_PLACES_DATA.turismo.nome.length;
    if (turismoSize > 0) {
      for (let i = 1; i <= turismoSize; i++) {
        const j = i - 1;
        _addTurismo();

        const novo = FIRESTORE_PLACES_DATA.turismo.novo;
        if (novo && novo[j] && novo[j] === '✔'){
          document.getElementById(`turismo-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.turismo.nome;
        if (nome && nome[j]){
          document.getElementById(`turismo-nome-${i}`).value = nome[j];
          document.getElementById(`turismo-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.turismo.emoji;
        if (emoji && emoji[j]){
          document.getElementById(`turismo-emoji-${i}`).value = emoji[j];
        }

        const descricao = FIRESTORE_PLACES_DATA.turismo.descricao;
        if (descricao && descricao[j]){
          document.getElementById(`turismo-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.turismo.hyperlink.name;
        if (link && link[j]){
          document.getElementById(`turismo-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.turismo.regiao;
        if (regiao && regiao[j]){
          document.getElementById(`turismo-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.turismo.valor;
        if (valor && valor[j]) {
          document.getElementById(`turismo-valor-${i}`).value = valor[j];
        }         

        const midia = FIRESTORE_PLACES_DATA.turismo.hyperlink.video;
        if (midia && midia[j]){
          document.getElementById(`turismo-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.turismo.nota;
        if (nota && nota[j]){
          document.getElementById(`turismo-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadLojasData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.lojas === true) {
    document.getElementById('habilitado-lojas').checked = true;
    document.getElementById('habilitado-lojas-content').style.display = 'block';
    document.getElementById('lojas-adicionar-box').style.display = 'block';

    const lojasSize = FIRESTORE_PLACES_DATA.lojas.nome.length;
    if (lojasSize > 0) {
      for (let i = 1; i <= lojasSize; i++) {
        const j = i - 1;
        _addLoja();

        const novo = FIRESTORE_PLACES_DATA.lojas.novo;
        if (novo && novo[j] && novo[j] === '✔'){
          document.getElementById(`lojas-novo-${i}`).checked = true;
        }

        const nome = FIRESTORE_PLACES_DATA.lojas.nome;
        if (nome && nome[j]){
          document.getElementById(`lojas-nome-${i}`).value = nome[j];
          document.getElementById(`lojas-title-${i}`).innerText = nome[j];
        }

        const emoji = FIRESTORE_PLACES_DATA.lojas.emoji;
        if (emoji && emoji[j]){
          document.getElementById(`lojas-emoji-${i}`).value = emoji[j];
        }

        const descricao = FIRESTORE_PLACES_DATA.lojas.descricao;
        if (descricao && descricao[j]){
          document.getElementById(`lojas-descricao-${i}`).value = descricao[j];
        }

        const link = FIRESTORE_PLACES_DATA.lojas.hyperlink.name;
        if (link && link[j]){
          document.getElementById(`lojas-link-${i}`).value = link[j];
        }

        const regiao = FIRESTORE_PLACES_DATA.lojas.regiao;
        if (regiao && regiao[j]){
          document.getElementById(`lojas-regiao-${i}`).value = regiao[j];
        }

        const valor = FIRESTORE_PLACES_DATA.lojas.valor;
        if (valor && valor[j]) {
          document.getElementById(`lojas-valor-${i}`).value = valor[j];
        }         

        const midia = FIRESTORE_PLACES_DATA.lojas.hyperlink.video;
        if (midia && midia[j]){
          document.getElementById(`lojas-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.lojas.nota;
        if (nota && nota[j]){
          document.getElementById(`lojas-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}

function _loadMapaData(FIRESTORE_PLACES_DATA) {
  const mapaLink = document.getElementById('mapa-link');

  if (FIRESTORE_PLACES_DATA.modulos.mapa === true) {
    document.getElementById('habilitado-mapa').checked = true;
    document.getElementById('habilitado-mapa-content').style.display = 'block';
    mapaLink.setAttribute('required', "");

    const mapa = FIRESTORE_PLACES_DATA.myMaps;
    if (mapa) {
      mapaLink.value = mapa;
    }
  } else {
    mapaLink.removeAttribute('required');
  }
}

function _loadLineupData(FIRESTORE_PLACES_DATA) {
  if (FIRESTORE_PLACES_DATA.modulos.lineup === true) {
    document.getElementById('habilitado-lineup').checked = true;
    document.getElementById('habilitado-lineup-content').style.display = 'block';

    const size = FIRESTORE_PLACES_DATA.lineup.nome.length;
    if (size > 0) {
      for (let i = 1; i <= size; i++) {
        const j = i - 1;
        _addLineup();

        const headliner = FIRESTORE_PLACES_DATA.lineup.headliner;
        if (headliner && headliner[j]){
          document.getElementById(`lineup-headliner-${i}`).checked = headliner[j];
        }

        const nome = FIRESTORE_PLACES_DATA.lineup.nome;
        if (nome && nome[j]){
          document.getElementById(`lineup-nome-${i}`).value = nome[j];
          document.getElementById(`lineup-title-${i}`).innerText = nome[j];
        }

        const genero = FIRESTORE_PLACES_DATA.lineup.descricao;
        if (genero && genero[j]){
          document.getElementById(`lineup-descricao-${i}`).value = genero[j];
        }

        const palco = FIRESTORE_PLACES_DATA.lineup.palco;
        if (palco && palco[j]){
          document.getElementById(`lineup-palco-${i}`).value = palco[j];
        }

        const inicio = FIRESTORE_PLACES_DATA.lineup.inicio;
        if (inicio && inicio[j]){
          document.getElementById(`lineup-inicio-${i}`).value = inicio[j];
        }

        const fim = FIRESTORE_PLACES_DATA.lineup.fim;
        if (fim && fim[j]) {
          document.getElementById(`lineup-fim-${i}`).value = fim[j];
        }         

        const midia = FIRESTORE_PLACES_DATA.lineup.hyperlink.video;
        if (midia && midia[j]){
          document.getElementById(`lineup-midia-${i}`).value = midia[j];
        }

        const nota = FIRESTORE_PLACES_DATA.lineup.nota;
        if (nota && nota[j]){
          document.getElementById(`lineup-nota-${i}`).value = nota[j];
        }
      }
    }
  }
}