export type ExportResult =
	| { ok: true; detail?: string }
	| { ok: false; reason: string };

export interface IImageExporter {
	copy(blob: Blob): Promise<ExportResult>;
	save(blob: Blob, suggestedName?: string, sourcePath?: string): Promise<ExportResult>;
}
