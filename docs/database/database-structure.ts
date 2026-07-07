// ============================================================================
// Trip Viewer — Firestore Database Structure
// ============================================================================
// This file documents the complete Firestore data model using TypeScript
// interfaces. It reflects the actual shape of documents as built by the
// edit-trip, edit-destination, and edit-listing page controllers.
//
// Naming convention:
//   - Collection names match Firestore paths (e.g. "viagens", "destinos")
//   - Document IDs use descriptive placeholders (e.g. tripId, destinationId)
//   - Optional fields (those not always present) are marked with ?
//   - Fields that are empty stubs ({}) in stripped documents are noted
// ============================================================================

// ============================================================================
// SHARED PRIMITIVES
// ============================================================================

/**
 * Custom date representation used throughout the app (not Firestore Timestamp).
 * Built by formattedDateToDateObject() in utils/dates.ts.
 */
interface DateObject {
	second: number;
	month: number; // 1-indexed (1 = January)
	hour: number;
	year: number;
	minute: number;
	day: number;
}

/** ISO-8601 timestamp stored on every updatable document */
interface VersionStamp {
	ultimaAtualizacao: string;
}

/** Color pair for light/dark theme customization */
interface ColorPair {
	ativo: boolean; // whether custom colors are enabled
	claro: string; // light-mode CSS color (e.g. "#ffffff")
	escuro: string; // dark-mode CSS color  (e.g. "#1a1a1a")
}

/**
 * Image/logo configuration for trips.
 * Built by getImagemObject() in pages/edit-trip/set-trip.ts.
 */
interface TripImageConfig {
	ativo: boolean;
	background: string; // background image URL  (link-background input)
	claro: string; // light-mode logo URL   (link-logo-light input)
	escuro: string; // dark-mode logo URL    (link-logo-dark input)
}

/**
 * Image configuration for listings.
 * Built by the global buildImagemObject() (legacy JS).
 * NOTE: has a nested background object unlike TripImageConfig.
 */
interface ListingImageConfig {
	background: {
		caminho: string; // storage path
		link: string; // public URL
		nome: string; // file name
	};
	ativo: boolean;
	escuro: string;
	altura: string; // CSS height, e.g. "200px"
	claro: string;
}

/** Links block attached to trips and listings */
interface LinksBlock {
	ativo: boolean;
	attachments: string;
	drive: string;
	maps: string;
	pdf: string;
	ppt: string;
	sheet: string;
	vacina: string;
}

/** Ownership / sharing metadata */
interface SharingInfo {
	ativo: boolean;
	dono: string; // Firebase Auth UID of the owner
	editores?: string[]; // future: editor UIDs
}

// ============================================================================
// TOP-LEVEL COLLECTION: admin
// ============================================================================

/** admin/admin */
interface AdminConfig {
	admins: string[]; // Firebase Auth UIDs
}

/** admin/permissoes */
interface AdminPermissions {
	tamanhoUploadIrrestrito: string[];
	upload: string[];
}

// ============================================================================
// TOP-LEVEL COLLECTION: config
// ============================================================================

/** config/system */
interface SystemConfig {
	registrationOpen: boolean;
}

// ============================================================================
// TOP-LEVEL COLLECTION: usuarios  (user profile / index)
// ============================================================================

/**
 * usuarios/{uid}
 *
 * Holds lightweight copies of every destination, listing, and trip the
 * user owns. These copies are kept in sync by setDocumento() →
 * setUserData() on every save.
 */
interface UsuarioDocument {
	permissoes: {
		admin: boolean;
		tamanhoUploadIrrestrito: boolean;
		upload: boolean;
	};
	nome: string;
	foto: string;
	visibilidade: string; // "light" | "dark" | "auto"

	destinos: Record<string, UsuarioDestinationRef>;
	listagens: Record<string, UsuarioListingRef>;
	viagens: Record<string, UsuarioTripRef>;
}

