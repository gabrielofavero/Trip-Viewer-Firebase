// ======= View Page Entry Point =======
// Single entry point replacing all <script data-main> tags in view.html
// Import order MUST match the original script tag order exactly

import '../../i18n/translation.js';
import '../../app/main.js';
import '../../theme/animations.js';
import '../../utils/messages.js';
import '../../utils/loading.js';
import '../../data/services/auth.service.js';
import '../../ui/bimap.js';
import '../../utils/dom.js';
import '../../utils/dates.js';
import './support/swiper.js';
import '../../theme/stylesheets.js';
import '../../theme/visibility.js';
import './support/visibility.js';
import '../../theme/colors.js';
import '../../utils/devices.js';
import '../../utils/pin.js';
import '../../ui/embed.js';
import './support/embed.js';
import '../../ui/custom-select.js';
import './categories/destination.js';
import './support/countdown.js';
import './support/sensitive-reservation.js';
import './categories/itinerary-module/itinerary-module.js';
import './categories/itinerary-module/calendar.js';
import './categories/itinerary-module/inner-itinerary.js';
import './categories/transportation-module.js';
import './categories/accommodation-module.js';
import './categories/summary.js';
import './categories/gallery.js';
import '../../data/services/trip.service.js';
import '../destination/categories.js';
import '../destination/support/visibility.js';
import '../destination/support/media-embed.js';
import '../destination/support/content.js';
import './view.js';
import '../../utils/attributions.js';
