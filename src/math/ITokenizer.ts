import { Token } from "./Token";

export interface ITokenizer {
	/**
	 * Converts a math expression source string into a flat token list ending
	 * in an `eof` token. `knownIdentifiers` (function names, constant names,
	 * declared variable names) are kept whole; any other run of two or more
	 * letters is split into single-letter tokens so `xy` parses as `x * y`.
	 */
	tokenize(source: string, knownIdentifiers: ReadonlySet<string>): Token[];
}