/**
 * Subset written by setUserData() → getSingleUserData("destinos", …).
 * Fields: moeda, titulo, versao.
 */
interface UsuarioDestinationRef extends VersionStamp {
	moeda: string;
	titulo: string;
}

/**
 * Subset written by setUserData() → getSingleUserData("listagens", …).
 * Fields: cores, descricao, imagem, subtitulo, titulo, versao.
 */
interface UsuarioListingRef extends VersionStamp {
	cores: ColorPair;
	descricao: string;
	imagem: ListingImageConfig;
	subtitulo: string;
	titulo: string;
}

/**
 * Subset written by setUserData() → getSingleUserData("viagens", …).
 * Fields: cores, fim, imagem, inicio, modulos, pin, titulo, versao.
 */
interface UsuarioTripRef extends VersionStamp {
	cores: ColorPair;
	fim: DateObject | "";
	imagem: TripImageConfig;
	inicio: DateObject | "";
	modulos: TripModules;
	pin: PinPreference;
	titulo: string;
}

// ============================================================================
// TOP-LEVEL COLLECTION: viagens  (trips)
// ============================================================================

/**
 * PIN preference that controls where data is stored.
 * Set per-save via the radio buttons in the trip editor.
 */
type PinPreference = "no-pin" | "sensitive-only" | "all-data";

/**
 * Main trip document at viagens/{tripId}.
 *
 * ### How the PIN modes affect document shape
 *
 * **"no-pin"** — everything lives in this document; no protected path exists.
 *   Built by getTripObjectFull(false).
 *
 * **"sensitive-only"** — this document holds the FULL trip BUT with
 *   `reserva` and `link` fields set to "" on every accommodation and
 *   transportation item. The actual codes live in
 *   viagens/protected/{pin}/{tripId} as a map of id→{reserva,link}.
 *   Built by getTripObjectFull(true) for the main doc +
 *   getSensitiveTripObject() for the protected doc.
 *
 * **"all-data"** — this document is a STRIPPED stub. hospedagens=[]
 *   (empty array), programacoes={}, galeria={}, links={}, modulos={},
 *   pessoas={}, transportes={claro,escuro} (only visibility flags),
 *   visibilidade={}. The FULL trip lives in
 *   viagens/protected/{pin}/{tripId}.
 *   Built by getUnprotectedTripObject() for the main doc +
 *   getTripObjectFull(false) for the protected doc.
 */
interface TripDocument {
	// ── Core ────────────────────────────────────────────────────────────
	titulo: string;
	moeda: string;
	inicio: DateObject | "";
	fim: DateObject | "";

	/** PIN preference for THIS save */
	pin: PinPreference;

	// ── Modules toggle ──────────────────────────────────────────────────
	modulos: TripModules;

	// ── Styling ─────────────────────────────────────────────────────────
	cores: ColorPair;
	imagem: TripImageConfig;

	/**
	 * Which theme(s) display transport data.
	 * When pin="all-data" in the main doc, transportes is reduced to just
	 * this visibility object (the full TransportationBlock lives in protected).
	 */
	visibilidade: TransportVisibility;

	// ── Content ─────────────────────────────────────────────────────────
	/** Array of {destinosID} references */
	destinos: DestinationRef[];

	/**
	 * Accommodation data.
	 * reserva & link are "" when the main doc is built with
	 * protectedReservationCodes=true ("sensitive-only" mode).
	 * Empty array [] when pin="all-data" (stripped stub).
	 */
	hospedagens: AccommodationItem[];

	/**
	 * Transportation data.
	 * reserva & link are "" when the main doc is built with
	 * protectedReservationCodes=true.
	 * Reduced to just TransportVisibility when pin="all-data" (stripped stub).
	 */
	transportes: TransportationBlock | TransportVisibility;

	/** Gallery — parallel arrays indexed together. {} when pin="all-data". */
	galeria: GalleryBlock;

	/** Links block. {} when pin="all-data". */
	links: LinksBlock;

