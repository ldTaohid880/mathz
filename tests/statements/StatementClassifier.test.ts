import { describe, expect, it } from "vitest";
import { Evaluator } from "../../src/math/Evaluator";
import { ExpressionCompiler } from "../../src/math/ExpressionCompiler";
import { FunctionLibrary } from "../../src/math/FunctionLibrary";
import { Parser } from "../../src/math/Parser";
import { Tokenizer } from "../../src/math/Tokenizer";
import { StatementClassifier } from "../../src/statements/StatementClassifier";

function makeClassifier() {
	const functions = new FunctionLibrary();
	const compiler = new ExpressionCompiler(new Tokenizer(), new Parser(functions), functions, new Evaluator());
	return new StatementClassifier(compiler);
}

describe("StatementClassifier", () => {
	it("classifies 'y = ...' as explicit over x", () => {
		const statement = makeClassifier().classify("y = sin(x)");
		expect(statement.kind).toBe("explicit");
		if (statement.kind === "explicit") {
			expect(statement.axis).toBe("x");
			expect(statement.fn.evaluate({ x: 0 })).toBeCloseTo(0);
		}
	});

	it("classifies 'x = ...' as explicit over y", () => {
		const statement = makeClassifier().classify("x = cos(y)");
		expect(statement.kind).toBe("explicit");
		if (statement.kind === "explicit") {
			expect(statement.axis).toBe("y");
			expect(statement.fn.evaluate({ y: 0 })).toBeCloseTo(1);
		}
	});

	it("classifies 'r = ...' as polar", () => {
		const statement = makeClassifier().classify("r = 3sin(2theta)");
		expect(statement.kind).toBe("polar");
		if (statement.kind === "polar") {
			expect(statement.fn.evaluate({ theta: 0 })).toBeCloseTo(0);
		}
	});

	it("classifies comma-separated 'x = ..., y = ...' as parametric regardless of order", () => {
		const statement = makeClassifier().classify("y = 3sin(t), x = 5cos(t)");
		expect(statement.kind).toBe("parametric");
		if (statement.kind === "parametric") {
			expect(statement.fx.evaluate({ t: 0 })).toBeCloseTo(5);
			expect(statement.fy.evaluate({ t: 0 })).toBeCloseTo(0);
		}
	});

	it("falls back to implicit when the lhs variable also appears on the rhs", () => {
		const statement = makeClassifier().classify("x^2 + y^2 = 25");
		expect(statement.kind).toBe("implicit");
		if (statement.kind === "implicit") {
			expect(statement.left.evaluate({ x: 3, y: 4 }) - statement.right.evaluate({ x: 3, y: 4 })).toBeCloseTo(0);
		}
	});

	it("falls back to implicit for an equation whose lhs is neither x, y, nor r", () => {
		const statement = makeClassifier().classify("sin(x) = cos(y)");
		expect(statement.kind).toBe("implicit");
	});

	it("throws the exact error for a non-single '=' equation", () => {
		expect(() => makeClassifier().classify("y = x = 1")).toThrow(
			'Use the form "y = ..." or "x^2 + y^2 = 25"',
		);
	});

	it("throws the exact error for malformed parametric input", () => {
		expect(() => makeClassifier().classify("x = cos(t), y = sin(t), z = 1")).toThrow(
			'Parametric form: "x = ..., y = ..." using t',
		);
	});

	it("throws the exact error when parametric form is missing x or y", () => {
		expect(() => makeClassifier().classify("x = cos(t), z = sin(t)")).toThrow(
			'Parametric form needs both "x = ..." and "y = ..."',
		);
	});
});
