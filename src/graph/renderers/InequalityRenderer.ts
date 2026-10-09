import type { InequalityStatement } from '../../statements/Statement';
import type { IMarchingSquares } from '../MarchingSquares';
import { MarchingSquares } from '../MarchingSquares';
import type { RenderContext } from '../RenderContext';
import type { ViewTransform } from '../ViewTransform';
import type { CurveStyle, ICurveRenderer } from './ICurveRenderer';

const RESOLUTION = 3;

export class InequalityRenderer implements ICurveRenderer<InequalityStatement> {
	public readonly layer = 0;

	public constructor(private readonly marchingSquares: IMarchingSquares = new MarchingSquares()) {}

	public render(
		statement: InequalityStatement,
		view: ViewTransform,
		rc: RenderContext,
		style: CurveStyle,
	): void {
		const { left, right, op, domain } = statement;
		const f = (x: number, y: number): number =>
			left.evaluate({ ...rc.params, x, y }) - right.evaluate({ ...rc.params, x, y });

		const extent = view.extent;
		const n = Math.ceil(extent / RESOLUTION);
		const h = extent / n;

		const isInside = (i: number, j: number): boolean => {
			const cx = (i + 0.5) * h;
			const cy = (j + 0.5) * h;
			const centerWorld = view.toWorld(cx, cy);
			const scope = { ...rc.params, x: centerWorld.x, y: centerWorld.y };
			const v = f(centerWorld.x, centerWorld.y);

			if (!Number.isFinite(v)) return false;

			let inside = false;
			if (op === '>' || op === '>=') {
				inside = v > 0;
			} else {
				inside = v < 0;
			}

			if (inside && domain) {
				return domain.test(scope);
			}
			return inside;
		};

		// 1. Shading fill
		const ctx = rc.ctx;
		ctx.save();
		ctx.fillStyle = style.color;
		ctx.globalAlpha = 0.25;

		for (let j = 0; j < n; j++) {
			let startI: number | null = null;
			for (let i = 0; i <= n; i++) {
				const inside = i < n && isInside(i, j);
				if (inside) {
					if (startI === null) {
						startI = i;
					}
				} else {
					if (startI !== null) {
						ctx.fillRect(startI * h, j * h, (i - startI) * h, h);
						startI = null;
					}
				}
			}
		}
		ctx.restore();

		// 2. Boundary tracing
		let segments = this.marchingSquares.trace(f, view, RESOLUTION);
		if (domain) {
			segments = segments.filter(([p1, p2]) => {
				const mx = (p1.x + p2.x) / 2;
				const my = (p1.y + p2.y) / 2;
				const midWorld = view.toWorld(mx, my);
				return domain.test({ ...rc.params, x: midWorld.x, y: midWorld.y });
			});
		}

		ctx.save();
		if (op === '<' || op === '>') {
			ctx.setLineDash([6, 5]);
		} else {
			ctx.setLineDash([]);
		}
		rc.strokeSegments(segments, style.color, style.width);
		ctx.restore();
	}
}
