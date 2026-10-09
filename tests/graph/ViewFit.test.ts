import { describe, expect, it } from 'vitest';
import { ViewTransform } from '../../src/graph/ViewTransform';
import { DirectiveParser } from '../../src/statements/DirectiveParser';

describe('View Fit Math', () => {
	it('calculates correct center and scale for @view -2 12 -3 3', () => {
		const parser = new DirectiveParser();
		const { directives } = parser.parse(['@view -2 12 -3 3']);
		expect(directives.view).toBeDefined();

		if (directives.view) {
			const { xmin, xmax, ymin, ymax } = directives.view;
			const view = new ViewTransform();
			view.setSize(421); // extent = 420

			const homeCx = (xmin + xmax) / 2;
			const homeCy = (ymin + ymax) / 2;
			const xspan = xmax - xmin;
			const yspan = ymax - ymin;
			const homeScale = view.extent / Math.max(xspan, yspan);

			expect(homeCx).toBe(5);
			expect(homeCy).toBe(0);
			// xspan = 14, yspan = 6, max span = 14. extent = 420.
			// scale = 420 / 14 = 30
			expect(homeScale).toBe(30);

			view.setHomeView({ cx: homeCx, cy: homeCy, scale: homeScale });
			view.reset();

			expect(view.centerX).toBe(5);
			expect(view.centerY).toBe(0);
			expect(view.currentScale).toBe(30);
		}
	});

	it('reload keeps user pan/zoom unless @view line text changed', () => {
		let lastViewDirectiveLineText: string | undefined = undefined;

		const processReload = (
			rawLines: string[],
			currentView: { cx: number; cy: number; scale: number },
		) => {
			const viewLine = rawLines.find((l) => /^\s*@view\b/i.test(l));
			const currentViewLineText = viewLine ? viewLine.trim() : undefined;
			const viewLineChanged = currentViewLineText !== lastViewDirectiveLineText;
			lastViewDirectiveLineText = currentViewLineText;

			const view = new ViewTransform();
			view.setSize(421);

			const parser = new DirectiveParser();
			const { directives } = parser.parse(rawLines);

			let homeCx = 0;
			let homeCy = 0;
			let homeScale = 21; // default

			if (directives.view) {
				const { xmin, xmax, ymin, ymax } = directives.view;
				homeCx = (xmin + xmax) / 2;
				homeCy = (ymin + ymax) / 2;
				homeScale = view.extent / Math.max(xmax - xmin, ymax - ymin);
			}

			view.setHomeView({ cx: homeCx, cy: homeCy, scale: homeScale });

			if (viewLineChanged) {
				view.setState({ cx: homeCx, cy: homeCy, scale: homeScale });
			} else {
				view.setState(currentView);
			}

			return view;
		};

		// Initial load with @view -2 12 -3 3
		const initialLines = ['@view -2 12 -3 3', 'y = sin(x)'];
		let view = processReload(initialLines, { cx: 0, cy: 0, scale: 20 });
		expect(view.centerX).toBe(5);
		expect(view.currentScale).toBe(30);

		// User pans the view
		view.panBy(50, -50);
		const userState = { cx: view.centerX, cy: view.centerY, scale: view.currentScale };

		// Reload 1: User edits equation text without changing @view line
		const reloadLines1 = ['@view -2 12 -3 3', 'y = cos(x)'];
		view = processReload(reloadLines1, userState);
		// Should keep user panned view!
		expect(view.centerX).toBe(userState.cx);

		// Reload 2: User changes @view line text
		const reloadLines2 = ['@view -5 5 -5 5', 'y = cos(x)'];
		view = processReload(reloadLines2, userState);
		// Should update to new home view (cx = 0, cy = 0)!
		expect(view.centerX).toBe(0);
	});
});
