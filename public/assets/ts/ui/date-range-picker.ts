/**
 * Date Range Picker — Single calendar, period selection
 * Replaces separate start/end date inputs with a unified calendar UI.
 *
 * Usage:
 *   <div class="date-range-picker" id="my-dates">
 *     <input type="hidden" name="start" />
 *     <input type="hidden" name="end" />
 *   </div>
 *   new DateRangePicker(document.getElementById('my-dates'));
 */
import { translate, getLanguagePackName } from '../i18n/translation.js';

export class DateRangePicker {
	private container: HTMLElement;
	private startInput: HTMLInputElement;
	private endInput: HTMLInputElement;
	private displayInput!: HTMLElement;
	private calendar!: HTMLElement;
	private textEl!: HTMLElement;
	private clearBtn!: HTMLElement;

	private currentMonth: number;
	private currentYear: number;
	private startDate: Date | null = null;
	private endDate: Date | null = null;
	private hoverDate: Date | null = null;
	private selecting: 'start' | 'end' = 'start';

	private readonly monthKeys = [
		'january',
		'february',
		'march',
		'april',
		'may',
		'june',
		'july',
		'august',
		'september',
		'october',
		'november',
		'december',
	];
	private readonly weekDayKeys = [
		'sunday',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
	];

	private getMonths(): string[] {
		return this.monthKeys.map((k) => translate(`datetime.months.${k}`));
	}

	private getWeekDays(): string[] {
		return this.weekDayKeys.map((k) => translate(`datetime.weekdays.mini.${k}`));
	}

	private getShortcuts() {
		return [
			{
				label: translate('datetime.datepicker.today'),
				get: () => this.shortcutToday(),
			},
			{
				label: translate('datetime.datepicker.this_week'),
				get: () => this.shortcutThisWeek(),
			},
			{
				label: translate('datetime.datepicker.this_month'),
				get: () => this.shortcutThisMonth(),
			},
			{
				label: translate('datetime.datepicker.clear'),
				get: () => this.clear(),
			},
		];
	}

	constructor(container: HTMLElement) {
		this.container = container;

		const hiddenInputs = container.querySelectorAll<HTMLInputElement>('input[type="hidden"]');
		this.startInput = hiddenInputs[0];
		this.endInput = hiddenInputs[1] || hiddenInputs[0];

		// Parse existing values
		if (this.startInput.value) this.startDate = new Date(this.startInput.value + 'T00:00:00');
		if (this.endInput.value) this.endDate = new Date(this.endInput.value + 'T00:00:00');

		const now = new Date();
		this.currentMonth = this.startDate ? this.startDate.getMonth() : now.getMonth();
		this.currentYear = this.startDate ? this.startDate.getFullYear() : now.getFullYear();

		this.buildUI();
		this.bindEvents();
		this.updateDisplay();
	}

	private buildUI(): void {
		// Preserve the hidden inputs (they're already in the container from HTML)
		// Only build the visual display and calendar around them

		// Display input (the clickable bar) — insert before the hidden inputs
		this.displayInput = document.createElement('div');
		this.displayInput.className = 'date-range-input';
		this.displayInput.tabIndex = 0;
		this.displayInput.innerHTML = `
			<svg class="date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
				<line x1="16" y1="2" x2="16" y2="6"/>
				<line x1="8" y1="2" x2="8" y2="6"/>
				<line x1="3" y1="10" x2="21" y2="10"/>
			</svg>
			<span class="date-text placeholder">${translate('datetime.datepicker.select_dates')}</span>
			<button class="date-clear" type="button" tabindex="-1">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		`;
		this.container.insertBefore(this.displayInput, this.container.firstChild);

		this.textEl = this.displayInput.querySelector('.date-text')!;
		this.clearBtn = this.displayInput.querySelector('.date-clear')!;

		// Calendar dropdown — append after the hidden inputs
		this.calendar = document.createElement('div');
		this.calendar.className = 'date-range-calendar';
		this.container.appendChild(this.calendar);
	}

