import type { RenderContext } from './RenderContext';
import type { ViewTransform } from './ViewTransform';

/**
 * Draws the background grid lines and axes. Exact port of `Graph#drawGrid`.
 *
 * Minor lines are drawn first and the axis lines last, so the axes are never
 * covered by later-drawn gridlines.
 */
export class GridRenderer {
	public constructor(
		private readonly view: ViewTransform,
		private readonly rc: RenderContext,
	) {}

	public draw(): void {
		const { view, rc } = this;
		const { size } = view;
		const step = view.niceStep();
		const { xmin, xmax, ymin, ymax } = view.bounds();

		// minor, major (every 5th), axis
		const colors = [rc.theme.gridMinor, rc.theme.gridMajor, rc.theme.axis];
		const level = (k: number): number => (k === 0 ? 2 : k % 5 === 0 ? 1 : 0);

		for (let lv = 0; lv < 3; lv++) {
			for (let k = Math.ceil(xmin / step); k <= Math.floor(xmax / step); k++) {
				if (level(k) !== lv) continue;
				const x = view.snap(view.toScreen({ x: k * step, y: 0 }).x);
				rc.line(x, 0, x, size, colors[lv]);
			}
			for (let k = Math.ceil(ymin / step); k <= Math.floor(ymax / step); k++) {
				if (level(k) !== lv) continue;
				const y = view.snap(view.toScreen({ x: 0, y: k * step }).y);
				rc.line(0, y, size, y, colors[lv]);
			}
		}
	}
}
