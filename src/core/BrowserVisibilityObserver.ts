import type { IDisposable } from './IDisposable';
import type { IVisibilityObserver } from './IVisibilityObserver';

export class BrowserVisibilityObserver implements IVisibilityObserver {
	public observe(el: Element, onChange: (visible: boolean) => void): IDisposable {
		if (typeof IntersectionObserver === 'undefined') {
			return { dispose: () => {} };
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					onChange(entry.isIntersecting);
				}
			},
			{ threshold: 0, rootMargin: '100px' },
		);

		observer.observe(el);

		return {
			dispose: () => {
				observer.unobserve(el);
				observer.disconnect();
			},
		};
	}
}
