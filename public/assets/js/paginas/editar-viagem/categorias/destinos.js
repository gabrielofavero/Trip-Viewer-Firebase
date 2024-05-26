const DESTINOS_CATEGORIAS = ['restaurantes', 'lanches', 'saidas', 'turismo', 'lojas'];
const DESTINOS_TITULOS = {
    restaurantes: 'Restaurantes',
    lanches: 'Lanches',
    saidas: 'Saídas',
    turismo: 'Pontos Turísticos',
    lojas: 'Lojas'
};
var DESTINO_SELECT = [];

function _getDestinosAtivos() {
    const habilidadoDestinos = getID('habilitado-destinos');
    if (habilidadoDestinos && !habilidadoDestinos.checked) return;

    const childIDs = _getChildIDs('destinos-checkboxes');
    let result = [];

    for (const child of childIDs) {
        const j = _getJ(child);
        const checkbox = getID(`check-${j}`);
        if (checkbox.checked) {
            result.push({
                titulo: getID(`check-label-${j}`).innerText,
                destinosID: checkbox.value
            })
        }
    }

    return result;
}

function _loadDestinosSelect() {
    const destinosAtivos = _getDestinosAtivos();
    DESTINO_SELECT = [];
    if (destinosAtivos && destinosAtivos.length > 0) {
        DESTINO_SELECT.push({
            value: 'generico',
            innerHTML: '<option value="generico">Destino Não Especificado</option>'
        });
        for (const destino of destinosAtivos) {
            DESTINO_SELECT.push({
                value: destino.destinosID,
                innerHTML: `<option value="${destino.destinosID}">${destino.titulo}</option>`
            });
        }
    }
}

function _getDestinosSelectOptions() {
    return DESTINO_SELECT.map(destino => destino.innerHTML).join('');
}

function _getDestinosSelectVisibility() {
    return DESTINO_SELECT.length > 0 ? 'block' : 'none';
}

function _writeDestinosSelects() {
    _loadDestinosSelect();
    _writeDestinosSelect('programacao');
    _writeDestinosSelect('lineup');
}

function _writeDestinosSelect(tipo) {
    const childs = _getChildIDs(`${tipo}-box`);
    const visibility = DESTINO_SELECT.length > 0 ? 'block' : 'none';
    const values = DESTINO_SELECT.map(destino => destino.value);
    const innerHTML = DESTINO_SELECT.map(destino => destino.innerHTML).join('');

    for (const child of childs) {
        const j = _getJ(child);
        const originalValue = getID(`${tipo}-local-${j}`).value;
        getID(`${tipo}-local-${j}`).innerHTML = innerHTML;
        getID(`${tipo}-local-box-${j}`).style.display = visibility;

        if (values.includes(originalValue)) {
            getID(`${tipo}-local-${j}`).value = originalValue;
        }
    }
}