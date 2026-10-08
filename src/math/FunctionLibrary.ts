import { IFunctionLibrary } from "./IFunctionLibrary";

const FUNCTIONS: Record<string, (x: number) => number> = {
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
	asin: Math.asin,
	acos: Math.acos,
	atan: Math.atan,
	sqrt: Math.sqrt,
	abs: Math.abs,
	exp: Math.exp,
	ln: Math.log,
	log: Math.log10,
	floor: Math.floor,
	ceil: Math.ceil,
	round: Math.round,
	sign: Math.sign,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

/** `IFunctionLibrary` implementation with the exact built-ins the original Mathz plugin supported. */
export class FunctionLibrary implements IFunctionLibrary {
	public readonly names: ReadonlySet<string> = new Set([
		...Object.keys(FUNCTIONS),
		...Object.keys(CONSTANTS),
	]);

	public hasFunction(name: string): boolean {
		return name in FUNCTIONS;
	}

	public getFunction(name: string): (x: number) => number {
		const fn = FUNCTIONS[name];
		if (!fn) throw new Error(`Unknown function "${name}"`);
		return fn;
	}

	public hasConstant(name: string): boolean {
		return name in CONSTANTS;
	}

	public getConstant(name: string): number {
		if (!(name in CONSTANTS)) throw new Error(`Unknown constant "${name}"`);
		return CONSTANTS[name];
	}
}
