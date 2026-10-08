/** Discrete lexical units produced by `Tokenizer` for the `Parser`. */
export type TokenType =
	| "number"
	| "identifier"
	| "op"
	| "lparen"
	| "rparen"
	| "comma"
	| "eof";

export interface Token {
	readonly type: TokenType;
	readonly value: string;
}
