/** Arithmetic AST produced by `Parser` and walked by `Evaluator`. */
export type AstNode =
	| { readonly kind: "number"; readonly value: number }
	| { readonly kind: "variable"; readonly name: string }
	| { readonly kind: "constant"; readonly value: number }
	| { readonly kind: "call"; readonly fn: (x: number) => number; readonly arg: AstNode }
	| { readonly kind: "userCall"; readonly name: string; readonly args: readonly AstNode[] }
	| { readonly kind: "negate"; readonly arg: AstNode }
	| {
		readonly kind: "binary";
		readonly op: "+" | "-" | "*" | "/" | "^";
		readonly left: AstNode;
		readonly right: AstNode;
	};
