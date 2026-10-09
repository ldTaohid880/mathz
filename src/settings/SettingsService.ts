import { EventEmitter } from '../core/EventEmitter';
import type { ISettingsService } from './ISettingsService';
import type { ISettingsStore } from './ISettingsStore';
import { defaultSettings, type MathzSettings } from './MathzSettings';

export class SettingsService implements ISettingsService {
	private settings: MathzSettings = { ...defaultSettings };
	public readonly onChanged = new EventEmitter<Readonly<MathzSettings>>();

	public constructor(private readonly store?: ISettingsStore) {}

	public get(): Readonly<MathzSettings> {
		return this.settings;
	}

	public async load(): Promise<void> {
		if (!this.store) return;
		try {
			const data = await this.store.load();
			if (data && typeof data === 'object') {
				this.settings = sanitizeSettings(data as Record<string, unknown>);
			} else {
				this.settings = { ...defaultSettings };
			}
		} catch {
			this.settings = { ...defaultSettings };
		}
	}

	public async update(patch: Partial<MathzSettings>): Promise<void> {
		const merged = { ...this.settings, ...patch };
		this.settings = sanitizeSettings(merged as Record<string, unknown>);
		if (this.store) {
			try {
				await this.store.save(this.settings);
			} catch {
				// Save error fallback
			}
		}
		this.onChanged.fire(this.settings);
	}

	public async reset(): Promise<void> {
		await this.update(defaultSettings);
	}
}

export function sanitizeSettings(data: Record<string, unknown>): MathzSettings {
	let graphSize = defaultSettings.graphSize;
	if (data.graphSize !== undefined && data.graphSize !== null) {
		const num = Number(data.graphSize);
		if (Number.isFinite(num)) {
			graphSize = Math.min(600, Math.max(200, Math.round(num)));
		}
	}

	let viewHalfRange = defaultSettings.viewHalfRange;
	if (data.viewHalfRange !== undefined && data.viewHalfRange !== null) {
		const num = Number(data.viewHalfRange);
		if (Number.isFinite(num)) {
			viewHalfRange = Math.min(1000, Math.max(0.5, num));
		}
	}

	let wheelZoom: 'modifier' | 'always' = defaultSettings.wheelZoom;
	if (data.wheelZoom === 'always') {
		wheelZoom = 'always';
	} else if (data.wheelZoom === 'modifier') {
		wheelZoom = 'modifier';
	}

	let showHint = defaultSettings.showHint;
	if (data.showHint !== undefined && data.showHint !== null) {
		showHint = Boolean(data.showHint);
	}

	let showGrid = defaultSettings.showGrid;
	if (data.showGrid !== undefined && data.showGrid !== null) {
		showGrid = Boolean(data.showGrid);
	}

	return {
		graphSize,
		viewHalfRange,
		wheelZoom,
		showHint,
		showGrid,
	};
}
