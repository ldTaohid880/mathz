import { App, TFile } from 'obsidian';
import type { BlockLocation, INoteWriter, SaveResult } from '../ui/INoteWriter';
import { BlockSplicer } from './BlockSplicer';

export class ObsidianNoteWriter implements INoteWriter {
	public constructor(
		private readonly app: App,
		private readonly splicer: BlockSplicer = new BlockSplicer(),
	) {}

	public async save(
		location: BlockLocation,
		originalSource: string,
		newSource: string,
	): Promise<SaveResult> {
		if (originalSource.trim() === newSource.trim()) {
			return { ok: true };
		}

		const abstractFile = this.app.vault.getAbstractFileByPath(location.sourcePath);
		if (!(abstractFile instanceof TFile)) {
			return { ok: false, reason: `File not found: ${location.sourcePath}` };
		}

		let saveError: string | null = null;
		try {
			await this.app.vault.process(abstractFile, (data) => {
				const info = location.getSectionInfo();
				const result = this.splicer.splice(data, originalSource, newSource, {
					lineStart: info?.lineStart,
					lineEnd: info?.lineEnd,
				});

				if (!result.ok) {
					saveError = result.reason;
					return data;
				}

				return result.content;
			});
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			return { ok: false, reason: `Failed to write file: ${msg}` };
		}

		if (saveError) {
			return { ok: false, reason: saveError };
		}

		return { ok: true };
	}
}
