import { IDisposable } from "./IDisposable";

/**
 * Collects disposables so an owner can release everything it created with a
 * single call. Disposing the store disposes every member, in reverse
 * registration order, and clears the store so it can be reused or disposed
 * again safely (idempotent).
 */
export class DisposableStore implements IDisposable {
	private readonly disposables: IDisposable[] = [];
	private isDisposed = false;

	/** Registers a disposable and returns it for convenient chaining. */
	public add<T extends IDisposable>(disposable: T): T {
		if (this.isDisposed) {
			disposable.dispose();
			return disposable;
		}
		this.disposables.push(disposable);
		return disposable;
	}

	public dispose(): void {
		if (this.isDisposed) return;
		this.isDisposed = true;
		while (this.disposables.length > 0) {
			const disposable = this.disposables.pop();
			disposable?.dispose();
		}
	}
}
