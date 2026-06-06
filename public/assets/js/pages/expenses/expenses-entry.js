// ======= Expenses Page Entry Point =======
// Single entry point replacing all <script data-main> tags in expenses.html
// Import order MUST match the original script tag order exactly

import { main } from '../../app/main.js';
import '../../data/services/trip.service.js';
import '../../theme/animations.js';
import '../../utils/dom.js';
import '../../theme/icons.js';
import '../../theme/colors.js';
import '../../theme/visibility.js';
import '../../utils/messages.js';
import '../../utils/loading.js';
import '../destination/support/media-embed.js';
import '../destination/categories.js';
import '../destination/support/content.js';
import '../destination/destination.js';
import '../../theme/stylesheets.js';
import '../../utils/devices.js';
import '../../utils/dates.js';
import '../../utils/pin.js';
import './support/currency.js';
import './support/data.js';
import '../../ui/embed.js';
import './support/embed.js';
import './categories.js';
import './expenses-converted.js';
import { loadExpensesPage } from './expenses.js';
import '../../utils/attributions.js';

main({ expenses: loadExpensesPage });
