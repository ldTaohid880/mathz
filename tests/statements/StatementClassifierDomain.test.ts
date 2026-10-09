import { describe, expect, it } from 'vitest';
import { Evaluator } from '../../src/math/Evaluator';
import { ExpressionCompiler } from '../../src/math/ExpressionCompiler';
import { FunctionLibrary } from '../../src/math/FunctionLibrary';
import { Parser } from '../../src/math/Parser';
import { Tokenizer } from '../../src/math/Tokenizer';
import { StatementClassifier } from '../../src/statements/StatementClassifier';

function makeClassifier() {
	const functions = new FunctionLibrary();
	const compiler = new ExpressionCompiler(
		new Tokenizer(),
		new Parser(functions),
		functions,
		new Evaluator(),
	);
	return new StatementClassifier(compiler);
}

describe('StatementClassifier Domain Restrictions', () => {
	it('parses domain on explicit statement', () => {
		const classifier = makeClassifier();
		const stmt = classifier.classify('y = x^2 {0 <= x <= 3}');
		expect(stmt.kind).toBe('explicit');
		if (stmt.kind === 'explicit') {
			expect(stmt.domain).toBeDefined();
			expect(stmt.domain?.test({ x: 1, y: 1 })).toBe(true);
			expect(stmt.domain?.test({ x: 4, y: 16 })).toBe(false);
		}
	});

	it('parses domain on polar statement', () => {
		const classifier = makeClassifier();
		const stmt = classifier.classify('r = theta {theta < 2}');
		expect(stmt.kind).toBe('polar');
		if (stmt.kind === 'polar') {
			expect(stmt.domain).toBeDefined();
			expect(stmt.domain?.test({ theta: 1, r: 1, x: 0, y: 0 })).toBe(true);
			expect(stmt.domain?.test({ theta: 3, r: 3, x: 0, y: 0 })).toBe(false);
		}
	});

	it('parses domain on parametric statement', () => {
		const classifier = makeClassifier();
		const stmt = classifier.classify('x = t, y = t^2 {t > 0}');
		expect(stmt.kind).toBe('parametric');
		if (stmt.kind === 'parametric') {
			expect(stmt.domain).toBeDefined();
			expect(stmt.domain?.test({ t: 1, x: 1, y: 1 })).toBe(true);
			expect(stmt.domain?.test({ t: -1, x: -1, y: 1 })).toBe(false);
		}
	});

	it('parses domain on implicit statement', () => {
		const classifier = makeClassifier();
		const stmt = classifier.classify('x^2 + y^2 = 9 {x > 0}');
		expect(stmt.kind).toBe('implicit');
		if (stmt.kind === 'implicit') {
			expect(stmt.domain).toBeDefined();
			expect(stmt.domain?.test({ x: 1, y: 0 })).toBe(true);
			expect(stmt.domain?.test({ x: -1, y: 0 })).toBe(false);
		}
	});

	it('ignores braces inside point label string', () => {
		const classifier = makeClassifier();
		const stmt = classifier.classify('(1, 2) "{x}"');
		expect(stmt.kind).toBe('point');
		if (stmt.kind === 'point') {
			expect(stmt.label).toBe('{x}');
		}
	});

	it('rejects domain on point statements', () => {
		const classifier = makeClassifier();
		expect(() => classifier.classify('(1, 2) {x > 0}')).toThrow(
			"Domains aren't supported on points or function definitions",
		);
	});

	it('rejects domain on function definitions', () => {
		const classifier = makeClassifier();
		expect(() =>
			classifier.classify('f(x) = x^2 {x > 0}', { isFunctionDefinition: true }),
		).toThrow("Domains aren't supported on points or function definitions");
	});

	it('rejects empty domain', () => {
		const classifier = makeClassifier();
		expect(() => classifier.classify('y = x {}')).toThrow('Empty domain');
	});

	it('rejects unbalanced braces', () => {
		const classifier = makeClassifier();
		expect(() => classifier.classify('y = x {x > 0')).toThrow('Unmatched { or }');
		expect(() => classifier.classify('y = x x > 0}')).toThrow('Unmatched { or }');
	});
});
