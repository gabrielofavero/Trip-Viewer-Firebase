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

// Dev mode (set on localhost only)
declare var dev: import('./utils/dev.js').DevHost;

// Window extensions (iframe communication, embed scripts)
interface Window {
	closeViewEmbed?: () => void;
	[key: string]: any;
}

