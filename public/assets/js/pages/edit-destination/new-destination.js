// Adicionar
function _addRestaurantes() {
	if (!VALOR_OPTIONS) {
		_loadCurrencySelects();
	}

	const categoria = "restaurantes";
	const j = _getNextJ("restaurantes-box");

	$("#restaurantes-box").append(`
    <div id="restaurantes-${j}" class="accordion-item accordion-restaurantes" >
      <h2 class="accordion-header" id="heading-restaurantes-${j}">
        <button id="restaurantes-title-${j}" class="accordion-button collapsed flex-button" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-restaurantes-${j}" aria-expanded="true"
          aria-controls="collapse-restaurantes-${j}">
          <span class="title-text" id="restaurantes-title-text-${j}">${translate("destination.restaurants.title_singular")} ${j}</span> 
          <div class="icon-container">${_getNewSvg(`restaurantes-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-restaurantes-${j}" class="accordion-collapse collapse"
        aria-labelledby="heading-restaurantes-${j}" data-bs-parent="#restaurantes-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="restaurantes-novo-${j}" class="switch" />
            <label for="restaurantes-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="restaurantes-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="restaurantes-criadoEm-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="restaurantes-nome-${j}" type="text" placeholder="${translate("destination.restaurants.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurantes-emoji-${j}" type="text" placeholder="${translate("destination.restaurants.placeholders.emoji")}" />
          </div>

          ${_getDescriptionHTML(categoria, j)}

          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="restaurantes-descricao-button-${j}" onclick="_openDescriptionModal('${categoria}', ${j})" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurantes-mapa-${j}" type="url" placeholder="${translate("destination.restaurants.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurantes-website-${j}" type="url"
              placeholder="${translate("destination.restaurants.placeholders.website")}" value="" class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurantes-instagram-${j}" type="url" placeholder="${translate("destination.restaurants.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="restaurantes-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="restaurantes-regiao-${j}" type="text" placeholder="${translate("destination.restaurants.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="restaurantes-valor-${j}">
            ${VALOR_OPTIONS}
          </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="restaurantes-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurantes-midia-${j}" type="url"
              placeholder="${translate("destination.restaurants.placeholders.video")}" value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="restaurantes-nota-${j}">
              <option value="?">${translate("destination.scores.default")}</option>
              <option value="5">5 - ${translate("destination.scores.5")}</option>
              <option value="4">4 - ${translate("destination.scores.4")}</option>
              <option value="3">3 - ${translate("destination.scores.3")}</option>
              <option value="2">2 - ${translate("destination.scores.2")}</option>
              <option value="1">1 - ${translate("destination.scores.1")}</option>
            </select>
          </div>
  
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_openMoveDestinoModal(${j}, '${categoria}')" class="btn btn-basic-secondary btn-format">
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

	_addCreatedDate(categoria, j);
	_addDestinosListeners(categoria, j);
	_addListenerToRemoveDestino(categoria, j);
	_addSelectorDS(
		"regiao",
		`restaurantes-regiao-select-${j}`,
		`restaurantes-regiao-${j}`,
	);
}

function _addLanches() {
	if (!VALOR_OPTIONS) {
		_loadCurrencySelects();
	}

	const categoria = "lanches";
	const j = _getNextJ("lanches-box");

	$("#lanches-box").append(`
    <div id="lanches-${j}" class="accordion-item accordion-lanches" >
      <h2 class="accordion-header" id="heading-lanches-${j}">
        <button id="lanches-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-lanches-${j}" aria-expanded="true" aria-controls="collapse-lanches-${j}">
          <span class="title-text" id="lanches-title-text-${j}">${translate("destination.snacks.title_singular")} ${j}</span> 
          <div class="icon-container">${_getNewSvg(`lanches-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-lanches-${j}" class="accordion-collapse collapse" aria-labelledby="heading-lanches-${j}"
        data-bs-parent="#lanches-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="lanches-novo-${j}" class="switch" />
            <label for="lanches-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="lanches-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="lanches-criadoEm-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="lanches-nome-${j}" type="text" placeholder="${translate("destination.snacks.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lanches-emoji-${j}" type="text" placeholder="${translate("destination.snacks.placeholders.emoji")}" />
          </div>

          ${_getDescriptionHTML(categoria, j)}
  
          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="lanches-descricao-button-${j}" onclick="_openDescriptionModal('${categoria}', ${j})" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lanches-mapa-${j}" type="url" placeholder="${translate("destination.snacks.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lanches-website-${j}" type="url" placeholder="${translate("destination.snacks.placeholders.website")}" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lanches-instagram-${j}" type="url" placeholder="${translate("destination.snacks.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="lanches-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="lanches-regiao-${j}" type="text" placeholder="${translate("destination.snacks.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="lanches-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="lanches-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lanches-midia-${j}" type="url"
              placeholder="${translate("destination.snacks.placeholders.video")}"
              value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="lanches-nota-${j}">
              <option value="?">${translate("destination.scores.default")}</option>
              <option value="5">5 - ${translate("destination.scores.5")}</option>
              <option value="4">4 - ${translate("destination.scores.4")}</option>
              <option value="3">3 - ${translate("destination.scores.3")}</option>
              <option value="2">2 - ${translate("destination.scores.2")}</option>
              <option value="1">1 - ${translate("destination.scores.1")}</option>
            </select>
          </div>
  
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_openMoveDestinoModal(${j}, '${categoria}')" class="btn btn-basic-secondary btn-format">
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

	_addCreatedDate(categoria, j);
	_addDestinosListeners(categoria, j);
	_addListenerToRemoveDestino(categoria, j);
	_addSelectorDS("regiao", `lanches-regiao-select-${j}`, `lanches-regiao-${j}`);
}

function _addSaidas() {
	if (!VALOR_OPTIONS) {
		_loadCurrencySelects();
	}

	const categoria = "saidas";
	const j = _getNextJ("saidas-box");

	$("#saidas-box").append(`
    <div id="saidas-${j}" class="accordion-item accordion-saidas" >
      <h2 class="accordion-header" id="heading-saidas-${j}">
        <button id="saidas-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-saidas-${j}" aria-expanded="true" aria-controls="collapse-saidas-${j}">
          <span class="title-text" id="saidas-title-text-${j}">${translate("destination.nightlife.title_singular")} ${j}</span> 
          <div class="icon-container">${_getNewSvg(`saidas-title-icon-${j}`)}</i></div>
        </button>
      </h2>
      <div id="collapse-saidas-${j}" class="accordion-collapse collapse" aria-labelledby="heading-saidas-${j}"
        data-bs-parent="#saidas-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="saidas-novo-${j}" class="switch" />
            <label for="saidas-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="saidas-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="saidas-criadoEm-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="saidas-nome-${j}" type="text" placeholder="${translate("destination.nightlife.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="saidas-emoji-${j}" type="text" placeholder="${translate("destination.nightlife.placeholders.emoji")}" />
          </div>

          ${_getDescriptionHTML(categoria, j)}
  
          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="saidas-descricao-button-${j}" onclick="_openDescriptionModal('${categoria}', ${j})" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="saidas-mapa-${j}" type="url" placeholder="${translate("destination.nightlife.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="saidas-website-${j}" type="url" placeholder="${translate("destination.nightlife.placeholders.website")}" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="saidas-instagram-${j}" type="url" placeholder="${translate("destination.nightlife.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="saidas-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="saidas-regiao-${j}" type="text" placeholder="${translate("destination.nightlife.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="saidas-valor-${j}">
            ${VALOR_OPTIONS}
          </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="saidas-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="saidas-midia-${j}" type="url" placeholder="${translate("destination.nightlife.placeholders.video")}"
              value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="saidas-nota-${j}">
              <option value="?">${translate("destination.scores.default")}</option>
              <option value="5">5 - ${translate("destination.scores.5")}</option>
              <option value="4">4 - ${translate("destination.scores.4")}</option>
              <option value="3">3 - ${translate("destination.scores.3")}</option>
              <option value="2">2 - ${translate("destination.scores.2")}</option>
              <option value="1">1 - ${translate("destination.scores.1")}</option>
            </select>
          </div>
  
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_openMoveDestinoModal(${j}, '${categoria}')" class="btn btn-basic-secondary btn-format">
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

	_addCreatedDate(categoria, j);
	_addDestinosListeners(categoria, j);
	_addListenerToRemoveDestino(categoria, j);
	_addSelectorDS("regiao", `saidas-regiao-select-${j}`, `saidas-regiao-${j}`);
}

function _addTurismo() {
	if (!VALOR_OPTIONS) {
		_loadCurrencySelects();
	}

	const categoria = "turismo";
	const j = _getNextJ("turismo-box");

	$("#turismo-box").append(`
    <div id="turismo-${j}" class="accordion-item accordion-turismo" >
      <h2 class="accordion-header" id="heading-turismo-${j}">
        <button id="turismo-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-turismo-${j}" aria-expanded="true" aria-controls="collapse-turismo-${j}">
          <span class="title-text" id="turismo-title-text-${j}">${translate("destination.tourism.title_singular")} ${j}</span> 
          <div class="icon-container">${_getNewSvg(`turismo-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-turismo-${j}" class="accordion-collapse collapse" aria-labelledby="heading-turismo-${j}"
        data-bs-parent="#turismo-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="turismo-novo-${j}" class="switch" />
            <label for="turismo-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="turismo-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="turismo-criadoEm-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="turismo-nome-${j}" type="text" placeholder="${translate("destination.tourism.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="turismo-emoji-${j}" type="text" placeholder="${translate("destination.tourism.placeholders.emoji")}" />
          </div>

          ${_getDescriptionHTML(categoria, j)}
  
          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="turismo-descricao-button-${j}" onclick="_openDescriptionModal('${categoria}', ${j})" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="turismo-mapa-${j}" type="url" placeholder="${translate("destination.tourism.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="turismo-website-${j}" type="url" placeholder="${translate("destination.tourism.placeholders.website")}"
              value="" class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="turismo-instagram-${j}" type="url" placeholder="${translate("destination.tourism.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="turismo-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="turismo-regiao-${j}" type="text" placeholder="${translate("destination.tourism.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="turismo-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="turismo-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="turismo-midia-${j}" type="url"
              placeholder="${translate("destination.tourism.placeholders.video")}"
              value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="turismo-nota-${j}">
              <option value="?">${translate("destination.scores.default")}</option>
              <option value="5">5 - ${translate("destination.scores.5")}</option>
              <option value="4">4 - ${translate("destination.scores.4")}</option>
              <option value="3">3 - ${translate("destination.scores.3")}</option>
              <option value="2">2 - ${translate("destination.scores.2")}</option>
              <option value="1">1 - ${translate("destination.scores.1")}</option>
            </select>
          </div>
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_openMoveDestinoModal(${j}, '${categoria}')" class="btn btn-basic-secondary btn-format">
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

	_addCreatedDate(categoria, j);
	_addDestinosListeners(categoria, j);
	_addListenerToRemoveDestino(categoria, j);
	_addSelectorDS("regiao", `turismo-regiao-select-${j}`, `turismo-regiao-${j}`);
}

function _addLojas() {
	if (!VALOR_OPTIONS) {
		_loadCurrencySelects();
	}

	const categoria = "lojas";
	const j = _getNextJ("lojas-box");

	$("#lojas-box").append(`
    <div id="lojas-${j}" class="accordion-item accordion-lojas" >
      <h2 class="accordion-header" id="heading-lojas-${j}">
        <button id="lojas-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-lojas-${j}" aria-expanded="true" aria-controls="collapse-lojas-${j}">
          <span class="title-text" id="lojas-title-text-${j}">${translate("destination.shopping.title_singular")} ${j}</span> 
          <div class="icon-container">${_getNewSvg(`lojas-title-icon-${j}`)}</div>
        </button>
      </h2>

      <div id="collapse-lojas-${j}" class="accordion-collapse collapse" aria-labelledby="heading-lojas-${j}"
        data-bs-parent="#lojas-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="lojas-novo-${j}" class="switch" />
            <label for="lojas-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="lojas-criadoEm-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="lojas-id-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="lojas-nome-${j}" type="text" placeholder="${translate("destination.shopping.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lojas-emoji-${j}" type="text" placeholder="${translate("destination.shopping.placeholders.emoji")}" />
          </div>

          ${_getDescriptionHTML(categoria, j)}
  
          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="lojas-descricao-button-${j}" onclick="_openDescriptionModal('${categoria}', ${j})" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lojas-mapa-${j}" type="url" placeholder="${translate("destination.shopping.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lojas-website-${j}" type="url"
              placeholder="${translate("destination.shopping.placeholders.website")}" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lojas-instagram-${j}" type="url" placeholder="${translate("destination.shopping.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="lojas-regiao-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="lojas-regiao-${j}" type="text" placeholder="${translate("destination.shopping.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="lojas-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${_getOutroValorVisibility()}" class="nice-form-group" id="lojas-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="lojas-midia-${j}" type="url" placeholder="${translate("destination.shopping.placeholders.video")}"
              value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="lojas-nota-${j}">
              <option value="?">${translate("destination.scores.default")}</option>
              <option value="5">5 - ${translate("destination.scores.5")}</option>
              <option value="4">4 - ${translate("destination.scores.4")}</option>
              <option value="3">3 - ${translate("destination.scores.3")}</option>
              <option value="2">2 - ${translate("destination.scores.2")}</option>
              <option value="1">1 - ${translate("destination.scores.1")}</option>
            </select>
          </div>
  
        </div>
  
        <div class="button-box-right-formatted">
          <button onclick="_openMoveDestinoModal(${j}, '${categoria}')" class="btn btn-basic-secondary btn-format">
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

	_addCreatedDate(categoria, j);
	_addDestinosListeners(categoria, j);
	_addListenerToRemoveDestino(categoria, j);
	_addSelectorDS("regiao", `lojas-regiao-select-${j}`, `lojas-regiao-${j}`);
}

function _addCreatedDate(categoria, j) {
	getID(`${categoria}-criadoEm-${j}`).value = new Date().toISOString();
}
