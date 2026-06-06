// ======= Edit Listing Page Entry Point =======

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../theme/visibility.js';
import '../../theme/colors.js';
import '../../theme/stylesheets.js';
import '../../data/services/auth.service.js';
import '../index/support/visibility.js';
import '../edit-trip/categories/destination.js';
import '../edit-trip/new-trip.js';
import '../edit-trip/categories/customization.js';
import '../edit-trip/existing-trip.js';
import '../edit-trip/set-trip.js';
import './existing-listing.js';
import './support/event-listeners.js';
import { loadEditListingPage } from './edit-listing.js';

main({ editListing: loadEditListingPage });
