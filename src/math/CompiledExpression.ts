import { Scope } from "./Evaluator";

/** A parsed, directly-callable math expression. */
export interface CompiledExpression {
	evaluate(scope: Scope): number;
	/** Declared variable names actually referenced by the expression (e.g. only `x` in `sin(x)`). */
	readonly usedVariables: ReadonlySet<string>;
}
