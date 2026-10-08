import { AstNode } from "./AstNode";
import { IFunctionLibrary } from "./IFunctionLibrary";
import { Token } from "./Token";

export interface UserFunctionSignatures {
	readonly [name: string]: number; // name -> arity
}

export interface IParser {
	/**
	 * Parses a token stream (from `ITokenizer`) into an AST. `variableNames`
	 * are the only bare identifiers allowed besides known functions/constants.
	 */
	parse(
		tokens: Token[],
		variableNames: readonly string[],
		userFunctions?: Readonly<Record<string, number>> | ReadonlyMap<string, number>,
		isFunctionBody?: boolean,
	): AstNode;
}

/**
 * Recursive-descent parser matching the original Mathz grammar:
 *   expr   := term (("+" | "-") term)*
 *   term   := unary (("*" | "/") unary | unary)*      // trailing unary = implicit multiplication
 *   unary  := ("-" | "+")? power
 *   power  := primary ("^" unary)?
 *   primary:= number | "(" expr ")" | func "(" expr ")" | userFunc "(" expr {, expr} ")" | constant | variable
 */
export class Parser implements IParser {
	constructor(private readonly functions: IFunctionLibrary) {}

	public parse(
		tokens: Token[],
		variableNames: readonly string[],
		userFunctions?: Readonly<Record<string, number>> | ReadonlyMap<string, number>,
		isFunctionBody = false,
	): AstNode {
		const userFuncMap: ReadonlyMap<string, number> =
			userFunctions instanceof Map
				? userFunctions
				: new Map(Object.entries(userFunctions ?? {}));

		let pos = 0;
		const peek = (): Token => tokens[pos];
		const next = (): Token => tokens[pos++];
		const isImplicitMultiplicationStart = (tok: Token): boolean =>
			tok.type === "number" || tok.type === "identifier" || tok.type === "lparen";

		const expr = (): AstNode => {
			let left = term();
			while (peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
				const op = next().value as "+" | "-";
				const right = term();
				left = { kind: "binary", op, left, right };
			}
			return left;
		};

		const term = (): AstNode => {
			let left = unary();
			for (;;) {
				const tok = peek();
				if (tok.type === "op" && (tok.value === "*" || tok.value === "/")) {
					next();
					const right = unary();
					left = { kind: "binary", op: tok.value as "*" | "/", left, right };
				} else if (isImplicitMultiplicationStart(tok)) {
					const right = power();
					left = { kind: "binary", op: "*", left, right };
				} else {
					break;
				}
			}
			return left;
		};

		const unary = (): AstNode => {
			if (peek().type === "op" && peek().value === "-") {
				next();
				return { kind: "negate", arg: unary() };
			}
			if (peek().type === "op" && peek().value === "+") {
				next();
				return unary();
			}
			return power();
		};

		const power = (): AstNode => {
			const base = primary();
			if (peek().type === "op" && peek().value === "^") {
				next();
				const exponent = unary();
				return { kind: "binary", op: "^", left: base, right: exponent };
			}
			return base;
		};

		const primary = (): AstNode => {
			const tok = next();
			if (tok === undefined || tok.type === "eof") throw new Error("Unexpected end of equation");

			if (tok.type === "number") return { kind: "number", value: parseFloat(tok.value) };

			if (tok.type === "lparen") {
				const inner = expr();
				if (next().type !== "rparen") throw new Error("Missing closing )");
				return inner;
			}

			if (tok.type === "identifier") {
				const name = tok.value;

				// Built-in function call
				if (this.functions.hasFunction(name)) {
					if (next().type !== "lparen") throw new Error(`Expected ( after ${name}`);
					const arg = expr();
					if (next().type !== "rparen") throw new Error("Missing closing )");
					return { kind: "call", fn: this.functions.getFunction(name), arg };
				}

				// User function call: identifier followed by (
				if (userFuncMap.has(name) && peek().type === "lparen") {
					next(); // consume '('
					const expectedArity = userFuncMap.get(name)!;
					const args: AstNode[] = [];

					if (peek().type !== "rparen") {
						for (;;) {
							args.push(expr());
							if (peek().type === "comma") {
								next(); // consume ','
							} else {
								break;
							}
						}
					}

					if (next().type !== "rparen") throw new Error("Missing closing )");

					if (args.length === 0) {
						throw new Error(`Zero arguments are invalid for function ${name}`);
					}

					if (args.length !== expectedArity) {
						const pluralExpected = `${expectedArity} argument${expectedArity === 1 ? '' : 's'}`;
						throw new Error(`${name} expects ${pluralExpected}, got ${args.length}`);
					}

					return { kind: "userCall", name, args };
				}

				if (this.functions.hasConstant(name)) {
					return { kind: "constant", value: this.functions.getConstant(name) };
				}
				if (variableNames.includes(name)) {
					return { kind: "variable", name };
				}

				if (isFunctionBody) {
					throw new Error(`Unknown name "${name}". Declare it with @slider, or add it as a parameter`);
				}

				throw new Error(`Unknown name "${name}". Declare it with @slider ${name} = 1 [min, max]`);
			}

			throw new Error(`Unexpected "${tok.value}"`);
		};

		const result = expr();
		if (peek().type !== "eof") throw new Error(`Unexpected "${peek().value}"`);
		return result;
	}
}
