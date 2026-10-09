import type { App } from 'obsidian';
import type { ExportResult, IImageExporter } from '../ui/IImageExporter';

export function buildExportFilename(title?: string, now = new Date()): string {
	let slug = (title ?? 'graph')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (!slug) {
		slug = 'graph';
	}
	if (slug.length > 60) {
		slug = slug.slice(0, 60).replace(/-+$/, '');
	}

	const pad = (n: number) => String(n).padStart(2, '0');
	const yyyy = now.getFullYear();
	const mm = pad(now.getMonth() + 1);
	const dd = pad(now.getDate());
	const hh = pad(now.getHours());
	const min = pad(now.getMinutes());
	const ss = pad(now.getSeconds());

	const timestamp = `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
	return `mathz-${slug}-${timestamp}.png`;
}

export class ObsidianImageExporter implements IImageExporter {
	public constructor(private readonly app: App) {}

	public async copy(blob: Blob): Promise<ExportResult> {
		try {
			if (
				typeof navigator === 'undefined' ||
				!navigator.clipboard ||
				typeof ClipboardItem === 'undefined'
			) {
				return { ok: false, reason: 'Clipboard API or ClipboardItem is not supported' };
			}
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			return { ok: true, detail: 'Image copied' };
		} catch (err: unknown) {
			const reason = err instanceof Error ? err.message : String(err);
			return { ok: false, reason: `Failed to copy image: ${reason}` };
		}
	}

	public async save(blob: Blob, suggestedName?: string, sourcePath?: string): Promise<ExportResult> {
		try {
			const filename = buildExportFilename(suggestedName);
			let targetPath = '';

			const fileManager = this.app.fileManager as any;
			if (typeof fileManager?.getAvailablePathForAttachment === 'function') {
				targetPath = await fileManager.getAvailablePathForAttachment(filename, sourcePath ?? '');
			} else {
				targetPath = this.resolveFallbackPath(filename, sourcePath);
			}

			const buffer = await blob.arrayBuffer();
			await this.app.vault.createBinary(targetPath, buffer);
			return { ok: true, detail: `Saved to ${targetPath}` };
		} catch (err: unknown) {
			const reason = err instanceof Error ? err.message : String(err);
			return { ok: false, reason: `Failed to save PNG: ${reason}` };
		}
	}

	private resolveFallbackPath(filename: string, sourcePath?: string): string {
		let dir = '';
		if (sourcePath && sourcePath.includes('/')) {
			dir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
		}

		const extIdx = filename.lastIndexOf('.');
		const baseName = extIdx !== -1 ? filename.substring(0, extIdx) : filename;
		const ext = extIdx !== -1 ? filename.substring(extIdx) : '';

		let candidate = dir ? `${dir}/${filename}` : filename;
		let counter = 1;

		while (this.app.vault.getAbstractFileByPath(candidate) !== null) {
			const newFilename = `${baseName}-${counter}${ext}`;
			candidate = dir ? `${dir}/${newFilename}` : newFilename;
			counter++;
		}

		return candidate;
	}
}
