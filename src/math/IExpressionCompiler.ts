import { CompiledExpression } from "./CompiledExpression";
import type { IUserFunctionStore } from "../statements/IUserFunctionStore";

export interface CompileOptions {
	readonly variableNames?: readonly string[];
	readonly userFunctions?: Readonly<Record<string, number>> | ReadonlyMap<string, number>;
	readonly userFunctionStore?: IUserFunctionStore;
	readonly isFunctionBody?: boolean;
}

export interface IExpressionCompiler {
	/** Tokenizes, parses and compiles `source` into a callable expression over `variableNames` or options. */
	compile(
		source: string,
		variableNamesOrOptions: readonly string[] | CompileOptions,
	): CompiledExpression;
}
