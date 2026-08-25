// ======= Destination Detail Dialog =======
// Index-like dialog: clicking a card opens an overlay dialog showing the full
// entry (images + score + description/price/region/planned + links + edit).
// Cards never expand inline.
//
// Also hosts the in-place editor: `openDestinationEditor` swaps the dialog body
// for the edit form (`getEditHTML`) while keeping the media area intact.

import { getID, getDestinationTitle } from '../../../utils/dom.js';
import {
	animateDialogOpen,
	animateDialogClose,
	DIALOG_LEAVE_CLASS,
} from '../../../utils/messages.js';
import { getPlanned } from '../categories.js';
import { getDestinationID, getItem } from '../mount.js';
import { getDestinationsAccordionBodyHTML, getEditHTML } from './content.js';
import { getDialogActionsHTML } from './card-actions.js';
import { isOwner } from './card-edit.js';
import { getDialogScoreBadgeHTML } from './card.js';
import { getDialogMediaHTML, openDialogMedia, closeDialogMedia } from './card-media.js';

let OPEN_J: number | null = null;
let OPEN_ID: string | null = null;
let OPEN_ITEM: any = null;

export function getOpenJ(): number | null {
	return OPEN_J;
}
export function getOpenId(): string | null {
	return OPEN_ID;
}
export function getOpenItem(): any {
	return OPEN_ITEM;
}

/** Open the dialog in view mode for the card at index `j`. */
export function openDestinationDialog(j: number): void {
	const id = getDestinationID(j);
	const item = getItem(id);
	if (!id || !item) return;

	setOpenEntry(j, id, item);
	renderDialog({ j, id, item, mode: 'view' });
	showDialog();
}

/** Open the dialog in edit mode (used by edit() and add()). */
export function openDestinationEditor({ j, id, item }): void {
	const sameEntry = OPEN_J === j;
	setOpenEntry(j, id, item);

	if (sameEntry) {
		// Dialog already open for this entry — keep the media area, swap body.
		getID('destination-dialog-content').innerHTML = getEditHTML(j);
		const editBtn = getID('destination-dialog-edit');
		if (editBtn) editBtn.style.display = 'none';
		showDialog();
		return;
	}

	renderDialog({ j, id, item, mode: 'edit' });
	showDialog();
}

/** Re-render the dialog body back to view mode (e.g. after canceling an edit). */
export function renderDialogView(): void {
	if (OPEN_J == null || OPEN_ID == null) return;
	const j = OPEN_J;
	const id = OPEN_ID;
	const item = OPEN_ITEM;
	const planned = getPlanned(id);
	getID('destination-dialog-content').innerHTML = getDialogViewHTML({ j, id, item, planned });

	// Restore the owner-only pencil (hidden while the edit form was open).
	const editBtn = getID('destination-dialog-edit');
	if (editBtn) {
		editBtn.setAttribute('data-index', String(j));
		editBtn.style.display = isOwner() ? 'inline-flex' : 'none';
	}
}

export function closeDestinationDialog(): void {
	if (OPEN_J != null) closeDialogMedia(OPEN_J);

	const dialog = getID('destination-dialog');
	if (!dialog || dialog.style.display === 'none') {
		clearOpenEntry();
		document.body.classList.remove('dialog-open');
		return;
	}

	const card = dialog.querySelector<HTMLElement>('.dialog-card');
	const done = () => {
		document.body.classList.remove('dialog-open');
		clearOpenEntry();
	};

	if (card) {
		dialog.classList.add(DIALOG_LEAVE_CLASS);
		animateDialogClose(card, () => {
			dialog.classList.remove(DIALOG_LEAVE_CLASS);
			dialog.style.display = 'none';
			done();
		});
	} else {
		animateDialogClose(dialog, done);
	}
}

// ======= Internals =======

function setOpenEntry(j, id, item) {
	OPEN_J = j;
	OPEN_ID = id;
	OPEN_ITEM = item;
}

function clearOpenEntry() {
	OPEN_J = null;
	OPEN_ID = null;
	OPEN_ITEM = null;
}

/**
 * Return the dialog overlay, creating it if needed. The standalone
 * destination.html ships the markup statically; the view.html destination
 * lightbox mounts this component into its own container, so the dialog is
 * created on demand there (styles live in components/dialog.css + destination.css).
 */
function ensureDialog(): HTMLElement {
	const existing = getID('destination-dialog');
	if (existing) return existing;

	const dialog = document.createElement('div');
	dialog.id = 'destination-dialog';
	dialog.className = 'dialog-overlay';
	dialog.style.display = 'none';
	dialog.innerHTML = `
        <div class="dialog-card destination-dialog-card">
          <div class="dialog-media" id="destination-dialog-media"></div>
          <a class="dialog-close" data-action="close-destination-dialog">
            <i class="iconify" data-icon="material-symbols:close"></i>
          </a>
          <div class="dialog-body">
            <div class="dialog-header">
              <div class="dialog-title-row">
                <h2 class="dialog-title" id="destination-dialog-title"></h2>
                <button class="dialog-edit-btn" id="destination-dialog-edit" data-action="edit-destination" style="display:none">
                  <i class="iconify" data-icon="tabler:edit"></i>
                </button>
              </div>
              <span class="dialog-score-badge" id="destination-dialog-score" style="display:none"></span>
            </div>
            <div id="destination-dialog-content"></div>
          </div>
        </div>`;
	document.body.appendChild(dialog);
	return dialog;
}

function renderDialog({ j, id, item, mode }) {
	ensureDialog();

	getID('destination-dialog-media').innerHTML = getDialogMediaHTML(item, j);
	getID('destination-dialog-title').textContent = getDestinationTitle(item);

	const score = getDialogScoreBadgeHTML(item);
	const scoreEl = getID('destination-dialog-score');
	scoreEl.style.display = score ? 'inline-flex' : 'none';
	scoreEl.innerHTML = score;

	// Owner-only pencil edit button, right after the title.
	const editBtn = getID('destination-dialog-edit');
	if (editBtn) {
		editBtn.setAttribute('data-index', String(j));
		editBtn.style.display = mode === 'view' && isOwner() ? 'inline-flex' : 'none';
	}

	const content = getID('destination-dialog-content');
	if (mode === 'edit') {
		content.innerHTML = getEditHTML(j);
	} else {
		const planned = getPlanned(id);
		content.innerHTML = getDialogViewHTML({ j, id, item, planned });
	}
}

function getDialogViewHTML({ j, id, item, planned }) {
	return `
        ${getDestinationsAccordionBodyHTML({ j, item, planned, editBtn: false, values: undefined as any, currency: undefined as any })}
        ${getDialogActionsHTML(item)}`;
}

function showDialog(): void {
	const dialog = ensureDialog();
	const wasOpen = dialog.style.display === 'flex';

	animateDialogOpen(dialog, 'flex');
	const card = dialog.querySelector<HTMLElement>('.dialog-card');
	if (card) animateDialogOpen(card);
	document.body.classList.add('dialog-open');

	if (!wasOpen && OPEN_J != null) openDialogMedia(OPEN_J);
}

// ======= Overlay click + Escape to close =======

document.addEventListener('click', function (e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (target.classList.contains('dialog-overlay') && target.id === 'destination-dialog') {
		closeDestinationDialog();
	}
});

document.addEventListener('keydown', function (e) {
	const dialog = getID('destination-dialog');
	if (e.key === 'Escape' && dialog && dialog.style.display === 'flex') {
		closeDestinationDialog();
	}
});
