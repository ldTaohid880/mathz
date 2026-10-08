import { AstNode } from "./AstNode";

/** Variable name -> value bindings an `Evaluator` reads `variable` nodes from. */
export type Scope = Readonly<Record<string, number>>;

export interface IEvaluator {
	evaluate(node: AstNode, scope: Scope): number;
}

/** Walks an `AstNode` tree, computing its numeric value for a given scope. */
export class Evaluator implements IEvaluator {
	public evaluate(node: AstNode, scope: Scope): number {
		switch (node.kind) {
			case "number":
				return node.value;
			case "constant":
				return node.value;
			case "variable":
				return scope[node.name];
			case "negate":
				return -this.evaluate(node.arg, scope);
			case "call":
				return node.fn(this.evaluate(node.arg, scope));
			case "binary":
				return this.evaluateBinary(node.op, this.evaluate(node.left, scope), this.evaluate(node.right, scope));
		}
	}

	private evaluateBinary(op: "+" | "-" | "*" | "/" | "^", left: number, right: number): number {
		switch (op) {
			case "+":
				return left + right;
			case "-":
				return left - right;
			case "*":
				return left * right;
			case "/":
				return left / right;
			case "^":
				return Math.pow(left, right);
		}
	}
}
