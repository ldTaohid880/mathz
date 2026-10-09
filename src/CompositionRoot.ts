import type { App, Plugin } from 'obsidian';
import { BrowserScheduler } from './core/BrowserScheduler';
import { ConsoleLogger } from './core/ConsoleLogger';
import { ExplicitRenderer } from './graph/renderers/ExplicitRenderer';
import { ImplicitRenderer } from './graph/renderers/ImplicitRenderer';
import { InequalityRenderer } from './graph/renderers/InequalityRenderer';
import { ParametricRenderer } from './graph/renderers/ParametricRenderer';
import { PointRenderer } from './graph/renderers/PointRenderer';
import { FunctionDefinitionRenderer } from './graph/renderers/FunctionDefinitionRenderer';
import { PolarRenderer } from './graph/renderers/PolarRenderer';
import { MarchingSquares } from './graph/MarchingSquares';
import { RendererRegistry } from './graph/RendererRegistry';
import { Evaluator } from './math/Evaluator';
import { ExpressionCompiler } from './math/ExpressionCompiler';
import { FunctionLibrary } from './math/FunctionLibrary';
import { Parser } from './math/Parser';
import { Tokenizer } from './math/Tokenizer';
import { ObsidianNoteWriter } from './obsidian/ObsidianNoteWriter';
import { ObsidianNotifier } from './obsidian/ObsidianNotifier';
import { ObsidianSettingsStore } from './obsidian/ObsidianSettingsStore';
import { ObsidianThemeProvider } from './obsidian/ObsidianThemeProvider';
import { SettingsService } from './settings/SettingsService';
import type { ISettingsService } from './settings/ISettingsService';
import { BlockStateCache } from './statements/BlockStateCache';
import { SliderParser } from './statements/SliderDeclaration';
import { StatementClassifier } from './statements/StatementClassifier';
import { MathzBlockFactory } from './ui/MathzBlockFactory';

export class CompositionRoot {
	private readonly blockStateCache = new BlockStateCache();
	public readonly settingsService: ISettingsService;

	public constructor(
		private readonly app: App,
		plugin?: Plugin,
	) {
		const store = plugin ? new ObsidianSettingsStore(plugin) : undefined;
		this.settingsService = new SettingsService(store);
	}

	public async createBlockFactory(): Promise<MathzBlockFactory> {
		await this.settingsService.load();

		const logger = new ConsoleLogger();
		const scheduler = new BrowserScheduler();
		const notifier = new ObsidianNotifier();
		const noteWriter = new ObsidianNoteWriter(this.app);
		const themeProvider = new ObsidianThemeProvider(this.app);

		const functionLibrary = new FunctionLibrary();
		const tokenizer = new Tokenizer();
		const parser = new Parser(functionLibrary);
		const evaluator = new Evaluator();
		const compiler = new ExpressionCompiler(tokenizer, parser, functionLibrary, evaluator);
		const classifier = new StatementClassifier(compiler);

		const sliderParser = new SliderParser(functionLibrary);

		const marchingSquares = new MarchingSquares();
		const explicit = new ExplicitRenderer();
		const implicit = new ImplicitRenderer(marchingSquares);
		const inequality = new InequalityRenderer(marchingSquares);
		const polar = new PolarRenderer();
		const parametric = new ParametricRenderer();
		const point = new PointRenderer();
		const funcDef = new FunctionDefinitionRenderer();
		const registry = new RendererRegistry(
			explicit,
			implicit,
			polar,
			parametric,
			point,
			funcDef,
			inequality,
		);

		return new MathzBlockFactory(
			classifier,
			sliderParser,
			registry,
			scheduler,
			logger,
			themeProvider,
			functionLibrary,
			noteWriter,
			notifier,
			this.blockStateCache,
			this.settingsService,
		);
	}
}
