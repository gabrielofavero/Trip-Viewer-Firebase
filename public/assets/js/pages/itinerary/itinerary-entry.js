// ======= Itinerary Page Entry Point =======
// Single entry point replacing all <script data-main> tags in itinerary.html
// Import order MUST match the original script tag order exactly

import { main } from '../../app/main.js';
import '../../data/services/trip.service.js';
import '../../theme/animations.js';
import '../../utils/dom.js';
import '../../utils/dates.js';
import '../../theme/icons.js';
import '../../theme/colors.js';
import '../../theme/visibility.js';
import '../../utils/messages.js';
import '../../utils/loading.js';
import '../../ui/embed.js';
import '../../theme/stylesheets.js';
import '../../utils/attributions.js';
import '../../utils/pin.js';
import '../view/support/sensitive-reservation.js';
import '../destination/support/content.js';
import '../destination/support/visibility.js';
import '../view/categories/itinerary-module/inner-itinerary.js';
import '../view/categories/transportation-module.js';
import '../view/categories/accommodation-module.js';
import '../destination/categories.js';
import './itinerary-formatter.js';
import { loadItineraryPage } from './itinerary.js';

main({ itinerary: loadItineraryPage });
