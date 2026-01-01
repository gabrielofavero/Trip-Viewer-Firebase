
function _getFilterInnerHTML() {
    const titles = FILTER_OPTIONS.titles;
    const types = FILTER_OPTIONS[DESTINO.activeCategory];

    let result = '';
    for (const typeKey in types) {
        let optionsHTML = '';
        const options = types[typeKey];
        const optionKeys = _getSortedArray(Object.keys(options), typeKey);
        for (const optionKey of optionKeys) {
            optionsHTML += `<button class="option-btn" data-value="${optionKey}">${options[optionKey]}</button>`
        }
        result += `
        <div class="drawer-container" id="drawer-${typeKey}">
            <div class="drawer-title">${titles[typeKey]}</div>
            <button class="option-btn" data-value="everything">${DESTINO.translations.filter.show_everything}</button>
            ${optionsHTML}
        </div>
        `
    }
    return result;
}

function _getSortInnerHTML() {
    const titles = SORTING_OPTIONS.titles;
    const types = SORTING_OPTIONS[DESTINO.activeCategory];

    let result = '';
    for (const typeKey in types) {
        let optionsHTML = '';
        const options = types[typeKey];
        for (const optionKey in options) {
            optionsHTML += `<button class="option-btn" data-value="${optionKey}">${options[optionKey]}</button>`
        }
        result += `
        <div class="drawer-container" id="drawer-${typeKey}">
            <div class="drawer-title">${titles[typeKey]}</div>
            ${optionsHTML}
        </div>
        `
    }
    return result;
}