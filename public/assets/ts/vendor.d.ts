// Vendor globals loaded via <script> tags (not modules)
declare var $: any;
declare var jQuery: any;
declare var Sortable: any;
declare var firebase: any;

// Third-party library globals
declare var AOS: any;
declare var bootstrap: any;
declare var Chart: any;
declare var GLightbox: any;
declare var instgrm: any;
declare var Isotope: any;
declare var Swiper: any;
declare var Typed: any;
declare var Waypoint: any;

// Legacy globals — declared here temporarily during migration.
// These will be moved to proper ES module imports in future prompts.
declare var ACTIVE_CATEGORY: any;
declare var ACTIVE_DESTINATION: any;
declare var ACTIVE_PLANNED_DESTINATION: any;
declare var CONTENT: any;
declare var CURRENT_CURRENCY: any;
declare var DATABASE_EDITABLE_DOCUMENTS: any;
declare var DEFAULT_CURRENCY: any;
declare var FILTER_SORT_DATA: any;
declare var FIM: any;
declare var FIRESTORE_EXPENSES_DATA: any;
declare var FIRESTORE_EXPENSES_PROTECTED_NEW_DATA: any;
declare var FIRESTORE_PROTECTED_DATA: any;
declare var FIRESTORE_PROTECTED_NEW_DATA: any;
declare var EXPENSES_DATA: any;
declare var EXPENSES_CONVERTED: any;
declare var CURRENCY_CONVERSION: any;
declare var INICIO: any;
declare var ITINERARY: any;
declare var LANGUAGES: any;
declare var LOGO_DARK: any;
declare var LOGO_LIGHT: any;
declare var MEDIA_HYPERLINKS: any;
declare var MESSAGE_MODAL_OPEN: any;
declare var MOEDA_CONVERSAO: any;
declare var NEW_TRIP: any;
declare var PERMISSIONS: any;
declare var PLANNED_DESTINATION: any;
declare var SCHEDULE_OPEN: any;
declare var TEXT_REPLACEMENT_APPLIED: any;
declare var THEME_COLOR: any;
declare var TODAY: any;
declare var TOMORROW: any;

// Dev mode (set on localhost only)
declare var dev: import('./utils/dev.js').DevHost;
declare var TYPE: any;
declare var VALOR_OPTIONS: any;

// Legacy function globals
declare function _afterDragInnerGasto(...args: any[]): any;
declare function _buildDestinosObject(...args: any[]): any;
declare function _buildGastosObject(...args: any[]): any;
declare function _buildTripObject(...args: any[]): any;
declare function _descriptionSelectChangeAction(...args: any[]): any;
declare function _loadViewEmbedAction(...args: any[]): any;
declare function onViewMessage(...args: any[]): any;
declare function _setFirestoreData(...args: any[]): any;
declare function _unloadMedias(...args: any[]): any;
declare function _updateTikTokLinks(...args: any[]): any;
declare function accommodationsAddListenerAction(...args: any[]): any;
declare function addSetResponse(...args: any[]): any;
declare function applyExpenses(...args: any[]): any;
declare function buildCompartilhamentoObject(...args: any[]): any;
declare function buildDestinosArray(...args: any[]): any;
declare function buildImagemObject(...args: any[]): any;
declare function buildLinksObject(...args: any[]): any;
declare function embedAfterLoadAction(...args: any[]): any;
declare function getDestinationsAccordionBodyHTML(...args: any[]): any;
declare function getFormattedDate(...args: any[]): any;
declare function openIndexPage(...args: any[]): any;
declare function pillCircle(...args: any[]): any;
declare function sendHeightMessageToParent(...args: any[]): any;
declare function setFilterPreference(...args: any[]): any;
declare function setProtectedDataAndExpenses(...args: any[]): any;
declare function setSortPreference(...args: any[]): any;
declare function transportationAddListenerAction(...args: any[]): any;
declare function validatePinField(...args: any[]): any;

// Legacy DOM-element-level globals (used as bare variable names in some files)
declare var div: any;
declare var link: any;
declare var upload: any;
declare var pin: any;
declare var PIN: any;
declare var value: any;
declare var result: any;
declare var settings: any;
declare var get: any;

// Window extensions (iframe communication, embed scripts)
interface Window {
	closeViewEmbed?: () => void;
	[key: string]: any;
}

