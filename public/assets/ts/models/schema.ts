// ======= New English Schema — TypeScript Interfaces =======
// Source of truth for the Option B database schema.
// All interfaces use English field names with JSDoc annotations
// referencing the old Portuguese field names for traceability.
//
// References:
// - docs/proposals/20260614-new-database-proposal.md (Option B — Optimized Redesign)
// - docs/analysis/20260613-firestore-auth-intensity.md

// ============================================================
// Primitives
// ============================================================

/** A Firestore-stored date object (was "inicio" / "fim" / "data" / "datas" shape) */
export interface DateObject {
	day: number;
	month: number;
	year: number;
	hour: number;
	minute: number;
	second: number;
}

// ============================================================
// String literal union types (enum replacements)
// ============================================================

export type CollectionName =
	| 'users'
	| 'trips'
	| 'destinations'
	| 'listings'
	| 'expenses'
	| 'protected'
	| 'config';

/** was "voo" | "onibus" | "carro" */
export type TransportType = 'flight' | 'bus' | 'car' | 'bullet_train' | string;

/** was "ida" | "volta" | "durante" */
export type Direction = 'departure' | 'return' | 'during';

/** was "simple-view" | "leg-view" */
export type TransportViewMode = 'simple' | 'leg';

/** was "sensitive-only" | "no-pin" (already English in data) */
export type PinType = 'sensitive-only' | 'no-pin';

/** was "claro" | "escuro" | "ativo" */
export type ThemeMode = 'light' | 'dark' | 'active';

/** was "destinos" | "transporte" | "hospedagens" — can be empty string when no item is linked */
export type ItineraryItemType = 'destination' | 'transportation' | 'accommodation' | '';

/** was "madrugada" | "manha" | "tarde" | "noite" */
export type ItineraryPeriod = 'earlyMorning' | 'morning' | 'afternoon' | 'night';

/** was "restaurantes" | "lanches" | "lojas" | "saidas" | "turismo" */
export type DestinationCategory = 'restaurants' | 'snacks' | 'shopping' | 'nightlife' | 'tourism';

// ============================================================
// Core Entities
// ============================================================

/** A traveler/person on a trip.  was "pessoas[i]" */
export interface Traveler {
	id: string /** was "id" */;
	name: string /** was "nome" */;
}

// -----------------------------------------------------------
// Trip — Document at trips/{id}  (was "viagens/{id}")
// -----------------------------------------------------------

/** was "viagens/{id}" */
export interface Trip {
	/** was "titulo" */
	title: string;
	/** was "inicio" */
	start: DateObject;
	/** was "fim" */
	end: DateObject;
	/** was "moeda" */
	currency: string;
	/** was "pin" */
	pin: PinType;

	/** was "versao" */
	version: TripVersion;
	/** was "visibilidade" */
	visibility: TripVisibility;
	/** was "cores" */
	colors: TripColors;
	/** was "compartilhamento" */
	sharing: TripSharing;
	/** was "modulos" */
	modules: TripModules;

	/** was "pessoas" */
	travelers: Traveler[];

	/** was "links" */
	links: TripLinks;
	/** was "galeria" */
	gallery: TripGallery;

	/** was "destinos" — now slim references only */
	destinationRefs: DestinationRef[];

	/** Header/hero image configuration */
	image?: TripImage;
}

/** was "versao" */
export interface TripVersion {
	/** was "ultimaAtualizacao" */
	lastUpdated: string;
}

/** was "visibilidade" */
export interface TripVisibility {
	/** was "claro" */
	light: boolean;
	/** was "escuro" */
	dark: boolean;
}

/** was "cores" */
export interface TripColors {
	/** was "claro" */
	light: string;
	/** was "escuro" */
	dark: string;
	/** was "ativo" */
	active: boolean;
}

/** was "compartilhamento" */
export interface TripSharing {
	/** was "dono" */
	owner: string;
	/** was "ativo" */
	active: boolean;
	/** was "editores" */
	editors: string[];
}

