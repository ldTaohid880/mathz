export interface CachedBlockState {
	readonly view: {
		readonly cx: number;
		readonly cy: number;
		readonly scale: number;
	};
	readonly sliderValues: Record<string, number>;
	readonly hiddenEquations: Record<string, boolean>;
}

export interface IBlockStateCache {
	get(key: string): CachedBlockState | undefined;
	set(key: string, state: CachedBlockState): void;
	delete(key: string): void;
}

export class BlockStateCache implements IBlockStateCache {
	private readonly cache = new Map<string, CachedBlockState>();

	public get(key: string): CachedBlockState | undefined {
		return this.cache.get(key);
	}

	public set(key: string, state: CachedBlockState): void {
		this.cache.set(key, state);
	}

	public delete(key: string): void {
		this.cache.delete(key);
	}
}
