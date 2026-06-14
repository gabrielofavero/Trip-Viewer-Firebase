/**
 * Edit Pages — Horizontal Tab Bar Switching Logic
 * Phase 3 — edit-styling-guide.md
 *
 * Handles tab clicks on .edit-tab-bar: shows the matching section,
 * hides all others. The double-buttons (save/cancel) section is always visible.
 * On page load, only the "basic-information" (basic information) tab is shown.
 */
export function initEditTabs(): void {
	const tabBar = document.getElementById("edit-tab-bar");
	if (!tabBar) return;

	const tabs = tabBar.querySelectorAll<HTMLElement>(".edit-tab");
	const sections = document.querySelectorAll<HTMLElement>(
		".edit-page-content section[data-category]"
	);

	function filterSections(activeCategory: string): void {
		sections.forEach((section) => {
			const sectionCategory = section.dataset.category;
			// Always keep the double-buttons (save/cancel) section visible
			if (sectionCategory === "double-buttons") {
				section.style.display = "block";
				return;
			}
			section.style.display =
				sectionCategory === activeCategory ? "block" : "none";
		});
	}

	// On page load, show only basic information (basic-information)
	filterSections("basic-information");

	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			const category = tab.dataset.tab;
			if (!category) return;

			// Update active tab styling
			tabs.forEach((t) => t.classList.remove("active"));
			tab.classList.add("active");

			// Filter sections to show only the selected category
			filterSections(category);
		});
	});
}
