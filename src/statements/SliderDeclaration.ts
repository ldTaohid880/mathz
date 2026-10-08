import type { IFunctionLibrary } from '../math/IFunctionLibrary';

export interface SliderDeclaration {
	readonly name: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
	readonly step: number;
}

export interface ParseError {
	readonly error: string;
}

export function isParseError(result: SliderDeclaration | ParseError): result is ParseError {
	return 'error' in result;
}

export interface ISliderParser {
	parse(line: string): SliderDeclaration | ParseError;
}

const RESERVED_NAMES = new Set(['x', 'y', 't', 'r', 'theta', 'e', 'pi']);

export class SliderParser implements ISliderParser {
	public constructor(private readonly functions: IFunctionLibrary) {}

	public parse(line: string): SliderDeclaration | ParseError {
		const trimmed = line.trim();
		if (!trimmed.startsWith('@slider')) {
			return { error: 'Not a slider declaration' };
		}

		// Pattern: @slider name = value [min, max] or [min, max, step]
		const match = trimmed.match(/^@slider\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*\[\s*([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:\s*,\s*([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?))?\s*\]$/i);

		if (!match) {
			return { error: 'Invalid slider syntax. Expected: @slider name = value [min, max] or [min, max, step]' };
		}

		const name = match[1].toLowerCase();
		const rawVal = parseFloat(match[2]);
		const min = parseFloat(match[3]);
		const max = parseFloat(match[4]);
		const step = match[5] !== undefined ? parseFloat(match[5]) : 0.1;

		if (Number.isNaN(rawVal) || Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(step)) {
			return { error: 'Non-numeric value in slider declaration' };
		}

		if (RESERVED_NAMES.has(name) || this.functions.hasFunction(name) || this.functions.hasConstant(name)) {
			return { error: `Reserved name "${name}" cannot be used as a slider` };
		}

		if (min >= max) {
			return { error: `Slider min (${min}) must be less than max (${max})` };
		}

		if (step <= 0) {
			return { error: `Slider step (${step}) must be greater than 0` };
		}

		// Clamp value into [min, max]
		const value = Math.min(max, Math.max(min, rawVal));

		return {
			name,
			value,
			min,
			max,
			step,
		};
	}
}
