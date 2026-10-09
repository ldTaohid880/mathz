import { DisposableStore } from '../core/DisposableStore';
import { IDisposable } from '../core/IDisposable';
import { IScheduler } from '../core/IScheduler';
import type { Statement } from '../statements/Statement';
import type { GridRenderer } from './GridRenderer';
import type { HoverOverlay } from './HoverOverlay';
import type { InteractionController } from './InteractionController';
import type { IThemeProvider } from './IThemeProvider';
import type { LabelRenderer } from './LabelRenderer';
import { RenderContext } from './RenderContext';
import type { RendererRegistry } from './RendererRegistry';
import type { ViewTransform } from './ViewTransform';

import type { IParameterStore } from '../statements/IParameterStore';
import type { IVisibilityObserver } from '../core/IVisibilityObserver';

export class GraphWidget implements IDisposable {
	private readonly store = new DisposableStore();
	private statements: Statement[] = [];
	private snapshot: ImageData | null = null;
	private pendingFrame: number | null = null;
	private pendingSceneChange = false;
	private resizeObserver: ResizeObserver | null = null;
	private currentDpr = 1;
	private isVisible = true;
	private isDirtyWhileHidden = false;

	public constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly stage: HTMLElement,
		private readonly rc: RenderContext,
		public readonly view: ViewTransform,
		private readonly grid: GridRenderer,
		private readonly labels: LabelRenderer,
		private readonly hover: HoverOverlay,
		private readonly interaction: InteractionController,
		private readonly registry: RendererRegistry,
		private readonly themeProvider: IThemeProvider,
		private readonly scheduler: IScheduler,
		private readonly parameterStore?: IParameterStore,
		private readonly visibilityObserver?: IVisibilityObserver,
	) {
		this.store.add(this.interaction);
		this.store.add(
			this.themeProvider.onThemeChange.on((theme) => {
				this.rc.theme = theme;
				this.scheduleRepaint(true);
			}),
		);
		this.rc.theme = this.themeProvider.getTheme();

		if (this.parameterStore) {
			this.rc.params = this.parameterStore.values();
			this.store.add(
				this.parameterStore.onChanged.on((values) => {
					this.rc.params = values;
					this.scheduleRepaint(true);
				}),
			);
		}

		this.setupResizeObserver();
		const initialWidth = this.stage.clientWidth || this.view.size;
		const initialCss = Math.min(600, Math.max(200, Math.floor(initialWidth)));
		this.updateCanvasDimensions(initialCss);

		if (this.visibilityObserver) {
			this.store.add(
				this.visibilityObserver.observe(this.stage, (visible) => {
					const wasVisible = this.isVisible;
					this.isVisible = visible;
					if (!wasVisible && visible && this.isDirtyWhileHidden) {
						this.isDirtyWhileHidden = false;
						this.scheduleRepaint(this.pendingSceneChange);
					}
				}),
			);
		}

		this.scheduleRepaint(true);
	}

	private setupResizeObserver(): void {
		if (typeof ResizeObserver === 'undefined') {
			return;
		}
		this.resizeObserver = new ResizeObserver(() => {
			const css = Math.min(600, Math.max(200, Math.floor(this.stage.clientWidth)));
			this.currentDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
			if (css !== this.view.size || this.canvas.width !== Math.round(css * this.currentDpr)) {
				this.updateCanvasDimensions(css);
				this.scheduleRepaint(true);
			}
		});
		this.resizeObserver.observe(this.stage);
	}

	private updateCanvasDimensions(cssSize: number): void {
		this.currentDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		this.view.setSize(cssSize);
		this.canvas.width = Math.round(cssSize * this.currentDpr);
		this.canvas.height = Math.round(cssSize * this.currentDpr);
		this.snapshot = null;
	}

	public setStatements(statements: Statement[]): void {
		this.statements = [...statements];
		this.scheduleRepaint(true);
	}

	public zoomIn(): void {
		this.view.zoomAt(1.5);
		this.scheduleRepaint(true);
	}

	public zoomOut(): void {
		this.view.zoomAt(1 / 1.5);
		this.scheduleRepaint(true);
	}

	public resetView(): void {
		this.view.reset();
		this.scheduleRepaint(true);
	}

	public drawScene(targetRc: RenderContext = this.rc): void {
		targetRc.clear();
		this.grid.draw(targetRc);
		this.labels.draw(targetRc);

		const palette = this.themeProvider.getTheme().palette;
		const entries = this.statements.map((statement, index) => {
			const color = palette.length > 0 ? palette[index % palette.length] : '#1f77b4';
			const layer = this.registry.getLayer(statement);
			return { statement, color, layer, index };
		});

		entries.sort((a, b) => (a.layer !== b.layer ? a.layer - b.layer : a.index - b.index));

		for (const entry of entries) {
			this.registry.render(entry.statement, this.view, targetRc, { color: entry.color, width: 2 });
		}
	}

	public async renderToBlob(scale = 2): Promise<Blob | null> {
		if (typeof document === 'undefined') return null;
		const cssSize = this.view.size;
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(cssSize * scale);
		canvas.height = Math.round(cssSize * scale);

		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		ctx.setTransform(scale, 0, 0, scale, 0, 0);

		const offRc = new RenderContext(ctx, this.view, this.themeProvider.getTheme(), {
			fontFamily: this.rc.fontFamily,
			fontSize: this.rc.fontSize,
		});
		offRc.params = this.parameterStore ? this.parameterStore.values() : this.rc.params;

		this.drawScene(offRc);

		return new Promise<Blob | null>((resolve) => {
			canvas.toBlob((blob) => resolve(blob), 'image/png');
		});
	}

	public scheduleRepaint(sceneChanged: boolean): void {
		if (sceneChanged) {
			this.pendingSceneChange = true;
		}
		if (!this.isVisible) {
			this.isDirtyWhileHidden = true;
			return;
		}
		if (this.pendingFrame !== null) {
			return;
		}
		this.pendingFrame = this.scheduler.requestFrame(() => {
			this.pendingFrame = null;
			const redrawScene = this.pendingSceneChange;
			this.pendingSceneChange = false;
			this.render(redrawScene);
		});
	}

	private render(sceneChanged: boolean): void {
		const ctx = this.canvas.getContext('2d');
		if (!ctx) return;

		const dpr = this.currentDpr || (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
		const backingWidth = this.canvas.width;
		const backingHeight = this.canvas.height;

		if (sceneChanged || !this.snapshot) {
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			this.drawScene(this.rc);

			ctx.setTransform(1, 0, 0, 1, 0, 0);
			this.snapshot = ctx.getImageData(0, 0, backingWidth, backingHeight);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		} else {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.putImageData(this.snapshot, 0, 0);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		const pointer = this.interaction.pointer;
		if (pointer && !this.interaction.isDragging) {
			this.hover.draw(pointer);
		}
	}

	public dispose(): void {
		if (this.pendingFrame !== null) {
			this.scheduler.cancelFrame(this.pendingFrame);
			this.pendingFrame = null;
		}
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
		this.store.dispose();
		this.snapshot = null;
	}
}
