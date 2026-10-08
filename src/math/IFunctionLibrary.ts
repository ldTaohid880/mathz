/** Registry of the built-in single-argument functions and named constants available to expressions. */
export interface IFunctionLibrary {
	hasFunction(name: string): boolean;
	getFunction(name: string): (x: number) => number;
	hasConstant(name: string): boolean;
	getConstant(name: string): number;
	/** Every function and constant name, used by the tokenizer/parser to decide what counts as "known". */
	readonly names: ReadonlySet<string>;
}
