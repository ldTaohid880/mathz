import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from '../../src/core/EventEmitter';
import { IScheduler } from '../../src/core/IScheduler';
import type { GraphTheme } from '../../src/graph/GraphTheme';
import { GraphWidget } from '../../src/graph/GraphWidget';
import type { IThemeProvider } from '../../src/graph/IThemeProvider';
import type { ExplicitStatement } from '../../src/statements/Statement';

class FakeScheduler implements IScheduler {
	private nextId = 1;
	public frames = new Map<number, (time: number) => void>();

	public requestFrame(callback: (time: number) => void): number {
		const id = this.nextId++;
		this.frames.set(id, callback);
		return id;
	}

	public cancelFrame(handle: number): void {
		this.frames.delete(handle);
	}

	public setTimeout(_callback: () => void, _delayMs: number): number {
		return 0;
	}

	public clearTimeout(_handle: number): void {}

	public now(): number {
		return 0;
	}

	public flush(): void {
		const callbacks = [...this.frames.values()];
		this.frames.clear();
		for (const cb of callbacks) {
			cb(0);
		}
	}
}

describe('GraphWidget', () => {
	it('coalesces multiple setStatements calls in one tick into a single repaint', () => {
		const scheduler = new FakeScheduler();
		const theme: GraphTheme = {
			bg: '#ffffff',
			gridMinor: '#e0e0e0',
			gridMajor: '#cccccc',
			axis: '#ff0000',
			text: '#000000',
			tipBg: '#111111',
			tipFg: '#ffffff',
			cross: '#888888',
			fontFamily: 'sans-serif',
			palette: ['#ff0000', '#00ff00'],
		};

		const themeEmitter = new EventEmitter<GraphTheme>();
		const themeProvider: IThemeProvider = {
			getTheme: () => theme,
			onThemeChange: themeEmitter,
		};

		const mockCtx = {
			setTransform: vi.fn(),
			getImageData: vi.fn().mockReturnValue({}),
			putImageData: vi.fn(),
		};
		const canvas = {
			width: 600,
			height: 600,
			style: {},
			getContext: vi.fn().mockReturnValue(mockCtx),
		} as unknown as HTMLCanvasElement;

		const rc = {
			theme,
			clear: vi.fn(),
		} as any;
		const view = {
			size: 601,
			setSize: vi.fn(),
			zoomAt: vi.fn(),
			reset: vi.fn(),
		} as any;
		const grid = { draw: vi.fn() } as any;
		const labels = { draw: vi.fn() } as any;
		const hover = { draw: vi.fn() } as any;
		const interaction = {
			pointer: null,
			isDragging: false,
			dispose: vi.fn(),
		} as any;
		const registry = { render: vi.fn() } as any;

		const stage = {
			clientWidth: 601,
		} as unknown as HTMLElement;

		const widget = new GraphWidget(
			canvas,
			stage,
			rc,
			view,
			grid,
			labels,
			hover,
			interaction,
			registry,
			themeProvider,
			scheduler,
		);

		// Constructor schedules initial repaint
		expect(scheduler.frames.size).toBe(1);

		const dummyStatement: ExplicitStatement = {
			kind: 'explicit',
			axis: 'x',
			fn: { evaluate: () => 1, usedVariables: new Set() },
		};

		widget.setStatements([dummyStatement]);
		widget.setStatements([dummyStatement, dummyStatement]);
		widget.setStatements([]);

		// Still coalesced into the single frame
		expect(scheduler.frames.size).toBe(1);

		scheduler.flush();

		expect(rc.clear).toHaveBeenCalledTimes(1);
		expect(grid.draw).toHaveBeenCalledTimes(1);
		expect(labels.draw).toHaveBeenCalledTimes(1);

		widget.dispose();
	});
});
