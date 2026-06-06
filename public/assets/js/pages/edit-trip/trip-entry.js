// ======= Edit Trip Page Entry Point =======
// Single entry point replacing all <script data-main> tags in edit/trip.html
// Import order MUST match the original script tag order exactly

// Paths use ../.. because this file is in pages/edit-trip/
import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../utils/dom.js';
import '../../data/services/trip.service.js';
import '../../data/services/auth.service.js';
import '../../utils/dates.js';
import '../../theme/stylesheets.js';
import '../../theme/colors.js';
import '../../theme/visibility.js';
import '../index/support/visibility.js';
import '../../utils/devices.js';
import '../../utils/messages.js';
import '../../utils/loading.js';
import '../../ui/fields.js';
import '../../ui/accordion.js';
import '../../ui/sortable.js';
import '../../ui/dynamic-select.js';
import './categories/customization.js';
import '../../utils/pin.js';
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
import './new-trip.js';
import './existing-trip.js';
import '../../utils/set.js';
import './set-trip.js';
import './support/event-listeners.js';
import { loadEditTripPage } from './edit-trip.js';
import '../../utils/attributions.js';

main({ editTrip: loadEditTripPage });
