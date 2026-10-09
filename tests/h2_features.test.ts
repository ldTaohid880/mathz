import { describe, expect, it, vi } from 'vitest';
import { buildGraphAriaLabel } from '../src/ui/MathzBlockFactory';
import { buildExportFilename } from '../src/obsidian/ObsidianImageExporter';
import { ViewTransform } from '../src/graph/ViewTransform';
import { InteractionController } from '../src/graph/InteractionController';
import { GraphWidget } from '../src/graph/GraphWidget';
import { EventEmitter } from '../src/core/EventEmitter';
import type { GraphTheme } from '../src/graph/GraphTheme';
import type { IThemeProvider } from '../src/graph/IThemeProvider';
import type { IScheduler } from '../src/core/IScheduler';
import type { IVisibilityObserver } from '../src/core/IVisibilityObserver';
import type { IDisposable } from '../src/core/IDisposable';

class FakeScheduler implements IScheduler {
	public frames = new Map<number, (time: number) => void>();
	private nextId = 1;

	public requestFrame(cb: (time: number) => void): number {
		const id = this.nextId++;
		this.frames.set(id, cb);
		return id;
	}

	public cancelFrame(id: number): void {
		this.frames.delete(id);
	}

	public setTimeout(): number {
		return 0;
	}
	public clearTimeout(): void {}
	public now(): number {
		return 0;
	}

	public flush(): void {
		const callbacks = [...this.frames.values()];
		this.frames.clear();
		for (const cb of callbacks) cb(0);
	}
}

