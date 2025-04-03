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
        if (!toUpdate && midias.length > 0 && midias.some(midia => midia.includes('https://vm.tiktok.com/'))) {
            toUpdate = true;
        }
        urls[categoria] = midias;
    }
    if (toUpdate) {
        const data = {};
        const unableToConvert = {};
        try {
            for (const key of urls) {
                const newURLs = {};
                for (let i = 0; i < urls[key].length; i++) {
                    const url = urls[key][i];
                    let newURL = url;
                    if (shortUrl.startsWith('https://vm.tiktok.com/')) {
                        try {
                            const response = await fetch(`https://www.tiktok.com/oembed?url=${url}`, { method: 'GET' });
                            const innerData = await response.json();
                            if (innerData.author_unique_id && innerData.embed_product_id) {
                                newURL = `https://www.tiktok.com/@${innerData.author_unique_id}/video/${innerData.embed_product_id}`;
                            } else {
                                throw new Error('Não foi possível encontrar o link do TikTok')
                            }
                        } catch (error) {
                            unableToConvert[key] = unableToConvert[key] || [];
                            unableToConvert[key].push(i);
                        }

                    }
                    newURLs.push(newURL);
                }

                data[key] = newURLs;
            }
            if (Object.keys(unableToConvert).length > 0) {
                _displayTikTokError(unableToConvert)
            } else {
                for (const categoria of CONFIG.destinos.categorias.passeios) {
                    for (let i = 0; i < FIRESTORE_DESTINOS_NEW_DATA[categoria].length; i++) {
                        FIRESTORE_DESTINOS_NEW_DATA[categoria][i].midia = data[categoria][i];
                    }
                }
            }

        } catch (error) {
            _displayError(error);
            console.error(error);
        }
    }
}

function _displayTikTokError(unableToConvert) {
    const titulo = 'Erro ao converter links do TikTok <i class="iconify" data-icon="mdi:instagram"></i>';
    let conteudo = `Os seguintes links deverão ser removidos ou trocados pela versão desktop:<br><br>`;
    for (const categoria in unableToConvert) {
        const categoriaTitle = CONFIG.destinos.destinos[categoria]?.titulo || _firstCharToUpperCase(categoria);
        conteudo += `<strong>${categoriaTitle}:</strong><br>`;
        for (const index of unableToConvert[categoria]) {
            const item = FIRESTORE_DESTINOS_NEW_DATA[categoria][index]?.nome || `Item ${index + 1}`;
            conteudo += `${item}<br>`;
        }
    }
    _displayMessage(titulo, conteudo);
}