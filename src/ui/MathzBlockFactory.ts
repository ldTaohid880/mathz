import type { App } from 'obsidian';
import { DisposableStore } from '../core/DisposableStore';
import { IDisposable } from '../core/IDisposable';
import { ILogger } from '../core/ILogger';
import { IScheduler } from '../core/IScheduler';
import { GridRenderer } from '../graph/GridRenderer';
import { GraphWidget } from '../graph/GraphWidget';
import { HoverOverlay } from '../graph/HoverOverlay';
import { InteractionController } from '../graph/InteractionController';
import { LabelRenderer } from '../graph/LabelRenderer';
import { RenderContext } from '../graph/RenderContext';
import { RendererRegistry } from '../graph/RendererRegistry';
import { ViewTransform } from '../graph/ViewTransform';
import { ObsidianThemeProvider } from '../obsidian/ObsidianThemeProvider';
import type { Statement } from '../statements/Statement';
import type { IStatementClassifier } from '../statements/StatementClassifier';

export interface IMathzBlockFactory {
	create(el: HTMLElement, source: string): IDisposable;
}

export class MathzBlockFactory implements IMathzBlockFactory {
	public constructor(
		private readonly classifier: IStatementClassifier,
		private readonly registry: RendererRegistry,
		private readonly scheduler: IScheduler,
		private readonly logger: ILogger,
		private readonly app: App,
	) {}

	public create(el: HTMLElement, source: string): IDisposable {
		const store = new DisposableStore();

		// Root container
		const container = el.createDiv({ cls: 'mathz' });

		// Left side: Equations list
		const side = container.createDiv({ cls: 'mathz-side' });
		const list = side.createEl('ul', { cls: 'mathz-equations' });

		// Right side: Canvas stage + controls + hint
		const stage = container.createDiv({ cls: 'mathz-stage' });
		const view = new ViewTransform();
		const canvas = stage.createEl('canvas', { cls: 'mathz-canvas' });
		canvas.width = view.size;
		canvas.height = view.size;

		const tools = stage.createDiv({ cls: 'mathz-tools' });
		const btnZoomIn = tools.createEl('button', { cls: 'mathz-btn', text: '+' });
		btnZoomIn.setAttribute('aria-label', 'Zoom in');
		const btnZoomOut = tools.createEl('button', { cls: 'mathz-btn', text: '−' });
		btnZoomOut.setAttribute('aria-label', 'Zoom out');
		const btnReset = tools.createEl('button', { cls: 'mathz-btn', text: '↺' });
		btnReset.setAttribute('aria-label', 'Reset view');

		stage.createDiv({
			cls: 'mathz-hint',
			text: 'drag to pan · scroll to zoom · double-click to reset',
		});

		// Theme provider
		const themeProvider = new ObsidianThemeProvider(this.app);
		store.add(themeProvider);

		// Context & Renderers
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) {
			this.logger.error('Failed to get 2D context from canvas');
			return store;
		}

		const rc = new RenderContext(ctx, view, themeProvider.getTheme());
		const grid = new GridRenderer(view, rc);
		const labels = new LabelRenderer(view, rc);
		const hover = new HoverOverlay(view, rc);

		// We need widget reference in InteractionController callback, so hold variable
		let widgetRef: GraphWidget | null = null;
		const interaction = new InteractionController(canvas, view, (sceneChanged) => {
			widgetRef?.scheduleRepaint(sceneChanged);
		});

		const widget = new GraphWidget(
			canvas,
			rc,
			view,
			grid,
			labels,
			hover,
			interaction,
			this.registry,
			themeProvider,
			this.scheduler,
		);
		widgetRef = widget;
		store.add(widget);

		btnZoomIn.addEventListener('click', () => widget.zoomIn());
		btnZoomOut.addEventListener('click', () => widget.zoomOut());
		btnReset.addEventListener('click', () => widget.resetView());

		// Parse equations and populate chips
		const lines = source.split(/\r?\n/);
		const statements: Statement[] = [];
		const palette = themeProvider.getTheme().palette;

		let validIndex = 0;
		for (const rawLine of lines) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) {
				continue;
			}

			const chip = list.createEl('li', { cls: 'mathz-chip' });
			const swatch = chip.createSpan({ cls: 'mathz-swatch' });
			chip.createEl('code', { text: line });

			try {
				const statement = this.classifier.classify(line);
				statements.push(statement);
				const color = palette.length > 0 ? palette[validIndex % palette.length] : '#1f77b4';
				swatch.style.backgroundColor = color;
				validIndex++;
			} catch (err: unknown) {
				chip.addClass('mathz-error');
				const message = err instanceof Error ? err.message : String(err);
				chip.createEl('small', { text: message });
			}
		}

		widget.setStatements(statements);

		return store;
	}
}
