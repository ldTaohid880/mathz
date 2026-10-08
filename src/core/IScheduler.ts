/**
 * Injectable wrapper around platform scheduling primitives
 * (`requestAnimationFrame`, `performance.now`, `setTimeout`) so consumers can
 * be driven deterministically from tests via a fake implementation.
 */
export interface IScheduler {
	/** Schedules `callback` to run before the next repaint; returns a handle for `cancelFrame`. */
	requestFrame(callback: (time: number) => void): number;
	cancelFrame(handle: number): void;

	/** Schedules `callback` to run after at least `delayMs`; returns a handle for `clearTimeout`. */
	setTimeout(callback: () => void, delayMs: number): number;
	clearTimeout(handle: number): void;

	/** Monotonic clock, analogous to `performance.now()`. */
	now(): number;
}
