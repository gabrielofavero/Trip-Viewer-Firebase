// Adicionar
function _addRestaurantes() {
  const j = _getNextJ('restaurantes-box');

  $('#restaurantes-box').append(`
    <div id="restaurantes-${j}" class="accordion-item accordion-restaurantes" >
      <h2 class="accordion-header" id="heading-restaurantes-${j}">
        <button id="restaurantes-title-${j}" class="accordion-button collapsed flex-button" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-restaurantes-${j}" aria-expanded="true"
          aria-controls="collapse-restaurantes-${j}">
          <span class="title-text" id="restaurantes-title-text-${j}">Restaurante ${j}</span> 
          <div class="icon-container">${_getNewSvg(`restaurantes-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-restaurantes-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-restaurantes-${j}" data-bs-parent="#restaurantes-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="restaurantes-novo-${j}" class="switch" />
            <label for="restaurantes-novo-${j}">Recém Adicionado</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>Identificador</label>
            <input id="restaurantes-id-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>Nome</label>
            <input required id="restaurantes-nome-${j}" type="text" placeholder="Salumeria Central" />
          </div>
  
          <div class="nice-form-group">
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
            <input id="restaurantes-emoji-${j}" type="text" placeholder="🥩" />
          </div>
  
          <div class="nice-form-group">
            <label>Descrição</label>
            <textarea id="restaurantes-descricao-${j}" rows="3"
              placeholder="Restaurante famoso por seus embutidos. Oferece feijoada à vontade nos domingos."></textarea>
          </div>

          <div class="nice-form-group">
            <label>Mapa <span class="opcional"> (Opcional)</span></label>
            <input id="restaurantes-mapa-${j}" type="url" placeholder="https://maps.app.goo.gl/s2PqbWArH5rJWCLF8" value=""
              class="icon-right" />
            <div class="legenda">Google Maps ou Apple Maps</div>
          </div>
  
          <div class="nice-form-group">
            <label>Site Oficial <span class="opcional"> (Opcional)</span></label>
            <input id="restaurantes-website-${j}" type="url"
              placeholder="https://www.salumeriacentral.com/" value="" class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>Instagram <span class="opcional"> (Opcional)</span></label>
            <input id="restaurantes-instagram-${j}" type="url" placeholder="https://www.instagram.com/salumeria.central/" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>Região <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="restaurantes-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="restaurantes-regiao-${j}" type="text" placeholder="Sapucaí" />
          </div>
  
          <div class="nice-form-group">
            <label>Valor <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="restaurantes-valor-${j}">
            ${VALOR_OPTIONS}
          </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="restaurantes-outro-valor-${j}" type="text" placeholder="R$50 - R$100" />
          </div>
  
          <div class="nice-form-group">
            <label>Vídeo <span class="opcional"> (Opcional)</span></label>
            <input id="restaurantes-midia-${j}" type="url"
              placeholder="https://www.youtube.com/watch?v=GAirUeYBvQI" value="" class="icon-right" />
            <div class="legenda">TikTok (Web) ou YouTube</div>
          </div>
  
          <div class="nice-form-group">
          <label>Prioridade <span class="opcional">(Opcional)</span></label>
            <select class="editar-select" id="restaurantes-nota-${j}">
              <option value="?">Prioridade não definida</option>
              <option value="5">5 - Altíssima prioridade</option>
              <option value="4">4 - Alta prioridade</option>
              <option value="3">3 - Prioridade normal</option>
              <option value="2">2 - Baixa prioridade</option>
              <option value="1">1 - Sem prioridade</option>
            </select>
          </div>
  
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_OpenMoveDestinoModal(${j}, 'restaurantes')" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-restaurantes-${j}" class="btn btn-basic btn-format">
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

  _addDestinosListeners('restaurantes', j);
  _addListenerToRemoveDestino('restaurantes', j);
  _addSelectorDS('regiao', `restaurantes-regiao-select-${j}`, `restaurantes-regiao-${j}`);
}

function _addLanches() {
  const j = _getNextJ('lanches-box');

  $('#lanches-box').append(`
    <div id="lanches-${j}" class="accordion-item accordion-lanches" >
      <h2 class="accordion-header" id="heading-lanches-${j}">
        <button id="lanches-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-lanches-${j}" aria-expanded="true" aria-controls="collapse-lanches-${j}">
          <span class="title-text" id="lanches-title-text-${j}">Lanche ${j}</span> 
          <div class="icon-container">${_getNewSvg(`lanches-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-lanches-${j}" class="accordion-collapse collapse" aria-labelledby="heading-lanches-${j}"
        data-bs-parent="#lanches-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="lanches-novo-${j}" class="switch" />
            <label for="lanches-novo-${j}">Recém Adicionado</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>Identificador</label>
            <input id="lanches-id-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>Nome</label>
            <input required id="lanches-nome-${j}" type="text" placeholder="BotaniKafé" />
          </div>
  
          <div class="nice-form-group">
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
            <input id="lanches-emoji-${j}" type="text" placeholder="🥢" />
          </div>
  
          <div class="nice-form-group">
            <label>Descrição</label>
            <textarea id="lanches-descricao-${j}" rows="3"
              placeholder="Bastante conhecido pelo ovo porchê, bowls e smoothies, é um excelente lugar para brunchs."></textarea>
          </div>

          <div class="nice-form-group">
            <label>Mapa <span class="opcional"> (Opcional)</span></label>
            <input id="lanches-mapa-${j}" type="url" placeholder="https://maps.app.goo.gl/Yd4rDKAKG8vfPV2c7" value=""
              class="icon-right" />
            <div class="legenda">Google Maps ou Apple Maps</div>
          </div>

          <div class="nice-form-group">
            <label>Site Oficial <span class="opcional"> (Opcional)</span></label>
            <input id="lanches-website-${j}" type="url" placeholder="https://www.botanikafe.com/"" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>Instagram <span class="opcional"> (Opcional)</span></label>
            <input id="lanches-instagram-${j}" type="url" placeholder="https://www.instagram.com/botanikafe/" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>Região <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="lanches-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="lanches-regiao-${j}" type="text" placeholder="Jardim Paulista" />
          </div>
  
          <div class="nice-form-group">
            <label>Valor <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="lanches-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="lanches-outro-valor-${j}" type="text" placeholder="R$50 - R$100" />
          </div>
  
          <div class="nice-form-group">
            <label>Vídeo <span class="opcional"> (Opcional)</span></label>
            <input id="lanches-midia-${j}" type="url"
              placeholder="https://www.tiktok.com/@viajeparacomer/video/7172239210282274053?q=bottanikafe&t=1700768671502"
              value="" class="icon-right" />
            <div class="legenda">TikTok (Web) ou YouTube</div>
          </div>
  
          <div class="nice-form-group">
          <label>Prioridade <span class="opcional">(Opcional)</span></label>
            <select class="editar-select" id="lanches-nota-${j}">
              <option value="?">Prioridade não definida</option>
              <option value="5">5 - Altíssima prioridade</option>
              <option value="4">4 - Alta prioridade</option>
              <option value="3">3 - Prioridade normal</option>
              <option value="2">2 - Baixa prioridade</option>
              <option value="1">1 - Sem prioridade</option>
            </select>
          </div>
  
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_OpenMoveDestinoModal(${j}, 'lanches')" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-lanches-${j}" class="btn btn-basic btn-format">
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

  _addDestinosListeners('lanches', j);
  _addListenerToRemoveDestino('lanches', j);
  _addSelectorDS('regiao', `lanches-regiao-select-${j}`, `lanches-regiao-${j}`);
}

function _addSaidas() {
  const j = _getNextJ('saidas-box');

  $('#saidas-box').append(`
    <div id="saidas-${j}" class="accordion-item accordion-saidas" >
      <h2 class="accordion-header" id="heading-saidas-${j}">
        <button id="saidas-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-saidas-${j}" aria-expanded="true" aria-controls="collapse-saidas-${j}">
          <span class="title-text" id="saidas-title-text-${j}">Saída ${j}</span> 
          <div class="icon-container">${_getNewSvg(`saidas-title-icon-${j}`)}</i></div>
        </button>
      </h2>
      <div id="collapse-saidas-${j}" class="accordion-collapse collapse" aria-labelledby="heading-saidas-${j}"
        data-bs-parent="#saidas-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="saidas-novo-${j}" class="switch" />
            <label for="saidas-novo-${j}">Recém Adicionado</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>Identificador</label>
            <input id="saidas-id-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>Nome</label>
            <input required id="saidas-nome-${j}" type="text" placeholder="Omalleys" />
          </div>
  
          <div class="nice-form-group">
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
            <input id="saidas-emoji-${j}" type="text" placeholder="🍺" />
          </div>
  
          <div class="nice-form-group">
            <label>Descrição</label>
            <textarea id="saidas-descricao-${j}" rows="3"
              placeholder="Pub irlandês autêntico e próximo da paulista. Cervejas diferentes, drinks e comida irlandesa. English Karaoke nas segundas."></textarea>
          </div>

          <div class="nice-form-group">
            <label>Mapa <span class="opcional"> (Opcional)</span></label>
            <input id="saidas-mapa-${j}" type="url" placeholder="https://maps.app.goo.gl/dVU9471auDGxgNBD6" value=""
              class="icon-right" />
            <div class="legenda">Google Maps ou Apple Maps</div>
          </div>
  
          <div class="nice-form-group">
            <label>Site Oficial <span class="opcional"> (Opcional)</span></label>
            <input id="saidas-website-${j}" type="url" placeholder="https://www.omalleysbar.net/" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>Instagram <span class="opcional"> (Opcional)</span></label>
            <input id="saidas-instagram-${j}" type="url" placeholder="https://www.instagram.com/omalleysbar/" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>Região <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="saidas-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="saidas-regiao-${j}" type="text" placeholder="Jardim Paulista" />
          </div>
  
          <div class="nice-form-group">
            <label>Valor <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="saidas-valor-${j}">
            ${VALOR_OPTIONS}
          </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="saidas-outro-valor-${j}" type="text" placeholder="R$50 - R$100" />
          </div>
  
          <div class="nice-form-group">
            <label>Vídeo <span class="opcional"> (Opcional)</span></label>
            <input id="saidas-midia-${j}" type="url" placeholder="https://www.youtube.com/watch?v=M1qd2Y2T4ZA"
              value="" class="icon-right" />
            <div class="legenda">TikTok (Web) ou YouTube</div>
          </div>
  
          <div class="nice-form-group">
          <label>Prioridade <span class="opcional">(Opcional)</span></label>
            <select class="editar-select" id="saidas-nota-${j}">
              <option value="?">Prioridade não definida</option>
              <option value="5">5 - Altíssima prioridade</option>
              <option value="4">4 - Alta prioridade</option>
              <option value="3">3 - Prioridade normal</option>
              <option value="2">2 - Baixa prioridade</option>
              <option value="1">1 - Sem prioridade</option>
            </select>
          </div>
  
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_OpenMoveDestinoModal(${j}, 'saidas')" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-saidas-${j}" class="btn btn-basic btn-format">
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

  _addDestinosListeners('saidas', j);
  _addListenerToRemoveDestino('saidas', j);
  _addSelectorDS('regiao', `saidas-regiao-select-${j}`, `saidas-regiao-${j}`);
}

function _addTurismo() {
  const j = _getNextJ('turismo-box');

  $('#turismo-box').append(`
    <div id="turismo-${j}" class="accordion-item accordion-turismo" >
      <h2 class="accordion-header" id="heading-turismo-${j}">
        <button id="turismo-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-turismo-${j}" aria-expanded="true" aria-controls="collapse-turismo-${j}">
          <span class="title-text" id="turismo-title-text-${j}">Turismo ${j}</span> 
          <div class="icon-container">${_getNewSvg(`turismo-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-turismo-${j}" class="accordion-collapse collapse" aria-labelledby="heading-turismo-${j}"
        data-bs-parent="#turismo-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="turismo-novo-${j}" class="switch" />
            <label for="turismo-novo-${j}">Recém Adicionado</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>Identificador</label>
            <input id="turismo-id-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>Nome</label>
            <input required id="turismo-nome-${j}" type="text" placeholder="Las Vegas Sign" />
          </div>
  
          <div class="nice-form-group">
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
            <input id="turismo-emoji-${j}" type="text" placeholder="🎰" />
          </div>
  
          <div class="nice-form-group">
            <label>Descrição</label>
            <textarea id="turismo-descricao-${j}" rows="3"
              placeholder="Famosa placa de Las Vegas. Costuma ter fila, então importante chegar cedo."></textarea>
          </div>

          <div class="nice-form-group">
            <label>Mapa <span class="opcional"> (Opcional)</span></label>
            <input id="turismo-mapa-${j}" type="url" placeholder="https://maps.app.goo.gl/on4sJh1d2RNhvPXf6" value=""
              class="icon-right" />
            <div class="legenda">Google Maps ou Apple Maps</div>
          </div>
  
          <div class="nice-form-group">
            <label>Site Oficial <span class="opcional"> (Opcional)</span></label>
            <input id="turismo-website-${j}" type="url" placeholder="https://www.visitlasvegas.com/listing/welcome-to-fabulous-las-vegas-sign/35219/"
              value="" class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>Instagram <span class="opcional"> (Opcional)</span></label>
            <input id="turismo-instagram-${j}" type="url" placeholder="https://www.instagram.com/lasvegassign/" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>Região <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="turismo-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="turismo-regiao-${j}" type="text" placeholder="Centro da Cidade" />
          </div>
  
          <div class="nice-form-group">
            <label>Valor <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="turismo-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="turismo-outro-valor-${j}" type="text" placeholder="R$50 - R$100" />
          </div>
  
          <div class="nice-form-group">
            <label>Vídeo <span class="opcional"> (Opcional)</span></label>
            <input id="turismo-midia-${j}" type="url"
              placeholder="https://www.tiktok.com/@pompsie/video/7214164412616166699?q=las%20vegas%20sign&t=1700778158244"
              value="" class="icon-right" />
            <div class="legenda">TikTok (Web) ou YouTube</div>
          </div>
  
          <div class="nice-form-group">
          <label>Prioridade <span class="opcional">(Opcional)</span></label>
            <select class="editar-select" id="turismo-nota-${j}">
              <option value="?">Prioridade não definida</option>
              <option value="5">5 - Altíssima prioridade</option>
              <option value="4">4 - Alta prioridade</option>
              <option value="3">3 - Prioridade normal</option>
              <option value="2">2 - Baixa prioridade</option>
              <option value="1">1 - Sem prioridade</option>
            </select>
          </div>
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_OpenMoveDestinoModal(${j}, 'turismo')" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-turismo-${j}" class="btn btn-basic btn-format">
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

  _addDestinosListeners('turismo', j);
  _addListenerToRemoveDestino('turismo', j);
  _addSelectorDS('regiao', `turismo-regiao-select-${j}`, `turismo-regiao-${j}`);
}

function _addLojas() {
  const j = _getNextJ('lojas-box');

  $('#lojas-box').append(`
    <div id="lojas-${j}" class="accordion-item accordion-lojas" >
      <h2 class="accordion-header" id="heading-lojas-${j}">
        <button id="lojas-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-lojas-${j}" aria-expanded="true" aria-controls="collapse-lojas-${j}">
          <span class="title-text" id="lojas-title-text-${j}">Loja ${j}</span> 
          <div class="icon-container">${_getNewSvg(`lojas-title-icon-${j}`)}</div>
        </button>
      </h2>

      <div id="collapse-lojas-${j}" class="accordion-collapse collapse" aria-labelledby="heading-lojas-${j}"
        data-bs-parent="#lojas-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="lojas-novo-${j}" class="switch" />
            <label for="lojas-novo-${j}">Recém Adicionado</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>Identificador</label>
            <input id="lojas-id-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>Nome</label>
            <input required id="lojas-nome-${j}" type="text" placeholder="Las Vegas North Premium Outlets" />
          </div>
  
          <div class="nice-form-group">
            <label>Emoji(s) <span class="opcional"> (Opcional)</span></label>
            <input id="lojas-emoji-${j}" type="text" placeholder="🛍️" />
          </div>
  
          <div class="nice-form-group">
            <label>Descrição</label>
            <textarea id="lojas-descricao-${j}" rows="3"
              placeholder="Centro de compras. Possui loja da Forever 21, Calvin Klein, Lacoste, entre outros."></textarea>
          </div>

          <div class="nice-form-group">
            <label>Mapa <span class="opcional"> (Opcional)</span></label>
            <input id="lojas-mapa-${j}" type="url" placeholder="https://maps.app.goo.gl/G7hHLwVMgGVHvmkS7" value=""
              class="icon-right" />
            <div class="legenda">Google Maps ou Apple Maps</div>
          </div>
  
          <div class="nice-form-group">
            <label>Site Oficial <span class="opcional"> (Opcional)</span></label>
            <input id="lojas-website-${j}" type="url"
              placeholder="https://www.premiumoutlets.com/outlet/las-vegas-north" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>Instagram <span class="opcional"> (Opcional)</span></label>
            <input id="lojas-instagram-${j}" type="url" placeholder="https://www.instagram.com/explore/locations/234523919/las-vegas-premium-outlets/" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>Região <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="lojas-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="lojas-regiao-${j}" type="text" placeholder="Las Vegas Strip (Norte)" />
          </div>
  
          <div class="nice-form-group">
            <label>Valor <span class="opcional"> (Opcional)</span></label>
            <select class="editar-select" id="lojas-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="lojas-outro-valor-${j}" type="text" placeholder="R$50 - R$100" />
          </div>
  
          <div class="nice-form-group">
            <label>Vídeo <span class="opcional"> (Opcional)</span></label>
            <input id="lojas-midia-${j}" type="url" placeholder="https://www.youtube.com/watch?v=2LVCuEXZ3bk"
              value="" class="icon-right" />
            <div class="legenda">TikTok (Web) ou YouTube</div>
          </div>
  
          <div class="nice-form-group">
          <label>Prioridade <span class="opcional">(Opcional)</span></label>
            <select class="editar-select" id="lojas-nota-${j}">
              <option value="?">Prioridade não definida</option>
              <option value="5">5 - Altíssima prioridade</option>
              <option value="4">4 - Alta prioridade</option>
              <option value="3">3 - Prioridade normal</option>
              <option value="2">2 - Baixa prioridade</option>
              <option value="1">1 - Sem prioridade</option>
            </select>
          </div>
  
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_OpenMoveDestinoModal(${j}, 'lojas')" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-lojas-${j}" class="btn btn-basic btn-format">
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

  _addDestinosListeners('lojas', j);
  _addListenerToRemoveDestino('lojas', j);
  _addSelectorDS('regiao', `lojas-regiao-select-${j}`, `lojas-regiao-${j}`);
}