	/** Full itinerary. {} when pin="all-data". */
	programacoes: ItineraryDay[];

	/** Travelers. {} when pin="all-data". */
	pessoas: Traveler[];

	// ── Metadata ────────────────────────────────────────────────────────
	compartilhamento: SharingInfo;
	versao: VersionStamp;
}

/**
 * Shape of the document at viagens/{tripId} when pin="all-data".
 * This is a drastically reduced stub — only fields needed for the
 * user profile listing and basic metadata.
 */
interface TripStrippedDocument {
	titulo: string;
	moeda: string;
	inicio: DateObject | "";
	fim: DateObject | "";
	pin: "all-data";
	modulos: Record<string, never>; // {}
	cores: ColorPair;
	imagem: TripImageConfig;
	visibilidade: Record<string, never>; // {}
	destinos: DestinationRef[];
	hospedagens: []; // empty array
	transportes: TransportVisibility; // only {claro, escuro}
	galeria: Record<string, never>; // {}
	links: Record<string, never>; // {}
	programacoes: Record<string, never>; // {}
	pessoas: Record<string, never>; // {}
	compartilhamento: SharingInfo;
	versao: VersionStamp;
}

// ── Trip sub-types ────────────────────────────────────────────────────

interface TripModules {
	hospedagens: boolean;
	destinos: boolean;
	gastos: boolean;
	programacao: boolean;
	resumo: boolean; // always true
	transportes: boolean;
	galeria: boolean;
}

interface TransportVisibility {
	claro: boolean;
	escuro: boolean;
}

interface DestinationRef {
	destinosID: string;
}

// ── Accommodation ─────────────────────────────────────────────────────

interface AccommodationItem {
	cafe: boolean; // breakfast included?
	datas: {
		checkin: DateObject;
		checkout: DateObject;
	};
	descricao: string;
	endereco: string;
	id: string; // autogenerated unique key within the trip
	imagens: AccommodationImage[];
	reserva: string; // reservation code ("" when stored unprotected)
	link: string; // reservation link  ("" when stored unprotected)
	nome: string;
}

interface AccommodationImage {
	descricao: string;
	link: string;
}

// ── Transportation ────────────────────────────────────────────────────

interface TransportationBlock {
	/** View mode: "people-view" | "leg-view" | "simple-view" */
	visualizacao: "people-view" | "leg-view" | "simple-view";
	dados: TransportationItem[];
}

interface TransportationItem {
	datas: {
		chegada: DateObject;
		partida: DateObject;
	};
	duracao: string; // e.g. "2h 30min"
	empresa: string; // company name (could be selected or custom)
	id: string; // autogenerated unique key within the trip
	idaVolta: "ida" | "volta" | "durante";
	link: string; // reservation link  ("" when stored unprotected)
	pontos: {
		chegada: string; // arrival point
		partida: string; // departure point
	};
	reserva: string; // reservation code ("" when stored unprotected)
	transporte: string; // transport type (e.g. "voo", "onibus", "carro")
	pessoa: string; // traveler name/id (only meaningful in people-view)
}

// ── Gallery ───────────────────────────────────────────────────────────

interface GalleryBlock {
	/** Descriptions for each gallery item */
	descricoes: string[];
	/** Category tags for each gallery item */
	categorias: string[];
	/** Image URLs for each gallery item */
	imagens: string[];
	/** Titles for each gallery item */
	titulos: string[];
}

// ── Itinerary / Schedule ──────────────────────────────────────────────

interface ItineraryDay {
	data: DateObject;
	destinosIDs: string[];
	titulo: ItineraryTitle;
	madrugada: InnerItineraryItem[]; // 00:00–06:00
	manha: InnerItineraryItem[]; // 06:00–12:00
	tarde: InnerItineraryItem[]; // 12:00–18:00
	noite: InnerItineraryItem[]; // 18:00–24:00
}

