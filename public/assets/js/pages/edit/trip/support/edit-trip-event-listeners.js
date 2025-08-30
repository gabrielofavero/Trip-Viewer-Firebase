import { addRemoveChildListenerDS } from "../../../support/components/dynamic-select.js";
import { DOCUMENT_ID } from "../../../support/firebase/database.js";
import { editFieldAgain, validateLink, validateImageLink } from "../../../support/html/fields.js";
import { getID, on, onChange, onClick, onInput } from "../../../support/pages/selectors.js";
import { translate } from "../../../main/translate.js";
import { getNextInputDay, getPreviousInputDay, inputDateToJsDate } from "../../../support/data/dates.js";
import { searchDestination } from "../categorias/destinos.js";
import { goHomeFromEditDocumentPage } from "../../../support/pages/navigation.js";
import { deleteViagem } from "../edit-trip.js";
import { closeToast } from "../../../support/pages/messages.js";

var INPUT_DETECTED = false;

// Loader
export function loadEditTripListeners() {

    // Inputs
    onChange('#inicio', _inicioListenerAction);
    onChange('#fim', _fimListenerAction);

    // Buttons
    onClick('#editores-adicionar', _addEditores);
    onClick('#salvar', _setViagem);
    onClick('#re-editar', editTripFieldAgain);
    onClick('#visualizar', _visualizarListenerAction);
    onClick('#home', goHomeFromEditDocumentPage);
    onClick('#back', goHomeFromEditDocumentPage);
    onClick('#cancelar', goHomeFromEditDocumentPage);
    onClick('#transporte-adicionar', _transporteAdicionarListenerAction);
    onClick('#hospedagens-adicionar', _hospedagensAdicionarListenerAction);
    onClick('#galeria-adicionar', _galeriaAdicionarListenerAction);
    onClick('#pin-enable', _switchPin);
    onClick('#pin-disable', _switchPin);
    onClick('#travelers-info', _openTravelersInfo);
    onClick('#delete-trip', deleteViagem);
    onClick('#request-pin', _requestPinEditarGastos);
    onClick('#programacao-adicionar-gastosPrevios', () => _openInnerGasto('gastosPrevios'));
    onClick('#programacao-adicionar-gastosDurante', () => _openInnerGasto('gastosDurante'));
    onClick('#programacao-adicionar-gastosPrevios', () => _openInnerGasto('gastosPrevios'));
    onClick('.toast-close', closeToast, false);

    // Transportation View Validation
    onChange('#simple-view', _applyTransportationTypeVisualization);
    onChange('#leg-view', _applyTransportationTypeVisualization);
    onChange('#people-view', _applyTransportationTypeVisualization);

    // Image Link Validation
    onChange('#link-background', () => validateImageLink('link-background'));
    onChange('#link-logo-light', () => validateImageLink('link-logo-light'));
    onChange('#link-logo-dark', () => validateImageLink('link-logo-dark'));

    // Link Validation
    onChange('#link-attachments', () => validateLink('link-attachments'));
    onChange('#link-drive', () => validateLink('link-drive'));
    onChange('#link-maps', () => validateLink('link-maps'));
    onChange('#link-pdf', () => validateLink('link-pdf'));
    onChange('#link-ppt', () => validateLink('link-ppt'));
    onChange('#link-sheet', () => validateLink('link-sheet'));
    onChange('#link-vacina', () => validateLink('link-vacina'));

    // Destination Search Bar
    onInput('#destinos-search', searchDestination);

    // Radios
    onChange('#dark-and-light', _visibilityListenerAction);
    onChange('#light-exclusive', _visibilityListenerAction);
    onChange('#dark-exclusive', _visibilityListenerAction);

    // Document and Window
    onInput('document', detectInput);
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
