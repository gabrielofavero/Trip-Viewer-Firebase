let FIRESTORE_DESTINOS_NEW_DATA = {};

async function _buildDestinosObject() {
    FIRESTORE_DESTINOS_NEW_DATA = {
        lanches: _buildDestinoCategoryObject("lanches"),
        lojas: _buildDestinoCategoryObject("lojas"),
        restaurantes: _buildDestinoCategoryObject("restaurantes"),
        saidas: _buildDestinoCategoryObject("saidas"),
        turismo: _buildDestinoCategoryObject("turismo"),
        titulo: getID(`titulo`).value,
        moeda: getID(`moeda`).value == "outra" ? getID(`outra-moeda`).value : getID(`moeda`).value,
        myMaps: getID(`mapa-link`).value,
        modulos: {
            lanches: getID(`habilitado-lanches`).checked,
            lojas: getID(`habilitado-lojas`).checked,
            mapa: getID(`habilitado-mapa`).checked,
            restaurantes: getID(`habilitado-restaurantes`).checked,
            saidas: getID(`habilitado-saidas`).checked,
            turismo: getID(`habilitado-turismo`).checked
        },
        compartilhamento: {
            ativo: true,
            dono: FIRESTORE_DESTINOS_DATA?.compartilhamento?.dono || await _getUID()
        },
        versao: {
            ultimaAtualizacao: new Date().toISOString()
        }
    }
}

function _buildDestinoCategoryObject(tipo) {
    const childIDs = _getChildIDs(`${tipo}-box`);

    let result = [];

    for (let i = 0; i < childIDs.length; i++) {
        let item = {};
        const j = _getJ(childIDs[i]);

        item.id = _getOrCreateCategoriaID(tipo, j);
        item.novo = getID(`${tipo}-novo-${j}`).checked;
        item.nome = getID(`${tipo}-nome-${j}`).value;
        item.emoji = getID(`${tipo}-emoji-${j}`).value;
        item.descricao = getID(`${tipo}-descricao-${j}`).value;
        item.website = getID(`${tipo}-website-${j}`).value;
        item.instagram = getID(`${tipo}-instagram-${j}`).value;
        item.regiao = getID(`${tipo}-regiao-select-${j}`).value;
        item.mapa = getID(`${tipo}-mapa-${j}`).value;
        item.midia = getID(`${tipo}-midia-${j}`).value;
        item.nota = getID(`${tipo}-nota-${j}`).value;

        const valor = getID(`${tipo}-valor-${j}`);
        item.valor = valor.innerHTML && valor.value != 'outro' ? valor.value : getID(`${tipo}-outro-valor-${j}`).value;

        result.push(item);
    }

    return result;
}

async function _updateTikTokLinks() {
    let toUpdate = false;
    const urls = {};
    for (const categoria of CONFIG.destinos.categorias.passeios) {
        const midias = FIRESTORE_DESTINOS_NEW_DATA[categoria].map(item => item.midia)
        if (midias.length > 0 && midias.some(midia => midia.includes('https://vm.tiktok.com/'))) {
            toUpdate = true;
        }
        urls[categoria] = midias;
    }
    if (toUpdate) {
        try {
            const response = await _cloudFunction('convertTikTokLinks', { urls });
            const data = response.urls;
            for (const categoria of CONFIG.destinos.categorias.passeios) {
                for (let i = 0; i < FIRESTORE_DESTINOS_NEW_DATA[categoria].length; i++) {
                    FIRESTORE_DESTINOS_NEW_DATA[categoria][i].midia = data[categoria][i];
                }
            }
        } catch (error) {
            _displayError(error);
            console.error(error);
        }
    }
}