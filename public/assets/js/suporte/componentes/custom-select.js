let CUSTOM_SELECTS = {};

function _loadCloseCustomSelectListeners() {
  document.addEventListener('click', function (e) {
    _closeCustomSelects();
  });
}

function _loadCustomSelect({ id, options = [], activeOption, action }) {
  CUSTOM_SELECTS[id] = { options, activeOption, action, onAction: false };
  const customSelect = getID(id);
  customSelect.innerHTML = _getCustomSelectHTML(id);
  _hideActiveOption(id);
  const label = options.find(option => option.value === activeOption)?.label || options[0].label;
  customSelect.querySelector('.title').innerText = label;
  action(activeOption);
  _loadCustomSelectListeners(id);
}

function _getCustomSelectHTML(id) {
  let optionsHTML = '';
  for (const option of CUSTOM_SELECTS[id].options) {
    optionsHTML += `<div class="option" data-value="${option.value}">${option.label}</div>`;
  }
  return `
  <div class="container">
    <div class="title">${CUSTOM_SELECTS[id].options[0].label}</div>
      <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="2" d="M17.5 14.5L12 9l-5.5 5.5">
        </path>
      </svg>
      <div class="dropdown" style="display:none;">
        ${optionsHTML}
    </div>
  </div>`
}

function _loadCustomSelectListeners(id) {
  const customSelect = getID(id);
  const container = customSelect.querySelector('.container');
  const dropdown = customSelect.querySelector('.dropdown');

  container.addEventListener('click', function (e) {
    e.stopPropagation();
    if (CUSTOM_SELECTS[id].onAction) {
      CUSTOM_SELECTS[id].onAction = false;
      return;
    }
    if (dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
      customSelect.classList.remove('opened');
    } else {
      dropdown.style.display = 'block';
      customSelect.classList.add('opened');
    }
  });

  customSelect.querySelectorAll('.option').forEach(option => {
    option.addEventListener('click', function (e) {
      _closeCustomSelects();
      _loadCustomSelectAction(id, this.getAttribute('data-value'), this.innerText);
    });
  });
}

function _closeCustomSelects() {
  for (const id in CUSTOM_SELECTS) {
    _closeCustomSelect(id);
  }
}

function _closeCustomSelect(id) {
  const customSelect = getID(id);
  const dropdown = customSelect.querySelector('.dropdown');
  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
    customSelect.classList.remove('opened');
  }
}

function _loadCustomSelectAction(id, value, label) {
  CUSTOM_SELECTS[id].onAction = true;
  CUSTOM_SELECTS[id].activeOption = value;
  getID(id).querySelector('.title').innerText = label;
  CUSTOM_SELECTS[id].action(value);
  _hideActiveOption(id);
}

function _hideActiveOption(id) {
  const customSelect = getID(id);
  customSelect.querySelectorAll('.option').forEach(option => {
    if (option.getAttribute('data-value') === CUSTOM_SELECTS[id].activeOption) {
      option.style.display = 'none';
    } else {
      option.style.display = 'flex';
    }
  });
}

function _getCustomSelectActiveOption(id) {
  return CUSTOM_SELECTS[id]?.activeOption || null;
}