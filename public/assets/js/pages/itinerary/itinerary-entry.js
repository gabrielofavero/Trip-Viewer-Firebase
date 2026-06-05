// ======= Itinerary Page Entry Point =======
// Single entry point replacing all <script data-main> tags in itinerary.html
// Import order MUST match the original script tag order exactly

import '../../main/translation.js';
import '../../main/main.js';
import '../../services/trip-service.js';
import '../../support/styles/animations.js';
import '../../support/pages/data.js';
import '../../support/pages/dates.js';
import '../../support/styles/svgs.js';
import '../../support/styles/colors.js';
import '../../support/styles/visibility.js';
import '../../support/pages/messages.js';
import '../../support/pages/loading.js';
import '../../components/embed.js';
import '../../support/styles/stylesheets.js';
import '../../support/pages/attributions.js';
import '../../support/pages/pin.js';
import '../view/support/sensitive-reservation.js';
import '../destination/support/content.js';
import '../destination/support/visibility.js';
import '../view/categories/itinerary-module/inner-itinerary.js';
import '../view/categories/transportation-module.js';
import '../view/categories/accommodation-module.js';
import '../destination/categories.js';
import './itinerary-formatter.js';
import './itinerary.js';
