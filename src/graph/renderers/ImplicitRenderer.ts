import type { ImplicitStatement } from '../../statements/Statement';
import type { IMarchingSquares } from '../MarchingSquares';
import { MarchingSquares } from '../MarchingSquares';
import type { RenderContext } from '../RenderContext';
import type { ViewTransform } from '../ViewTransform';
import type { CurveStyle, ICurveRenderer } from './ICurveRenderer';

/** Fixed screen-space grid spacing (px) for the marching-squares scan. Matches the original default. */
const RESOLUTION = 3;

/**
 * Exact port of `Graph#plotImplicit`: marching squares over a screen-space grid
 * (spacing `RESOLUTION` px), evaluating `f(x,y) = left(x,y) - right(x,y)` at each
 * grid point and connecting sign-change crossings along each cell's 4 edges.
 * The saddle case (all 4 edges cross) is resolved by sampling the cell center and
 * pairing crossings so the resulting pair of segments doesn't cross the center sign.
 */
export class ImplicitRenderer implements ICurveRenderer<ImplicitStatement> {
	public constructor(private readonly marchingSquares: IMarchingSquares = new MarchingSquares()) {}

	public render(
		statement: ImplicitStatement,
		view: ViewTransform,
		rc: RenderContext,
		style: CurveStyle,
	): void {
		const { left, right, domain } = statement;
		const f = (x: number, y: number): number =>
			left.evaluate({ ...rc.params, x, y }) - right.evaluate({ ...rc.params, x, y });

		let segments = this.marchingSquares.trace(f, view, RESOLUTION);

		if (domain) {
			segments = segments.filter(([p1, p2]) => {
				const mx = (p1.x + p2.x) / 2;
				const my = (p1.y + p2.y) / 2;
				const midWorld = view.toWorld(mx, my);
				return domain.test({ ...rc.params, x: midWorld.x, y: midWorld.y });
			});
		}

		rc.strokeSegments(segments, style.color, style.width);
	}
}
