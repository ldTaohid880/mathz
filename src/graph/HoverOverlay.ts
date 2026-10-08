import type { RenderContext } from './RenderContext';
import type { ScreenPoint, ViewTransform } from './ViewTransform';

/**
 * Draws the hover crosshair, dot, and world-coordinate tooltip at the pointer
 * position. Exact port of `Graph#drawHover`.
 */
export class HoverOverlay {
	public constructor(
		private readonly view: ViewTransform,
		private readonly rc: RenderContext,
	) {}

	public draw(pointer: ScreenPoint): void {
		const { view, rc } = this;
		const { x, y } = pointer;
		const w = view.toWorld(x, y);

		// Enough decimals to be accurate to about one pixel at this zoom
		const d = Math.max(0, Math.ceil(Math.log10(view.currentScale)));
		const f = (v: number): string => (+v.toFixed(d)).toFixed(d); // avoids "-0.00"

		const cx = Math.floor(x) + 0.5;
		const cy = Math.floor(y) + 0.5;

		rc.crosshair(cx, cy, rc.theme.cross);
		rc.circle({ x: cx, y: cy }, 3, rc.theme.tipBg);

		// Flip the tooltip near the right / top edges
		const right = x > view.size * 0.6;
		const top = y < 30;
		rc.text(
			`(${f(w.x)}, ${f(w.y)})`,
			x + (right ? -12 : 12),
			y + (top ? 12 : -12),
			right ? 'right' : 'left',
			top ? 'top' : 'bottom',
			{ bg: rc.theme.tipBg, fg: rc.theme.tipFg },
		);
	}
}
