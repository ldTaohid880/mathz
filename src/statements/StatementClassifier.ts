import type { CompiledExpression } from '../math/CompiledExpression';
import type { IExpressionCompiler } from '../math/IExpressionCompiler';
import type { Statement } from './Statement';

export interface IStatementClassifier {
	/**
	 * Parses an equation string (e.g. "y = sin(x)", "x^2 + y^2 = 25",
	 * "r = 3sin(2theta)", "x = 5cos(t), y = 3sin(t)") into a {@link Statement}.
	 * Throws an Error with a user-facing message on invalid input.
	 */
	classify(equation: string, extraVariables?: readonly string[]): Statement;
}

/**
 * Exact port of the original `Graph#compile` dispatch logic:
 * parametric (comma-split) -> polar ("r = ...") -> explicit ("x = ..." / "y = ..."
 * when the other variable is unused) -> implicit fallback.
 */
export class StatementClassifier implements IStatementClassifier {
	public constructor(private readonly compiler: IExpressionCompiler) {}

	public classify(equation: string, extraVariables: readonly string[] = []): Statement {
		if (equation.includes(',')) {
			return this.classifyParametric(equation, extraVariables);
		}

		const sides = equation.split('=');
		if (sides.length !== 2) {
			throw new Error('Use the form "y = ..." or "x^2 + y^2 = 25"');
		}
		const lhs = sides[0].trim().toLowerCase();

		if (lhs === 'r') {
			const fn = this.compiler.compile(sides[1], ['theta', ...extraVariables]);
			return { kind: 'polar', fn };
		}

		if (lhs === 'x' || lhs === 'y') {
			const rhs = this.compiler.compile(sides[1], ['x', 'y', ...extraVariables]);
			if (!rhs.usedVariables.has(lhs)) {
				const axis = lhs === 'y' ? 'x' : 'y';
				return { kind: 'explicit', axis, fn: rhs };
			}
		}

		const left = this.compiler.compile(sides[0], ['x', 'y', ...extraVariables]);
		const right = this.compiler.compile(sides[1], ['x', 'y', ...extraVariables]);
		return { kind: 'implicit', left, right };
	}

	private classifyParametric(equation: string, extraVariables: readonly string[] = []): Statement {
		const parts = equation.split(',').map((p) => p.split('='));
		if (parts.length !== 2 || parts.some((p) => p.length !== 2)) {
			throw new Error('Parametric form: "x = ..., y = ..." using t');
		}

		const side = (name: string): CompiledExpression => {
			const p = parts.find((q) => q[0].trim().toLowerCase() === name);
			if (!p) {
				throw new Error(
					'Parametric form needs both "x = ..." and "y = ..."',
				);
			}
			return this.compiler.compile(p[1], ['t', ...extraVariables]);
		};

		const fx = side('x');
		const fy = side('y');
		return { kind: 'parametric', fx, fy };
	}
}
