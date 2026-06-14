import { getID, getNextJ } from '../../utils/dom.js';
import { addSelectorDS } from '../../ui/dynamic-select.js';
import { translate } from "../../i18n/translation.js";
import { getNewSvg } from "../../theme/icons.js";
import { getDescriptionHTML } from "./categories/description.js";
import {getOutroValorVisibility, loadCurrencySelects, VALOR_OPTIONS} from "./categories/price.js";
import { addDestinationsListeners } from "./edit-destination.js";
import { addListenerToRemoveDestination } from "./edit-destination.js";

// Adicionar
export function addRestaurants() {
	if (!VALOR_OPTIONS) {
		loadCurrencySelects();
	}

	const categoria = "restaurants";
	const j = getNextJ("restaurants-box");

	$("#restaurants-box").append(`
    <div id="restaurants-${j}" class="accordion-item accordion-restaurants" >
      <h2 class="accordion-header" id="heading-restaurants-${j}">
        <button id="restaurants-title-${j}" class="accordion-button collapsed flex-button" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-restaurants-${j}" aria-expanded="true"
          aria-controls="collapse-restaurants-${j}">
          <span class="title-text" id="restaurants-title-text-${j}">${translate("destination.restaurants.title_singular")} ${j}</span> 
          <div class="icon-container">${getNewSvg(`restaurants-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-restaurants-${j}" class="accordion-collapse collapse"
        data-bs-parent="#restaurants-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="restaurants-novo-${j}" class="switch" />
            <label for="restaurants-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="restaurants-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="restaurants-criadoEm-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="restaurants-nome-${j}" type="text" placeholder="${translate("destination.restaurants.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurants-emoji-${j}" type="text" placeholder="${translate("destination.restaurants.placeholders.emoji")}" />
          </div>

          ${getDescriptionHTML(categoria, j)}

          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="restaurants-descricao-button-${j}" data-action="open-description-modal" data-category="${categoria}" data-index="${j}" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurants-mapa-${j}" type="url" placeholder="${translate("destination.restaurants.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurants-website-${j}" type="url"
              placeholder="${translate("destination.restaurants.placeholders.website")}" value="" class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurants-instagram-${j}" type="url" placeholder="${translate("destination.restaurants.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="restaurants-region-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="restaurants-region-${j}" type="text" placeholder="${translate("destination.restaurants.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="restaurants-valor-${j}">
            ${VALOR_OPTIONS}
          </select>
            <input style="display: ${getOutroValorVisibility()}" class="nice-form-group" id="restaurants-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="restaurants-midia-${j}" type="url"
              placeholder="${translate("destination.restaurants.placeholders.video")}" value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="restaurants-nota-${j}">
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
          <button data-action="move-destination" data-index="${j}" data-category="${categoria}" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-restaurants-${j}" class="btn btn-basic btn-format">
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

	addCreatedDate(categoria, j);
	addDestinationsListeners(categoria, j);
	addListenerToRemoveDestination(categoria, j);
	addSelectorDS(
		"region",
		`restaurants-region-select-${j}`,
		`restaurants-region-${j}`,
	);
}

export function addSnacks() {
	if (!VALOR_OPTIONS) {
		loadCurrencySelects();
	}

	const categoria = "snacks";
	const j = getNextJ("snacks-box");

	$("#snacks-box").append(`
    <div id="snacks-${j}" class="accordion-item accordion-snacks" >
      <h2 class="accordion-header" id="heading-snacks-${j}">
        <button id="snacks-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-snacks-${j}" aria-expanded="true" aria-controls="collapse-snacks-${j}">
          <span class="title-text" id="snacks-title-text-${j}">${translate("destination.snacks.title_singular")} ${j}</span> 
          <div class="icon-container">${getNewSvg(`snacks-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-snacks-${j}" class="accordion-collapse collapse" aria-labelledby="heading-snacks-${j}"
        data-bs-parent="#snacks-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="snacks-novo-${j}" class="switch" />
            <label for="snacks-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="snacks-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="snacks-criadoEm-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="snacks-nome-${j}" type="text" placeholder="${translate("destination.snacks.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="snacks-emoji-${j}" type="text" placeholder="${translate("destination.snacks.placeholders.emoji")}" />
          </div>

          ${getDescriptionHTML(categoria, j)}
  
          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="snacks-descricao-button-${j}" data-action="open-description-modal" data-category="${categoria}" data-index="${j}" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="snacks-mapa-${j}" type="url" placeholder="${translate("destination.snacks.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="snacks-website-${j}" type="url" placeholder="${translate("destination.snacks.placeholders.website")}" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="snacks-instagram-${j}" type="url" placeholder="${translate("destination.snacks.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="snacks-region-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="snacks-region-${j}" type="text" placeholder="${translate("destination.snacks.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="snacks-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${getOutroValorVisibility()}" class="nice-form-group" id="snacks-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="snacks-midia-${j}" type="url"
              placeholder="${translate("destination.snacks.placeholders.video")}"
              value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="snacks-nota-${j}">
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
          <button data-action="move-destination" data-index="${j}" data-category="${categoria}" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-snacks-${j}" class="btn btn-basic btn-format">
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

	addCreatedDate(categoria, j);
	addDestinationsListeners(categoria, j);
	addListenerToRemoveDestination(categoria, j);
	addSelectorDS("region", `snacks-region-select-${j}`, `snacks-region-${j}`);
}

export function addNightlife() {
	if (!VALOR_OPTIONS) {
		loadCurrencySelects();
	}

	const categoria = "nightlife";
	const j = getNextJ("nightlife-box");

	$("#nightlife-box").append(`
    <div id="nightlife-${j}" class="accordion-item accordion-nightlife" >
      <h2 class="accordion-header" id="heading-nightlife-${j}">
        <button id="nightlife-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-nightlife-${j}" aria-expanded="true" aria-controls="collapse-nightlife-${j}">
          <span class="title-text" id="nightlife-title-text-${j}">${translate("destination.nightlife.title_singular")} ${j}</span> 
          <div class="icon-container">${getNewSvg(`nightlife-title-icon-${j}`)}</i></div>
        </button>
      </h2>
      <div id="collapse-nightlife-${j}" class="accordion-collapse collapse" aria-labelledby="heading-nightlife-${j}"
        data-bs-parent="#nightlife-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="nightlife-novo-${j}" class="switch" />
            <label for="nightlife-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="nightlife-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="nightlife-criadoEm-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="nightlife-nome-${j}" type="text" placeholder="${translate("destination.nightlife.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="nightlife-emoji-${j}" type="text" placeholder="${translate("destination.nightlife.placeholders.emoji")}" />
          </div>

          ${getDescriptionHTML(categoria, j)}
  
          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="nightlife-descricao-button-${j}" data-action="open-description-modal" data-category="${categoria}" data-index="${j}" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="nightlife-mapa-${j}" type="url" placeholder="${translate("destination.nightlife.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="nightlife-website-${j}" type="url" placeholder="${translate("destination.nightlife.placeholders.website")}" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="nightlife-instagram-${j}" type="url" placeholder="${translate("destination.nightlife.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="nightlife-region-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="nightlife-region-${j}" type="text" placeholder="${translate("destination.nightlife.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="nightlife-valor-${j}">
            ${VALOR_OPTIONS}
          </select>
            <input style="display: ${getOutroValorVisibility()}" class="nice-form-group" id="nightlife-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="nightlife-midia-${j}" type="url" placeholder="${translate("destination.nightlife.placeholders.video")}"
              value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="nightlife-nota-${j}">
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
          <button data-action="move-destination" data-index="${j}" data-category="${categoria}" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-nightlife-${j}" class="btn btn-basic btn-format">
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

	addCreatedDate(categoria, j);
	addDestinationsListeners(categoria, j);
	addListenerToRemoveDestination(categoria, j);
	addSelectorDS("region", `nightlife-region-select-${j}`, `nightlife-region-${j}`);
}

export function addTourism() {
	if (!VALOR_OPTIONS) {
		loadCurrencySelects();
	}

	const categoria = "tourism";
	const j = getNextJ("tourism-box");

	$("#tourism-box").append(`
    <div id="tourism-${j}" class="accordion-item accordion-tourism" >
      <h2 class="accordion-header" id="heading-tourism-${j}">
        <button id="tourism-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-tourism-${j}" aria-expanded="true" aria-controls="collapse-tourism-${j}">
          <span class="title-text" id="tourism-title-text-${j}">${translate("destination.tourism.title_singular")} ${j}</span> 
          <div class="icon-container">${getNewSvg(`tourism-title-icon-${j}`)}</div>
        </button>
      </h2>
      <div id="collapse-tourism-${j}" class="accordion-collapse collapse" aria-labelledby="heading-tourism-${j}"
        data-bs-parent="#tourism-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="tourism-novo-${j}" class="switch" />
            <label for="tourism-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="tourism-id-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="tourism-criadoEm-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="tourism-nome-${j}" type="text" placeholder="${translate("destination.tourism.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="tourism-emoji-${j}" type="text" placeholder="${translate("destination.tourism.placeholders.emoji")}" />
          </div>

          ${getDescriptionHTML(categoria, j)}
  
          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="tourism-descricao-button-${j}" data-action="open-description-modal" data-category="${categoria}" data-index="${j}" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="tourism-mapa-${j}" type="url" placeholder="${translate("destination.tourism.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="tourism-website-${j}" type="url" placeholder="${translate("destination.tourism.placeholders.website")}"
              value="" class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="tourism-instagram-${j}" type="url" placeholder="${translate("destination.tourism.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="tourism-region-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="tourism-region-${j}" type="text" placeholder="${translate("destination.tourism.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="tourism-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${getOutroValorVisibility()}" class="nice-form-group" id="tourism-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="tourism-midia-${j}" type="url"
              placeholder="${translate("destination.tourism.placeholders.video")}"
              value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="tourism-nota-${j}">
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
          <button data-action="move-destination" data-index="${j}" data-category="${categoria}" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-tourism-${j}" class="btn btn-basic btn-format">
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

	addCreatedDate(categoria, j);
	addDestinationsListeners(categoria, j);
	addListenerToRemoveDestination(categoria, j);
	addSelectorDS("region", `tourism-region-select-${j}`, `tourism-region-${j}`);
}

export function addShopping() {
	if (!VALOR_OPTIONS) {
		loadCurrencySelects();
	}

	const categoria = "shopping";
	const j = getNextJ("shopping-box");

	$("#shopping-box").append(`
    <div id="shopping-${j}" class="accordion-item accordion-shopping" >
      <h2 class="accordion-header" id="heading-shopping-${j}">
        <button id="shopping-title-${j}" class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse-shopping-${j}" aria-expanded="true" aria-controls="collapse-shopping-${j}">
          <span class="title-text" id="shopping-title-text-${j}">${translate("destination.shopping.title_singular")} ${j}</span> 
          <div class="icon-container">${getNewSvg(`shopping-title-icon-${j}`)}</div>
        </button>
      </h2>

      <div id="collapse-shopping-${j}" class="accordion-collapse collapse" aria-labelledby="heading-shopping-${j}"
        data-bs-parent="#shopping-box">
        <div class="accordion-body">
  
          <div class="nice-form-group">
            <input type="checkbox" id="shopping-novo-${j}" class="switch" />
            <label for="shopping-novo-${j}">${translate("destination.recent")}</label>
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.created_date")}</label>
            <input id="shopping-criadoEm-${j}" type="text" disabled />
          </div>

          <div class="nice-form-group" style="display: none">
            <label>${translate("labels.id")}</label>
            <input id="shopping-id-${j}" type="text" disabled />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.name")}</label>
            <input required id="shopping-nome-${j}" type="text" placeholder="${translate("destination.shopping.placeholders.name")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.emoji")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="shopping-emoji-${j}" type="text" placeholder="${translate("destination.shopping.placeholders.emoji")}" />
          </div>

          ${getDescriptionHTML(categoria, j)}
  
          <div class="nice-form-group customization-box">
            <label>${translate("labels.description.title")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <button id="shopping-descricao-button-${j}" data-action="open-description-modal" data-category="${categoria}" data-index="${j}" class="btn input-botao" style="margin-top: 0px;">${translate("labels.description.add")}</button>
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.customization.links.map")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="shopping-mapa-${j}" type="url" placeholder="${translate("destination.shopping.placeholders.map")}" value=""
              class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.map")}</div>
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.social.website")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="shopping-website-${j}" type="url"
              placeholder="${translate("destination.shopping.placeholders.website")}" value=""
              class="icon-right" />
          </div>

          <div class="nice-form-group">
            <label>${translate("labels.social.instagram")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="shopping-instagram-${j}" type="url" placeholder="${translate("destination.shopping.placeholders.instagram")}" value=""
              class="icon-right" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.region")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="shopping-region-select-${j}" style="display: none;"></select>
            <input class="nice-form-group" id="shopping-region-${j}" type="text" placeholder="${translate("destination.shopping.placeholders.region")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.cost")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <select class="editar-select" id="shopping-valor-${j}">
              ${VALOR_OPTIONS}
            </select>
            <input style="display: ${getOutroValorVisibility()}" class="nice-form-group" id="shopping-outro-valor-${j}" type="text" placeholder="${translate("destination.price.placeholder")}" />
          </div>
  
          <div class="nice-form-group">
            <label>${translate("labels.video")} <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="shopping-midia-${j}" type="url" placeholder="${translate("destination.shopping.placeholders.video")}"
              value="" class="icon-right" />
            <div class="legenda">${translate("destination.tooltips.video")}</div>
          </div>
  
          <div class="nice-form-group">
          <label>${translate("labels.priority")} <span class="opcional">(${translate("labels.optional")})</span></label>
            <select class="editar-select" id="shopping-nota-${j}">
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
          <button data-action="move-destination" data-index="${j}" data-category="${categoria}" class="btn btn-basic-secondary btn-format">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                      <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                  </g>
              </svg>
          </button>
          <button id="remove-shopping-${j}" class="btn btn-basic btn-format">
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

	addCreatedDate(categoria, j);
	addDestinationsListeners(categoria, j);
	addListenerToRemoveDestination(categoria, j);
	addSelectorDS("region", `shopping-region-select-${j}`, `shopping-region-${j}`);
}

function addCreatedDate(categoria, j) {
	getID(`${categoria}-criadoEm-${j}`).value = new Date().toISOString();
}
