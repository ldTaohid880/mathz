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

/** One or more discrete points `(x, y)` plotted with optional label. */
export interface PointStatement {
	readonly kind: 'point';
	readonly source: string;
	readonly points: ReadonlyArray<{
		readonly x: CompiledExpression;
		readonly y: CompiledExpression;
	}>;
	readonly label?: string;
}

/** User-defined function definition `f(x) = expr`. */
export interface FunctionStatement {
	readonly kind: 'function';
	readonly name: string;
	readonly params: readonly string[];
	readonly body: CompiledExpression;
	readonly source: string;
	readonly error?: string;
}

export type Statement =
	| ExplicitStatement
	| PolarStatement
	| ParametricStatement
	| ImplicitStatement
	| PointStatement
	| FunctionStatement;
