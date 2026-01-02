// Open and Close Actions
function _openFilterDrawer() {
    const title = getID('filter').innerText;

    if (_isDrawerOpen() && title === getID('drawerTitle').innerText) {
        _closeDrawer();
        return;
    }

    const innerHTML = _getFilterDrawerInnerHTML();
    const actions = {
        click: _filterDrawerOptionClickAction,
        load: _filterDrawerOptionLoadAction
    }
    _openDrawer(title, innerHTML, actions);
}

function _openSortDrawer() {
    const title = getID('order').innerText;

    if (_isDrawerOpen() && title === getID('drawerTitle').innerText) {
        _closeDrawer();
        return;
    }

    const innerHTML = _getSortDrawerInnerHTML();
    const actions = {
        click: _sortDrawerOptionClickAction,
        load: _sortDrawerOptionLoadAction
    }
    _openDrawer(title, innerHTML, actions);
}

function _openDrawer(titleText, innerHTML, actions) {
    const overlay = getID("overlay");
    const drawer = getID("drawer");
    const title = getID("drawerTitle");
    const content = getID("drawerContent");

    title.textContent = titleText;
    content.innerHTML = innerHTML;

    overlay.style.display = "block";
    drawer.getBoundingClientRect();
    drawer.classList.add("open");

    const optionButtons = content.querySelectorAll(".option-btn");
    optionButtons.forEach(button => {
        button.addEventListener("click", actions.click);
    });

    actions.load();
}

function _closeDrawer() {
    const overlay = getID("overlay");
    const drawer = getID("drawer");
    drawer.classList.remove("open");
    setTimeout(() => {
        overlay.style.display = "none";
    }, 280);
}

// Inner HTML
function _getFilterDrawerInnerHTML() {
    const titles = FILTER_OPTIONS.titles;
    const types = FILTER_OPTIONS[ACTIVE_CATEGORY];

    let result = '';
    for (const typeKey in types) {
        let optionsHTML = '';
        const options = types[typeKey];
        const optionKeys = _getSortedArray(Object.keys(options), typeKey);
        for (const optionKey of optionKeys) {
            optionsHTML += `<button class="option-btn" data-value="${optionKey}">${options[optionKey]}</button>`
        }
        result += `
        <div class="drawer-container" data-type="${typeKey}">
            <div class="drawer-title">${titles[typeKey]}</div>
            <button class="option-btn" data-value="everything">${translate('destination.filter.show_everything')}</button>
            ${optionsHTML}
        </div>
        `
    }
    return result;
}

function _getSortDrawerInnerHTML() {
    const titles = SORT_OPTIONS.titles;
    const types = SORT_OPTIONS[ACTIVE_CATEGORY];

    let result = '';
    for (const typeKey in types) {
        let optionsHTML = '';
        const options = types[typeKey];
        for (const optionKey in options) {
            optionsHTML += `<button class="option-btn" data-value="${optionKey}">${options[optionKey]}</button>`
        }
        result += `
        <div class="drawer-container" data-type="${typeKey}">
            <div class="drawer-title">${titles[typeKey]}</div>
            ${optionsHTML}
        </div>
        `
    }
    return result;
}

// Load Actions
function _filterDrawerOptionLoadAction() {
    const preferences = _getFilterPreferences();
    const content = getID("drawerContent");
    const containers = content.querySelectorAll('.drawer-container');

    for (const container of containers) {
        const type = container.getAttribute('data-type');
        const value = preferences[type];

        const buttons = container.querySelectorAll('.option-btn');
        let valueFound = false;
        for (const button of buttons) {
            if (button.getAttribute('data-value') === value) {
                valueFound = true;
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }

        if (!valueFound) {
            for (const button of buttons) {
                if (button.getAttribute('data-value') === 'everything') {
                    button.classList.add('active');
                }
            }
        }
    }
}

function _sortDrawerOptionLoadAction() {
    const preferences = _getSortPreferences();
    const content = getID("drawerContent");
    const containers = content.querySelectorAll('.drawer-container');

    const type = preferences.type;
    const value = preferences.value;

    for (const container of containers) {
        const containerType = container.getAttribute('data-type');
        const buttons = container.querySelectorAll('.option-btn');

        for (const button of buttons) {
            if (button.getAttribute('data-value') === value && containerType === type) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }
}

// Click Actions
function _filterDrawerOptionClickAction(e) {
    const container = e.currentTarget.closest('.drawer-container');
    _handleDrawerOptionClick(e, container, _setFilterPreference);
    _filter(true);
}

function _sortDrawerOptionClickAction(e) {
    const container = getID("drawerContent");
    _handleDrawerOptionClick(e, container, _setSortPreference);
    _sort(true);
}

// Helpers
function _handleDrawerOptionClick(e, container, applyPreference) {
    const target = e.currentTarget;
    target.classList.add('active');

    const buttons = container.querySelectorAll('.option-btn');
    for (const button of buttons) {
        if (button !== target) {
            button.classList.remove('active');
        }
    }

    const type = target.closest('.drawer-container').getAttribute('data-type');
    const value = target.getAttribute('data-value');

    applyPreference(type, value);
}

function _isDrawerOpen() {
    return getID("drawer").classList.contains("open");
}

function _adjustDrawer() {
    if (_isDrawerOpen()) {
        _closeDrawer();
    }
}

function _getSortedArray(arr, key) {
    if (!FILTER_SORT_KEYS_ORDER[key]) {
        return arr;
    }

    const sorted = [...arr];
    sorted.sort((a, b) => {
        const order = FILTER_SORT_KEYS_ORDER[key];
        return order.indexOf(a) - order.indexOf(b);
    });
    return sorted;
}