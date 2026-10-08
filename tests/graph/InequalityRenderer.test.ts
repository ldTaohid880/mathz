import { describe, expect, it, vi } from 'vitest';
import { Evaluator } from '../../src/math/Evaluator';
import { ExpressionCompiler } from '../../src/math/ExpressionCompiler';
import { FunctionLibrary } from '../../src/math/FunctionLibrary';
import { Parser } from '../../src/math/Parser';
import { Tokenizer } from '../../src/math/Tokenizer';
import { RenderContext } from '../../src/graph/RenderContext';
import { ViewTransform } from '../../src/graph/ViewTransform';
import { InequalityRenderer } from '../../src/graph/renderers/InequalityRenderer';
import { RendererRegistry } from '../../src/graph/RendererRegistry';
import { StatementClassifier } from '../../src/statements/StatementClassifier';
import { MarchingSquares } from '../../src/graph/MarchingSquares';

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
	view.setState({ cx: 0, cy: 0, scale: 10 }); // visible range: x ∈ [-5, 5], y ∈ [-5, 5]

	const mockCtx = {
		save: vi.fn(),
		restore: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		fillRect: vi.fn(),
		setLineDash: vi.fn(),
		strokeStyle: '',
		fillStyle: '',
		globalAlpha: 1,
		lineWidth: 1,
		lineJoin: '',
		lineCap: '',
	} as unknown as CanvasRenderingContext2D;

	const rc = new RenderContext(mockCtx, view);
	const ms = new MarchingSquares();
	const ineqRenderer = new InequalityRenderer(ms);

	return { classifier, view, rc, mockCtx, ineqRenderer, compiler };
}

describe('InequalityRenderer', () => {
	it('fills some cells for y > 0 and none for y > 1000', () => {
		const { classifier, view, rc, mockCtx, ineqRenderer } = createSetup();

		// Test 1: y > 0
		const stmt1 = classifier.classify('y > 0');
		expect(stmt1.kind).toBe('inequality');
		ineqRenderer.render(stmt1 as any, view, rc, { color: 'red', width: 2 });
		expect((mockCtx.fillRect as any).mock.calls.length).toBeGreaterThan(0);

		vi.clearAllMocks();

		// Test 2: y > 1000
		const stmt2 = classifier.classify('y > 1000');
		expect(stmt2.kind).toBe('inequality');
		ineqRenderer.render(stmt2 as any, view, rc, { color: 'red', width: 2 });
		expect((mockCtx.fillRect as any).mock.calls.length).toBe(0);
	});

	it('uses dashed boundary for < and solid for <=', () => {
		const { classifier, view, rc, mockCtx, ineqRenderer } = createSetup();

		// Test 1: y < x
		const stmt1 = classifier.classify('y < x');
		ineqRenderer.render(stmt1 as any, view, rc, { color: 'red', width: 2 });
		expect(mockCtx.setLineDash).toHaveBeenCalledWith([6, 5]);

		vi.clearAllMocks();

		// Test 2: y <= x
		const stmt2 = classifier.classify('y <= x');
		ineqRenderer.render(stmt2 as any, view, rc, { color: 'red', width: 2 });
		expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
	});

	it('domain restriction removes fills outside domain', () => {
		const { classifier, view, rc, mockCtx, ineqRenderer } = createSetup();

		// y > 0 without domain
		const stmt1 = classifier.classify('y > 0');
		ineqRenderer.render(stmt1 as any, view, rc, { color: 'red', width: 2 });
		const totalWidthWithoutDomain = (mockCtx.fillRect as any).mock.calls.reduce(
			(sum: number, call: any) => sum + call[2],
			0,
		);

		vi.clearAllMocks();

		// y > 0 {x > 0} with domain restricting x
		const stmt2 = classifier.classify('y > 0 {x > 0}');
		ineqRenderer.render(stmt2 as any, view, rc, { color: 'red', width: 2 });
		const totalWidthWithDomain = (mockCtx.fillRect as any).mock.calls.reduce(
			(sum: number, call: any) => sum + call[2],
			0,
		);

		expect(totalWidthWithDomain).toBeLessThan(totalWidthWithoutDomain);
		expect(totalWidthWithDomain).toBeGreaterThan(0);
	});

	it('layer sorting puts inequality (layer 0) before explicit curve (layer 1)', () => {
		const { classifier } = createSetup();

		const stmtExplicit = classifier.classify('y = x');
		const stmtInequality = classifier.classify('y > x^2');

		const renderOrder: string[] = [];

		const mockExplicit = {
			render: vi.fn(() => renderOrder.push('explicit')),
		} as any;
		const mockIneq = {
			layer: 0,
			render: vi.fn(() => renderOrder.push('inequality')),
		} as any;

		const registry = new RendererRegistry(
			mockExplicit,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			{} as any,
			mockIneq,
		);

		// List explicit curve first, then inequality
		const statements = [stmtExplicit, stmtInequality];

		const entries = statements.map((statement, index) => {
			const layer = registry.getLayer(statement);
			return { statement, layer, index };
		});

		entries.sort((a, b) => (a.layer !== b.layer ? a.layer - b.layer : a.index - b.index));

		for (const entry of entries) {
			registry.render(entry.statement, {} as any, {} as any, { color: 'red', width: 2 });
		}

		expect(renderOrder).toEqual(['inequality', 'explicit']);
	});
});