/** was "modulos" */
export interface TripModules {
	/** was "destinos" */
	destinations: boolean;
	/** was "transportes" */
	transportation: boolean;
	/** was "programacao" */
	itinerary: boolean;
	/** was "galeria" */
	gallery: boolean;
	/** was "resumo" */
	summary: boolean;
	/** was "hospedagens" */
	accommodations: boolean;
	/** was "gastos" */
	expenses: boolean;
	/** Legacy — music festival lineup toggle (not actively used) */
	lineup?: boolean;
}

/** was "links" */
export interface TripLinks {
	maps: string;
	attachments: string;
	/** was "ativo" */
	active: boolean;
	drive: string;
	pdf: string;
	ppt: string;
	sheet: string;
	/** was "vacina" */
	vaccine: string;
}

/** was "galeria" */
export interface TripGallery {
	/** was "categorias" */
	categories: string[];
	/** was "descricoes" */
	descriptions: string[];
	/** was "imagens" */
	images: string[];
	/** was "titulos" */
	titles: string[];
}

/** was "destinos[i].destinosID" — enriched with denormalized destination metadata */
export interface DestinationRef {
	id: string;
	/**
	 * Cached destination title (denormalized on trip save + migration 18) so
	 * view.html can render the destinations section without fetching the doc.
	 */
	title?: string;
	/** Cached destination hero image (denormalized). */
	image?: DestinationImage;
	/**
	 * Cached per-category "has entries" booleans (denormalized). Drives which
	 * category boxes appear in view.html's destinationsBox.
	 */
	categories?: DestinationCategories;
	/** Cached destination version (denormalized). */
	version?: DestinationVersion;
}

/** Per-category "has entries" flags cached on trip docs (trips/{id}.destinationRefs[i]) */
export interface DestinationCategories {
	restaurants: boolean;
	snacks: boolean;
	nightlife: boolean;
	tourism: boolean;
	shopping: boolean;
}

/** Destination hero image (was "imagem") — background only */
export interface DestinationImage {
	background: string;
	active: boolean;
}

/** Header/hero image — top-level trip field (was "imagem") */
export interface TripImage {
	/** Dark-theme image URL */
	dark: string;
	/** Light-theme image URL */
	light: string;
	/** Fallback/background image URL */
	background: string;
	/** Whether the image section is active */
	active: boolean;
}

// -----------------------------------------------------------
// Accommodation — Subcollection: trips/{tripId}/accommodations/{id}
// was "hospedagens[i]" embedded in trip doc
// -----------------------------------------------------------

/** was "hospedagens[i]" */
export interface Accommodation {
	/** was "nome" */
	name: string;
	/** was "descricao" */
	description: string;
	/** was "endereco" */
	address: string;
	/** was "datas" */
	dates: AccommodationDates;
	/** was "cafe" */
	breakfast: boolean;
	/** was "imagens" */
	images: AccommodationImage[];
	/** was "reserva" — empty in public, filled in protected */
	reservation: string;
	/** empty in public, filled in protected */
	link: string;
}

/** was "datas" */
export interface AccommodationDates {
	/** was "checkin" */
	checkIn: DateObject;
	/** was "checkout" */
	checkOut: DateObject;
}

/** was "imagens[i]" */
export interface AccommodationImage {
	/** was "descricao" */
	description: string;
	link: string;
}

// -----------------------------------------------------------
// Transportation — Subcollection: trips/{tripId}/transportation/{id}
// was "transportes.dados[i]" embedded in trip doc
// -----------------------------------------------------------

/** was "transportes.dados[i]" */
export interface TransportLeg {
	/** was "transporte" (voo|onibus|carro) */
	type: TransportType;
	/** was "empresa" */
	company: string;
	/** was "pontos" */
	points: TransportPoints;
	/** was "datas" */
	dates: TransportDates;
	/** was "duracao" */
	duration: string;
	/** was "idaVolta" */
	direction: Direction;
	/** was "reserva" */
	reservation: string;
	link: string;
	/** was "pessoa" */
	person: string;
}

