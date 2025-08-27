import { addRemoveChildListenerDS } from "../../../support/components/dynamic-select.js";
import { DOCUMENT_ID } from "../../../support/firebase/database.js";
import { editFieldAgain, validateLink, validateImageLink } from "../../../support/html/fields.js";
import { getID, on } from "../../../support/pages/selectors.js";
import { translate } from "../../../main/translate.js";
import { getNextInputDay, getPreviousInputDay, inputDateToJsDate } from "../../../support/data/dates.js";
import { searchDestination } from "../categorias/destinos.js";
import { goHomeFromEditDocumentPage } from "../../../support/pages/navigation.js";
import { deleteViagem } from "../editar-viagem.js";
import { closeToast } from "../../../support/pages/messages.js";

var INPUT_DETECTED = false;

// Loader
export function loadEditTripListeners() {

    // Inputs
    on('change', '#inicio', _inicioListenerAction);
    on('change', '#fim', _fimListenerAction);

    // Buttons
    on('click', '#editores-adicionar', _addEditores);
    on('click', '#salvar', _setViagem);
    on('click', '#re-editar', editTripFieldAgain);
    on('click', '#visualizar', _visualizarListenerAction);
    on('click', '#home', goHomeFromEditDocumentPage);
    on('click', '#back', goHomeFromEditDocumentPage);
    on('click', '#cancelar', goHomeFromEditDocumentPage);
    on('click', '#transporte-adicionar', _transporteAdicionarListenerAction);
    on('click', '#hospedagens-adicionar', _hospedagensAdicionarListenerAction);
    on('click', '#galeria-adicionar', _galeriaAdicionarListenerAction);
    on('click', '#pin-enable', _switchPin);
    on('click', '#pin-disable', _switchPin);
    on('click', '#travelers-info', _openTravelersInfo);
    on('click', '#delete-trip', deleteViagem);
    on('click', '#request-pin', _requestPinEditarGastos);
    on('click', '#programacao-adicionar-gastosPrevios', () => _openInnerGasto('gastosPrevios'));
    on('click', '#programacao-adicionar-gastosDurante', () => _openInnerGasto('gastosDurante'));
    on('click', '#programacao-adicionar-gastosPrevios', () => _openInnerGasto('gastosPrevios'));
    on('click', '.toast-close', closeToast, false);

    // Transportation View Validation
    on('change', '#simple-view', _applyTransportationTypeVisualization);
    on('change', '#leg-view', _applyTransportationTypeVisualization);
    on('change', '#people-view', _applyTransportationTypeVisualization);

    // Image Link Validation
    on('change', '#link-background', () => validateImageLink('link-background'));
    on('change', '#link-logo-light', () => validateImageLink('link-logo-light'));
    on('change', '#link-logo-dark', () => validateImageLink('link-logo-dark'));

    // Link Validation
    on('change', '#link-attachments', () => validateLink('link-attachments'));
    on('change', '#link-drive', () => validateLink('link-drive'));
    on('change', '#link-maps', () => validateLink('link-maps'));
    on('change', '#link-pdf', () => validateLink('link-pdf'));
    on('change', '#link-ppt', () => validateLink('link-ppt'));
    on('change', '#link-sheet', () => validateLink('link-sheet'));
    on('change', '#link-vacina', () => validateLink('link-vacina'));

    // Destination Search Bar
    on('input', '#destinos-search', searchDestination);

    // Radios
    on('change', '#dark-and-light', _visibilityListenerAction);
    on('change', '#light-exclusive', _visibilityListenerAction);
    on('change', '#dark-exclusive', _visibilityListenerAction);

    // Document and Window
    on('input', 'document', detectInput);
    on('beforeunload', 'window', confirmExit);
}

// Actions
function _inicioListenerAction() {
    const inicioDiv = getID('inicio');
    const fimDiv = getID('fim');

    const inicio = inicioDiv.value;
    const fim = fimDiv.value;

    if (NEW_TRIP || !fim || inputDateToJsDate(fim).getTime() < inputDateToJsDate(inicio).getTime()) {
        fimDiv.value = getNextInputDay(inicio);
    }

    _reloadProgramacao();
}

function _fimListenerAction() {
    const inicioDiv = getID('inicio');
    const fimDiv = getID('fim');

    const inicio = inicioDiv.value;
    const fim = fimDiv.value;

    if (!inicio || inputDateToJsDate(fim).getTime() < inputDateToJsDate(inicio).getTime()) {
        inicioDiv.value = getPreviousInputDay(fim);
    }

    _reloadProgramacao();
}

function _visualizarListenerAction() {
    if (DOCUMENT_ID) {
        window.open(`../view.html?v=${DOCUMENT_ID}`, '_blank');
    } else {
        window.location.href = '../index.html';
    }
}

function _addRemoveTransporteListener(j) {
    const dynamicSelects = [{
        type: 'transporte-pessoa',
        selectID: `transporte-pessoa-select-${j}`,
    }]
    addRemoveChildListenerDS('transporte', j, dynamicSelects);
}


function _addRemoveGaleriaListener(j) {
    const dynamicSelects = [{
        type: 'galeria-categoria',
        selectID: `galeria-categoria-select-${j}`,
    }]
    addRemoveChildListenerDS('galeria', j, dynamicSelects);
}

function _visibilityListenerAction(visibilidade) {
    if (!visibilidade) {
        visibilidade = _buildVisibilidadeObject();
    }

    getID('tema-claro').style.display = visibilidade.claro ? 'block' : 'none';
    getID('tema-escuro').style.display = visibilidade.escuro ? 'block' : 'none';
}

function editTripFieldAgain() {
    editFieldAgain('viagens', SUCCESSFUL_SAVE);
    _closeModal('delete-modal');
}

function detectInput(event) {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
        INPUT_DETECTED = true;
    }
}

function confirmExit(event) {
    if (INPUT_DETECTED && !SUCCESSFUL_SAVE) {
        event.preventDefault();
        event.returnValue = translate('messages.exit_confirmation');
    }
}
