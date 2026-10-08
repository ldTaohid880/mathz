import type { CompiledExpression } from '../math/CompiledExpression';
import type { IExpressionCompiler } from '../math/IExpressionCompiler';
import type { Statement } from './Statement';

import type { IUserFunctionStore } from './IUserFunctionStore';

export interface ClassifyOptions {
	readonly extraVariables?: readonly string[];
	readonly userFunctions?: Readonly<Record<string, number>> | ReadonlyMap<string, number>;
	readonly userFunctionStore?: IUserFunctionStore;
	readonly isFunctionDefinition?: boolean;
}

export interface IStatementClassifier {
	/**
	 * Parses an equation string (e.g. "y = sin(x)", "x^2 + y^2 = 25",
	 * "r = 3sin(2theta)", "x = 5cos(t), y = 3sin(t)") into a {@link Statement}.
	 * Throws an Error with a user-facing message on invalid input.
	 */
	classify(equation: string, extraVariablesOrOptions?: readonly string[] | ClassifyOptions): Statement;
}

/**
 * Exact port of the original `Graph#compile` dispatch logic:
 * parametric (comma-split) -> polar ("r = ...") -> explicit ("x = ..." / "y = ..."
 * when the other variable is unused) -> implicit fallback.
 */
export class StatementClassifier implements IStatementClassifier {
	public constructor(private readonly compiler: IExpressionCompiler) {}

	public classify(
		equation: string,
		extraVariablesOrOptions: readonly string[] | ClassifyOptions = [],
	): Statement {
		const options: ClassifyOptions = Array.isArray(extraVariablesOrOptions)
			? { extraVariables: extraVariablesOrOptions as readonly string[] }
			: (extraVariablesOrOptions as ClassifyOptions);

		const extraVariables = options.extraVariables ?? [];
		const userFunctions = options.userFunctions;
		const userFunctionStore = options.userFunctionStore;

		const trimmed = equation.trim();

		// Function definition rule:
		// Text before first '=' must match name(ident {, ident}) where name and every param are valid identifiers
		if (trimmed.includes('=')) {
			const eqIdx = trimmed.indexOf('=');
			const lhsRaw = trimmed.slice(0, eqIdx).trim();
			const rhsRaw = trimmed.slice(eqIdx + 1).trim();
			const fnHeader = StatementClassifier.parseFunctionHeader(lhsRaw);
			if (fnHeader && options.isFunctionDefinition) {
				const body = this.compiler.compile(rhsRaw, {
					variableNames: [...fnHeader.params, ...extraVariables],
					userFunctions,
					userFunctionStore,
					isFunctionBody: true,
				});
				return {
					kind: 'function',
					name: fnHeader.name,
					params: fnHeader.params,
					body,
					source: trimmed,
				};
			}
		}

		// Point statement rule: contains no '=' and starts with '('
		if (!trimmed.includes('=') && trimmed.startsWith('(')) {
			const pointStmt = this.tryClassifyPoint(trimmed, extraVariables, userFunctions, userFunctionStore);
			if (pointStmt) {
				return pointStmt;
			}
		}

		if (equation.includes(',')) {
			return this.classifyParametric(equation, extraVariables, userFunctions, userFunctionStore);
		}

		const sides = equation.split('=');
		if (sides.length !== 2) {
			throw new Error('Use the form "y = ..." or "x^2 + y^2 = 25"');
		}
		const lhs = sides[0].trim().toLowerCase();

		if (lhs === 'r') {
			const fn = this.compiler.compile(sides[1], {
				variableNames: ['theta', ...extraVariables],
				userFunctions,
				userFunctionStore,
			});
			return { kind: 'polar', fn };
		}

		if (lhs === 'x' || lhs === 'y') {
			const rhs = this.compiler.compile(sides[1], {
				variableNames: ['x', 'y', ...extraVariables],
				userFunctions,
				userFunctionStore,
			});
			if (!rhs.usedVariables.has(lhs)) {
				const axis = lhs === 'y' ? 'x' : 'y';
				return { kind: 'explicit', axis, fn: rhs };
			}
		}

		const left = this.compiler.compile(sides[0], {
			variableNames: ['x', 'y', ...extraVariables],
			userFunctions,
			userFunctionStore,
		});
		const right = this.compiler.compile(sides[1], {
			variableNames: ['x', 'y', ...extraVariables],
			userFunctions,
			userFunctionStore,
		});
		return { kind: 'implicit', left, right };
	}

