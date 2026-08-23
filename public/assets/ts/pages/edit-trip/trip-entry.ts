// ======= Edit Trip Page Entry Point =======

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../theme/visibility.js';
import '../../theme/colors.js';
import '../../theme/stylesheets.js';
import '../../data/services/auth.service.js';
import './support/event-listeners.js';
import './categories/customization.js';
import './categories/basic-data/protected-data.js';
import './categories/basic-data/set-protected-data.js';
import './categories/expenses.js';
import './categories/transportation.js';
import './categories/accommodation.js';
import './categories/destination.js';
import './categories/itinerary-module/itinerary-module.js';
import './categories/itinerary-module/inner-itinerary/content.js';
import './categories/itinerary-module/inner-itinerary/inner-itinerary.js';
import './categories/itinerary-module/inner-itinerary/text-replacement.js';
import './categories/travelers.js';
import './categories/gallery.js';
import './categories/wallpaper-import.js';
import './new-trip.js';
import './existing-trip.js';
import './set-trip.js';
import { loadEditTripPage } from './edit-trip.js';

main({ editTrip: loadEditTripPage });
