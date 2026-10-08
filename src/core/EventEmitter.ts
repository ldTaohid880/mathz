import { IDisposable } from "./IDisposable";

type Listener<T> = (value: T) => void;

/**
 * A minimal typed pub/sub channel. Replaces ad-hoc global callbacks with a
 * single, injectable event source whose subscriptions are disposables.
 */
export class EventEmitter<T = void> {
	private listeners: Listener<T>[] = [];

	public on(listener: Listener<T>): IDisposable {
		this.listeners.push(listener);
		let active = true;
		return {
			dispose: () => {
				if (!active) return;
				active = false;
				this.listeners = this.listeners.filter((l) => l !== listener);
			},
		};
	}

	public fire(value: T): void {
		for (const listener of [...this.listeners]) {
			listener(value);
		}
	}

	public dispose(): void {
		this.listeners = [];
	}
}
