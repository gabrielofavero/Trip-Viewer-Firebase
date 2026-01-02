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

    let result = {};

    for (let i = 0; i < childIDs.length; i++) {
        const item = {};
        const j = _getJ(childIDs[i]);

        const id = _getOrCreateCategoriaID(categoria, j);
        item.novo = getID(`${categoria}-novo-${j}`).checked;
        item.criadoEm = getID(`${categoria}-criadoEm-${j}`).value;
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

        result[id] = item;
    }

    return result;
}

async function _updateTikTokLinks() {
    let toUpdate = false;
    const urls = {};

    for (const categoria of CONFIG.destinos.categorias.passeios) {
        const entries = Object.entries(FIRESTORE_DESTINOS_NEW_DATA[categoria]);
        const midias = entries.map(([id, item]) => ({
            id,
            midia: item.midia
        }));

        if (!toUpdate &&
            midias.length > 0 &&
            midias.some(m => m.midia && _isMobileLink(m.midia))) {
            toUpdate = true;
        }

        urls[categoria] = midias;
    }

    if (!toUpdate) return;

    const data = {};
    const unableToConvert = {};

    const CONCURRENCY = 5;
    async function runPool(tasks) {
        const results = [];
        const pool = [];

        for (const task of tasks) {
            const p = task().then(r => results.push(r));
            pool.push(p);

            if (pool.length >= CONCURRENCY) {
                await Promise.race(pool);
                for (let i = pool.length - 1; i >= 0; i--) {
                    if (pool[i].status === 'fulfilled' || pool[i].status === 'rejected') {
                        pool.splice(i, 1);
                    }
                }
            }
        }

        await Promise.allSettled(pool);
        return results;
    }

    try {
        for (const categoria of Object.keys(urls)) {
            const newURLs = {};
            const tasks = [];

            for (const { id, midia } of urls[categoria]) {
                tasks.push(async () => {
                    let newURL = midia;

                    if (midia && _isMobileLink(midia)) {
                        try {
                            const res = await fetch(
                                `https://www.tiktok.com/oembed?url=${midia}`,
                                { method: 'GET' }
                            );

                            const innerData = await res.json();

                            if (innerData.author_unique_id && innerData.embed_product_id) {
                                newURL =
                                    `https://www.tiktok.com/@${innerData.author_unique_id}/video/${innerData.embed_product_id}`;
                            } else {
                                throw new Error('TikTok embed not found');
                            }

                        } catch (err) {
                            unableToConvert[categoria] = unableToConvert[categoria] || [];
                            unableToConvert[categoria].push(id);
                        }
                    }

                    newURLs[id] = newURL;
                });
            }
            await runPool(tasks);

            data[categoria] = newURLs;
        }

        if (Object.keys(unableToConvert).length > 0) {
            _displayTikTokError(unableToConvert);
            return;
        }

        for (const categoria of CONFIG.destinos.categorias.passeios) {
            for (const [id, item] of Object.entries(FIRESTORE_DESTINOS_NEW_DATA[categoria])) {
                if (data[categoria][id]) {
                    item.midia = data[categoria][id];
                }
            }
        }

    } catch (error) {
        _displayError(error);
        console.error(error);
    }

    function _isMobileLink(link) {
        return link.startsWith('https://vm.tiktok.com/') || link.startsWith('https://vt.tiktok.com/')
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
}