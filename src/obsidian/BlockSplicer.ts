export interface SpliceOptions {
	readonly lineStart?: number;
	readonly lineEnd?: number;
}

export type SpliceResult =
	| { readonly ok: true; readonly content: string }
	| { readonly ok: false; readonly reason: string };

function normalizeText(text: string): string {
	return text
		.split(/\r?\n/)
		.map((l) => l.trimEnd())
		.join('\n')
		.trim();
}

export class BlockSplicer {
	public splice(
		fileContent: string,
		originalSource: string,
		newSource: string,
		options?: SpliceOptions,
	): SpliceResult {
		const normOriginal = normalizeText(originalSource);
		const normNew = normalizeText(newSource);

		if (normOriginal === normNew && originalSource.trim() === newSource.trim()) {
			return { ok: true, content: fileContent };
		}

		const isCRLF = fileContent.includes('\r\n');
		const lineSep = isCRLF ? '\r\n' : '\n';
		const lines = fileContent.split(/\r?\n/);

		const lineStart = options?.lineStart;
		const lineEnd = options?.lineEnd;

		// 1. Direct section info replacement if available
		if (lineStart !== undefined && lineEnd !== undefined && lineStart >= 0 && lineEnd < lines.length && lineStart < lineEnd) {
			const openFence = lines[lineStart].trim();
			const closeFence = lines[lineEnd].trim();

			if (!openFence.startsWith('```mathz') && !openFence.startsWith('~~~mathz')) {
				return { ok: false, reason: 'Section does not span a mathz block' };
			}
			if (!closeFence.startsWith('```') && !closeFence.startsWith('~~~')) {
				return { ok: false, reason: 'Section closing fence is invalid' };
			}

			const blockLines = lines.slice(lineStart + 1, lineEnd);
			const currentBlockText = normalizeText(blockLines.join('\n'));

			if (currentBlockText !== normOriginal) {
				return {
					ok: false,
					reason: 'The note changed since this graph rendered. Reload and try again.',
				};
			}

			const newLines = newSource.length === 0 ? [] : newSource.split(/\r?\n/);
			const before = lines.slice(0, lineStart + 1);
			const after = lines.slice(lineEnd);
			const resultLines = [...before, ...newLines, ...after];
			return { ok: true, content: resultLines.join(lineSep) };
		}

		// 2. Fallback: search for exactly matching ```mathz block
		const matches: Array<{ start: number; end: number }> = [];
		let inMathz = false;
		let startIdx = -1;
		let blockContentLines: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();
			if (!inMathz) {
				if (trimmed.startsWith('```mathz') || trimmed.startsWith('~~~mathz')) {
					inMathz = true;
					startIdx = i;
					blockContentLines = [];
				}
			} else {
				if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
					inMathz = false;
					const contentText = normalizeText(blockContentLines.join('\n'));
					if (contentText === normOriginal) {
						matches.push({ start: startIdx, end: i });
					}
				} else {
					blockContentLines.push(line);
				}
			}
		}

		if (matches.length === 0) {
			return {
				ok: false,
				reason: 'Could not find the mathz code block in the note',
			};
		}

		if (matches.length > 1) {
			return {
				ok: false,
				reason: 'Multiple matching mathz blocks found in the note; unable to determine target',
			};
		}

		const target = matches[0];
		const newLines = newSource.length === 0 ? [] : newSource.split(/\r?\n/);
		const before = lines.slice(0, target.start + 1);
		const after = lines.slice(target.end);
		const resultLines = [...before, ...newLines, ...after];
		return { ok: true, content: resultLines.join(lineSep) };
	}
}
