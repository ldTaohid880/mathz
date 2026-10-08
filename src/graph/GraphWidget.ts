import { DisposableStore } from '../core/DisposableStore';
import { IDisposable } from '../core/IDisposable';
import { IScheduler } from '../core/IScheduler';
import type { Statement } from '../statements/Statement';
import type { GridRenderer } from './GridRenderer';
import type { HoverOverlay } from './HoverOverlay';
import type { InteractionController } from './InteractionController';
import type { IThemeProvider } from './IThemeProvider';
import type { LabelRenderer } from './LabelRenderer';
import type { RenderContext } from './RenderContext';
import type { RendererRegistry } from './RendererRegistry';
import type { ViewTransform } from './ViewTransform';

export class GraphWidget implements IDisposable {
	private readonly store = new DisposableStore();
	private statements: Statement[] = [];
	private snapshot: ImageData | null = null;
	private pendingFrame: number | null = null;
	private pendingSceneChange = false;

	public constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly rc: RenderContext,
		private readonly view: ViewTransform,
		private readonly grid: GridRenderer,
		private readonly labels: LabelRenderer,
		private readonly hover: HoverOverlay,
		private readonly interaction: InteractionController,
		private readonly registry: RendererRegistry,
		private readonly themeProvider: IThemeProvider,
		private readonly scheduler: IScheduler,
	) {
		console.log("theme", JSON.stringify(this.themeProvider.getTheme()));
		this.store.add(this.interaction);
		this.store.add(
			this.themeProvider.onThemeChange.on((theme) => {
				this.rc.theme = theme;
				this.scheduleRepaint(true);
			}),
		);
		this.rc.theme = this.themeProvider.getTheme();
		this.scheduleRepaint(true);
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

	public scheduleRepaint(sceneChanged: boolean): void {
		if (sceneChanged) {
			this.pendingSceneChange = true;
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

		if (sceneChanged || !this.snapshot) {
			this.rc.clear();
			this.grid.draw();
			this.labels.draw();

			const palette = this.themeProvider.getTheme().palette;
			for (let i = 0; i < this.statements.length; i++) {
				const statement = this.statements[i];
				const color = palette.length > 0 ? palette[i % palette.length] : '#1f77b4';
				this.registry.render(statement, this.view, this.rc, { color, width: 2 });
			}

			this.snapshot = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		} else {
			ctx.putImageData(this.snapshot, 0, 0);
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
		this.store.dispose();
		this.snapshot = null;
	}
}
