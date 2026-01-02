async function _loadEditDestination() {
    const uid = await _getUID();
    if (DESTINO.owner != uid) {
        return;
    }

    for (const container of document.querySelectorAll('.edit-container')) {
        container.style.display = '';
    }
}