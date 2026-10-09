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

describe('Inequality Classifier', () => {
	it('accepts valid inequalities', () => {
		const classifier = makeClassifier();

		const s1 = classifier.classify('y > x^2');
		expect(s1.kind).toBe('inequality');
		if (s1.kind === 'inequality') {
			expect(s1.op).toBe('>');
		}

		const s2 = classifier.classify('x^2 + y^2 <= 9');
		expect(s2.kind).toBe('inequality');
		if (s2.kind === 'inequality') {
			expect(s2.op).toBe('<=');
		}

		const s3 = classifier.classify('x^2 < y');
		expect(s3.kind).toBe('inequality');
		if (s3.kind === 'inequality') {
			expect(s3.op).toBe('<');
		}

		const s4 = classifier.classify('y ≤ sin(x)');
		expect(s4.kind).toBe('inequality');
		if (s4.kind === 'inequality') {
			expect(s4.op).toBe('<=');
		}

		const s5 = classifier.classify('y > x^2 {x > 0}');
		expect(s5.kind).toBe('inequality');
		if (s5.kind === 'inequality') {
			expect(s5.op).toBe('>');
			expect(s5.domain).toBeDefined();
		}
	});

	it('rejects invalid inequalities', () => {
		const classifier = makeClassifier();

		expect(() => classifier.classify('1 < x < 3')).toThrow(
			"Chained inequalities aren't supported yet. Try: x > 1 {x < 3}",
		);

		expect(() => classifier.classify('y >')).toThrow(
			'Both sides of the inequality need an expression',
		);

		expect(() => classifier.classify('> x')).toThrow(
			'Both sides of the inequality need an expression',
		);
	});

	it('does not classify y = x or y = x^2 as inequalities', () => {
		const classifier = makeClassifier();

		const s1 = classifier.classify('y = x');
		expect(s1.kind).not.toBe('inequality');
		expect(s1.kind).toBe('explicit');

		const s2 = classifier.classify('y = x^2');
		expect(s2.kind).not.toBe('inequality');
		expect(s2.kind).toBe('explicit');
	});
});
