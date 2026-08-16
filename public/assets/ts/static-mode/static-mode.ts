// ============================================================
// Static Export Mode — Runtime Seam
// ============================================================
// When `window.TRIPVIEWER_STATIC === true`, the page renders from a local
// `data.json` bundle (no Firebase SDK). This module centralizes the flag,
// config access, the local data store, and the defensive `window.firebase`
// stub that turns any unguarded Firebase call into a loud error.
//
// The stub is normally installed by the injected bootstrap `<script>` in the
// exported HTML (see the static-export implementation plan §5.1). Calling
// `installFirebaseStub()` here is a no-op in that case — it only fills the gap
// when the bootstrap is missing so verification fixtures fail loudly instead
// of with a cryptic `firebase is not defined`.

export interface StaticConfig {
	title: string;
	icon: string;
	ownerUid: string;
	dataUrl: string;
	mode: 'light' | 'complete';
}

/** The `meta` object written into the local `data.json` bundle. */
export interface StaticMeta {
	version?: number;
	type?: 'trip' | 'destination' | 'listing';
	sourceId?: string;
	title?: string;
	exportedAt?: string;
	ownerUid?: string;
	mode?: 'light' | 'complete';
	images?: Record<string, string>;
}

let staticDataStore: { meta?: StaticMeta; paths?: Record<string, any> } | null = null;

/** True when the page is a static export (flag set by the injected bootstrap). */
export function isStaticMode(): boolean {
	return typeof window !== 'undefined' && window.TRIPVIEWER_STATIC === true;
}

/** The static-export config injected by the bootstrap (safe defaults when absent). */
export function staticConfig(): StaticConfig {
	if (typeof window !== 'undefined' && window.TRIPVIEWER_STATIC_CONFIG) {
		return window.TRIPVIEWER_STATIC_CONFIG as StaticConfig;
	}
	return {
		title: '',
		icon: '',
		ownerUid: '',
		dataUrl: 'data.json',
		mode: 'light',
	};
}

/**
 * Install the defensive `window.firebase` stub.
 * No-op when a stub (or a real Firebase SDK) is already present.
 */
export function installFirebaseStub(): void {
	if (typeof window === 'undefined' || window.firebase) {
		return;
	}

	window.firebase = {
		app: function () {
			return { options: { projectId: 'static-export' } };
		},
		auth: function () {
			throw new Error('[static-export] firebase.auth() called unexpectedly');
		},
		firestore: function () {
			throw new Error('[static-export] firebase.firestore() called unexpectedly');
		},
		storage: function () {
			throw new Error('[static-export] firebase.storage() called unexpectedly');
		},
	};
}

/**
 * Load the local data bundle (fetch `dataUrl` once, cache in module).
 * Must run before any page loader reads documents.
 */
export async function loadStaticData(): Promise<void> {
	if (staticDataStore) {
		return;
	}

	installFirebaseStub();

	const config = staticConfig();
	const response = await fetch(config.dataUrl);
	if (!response.ok) {
		throw new Error(
			`[static-export] failed to load ${config.dataUrl}: ${response.status}`,
		);
	}

	staticDataStore = await response.json();
}

/**
 * Read a single document from the local bundle by its exact Firestore path.
 * Returns `undefined` when the path is not present (mirrors `get()` on a
 * missing document) — callers must not set `ERROR_FROM_GET_REQUEST` for it.
 */
export function getStaticDoc(path: string): any | undefined {
	return staticDataStore?.paths?.[path];
}

/**
 * Read a collection from the local bundle by its exact Firestore path.
 * Returns the raw map stored in `data.json` (`{ id: doc }`, or
 * `{ _settings, ...legs }` for transportation) — readers shape it.
 */
export function getStaticCollection(path: string): any {
	return staticDataStore?.paths?.[path];
}

/**
 * Metadata from the local bundle's `meta` object — the exported document's
 * identity (`type` + `sourceId`). Returns `null` when the bundle isn't loaded.
 * A static export always contains exactly one document, so pages can fall
 * back to this when the URL carries no doc id (e.g. a clean-URL redirect
 * stripped the query string).
 */
export function getStaticMeta(): StaticMeta | null {
	return staticDataStore?.meta ?? null;
}
