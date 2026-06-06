// ======= Index Page Entry Point =======
// Single entry point replacing all <script data-main> tags in index.html
// Import order MUST match the original script tag order exactly

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../utils/dates.js';
import '../../utils/dom.js';
import '../../data/services/trip.service.js';
import '../../data/services/auth.service.js';
import '../../theme/stylesheets.js';
import '../../theme/colors.js';
import '../../theme/visibility.js';
import './support/visibility.js';
import '../../utils/devices.js';
import '../../utils/messages.js';
import '../../utils/loading.js';
import './support/data.js';
import './support/event-listeners.js';
import './support/navigation.js';
import { loadIndexPage } from './index.js';
import '../../utils/attributions.js';
import '../../backup/backup.js';
import '../../backup/restore.js';

main({ index: loadIndexPage });
