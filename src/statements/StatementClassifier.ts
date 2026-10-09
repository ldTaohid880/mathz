import type { CompiledExpression } from '../math/CompiledExpression';
import type { IExpressionCompiler } from '../math/IExpressionCompiler';
import { ConditionParser } from './ConditionParser';
import type { IConditionParser } from './IConditionParser';
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

export class StatementClassifier implements IStatementClassifier {
	private readonly conditionParser: IConditionParser;

	public constructor(
		private readonly compiler: IExpressionCompiler,
		conditionParser?: IConditionParser,
	) {
		this.conditionParser = conditionParser ?? new ConditionParser(compiler);
	}

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

		// Check and extract domain text if present
		const { bodyText, domainText } = this.extractDomain(trimmed);

		const stmt = this.classifyBody(bodyText, options, extraVariables, userFunctions, userFunctionStore);

		if (domainText !== undefined) {
			if (stmt.kind === 'point' || stmt.kind === 'function') {
				throw new Error("Domains aren't supported on points or function definitions");
			}

			let allowedVars: string[];
			if (stmt.kind === 'parametric') {
				allowedVars = ['x', 'y', 't'];
			} else if (stmt.kind === 'polar') {
				allowedVars = ['x', 'y', 'theta'];
			} else {
				allowedVars = ['x', 'y'];
			}

			const condResult = this.conditionParser.parse(domainText, allowedVars, options);
			if ('error' in condResult) {
				throw new Error(condResult.error);
			}

			return {
				...stmt,
				domain: condResult,
			} as Statement;
		}

		return stmt;
	}

	private extractDomain(trimmed: string): { bodyText: string; domainText?: string } {
		let inString = false;
		let openBraceIdx = -1;
		let closeBraceIdx = -1;
		let braceCount = 0;

		for (let i = 0; i < trimmed.length; i++) {
			const ch = trimmed[i];
			if (ch === '"') {
				inString = !inString;
			} else if (!inString) {
				if (ch === '{') {
					if (openBraceIdx === -1) {
						openBraceIdx = i;
					}
					braceCount++;
				} else if (ch === '}') {
					closeBraceIdx = i;
					braceCount--;
					if (braceCount < 0) {
						throw new Error('Unmatched { or }');
					}
				}
			}
		}

		if (inString) {
			return { bodyText: trimmed };
		}

		if (braceCount !== 0) {
			throw new Error('Unmatched { or }');
		}

		if (openBraceIdx === -1) {
			return { bodyText: trimmed };
		}

		if (closeBraceIdx !== trimmed.length - 1 || braceCount !== 0) {
			throw new Error('Unmatched { or }');
		}

		const bodyText = trimmed.slice(0, openBraceIdx).trim();
		const domainText = trimmed.slice(openBraceIdx + 1, closeBraceIdx).trim();

		if (!domainText) {
			throw new Error('Empty domain');
		}

		// Ensure bodyText and domainText have no remaining top-level braces
		if (this.hasUnquotedBrace(bodyText) || this.hasUnquotedBrace(domainText)) {
			throw new Error('Unmatched { or }');
		}

		return { bodyText, domainText };
	}

	private hasUnquotedBrace(text: string): boolean {
		let inString = false;
		for (let i = 0; i < text.length; i++) {
			const ch = text[i];
			if (ch === '"') inString = !inString;
			else if (!inString && (ch === '{' || ch === '}')) return true;
		}
		return false;
	}

	private classifyBody(
		trimmed: string,
		options: ClassifyOptions,
		extraVariables: readonly string[],
		userFunctions?: Readonly<Record<string, number>> | ReadonlyMap<string, number>,
		userFunctionStore?: IUserFunctionStore,
	): Statement {
		// Inequality rule (before equations)
		const ineq = this.tryClassifyInequality(trimmed, extraVariables, userFunctions, userFunctionStore);
		if (ineq) {
			return ineq;
		}

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

		if (trimmed.includes(',')) {
			return this.classifyParametric(trimmed, extraVariables, userFunctions, userFunctionStore);
		}

		const sides = trimmed.split('=');
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

	private tryClassifyInequality(
		trimmed: string,
		extraVariables: readonly string[],
		userFunctions?: Readonly<Record<string, number>> | ReadonlyMap<string, number>,
		userFunctionStore?: IUserFunctionStore,
	): Statement | null {
		interface FoundOp {
			op: string;
			index: number;
			length: number;
		}

		const opsFound: FoundOp[] = [];
		let hasIsolatedEqual = false;
		let inString = false;
		let depth = 0;

		for (let i = 0; i < trimmed.length; i++) {
			const ch = trimmed[i];
			if (ch === '"') {
				inString = !inString;
			} else if (ch === '(') {
				depth++;
			} else if (ch === ')') {
				depth--;
			} else if (!inString && depth === 0) {
				const twoChar = trimmed.slice(i, i + 2);
				if (twoChar === '<=' || twoChar === '>=') {
					opsFound.push({ op: twoChar, index: i, length: 2 });
					i++;
					continue;
				}
				if (ch === '≤' || ch === '≥' || ch === '<' || ch === '>') {
					opsFound.push({ op: ch, index: i, length: 1 });
					continue;
				}
				if (ch === '=') {
					hasIsolatedEqual = true;
				}
			}
		}

		if (opsFound.length > 1) {
			throw new Error("Chained inequalities aren't supported yet. Try: x > 1 {x < 3}");
		}

		if (opsFound.length === 1) {
			if (hasIsolatedEqual) {
				throw new Error("Chained inequalities aren't supported yet. Try: x > 1 {x < 3}");
			}

			const found = opsFound[0];
			const leftStr = trimmed.slice(0, found.index).trim();
			const rightStr = trimmed.slice(found.index + found.length).trim();

			if (!leftStr || !rightStr) {
				throw new Error('Both sides of the inequality need an expression');
			}

			let op: '<' | '<=' | '>' | '>=';
			if (found.op === '<') op = '<';
			else if (found.op === '>') op = '>';
			else if (found.op === '<=' || found.op === '≤') op = '<=';
			else op = '>=';

			const left = this.compiler.compile(leftStr, {
				variableNames: ['x', 'y', ...extraVariables],
				userFunctions,
				userFunctionStore,
			});
			const right = this.compiler.compile(rightStr, {
				variableNames: ['x', 'y', ...extraVariables],
				userFunctions,
				userFunctionStore,
			});

			return { kind: 'inequality', left, right, op };
		}

		return null;
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
				throw new Error('Parametric form needs both "x = ..." and "y = ..."');
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
