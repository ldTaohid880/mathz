import type { EventEmitter } from '../core/EventEmitter';
import type { MathzSettings } from './MathzSettings';

export interface ISettingsService {
	get(): Readonly<MathzSettings>;
	update(patch: Partial<MathzSettings>): Promise<void>;
	reset(): Promise<void>;
	load(): Promise<void>;
	readonly onChanged: EventEmitter<Readonly<MathzSettings>>;
}
