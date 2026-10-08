import type { ImplicitStatement } from '../../statements/Statement';
import type { RenderContext, ScreenSegment } from '../RenderContext';
import type { ScreenPoint, ViewTransform } from '../ViewTransform';
import type { CurveStyle, ICurveRenderer } from './ICurveRenderer';

/** Fixed screen-space grid spacing (px) for the marching-squares scan. Matches the original default. */
const RESOLUTION = 3;

function differs(a: number, b: number): boolean {
	return a < 0 !== b < 0;
}

/** Linearly interpolates the zero-crossing x along a horizontal segment `(x0,y)` to `(x1,y)`. */
function crossX(x0: number, x1: number, a: number, b: number, y: number): ScreenPoint {
	return { x: x0 + (a / (a - b)) * (x1 - x0), y };
}

/** Linearly interpolates the zero-crossing y along a vertical segment `(x,y0)` to `(x,y1)`. */
function crossY(y0: number, y1: number, a: number, b: number, x: number): ScreenPoint {
	return { x, y: y0 + (a / (a - b)) * (y1 - y0) };
}

/**
 * Exact port of `Graph#plotImplicit`: marching squares over a screen-space grid
 * (spacing `RESOLUTION` px), evaluating `f(x,y) = left(x,y) - right(x,y)` at each
 * grid point and connecting sign-change crossings along each cell's 4 edges.
 * The saddle case (all 4 edges cross) is resolved by sampling the cell center and
 * pairing crossings so the resulting pair of segments doesn't cross the center sign.
 */
export class ImplicitRenderer implements ICurveRenderer<ImplicitStatement> {
	public render(
		statement: ImplicitStatement,
		view: ViewTransform,
		rc: RenderContext,
		style: CurveStyle,
	): void {
		const { left, right } = statement;
		const f = (x: number, y: number): number => left.evaluate({ x, y }) - right.evaluate({ x, y });

		const extent = view.extent;
		const n = Math.ceil(extent / RESOLUTION);
		const h = extent / n;

		const wx: number[] = [];
		const wy: number[] = [];
		for (let i = 0; i <= n; i++) {
			wx.push(view.toWorld(i * h, 0).x);
			wy.push(view.toWorld(0, i * h).y);
		}

		const vals: number[][] = [];
		for (let j = 0; j <= n; j++) {
			const row: number[] = [];
			for (let i = 0; i <= n; i++) {
				row.push(f(wx[i], wy[j]));
			}
			vals.push(row);
		}

		const segments: ScreenSegment[] = [];
		for (let j = 0; j < n; j++) {
			for (let i = 0; i < n; i++) {
				const tl = vals[j][i];
				const tr = vals[j][i + 1];
				const bl = vals[j + 1][i];
				const br = vals[j + 1][i + 1];
				if (!Number.isFinite(tl) || !Number.isFinite(tr) || !Number.isFinite(bl) || !Number.isFinite(br)) {
					continue;
				}

				const x0 = i * h;
				const x1 = (i + 1) * h;
				const y0 = j * h;
				const y1 = (j + 1) * h;

				const top = differs(tl, tr) ? crossX(x0, x1, tl, tr, y0) : null;
				const bottom = differs(bl, br) ? crossX(x0, x1, bl, br, y1) : null;
				const edgeLeft = differs(tl, bl) ? crossY(y0, y1, tl, bl, x0) : null;
				const edgeRight = differs(tr, br) ? crossY(y0, y1, tr, br, x1) : null;

				const crossings = [top, bottom, edgeLeft, edgeRight].filter(
					(p): p is ScreenPoint => p !== null,
				);

				if (crossings.length === 2) {
					segments.push([crossings[0], crossings[1]]);
				} else if (crossings.length === 4) {
					const centerWorld = view.toWorld(x0 + h / 2, y0 + h / 2);
					const centerVal = f(centerWorld.x, centerWorld.y);
					if (differs(tl, centerVal)) {
						segments.push([top!, edgeLeft!], [bottom!, edgeRight!]);
					} else {
						segments.push([top!, edgeRight!], [bottom!, edgeLeft!]);
					}
				}
			}
		}

		rc.strokeSegments(segments, style.color, style.width);
	}
}
