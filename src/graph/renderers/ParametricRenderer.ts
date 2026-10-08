import type { ParametricStatement } from '../../statements/Statement';
import type { RenderContext } from '../RenderContext';
import type { ScreenPoint, ViewTransform } from '../ViewTransform';
import type { CurveStyle, ICurveRenderer } from './ICurveRenderer';

function ok(v: number): boolean {
	return Number.isFinite(v) && Math.abs(v) < 1e6;
}

/** Exact port of `Graph#plotParametric`: samples `x = fx(t), y = fy(t)` over `[0, 2*PI]` by default. */
export class ParametricRenderer implements ICurveRenderer<ParametricStatement> {
	public render(
		statement: ParametricStatement,
		view: ViewTransform,
		rc: RenderContext,
		style: CurveStyle,
	): void {
		const { fx, fy } = statement;
		const [a, b] = [0, Math.PI * 2];
		const steps = Math.max(2, Math.round((b - a) / 0.01));
		const pts: Array<ScreenPoint | null> = [];

		for (let i = 0; i <= steps; i++) {
			const t = a + ((b - a) * i) / steps;
			const x = fx.evaluate({ t });
			const y = fy.evaluate({ t });
			pts.push(ok(x) && ok(y) ? view.toScreen({ x, y }) : null);
		}
		rc.strokeCurve(pts, style.color, style.width);
	}
}
