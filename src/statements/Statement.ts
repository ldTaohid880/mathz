import type { CompiledExpression } from '../math/CompiledExpression';

/** "y = f(x)" or "x = f(y)" plotted as a function of the independent axis. */
export interface ExplicitStatement {
	readonly kind: 'explicit';
	/** The axis the curve is a function of: 'x' means y = f(x), 'y' means x = f(y). */
	readonly axis: 'x' | 'y';
	readonly fn: CompiledExpression;
}

/** "r = f(theta)" plotted in polar coordinates. */
export interface PolarStatement {
	readonly kind: 'polar';
	readonly fn: CompiledExpression;
}

/** "x = f(t), y = g(t)" plotted as a parametric curve. */
export interface ParametricStatement {
	readonly kind: 'parametric';
	readonly fx: CompiledExpression;
	readonly fy: CompiledExpression;
}

/** "left(x, y) = right(x, y)" plotted via marching squares on left - right = 0. */
export interface ImplicitStatement {
	readonly kind: 'implicit';
	readonly left: CompiledExpression;
	readonly right: CompiledExpression;
}

export type Statement =
	| ExplicitStatement
	| PolarStatement
	| ParametricStatement
	| ImplicitStatement;