/** was "pontos" */
export interface TransportPoints {
	/** was "partida" (origin point name) */
	origin: string;
	/** was "chegada" (destination point name) */
	destination: string;
}

/** was "datas" */
export interface TransportDates {
	/** was "partida" (departure date) */
	departure: DateObject;
	/** was "chegada" (arrival date) */
	arrival: DateObject;
}

/** was "transportes.visualizacao" — stored at trips/{tripId}/transportation/_settings */
export interface TransportSettings {
	/** was "visualizacao" */
	viewMode: TransportViewMode;
}

// -----------------------------------------------------------
// Itinerary — Subcollection: trips/{tripId}/itinerary/{dayId}
// was "programacoes[i]" embedded in trip doc
// -----------------------------------------------------------

/** was "programacoes[i]" */
export interface ItineraryDay {
	/** was "titulo" */
	title: ItineraryTitle;
	/** was "data" */
	date: DateObject;
	/** was "destinosIDs" — can be plain string IDs or objects with id+title */
	destinationIds: (string | { id: string; title: string })[];
	/** was "madrugada" */
	earlyMorning: PeriodItem[];
	/** was "manha" */
	morning: PeriodItem[];
	/** was "tarde" */
	afternoon: PeriodItem[];
	/** was "noite" */
	night: PeriodItem[];
}

/** was "programacoes[i].titulo" */
export interface ItineraryTitle {
	/** was "valor" */
	value: string;
	/** was "destinos" */
	showDestinations: boolean;
	/** was "traduzir" */
	translate: boolean;
}

/** was itinerary entry within a period (madrugada/manha/tarde/noite) */
export interface PeriodItem {
	/** was "programacao" */
	label: string;
	/** was "inicio" — HH:mm format */
	start: string;
	/** was "fim" — HH:mm format */
	end: string;
	/** was "pessoas" */
	travelers: PeriodTraveler[];
	/** was "item" */
	item: ItineraryItemRef;
}

/** was "pessoas[i]" inside an itinerary entry */
export interface PeriodTraveler {
	id: string;
	/** was "nome" */
	name: string;
	isPresent: boolean;
}

/** was "item" */
export interface ItineraryItemRef {
	/** was "tipo" (destinos|transporte|hospedagens) */
	type: ItineraryItemType;
	id: string;
	/** was "categoria" */
	category: string;
	/** was "local" */
	location: string;
}

// -----------------------------------------------------------
// Destination — Document at destinations/{id}  (was "destinos/{id}")
// -----------------------------------------------------------

/** was "destinos/{id}" */
export interface Destination {
	/** was "titulo" */
	title: string;
	/** was "moeda" */
	currency: string;
	/** was "versao" */
	version: DestinationVersion;
	/** was "compartilhamento" */
	sharing: DestinationSharing;
	/** was "modulos" */
	modules: DestinationModules;
	myMaps: string;

	/** Hero image (was "imagem") — may be absent in legacy docs */
	image?: DestinationImage;

	/** was "restaurantes" — object keyed by random ID */
	restaurants: Record<string, PlaceItem>;
	/** was "lanches" */
	snacks: Record<string, PlaceItem>;
	/** was "lojas" → "shopping" */
	shopping: Record<string, PlaceItem>;
	/** was "saidas" */
	nightlife: Record<string, PlaceItem>;
	/** was "turismo" → "tourism" */
	tourism: Record<string, PlaceItem>;
}

/** was "versao" */
export interface DestinationVersion {
	/** was "ultimaAtualizacao" */
	lastUpdated: string;
}

/** was "compartilhamento" */
export interface DestinationSharing {
	/** was "dono" */
	owner: string;
	/** was "ativo" */
	active: boolean;
}

/** was "modulos" in destination */
export interface DestinationModules {
	/** was "saidas" */
	nightlife: boolean;
	/** was "restaurantes" */
	restaurants: boolean;
	/** was "lojas" → "shopping" */
	shopping: boolean;
	/** was "turismo" → "tourism" */
	tourism: boolean;
	/** was "lanches" */
	snacks: boolean;
	/** was "mapa" */
	map: boolean;
}

