import type { IUserFunctionStore, UserFunctionDef } from './IUserFunctionStore';

export class UserFunctionStore implements IUserFunctionStore {
	private readonly functions = new Map<string, UserFunctionDef>();

	public define(def: UserFunctionDef): void {
		this.functions.set(def.name.toLowerCase(), def);
	}

	public get(name: string): UserFunctionDef | undefined {
		return this.functions.get(name.toLowerCase());
	}

	public has(name: string): boolean {
		return this.functions.has(name.toLowerCase());
	}

	public names(): readonly string[] {
		return Array.from(this.functions.keys());
	}

	public clear(): void {
		this.functions.clear();
	}
}
