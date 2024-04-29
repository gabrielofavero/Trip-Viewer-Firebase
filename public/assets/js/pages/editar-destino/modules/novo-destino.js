// Adicionar
function _addRestaurantes() {
  let i = 1;
  while (getID(`restaurantes-${i}`)) {
    i++;
  }

  $('#restaurantes-box').append(`
    <div id="restaurantes-${i}" class="accordion-item accordion-restaurantes" draggable="true">
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
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
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
          <button id="restaurantes-deletar-${i}" class="btn btn-secondary" onclick="_removeChild('restaurantes-${i}')">
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

  _applyAccordionListeners(i, 'restaurantes');
  _addDragListeners('restaurantes');
}

function _addLanches() {
  let i = 1;
  while (getID(`lanches-${i}`)) {
    i++;
  }

  $('#lanches-box').append(`
    <div id="lanches-${i}" class="accordion-item accordion-lanches" draggable="true">
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
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
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
          <button id="lanches-deletar-${i}" class="btn btn-secondary" onclick="_removeChild('lanches-${i}')">
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

  _applyAccordionListeners(i, 'lanches');
  _addDragListeners('lanches');
}

function _addSaidas() {
  let i = 1;
  while (getID(`saidas-${i}`)) {
    i++;
  }

  $('#saidas-box').append(`
    <div id="saidas-${i}" class="accordion-item accordion-saidas" draggable="true">
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
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
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
          <button id="saidas-deletar-${i}" class="btn btn-secondary" onclick="_removeChild('saidas-${i}')">
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

  _applyAccordionListeners(i, 'saidas');
  _addDragListeners('saidas');
}

function _addTurismo() {
  let i = 1;
  while (getID(`turismo-${i}`)) {
    i++;
  }

  $('#turismo-box').append(`
    <div id="turismo-${i}" class="accordion-item accordion-turismo" draggable="true">
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
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
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
          <button id="turismo-deletar-${i}" class="btn btn-secondary" onclick="_removeChild('turismo-${i}')">
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

  _applyAccordionListeners(i, 'turismo');
  _addDragListeners('turismo');
}

function _addLojas() {
  let i = 1;
  while (getID(`lojas-${i}`)) {
    i++;
  }

  $('#lojas-box').append(`
    <div id="lojas-${i}" class="accordion-item accordion-lojas" draggable="true">
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
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
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
          <button id="lojas-deletar-${i}" class="btn btn-secondary" onclick="_removeChild('lojas-${i}')">
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

  _applyAccordionListeners(i, 'lojas');
  _addDragListeners('lojas');
}