let CLOSE_DROPDOWN = false;

function _loadDropdown() {
    _buildDropdownOptions();
    const dropdown = document.getElementById('custom-select-dropdown');
    const chevron = document.getElementById('destination-chevron');

    document.querySelector('.destinos-select-container').addEventListener('click', function (e) {
        e.stopPropagation();
        if (CLOSE_DROPDOWN) {
            CLOSE_DROPDOWN = false;
            return;
        }
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
        chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    dropdown.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', function (e) {
            const value = this.getAttribute('data-value');
            _closeDropdown();
            CLOSE_DROPDOWN = true;
            _loadDropdownAction(value);
        });
    });

    document.addEventListener('click', function (e) {
        _closeDropdown();
    });
}

function _buildDropdownOptions() {
    const dropdown = document.getElementById('custom-select-dropdown');
    let result = '';
    for (const categoryKey in DESTINO) {
        if (categoryKey == 'activeCategory') continue;
        result += `<div class="custom-select-option" data-value="${categoryKey}">${DESTINO[categoryKey].titulo}</div>`;
    }
    dropdown.innerHTML = result;
}

function _closeDropdown() {
    const dropdown = document.getElementById('custom-select-dropdown');
    const chevron = document.getElementById('destination-chevron');
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        chevron.style.transform = 'rotate(180deg)';
    }
}

function _loadDropdownAction(value) {
    const titulo = DESTINO[value].titulo;
    document.title = titulo;
    getID('titulo-destinos').innerText = titulo;
    _loadDestinoByType(value);
}