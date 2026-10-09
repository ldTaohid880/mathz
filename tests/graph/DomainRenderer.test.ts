import { describe, expect, it, vi } from 'vitest';
import { Evaluator } from '../../src/math/Evaluator';
import { ExpressionCompiler } from '../../src/math/ExpressionCompiler';
import { FunctionLibrary } from '../../src/math/FunctionLibrary';
import { Parser } from '../../src/math/Parser';
import { Tokenizer } from '../../src/math/Tokenizer';
import { RenderContext } from '../../src/graph/RenderContext';
import { ViewTransform } from '../../src/graph/ViewTransform';
import { ExplicitRenderer } from '../../src/graph/renderers/ExplicitRenderer';
import { StatementClassifier } from '../../src/statements/StatementClassifier';

function createSetup() {
	const functions = new FunctionLibrary();
	const compiler = new ExpressionCompiler(
		new Tokenizer(),
		new Parser(functions),
		functions,
		new Evaluator(),
	);
	const classifier = new StatementClassifier(compiler);

	const view = new ViewTransform();
	view.setSize(100);
	view.setState({ cx: 0, cy: 0, scale: 10 }); // visible x range: [-5, 5]

	const mockCtx = {
		save: vi.fn(),
		restore: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		strokeStyle: '',
		lineWidth: 1,
		lineJoin: '',
		lineCap: '',
		fillStyle: '',
		fillRect: vi.fn(),
	} as unknown as CanvasRenderingContext2D;

	const rc = new RenderContext(mockCtx, view);
	return { classifier, view, rc, mockCtx };
}

describe('DomainRenderer', () => {
	it('ExplicitRenderer draws nothing outside domain {0 <= x <= 3}', () => {
		const { classifier, view, rc, mockCtx } = createSetup();
		const stmt = classifier.classify('y = x {0 <= x <= 3}');
		expect(stmt.kind).toBe('explicit');

		const renderer = new ExplicitRenderer();
		renderer.render(stmt as any, view, rc, { color: 'blue', width: 2 });

		// Check the x coordinates passed to moveTo / lineTo
		const movedX: number[] = [];
		const lineX: number[] = [];

		for (const call of (mockCtx.moveTo as any).mock.calls) {
			const screenX = call[0];
			const worldX = view.toWorld(screenX, 0).x;
			movedX.push(worldX);
		}
		for (const call of (mockCtx.lineTo as any).mock.calls) {
			const screenX = call[0];
			const worldX = view.toWorld(screenX, 0).x;
			lineX.push(worldX);
		}

		const allDrawnX = [...movedX, ...lineX];
		expect(allDrawnX.length).toBeGreaterThan(0);
		for (const wx of allDrawnX) {
			expect(wx).toBeGreaterThanOrEqual(-1e-5);
			expect(wx).toBeLessThanOrEqual(3 + 1e-5);
		}
	});

	it('slider changing a domain bound changes what is drawn', () => {
		const { classifier, view, rc, mockCtx } = createSetup();
		const stmt = classifier.classify('y = x {0 <= x <= a}', { extraVariables: ['a'] });
		expect(stmt.kind).toBe('explicit');

		const renderer = new ExplicitRenderer();

		// Case 1: a = 2
		rc.params = { a: 2 };
		renderer.render(stmt as any, view, rc, { color: 'blue', width: 2 });

		const lineX1: number[] = (mockCtx.lineTo as any).mock.calls.map(
			(call: any) => view.toWorld(call[0], 0).x,
		);
		const maxWorldX1 = Math.max(...lineX1);
		expect(maxWorldX1).toBeCloseTo(2, 1);

		// Reset mock
		vi.clearAllMocks();

		// Case 2: a = 4
		rc.params = { a: 4 };
		renderer.render(stmt as any, view, rc, { color: 'blue', width: 2 });

		const lineX2: number[] = (mockCtx.lineTo as any).mock.calls.map(
			(call: any) => view.toWorld(call[0], 0).x,
		);
		const maxWorldX2 = Math.max(...lineX2);
		expect(maxWorldX2).toBeCloseTo(4, 1);
	});
});
