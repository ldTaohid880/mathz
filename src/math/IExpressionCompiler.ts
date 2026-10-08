import { CompiledExpression } from "./CompiledExpression";

export interface IExpressionCompiler {
	/** Tokenizes, parses and compiles `source` into a callable expression over `variableNames`. */
	compile(source: string, variableNames: readonly string[]): CompiledExpression;
}
