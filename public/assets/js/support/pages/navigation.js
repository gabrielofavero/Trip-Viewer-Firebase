export function goHomeFromEditDocumentPage() {
    window.location = '../index.html';
  }

export function reeditEditDocumentPage() {
    _closeModal('delete-modal');
}

export function openLinkInNewTab(url) {
  if (url) {
    var win = window.open(url, '_blank');
    win.focus();
  }
}