function _exportPTtranslations() {
    const result = {};
    const input = FIRESTORE_DESTINOS_DATA;

    for (const key in input) {
        if (Array.isArray(input[key])) {
            result[key] = input[key].map(item => item?.descricao?.pt);
        }
    }

    console.log(result);
}

function _importPTtranslations(input, lang = 'en') {
    const keys = ['lanches', 'lojas', 'restaurantes', 'saidas', 'turismo']

    for (const key of keys) {
        for (let i = 0; i < FIRESTORE_DESTINOS_DATA[key].length; i++) {
            const item = FIRESTORE_DESTINOS_DATA[key][i];
            const descricao = item.descricao || {};
            descricao[lang] = input[key][i];
            item.descricao = descricao;
        }
    }
}