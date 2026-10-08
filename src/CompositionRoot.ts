import type { App } from 'obsidian';
import { BrowserScheduler } from './core/BrowserScheduler';
import { ConsoleLogger } from './core/ConsoleLogger';
import { ExplicitRenderer } from './graph/renderers/ExplicitRenderer';
import { ImplicitRenderer } from './graph/renderers/ImplicitRenderer';
import { ParametricRenderer } from './graph/renderers/ParametricRenderer';
import { PolarRenderer } from './graph/renderers/PolarRenderer';
import { RendererRegistry } from './graph/RendererRegistry';
import { Evaluator } from './math/Evaluator';
import { ExpressionCompiler } from './math/ExpressionCompiler';
import { FunctionLibrary } from './math/FunctionLibrary';
import { Parser } from './math/Parser';
import { Tokenizer } from './math/Tokenizer';
import { SliderParser } from './statements/SliderDeclaration';
import { StatementClassifier } from './statements/StatementClassifier';
import { MathzBlockFactory } from './ui/MathzBlockFactory';

export class CompositionRoot {
	public constructor(private readonly app: App) {}

	public createBlockFactory(): MathzBlockFactory {
		const logger = new ConsoleLogger();
		const scheduler = new BrowserScheduler();

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
		const registry = new RendererRegistry(explicit, implicit, polar, parametric);

		return new MathzBlockFactory(classifier, sliderParser, registry, scheduler, logger, this.app);
	}
}
