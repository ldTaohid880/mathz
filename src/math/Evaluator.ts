import { AstNode } from "./AstNode";
import type { IUserFunctionStore } from "../statements/IUserFunctionStore";

/** Variable name -> value bindings an `Evaluator` reads `variable` nodes from. */
export type Scope = Readonly<Record<string, number>>;

export interface IEvaluator {
	evaluate(node: AstNode, scope: Scope, depth?: number, userFunctions?: IUserFunctionStore): number;
}

/** Walks an `AstNode` tree, computing its numeric value for a given scope. */
export class Evaluator implements IEvaluator {
	public evaluate(node: AstNode, scope: Scope, depth = 0, userFunctions?: IUserFunctionStore): number {
		if (depth > 64) {
			return NaN;
		}

		switch (node.kind) {
			case "number":
				return node.value;
			case "constant":
				return node.value;
			case "variable":
				return scope[node.name];
			case "negate":
				return -this.evaluate(node.arg, scope, depth, userFunctions);
			case "call":
				return node.fn(this.evaluate(node.arg, scope, depth, userFunctions));
			case "userCall": {
				if (!userFunctions) return NaN;
				const def = userFunctions.get(node.name);
				if (!def) return NaN;

				// 1. Evaluate call arguments using the caller's scope
				const evaluatedArgs = node.args.map((a) => this.evaluate(a, scope, depth + 1, userFunctions));

				// 2. Bind evaluated arguments to function parameters
				const boundParams: Record<string, number> = {};
				for (let i = 0; i < def.params.length; i++) {
					boundParams[def.params[i]] = evaluatedArgs[i];
				}

				// 3. Evaluate the function body using a new scope: { ...sliderValues, ...boundParams }
				// This guarantees function parameters shadow sliders.
				const newScope: Record<string, number> = { ...scope, ...boundParams };
				return def.body.evaluate(newScope);
			}
			case "binary":
				return this.evaluateBinary(
					node.op,
					this.evaluate(node.left, scope, depth, userFunctions),
					this.evaluate(node.right, scope, depth, userFunctions),
				);
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
