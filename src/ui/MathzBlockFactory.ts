import { DisposableStore } from '../core/DisposableStore';
import { IDisposable } from '../core/IDisposable';
import { ILogger } from '../core/ILogger';
import { IScheduler } from '../core/IScheduler';
import { GridRenderer } from '../graph/GridRenderer';
import { GraphWidget } from '../graph/GraphWidget';
import { HoverOverlay } from '../graph/HoverOverlay';
import { InteractionController } from '../graph/InteractionController';
import { IThemeProvider } from '../graph/IThemeProvider';
import { LabelRenderer } from '../graph/LabelRenderer';
import { RenderContext } from '../graph/RenderContext';
import { RendererRegistry } from '../graph/RendererRegistry';
import { ViewTransform } from '../graph/ViewTransform';
import { IBlockStateCache } from '../statements/BlockStateCache';
import { ParameterStore } from '../statements/ParameterStore';
import { isParseError, ISliderParser, SliderDeclaration } from '../statements/SliderDeclaration';
import type { Statement } from '../statements/Statement';
import type { IStatementClassifier } from '../statements/StatementClassifier';
import type { BlockLocation, INoteWriter } from './INoteWriter';
import type { INotifier } from './INotifier';
import { SliderPanelView } from './SliderPanelView';

export interface IMathzBlockController extends IDisposable {
	readonly currentSource: string;
	reload(source: string): void;
}

export interface IMathzBlockFactory {
	create(el: HTMLElement, source: string, location?: BlockLocation): IMathzBlockController;
}

interface ValidEntry {
	rawText: string;
	statement: Statement;
	chip: HTMLElement;
	hidden: boolean;
}

export class MathzBlockController implements IMathzBlockController {
	private readonly store = new DisposableStore();
	public currentSource: string;
	private originalSource: string;
	private hiddenStateByText = new Map<string, boolean>();
	private debounceHandle: number | null = null;
	private isSaving = false;

	private parameterStore: ParameterStore;
	private sliderPanel: SliderPanelView;
	private widget: GraphWidget;

	private listEl: HTMLElement;
	private editorEl: HTMLTextAreaElement;
	private btnSave: HTMLButtonElement;
	private validEntries: ValidEntry[] = [];

	public constructor(
		container: HTMLElement,
		initialSource: string,
		private readonly classifier: IStatementClassifier,
		private readonly sliderParser: ISliderParser,
		private readonly registry: RendererRegistry,
		private readonly scheduler: IScheduler,
		private readonly logger: ILogger,
		private readonly themeProvider: IThemeProvider,
		private readonly noteWriter?: INoteWriter,
		private readonly notifier?: INotifier,
		private readonly stateCache?: IBlockStateCache,
		private readonly location?: BlockLocation,
	) {
		this.currentSource = initialSource;
		this.originalSource = initialSource;
		this.parameterStore = new ParameterStore();
		this.store.add(this.parameterStore);

		// Left side: Equations list + Sliders panel
		const side = container.createDiv({ cls: 'mathz-side' });

		// Textarea editor
		const editor = side.createEl('textarea', {
			cls: 'mathz-editor',
			attr: {
				spellcheck: 'false',
				'aria-label': 'Mathz source',
				rows: '6',
			},
		});
		editor.value = initialSource;
		editor.style.display = 'none';
		this.editorEl = editor;

		const list = side.createEl('ul', { cls: 'mathz-equations' });
		this.listEl = list;

		this.sliderPanel = new SliderPanelView(side, this.parameterStore);
		this.store.add(this.sliderPanel);

		// Right side: Canvas stage + controls + hint
		const stage = container.createDiv({ cls: 'mathz-stage' });
		const view = new ViewTransform();
		const canvas = stage.createEl('canvas', { cls: 'mathz-canvas' });
		canvas.width = view.size;
		canvas.height = view.size;

		const tools = stage.createDiv({ cls: 'mathz-tools' });
		const btnEdit = tools.createEl('button', { cls: 'mathz-btn', text: '✎' });
		btnEdit.setAttribute('aria-label', 'Edit equations');
		btnEdit.setAttribute('title', 'Edit equations');

		const btnSave = tools.createEl('button', { cls: 'mathz-btn', text: '💾' });
		btnSave.setAttribute('aria-label', 'Save to note');
		btnSave.setAttribute('title', 'Save to note');
		btnSave.style.display = 'none';
		this.btnSave = btnSave;

		const btnZoomIn = tools.createEl('button', { cls: 'mathz-btn', text: '+' });
		btnZoomIn.setAttribute('aria-label', 'Zoom in');
		btnZoomIn.setAttribute('title', 'Zoom in');

		const btnZoomOut = tools.createEl('button', { cls: 'mathz-btn', text: '−' });
		btnZoomOut.setAttribute('aria-label', 'Zoom out');
		btnZoomOut.setAttribute('title', 'Zoom out');

		const btnReset = tools.createEl('button', { cls: 'mathz-btn', text: '↺' });
		btnReset.setAttribute('aria-label', 'Reset view');
		btnReset.setAttribute('title', 'Reset view');

		stage.createDiv({
			cls: 'mathz-hint',
			text: 'drag to pan · ctrl + scroll to zoom · double-click to reset',
		});

		// Theme provider is injected via constructor

		// Context & Renderers
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) {
			this.logger.error('Failed to get 2D context from canvas');
			this.widget = null as any;
			return;
		}

