function _getGaleriaObject() {
	let result = {
		descricoes: [],
		categorias: [],
		imagens: [],
		titulos: [],
	};

	const childIDs = _getChildIDs("galeria-box");
	for (var i = 0; i < childIDs.length; i++) {
		const j = _getJ(childIDs[i]);

		const descricao = getID(`galeria-descricao-${j}`).value || "";
		result.descricoes.push(descricao);

		const titulo = getID(`galeria-titulo-${j}`).value || "";
		result.titulos.push(titulo);

		if (getID(`enable-upload-galeria-${j}`).checked) {
			result.imagens.push("");
			CUSTOM_UPLOADS.galeria.push({
				file: getID(`upload-galeria-${j}`)?.files[0],
				position: j,
			});
		} else {
			result.imagens.push(getID(`link-galeria-${j}`).value);
		}
	}

	return result;
}

function _deleteGaleria(i) {
	const id = `galeria-${i}`;
	_removeImageSelectorListeners(id);
	const div = getID(id);
	div.parentNode.removeChild(div);
}

// Listeners
function _loadGaleriaListeners(j) {
	// Dynamic Title
	getID(`galeria-titulo-${j}`).addEventListener(
		"change",
		() =>
			(getID(`galeria-title-${j}`).innerText = getID(
				`galeria-titulo-${j}`,
			).value),
	);

	// Validação de Link
	getID(`link-galeria-${j}`).addEventListener("change", () =>
		_validateImageLink(`link-galeria-${j}`),
	);
}

function _galeriaAdicionarListenerAction() {
	_closeAccordions("galeria");
	_addGaleria();
	_openLastAccordion("galeria");
	_buildDS("galeria-categoria");
}

async function _uploadAndSetGaleriaImages() {
	if (IMAGE_UPLOAD_STATUS.hasErrors || CUSTOM_UPLOADS.galeria.length === 0) {
		return;
	}
	const galeriaFiles = CUSTOM_UPLOADS.galeria.map((file) => file.file);
	const galeriaResult = await _uploadImages("viagens", galeriaFiles);

	if (IMAGE_UPLOAD_STATUS.hasErrors === false) {
		for (let i = 0; i < galeriaResult.length; i++) {
			const position = CUSTOM_UPLOADS.galeria[i].position - 1;
			FIRESTORE_NEW_DATA.galeria.imagens[position] = galeriaResult[i].link;
		}
	}
}
