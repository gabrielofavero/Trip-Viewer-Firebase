// ======= View Page Entry Point =======

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../theme/visibility.js';
import '../../theme/colors.js';
import '../../theme/stylesheets.js';
import '../../data/services/auth.service.js';
import './support/visibility.js';
import './support/swiper.js';
import './support/countdown.js';
import './support/sensitive-reservation.js';
import './support/embed.js';
import './categories/destination.js';
import './categories/itinerary-module/itinerary-module.js';
import './categories/itinerary-module/calendar.js';
import './categories/itinerary-module/inner-itinerary.js';
import './categories/transportation-module.js';
import './categories/accommodation-module.js';
import './categories/summary.js';
import './categories/gallery.js';
import '../destination/categories.js';
import '../destination/support/visibility.js';
import '../destination/support/content.js';
import './support/event-listeners.js';
import { loadViewPage } from './view.js';

main({ view: loadViewPage });
