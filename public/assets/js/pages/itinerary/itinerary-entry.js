// ======= Itinerary Page Entry Point =======

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../theme/visibility.js';
import '../../theme/colors.js';
import '../../theme/stylesheets.js';
import '../../theme/icons.js';
import '../view/support/sensitive-reservation.js';
import '../destination/support/content.js';
import '../destination/support/visibility.js';
import '../view/categories/itinerary-module/inner-itinerary.js';
import '../view/categories/transportation-module.js';
import '../view/categories/accommodation-module.js';
import '../destination/categories.js';
import './itinerary-formatter.js';
import './support/event-listeners.js';
import { loadItineraryPage } from './itinerary.js';

main({ itinerary: loadItineraryPage });