		const rc = new RenderContext(ctx, view, this.themeProvider.getTheme());
		rc.params = this.parameterStore.values();
		const grid = new GridRenderer(view, rc);
		const labels = new LabelRenderer(view, rc);
		const hover = new HoverOverlay(view, rc);

		let widgetRef: GraphWidget | null = null;
		const interaction = new InteractionController(canvas, view, (sceneChanged) => {
			widgetRef?.scheduleRepaint(sceneChanged);
		});

		this.widget = new GraphWidget(
			canvas,
			stage,
			rc,
			view,
			grid,
			labels,
			hover,
			interaction,
			this.registry,
			this.themeProvider,
			this.scheduler,
			this.parameterStore,
		);
		widgetRef = this.widget;
		this.store.add(this.widget);

		// Restore state from cache if exists
		const cacheKey = this.getCacheKey();
		if (cacheKey && this.stateCache) {
			const cached = this.stateCache.get(cacheKey);
			if (cached) {
				this.widget.view.setState(cached.view);
				for (const [k, v] of Object.entries(cached.sliderValues)) {
					this.parameterStore.set(k, v);
				}
				for (const [eq, hidden] of Object.entries(cached.hiddenEquations)) {
					this.hiddenStateByText.set(eq, hidden);
				}
				this.stateCache.delete(cacheKey);
			}
		}

		btnEdit.addEventListener('click', () => {
			if (this.editorEl.style.display === 'none') {
				this.editorEl.style.display = 'block';
				this.adjustEditorHeight();
				this.editorEl.focus();
			} else {
				this.editorEl.style.display = 'none';
			}
		});

		btnSave.addEventListener('click', () => {
			void this.saveToNote();
		});

		// Editor events
		this.setupEditorEvents();

		btnZoomIn.addEventListener('click', () => this.widget.zoomIn());
		btnZoomOut.addEventListener('click', () => this.widget.zoomOut());
		btnReset.addEventListener('click', () => this.widget.resetView());

		this.store.add(
			this.themeProvider.onThemeChange.on((theme) => {
				this.updateSwatches(theme.palette);
			}),
		);

