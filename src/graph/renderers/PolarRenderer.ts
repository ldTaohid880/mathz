import type { PolarStatement } from '../../statements/Statement';
import type { RenderContext } from '../RenderContext';
import type { ScreenPoint, ViewTransform } from '../ViewTransform';
import type { CurveStyle, ICurveRenderer } from './ICurveRenderer';

/** Exact port of `Graph#plotPolar`: samples `r = fn(theta)` over `[0, 4*PI]` by default. */
export class PolarRenderer implements ICurveRenderer<PolarStatement> {
	public render(
		statement: PolarStatement,
		view: ViewTransform,
		rc: RenderContext,
		style: CurveStyle,
	): void {
		const { fn } = statement;
		const [a, b] = [0, Math.PI * 4];
		const steps = Math.max(2, Math.round((b - a) / 0.01));
		const pts: Array<ScreenPoint | null> = [];

		for (let i = 0; i <= steps; i++) {
			const theta = a + ((b - a) * i) / steps;
			const r = fn.evaluate({ theta });
			pts.push(
				Number.isFinite(r) && Math.abs(r) < 1e6
					? view.toScreen({ x: r * Math.cos(theta), y: r * Math.sin(theta) })
					: null,
			);
		}
		rc.strokeCurve(pts, style.color, style.width);
	}
}
