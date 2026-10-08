import { describe, expect, it } from 'vitest';
import { Evaluator } from '../../src/math/Evaluator';
import { ExpressionCompiler } from '../../src/math/ExpressionCompiler';
import { FunctionLibrary } from '../../src/math/FunctionLibrary';
import { Parser } from '../../src/math/Parser';
import { Tokenizer } from '../../src/math/Tokenizer';
import { StatementClassifier } from '../../src/statements/StatementClassifier';
import { UserFunctionStore } from '../../src/statements/UserFunctionStore';

describe('User-defined functions (logic & store)', () => {
	const funcs = new FunctionLibrary();
	const evaluator = new Evaluator();
	const compiler = new ExpressionCompiler(new Tokenizer(), new Parser(funcs), funcs, evaluator);
	const classifier = new StatementClassifier(compiler);

	it('UserFunctionStore supports define, get, has, names, and clear', () => {
		const store = new UserFunctionStore();
		expect(store.has('f')).toBe(false);

		const compiledBody = compiler.compile('x^2', { variableNames: ['x'] });
		store.define({
			name: 'f',
			params: ['x'],
			body: compiledBody,
			source: 'f(x) = x^2',
		});

		expect(store.has('f')).toBe(true);
		expect(store.names()).toEqual(['f']);
		const def = store.get('f');
		expect(def?.name).toBe('f');
		expect(def?.params).toEqual(['x']);

		store.clear();
		expect(store.has('f')).toBe(false);
		expect(store.names()).toEqual([]);
	});

	it('compiles and evaluates expressions using user-defined functions', () => {
		const store = new UserFunctionStore();
		const fBody = compiler.compile('x^2 + 1', { variableNames: ['x'] });
		store.define({
			name: 'f',
			params: ['x'],
			body: fBody,
			source: 'f(x) = x^2 + 1',
		});

		// User function map for parser/compiler
		const userFunctions = new Map([['f', 1]]);
		const expr = compiler.compile('f(3) + 2', {
			variableNames: [],
			userFunctions,
			userFunctionStore: store,
		});

		expect(expr.evaluate({})).toBe(12); // (3^2 + 1) + 2 = 12
	});

	it('supports multi-argument user functions', () => {
		const store = new UserFunctionStore();
		const addBody = compiler.compile('a * 2 + b', { variableNames: ['a', 'b'] });
		store.define({
			name: 'g',
			params: ['a', 'b'],
			body: addBody,
			source: 'g(a, b) = a * 2 + b',
		});

		const userFunctions = new Map([['g', 2]]);
		const expr = compiler.compile('g(4, 5)', {
			variableNames: [],
			userFunctions,
			userFunctionStore: store,
		});

		expect(expr.evaluate({})).toBe(13); // 4 * 2 + 5 = 13
	});

	it('tracks called user functions for cycle detection', () => {
		const store = new UserFunctionStore();
		const userFunctions = new Map([
			['f', 1],
			['g', 1],
		]);

		const fBody = compiler.compile('g(x) + 1', {
			variableNames: ['x'],
			userFunctions,
			userFunctionStore: store,
		});
		expect(fBody.calledFunctions).toBeDefined();
		expect(Array.from(fBody.calledFunctions!)).toContain('g');
	});

	it('classifies explicit curve using user-defined function', () => {
		const store = new UserFunctionStore();
		const fBody = compiler.compile('x^3', { variableNames: ['x'] });
		store.define({
			name: 'cube',
			params: ['x'],
			body: fBody,
			source: 'cube(x) = x^3',
		});

		const userFunctions = new Map([['cube', 1]]);
		const stmt = classifier.classify('y = cube(x) + 1', {
			userFunctions,
			userFunctionStore: store,
		});

		expect(stmt.kind).toBe('explicit');
		if (stmt.kind === 'explicit') {
			expect(stmt.fn.evaluate({ x: 2 })).toBe(9); // 2^3 + 1 = 9
		}
	});
});