		// Initial load
		this.reload(initialSource);
	}

	private setupEditorEvents(): void {
		const editor = this.editorEl;

		editor.addEventListener('input', () => {
			this.adjustEditorHeight();
			this.updateSaveButton();
			if (this.debounceHandle !== null) {
				this.scheduler.clearTimeout(this.debounceHandle);
			}
			this.debounceHandle = this.scheduler.setTimeout(() => {
				this.debounceHandle = null;
				this.reload(editor.value);
			}, 200);
		});

		editor.addEventListener('keydown', (e) => {
			if (e.key === 'Tab') {
				e.preventDefault();
				const start = editor.selectionStart;
				const end = editor.selectionEnd;
				const val = editor.value;
				editor.value = val.substring(0, start) + '  ' + val.substring(end);
				editor.selectionStart = editor.selectionEnd = start + 2;
				editor.dispatchEvent(new Event('input'));
			} else if (e.key === 'Escape') {
				editor.style.display = 'none';
			} else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
				e.preventDefault();
				void this.saveToNote();
			}
		});
	}

	private adjustEditorHeight(): void {
		const lineCount = this.editorEl.value.split('\n').length;
		const rows = Math.min(14, Math.max(6, lineCount));
		this.editorEl.rows = rows;
	}

	public reload(source: string): void {
		this.currentSource = source;

		// 1. Parse @slider lines
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

		// Update parameter store: keeps existing values clamped, uses declared for new, drops removed
		this.parameterStore.setDeclarations(sliderDecls, true);
		this.sliderPanel.render();

		// 2. Clear old equation list DOM
		while (this.listEl.firstChild) {
			this.listEl.removeChild(this.listEl.firstChild);
		}
		this.validEntries = [];

		// Render slider errors if any
		for (const { line, error } of sliderErrors) {
			const errChip = this.listEl.createEl('li', { cls: 'mathz-chip mathz-error' });
			errChip.createSpan({ cls: 'mathz-swatch' });
			errChip.createEl('code', { text: line });
			errChip.createEl('small', { text: error });
		}

		// 3. Parse equations
		const extraVariables = Array.from(seenSliderNames);
		for (const rawLine of lines) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#') || line.startsWith('@slider')) {
				continue;
			}

			const chip = this.listEl.createEl('li', { cls: 'mathz-chip' });
			chip.createSpan({ cls: 'mathz-swatch' });
			chip.createEl('code', { text: line });

			try {
				const statement = this.classifier.classify(line, extraVariables);
				const wasHidden = this.hiddenStateByText.get(line) ?? false;
				const entry: ValidEntry = {
					rawText: line,
					statement,
					chip,
					hidden: wasHidden,
				};
				this.validEntries.push(entry);

				chip.setAttribute('tabindex', '0');
				chip.setAttribute('role', 'button');
				chip.setAttribute('title', 'Click to show or hide');

				if (wasHidden) {
					chip.addClass('is-off');
					chip.setAttribute('aria-pressed', 'false');
				} else {
					chip.setAttribute('aria-pressed', 'true');
				}

				const toggle = (): void => {
					entry.hidden = !entry.hidden;
					this.hiddenStateByText.set(line, entry.hidden);
					if (entry.hidden) {
						chip.addClass('is-off');
						chip.setAttribute('aria-pressed', 'false');
					} else {
						chip.removeClass('is-off');
						chip.setAttribute('aria-pressed', 'true');
					}
					this.updateVisibleStatements();
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

		this.updateSwatches(this.themeProvider.getTheme().palette);
		this.updateVisibleStatements();
		this.updateSaveButton();
	}

	private updateSwatches(palette: readonly string[]): void {
		for (let i = 0; i < this.validEntries.length; i++) {
			const swatch = this.validEntries[i].chip.querySelector<HTMLElement>('.mathz-swatch');
			if (swatch) {
				swatch.style.backgroundColor =
					palette.length > 0 ? palette[i % palette.length] : '#1f77b4';
			}
		}
	}

	private updateVisibleStatements(): void {
		const visible = this.validEntries
			.filter((entry) => !entry.hidden)
			.map((entry) => entry.statement);
		this.widget.setStatements(visible);
	}

	private updateSaveButton(): void {
		if (!this.btnSave) return;
		const isDirty = this.currentSource !== this.originalSource;
		this.btnSave.style.display = isDirty ? 'inline-flex' : 'none';
	}

	private getCacheKey(): string | null {
		if (!this.location) return null;
		const info = this.location.getSectionInfo();
		if (!info) return null;
		return `${this.location.sourcePath}:${info.lineStart}`;
	}

	private async saveToNote(): Promise<void> {
		if (this.isSaving || !this.noteWriter || !this.location) return;
		if (this.currentSource.trim() === this.originalSource.trim()) return;

		this.isSaving = true;
		this.btnSave.disabled = true;

		const cacheKey = this.getCacheKey();
		if (cacheKey && this.stateCache) {
			this.stateCache.set(cacheKey, {
				view: {
					cx: this.widget.view.centerX,
					cy: this.widget.view.centerY,
					scale: this.widget.view.currentScale,
				},
				sliderValues: this.parameterStore.values(),
				hiddenEquations: Object.fromEntries(this.hiddenStateByText),
			});
		}

		try {
			const res = await this.noteWriter.save(
				this.location,
				this.originalSource,
				this.currentSource,
			);
			if (res.ok) {
				this.originalSource = this.currentSource;
				this.notifier?.info('Saved');
				this.updateSaveButton();
			} else {
				this.notifier?.error(res.reason);
			}
		} finally {
			this.isSaving = false;
			this.btnSave.disabled = false;
			this.updateSaveButton();
		}
	}

	public dispose(): void {
		if (this.debounceHandle !== null) {
			this.scheduler.clearTimeout(this.debounceHandle);
			this.debounceHandle = null;
		}
		this.store.dispose();
	}
}

export class MathzBlockFactory implements IMathzBlockFactory {
	public constructor(
		private readonly classifier: IStatementClassifier,
		private readonly sliderParser: ISliderParser,
		private readonly registry: RendererRegistry,
		private readonly scheduler: IScheduler,
		private readonly logger: ILogger,
		private readonly themeProvider: IThemeProvider,
		private readonly noteWriter?: INoteWriter,
		private readonly notifier?: INotifier,
		private readonly stateCache?: IBlockStateCache,
	) {}

	public create(el: HTMLElement, source: string, location?: BlockLocation): IMathzBlockController {
		const container = el.createDiv({ cls: 'mathz' });
		return new MathzBlockController(
			container,
			source,
			this.classifier,
			this.sliderParser,
			this.registry,
			this.scheduler,
			this.logger,
			this.themeProvider,
			this.noteWriter,
			this.notifier,
			this.stateCache,
			location,
		);
	}
}
