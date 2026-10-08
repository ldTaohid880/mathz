import type { Statement } from '../statements/Statement';
import type { CurveStyle } from './renderers/ICurveRenderer';
import type { ExplicitRenderer } from './renderers/ExplicitRenderer';
import type { ImplicitRenderer } from './renderers/ImplicitRenderer';
import type { ParametricRenderer } from './renderers/ParametricRenderer';
import type { PointRenderer } from './renderers/PointRenderer';
import type { PolarRenderer } from './renderers/PolarRenderer';
import type { FunctionDefinitionRenderer } from './renderers/FunctionDefinitionRenderer';
import type { InequalityRenderer } from './renderers/InequalityRenderer';
import type { RenderContext } from './RenderContext';
import type { ViewTransform } from './ViewTransform';

/**
 * Dispatches a {@link Statement} to the curve renderer matching its `kind`.
 * Mirrors the `switch` in the original `Graph#plotFunction`, but as a small
 * dependency-injected class instead of a private method on `Graph`.
 */
export class RendererRegistry {
	public constructor(
		private readonly explicit: ExplicitRenderer,
		private readonly implicit: ImplicitRenderer,
		private readonly polar: PolarRenderer,
		private readonly parametric: ParametricRenderer,
		private readonly point: PointRenderer,
		private readonly funcDef: FunctionDefinitionRenderer,
		private readonly inequality?: InequalityRenderer,
	) {}

	public getLayer(statement: Statement): number {
		if (statement.kind === 'inequality' && this.inequality) {
			return this.inequality.layer;
		}
		return 1;
	}

	public render(statement: Statement, view: ViewTransform, rc: RenderContext, style: CurveStyle): void {
		switch (statement.kind) {
			case 'explicit':
				this.explicit.render(statement, view, rc, style);
				return;
			case 'implicit':
				this.implicit.render(statement, view, rc, style);
				return;
			case 'polar':
				this.polar.render(statement, view, rc, style);
				return;
			case 'parametric':
				this.parametric.render(statement, view, rc, style);
				return;
			case 'point':
				this.point.render(statement, view, rc, style);
				return;
			case 'function':
				this.funcDef.render(statement, view, rc, style);
				return;
			case 'inequality':
				if (this.inequality) {
					this.inequality.render(statement, view, rc, style);
				}
				return;
			default: {
				const exhaustive: never = statement;
				throw new Error(`Unknown statement kind: ${JSON.stringify(exhaustive)}`);
			}
		}
	}
}
