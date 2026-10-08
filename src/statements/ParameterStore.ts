import { EventEmitter } from '../core/EventEmitter';
import { IDisposable } from '../core/IDisposable';
import type { IParameterStore } from './IParameterStore';
import type { SliderDeclaration } from './SliderDeclaration';

export class ParameterStore implements IParameterStore, IDisposable {
	public readonly onChanged = new EventEmitter<Record<string, number>>();
	private readonly decls: SliderDeclaration[] = [];
	private readonly currentValues: Record<string, number> = {};

	public constructor(declarations: readonly SliderDeclaration[] = []) {
		for (const decl of declarations) {
			this.decls.push(decl);
			this.currentValues[decl.name] = decl.value;
		}
	}

	public get(name: string): number | undefined {
		return this.currentValues[name.toLowerCase()];
	}

	public set(name: string, value: number): void {
		const key = name.toLowerCase();
		const decl = this.decls.find((d) => d.name === key);
		if (!decl) return;

		const clamped = Math.min(decl.max, Math.max(decl.min, value));
		if (this.currentValues[key] !== clamped) {
			this.currentValues[key] = clamped;
			this.onChanged.fire(this.values());
		}
	}

	public values(): Record<string, number> {
		return { ...this.currentValues };
	}

	public declarations(): readonly SliderDeclaration[] {
		return [...this.decls];
	}

	public dispose(): void {
		this.onChanged.dispose();
	}
}
