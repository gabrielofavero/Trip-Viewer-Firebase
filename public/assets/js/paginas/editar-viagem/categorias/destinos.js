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
            value: '',
            innerHTML: '<option value="">Destino Não Especificado</option>'
        });
        for (const destino of destinosAtivos) {
            DESTINO_SELECT.push({
                value: destino.destinosID,
                label: destino.titulo,
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

function _writeDestinosSelect(tipo, j) {
    const visibility = DESTINO_SELECT.length > 0 ? 'block' : 'none';
    const order = _getDestinosLocalOrder(tipo);

    const orderedDestinoSelect = DESTINO_SELECT.sort((a, b) => {
        if (a.value === '') return -1;
        if (b.value === '') return 1;
        if (order.includes(a.label) && order.includes(b.label)) {
            return order.indexOf(a.label) - order.indexOf(b.label);
        }
        if (order.includes(a.label)) return -1;
        if (order.includes(b.label)) return 1;
        return 0;
    });

    const values = orderedDestinoSelect.map(destino => destino.value);
    const innerHTML = orderedDestinoSelect.map(destino => destino.innerHTML).join('');

    function _write(tipo, j) {
        const originalValue = getID(`${tipo}-local-${j}`).value;
        getID(`${tipo}-local-${j}`).innerHTML = innerHTML;
        getID(`${tipo}-local-box-${j}`).style.display = visibility;

        if (values.includes(originalValue)) {
            getID(`${tipo}-local-${j}`).value = originalValue;
        }
    }

    if (j) {
        _write(tipo, j);
    } else {
        const childs = _getChildIDs(`${tipo}-box`);
        for (const child of childs) {
            const j = _getJ(child);
            _write(tipo, j);
        }
    }
}

function _getDestinosLocalOrder(tipo) {
    let order = [];
    const childs = _getChildIDs(`${tipo}-box`);
    for (const child of childs) {
        const j = _getJ(child);
        const select = getID(`${tipo}-local-${j}`);
        if (select.value) {
            const label = _getCurrentSelectLabel(select);
            if (!order.includes(label)) {
                order.push(label);
            }
        }
    }
    return order;
}

function _getDestinoTitle(destinoID) {
    if (!destinoID) return '';
    for (const destino of DESTINOS) {
        if (destino.destinoID === destinoID) {
            return destino.titulo;
        }
    }
}