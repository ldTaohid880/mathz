export interface SectionInfo {
	readonly text: string;
	readonly lineStart: number;
	readonly lineEnd: number;
}

export interface BlockLocation {
	readonly sourcePath: string;
	getSectionInfo(): SectionInfo | null;
}

export type SaveResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly reason: string };

export interface INoteWriter {
	save(location: BlockLocation, originalSource: string, newSource: string): Promise<SaveResult>;
}
