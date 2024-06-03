
// Funções Principais
function _loadDynamicSelect(tipo, subtipo, copy, categorias, init = false, updateLast=false) {
  const differentSizes = copy.length !== categorias.length;
  const differentValues = !copy.every((value, index) => value === categorias[index]);

  if (differentSizes || differentValues || updateLast) {
    const childs = _getChildIDs(`${tipo}-box`);
    const selectOptions = [];
  
    for (const categoria of categorias) {
      selectOptions.push(`<option value="${categoria}">${categoria}</option>`);
    }
  
    for (let i = updateLast ? childs.length : 1; i <= childs.length; i++) {
      const select = getID(`${tipo}-${subtipo}-select-${i}`);
      const input = getID(`${tipo}-${subtipo}-${i}`);
  
      const selectValue = select.value;
      const inputValue = input.value;
  
      select.innerHTML = `<option value="selecione">Selecione</option>
                          ${selectOptions}
                          <option value="outra">Outra</option>`;
  
      select.value = inputValue || selectValue || 'selecione';
  
      input.value = "";
      _loadDynamicSelectVisibility(select, input, init);
    }
  }
}

function _getUpdatedDynamicSelectArray(tipo, subtipo) {
  let categorias = [];
  const childs = _getChildIDs(`${tipo}-box`);

  for (let i = 1; i <= childs.length; i++) {
    _pushIfValidCategoria(getID(`${tipo}-${subtipo}-select-${i}`), categorias);
    _pushIfValidCategoria(getID(`${tipo}-${subtipo}-${i}`), categorias);
  }

  // Filtro para remover duplicatas
  return categorias.filter((item, index) => categorias.indexOf(item) === index).sort();
}

// Função de set
function _getDynamicSelectValue(tipo, subtipo, i) {
  const select = getID(`${tipo}-${subtipo}-select-${i}`);
  if (select && select.value && select.value !== 'selecione' && select.value !== 'outra') {
    return select.options[select.selectedIndex].text;
  } else return '';
}

// Funções de suporte (internas)
function _pushIfValidCategoria(div, categorias) {
  if (div.value && div.value !== 'selecione' && div.value !== 'outra') {
    if (!categorias.find(item => item === div.value)) {
      categorias.push(div.value);
    }
  }
}

function _loadDynamicSelectVisibility(select, input, init) {
  if (init && select.innerHTML === '') {
    select.style.display = 'none';
    input.style.display = 'block';

  } else if (init) {
    select.style.display = 'block';
    input.style.display = 'none';

  } else if (select.value === 'outra') {
    select.style.display = 'block';
    input.style.display = 'block';

  } else if (select.value === 'selecione') {
    select.style.display = 'block';
    input.style.display = 'none';

  } else {
    select.style.display = 'block';
    input.style.display = 'none';
  }
}



