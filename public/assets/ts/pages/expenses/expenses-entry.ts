// ======= Expenses Page Entry Point =======

import { main } from '../../app/main.js';
import '../../theme/animations.js';
import '../../theme/visibility.js';
import '../../theme/colors.js';
import '../../theme/stylesheets.js';
import '../../theme/icons.js';
import '../../data/services/auth.service.js';
import '../destination/categories.js';
import '../destination/support/content.js';
import '../destination/destination.js';
import './support/currency.js';
import './support/data.js';
import './categories.js';
import './expenses-converted.js';
import './support/event-listeners.js';
import { loadExpensesPage } from './expenses.js';

main({ expenses: loadExpensesPage });