	private tryClassifyPoint(
		input: string,
		extraVariables: readonly string[],
		userFunctions?: Readonly<Record<string, number>> | ReadonlyMap<string, number>,
		userFunctionStore?: IUserFunctionStore,
	): Statement | null {
		// Extract label if present: double quotes at the end
		let body = input;
		let label: string | undefined = undefined;

		const firstQuote = input.indexOf('"');
		if (firstQuote !== -1) {
			const lastQuote = input.lastIndexOf('"');
			if (firstQuote === lastQuote) {
				throw new Error('Unterminated string label in point statement');
			}
			const afterLastQuote = input.slice(lastQuote + 1).trim();
			if (afterLastQuote !== '') {
				throw new Error(`Unexpected characters after label: "${afterLastQuote}"`);
			}
			const labelText = input.slice(firstQuote + 1, lastQuote);
			if (labelText.length > 0) {
				label = labelText;
			}
			body = input.slice(0, firstQuote).trim();
		}

		// Split body into groups separated by top-level commas (paren depth 0)
		const groups: string[] = [];
		let current = '';
		let depth = 0;

		for (let i = 0; i < body.length; i++) {
			const ch = body[i];
			if (ch === '(') {
				depth++;
				current += ch;
			} else if (ch === ')') {
				depth--;
				current += ch;
				if (depth < 0) {
					throw new Error('A point needs two coordinates: (x, y)');
				}
			} else if (ch === ',' && depth === 0) {
				const grp = current.trim();
				if (!grp) {
					throw new Error('A point needs two coordinates: (x, y)');
				}
				groups.push(grp);
				current = '';
			} else {
				current += ch;
			}
		}

		if (depth !== 0) {
			throw new Error('A point needs two coordinates: (x, y)');
		}

		const lastGrp = current.trim();
		if (!lastGrp) {
			throw new Error('A point needs two coordinates: (x, y)');
		}
		groups.push(lastGrp);

		// Verify every group starts with '(' and ends with ')'
		for (const g of groups) {
			if (!g.startsWith('(') || !g.endsWith(')')) {
				return null;
			}
		}

		const FORBIDDEN_VARS = new Set(['x', 'y', 't', 'r', 'theta']);
		const compiledPoints: Array<{ x: CompiledExpression; y: CompiledExpression }> = [];

		for (const g of groups) {
			const inside = g.slice(1, -1);
			// Must contain exactly one comma at depth 0 inside parentheses (which is depth 1 overall)
			const coords: string[] = [];
			let coordCur = '';
			let insideDepth = 0;

			for (let i = 0; i < inside.length; i++) {
				const ch = inside[i];
				if (ch === '(') {
					insideDepth++;
					coordCur += ch;
				} else if (ch === ')') {
					insideDepth--;
					coordCur += ch;
				} else if (ch === ',' && insideDepth === 0) {
					coords.push(coordCur.trim());
					coordCur = '';
				} else {
					coordCur += ch;
				}
			}
			coords.push(coordCur.trim());

			if (coords.length !== 2 || !coords[0] || !coords[1]) {
				throw new Error('A point needs two coordinates: (x, y)');
			}

			// Compile each coordinate, allowing only extraVariables + forbidden check
			const compileCoord = (src: string): CompiledExpression => {
				const compiled = this.compiler.compile(src, {
					variableNames: ['x', 'y', 't', 'r', 'theta', ...extraVariables],
					userFunctions,
					userFunctionStore,
				});
				for (const v of compiled.usedVariables) {
					if (FORBIDDEN_VARS.has(v)) {
						throw new Error("Points can't use x or y.");
					}
				}
				return compiled;
			};

			const xExpr = compileCoord(coords[0]);
			const yExpr = compileCoord(coords[1]);
			compiledPoints.push({ x: xExpr, y: yExpr });
		}

		return {
			kind: 'point',
			source: input,
			points: compiledPoints,
			...(label !== undefined ? { label } : {}),
		};
	}

	private classifyParametric(
		equation: string,
		extraVariables: readonly string[] = [],
		userFunctions?: Readonly<Record<string, number>> | ReadonlyMap<string, number>,
		userFunctionStore?: IUserFunctionStore,
	): Statement {
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
			return this.compiler.compile(p[1], {
				variableNames: ['t', ...extraVariables],
				userFunctions,
				userFunctionStore,
			});
		};

		const fx = side('x');
		const fy = side('y');
		return { kind: 'parametric', fx, fy };
	}

	public static parseFunctionHeader(lhs: string): { name: string; params: string[] } | null {
		const trimmed = lhs.trim();
		// Match: name(ident {, ident}) where name and every param are valid identifiers
		const m = trimmed.match(/^([a-zA-Z][a-zA-Z0-9]*)\s*\(([^)]+)\)$/);
		if (!m) return null;

		const name = m[1].toLowerCase();
		const rawParams = m[2].split(',').map((p) => p.trim());
		const params: string[] = [];

		for (const p of rawParams) {
			if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(p)) {
				return null;
			}
			params.push(p.toLowerCase());
		}

		if (params.length === 0) return null;
		return { name, params };
	}
}
