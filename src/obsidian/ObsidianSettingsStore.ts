import type { Plugin } from 'obsidian';
import type { ISettingsStore } from '../settings/ISettingsStore';

export class ObsidianSettingsStore implements ISettingsStore {
	public constructor(private readonly plugin: Plugin) {}

	public async load(): Promise<unknown> {
		return await this.plugin.loadData();
	}

	public async save(data: unknown): Promise<void> {
		await this.plugin.saveData(data);
	}
}