describe('H2 Features Unit Tests', () => {
	describe('buildGraphAriaLabel', () => {
		it('builds label with title and equations', () => {
			const label = buildGraphAriaLabel('Sine & Cosine', ['y = sin(x) // comment', '(0, 0) "Origin"']);
			expect(label).toBe('Sine & Cosine. Graph of: y = sin(x); (0, 0) "Origin"');
		});

		it('builds label without title', () => {
			const label = buildGraphAriaLabel(undefined, ['y = x^2']);
			expect(label).toBe('Graph of: y = x^2');
		});

		it('truncates labels exceeding 300 characters with ellipsis', () => {
			const longEq = 'y = ' + 'x+'.repeat(200);
			const label = buildGraphAriaLabel('Long Graph', [longEq]);
			expect(label.length).toBe(301); // 300 chars + '…'
			expect(label.endsWith('…')).toBe(true);
		});
	});

	describe('buildExportFilename', () => {
		it('generates filename with slug and timestamp', () => {
			const now = new Date('2026-03-30T12:34:56');
			const fn = buildExportFilename('My Cool Graph!', now);
			expect(fn).toBe('mathz-my-cool-graph-20260330-123456.png');
		});

		it('defaults to graph when title is missing or empty', () => {
			const now = new Date('2026-03-30T12:34:56');
			expect(buildExportFilename(undefined, now)).toBe('mathz-graph-20260330-123456.png');
			expect(buildExportFilename('   ', now)).toBe('mathz-graph-20260330-123456.png');
		});

		it('truncates slug at 60 characters max', () => {
			const now = new Date('2026-03-30T12:34:56');
			const longTitle = 'a'.repeat(100);
			const fn = buildExportFilename(longTitle, now);
			expect(fn).toBe(`mathz-${'a'.repeat(60)}-20260330-123456.png`);
		});
	});

	describe('Keyboard Controls', () => {
		it('handles panning, zooming, and reset via keyboard on canvas', () => {
			const listeners: Record<string, (e: any) => void> = {};
			const canvas = {
				style: {},
				addEventListener: (evt: string, fn: any) => {
					listeners[evt] = fn;
				},
				removeEventListener: vi.fn(),
				getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
			} as any;

			const view = new ViewTransform({ cellCount: 20, cellSize: 20 });
			const initialCx = view.centerX;
			const initialScale = view.currentScale;

			let scheduled = false;
			const controller = new InteractionController(canvas, view, (sc) => {
				scheduled = sc;
			});

			const dispatchKey = (key: string, shiftKey = false) => {
				const e = {
					key,
					shiftKey,
					defaultPrevented: false,
					preventDefault() {
						this.defaultPrevented = true;
					},
				};
				listeners['keydown']?.(e);
				return e;
			};

			// ArrowLeft pans view
			const e1 = dispatchKey('ArrowLeft');
			expect(e1.defaultPrevented).toBe(true);
			expect(view.centerX).toBeLessThan(initialCx);
			expect(scheduled).toBe(true);

			// Shift + ArrowRight pans 3x
			const cxBefore = view.centerX;
			dispatchKey('ArrowRight', true);
			expect(view.centerX).toBeGreaterThan(cxBefore);

			// Zoom in with '+'
			const scaleBefore = view.currentScale;
			dispatchKey('+');
			expect(view.currentScale).toBeGreaterThan(scaleBefore);

			// Reset with '0'
			dispatchKey('0');
			expect(view.centerX).toBe(initialCx);
			expect(view.currentScale).toBe(initialScale);

			// Unhandled key 'a' is not prevented
			const eUnhandled = dispatchKey('a');
			expect(eUnhandled.defaultPrevented).toBe(false);

			controller.dispose();
		});
	});

	describe('Visibility Rendering Optimization', () => {
		it('defers repaints while hidden and repaints once on becoming visible', () => {
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
				palette: ['#ff0000'],
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
				width: 400,
				height: 400,
				getContext: vi.fn().mockReturnValue(mockCtx),
			} as unknown as HTMLCanvasElement;

			const rc = { clear: vi.fn() } as any;
			const view = new ViewTransform({ cellCount: 20, cellSize: 20 });
			const grid = { draw: vi.fn() } as any;
			const labels = { draw: vi.fn() } as any;
			const hover = { draw: vi.fn() } as any;
			const interaction = { pointer: null, isDragging: false, dispose: vi.fn() } as any;
			const registry = { render: vi.fn() } as any;
			const stage = { clientWidth: 400 } as unknown as HTMLElement;

			let visibilityCallback: (v: boolean) => void = () => {};
			const fakeVisibilityObserver: IVisibilityObserver = {
				observe: (_el, onChange) => {
					visibilityCallback = onChange;
					return { dispose: vi.fn() } as IDisposable;
				},
			};

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
				undefined,
				fakeVisibilityObserver,
			);

			// Initial repaint scheduled
			expect(scheduler.frames.size).toBe(1);
			scheduler.flush();
			expect(rc.clear).toHaveBeenCalledTimes(1);

			// Hide the graph
			visibilityCallback(false);

			// Request repaint while hidden
			widget.scheduleRepaint(true);
			widget.scheduleRepaint(true);

			// No frame scheduled while hidden
			expect(scheduler.frames.size).toBe(0);

			// Become visible again
			visibilityCallback(true);

			// Now a frame is scheduled
			expect(scheduler.frames.size).toBe(1);
			scheduler.flush();
			expect(rc.clear).toHaveBeenCalledTimes(2);

			widget.dispose();
		});
	});

	describe('renderToBlob', () => {
		it('draws scene into offscreen canvas without hover overlay or changing on-screen transform', async () => {
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
				palette: ['#ff0000'],
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
				width: 400,
				height: 400,
				getContext: vi.fn().mockReturnValue(mockCtx),
			} as unknown as HTMLCanvasElement;

			const rc = { clear: vi.fn() } as any;
			const view = new ViewTransform({ cellCount: 20, cellSize: 20 });
			const grid = { draw: vi.fn() } as any;
			const labels = { draw: vi.fn() } as any;
			const hover = { draw: vi.fn() } as any;
			const interaction = { pointer: null, isDragging: false, dispose: vi.fn() } as any;
			const registry = { render: vi.fn() } as any;
			const stage = { clientWidth: 400 } as unknown as HTMLElement;

			const offscreenCtx = {
				setTransform: vi.fn(),
				clear: vi.fn(),
				fillRect: vi.fn(),
			};
			const offscreenCanvas = {
				width: 0,
				height: 0,
				getContext: vi.fn().mockReturnValue(offscreenCtx),
				toBlob: vi.fn((cb: any) => cb(new Blob(['test'], { type: 'image/png' }))),
			};

			const fakeDoc = {
				createElement: vi.fn().mockImplementation((tag: string) => {
					if (tag === 'canvas') return offscreenCanvas as any;
					return {};
				}),
			};
			vi.stubGlobal('document', fakeDoc);

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

			const blob = await widget.renderToBlob(2);
			expect(blob).not.toBeNull();
			expect(offscreenCanvas.width).toBe(view.size * 2);
			expect(offscreenCanvas.height).toBe(view.size * 2);
			expect(offscreenCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);

			// Hover was not drawn
			expect(hover.draw).not.toHaveBeenCalled();

			widget.dispose();
			vi.unstubAllGlobals();
		});
	});
});
