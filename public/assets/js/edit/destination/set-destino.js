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

function _buildDestinoCategoryObject(categoria) {
    const childIDs = _getChildIDs(`${categoria}-box`);

    let result = [];

    for (let i = 0; i < childIDs.length; i++) {
        let item = {};
        const j = _getJ(childIDs[i]);

        item.id = _getOrCreateCategoriaID(categoria, j);
        item.novo = getID(`${categoria}-novo-${j}`).checked;
        item.nome = getID(`${categoria}-nome-${j}`).value;
        item.emoji = getID(`${categoria}-emoji-${j}`).value;
        item.descricao = _getDescription(categoria, j);
        item.website = getID(`${categoria}-website-${j}`).value;
        item.instagram = getID(`${categoria}-instagram-${j}`).value;
        item.regiao = getID(`${categoria}-regiao-select-${j}`).value;
        item.mapa = getID(`${categoria}-mapa-${j}`).value;
        item.midia = getID(`${categoria}-midia-${j}`).value;
        item.nota = getID(`${categoria}-nota-${j}`).value;

        const valor = getID(`${categoria}-valor-${j}`);
        item.valor = valor.innerHTML && valor.value != 'outro' ? valor.value : getID(`${categoria}-outro-valor-${j}`).value;

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
                                throw new Error(translate('destination.errors.tiktok.not_found'))
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
    const titulo = `${translate('destination.errors.tiktok.conversion')} <i class="iconify" data-icon="mdi:instagram"></i>`;
    let conteudo = `${translate('destination.errors.tiktok.conversion_message')}<br><br>`;
    for (const categoria in unableToConvert) {
        const categoriaTitle = _firstCharToUpperCase(categoria);
        conteudo += `<strong>${categoriaTitle}:</strong><br>`;
        for (const index of unableToConvert[categoria]) {
            const item = FIRESTORE_DESTINOS_NEW_DATA[categoria][index]?.nome || `Item ${index + 1}`;
            conteudo += `${item}<br>`;
        }
    }
    _displayMessage(titulo, conteudo);
}