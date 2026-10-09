import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../../src/settings/MathzSettings';
import { SettingsService } from '../../src/settings/SettingsService';
import type { ISettingsStore } from '../../src/settings/ISettingsStore';

describe('SettingsService', () => {
	it('uses defaultSettings initially and on empty store', async () => {
		const mockStore: ISettingsStore = {
			load: vi.fn(async () => null),
			save: vi.fn(async () => {}),
		};

		const service = new SettingsService(mockStore);
		await service.load();
		expect(service.get()).toEqual(defaultSettings);
	});

	it('merges valid stored data and clamps out-of-range values', async () => {
		const mockStore: ISettingsStore = {
			load: vi.fn(async () => ({
				graphSize: 1000, // should clamp to 600
				viewHalfRange: 0.1, // should clamp to 0.5
				wheelZoom: 'always',
				showHint: false,
			})),
			save: vi.fn(async () => {}),
		};

		const service = new SettingsService(mockStore);
		await service.load();

		const s = service.get();
		expect(s.graphSize).toBe(600);
		expect(s.viewHalfRange).toBe(0.5);
		expect(s.wheelZoom).toBe('always');
		expect(s.showHint).toBe(false);
		expect(s.showGrid).toBe(true); // default fallback
	});

	it('handles garbage stored data without throwing', async () => {
		const mockStore: ISettingsStore = {
			load: vi.fn(async () => ({
				graphSize: 'invalid',
				viewHalfRange: null,
				wheelZoom: 12345,
			})),
			save: vi.fn(async () => {}),
		};

		const service = new SettingsService(mockStore);
		await service.load();

		const s = service.get();
		expect(s).toEqual(defaultSettings);
	});

	it('update persists data and emits onChanged event', async () => {
		const saveSpy = vi.fn(async () => {});
		const mockStore: ISettingsStore = {
			load: vi.fn(async () => null),
			save: saveSpy,
		};

		const service = new SettingsService(mockStore);
		await service.load();

		const listener = vi.fn();
		service.onChanged.on(listener);

		await service.update({ graphSize: 500, showHint: false });

		expect(saveSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				graphSize: 500,
				showHint: false,
			}),
		);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({
				graphSize: 500,
				showHint: false,
			}),
		);
	});

	it('reset restores defaultSettings', async () => {
		const service = new SettingsService();
		await service.update({ graphSize: 500, wheelZoom: 'always' });
		expect(service.get().graphSize).toBe(500);

		await service.reset();
		expect(service.get()).toEqual(defaultSettings);
	});
});