interface ItineraryTitle {
	valor: string;
	/** Whether the title string is an i18n key (e.g. "departure") */
	traduzir: boolean;
	/** Whether destinations should be appended to the title */
	destinos: boolean;
}

interface InnerItineraryItem {
	programacao: string; // activity description
	inicio?: string; // start time (HH:mm)
	fim?: string; // end time (HH:mm)
	pessoas?: string[]; // traveler IDs assigned
	local?: {
		// linked item (transport/accommodation/destination)
		tipo: "transporte" | "hospedagens" | "destinos";
		id: string;
	};
	destino?: {
		id: string;
		nome: string;
	};
	/** itinerary items support text replacement macros */
	[key: string]: any;
}

// ── Travelers ─────────────────────────────────────────────────────────

interface Traveler {
	id: string;
	nome: string;
}

// ============================================================================
// SUB-COLLECTION: viagens/protected/{pin}/{tripId}
// ============================================================================

/**
 * When a trip uses a PIN, sensitive data lives here.
 *
 * - "all-data" PIN:     this document is the FULL trip (TripDocument shape),
 *                       and viagens/{tripId} holds only a stripped-down copy
 *                       (basically what's shown in UsuarioTripRef).
 *
 * - "sensitive-only":   this document contains ONLY the fields that need
 *                       protection — reservation codes and links.
 */
interface TripProtectedDocument {
	/** The PIN type that governs this document */
	pin: PinPreference;

	/** Sensitive accommodation data: id → {reserva, link} */
	hospedagens?: Record<
		string,
		{
			reserva: string;
			link: string;
		}
	>;

	/** Sensitive transportation data: id → {reserva, link} */
	transportes?: Record<
		string,
		{
			reserva: string;
			link: string;
		}
	>;

	/**
	 * When pin="all-data", this document ALSO carries all the non-sensitive
	 * fields from TripDocument (destinos, galeria, programacoes, etc.).
	 * Those fields are omitted here for brevity but are structurally
	 * identical to TripDocument.
	 */
	[key: string]: any;
}

// ============================================================================
// TOP-LEVEL COLLECTION: protegiado  (PIN verification objects)
// ============================================================================

/**
 * Each document at protegiado/{tripId} stores the hashed PIN and sharing
 * info. This document is read by loadPinData() to verify the PIN before
 * serving the protected sub-collection.
 */
interface ProtectedDocument {
	/** Hashed PIN string */
	pin: string;
	/** Sharing info (kept here so it's behind the same PIN wall) */
	compartilhamento: SharingInfo;
}

// ============================================================================
// TOP-LEVEL COLLECTION: gastos  (expenses)
// ============================================================================

/**
 * Main expenses document at gastos/{tripId}  (no-PIN trips only).
 *
 * When the trip has a PIN, expenses live at
 * gastos/protected/{pin}/{tripId} instead — same shape.
 */
interface ExpensesDocument {
	compartilhamento: SharingInfo;
	/** Pre-trip expenses */
	gastosPrevios: ExpenseItem[];
	/** During-trip expenses */
	gastosDurante: ExpenseItem[];
	moeda: string;
	pessoas: Traveler[]; // snapshot of travelers at save time
	versao: VersionStamp;
}

interface ExpenseItem {
	nome: string; // expense name
	tipo: string; // category (e.g. "Alimentação", "Transporte", or custom)
	moeda: string; // currency code
	valor: number | string; // amount
	pessoa?: string; // traveler name (optional — empty for shared expenses)
}

// ============================================================================
// TOP-LEVEL COLLECTION: destinos  (destinations)
// ============================================================================

/**
 * Each destination document at destinos/{destinationId}.
 *
 * Destinations have 5 item categories, each a map of
 * {itemId → DestinationItem}.
 */
interface DestinationDocument {
	titulo: string;
	moeda: string;
	myMaps: string; // Google My Maps embed/iframe URL

	modulos: {
		restaurantes: boolean;
		mapa: boolean;
		saidas: boolean;
		turismo: boolean;
		lojas: boolean;
		lanches: boolean;
	};

