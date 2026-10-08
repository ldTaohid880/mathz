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
import { ParameterStore } from '../statements/ParameterStore';
import { isParseError, ISliderParser, SliderDeclaration } from '../statements/SliderDeclaration';
import type { Statement } from '../statements/Statement';
import type { IStatementClassifier } from '../statements/StatementClassifier';
import { SliderPanelView } from './SliderPanelView';

export interface IMathzBlockFactory {
	create(el: HTMLElement, source: string): IDisposable;
}

export class MathzBlockFactory implements IMathzBlockFactory {
	public constructor(
		private readonly classifier: IStatementClassifier,
		private readonly sliderParser: ISliderParser,
		private readonly registry: RendererRegistry,
		private readonly scheduler: IScheduler,
		private readonly logger: ILogger,
		private readonly app: App,
	) {}

	public create(el: HTMLElement, source: string): IDisposable {
		const store = new DisposableStore();

		// Two-pass parsing: Pass 1: Parse all @slider lines
		const lines = source.split(/\r?\n/);
		const sliderDecls: SliderDeclaration[] = [];
		const sliderErrors: Array<{ line: string; error: string }> = [];
		const seenSliderNames = new Set<string>();

		for (const rawLine of lines) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) continue;

			if (line.startsWith('@slider')) {
				const res = this.sliderParser.parse(line);
				if (isParseError(res)) {
					sliderErrors.push({ line, error: res.error });
				} else {
					if (seenSliderNames.has(res.name)) {
						sliderErrors.push({ line, error: `Duplicate slider name "${res.name}"` });
					} else {
						seenSliderNames.add(res.name);
						sliderDecls.push(res);
					}
				}
			}
		}

		const parameterStore = new ParameterStore(sliderDecls);
		store.add(parameterStore);

		// Root container
		const container = el.createDiv({ cls: 'mathz' });

		// Left side: Equations list + Sliders panel
		const side = container.createDiv({ cls: 'mathz-side' });
		const list = side.createEl('ul', { cls: 'mathz-equations' });

		// Render slider errors if any
		for (const { line, error } of sliderErrors) {
			const errChip = list.createEl('li', { cls: 'mathz-chip mathz-error' });
			errChip.createSpan({ cls: 'mathz-swatch' });
			errChip.createEl('code', { text: line });
			errChip.createEl('small', { text: error });
		}

		// Sliders panel
		const sliderPanel = new SliderPanelView(side, parameterStore);
		store.add(sliderPanel);

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
			text: 'drag to pan · ctrl + scroll to zoom · double-click to reset',
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
		rc.params = parameterStore.values();
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
			stage,
			rc,
			view,
			grid,
			labels,
			hover,
			interaction,
			this.registry,
			themeProvider,
			this.scheduler,
			parameterStore,
		);
		widgetRef = widget;
		store.add(widget);

		btnZoomIn.addEventListener('click', () => widget.zoomIn());
		btnZoomOut.addEventListener('click', () => widget.zoomOut());
		btnReset.addEventListener('click', () => widget.resetView());

		// Pass 2: Parse and populate equation chips
		interface ValidEntry {
			statement: Statement;
			chip: HTMLElement;
			hidden: boolean;
		}
		const validEntries: ValidEntry[] = [];

		const updateSwatches = (palette: readonly string[]): void => {
			for (let i = 0; i < validEntries.length; i++) {
				const swatch = validEntries[i].chip.querySelector<HTMLElement>('.mathz-swatch');
				if (swatch) {
					swatch.style.backgroundColor =
						palette.length > 0 ? palette[i % palette.length] : '#1f77b4';
				}
			}
		};

		const updateVisibleStatements = (): void => {
			const visible = validEntries
				.filter((entry) => !entry.hidden)
				.map((entry) => entry.statement);
			widget.setStatements(visible);
		};

		store.add(
			themeProvider.onThemeChange.on((theme) => {
				updateSwatches(theme.palette);
			}),
		);

		const extraVariables = Array.from(seenSliderNames);
		for (const rawLine of lines) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#') || line.startsWith('@slider')) {
				continue;
			}

			const chip = list.createEl('li', { cls: 'mathz-chip' });
			chip.createSpan({ cls: 'mathz-swatch' });
			chip.createEl('code', { text: line });

			try {
				const statement = this.classifier.classify(line, extraVariables);
				const entry: ValidEntry = { statement, chip, hidden: false };
				validEntries.push(entry);

				chip.setAttribute('tabindex', '0');
				chip.setAttribute('role', 'button');
				chip.setAttribute('aria-pressed', 'true');
				chip.setAttribute('title', 'Click to show or hide');

				const toggle = (): void => {
					entry.hidden = !entry.hidden;
					if (entry.hidden) {
						chip.addClass('is-off');
						chip.setAttribute('aria-pressed', 'false');
					} else {
						chip.removeClass('is-off');
						chip.setAttribute('aria-pressed', 'true');
					}
					updateVisibleStatements();
				};

				chip.addEventListener('click', toggle);
				chip.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						toggle();
					}
				});
			} catch (err: unknown) {
				chip.addClass('mathz-error');
				const message = err instanceof Error ? err.message : String(err);
				chip.createEl('small', { text: message });
			}
		}

		updateSwatches(themeProvider.getTheme().palette);
		updateVisibleStatements();

		return store;
	}
}
