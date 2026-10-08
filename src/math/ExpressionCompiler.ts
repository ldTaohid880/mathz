import { AstNode } from "./AstNode";
import { CompiledExpression } from "./CompiledExpression";
import { IEvaluator, Scope } from "./Evaluator";
import { CompileOptions, IExpressionCompiler } from "./IExpressionCompiler";
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

	public compile(
		source: string,
		variableNamesOrOptions: readonly string[] | CompileOptions,
	): CompiledExpression {
		const options: CompileOptions = Array.isArray(variableNamesOrOptions)
			? { variableNames: variableNamesOrOptions as readonly string[] }
			: (variableNamesOrOptions as CompileOptions);

		const variableNames = options.variableNames ?? [];
		const userFunctions = options.userFunctions;
		const userFuncNames = userFunctions instanceof Map
			? Array.from(userFunctions.keys())
			: Object.keys(userFunctions ?? {});

		const known = new Set([...this.functions.names, ...variableNames, ...userFuncNames]);
		const tokens = this.tokenizer.tokenize(source, known);
		const ast = this.parser.parse(tokens, variableNames, userFunctions, options.isFunctionBody);
		const usedVariables = collectVariables(ast);
		const calledFunctions = collectCalledFunctions(ast);
		return {
			usedVariables,
			calledFunctions,
			evaluate: (scope: Scope) => this.evaluator.evaluate(ast, scope, 0, options.userFunctionStore),
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
		case "userCall":
			for (const arg of node.args) {
				collectVariables(arg, into);
			}
			break;
		case "binary":
			collectVariables(node.left, into);
			collectVariables(node.right, into);
			break;
	}
	return into;
}

function collectCalledFunctions(node: AstNode, into: Set<string> = new Set()): ReadonlySet<string> {
	switch (node.kind) {
		case "negate":
		case "call":
			collectCalledFunctions(node.arg, into);
			break;
		case "userCall":
			into.add(node.name);
			for (const arg of node.args) {
				collectCalledFunctions(arg, into);
			}
			break;
		case "binary":
			collectCalledFunctions(node.left, into);
			collectCalledFunctions(node.right, into);
			break;
	}
	return into;
}
