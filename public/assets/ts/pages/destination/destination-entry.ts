// ======= Destination Page Entry Point =======

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../theme/visibility.js';
import '../../theme/colors.js';
import '../../theme/stylesheets.js';
import '../../theme/icons.js';
import '../../data/services/auth.service.js';
import './support/visibility.js';
import './support/content.js';
import './support/sort-and-filter/support/price-bucket.js';
import './support/sort-and-filter/support/preferences.js';
import './support/sort-and-filter/support/drawer.js';
import './support/sort-and-filter/sort-and-filter.js';
import './support/sort-and-filter/sort.js';
import './support/sort-and-filter/filter.js';
import './support/trip.js';
import './categories.js';
import './edit-destination.js';
import './import-destination.js';
import './support/event-listeners.js';
import { loadDestinationPage } from './destination.js';

main({ destination: loadDestinationPage });
