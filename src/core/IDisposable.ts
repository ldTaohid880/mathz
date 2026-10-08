/**
 * Something that owns resources (listeners, timers, animation frames,
 * observers, etc.) that must be explicitly released.
 */
export interface IDisposable {
	dispose(): void;
}
