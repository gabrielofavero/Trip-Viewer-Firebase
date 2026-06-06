// ======= Destination Page Entry Point =======
// Single entry point replacing all <script data-main> tags in destination.html
// Import order MUST match the original script tag order exactly

import '../../data/services/trip.service.js';
import { main } from '../../app/main.js';
import '../../data/services/auth.service.js';
import '../../utils/loading.js';
import '../../theme/animations.js';
import '../../utils/dom.js';
import '../../theme/icons.js';
import '../../ui/embed.js';
import './support/media-embed.js';
import './categories.js';
import './support/content.js';
import '../../ui/custom-select.js';
import './support/sort-and-filter/support/price-bucket.js';
import './support/sort-and-filter/support/preferences.js';
import './support/sort-and-filter/support/drawer.js';
import './support/sort-and-filter/sort-and-filter.js';
import './support/sort-and-filter/sort.js';
import './support/sort-and-filter/filter.js';
import './support/trip.js';
import './edit-destination.js';
import './import-destination.js';
import { loadDestinationPage } from './destination.js';
import '../../theme/colors.js';
import './support/visibility.js';
import '../../theme/stylesheets.js';
import '../../theme/visibility.js';
import '../../utils/devices.js';
import '../../utils/dates.js';
import '../../utils/messages.js';
import '../../ui/fields.js';
import '../../utils/attributions.js';

main({ destination: loadDestinationPage });
