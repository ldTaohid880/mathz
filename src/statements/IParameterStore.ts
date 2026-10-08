import type { IDisposable } from '../core/IDisposable';
import type { SliderDeclaration } from './SliderDeclaration';

export interface IParameterStore {
	get(name: string): number | undefined;
	set(name: string, value: number): void;
	setDeclarations(declarations: readonly SliderDeclaration[]): void;
	values(): Record<string, number>;
	declarations(): readonly SliderDeclaration[];
	readonly onChanged: {
		on(listener: (values: Record<string, number>) => void): IDisposable;
	};
}
