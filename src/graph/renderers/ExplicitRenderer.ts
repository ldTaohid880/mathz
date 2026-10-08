import type { ExplicitStatement } from '../../statements/Statement';
import type { RenderContext } from '../RenderContext';
import type { ScreenPoint, ViewTransform } from '../ViewTransform';
import type { CurveStyle, ICurveRenderer } from './ICurveRenderer';

/**
 * Exact port of `Graph#plotExplicit`: one sample per pixel across the visible
 * area (so detail follows the zoom), with breaks inserted for non-finite
 * samples and for jumps bigger than the canvas (asymptotes like tan, 1/x).
 */
export class ExplicitRenderer implements ICurveRenderer<ExplicitStatement> {
	public render(
		statement: ExplicitStatement,
		view: ViewTransform,
		rc: RenderContext,
		style: CurveStyle,
	): void {
		const { axis, fn } = statement;
		const dep: 'x' | 'y' = axis === 'x' ? 'y' : 'x';
		const pts: Array<ScreenPoint | null> = [];
		let prev: ScreenPoint | null = null;

		for (let s = 0; s <= view.size; s++) {
			const t = axis === 'x' ? view.toWorld(s, 0).x : view.toWorld(0, s).y;
			const v = fn.evaluate(axis === 'x' ? { x: t } : { y: t });
			const q = Number.isFinite(v)
				? view.toScreen(axis === 'x' ? { x: t, y: v } : { x: v, y: t })
				: null;

			if (!q || Math.abs(q[dep]) > 1e6) {
				pts.push(null);
				prev = null;
				continue;
			}
			// A jump bigger than the canvas is an asymptote (tan, 1/x), so don't connect
			if (prev && Math.abs(q[dep] - prev[dep]) > view.size) {
				pts.push(null);
			}
			pts.push(q);
			prev = q;
		}
		rc.strokeCurve(pts, style.color, style.width);
	}
}
