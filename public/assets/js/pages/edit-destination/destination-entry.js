// ======= Edit Destination Page Entry Point =======
// Single entry point replacing all <script data-main> tags in edit/destination.html
// Import order MUST match the original script tag order exactly

// Paths use ../.. because this file is in pages/edit-destination/
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
import '../../ui/dynamic-select.js';
import '../../theme/icons.js';
import './categories/price.js';
import './categories/description.js';
import './new-destination.js';
import './existing-destination.js';
import '../../utils/set.js';
import './set-destination.js';
import { loadEditDestinationPage } from './edit-destination.js';
import './import-destination.js';
import '../../utils/attributions.js';

main({ editDestination: loadEditDestinationPage });