	compartilhamento: SharingInfo;
	versao: VersionStamp;

	// ── Item categories ────────────────────────────────────────────────
	restaurantes: Record<string, DestinationItem>;
	lanches: Record<string, DestinationItem>;
	saidas: Record<string, DestinationItem>;
	turismo: Record<string, DestinationItem>;
	lojas: Record<string, DestinationItem>;
}

interface DestinationItem {
	novo: boolean; // "new" badge
	criadoEm: string; // ISO timestamp when the item was first created
	nome: string;
	emoji: string;
	descricao: {
		pt: string;
		en: string;
	};
	website: string;
	instagram: string;
	regiao: string; // region / neighborhood
	mapa: string; // Google Maps link
	midia: string; // TikTok / social media embed URL
	nota: string; // rating / note
	valor: string; // price indicator (e.g. "$", "$$", "$$$", or custom)
}

// ============================================================================
// TOP-LEVEL COLLECTION: listagens  (listings)
// ============================================================================

/**
 * Each listing document at listagens/{listingId}.
 * Built by buildListObject() in pages/edit-listing/edit-listing.ts.
 */
interface ListingDocument {
	compartilhamento: SharingInfo;
	cores: ColorPair;
	descricao: string;
	/** Array of {destinosID} references */
	destinos: DestinationRef[];
	imagem: ListingImageConfig;
	links: LinksBlock;
	subtitulo: string;
	titulo: string;
	versao: ListingVersionStamp;
}

interface ListingVersionStamp extends VersionStamp {
	/** Whether this listing appears on destination pages */
	exibirEmDestinos: boolean;
}

// ============================================================================
// COLLECTION OVERVIEW MAP
// ============================================================================

/**
 * Complete Firestore structure:
 *
 * ```
 * admin/
 *   admin/                 → AdminConfig
 *   permissoes/            → AdminPermissions
 *
 * config/
 *   system/                → SystemConfig
 *
 * usuarios/
 *   {uid}/                 → UsuarioDocument
 *
 * viagens/
 *   {tripId}/              → TripDocument (or TripStrippedDocument when PIN="all-data")
 *   protected/
 *     {pin}/
 *       {tripId}/          → TripProtectedDocument (full TripDocument when "all-data";
 *                            only {hospedagens,transportes,pin} when "sensitive-only")
 *
 * destinos/
 *   {destinationId}/       → DestinationDocument
 *
 * listagens/
 *   {listingId}/           → ListingDocument
 *
 * gastos/
 *   {tripId}/              → ExpensesDocument (no-PIN trips only)
 *   protected/
 *     {pin}/
 *       {tripId}/          → ExpensesDocument (PIN-protected trips)
 *
 * protegiado/
 *   {tripId}/              → ProtectedDocument
 * ```
 */

// ============================================================================
// EXPORT
// ============================================================================

export type {
	// Shared
	DateObject,
	VersionStamp,
	ColorPair,
	TripImageConfig,
	ListingImageConfig,
	LinksBlock,
	SharingInfo,
	// Admin & Config
	AdminConfig,
	AdminPermissions,
	SystemConfig,
	// Usuarios
	UsuarioDocument,
	UsuarioDestinationRef,
	UsuarioListingRef,
	UsuarioTripRef,
	// Trips
	PinPreference,
	TripDocument,
	TripStrippedDocument,
	TripModules,
	TripProtectedDocument,
	TransportVisibility,
	DestinationRef,
	AccommodationItem,
	AccommodationImage,
	TransportationBlock,
	TransportationItem,
	GalleryBlock,
	ItineraryDay,
	ItineraryTitle,
	InnerItineraryItem,
	Traveler,
	// Expenses
	ExpensesDocument,
	ExpenseItem,
	// Destinations
	DestinationDocument,
	DestinationItem,
	// Listings
	ListingDocument,
	ListingVersionStamp,
	// Protected
	ProtectedDocument,
};
