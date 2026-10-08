import type { EventEmitter } from '../core/EventEmitter';
import type { GraphTheme } from './GraphTheme';

/**
 * Provides access to the active graph theme and notifies listeners when the
 * theme changes.
 */
export interface IThemeProvider {
	getTheme(): GraphTheme;
	readonly onThemeChange: EventEmitter<GraphTheme>;
}
