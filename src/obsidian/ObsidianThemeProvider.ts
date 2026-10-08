import type { App, EventRef } from 'obsidian';
import { EventEmitter } from '../core/EventEmitter';
import { IDisposable } from '../core/IDisposable';
import type { GraphTheme } from '../graph/GraphTheme';
import type { IThemeProvider } from '../graph/IThemeProvider';

function cssColor(name: string, fallback: string): string {
	const body = activeDocument.body;
	const raw = getComputedStyle(body).getPropertyValue(name).trim();
	const probe = activeDocument.createElement('span');
	probe.style.color = raw;
	if (!probe.style.color) probe.style.color = fallback;
	body.appendChild(probe);
	const out = getComputedStyle(probe).color;
	probe.remove();
	return out || fallback; // never return an empty string
}

const PALETTE_DEFS: ReadonlyArray<readonly [string, string]> = [
	['--color-blue', '#1f77b4'],
	['--color-red', '#d62728'],
	['--color-green', '#2ca02c'],
	['--color-yellow', '#e0a800'],
	['--color-purple', '#9467bd'],
	['--color-orange', '#ff7f0e'],
];

export class ObsidianThemeProvider implements IThemeProvider, IDisposable {
	public readonly onThemeChange = new EventEmitter<GraphTheme>();
	private readonly ref: EventRef;

	public constructor(private readonly app: App) {
		this.ref = app.workspace.on('css-change', () => {
			this.onThemeChange.fire(this.getTheme());
		});
	}

	public getTheme(): GraphTheme {
		const bg = cssColor('--background-secondary', '#ededed');
		const gridMinor = cssColor('--background-modifier-border-hover', '#b3b3b3');
		const gridMajor = cssColor('--text-faint', '#808080');
		const axis = cssColor('--color-red', '#d62728');
		const text = cssColor('--text-normal', '#303030');
		const tipBg = cssColor('--text-normal', '#222222');
		const tipFg = cssColor('--background-primary', '#ffffff');
		const cross = cssColor('--text-muted', '#666666');
		const fontFamily = getComputedStyle(activeDocument.body).fontFamily || 'sans-serif';

		const palette = PALETTE_DEFS.map(([name, fallback]) => cssColor(name, fallback));

		return {
			bg,
			gridMinor,
			gridMajor,
			axis,
			text,
			tipBg,
			tipFg,
			cross,
			fontFamily,
			palette,
		};
	}

	public dispose(): void {
		this.app.workspace.offref(this.ref);
		this.onThemeChange.dispose();
	}
}