// -----------------------------------------------------------
// PlaceItem — An item within a destination category
// was fields within restaurantes[id] / lanches[id] / etc.
// -----------------------------------------------------------

/** A single place/venue within a destination category */
export interface PlaceItem {
	/** was "nome" */
	name: string;
	/** was "descricao" */
	description: PlaceDescription;
	/** was "nota" */
	rating: string;
	/** was "valor" */
	price: string;
	/** was "mapa" */
	map: string;
	website: string;
	/**
	 * was "regiao" (string) — one or more neighborhoods/areas within the
	 * destination (e.g. ["Ipanema", "Botafogo"]). Migration 19 converted the
	 * legacy single `region` string into this array.
	 */
	regions: string[];
	instagram: string;
	/** was "novo" */
	isNew: boolean;
	/** was "criadoEm" */
	createdAt: string;
	/** was "midia" */
	media: string;
	emoji: string;
	/** was "imagens" — images attached to this place/venue */
	images: PlaceImage[];
	/** Normalized Places API data (migration 17) — may be absent on pre-Aug-2026 entries */
	placeAPI?: PlaceAPI;
}

/** An image attached to a destination place/venue (was "imagens[i]" on PlaceItem) */
export interface PlaceImage {
	/** Image caption */
	description: string;
	/** Image URL */
	link: string;
}

/** was "descricao" on PlaceItem */
export interface PlaceDescription {
	pt: string;
	en: string;
}

// -----------------------------------------------------------
// PlaceAPI — normalized Places API data on a destination entry
// (added by migration 17 — see docs/database/destination-document-structure.md)
// -----------------------------------------------------------

/**
 * Normalized Google Places API data stored on a destination entry.
 * Subset of scripts/export-maps-data/export-maps-data.py output (omits the
 * app-managed media/isNew and uses `updatedAt` instead of the script's
 * `createdAt`). May be absent on entries created before August 2026 — always
 * guard with optional chaining (e.g. `entry.placeAPI?.id`).
 */
export interface PlaceAPI {
	/** Neighborhood/area (e.g. "Ipanema", "Botafogo"). */
	region: string;
	/** Display name. */
	name: string;
	/** Official website URL, or empty string. */
	website: string;
	/** Numeric rating as string: "1"–"5", or empty string. */
	rating: string;
	/** Price indicator: "$" | "$$" | "$$$" | "$$$$" | "-" | "default". */
	price: string;
	/** Multi-language description — only the requested language is written on apply. */
	description: PlaceDescription;
	/** Emoji icon. */
	emoji: string;
	/** Google Maps URL. */
	map: string;
	/** ISO 8601 timestamp of the last Places API sync. */
	updatedAt: string;
	/** Instagram profile URL, or empty string. */
	instagram: string;
	/** Google Place ID used for Places API lookups, or empty string. */
	id: string;
	/**
	 * Canonical Google Maps link used to re-scrape this place locally (gmaps
	 * scraper import). Kept even when `id` is blank so the entry can still be
	 * refreshed by link (the local import path) — see places/places-local-step.ts.
	 */
	sourceUrl?: string;
	/** Whether the place is no longer operational (proposed — see plan Open Q3). */
	closed?: boolean;
}

// -----------------------------------------------------------
// Expenses — Document at expenses/{tripId}  (was "gastos/{tripId}")
// -----------------------------------------------------------

/** was "gastos/{tripId}" */
export interface Expenses {
	/** was "gastosDurante" */
	duringTrip: ExpenseEntry[];
	/** was "gastosPrevios" */
	preTrip: ExpenseEntry[];
	/** 3-letter currency code, mirrored from parent trip */
	currency: string;
	/** Map of travelerId → travelerName */
	travelers: Record<string, string>;
	/** was "compartilhamento" */
	sharing: TripSharing;
	/** was "versao" */
	version: TripVersion;
	/** was "orcamento" — optional, rarely populated */
	budget?: Record<string, unknown>;
}

