import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME, RenderContext } from '../../src/graph/RenderContext';
import { PointRenderer } from '../../src/graph/renderers/PointRenderer';
import { ViewTransform } from '../../src/graph/ViewTransform';
import type { PointStatement } from '../../src/statements/Statement';

describe('PointRenderer', () => {
	function createFakeContext() {
		const arcCalls: Array<{ x: number; y: number; radius: number }> = [];
		const fillCalls: string[] = [];

		const mockCtx = {
			font: '',
			textAlign: '',
			textBaseline: '',
			fillStyle: '',
			measureText: vi.fn().mockReturnValue({ width: 20 }),
			fillRect: vi.fn(),
			fillText: vi.fn(),
			beginPath: vi.fn(),
			arc: vi.fn((x: number, y: number, radius: number) => {
				arcCalls.push({ x, y, radius });
			}),
			fill: vi.fn(() => {
				fillCalls.push(String(mockCtx.fillStyle));
			}),
		} as unknown as CanvasRenderingContext2D;

		const view = new ViewTransform({ cellSize: 30 }); // center is at size / 2, (0,0) in world is screen (300.5, 300.5)
		const rc = new RenderContext(mockCtx, view, DEFAULT_THEME);

		return { mockCtx, view, rc, arcCalls, fillCalls };
	}

	it('draws circles (bg border + fill) for visible point and text if label present', () => {
		const { rc, view, arcCalls, mockCtx } = createFakeContext();
		const renderer = new PointRenderer();

		const stmt: PointStatement = {
			kind: 'point',
			source: '(0, 0) "Origin"',
			points: [
				{
					x: { evaluate: () => 0, usedVariables: new Set() },
					y: { evaluate: () => 0, usedVariables: new Set() },
				},
			],
			label: 'Origin',
		};

		renderer.render(stmt, view, rc, { color: '#ff0000', width: 2 });

		// Each point drawn does two arcs: 1 for 2px border (radius 6), 1 for filled dot (radius 4)
		expect(arcCalls).toHaveLength(2);
		expect(arcCalls[0].radius).toBe(6);
		expect(arcCalls[1].radius).toBe(4);

		// Label text drawn
		expect(mockCtx.fillText).toHaveBeenCalledWith(
			'Origin',
			expect.any(Number),
			expect.any(Number),
		);
	});

	it('draws none for off-screen or non-finite points', () => {
		const { rc, view, arcCalls } = createFakeContext();
		const renderer = new PointRenderer();

		const stmt: PointStatement = {
			kind: 'point',
			source: '(10000, 10000), (NaN, 0), (0, Infinity)',
			points: [
				{
					x: { evaluate: () => 10000, usedVariables: new Set() },
					y: { evaluate: () => 10000, usedVariables: new Set() },
				},
				{
					x: { evaluate: () => NaN, usedVariables: new Set() },
					y: { evaluate: () => 0, usedVariables: new Set() },
				},
				{
					x: { evaluate: () => 0, usedVariables: new Set() },
					y: { evaluate: () => Infinity, usedVariables: new Set() },
				},
			],
		};

		renderer.render(stmt, view, rc, { color: '#ff0000', width: 2 });

		expect(arcCalls).toHaveLength(0);
	});

	it('evaluates coordinates using slider parameter values', () => {
		const { rc, view, arcCalls } = createFakeContext();
		const renderer = new PointRenderer();

		const stmt: PointStatement = {
			kind: 'point',
			source: '(a, 2*a)',
			points: [
				{
					x: { evaluate: (p) => p.a ?? 0, usedVariables: new Set(['a']) },
					y: { evaluate: (p) => 2 * (p.a ?? 0), usedVariables: new Set(['a']) },
				},
			],
		};

		// Case 1: a = 1
		rc.params = { a: 1 };
		renderer.render(stmt, view, rc, { color: '#ff0000', width: 2 });
		const p1 = view.toScreen({ x: 1, y: 2 });
		expect(arcCalls).toHaveLength(2);
		expect(arcCalls[0].x).toBeCloseTo(p1.x);
		expect(arcCalls[0].y).toBeCloseTo(p1.y);

		// Case 2: a = 3 (parameter value change moves the point)
		arcCalls.length = 0;
		rc.params = { a: 3 };
		renderer.render(stmt, view, rc, { color: '#ff0000', width: 2 });
		const p2 = view.toScreen({ x: 3, y: 6 });
		expect(arcCalls).toHaveLength(2);
		expect(arcCalls[0].x).toBeCloseTo(p2.x);
		expect(arcCalls[0].y).toBeCloseTo(p2.y);
	});
});
