// ======= Lazy / Infinite-Scroll Card Grid =======
//
// Renders a card grid one batch at a time, appending the next batch as the
// user scrolls near the sentinel element placed right after the grid.
// Each instance owns its item list + search query, so every grid can be
// filtered independently (search by title).

export class LazyGrid {
	private items: any[] = [];
	private query = '';
	private visibleCount = 0;
	private readonly observer: IntersectionObserver;

	constructor(
		private readonly grid: HTMLElement,
		private readonly sentinel: HTMLElement,
		private readonly renderItem: (item: any) => string,
		private readonly batchSize = 8,
	) {
		this.observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					this.loadMore();
				}
			},
			{ root: null, rootMargin: '500px 0px', threshold: 0 },
		);
		this.observer.observe(sentinel);
	}

	setItems(items: any[]) {
		this.items = items || [];
		this.visibleCount = 0;
		this.render();
	}

	setQuery(query: string) {
		const normalized = (query || '').trim().toLowerCase();
		if (this.query === normalized) return;
		this.query = normalized;
		this.visibleCount = 0;
		this.render();
	}

	getMatchingCount(): number {
		return this.filtered().length;
	}

	private filtered(): any[] {
		if (!this.query) return this.items;
		return this.items.filter((item) => {
			const title = String(item?.title || '').toLowerCase();
			return title.includes(this.query);
		});
	}

	private render() {
		const filtered = this.filtered();
		this.visibleCount = Math.min(this.batchSize, filtered.length);
		this.grid.innerHTML = filtered
			.slice(0, this.visibleCount)
			.map((item) => this.renderItem(item))
			.join('');
		this.updateSentinel(filtered.length > this.visibleCount);
	}

	private loadMore() {
		const filtered = this.filtered();
		if (this.visibleCount >= filtered.length) {
			this.updateSentinel(false);
			return;
		}
		const next = Math.min(this.visibleCount + this.batchSize, filtered.length);
		const html = filtered
			.slice(this.visibleCount, next)
			.map((item) => this.renderItem(item))
			.join('');
		this.grid.insertAdjacentHTML('beforeend', html);
		this.visibleCount = next;
		this.updateSentinel(filtered.length > this.visibleCount);
	}

	private updateSentinel(hasMore: boolean) {
		this.sentinel.style.display = hasMore ? 'block' : 'none';
	}
}
