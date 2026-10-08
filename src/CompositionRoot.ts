import type { App } from 'obsidian';
import { BrowserScheduler } from './core/BrowserScheduler';
import { ConsoleLogger } from './core/ConsoleLogger';
import { ExplicitRenderer } from './graph/renderers/ExplicitRenderer';
import { ImplicitRenderer } from './graph/renderers/ImplicitRenderer';
import { ParametricRenderer } from './graph/renderers/ParametricRenderer';
import { PointRenderer } from './graph/renderers/PointRenderer';
import { FunctionDefinitionRenderer } from './graph/renderers/FunctionDefinitionRenderer';
import { PolarRenderer } from './graph/renderers/PolarRenderer';
import { RendererRegistry } from './graph/RendererRegistry';
import { Evaluator } from './math/Evaluator';
import { ExpressionCompiler } from './math/ExpressionCompiler';
import { FunctionLibrary } from './math/FunctionLibrary';
import { Parser } from './math/Parser';
import { Tokenizer } from './math/Tokenizer';
import { ObsidianNoteWriter } from './obsidian/ObsidianNoteWriter';
import { ObsidianNotifier } from './obsidian/ObsidianNotifier';
import { ObsidianThemeProvider } from './obsidian/ObsidianThemeProvider';
import { BlockStateCache } from './statements/BlockStateCache';
import { SliderParser } from './statements/SliderDeclaration';
import { StatementClassifier } from './statements/StatementClassifier';
import { MathzBlockFactory } from './ui/MathzBlockFactory';

export class CompositionRoot {
	private readonly blockStateCache = new BlockStateCache();

	public constructor(private readonly app: App) {}

	public createBlockFactory(): MathzBlockFactory {
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

		const explicit = new ExplicitRenderer();
		const implicit = new ImplicitRenderer();
		const polar = new PolarRenderer();
		const parametric = new ParametricRenderer();
		const point = new PointRenderer();
		const funcDef = new FunctionDefinitionRenderer();
		const registry = new RendererRegistry(explicit, implicit, polar, parametric, point, funcDef);

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
		);
	}
}
