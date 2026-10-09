export interface ISettingsStore {
	load(): Promise<unknown>;
	save(data: unknown): Promise<void>;
}
