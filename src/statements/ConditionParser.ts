import type { CompiledExpression } from '../math/CompiledExpression';
import type { IExpressionCompiler } from '../math/IExpressionCompiler';
import type { Condition } from './Condition';
import type { ConditionParseError, IConditionParser } from './IConditionParser';
import type { ClassifyOptions } from './StatementClassifier';

interface ComparisonChain {
	readonly expressions: CompiledExpression[];
	readonly operators: string[];
}

export class ConditionParser implements IConditionParser {
	public constructor(private readonly compiler: IExpressionCompiler) {}

	public parse(
		text: string,
		allowedVars: readonly string[],
		options: ClassifyOptions = {},
	): Condition | ConditionParseError {
		const trimmed = text.trim();
		if (!trimmed) {
			return { error: 'Empty domain' };
		}

		// Split on top-level commas and the word 'and' (depth 0)
		const parts = splitTopLevelCommaAnd(trimmed);

		const compileVars = [...allowedVars, ...(options.extraVariables ?? [])];
		const chains: ComparisonChain[] = [];
		const uses = new Set<string>();

		for (const part of parts) {
			const parsedPart = parseComparisonPart(part);
			if ('error' in parsedPart) {
				return parsedPart;
			}

			const compiledExprs: CompiledExpression[] = [];
			for (const exprStr of parsedPart.exprStrings) {
				if (!exprStr.trim()) {
					return { error: 'Condition needs a comparison like x > 0' };
				}
				try {
					const compiled = this.compiler.compile(exprStr, {
						variableNames: compileVars,
						userFunctions: options.userFunctions,
						userFunctionStore: options.userFunctionStore,
					});
					compiledExprs.push(compiled);
					for (const v of compiled.usedVariables) {
						uses.add(v);
					}
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err);
					return { error: msg };
				}
			}

			chains.push({
				expressions: compiledExprs,
				operators: parsedPart.operators,
			});
		}

		const test = (scope: Record<string, number>): boolean => {
			for (const chain of chains) {
				const vals = chain.expressions.map((e) => e.evaluate(scope));
				for (let i = 0; i < chain.operators.length; i++) {
					const left = vals[i];
					const right = vals[i + 1];
					const op = chain.operators[i];
					if (!evalOp(left, op, right)) {
						return false;
					}
				}
			}
			return true;
		};

		return { test, uses };
	}
}

function splitTopLevelCommaAnd(text: string): string[] {
	const parts: string[] = [];
	let current = '';
	let depth = 0;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === '(') {
			depth++;
			current += ch;
		} else if (ch === ')') {
			depth--;
			current += ch;
		} else if (depth === 0) {
			if (ch === ',') {
				parts.push(current);
				current = '';
			} else if (
				(ch === 'a' || ch === 'A') &&
				text.slice(i, i + 3).toLowerCase() === 'and' &&
				isWordBoundary(text, i - 1) &&
				isWordBoundary(text, i + 3)
			) {
				parts.push(current);
				current = '';
				i += 2; // Loop increments i by 1, skipping 'and'
			} else {
				current += ch;
			}
		} else {
			current += ch;
		}
	}

	parts.push(current);
	return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function isWordBoundary(str: string, index: number): boolean {
	if (index < 0 || index >= str.length) return true;
	const ch = str[index];
	return !/[a-zA-Z0-9_]/.test(ch);
}

interface PartSplit {
	exprStrings: string[];
	operators: string[];
}

function parseComparisonPart(part: string): PartSplit | ConditionParseError {
	const exprStrings: string[] = [];
	const operators: string[] = [];
	let current = '';
	let depth = 0;

	for (let i = 0; i < part.length; i++) {
		const ch = part[i];
		if (ch === '(') {
			depth++;
			current += ch;
		} else if (ch === ')') {
			depth--;
			current += ch;
		} else if (depth === 0) {
			const twoChar = part.slice(i, i + 2);
			if (twoChar === '<=' || twoChar === '>=') {
				exprStrings.push(current);
				operators.push(twoChar);
				current = '';
				i++; // skip second char
				continue;
			}
			if (ch === '≤' || ch === '≥' || ch === '<' || ch === '>') {
				exprStrings.push(current);
				operators.push(ch);
				current = '';
				continue;
			}
			current += ch;
		} else {
			current += ch;
		}
	}

	exprStrings.push(current);

	if (operators.length === 0) {
		return { error: 'Condition needs a comparison like x > 0' };
	}

	return { exprStrings, operators };
}

function evalOp(left: number, op: string, right: number): boolean {
	if (!Number.isFinite(left) || !Number.isFinite(right)) {
		return false;
	}
	switch (op) {
		case '<':
			return left < right;
		case '<=':
		case '≤':
			return left <= right;
		case '>':
			return left > right;
		case '>=':
		case '≥':
			return left >= right;
		default:
			return false;
	}
}