/**
 * A single expense entry.
 * was individual items in gastosDurante[] / gastosPrevios[]
 */
export interface ExpenseEntry {
	/** was "nome" — expense description */
	name: string;
	/** was "tipo" — i18n translation key (e.g. "trip.transportation.type.flights") */
	type: string;
	/** was "valor" — amount in the stated currency */
	price: number;
	/** was "moeda" — 3-letter currency code */
	currency: string;
	/** was "pessoa" — traveler ID from the travelers map, or "" if unassigned */
	person: string;
}

// -----------------------------------------------------------
// User Profile — Document at users/{uid}  (was "usuarios/{uid}")
// -----------------------------------------------------------

/** was "usuarios/{uid}" — summaries moved to subcollections; these arrays are vestigial */
export interface UserProfile {
	/** Vestigial — destination IDs (real data in destinationSummaries subcollection) */
	destinations: string[];
	/** Vestigial — trip IDs (real data in tripSummaries subcollection) */
	trips: string[];
	/** Vestigial — listing IDs (real data in listingSummaries subcollection) */
	listings: string[];
}

// -----------------------------------------------------------
// User Summary Subcollections
// was embedded inside usuarios/{uid} as {viagens: {id: {...}}, destinos: {id: {...}}, listagens: {id: {...}}}
// -----------------------------------------------------------

/** Document at users/{uid}/tripSummaries/{tripId}  was "viagens" inside user doc */
export interface TripSummary {
	/** was "titulo" */
	title: string;
	/** was "inicio" */
	start: DateObject;
	/** was "fim" */
	end: DateObject;
	/** Header/hero image object (same shape as TripImage) */
	image: TripImage;
	/** was "cores" */
	colors: TripColors;
	/** was "versao" */
	version: TripVersion;
	pin: PinType;
	/** was "modulos" */
	modules: TripModules;
}

/** Document at users/{uid}/destinationSummaries/{id}  was "destinos" inside user doc */
export interface DestinationSummary {
	/** was "titulo" */
	title: string;
	/** was "moeda" */
	currency: string;
	/** was "versao" */
	version: DestinationVersion;
	/** Hero image (added July 2026) — may be absent in older summaries */
	image?: DestinationImage;
}

/** Document at users/{uid}/listingSummaries/{id}  was "listagens" inside user doc */
export interface ListingSummary {
	/** was "titulo" */
	title: string;
	subtitle: string;
	/** was "descricao" */
	description: string;
	image: string;
	/** was "cores" */
	colors: Record<string, unknown>;
	/** was "versao" */
	version: Record<string, unknown>;
}

// -----------------------------------------------------------
// Listing — Document at listings/{id}  (was "listagens/{id}")
// -----------------------------------------------------------

/** was "listagens/{id}" */
export interface Listing {
	/** was "titulo" */
	title: string;
	subtitle: string;
	/** was "descricao" */
	description: string;
	image: string;
	/** was "cores" */
	colors: Record<string, unknown>;
	/** was "versao" */
	version: Record<string, unknown>;
	/** was "compartilhamento" */
	sharing: ListingSharing;
	/** was "destinos" — slim references to destinations */
	destinationRefs?: DestinationRef[];
}

/** was "compartilhamento" on listing */
export interface ListingSharing {
	/** was "dono" */
	owner: string;
	/** was "ativo" */
	active: boolean;
}

// -----------------------------------------------------------
// Protected Data — Document at protected/{tripId}  (was "protegido/{tripId}")
// -----------------------------------------------------------

/** was "protegido/{tripId}" */
export interface ProtectedData {
	pin: string;
}

// ============================================================
// Composite Types (for client-side convenience)
// ============================================================

/** A fully resolved trip with all subcollections loaded in parallel */
export interface TripComplete extends Trip {
	accommodations: Accommodation[];
	transportation: TransportBundle;
	itinerary: ItineraryDay[];
	destinations: Destination[];
}

/** Transportation bundle: legs + settings from subcollection */
export interface TransportBundle {
	legs: TransportLeg[];
	settings: TransportSettings;
}
