import { AstNode } from "./AstNode";
import { CompiledExpression } from "./CompiledExpression";
import { IEvaluator, Scope } from "./Evaluator";
import { IExpressionCompiler } from "./IExpressionCompiler";
import { IFunctionLibrary } from "./IFunctionLibrary";
import { IParser } from "./Parser";
import { ITokenizer } from "./ITokenizer";

/** Orchestrates tokenizing, parsing and evaluation to turn expression source text into a `CompiledExpression`. */
export class ExpressionCompiler implements IExpressionCompiler {
	constructor(
		private readonly tokenizer: ITokenizer,
		private readonly parser: IParser,
		private readonly functions: IFunctionLibrary,
		private readonly evaluator: IEvaluator,
	) {}

	public compile(source: string, variableNames: readonly string[]): CompiledExpression {
		const known = new Set([...this.functions.names, ...variableNames]);
		const tokens = this.tokenizer.tokenize(source, known);
		const ast = this.parser.parse(tokens, variableNames);
		const usedVariables = collectVariables(ast);
		return {
			usedVariables,
			evaluate: (scope: Scope) => this.evaluator.evaluate(ast, scope),
		};
	}
}

function collectVariables(node: AstNode, into: Set<string> = new Set()): ReadonlySet<string> {
	switch (node.kind) {
		case "variable":
			into.add(node.name);
			break;
		case "negate":
		case "call":
			collectVariables(node.arg, into);
			break;
		case "binary":
			collectVariables(node.left, into);
			collectVariables(node.right, into);
			break;
	}
	return into;
}
