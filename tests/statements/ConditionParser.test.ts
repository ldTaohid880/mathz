import { describe, expect, it } from 'vitest';
import { Evaluator } from '../../src/math/Evaluator';
import { ExpressionCompiler } from '../../src/math/ExpressionCompiler';
import { FunctionLibrary } from '../../src/math/FunctionLibrary';
import { Parser } from '../../src/math/Parser';
import { Tokenizer } from '../../src/math/Tokenizer';
import { ConditionParser } from '../../src/statements/ConditionParser';

function makeConditionParser() {
	const functions = new FunctionLibrary();
	const compiler = new ExpressionCompiler(
		new Tokenizer(),
		new Parser(functions),
		functions,
		new Evaluator(),
	);
	return new ConditionParser(compiler);
}

describe('ConditionParser', () => {
	it('parses single comparisons', () => {
		const parser = makeConditionParser();
		const res = parser.parse('x > 0', ['x', 'y']);
		expect('error' in res).toBe(false);
		if (!('error' in res)) {
			expect(res.test({ x: 1, y: 0 })).toBe(true);
			expect(res.test({ x: -1, y: 0 })).toBe(false);
			expect(res.uses.has('x')).toBe(true);
		}
	});

	it('parses comparison chains', () => {
		const parser = makeConditionParser();
		const res = parser.parse('0 <= x <= 3', ['x', 'y']);
		expect('error' in res).toBe(false);
		if (!('error' in res)) {
			expect(res.test({ x: 0, y: 0 })).toBe(true);
			expect(res.test({ x: 1.5, y: 0 })).toBe(true);
			expect(res.test({ x: 3, y: 0 })).toBe(true);
			expect(res.test({ x: -0.1, y: 0 })).toBe(false);
			expect(res.test({ x: 3.1, y: 0 })).toBe(false);
		}
	});

	it('parses comma-separated conditions', () => {
		const parser = makeConditionParser();
		const res = parser.parse('x > 0, y < 5', ['x', 'y']);
		expect('error' in res).toBe(false);
		if (!('error' in res)) {
			expect(res.test({ x: 1, y: 2 })).toBe(true);
			expect(res.test({ x: -1, y: 2 })).toBe(false);
			expect(res.test({ x: 1, y: 6 })).toBe(false);
		}
	});

	it('parses "and"-separated conditions', () => {
		const parser = makeConditionParser();
		const res = parser.parse('x > 0 and y < 5', ['x', 'y']);
		expect('error' in res).toBe(false);
		if (!('error' in res)) {
			expect(res.test({ x: 1, y: 2 })).toBe(true);
			expect(res.test({ x: 0, y: 2 })).toBe(false);
			expect(res.test({ x: 1, y: 5 })).toBe(false);
		}
	});

	it('supports unicode operators ≤ and ≥', () => {
		const parser = makeConditionParser();
		const res = parser.parse('x ≤ 3, y ≥ 1', ['x', 'y']);
		expect('error' in res).toBe(false);
		if (!('error' in res)) {
			expect(res.test({ x: 3, y: 1 })).toBe(true);
			expect(res.test({ x: 4, y: 1 })).toBe(false);
			expect(res.test({ x: 3, y: 0 })).toBe(false);
		}
	});

	it('supports slider names in extraVariables', () => {
		const parser = makeConditionParser();
		const res = parser.parse('x > a', ['x', 'y'], { extraVariables: ['a'] });
		expect('error' in res).toBe(false);
		if (!('error' in res)) {
			expect(res.test({ x: 5, a: 2 })).toBe(true);
			expect(res.test({ x: 1, a: 2 })).toBe(false);
		}
	});

	it('evaluates non-finite values as false', () => {
		const parser = makeConditionParser();
		const res = parser.parse('1 / x > 0', ['x', 'y']);
		expect('error' in res).toBe(false);
		if (!('error' in res)) {
			expect(res.test({ x: 0, y: 0 })).toBe(false);
		}
	});

	it('returns error when no comparison operator is present', () => {
		const parser = makeConditionParser();
		const res = parser.parse('x + 1', ['x', 'y']);
		expect('error' in res).toBe(true);
		if ('error' in res) {
			expect(res.error).toBe('Condition needs a comparison like x > 0');
		}
	});

	it('returns error on unknown variable name', () => {
		const parser = makeConditionParser();
		const res = parser.parse('z > 0', ['x', 'y']);
		expect('error' in res).toBe(true);
		if ('error' in res) {
			expect(res.error).toContain('Unknown name');
		}
	});
});
