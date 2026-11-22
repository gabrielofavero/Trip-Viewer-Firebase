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

/**
 * Every picker shares ONE popup element appended to <body>. Living outside the
 * picker's container — and outside the page sections, which use
 * `backdrop-filter` and `overflow: hidden` — means no accordion, scrolling box
 * or transformed/filtered ancestor can clip it. Sharing a single element also
 * avoids leaking DOM nodes when dynamic rows are added/removed.
 */
let sharedCalendar: HTMLElement | null = null;
let activePicker: DateRangePicker | null = null;
let globalListenersBound = false;

function getSharedCalendar(): HTMLElement {
	if (!sharedCalendar) {
		sharedCalendar = document.createElement('div');
		sharedCalendar.className = 'date-range-calendar';
		sharedCalendar.setAttribute('role', 'dialog');
		document.body.appendChild(sharedCalendar);
	}

	if (!globalListenersBound) {
		globalListenersBound = true;

		// Close on any pointer interaction outside the active picker.
		document.addEventListener(
			'pointerdown',
			(e) => {
				if (!activePicker) return;
				if (activePicker.containsTarget(e.target as Node)) return;
				activePicker.closeCalendar();
			},
			true,
		);

		// Escape always closes the open picker.
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') activePicker?.closeCalendar();
		});

		// A fixed popup must follow its input when the page scrolls or resizes.
		const reposition = () => activePicker?.positionCalendar();
		window.addEventListener('resize', reposition);
		window.addEventListener('scroll', reposition, true);
	}

	return sharedCalendar;
}

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
				id: 'today',
				label: translate('datetime.datepicker.today'),
				get: () => this.shortcutToday(),
			},
			{
				id: 'this-week',
				label: translate('datetime.datepicker.this_week'),
				get: () => this.shortcutThisWeek(),
			},
			{
				id: 'this-month',
				label: translate('datetime.datepicker.this_month'),
				get: () => this.shortcutThisMonth(),
			},
			{
				id: 'clear',
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
			<button class="date-clear" type="button" tabindex="-1" aria-label="${translate('datetime.datepicker.clear')}">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		`;
		this.container.insertBefore(this.displayInput, this.container.firstChild);

		this.textEl = this.displayInput.querySelector('.date-text')!;
		this.clearBtn = this.displayInput.querySelector('.date-clear')!;

		// Calendar dropdown — shared, appended to <body> so it is never clipped.
		this.calendar = getSharedCalendar();
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

		// Keyboard: Enter/Space opens the calendar (Escape is handled globally).
		this.displayInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				e.stopPropagation();
				this.toggleCalendar();
			}
		});
	}

	private toggleCalendar(): void {
		// Compare with the active picker, not the shared popup's class: the popup
		// may be open for another picker (e.g. when opened via keyboard).
		if (activePicker === this) {
			this.closeCalendar();
		} else {
			this.openCalendar();
		}
	}

	private openCalendar(): void {
		// Only one picker can be open — the popup element is shared.
		if (activePicker && activePicker !== this) activePicker.closeCalendar();

		const anchor = this.startDate ?? new Date();
		this.currentMonth = anchor.getMonth();
		this.currentYear = anchor.getFullYear();

		// Every open starts a fresh pick. The first click sets BOTH ends to the
		// clicked day (a 1-day period), so a single click is already a valid
		// range; a second click expands it into a multi-day range.
		this.selecting = 'start';
		this.hoverDate = null;
		activePicker = this;

		this.renderCalendar();
		this.calendar.classList.add('open');
		this.displayInput.classList.add('active');
		this.positionCalendar();
	}

	closeCalendar(): void {
		this.calendar.classList.remove('open');
		this.displayInput.classList.remove('active');
		this.hoverDate = null;
		if (activePicker === this) activePicker = null;
	}

	/** Whether a DOM node belongs to this picker (input bar or shared popup). */
	containsTarget(target: Node): boolean {
		return this.container.contains(target) || this.calendar.contains(target);
	}

	/**
	 * Anchors the fixed popup under the input, flipping above when there is no
	 * room below and clamping to the viewport so it is never cut off.
	 */
	positionCalendar(): void {
		if (!this.calendar.classList.contains('open')) return;

		const margin = 8;
		const rect = this.displayInput.getBoundingClientRect();
		const width = this.calendar.offsetWidth;
		const height = this.calendar.offsetHeight;
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let left = rect.left;
		if (left + width > viewportWidth - margin) {
			left = viewportWidth - margin - width;
		}
		left = Math.max(margin, left);

		const roomBelow = viewportHeight - rect.bottom - margin;
		const roomAbove = rect.top - margin;
		let top = rect.bottom + margin;
		if (height > roomBelow && roomAbove > roomBelow) {
			top = rect.top - margin - height;
		}
		top = Math.max(margin, Math.min(top, viewportHeight - margin - height));

		this.calendar.style.left = `${Math.round(left)}px`;
		this.calendar.style.top = `${Math.round(top)}px`;
	}

	private applyRange(): void {
		if (this.startDate) {
			// A single click already produced a complete 1-day range.
			if (!this.endDate) this.endDate = this.startDate;
			if (this.startDate > this.endDate) {
				[this.startDate, this.endDate] = [this.endDate, this.startDate];
			}
			this.updateDisplay();
		} else {
			// Nothing picked: restore whatever is actually committed.
			this.startDate = this.startInput.value ? new Date(this.startInput.value + 'T00:00:00') : null;
			this.endDate = this.endInput.value ? new Date(this.endInput.value + 'T00:00:00') : null;
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
	/**
	 * Whether a range was ever committed. Tracked separately from
	 * `previousStartValue` because an empty previous value (start of life, or
	 * after a clear) would otherwise mark the NEXT change as the initial render
	 * and swallow its `change` event, leaving everything downstream — the
	 * itinerary days and the auto durations — on the old range.
	 */
	private hasCommittedRange = false;

	private updateDisplay(): void {
		const hasValue = this.startDate && this.endDate;
		if (hasValue) {
			// Intl.formatRange collapses a same-day range into a single date and
			// shares the month/year ("18 – 20 de mar. de 2027").
			this.textEl.textContent = this.formatRange(this.startDate!, this.endDate!, {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			});
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

			if (changed) {
				// Only the very first render is silent; every later change —
				// including the first one after a clear — must notify consumers.
				const notify = this.hasCommittedRange;
				this.hasCommittedRange = true;
				this.previousStartValue = newStart;
				this.previousEndValue = newEnd;
				if (notify) {
					this.startInput.dispatchEvent(new Event('change', { bubbles: true }));
				}
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

		const months = this.getMonths();
		const weekDays = this.getWeekDays();

		let html = '';

		// Header
		html += `<div class="cal-header">
			<button type="button" class="cal-nav-btn" data-action="prev" aria-label="${translate('datetime.datepicker.previous_month')}">&larr;</button>
			<span class="cal-month-label">${months[month]} ${year}</span>
			<button type="button" class="cal-nav-btn" data-action="next" aria-label="${translate('datetime.datepicker.next_month')}">&rarr;</button>
		</div>`;

		// Weekday labels
		html += '<div class="cal-weekdays">';
		for (const d of weekDays) {
			html += `<span>${d}</span>`;
		}
		html += '</div>';

		// Days grid — adjacent-month days are clickable too, so picking a range
		// that crosses a month boundary does not require navigating first.
		html += '<div class="cal-days">';
		for (let i = firstDay - 1; i >= 0; i--) {
			const day = daysInPrevMonth - i;
			html += this.dayButtonHTML(new Date(year, month - 1, day), day, true);
		}
		for (let day = 1; day <= daysInMonth; day++) {
			html += this.dayButtonHTML(new Date(year, month, day), day, false);
		}
		const totalCells = firstDay + daysInMonth;
		const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
		for (let day = 1; day <= remaining; day++) {
			html += this.dayButtonHTML(new Date(year, month + 1, day), day, true);
		}
		html += '</div>';

		// Shortcuts
		html += '<div class="cal-shortcuts">';
		for (const s of this.getShortcuts()) {
			html += `<button type="button" class="cal-shortcut-btn" data-shortcut="${s.id}">${s.label}</button>`;
		}
		html += '</div>';

		// Footer
		const canApply = !!this.startDate;
		html += `<div class="cal-footer">
			<span class="cal-range-label">${this.getSelectionLabel()}</span>
			<div class="cal-footer-buttons">
				<button type="button" class="cal-cancel-btn" data-action="cancel">${translate('datetime.datepicker.cancel')}</button>
				<button type="button" class="cal-apply-btn" data-action="apply"${canApply ? '' : ' disabled'}>${translate('datetime.datepicker.apply')}</button>
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
				this.shiftMonth((btn as HTMLElement).dataset.action === 'prev' ? -1 : 1);
			});
		});

		// Day hover/click. Once the first click set the anchor, hovering paints
		// the range a second click would create.
		this.calendar.querySelectorAll<HTMLElement>('.cal-day[data-date]').forEach((btn) => {
			btn.addEventListener('pointerenter', () => {
				if (this.selecting !== 'end') return;
				this.hoverDate = this.parseISODate(btn.dataset.date!);
				this.updateDayClasses();
			});

			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.handleDayClick(this.parseISODate(btn.dataset.date!));
			});
		});

		// Clear the preview when the pointer leaves the whole grid (not between
		// days, which would flicker the highlight).
		this.calendar.querySelector('.cal-days')?.addEventListener('pointerleave', () => {
			if (!this.hoverDate) return;
			this.hoverDate = null;
			this.updateDayClasses();
		});

		// Shortcuts
		this.calendar.querySelectorAll('.cal-shortcut-btn').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const id = (btn as HTMLElement).dataset.shortcut;
				this.getShortcuts()
					.find((s) => s.id === id)
					?.get();
				// Follow the shortcut to its month so the highlight is visible.
				const anchor = this.startDate ?? new Date();
				this.currentMonth = anchor.getMonth();
				this.currentYear = anchor.getFullYear();
				this.renderCalendar();
				this.positionCalendar();
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

	private handleDayClick(clicked: Date): void {
		if (this.selecting === 'start' || !this.startDate) {
			// One click is already a complete period: start === end === clicked.
			this.startDate = clicked;
			this.endDate = clicked;
			this.selecting = 'end';
		} else {
			// Second click expands the range; clicking before the anchor just
			// swaps the ends.
			if (clicked < this.startDate) {
				this.endDate = this.startDate;
				this.startDate = clicked;
			} else {
				this.endDate = clicked;
			}
			this.selecting = 'start';
			this.hoverDate = null;
		}

		// If the clicked day lives in an adjacent month, follow it.
		this.currentMonth = clicked.getMonth();
		this.currentYear = clicked.getFullYear();

		this.renderCalendar();
		this.positionCalendar();
	}

	private shiftMonth(delta: number): void {
		this.currentMonth += delta;
		if (this.currentMonth < 0) {
			this.currentMonth = 11;
			this.currentYear--;
		} else if (this.currentMonth > 11) {
			this.currentMonth = 0;
			this.currentYear++;
		}
		this.renderCalendar();
		this.positionCalendar();
	}

	/** The range to paint, including the hover preview while picking the end. */
	private getDisplayRange(): { start: Date; end: Date } | null {
		if (!this.startDate) return null;

		let start = this.startDate;
		let end = this.endDate ?? this.startDate;

		if (this.selecting === 'end' && this.hoverDate) {
			if (this.hoverDate < start) {
				end = start;
				start = this.hoverDate;
			} else {
				end = this.hoverDate;
			}
		}

		return { start, end };
	}

	private dayButtonHTML(date: Date, label: number, outsideMonth: boolean): string {
		const classes = ['cal-day'];
		if (outsideMonth) classes.push('other-month');

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const isToday = date.getTime() === today.getTime();
		if (isToday) classes.push('today');

		const range = this.getDisplayRange();
		let selected = false;
		if (range) {
			if (date > range.start && date < range.end) classes.push('in-range');
			if (date.getTime() === range.start.getTime()) classes.push('range-start');
			if (date.getTime() === range.end.getTime()) classes.push('range-end');
			selected = date >= range.start && date <= range.end;
		}

		const ariaLabel = date.toLocaleDateString(this.getLocale(), {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});

		return `<button type="button" class="${classes.join(' ')}" data-date="${this.toISODate(date)}" aria-label="${ariaLabel}" aria-pressed="${selected}"${isToday ? ' aria-current="date"' : ''}>${label}</button>`;
	}

	/** Repaint range classes from state — used by the hover preview. */
	private updateDayClasses(): void {
		const range = this.getDisplayRange();
		this.calendar.querySelectorAll<HTMLElement>('.cal-day[data-date]').forEach((btn) => {
			const date = this.parseISODate(btn.dataset.date!);
			btn.classList.remove('in-range', 'range-start', 'range-end');

			let selected = false;
			if (range) {
				if (date > range.start && date < range.end) btn.classList.add('in-range');
				if (date.getTime() === range.start.getTime()) btn.classList.add('range-start');
				if (date.getTime() === range.end.getTime()) btn.classList.add('range-end');
				selected = date >= range.start && date <= range.end;
			}
			btn.setAttribute('aria-pressed', String(selected));
		});
	}

	private toISODate(date: Date): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	private parseISODate(value: string): Date {
		const [y, m, d] = value.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	private getSelectionLabel(): string {
		if (this.startDate && this.endDate) {
			return this.formatRange(this.startDate, this.endDate, {
				month: 'short',
				day: 'numeric',
			});
		}
		if (this.startDate) {
			return translate('datetime.datepicker.start_pick_end', {
				start: this.fmtShort(this.startDate),
			});
		}
		return translate('datetime.datepicker.pick_start_date');
	}

	private shortcutToday(): void {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		this.startDate = today;
		this.endDate = today;
		this.selecting = 'start';
		this.hoverDate = null;
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
		this.hoverDate = null;
	}

	private shortcutThisMonth(): void {
		const now = new Date();
		this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
		this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		this.selecting = 'start';
		this.hoverDate = null;
	}

	private getLocale(): string {
		return getLanguagePackName() === 'pt' ? 'pt-BR' : 'en-US';
	}

	private fmtShort(d: Date): string {
		return d.toLocaleDateString(this.getLocale(), { month: 'short', day: 'numeric' });
	}

	/**
	 * Locale-aware range label. Intl.formatRange already collapses identical
	 * days into a single date and shares the month/year, so a 1-day selection
	 * reads as just "18 de mar. de 2027" instead of repeating the date twice.
	 */
	private formatRange(start: Date, end: Date, options: Intl.DateTimeFormatOptions): string {
		const locale = this.getLocale();
		const formatter = new Intl.DateTimeFormat(locale, options);
		const formatRange = (
			formatter as Intl.DateTimeFormat & {
				formatRange?: (from: Date, to: Date) => string;
			}
		).formatRange;

		if (typeof formatRange === 'function') {
			return formatRange.call(formatter, start, end);
		}

		// Fallback for engines without formatRange.
		const fmt = (d: Date) => d.toLocaleDateString(locale, options);
		return start.getTime() === end.getTime() ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
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
