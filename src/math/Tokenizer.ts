import { ITokenizer } from "./ITokenizer";
import { Token } from "./Token";

const TOKEN_PATTERN = /\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z]+|[-+*/^(),]|\S/g;
const WORD_PATTERN = /^[a-z]{2,}$/;
const NUMBER_START_PATTERN = /^[\d.]/;

/**
 * Lexes a math expression source string the same way the original Mathz
 * `compileExpression` did: lowercase, normalize `θ` to `theta`, split into
 * number/word/operator/other tokens, then split any unknown multi-letter
 * word into single letters so e.g. `xy` means `x * y` while known words
 * (function names, constants, declared variables) stay whole.
 */
export class Tokenizer implements ITokenizer {
	public tokenize(source: string, knownIdentifiers: ReadonlySet<string>): Token[] {
		const normalized = source.toLowerCase().replace(/θ/g, "theta");
		const raw = normalized.match(TOKEN_PATTERN) ?? [];
		const words = raw.flatMap((text) =>
			WORD_PATTERN.test(text) && !knownIdentifiers.has(text) ? text.split("") : [text],
		);

		const tokens: Token[] = words.map((text) => ({ type: this.classify(text), value: text }));
		tokens.push({ type: "eof", value: "" });
		return tokens;
	}

	private classify(text: string): Token["type"] {
		if (NUMBER_START_PATTERN.test(text)) return "number";
		if (/^[a-z]/.test(text)) return "identifier";
		if (text === "(") return "lparen";
		if (text === ")") return "rparen";
		if (text === ",") return "comma";
		return "op";
	}
}
