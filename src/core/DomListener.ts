import { IDisposable } from "./IDisposable";

/**
 * Attaches a DOM event listener and returns an `IDisposable` that removes it.
 * Lets consumers manage listener lifetime via `DisposableStore` instead of
 * juggling raw `addEventListener`/`removeEventListener` pairs or an
 * `AbortController`.
 */
export function addDomListener<K extends keyof GlobalEventHandlersEventMap>(
	target: EventTarget,
	type: K,
	listener: (event: GlobalEventHandlersEventMap[K]) => void,
	options?: AddEventListenerOptions,
): IDisposable {
	const handler = listener as EventListener;
	target.addEventListener(type, handler, options);
	let active = true;
	return {
		dispose: () => {
			if (!active) return;
			active = false;
			target.removeEventListener(type, handler, options);
		},
	};
}
