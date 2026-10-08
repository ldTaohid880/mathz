import type { RenderContext } from './RenderContext';
import type { ViewTransform } from './ViewTransform';

/**
 * Draws axis tick labels at every major gridline. Exact port of `Graph#drawLabels`.
 *
 * Relies on `RenderContext#text`'s box-clamping so labels stick to the canvas
 * edge instead of disappearing when an axis is panned out of view.
 */
export class LabelRenderer {
	public constructor(
		private readonly view: ViewTransform,
		private readonly rc: RenderContext,
	) {}

	public draw(): void {
		const { view, rc } = this;
		const step = view.niceStep() * 5; // label every major line
		const { xmin, xmax, ymin, ymax } = view.bounds();
		const origin = view.toScreen({ x: 0, y: 0 });
		const m = 6; // labelMargin

		for (let k = Math.ceil(xmin / step); k <= Math.floor(xmax / step); k++) {
			const x = view.toScreen({ x: k * step, y: 0 }).x;
			rc.text(view.fmt(k * step), x, origin.y + m, 'center', 'top');
		}
		for (let k = Math.ceil(ymin / step); k <= Math.floor(ymax / step); k++) {
			if (k === 0) continue; // the x axis already shows 0
			const y = view.toScreen({ x: 0, y: k * step }).y;
			rc.text(view.fmt(k * step), origin.x - m, y, 'right', 'middle');
		}
	}
}
