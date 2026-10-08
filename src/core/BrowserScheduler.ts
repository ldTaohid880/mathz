import { IScheduler } from "./IScheduler";

/** `IScheduler` implementation backed by real browser/global APIs. */
export class BrowserScheduler implements IScheduler {
	public requestFrame(callback: (time: number) => void): number {
		return window.requestAnimationFrame(callback);
	}

	public cancelFrame(handle: number): void {
		window.cancelAnimationFrame(handle);
	}

	public setTimeout(callback: () => void, delayMs: number): number {
		return window.setTimeout(callback, delayMs);
	}

	public clearTimeout(handle: number): void {
		window.clearTimeout(handle);
	}

	public now(): number {
		return performance.now();
	}
}
