import type { CompiledExpression } from '../math/CompiledExpression';

export interface UserFunctionDef {
	readonly name: string;
	readonly params: readonly string[];
	readonly body: CompiledExpression;
	readonly source: string;
	readonly error?: string;
}

export interface IUserFunctionStore {
	define(def: UserFunctionDef): void;
	get(name: string): UserFunctionDef | undefined;
	has(name: string): boolean;
	names(): readonly string[];
	clear(): void;
}
