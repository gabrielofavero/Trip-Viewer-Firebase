async function _loadEditDestination() {
    const uid = await _getUID();
    if (FIRESTORE_DESTINOS_DATA.compartilhamento.dono != uid) {
        return;
    }

    for (const container of document.querySelectorAll('.edit-container')) {
        container.style.display = '';
    }
}