	private bindEvents(): void {
		// Toggle calendar on click
		this.displayInput.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleCalendar();
		});

		// Clear button
		this.clearBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.clear();
		});

		// Close calendar when clicking outside
		document.addEventListener('click', (e) => {
			if (!this.container.contains(e.target as Node)) {
				this.closeCalendar();
			}
		});

		// Keyboard: Escape to close
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.calendar.classList.contains('open')) {
				this.closeCalendar();
			}
		});
	}

	private toggleCalendar(): void {
		if (this.calendar.classList.contains('open')) {
			this.closeCalendar();
		} else {
			this.openCalendar();
		}
	}

	private openCalendar(): void {
		// Keep existing selection, or default to current month
		this.currentMonth = this.startDate ? this.startDate.getMonth() : new Date().getMonth();
		this.currentYear = this.startDate ? this.startDate.getFullYear() : new Date().getFullYear();
		// Reset picking state — user starts fresh each time calendar opens
		this.selecting = this.startDate && this.endDate ? 'start' : 'start';
		this.renderCalendar();
		this.calendar.classList.add('open');
		this.displayInput.classList.add('active');
	}

	private closeCalendar(): void {
		this.calendar.classList.remove('open');
		this.displayInput.classList.remove('active');
		// Don't call updateDisplay here — keep whatever was previously set
	}

	private applyRange(): void {
		if (this.startDate && this.endDate) {
			if (this.startDate > this.endDate) {
				[this.startDate, this.endDate] = [this.endDate, this.startDate];
			}
			this.updateDisplay();
		}
		this.closeCalendar();
	}

	private clear(): void {
		this.startDate = null;
		this.endDate = null;
		this.startInput.value = '';
		this.endInput.value = '';
		this.updateDisplay();
	}

	private previousStartValue = '';
	private previousEndValue = '';

	private updateDisplay(): void {
		const hasValue = this.startDate && this.endDate;
		if (hasValue) {
			const locale = getLanguagePackName() === 'pt' ? 'pt-BR' : 'en-US';
			const fmt = (d: Date) =>
				d.toLocaleDateString(locale, {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				});
			this.textEl.textContent = `${fmt(this.startDate!)} – ${fmt(this.endDate!)}`;
			this.textEl.classList.remove('placeholder');
			this.displayInput.classList.add('has-value');

			// Format as YYYY-MM-DD for hidden inputs
			const toISO = (d: Date) => {
				const y = d.getFullYear();
				const m = String(d.getMonth() + 1).padStart(2, '0');
				const day = String(d.getDate()).padStart(2, '0');
				return `${y}-${m}-${day}`;
			};
			const newStart = toISO(this.startDate!);
			const newEnd = toISO(this.endDate!);
			const changed = newStart !== this.previousStartValue || newEnd !== this.previousEndValue;

			this.startInput.value = newStart;
			this.endInput.value = newEnd;

			if (changed && this.previousStartValue !== '' /* not initial render */) {
				this.previousStartValue = newStart;
				this.previousEndValue = newEnd;
				this.startInput.dispatchEvent(new Event('change', { bubbles: true }));
			} else if (this.previousStartValue === '') {
				// Track initial values without firing events
				this.previousStartValue = newStart;
				this.previousEndValue = newEnd;
			}
		} else {
			this.textEl.textContent = translate('datetime.datepicker.select_dates');
			this.textEl.classList.add('placeholder');
			this.displayInput.classList.remove('has-value');
			this.startInput.value = '';
			this.endInput.value = '';
			this.previousStartValue = '';
			this.previousEndValue = '';
		}
	}

	private renderCalendar(): void {
		const year = this.currentYear;
		const month = this.currentMonth;

		const firstDay = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const daysInPrevMonth = new Date(year, month, 0).getDate();
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		let html = '';

		const months = this.getMonths();
		const weekDays = this.getWeekDays();

		// Header
		html += `<div class="cal-header">
			<button class="cal-nav-btn" data-action="prev">&larr;</button>
			<span class="cal-month-label">${months[month]} ${year}</span>
			<button class="cal-nav-btn" data-action="next">&rarr;</button>
		</div>`;

		// Weekday labels
		html += '<div class="cal-weekdays">';
		for (const d of weekDays) {
			html += `<span>${d}</span>`;
		}
		html += '</div>';

		// Days grid
		html += '<div class="cal-days">';

		// Previous month days
		for (let i = firstDay - 1; i >= 0; i--) {
			const d = daysInPrevMonth - i;
			html += `<button class="cal-day other-month" disabled>${d}</button>`;
		}

		// Current month days
		for (let d = 1; d <= daysInMonth; d++) {
			const date = new Date(year, month, d);
			const classes = ['cal-day'];

			if (date.getTime() === today.getTime()) {
				classes.push('today');
			}

			// Check if date is in range
			if (this.startDate && this.endDate && date > this.startDate && date < this.endDate) {
				classes.push('in-range');
			}

			// Check if date is range start or end
			if (this.startDate && date.getTime() === this.startDate.getTime()) {
				classes.push('range-start');
			}
			if (this.endDate && date.getTime() === this.endDate.getTime()) {
				classes.push('range-end');
			}

			html += `<button class="${classes.join(' ')}" data-date="${year}-${month}-${d}">${d}</button>`;
		}

		// Next month days to fill row
		const totalCells = firstDay + daysInMonth;
		const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
		for (let d = 1; d <= remaining; d++) {
			html += `<button class="cal-day other-month" disabled>${d}</button>`;
		}

		html += '</div>';

		// Shortcuts
		const shortcuts = this.getShortcuts();
		html += '<div class="cal-shortcuts">';
		for (const s of shortcuts) {
			html += `<button class="cal-shortcut-btn" data-shortcut="${s.label}">${s.label}</button>`;
		}
		html += '</div>';

		// Footer
		const rangeLabel =
			this.startDate && this.endDate
				? `${this.fmtShort(this.startDate)} – ${this.fmtShort(this.endDate)}`
				: this.startDate
					? translate('datetime.datepicker.start_pick_end', {
							start: this.fmtShort(this.startDate),
						})
					: translate('datetime.datepicker.pick_start_date');

		html += `<div class="cal-footer">
			<span class="cal-range-label">${rangeLabel}</span>
			<div class="cal-footer-buttons">
				<button class="cal-cancel-btn" data-action="cancel">${translate('datetime.datepicker.cancel')}</button>
				<button class="cal-apply-btn" data-action="apply">${translate('datetime.datepicker.apply')}</button>
			</div>
		</div>`;

		this.calendar.innerHTML = html;

		// Bind calendar events
		this.bindCalendarEvents();
	}

	private bindCalendarEvents(): void {
		// Navigation
		this.calendar.querySelectorAll('.cal-nav-btn').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const action = (btn as HTMLElement).dataset.action;
				if (action === 'prev') {
					this.currentMonth--;
					if (this.currentMonth < 0) {
						this.currentMonth = 11;
						this.currentYear--;
					}
				} else if (action === 'next') {
					this.currentMonth++;
					if (this.currentMonth > 11) {
						this.currentMonth = 0;
						this.currentYear++;
					}
				}
				this.renderCalendar();
			});
		});

		// Day clicks
		this.calendar.querySelectorAll('.cal-day:not(.other-month)').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const ds = (btn as HTMLElement).dataset.date!;
				const [y, m, d] = ds.split('-').map(Number);
				const clickedDate = new Date(y, m, d);

				if (this.selecting === 'start') {
					this.startDate = clickedDate;
					this.endDate = null;
					this.selecting = 'end';
				} else {
					if (clickedDate < this.startDate!) {
						this.endDate = this.startDate;
						this.startDate = clickedDate;
					} else {
						this.endDate = clickedDate;
					}
					this.selecting = 'start';
				}
				this.renderCalendar();
			});
		});

		// Shortcuts
		this.calendar.querySelectorAll('.cal-shortcut-btn').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const label = (btn as HTMLElement).dataset.shortcut!;
				const shortcut = this.getShortcuts().find((s) => s.label === label);
				if (shortcut) shortcut.get();
				this.renderCalendar();
			});
		});

		// Apply / Cancel
		this.calendar.querySelector('.cal-apply-btn')?.addEventListener('click', (e) => {
			e.stopPropagation();
			this.applyRange();
		});

		this.calendar.querySelector('.cal-cancel-btn')?.addEventListener('click', (e) => {
			e.stopPropagation();
			this.closeCalendar();
		});
	}

	private shortcutToday(): void {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		this.startDate = today;
		this.endDate = today;
		this.selecting = 'start';
	}

	private shortcutThisWeek(): void {
		const now = new Date();
		const day = now.getDay();
		const start = new Date(now);
		start.setDate(now.getDate() - day);
		start.setHours(0, 0, 0, 0);
		const end = new Date(start);
		end.setDate(start.getDate() + 6);
		this.startDate = start;
		this.endDate = end;
		this.selecting = 'start';
	}

	private shortcutThisMonth(): void {
		const now = new Date();
		this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
		this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		this.selecting = 'start';
	}

	private fmtShort(d: Date): string {
		const locale = getLanguagePackName() === 'pt' ? 'pt-BR' : 'en-US';
		return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
	}

	/** Get current range as {start: Date, end: Date} or null */
	getRange(): { start: Date; end: Date } | null {
		if (this.startDate && this.endDate) {
			return { start: this.startDate, end: this.endDate };
		}
		return null;
	}

	/** Programmatically set range */
	setRange(start: string, end: string): void {
		this.startDate = new Date(start + 'T00:00:00');
		this.endDate = new Date(end + 'T00:00:00');
		this.updateDisplay();
	}

	/** Get the start input element */
	getStartInput(): HTMLInputElement {
		return this.startInput;
	}

	/** Get the end input element */
	getEndInput(): HTMLInputElement {
		return this.endInput;
	}
}
