// ======= Edit Destination Page Entry Point =======

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../theme/visibility.js';
import '../../theme/colors.js';
import '../../theme/stylesheets.js';
import '../../theme/icons.js';
import '../../data/services/auth.service.js';
import './categories/price.js';
import './categories/description.js';
import './new-destination.js';
import './existing-destination.js';
import './set-destination.js';
import './import-destination.js';
import '../../ui/image-picker.js';
import './support/event-listeners.js';
import { loadEditDestinationPage } from './edit-destination.js';

main({ editDestination: loadEditDestinationPage });
