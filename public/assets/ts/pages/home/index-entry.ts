// ======= Index Page Entry Point =======

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../theme/visibility.js';
import '../../theme/colors.js';
import '../../theme/stylesheets.js';
import '../../data/services/auth.service.js';
import './support/visibility.js';
import './support/event-listeners.js';
import { loadIndexPage } from './index.js';

main({ index: loadIndexPage });
