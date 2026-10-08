import { describe, expect, it, vi } from 'vitest';
import { Evaluator } from '../../src/math/Evaluator';
import { ExpressionCompiler } from '../../src/math/ExpressionCompiler';
import { FunctionLibrary } from '../../src/math/FunctionLibrary';
import { Parser } from '../../src/math/Parser';
import { Tokenizer } from '../../src/math/Tokenizer';
import { ParameterStore } from '../../src/statements/ParameterStore';
import { isParseError, SliderParser } from '../../src/statements/SliderDeclaration';

describe('SliderParser', () => {
	const funcs = new FunctionLibrary();
	const parser = new SliderParser(funcs);

	it('parses valid slider declaration with default step', () => {
		const res = parser.parse('@slider a = 2 [0, 5]');
		expect(isParseError(res)).toBe(false);
		if (!isParseError(res)) {
			expect(res.name).toBe('a');
			expect(res.value).toBe(2);
			expect(res.min).toBe(0);
			expect(res.max).toBe(5);
			expect(res.step).toBe(0.1);
		}
	});

	it('parses negative numbers and explicit step', () => {
		const res = parser.parse('@slider k = -1.5 [-5, 5, 0.5]');
		expect(isParseError(res)).toBe(false);
		if (!isParseError(res)) {
			expect(res.name).toBe('k');
			expect(res.value).toBe(-1.5);
			expect(res.min).toBe(-5);
			expect(res.max).toBe(5);
			expect(res.step).toBe(0.5);
		}
	});

	it('clamps initial value into [min, max]', () => {
		const res = parser.parse('@slider a = 10 [0, 5]');
		expect(isParseError(res)).toBe(false);
		if (!isParseError(res)) {
			expect(res.value).toBe(5);
		}
	});

	it('fails if min >= max', () => {
		const res = parser.parse('@slider a = 2 [5, 2]');
		expect(isParseError(res)).toBe(true);
		if (isParseError(res)) {
			expect(res.error).toContain('less than max');
		}
	});

	it('fails if step <= 0', () => {
		const res = parser.parse('@slider a = 2 [0, 5, 0]');
		expect(isParseError(res)).toBe(true);
		if (isParseError(res)) {
			expect(res.error).toContain('greater than 0');
		}
	});

	it('rejects reserved variable and function names', () => {
		expect(isParseError(parser.parse('@slider x = 1 [0, 5]'))).toBe(true);
		expect(isParseError(parser.parse('@slider sin = 1 [0, 5]'))).toBe(true);
		expect(isParseError(parser.parse('@slider pi = 1 [0, 5]'))).toBe(true);
	});
});

describe('ParameterStore', () => {
	it('clamps value and emits only when value changes', () => {
		const decl = { name: 'a', value: 2, min: 0, max: 5, step: 0.1 };
		const store = new ParameterStore([decl]);

		const listener = vi.fn();
		store.onChanged.on(listener);

		store.set('a', 3);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(store.get('a')).toBe(3);

		// Setting same value doesn't emit
		store.set('a', 3);
		expect(listener).toHaveBeenCalledTimes(1);

		// Clamping to max
		store.set('a', 10);
		expect(listener).toHaveBeenCalledTimes(2);
		expect(store.get('a')).toBe(5);
	});
});

describe('ExpressionCompiler with Slider Parameters', () => {
	function makeCompiler() {
		const functions = new FunctionLibrary();
		return new ExpressionCompiler(new Tokenizer(), new Parser(functions), functions, new Evaluator());
	}

	it('accepts declared parameter names and rejects unknown ones with exact message', () => {
		const compiler = makeCompiler();

		// Legally uses declared parameter 'a'
		const compiled = compiler.compile('a * x + 1', ['x', 'a']);
		expect(compiled.evaluate({ x: 2, a: 3 })).toBe(7);

		// Unknown name 'k' throws exact expected error
		expect(() => compiler.compile('k * x', ['x'])).toThrow(
			'Unknown name "k". Declare it with @slider k = 1 [min, max]',
		);
	});

	it('supports 2a and implicit multiplication splitting for declared names', () => {
		const compiler = makeCompiler();

		// '2a' -> 2 * a
		const c1 = compiler.compile('2a', ['a']);
		expect(c1.evaluate({ a: 4 })).toBe(8);

		// 'ab' -> a * b when both are declared
		const c2 = compiler.compile('ab', ['a', 'b']);
		expect(c2.evaluate({ a: 3, b: 5 })).toBe(15);
	});

	it('y = a*x evaluation changes when parameter store values change', () => {
		const compiler = makeCompiler();
		const store = new ParameterStore([{ name: 'a', value: 2, min: 0, max: 10, step: 1 }]);

		const compiled = compiler.compile('a * x', ['x', 'a']);

		const scope1 = { ...store.values(), x: 5 };
		expect(compiled.evaluate(scope1)).toBe(10);

		store.set('a', 4);
		const scope2 = { ...store.values(), x: 5 };
		expect(compiled.evaluate(scope2)).toBe(20);
	});
});
