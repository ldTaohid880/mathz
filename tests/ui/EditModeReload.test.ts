import { describe, expect, it } from 'vitest';
import { IScheduler } from '../../src/core/IScheduler';
import { Evaluator } from '../../src/math/Evaluator';
import { ExpressionCompiler } from '../../src/math/ExpressionCompiler';
import { FunctionLibrary } from '../../src/math/FunctionLibrary';
import { Parser } from '../../src/math/Parser';
import { Tokenizer } from '../../src/math/Tokenizer';
import { ParameterStore } from '../../src/statements/ParameterStore';
import { SliderParser } from '../../src/statements/SliderDeclaration';
import { StatementClassifier } from '../../src/statements/StatementClassifier';

class FakeScheduler implements IScheduler {
	private nextId = 1;
	public timeouts = new Map<number, () => void>();
	public frames = new Map<number, (time: number) => void>();

	public requestFrame(callback: (time: number) => void): number {
		const id = this.nextId++;
		this.frames.set(id, callback);
		return id;
	}

	public cancelFrame(handle: number): void {
		this.frames.delete(handle);
	}

	public setTimeout(callback: () => void, _delayMs: number): number {
		const id = this.nextId++;
		this.timeouts.set(id, callback);
		return id;
	}

	public clearTimeout(handle: number): void {
		this.timeouts.delete(handle);
	}

	public now(): number {
		return 0;
	}

	public flush(): void {
		const cbs = [...this.timeouts.values()];
		this.timeouts.clear();
		for (const cb of cbs) cb();
	}
}

describe('Edit mode & live re-parse logic', () => {
	const funcs = new FunctionLibrary();
	const sliderParser = new SliderParser(funcs);
	const compiler = new ExpressionCompiler(new Tokenizer(), new Parser(funcs), funcs, new Evaluator());
	const classifier = new StatementClassifier(compiler);

	it('reload preserves slider values by name and clamps them into new range', () => {
		const store = new ParameterStore();

		// Initial declarations: a = 2 in [0, 10]
		const decl1 = sliderParser.parse('@slider a = 2 [0, 10]');
		if ('error' in decl1) throw new Error();
		store.setDeclarations([decl1]);
		store.set('a', 8);
		expect(store.get('a')).toBe(8);

		// Reload with tighter range: a = 1 in [0, 5]
		const decl2 = sliderParser.parse('@slider a = 1 [0, 5]');
		if ('error' in decl2) throw new Error();
		store.setDeclarations([decl2]);

		// Value preserved and clamped to 5
		expect(store.get('a')).toBe(5);
	});

	it('removed sliders disappear on reload', () => {
		const store = new ParameterStore();
		const declA = sliderParser.parse('@slider a = 2 [0, 10]');
		const declB = sliderParser.parse('@slider b = 5 [0, 10]');
		if ('error' in declA || 'error' in declB) throw new Error();

		store.setDeclarations([declA, declB]);
		expect(store.get('a')).toBe(2);
		expect(store.get('b')).toBe(5);

		// Reload without b
		store.setDeclarations([declA]);
		expect(store.get('a')).toBe(2);
		expect(store.get('b')).toBeUndefined();
		expect(store.values()).toEqual({ a: 2 });
	});

	it('a bad line reports an error but other lines still produce statements', () => {
		const extra = ['a'];
		const validLine = 'y = a * x';
		const badLine = 'y = unknown_func(';

		const validStatement = classifier.classify(validLine, extra);
		expect(validStatement.kind).toBe('explicit');

		expect(() => classifier.classify(badLine, extra)).toThrow();
	});

	it('debounces rapid inputs so several keystrokes trigger exactly one reload', () => {
		const scheduler = new FakeScheduler();
		let timer: number | null = null;
		let reloadCount = 0;

		const handleInput = () => {
			if (timer !== null) scheduler.clearTimeout(timer);
			timer = scheduler.setTimeout(() => {
				timer = null;
				reloadCount++;
			}, 200);
		};

		// 3 rapid inputs
		handleInput();
		handleInput();
		handleInput();

		expect(scheduler.timeouts.size).toBe(1);
		expect(reloadCount).toBe(0);

		scheduler.flush();
		expect(reloadCount).toBe(1);
	});

	it('hidden state is matched and preserved by equation text across reloads', () => {
		const hiddenStateByText = new Map<string, boolean>();

		const eq1 = 'y = sin(x)';

		// user hides eq1
		hiddenStateByText.set(eq1, true);

		// New source reloaded containing eq1 and eq3
		const newSourceLines = ['y = sin(x)', 'y = tan(x)'];
		const hiddenResults = newSourceLines.map((line) => hiddenStateByText.get(line) ?? false);

		expect(hiddenResults[0]).toBe(true); // preserved
		expect(hiddenResults[1]).toBe(false); // new text starts visible
	});
});
