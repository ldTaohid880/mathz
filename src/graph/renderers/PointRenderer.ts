import type { PointStatement } from '../../statements/Statement';
import type { RenderContext } from '../RenderContext';
import type { ScreenPoint, ViewTransform } from '../ViewTransform';
import type { CurveStyle, ICurveRenderer } from './ICurveRenderer';

export class PointRenderer implements ICurveRenderer<PointStatement> {
	public render(
		statement: PointStatement,
		view: ViewTransform,
		rc: RenderContext,
		style: CurveStyle,
	): void {
		const margin = 10;
		const minBound = -margin;
		const maxBound = view.size + margin;

		for (const pt of statement.points) {
			const xVal = pt.x.evaluate(rc.params);
			const yVal = pt.y.evaluate(rc.params);

			if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) {
				continue;
			}

			const screenPt: ScreenPoint = view.toScreen({ x: xVal, y: yVal });
			if (
				screenPt.x < minBound ||
				screenPt.x > maxBound ||
				screenPt.y < minBound ||
				screenPt.y > maxBound
			) {
				continue;
			}

			// Draw filled circle (radius 4) in statement color with a 2px border in theme bg
			// 2px border outside/around radius 4 circle: draw circle of radius 4 + 2 = 6 in bg, then radius 4 in color
			rc.circle(screenPt, 6, rc.theme.bg);
			rc.circle(screenPt, 4, style.color);

			// If a label exists, draw it above-right of the dot using existing label/tooltip text drawing helper
			// box style as hover tooltips: background theme.bg, text theme.text, clamped inside canvas
			if (statement.label) {
				rc.text(
					statement.label,
					screenPt.x + 8,
					screenPt.y - 8,
					'left',
					'bottom',
					{ bg: rc.theme.bg, fg: rc.theme.text },
				);
			}
		}
	}
}
