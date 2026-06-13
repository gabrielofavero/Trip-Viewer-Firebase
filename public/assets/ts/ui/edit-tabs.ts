/**
 * Edit Pages — Horizontal Tab Bar Switching Logic
 * Phase 3 — edit-styling-guide.md
 *
 * Handles tab clicks on .edit-tab-bar: shows the matching section,
 * hides all others. The Save tab triggers the existing save button.
 */
export function initEditTabs(): void {
	const tabBar = document.getElementById("edit-tab-bar");
	if (!tabBar) return;

	const tabs = tabBar.querySelectorAll<HTMLElement>(".edit-tab");
	const sections = document.querySelectorAll<HTMLElement>(
		".demo-page-content section[data-category]"
	);

	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			const category = tab.dataset.tab;
			if (!category) return;

			// Save tab — trigger the existing save button click
			if (category === "double-buttons") {
				const saveBtn = document.querySelector<HTMLElement>(
					"#double-button-section .btn-theme, #double-button-section .btn-primary-theme"
				);
				saveBtn?.click();
				return;
			}

			// Update active tab styling
			tabs.forEach((t) => t.classList.remove("active"));
			tab.classList.add("active");

			// Show matching section, hide all others
			sections.forEach((section) => {
				const sectionCategory = section.dataset.category;
				section.style.display =
					sectionCategory === category ? "block" : "none";
			});
		});
	});
}
