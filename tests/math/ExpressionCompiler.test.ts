import { describe, expect, it } from "vitest";
import { Evaluator } from "../../src/math/Evaluator";
import { ExpressionCompiler } from "../../src/math/ExpressionCompiler";
import { FunctionLibrary } from "../../src/math/FunctionLibrary";
import { Parser } from "../../src/math/Parser";
import { Tokenizer } from "../../src/math/Tokenizer";

function makeCompiler() {
	const functions = new FunctionLibrary();
	return new ExpressionCompiler(new Tokenizer(), new Parser(functions), functions, new Evaluator());
}

describe("ExpressionCompiler", () => {
	it("evaluates basic arithmetic with correct precedence", () => {
		const compiled = makeCompiler().compile("2 + 3 * 4", []);
		expect(compiled.evaluate({})).toBe(14);
	});

	it("supports right-associative exponentiation", () => {
		const compiled = makeCompiler().compile("2^3^2", []);
		expect(compiled.evaluate({})).toBe(Math.pow(2, Math.pow(3, 2)));
	});

	it("resolves known functions and constants", () => {
		const compiled = makeCompiler().compile("sin(pi/2)", []);
		expect(compiled.evaluate({})).toBeCloseTo(1);
	});

	it("treats unknown multi-letter words as implicit multiplication of single letters", () => {
		const compiled = makeCompiler().compile("xy", ["x", "y"]);
		expect(compiled.evaluate({ x: 3, y: 4 })).toBe(12);
	});

	it("supports implicit multiplication between a number and a variable", () => {
		const compiled = makeCompiler().compile("2x", ["x"]);
		expect(compiled.evaluate({ x: 5 })).toBe(10);
	});

	it("supports implicit multiplication before a parenthesized group", () => {
		const compiled = makeCompiler().compile("3(x+1)", ["x"]);
		expect(compiled.evaluate({ x: 1 })).toBe(6);
	});

	it("tracks only the variables actually used", () => {
		const compiled = makeCompiler().compile("sin(x)", ["x", "y"]);
		expect(compiled.usedVariables).toEqual(new Set(["x"]));
	});

	it("keeps declared variable names whole even if they look like words", () => {
		const compiled = makeCompiler().compile("theta", ["theta"]);
		expect(compiled.evaluate({ theta: 7 })).toBe(7);
	});

	it("throws on unexpected end of input", () => {
		expect(() => makeCompiler().compile("1 +", [])).toThrow("Unexpected end of equation");
	});

	it("throws on a missing closing paren", () => {
		expect(() => makeCompiler().compile("(1 + 2", [])).toThrow("Missing closing )");
	});

	it("throws when a function name isn't followed by (", () => {
		expect(() => makeCompiler().compile("sin x", ["x"])).toThrow("Expected ( after sin");
	});

	it("throws on an unknown identifier", () => {
		expect(() => makeCompiler().compile("z", [])).toThrow(
			'Unknown name "z". Declare it with @slider z = 1 [min, max]',
		);
	});

	it("handles unary minus and negative exponent bases", () => {
		const compiled = makeCompiler().compile("-2^2", []);
		expect(compiled.evaluate({})).toBe(-4);
	});
});
