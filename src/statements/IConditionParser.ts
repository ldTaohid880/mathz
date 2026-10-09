import type { Condition } from './Condition';
import type { ClassifyOptions } from './StatementClassifier';

export interface ConditionParseError {
	readonly error: string;
}

export function isConditionParseError(
	result: Condition | ConditionParseError,
): result is ConditionParseError {
	return typeof result === 'object' && result !== null && 'error' in result;
}

export interface IConditionParser {
	parse(
		text: string,
		allowedVars: readonly string[],
		options?: ClassifyOptions,
	): Condition | ConditionParseError;
}
